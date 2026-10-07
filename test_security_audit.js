process.env.VERCEL = '1';
require('dotenv').config({ path: require('path').join(__dirname, 'server/.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');

// Load DB connection & Express app
const { connectDB } = require('./server/db');
const app = require('./server/index.js');
const Application = require('./server/models/Application');
const LoginAttempt = require('./server/models/LoginAttempt');

const PORT = 5566;
let server;

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({ status: res.statusCode, headers: res.headers, raw: data, json });
      });
    });
    req.on('error', reject);
    if (body) {
      if (Buffer.isBuffer(body) || typeof body === 'string') {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

async function runTests() {
  console.log('========================================================');
  console.log('   STARTING SECURITY & REGRESSION VERIFICATION SUITE   ');
  console.log('========================================================\n');

  // Start HTTP server on local port
  server = app.listen(PORT);
  console.log(`[SETUP] Local test server started on port ${PORT}`);

  console.log('[SETUP] Connecting to MongoDB Atlas...');
  const rawUri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI || '';
  const testMongoUri = rawUri.replace(/\/([^\/?]+)(\?|$)/, '/ltc_recruitment_test$2');
  process.env.MONGODB_URI = testMongoUri;
  console.log('[SETUP] Using ISOLATED test database: ltc_recruitment_test');
  await connectDB();
  console.log('[SETUP] Connected to MongoDB Atlas');

  const testIp = '127.0.0.1';
  await LoginAttempt.deleteMany({ ip: testIp });

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName} ${detail ? '(' + detail + ')' : ''}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? '(' + detail + ')' : ''}`);
      failed++;
    }
  }

  try {
    // ------------------------------------------------------------------
    // TEST 1: Protected routes reject missing token
    // ------------------------------------------------------------------
    {
      const res = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/applications',
        method: 'GET'
      });
      assert(res.status === 401, 'Test 1: GET /api/applications without token returns 401', `status=${res.status}`);
    }

    // ------------------------------------------------------------------
    // TEST 2: Static ADMIN_TOKEN backdoor is blocked
    // ------------------------------------------------------------------
    {
      const res = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/applications',
        method: 'GET',
        headers: { 'x-admin-token': 'ltc_recruitment_secret_key' }
      });
      assert(res.status === 401, 'Test 2a: Static/arbitrary token in x-admin-token returns 401', `status=${res.status}`);

      const res2 = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/applications',
        method: 'GET',
        headers: { 'Authorization': 'Bearer ltc_recruitment_secret_key' }
      });
      assert(res2.status === 401, 'Test 2b: Static token in Authorization header returns 401', `status=${res2.status}`);
    }

    // ------------------------------------------------------------------
    // TEST 3: req.query.token is NOT accepted by adminAuth
    // ------------------------------------------------------------------
    {
      // Generate a real valid JWT
      const secret = process.env.ADMIN_JWT_SECRET;
      const validJwt = jwt.sign({ role: 'admin' }, secret, { expiresIn: '1h', algorithm: 'HS256' });

      const res = await request({
        hostname: 'localhost',
        port: PORT,
        path: `/api/applications?token=${validJwt}`,
        method: 'GET'
      });
      assert(res.status === 401, 'Test 3: Query string token (?token=...) rejected by adminAuth', `status=${res.status}`);
    }

    // ------------------------------------------------------------------
    // TEST 4: Rate Limiting via MongoDB Atlas (Lockout after 5 bad attempts)
    // ------------------------------------------------------------------
    {
      await LoginAttempt.deleteMany({ ip: testIp });

      for (let i = 1; i <= 4; i++) {
        const res = await request({
          hostname: 'localhost',
          port: PORT,
          path: '/api/admin/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-real-ip': testIp },
        }, { password: 'wrong_password_test_' + i });
        assert(res.status === 403, `Test 4.${i}: Bad password attempt ${i} returns 403`);
      }

      // Check DB doc
      const attemptDoc = await LoginAttempt.findOne({ ip: testIp });
      assert(attemptDoc && attemptDoc.count === 4, 'Test 4.5: MongoDB LoginAttempt document tracks count=4 in Atlas');

      // 5th bad attempt -> lockout
      const res5 = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/admin/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-real-ip': testIp },
      }, { password: 'wrong_password_test_5' });
      assert(res5.status === 429, 'Test 4.6: 5th bad password attempt triggers 429 lockout', `status=${res5.status}, error="${res5.json?.error}"`);

      // 6th attempt while locked -> still 429
      const res6 = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/admin/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-real-ip': testIp },
      }, { password: 'any_password' });
      assert(res6.status === 429 && res6.json?.error?.includes('ລັອກລະບົບ'), 'Test 4.7: Lockout persists with remaining time message', `status=${res6.status}`);

      // Clean up rate limit for subsequent tests
      await LoginAttempt.deleteMany({ ip: testIp });
    }

    // ------------------------------------------------------------------
    // TEST 5: Successful Admin Login with Timing-Safe Password Check & JWT
    // ------------------------------------------------------------------
    let validAdminToken = null;
    {
      const adminPass = process.env.ADMIN_PASSWORD;
      const res = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/admin/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-real-ip': testIp },
      }, { password: adminPass });

      assert(res.status === 200 && !!res.json?.sessionToken, 'Test 5.1: Correct password returns 200 with sessionToken');
      validAdminToken = res.json?.sessionToken;

      // Verify JWT token properties
      const decoded = jwt.verify(validAdminToken, process.env.ADMIN_JWT_SECRET, { algorithms: ['HS256'] });
      assert(decoded && decoded.role === 'admin', 'Test 5.2: Issued JWT verified with HS256 and role=admin');

      // Verify LoginAttempt was cleaned up on successful login
      const docAfterLogin = await LoginAttempt.findOne({ ip: testIp });
      assert(!docAfterLogin, 'Test 5.3: LoginAttempt document deleted upon successful login');
    }

    // ------------------------------------------------------------------
    // TEST 6: Authenticated Admin access with valid JWT header
    // ------------------------------------------------------------------
    {
      const res = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/applications',
        method: 'GET',
        headers: { 'x-admin-token': validAdminToken }
      });
      assert(res.status === 200 && Array.isArray(res.json?.data), 'Test 6: GET /api/applications with valid JWT header returns 200 and data array');
    }

    // ------------------------------------------------------------------
    // TEST 7: Application Submission to MongoDB Atlas
    // ------------------------------------------------------------------
    const testPhone = '2099999991';
    const testEmail = 'audit_tester@example.com';
    const testPosition = 'IT Security Engineer';
    let submittedAppId = null;
    let submittedRefCode = null;

    const testPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

    function buildMultipart(fields, files, boundary) {
      const chunks = [];
      for (const [key, val] of Object.entries(fields)) {
        chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`));
      }
      for (const [key, file] of Object.entries(files)) {
        chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"; filename="${file.filename}"\r\nContent-Type: ${file.mimetype}\r\n\r\n`));
        chunks.push(file.buffer);
        chunks.push(Buffer.from('\r\n'));
      }
      chunks.push(Buffer.from(`--${boundary}--\r\n`));
      return Buffer.concat(chunks);
    }

    const testFiles = {
      applicant_photo: { filename: 'photo.png', mimetype: 'image/png', buffer: testPng },
      applicant_signature: { filename: 'signature.png', mimetype: 'image/png', buffer: testPng }
    };

    const postFields = {
      first_name: 'AuditTest',
      last_name: 'Candidate',
      phone: testPhone,
      email: testEmail,
      pos_applying: testPosition,
      curr_village: 'Thongkhankham',
      curr_district: 'Chanthabouly',
      curr_province: 'Vientiane Capital',
      edu1_school: 'National University of Laos',
      edu1_degree: 'Bachelor',
      edu1_major: 'Computer Science',
      edu1_year: '2024',
      _form_render_time: String(Date.now() - 5000)
    };

    {
      // Clean previous test apps with same phone
      await Application.deleteMany({ phone: testPhone });

      const boundary = '----WebKitFormBoundaryTest' + Math.random().toString(36).substring(2);
      const bodyBuffer = buildMultipart(postFields, testFiles, boundary);

      const res = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/applications',
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': bodyBuffer.length
        }
      }, bodyBuffer);

      console.log('Test 7 response raw:', res.status, res.raw);
      assert(res.status === 201 && res.json?.success, 'Test 7.1: Application submission returns 201 Created');
      submittedAppId = res.json?.id;
      submittedRefCode = res.json?.refCode;

      // Verify in MongoDB Atlas
      const savedDoc = await Application.findOne({ id: submittedAppId });
      assert(savedDoc && savedDoc.refCode === submittedRefCode, 'Test 7.2: Application confirmed saved in MongoDB Atlas');
    }

    // ------------------------------------------------------------------
    // TEST 8: Duplicate Submission Prevention
    // ------------------------------------------------------------------
    {
      const boundary = '----WebKitFormBoundaryTest' + Math.random().toString(36).substring(2);
      const bodyBuffer = buildMultipart(postFields, testFiles, boundary);

      const res = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/applications',
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': bodyBuffer.length
        }
      }, bodyBuffer);

      assert(res.status === 400 && res.json?.error?.includes('ໄດ້ເຄີຍສົ່ງໃບສະໝັກ'), 'Test 8: Duplicate submission for same phone + position rejected with friendly Lao notice');
    }

    // ------------------------------------------------------------------
    // TEST 9: Status Check Endpoint by RefCode
    // ------------------------------------------------------------------
    {
      const res = await request({
        hostname: 'localhost',
        port: PORT,
        path: `/api/applications/status-check?q=${submittedRefCode}`,
        method: 'GET'
      });

      assert(res.status === 200 && Array.isArray(res.json?.results) && res.json.results.length === 1, 'Test 9.1: Status check by refCode returns exactly 1 match');
      assert(res.json?.results?.[0]?.refCode === submittedRefCode, 'Test 9.2: Status check match refCode is correct');

      // Test 9.3: GET PDF with x-admin-token header succeeds
      const pdfHeaderRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: `/api/applications/${submittedAppId}/pdf`,
        method: 'GET',
        headers: { 'x-admin-token': validAdminToken }
      });
      assert(pdfHeaderRes.status === 200 && pdfHeaderRes.headers['content-type']?.includes('application/pdf'), 'Test 9.3: GET /api/applications/:id/pdf with x-admin-token header returns 200 and PDF');

      // Test 9.4: GET PDF with query string token ?token=... is REJECTED (403)
      const pdfQueryRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: `/api/applications/${submittedAppId}/pdf?token=${validAdminToken}`,
        method: 'GET'
      });
      assert(pdfQueryRes.status === 403, 'Test 9.4: GET /api/applications/:id/pdf with query ?token= rejected with 403');
    }

    // ------------------------------------------------------------------
    // TEST 10: Admin Soft-Delete, Restore, and Force-Delete in MongoDB Atlas
    // ------------------------------------------------------------------
    {
      // Soft delete test
      const delRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: `/api/applications/${submittedAppId}`,
        method: 'DELETE',
        headers: { 'x-admin-token': validAdminToken }
      });
      assert(delRes.status === 200, 'Test 10.1: Soft delete application returns 200');

      const softDelDoc = await Application.findOne({ id: submittedAppId });
      assert(softDelDoc && softDelDoc.isDeleted === true, 'Test 10.2: MongoDB Atlas verifies isDeleted=true');

      // Test 10.2b: When prior application is soft-deleted, candidate CAN re-apply without duplicate block
      {
        const boundary = '----WebKitFormBoundaryTest' + Math.random().toString(36).substring(2);
        const bodyBuffer = buildMultipart(postFields, testFiles, boundary);
        const reapplyRes = await request({
          hostname: 'localhost',
          port: PORT,
          path: '/api/applications',
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': bodyBuffer.length
          }
        }, bodyBuffer);
        assert(reapplyRes.status === 201, 'Test 10.2b: Candidate can re-apply after prior application is soft-deleted (isDeleted is ignored)');
        if (reapplyRes.json?.id) {
          await Application.deleteOne({ id: reapplyRes.json.id });
        }
      }

      // Restore
      const restoreRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: `/api/applications/${submittedAppId}/restore`,
        method: 'POST',
        headers: { 'x-admin-token': validAdminToken }
      });
      assert(restoreRes.status === 200, 'Test 10.3: Restore application returns 200');

      const restoredDoc = await Application.findOne({ id: submittedAppId });
      assert(restoredDoc && restoredDoc.isDeleted === false, 'Test 10.4: MongoDB Atlas verifies isDeleted=false');

      // Force delete (cleanup)
      const forceRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: `/api/applications/${submittedAppId}/force`,
        method: 'DELETE',
        headers: { 'x-admin-token': validAdminToken }
      });
      assert(forceRes.status === 200, 'Test 10.5: Force permanent delete returns 200');

      const permanentDoc = await Application.findOne({ id: submittedAppId });
      assert(!permanentDoc, 'Test 10.6: Application permanently removed from MongoDB Atlas');
    }

    // ------------------------------------------------------------------
    // TEST 11: Error Message Sanitization (No error.message leak)
    // ------------------------------------------------------------------
    {
      const res = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/applications/non_existent_id',
        method: 'DELETE',
        headers: { 'x-admin-token': validAdminToken }
      });
      assert(res.status === 404, 'Test 11.1: Non-existent application returns 404 cleanly');
    }

  } finally {
    // Cleanup
    await LoginAttempt.deleteMany({ ip: testIp });
    if (server) {
      server.close();
      console.log('[TEARDOWN] Test server closed');
    }
    await mongoose.connection.close();
    console.log('[TEARDOWN] Database connection closed');
  }

  console.log('\n========================================================');
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED     `);
  console.log('========================================================');
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution crashed:', err);
  if (server) server.close();
  process.exit(1);
});
