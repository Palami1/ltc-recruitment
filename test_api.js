const https = require('https');

function req(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'ltc-recruitment-app.vercel.app',
      path: path,
      method: method,
      headers: headers
    };
    const r = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function main() {
  // Test GET
  console.log('=== GET /api/job-config ===');
  const get = await req('GET', '/api/job-config', {});
  console.log('Status:', get.status);
  console.log('Body:', get.body.substring(0, 300));

  // Test POST
  console.log('\n=== POST /api/job-config ===');
  const payload = JSON.stringify({positions:[], requiredDocs:[], applicantRequirements:[]});
  const post = await req('POST', '/api/job-config', {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'x-admin-token': 'valo58787788'
  }, payload);
  console.log('Status:', post.status);
  console.log('Body:', post.body.substring(0, 500));
}

main().catch(console.error);
