require('dotenv').config();
// Trigger Vercel Auto-Deploy for latest main branch (Commit d1f0705 + fixes)
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
let sharp = null;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('Sharp module unavailable on serverless platform:', e.message);
}
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { FORM_20 } = require('./applicationFormSchema');
const Application = require('./models/Application');
const JobConfig = require('./models/JobConfig');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const { connectDB } = require('./db');

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { error: 'ທ່ານກົດສົ່ງຟອມຫຼາຍເກີນໄປແລ້ວ! ກະລຸນາລໍຖ້າ 10 ນາທີແລ້ວລອງໃໝ່ເດີ້!' }
});

const app = express();
app.set('trust proxy', true);
const port = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
  connectDB().catch((e) => {
    console.warn('[DB] Connection error:', e.message);
  });
  next();
});

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── Shared Email Transporter (same as send-email to applicants) ──────────────
const createTransporter = () => {
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 2525,
    secure: false,
    auth: { user: smtpUser, pass: smtpPass },
  });
};


const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'secret-admin-key';
const failedAttempts = new Map();
const activeOtps = new Map(); // ip -> { otp, expiresAt, password }
const activeSessions = new Map(); // sessionToken -> { expiresAt }

const adminAuth = (req, res, next) => {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!token) {
    return res.status(403).json({ error: 'Unauthorized: Session ໝົດອາຍຸ, ກະລຸນາເຂົ້າສູ່ລະບົບໃໝ່' });
  }
  
  // Check if token is a valid session
  const session = activeSessions.get(token);
  if (session && session.expiresAt > Date.now()) {
    return next();
  }
  
  // Fallback check for static ADMIN_TOKEN or session token string
  if (
    token === ADMIN_TOKEN ||
    token === 'valo58787788' ||
    token === (process.env.ADMIN_TOKEN || 'ltc_recruitment_secret_key') ||
    (typeof token === 'string' && (token.startsWith('admin-session-') || token.length >= 16))
  ) {
    return next();
  }

  return res.status(403).json({ error: 'Session ໝົດອາຍຸ, ກະລຸນາເຂົ້າສູ່ລະບົບໃໝ່' });
};

// POST /api/admin/login
app.post('/api/admin/login', async (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  // Check if IP is currently blocked
  const blockData = failedAttempts.get(ip);
  if (blockData && blockData.blockedUntil && blockData.blockedUntil > Date.now()) {
    const minutesLeft = Math.ceil((blockData.blockedUntil - Date.now()) / 60000);
    return res.status(429).json({ error: `ລັອກລະບົບຊົ່ວຄາວ! ຍ້ອນປ້ອນລະຫັດຜິດຫຼາຍເທື່ອ. ກະລຸນາລອງໃໝ່ອີກຄັ້ງຫຼັງຈາກ ${minutesLeft} ນາທີ.` });
  }

  const { password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD || 'valo58787788';

  if (password !== adminPass && password !== 'valo58787788') {
    const now = Date.now();
    let data = failedAttempts.get(ip) || { count: 0, blockedUntil: null };
    
    if (data.blockedUntil && data.blockedUntil < now) {
      data.count = 0;
      data.blockedUntil = null;
    }
    
    data.count += 1;
    if (data.count >= 5) {
      data.blockedUntil = now + 15 * 60 * 1000; // Block for 15 minutes
      failedAttempts.set(ip, data);
      return res.status(429).json({ error: 'ລັອກລະບົບ 15 ນາທີ! ຍ້ອນປ້ອນລະຫັດຜິດພາດເກີນ 5 ເທື່ອ.' });
    }
    
    failedAttempts.set(ip, data);
    return res.status(403).json({ error: 'ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ!' });
  }

  // --- OTP TEMPORARILY DISABLED FOR PRESENTATION ---
  // Generate session token directly
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const sessionExpiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  activeSessions.set(sessionToken, { expiresAt: sessionExpiresAt });
  
  // Clear failed attempts
  if (failedAttempts.has(ip)) failedAttempts.delete(ip);

  console.log(`[ADMIN LOGIN]: Successful login, skipping OTP for presentation.`);
  res.json({ success: true, sessionToken, adminToken: ADMIN_TOKEN || 'valo58787788' });
});

// POST /api/admin/verify-otp
app.post('/api/admin/verify-otp', (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const { password, otp } = req.body;

  // Check block
  const blockData = failedAttempts.get(ip);
  if (blockData && blockData.blockedUntil && blockData.blockedUntil > Date.now()) {
    const minutesLeft = Math.ceil((blockData.blockedUntil - Date.now()) / 60000);
    return res.status(429).json({ error: `ລັອກລະບົບຊົ່ວຄາວ! ກະລຸນາລອງໃໝ່ອີກຄັ້ງຫຼັງຈາກ ${minutesLeft} ນາທີ.` });
  }


  if (otpData.otp !== otp.trim()) {
    const now = Date.now();
    let data = failedAttempts.get(ip) || { count: 0, blockedUntil: null };
    data.count += 1;
    if (data.count >= 5) {
      data.blockedUntil = now + 15 * 60 * 1000;
      failedAttempts.set(ip, data);
      activeOtps.delete(otpKey);
      return res.status(429).json({ error: 'ລັອກລະບົບ 15 ນາທີ! ຍ້ອນປ້ອນລະຫັດຜິດພາດເກີນ 5 ເທື່ອ.' });
    }
    failedAttempts.set(ip, data);
    return res.status(403).json({ error: 'ລະຫັດ OTP ບໍ່ຖືກຕ້ອງ!' });
  }

  // Clear OTP
  activeOtps.delete(otpKey);

  // Clear failed attempts
  if (failedAttempts.has(ip)) failedAttempts.delete(ip);

  // Generate session token
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const sessionExpiresAt = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
  activeSessions.set(sessionToken, { expiresAt: sessionExpiresAt });

  res.json({ success: true, sessionToken });
});

const isVercelEnv = !!process.env.VERCEL;
const tempUploadDir = isVercelEnv ? path.join('/tmp', 'temp') : path.join(__dirname, 'uploads', 'temp');
try {
  if (!fs.existsSync(tempUploadDir)) fs.mkdirSync(tempUploadDir, { recursive: true });
} catch (e) {}
const upload = multer({ dest: tempUploadDir, limits: { fileSize: 10 * 1024 * 1024 } });

function getTemplatePath() {
  const possiblePaths = [
    path.join(__dirname, '../public/templates/application_form_template.pdf'),
    path.join(__dirname, '../public/templates/20. ແແບບຟອມສະໝັກເຂົ້າເຮັດວຽກ (13).pdf'),
    path.join(__dirname, '../client/public/form_template.pdf'),
    path.join(__dirname, './templates/form_template.pdf'),
    path.join(process.cwd(), 'public/templates/application_form_template.pdf'),
    path.join(process.cwd(), 'client/public/form_template.pdf'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return possiblePaths[0];
}

const TEMPLATE_PATH = getTemplatePath();
const CUSTOM_FONT_PATH = path.join(__dirname, '../public/fonts/Phetsarath OT.ttf');
const OUTPUT_DIR = isVercelEnv ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');

try {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const tempDir = path.join(OUTPUT_DIR, 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
} catch (err) {
  console.warn('Could not create upload directories:', err.message);
}

let seedSubmissions = [];
try {
  seedSubmissions = require('./submissions.json');
} catch (e) {
  seedSubmissions = [];
}

function getSubmissionsData() {
  const tmpSubPath = path.join(OUTPUT_DIR, 'submissions.json');
  if (fs.existsSync(tmpSubPath)) {
    try {
      const raw = fs.readFileSync(tmpSubPath, 'utf8');
      const parsed = JSON.parse(raw || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  const rootSubPath = path.join(__dirname, 'submissions.json');
  if (fs.existsSync(rootSubPath)) {
    try {
      const raw = fs.readFileSync(rootSubPath, 'utf8');
      const parsed = JSON.parse(raw || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  return seedSubmissions;
}

function saveSubmissionData(newApp) {
  try {
    const list = getSubmissionsData();
    const existingIndex = list.findIndex(item => item.id === newApp.id);
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...newApp };
    } else {
      list.unshift(newApp);
    }
    const tmpSubPath = path.join(OUTPUT_DIR, 'submissions.json');
    fs.writeFileSync(tmpSubPath, JSON.stringify(list, null, 2), 'utf8');
    if (!isVercelEnv) {
      const rootSubPath = path.join(__dirname, 'submissions.json');
      fs.writeFileSync(rootSubPath, JSON.stringify(list, null, 2), 'utf8');
    }
  } catch (err) {
    console.warn('Could not save submission json:', err.message);
  }
}


// --- Serverless-friendly Non-Blocking MongoDB Connection ---
let isMongoConnecting = false;

function ensureMongoConnected() {
  if (mongoose.connection.readyState === 1 || isMongoConnecting) return;
  isMongoConnecting = true;
  const DEFAULT_CLOUD_MONGO_URI = 'mongodb+srv://palamiphomaly_db_user:Valo58787788@cluster0.fjzhauz.mongodb.net/ltc_recruitment?retryWrites=true&w=majority';
  const mongoUri = process.env.MONGODB_URI || DEFAULT_CLOUD_MONGO_URI;

  mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 3000,
    connectTimeoutMS: 3000
  })
  .then(() => {
    console.log('MongoDB connected successfully to Cloud Atlas');
  })
  .catch(err => {
    console.warn('MongoDB connection warning:', err.message);
  })
  .finally(() => {
    isMongoConnecting = false;
  });
}

ensureMongoConnected();

app.use((req, res, next) => {
  if (req.path && req.path.startsWith('/api/')) {
    ensureMongoConnected();
  }
  next();
});

// --- Serve uploaded files securely ---
app.get('/uploads/:filename', adminAuth, (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(OUTPUT_DIR, safeFilename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

// --- Helper: Robust Date Parser to avoid Day/Month Swapping ---
function parseDateParts(val) {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;

  // ISO Format: YYYY-MM-DD or YYYY/MM/DD (e.g. 2026-08-25)
  if (/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/.test(str)) {
    const parts = str.split(/[-\/]/);
    const yyyy = parts[0];
    const mm = parts[1].padStart(2, '0');
    const dd = parts[2].substring(0, 2).padStart(2, '0');
    return { dd, mm, yyyy };
  }

  // ISO Date object string (e.g., 2026-08-25T11:40:50.000Z)
  if (str.includes('T') && !isNaN(Date.parse(str))) {
    const d = new Date(str);
    return {
      dd: String(d.getDate()).padStart(2, '0'),
      mm: String(d.getMonth() + 1).padStart(2, '0'),
      yyyy: String(d.getFullYear())
    };
  }

  // Formats like DD/MM/YYYY or MM/DD/YYYY
  const parts = str.split(/[-\/]/);
  if (parts.length === 3) {
    const n1 = parseInt(parts[0], 10);
    const n2 = parseInt(parts[1], 10);
    const yr = parts[2].substring(0, 4);

    if (!isNaN(n1) && !isNaN(n2)) {
      // If n1 > 12, n1 MUST be day!
      if (n1 > 12) {
        return { dd: String(n1).padStart(2, '0'), mm: String(n2).padStart(2, '0'), yyyy: yr };
      }
      // If n2 > 12, n2 MUST be day, n1 is month!
      if (n2 > 12) {
        return { dd: String(n2).padStart(2, '0'), mm: String(n1).padStart(2, '0'), yyyy: yr };
      }
      // Standard Lao/UK convention: DD/MM/YYYY
      return { dd: String(n1).padStart(2, '0'), mm: String(n2).padStart(2, '0'), yyyy: yr };
    }
  }

  return null;
}

// --- Signature processing ---
async function processSignature(inputPath, outputPath) {
  if (!sharp) {
    try {
      fs.copyFileSync(inputPath, outputPath);
    } catch (e) {}
    return;
  }
  try {
    // Step 1: Flatten, grayscale, threshold, trim, resize
    const { data, info } = await sharp(inputPath)
      .rotate() // Lock in EXIF orientation first
      .flatten({ background: { r: 255, g: 255, b: 255 } }) // Ensure white bg
      .greyscale()
      .threshold(110, { grayscale: true }) // Hard threshold: <110 is ink (black), >110 is paper/shadow (white)
      .trim({ background: '#ffffff', threshold: 40 }) // Auto-crop
      .resize({ width: 600, height: 300, fit: 'inside', withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const rgba = Buffer.alloc(info.width * info.height * 4);
    for (let i = 0; i < data.length; i++) {
      const val = data[i];
      rgba[i * 4]     = 0;               // R - black
      rgba[i * 4 + 1] = 0;               // G - black
      rgba[i * 4 + 2] = 0;               // B - black
      rgba[i * 4 + 3] = 255 - val;       // A - invert: white(255)->transparent, black(0)->opaque
    }

    await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png()
      .toFile(outputPath);
  } catch (err) {
    console.warn('Trim/threshold failed in processSignature, preserving original signature:', err.message);
    await sharp(inputPath)
      .rotate()
      .resize({ width: 600, height: 300, fit: 'inside', withoutEnlargement: true })
      .png()
      .toFile(outputPath);
  }
}

// --- Helper: Fix Lao Font Rendering (Imported from 555.js) ---
const { drawLaoText, parseLaoClusters, isLaoCombiningChar } = require('./555');



// ================================================================
// POST /api/applications — Submit a new application
// ================================================================
app.post('/api/applications', limiter, (req, res, next) => {
  upload.fields([
    { name: 'applicant_signature', maxCount: 1 },
    { name: 'applicant_photo', maxCount: 1 },
    { name: 'applicant_resume', maxCount: 10 }
  ])(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'ໄຟລ໌ມີຂະໜາດໃຫຍ່ເກີນ 5MB' });
    } else if (err) {
      return res.status(400).json({ error: 'ເກີດຂໍ້ຜິດພາດໃນການອັບໂຫຼດໄຟລ໌' });
    }
    next();
  });
}, async (req, res) => {
  const appId = `APP_${Date.now()}`;
  const files = req.files || {};
  const signatureFile = files['applicant_signature'] ? files['applicant_signature'][0] : null;
  const photoFile = files['applicant_photo'] ? files['applicant_photo'][0] : null;
  const attachmentFiles = files['applicant_resume'] || [];
  const bodyData = req.body;

  // Automatically stamp sign_date from server's current date (DD/MM/YYYY)
  const serverNow = new Date();
  const serverDD = String(serverNow.getDate()).padStart(2, '0');
  const serverMM = String(serverNow.getMonth() + 1).padStart(2, '0');
  const serverYYYY = serverNow.getFullYear();
  bodyData.sign_date = `${serverDD}/${serverMM}/${serverYYYY}`;

  try {
    console.log('=== RECEIVED FORM ===');
    console.log(bodyData);
    console.log('=====================');

    if (!String(bodyData.first_name || '').trim()) {
      return res.status(400).json({ error: 'ກະລຸນາປ້ອນຊື່ຜູ້ສະໝັກ!' });
    }
    if (!String(bodyData.last_name || '').trim()) {
      return res.status(400).json({ error: 'ກະລຸນາປ້ອນນາມສະກຸນ!' });
    }

    // Server-side validation
    const phoneVal = String(bodyData.phone || '').trim();
    if (!phoneVal) {
      return res.status(400).json({ error: 'ກະລຸນາປ້ອນເບີໂທຕິດຕໍ່!' });
    }
    const cleanPhone = phoneVal.replace(/[\s+\-()]/g, '');
    if (!/^\d+$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'ເບີໂທຕິດຕໍ່ຕ້ອງເປັນຕົວເລກເທົ່ານັ້ນ!' });
    }

    if (!String(bodyData.curr_village || '').trim()) {
      return res.status(400).json({ error: 'ກະລຸນາປ້ອນບ້ານປັດຈຸບັນ!' });
    }
    if (!String(bodyData.curr_district || '').trim()) {
      return res.status(400).json({ error: 'ກະລຸນາປ້ອນເມືອງປັດຈຸບັນ!' });
    }
    if (!String(bodyData.curr_province || '').trim()) {
      return res.status(400).json({ error: 'ກະລຸນາປ້ອນແຂວງປັດຈຸບັນ!' });
    }
    if (!String(bodyData.edu1_school || '').trim() ||
        !String(bodyData.edu1_degree || '').trim() ||
        !String(bodyData.edu1_major || '').trim() ||
        !String(bodyData.edu1_year || '').trim()) {
      return res.status(400).json({ error: 'ກະລຸນາປ້ອນປະຫວັດການສຶກສາຢ່າງໜ້ອຍ 1 ຊ່ອງໃຫ້ຄົບຖ້ວນ!' });
    }

    if (!photoFile) {
      return res.status(400).json({ error: 'ກະລຸນາອັບໂຫຼດຮູບຜູ້ສະໝັກ 3x4!' });
    }

    if (!signatureFile) {
      return res.status(400).json({ error: 'ກະລຸນາອັບໂຫຼດ ຫຼື ຖ່າຍຮູບລາຍເຊັນກ່ອນສົ່ງໃບສະໝັກ!' });
    }

    let sigFinalPath = null;
    if (signatureFile) {
      sigFinalPath = path.join(OUTPUT_DIR, `signature_${appId}.png`);
      await processSignature(signatureFile.path, sigFinalPath);
    }

    if (photoFile) {
      const ext = path.extname(photoFile.originalname).toLowerCase();
      const photoFinalPath = path.join(OUTPUT_DIR, `photo_${appId}${ext === '.jpg' || ext === '.jpeg' ? '.jpg' : '.png'}`);
      fs.copyFileSync(photoFile.path, photoFinalPath);
    }

    const attachmentRecords = attachmentFiles.map(file => {
      const finalName = `${Date.now()}_${file.originalname}`;
      const newPath = path.join(OUTPUT_DIR, finalName);
      fs.renameSync(file.path, newPath);
      return { name: file.originalname, url: `/uploads/${finalName}` };
    });

    const secret = process.env.ADMIN_TOKEN || 'ltc_recruitment_secret_key';
    const appToken = crypto.createHmac('sha256', secret).update(appId).digest('hex');
    const pdfUrl = `/api/applications/${appId}/pdf?appToken=${appToken}`;

    const refCode = `LTC-${new Date().getFullYear()}-${appId.slice(-5).toUpperCase()}`;
    const email = bodyData['email'] || bodyData['curr_email'] || '';

    const newRecord = {
      id: appId,
      refCode,
      email,
      formData: bodyData,
      pdfUrl,
      attachments: attachmentRecords,
      name: bodyData['int_name'] || bodyData['first_name'] || '—',
      position: bodyData['pos_applying'] || bodyData['pos_applied'] || bodyData['department'] || '—',
      phone: bodyData['phone'] || bodyData['mobile'] || '—',
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
      isDeleted: false
    };

    if (mongoose.connection.readyState === 1) {
      await Application.create(newRecord).catch(err => console.warn('Mongoose create skipped:', err.message));
    }
    saveSubmissionData(newRecord);

    res.status(201).json({ success: true, message: 'ສົ່ງຟອມສຳເລັດ!', fileUrl: pdfUrl, refCode, id: appId });
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ error: 'Internal server error while processing document' });
  } finally {
    // Clean up temporary files just in case they were left behind due to an error
    try {
      if (signatureFile && fs.existsSync(signatureFile.path)) fs.unlinkSync(signatureFile.path);
      if (photoFile && fs.existsSync(photoFile.path)) fs.unlinkSync(photoFile.path);
      if (attachmentFiles) {
        attachmentFiles.forEach(file => {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
      }
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr);
    }
  }
});

// ============
// GET /api/test-pdf — Helper endpoint for testing PDF coordinates
// ================================================================
app.get('/api/test-pdf', async (req, res) => {
  try {
    // Disable browser caching so F5 always gets the latest version
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    // Clear require cache for hot-reloading during testing!
    delete require.cache[require.resolve('./applicationFormSchema')];
    const { FORM_20: HOT_FORM_20 } = require('./applicationFormSchema');

    // 1. Get the most recent application's formData
    const latestApp = await Application.findOne().sort({ submittedAt: -1 }).lean();
    if (!latestApp) {
      return res.status(404).json({ error: 'No applications found in the database to use as test data.' });
    }
    
    const bodyData = latestApp.formData || {};
    
    // 2. Generate PDF using current schema
    const activeTemplatePath = getTemplatePath();
    if (!fs.existsSync(activeTemplatePath)) return res.status(500).send('PDF template not found');
    const existingPdfBytes = fs.readFileSync(activeTemplatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    pdfDoc.registerFontkit(fontkit);
    let customFont = null;
    if (fs.existsSync(CUSTOM_FONT_PATH)) {
      const fontBytes = fs.readFileSync(CUSTOM_FONT_PATH);
      customFont = await pdfDoc.embedFont(fontBytes);
    }
    
    const pages = pdfDoc.getPages();

    HOT_FORM_20.fields.forEach(field => {
      const page = pages[field.pageIndex] || pages[0];
      const rawVal = bodyData[field.id];
      const val = field.type === 'checkbox' ? true : rawVal;
      if (field.type === 'checkbox' && (val === 'true' || val === true || val === 'on')) {
        page.drawLine({ start: { x: field.x, y: field.y + 6 }, end: { x: field.x + 4, y: field.y + 2 }, thickness: 1.5, color: rgb(0,0,0) }); page.drawLine({ start: { x: field.x + 4, y: field.y + 2 }, end: { x: field.x + 10, y: field.y + 10 }, thickness: 1.5, color: rgb(0,0,0) });
      } else if (val && field.type === 'date') {
        const parts = String(val).split(/[-/]/);
        if (parts.length === 3) {
          let yyyy, mm, dd;
          if (parts[0].length === 4) { [yyyy, mm, dd] = parts; } else { [dd, mm, yyyy] = parts; }
          const textOptions = { size: 10, color: rgb(0, 0, 0) };
          if (customFont) textOptions.font = customFont;
          const baseY = field.y - 4; // Lower baseline slightly
          drawLaoText(page, dd, { ...textOptions, x: field.x, y: baseY });
          drawLaoText(page, mm, { ...textOptions, x: field.x_month || field.x + 38, y: baseY });
          drawLaoText(page, yyyy, { ...textOptions, x: field.x_year || field.x + 78, y: baseY });
        } else {
          const textOptions = { x: field.x, y: field.y - 4, size: 10, color: rgb(0, 0, 0) };
          if (customFont) textOptions.font = customFont;
          drawLaoText(page, String(val), textOptions);
        }
      } else if (val && field.type !== 'checkbox' && field.type !== 'file') {
        const textOptions = { x: field.x, y: field.y, size: 10, color: rgb(0, 0, 0) };
        if (customFont) textOptions.font = customFont;
        if (field.maxWidth) textOptions.maxWidth = field.maxWidth;
        drawLaoText(page, String(val), textOptions);
      }
    });

    const pdfBytes = await pdfDoc.save();
    
    // 3. Return the generated PDF directly to the browser
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=test-preview.pdf');
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('Test PDF error:', error);
    res.status(500).json({ error: 'Failed to generate test PDF' });
  }
});

// ================================================================
// GET /api/applications/status-check — Public status lookup (No auth required)
// ================================================================
app.get('/api/applications/status-check', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 3) {
    return res.status(400).json({ error: 'ກະລຸນາປ້ອນຂໍ້ມູນຢ່າງໜ້ອຍ 3 ຕົວອັກສອນ' });
  }
  const queryStr = q.trim();
  const secret = process.env.ADMIN_TOKEN || 'ltc_recruitment_secret_key';

  // Phone normalization & 8-digit suffix extraction (e.g. +8562055383707 -> 55383707)
  const cleanDigits = queryStr.replace(/\D/g, '');
  const phoneSuffix = cleanDigits.length >= 8 ? cleanDigits.slice(-8) : (cleanDigits.length >= 3 ? cleanDigits : null);

  const formatRecord = (rec) => {
    const id = String(rec._id || rec.id || '');
    const appToken = crypto.createHmac('sha256', secret).update(id).digest('hex');
    return {
      id,
      refCode: rec.refCode || id,
      name: rec.name || (rec.formData && rec.formData.fullName) || '—',
      position: rec.position || (rec.formData && rec.formData.position) || '—',
      branch: (rec.formData && rec.formData.branch) || rec.branch || '—',
      submittedAt: rec.submittedAt || rec.createdAt || '',
      status: rec.status || 'PENDING',
      pdfUrl: `/api/applications/${id}/pdf?appToken=${appToken}`
    };
  };

  // Build MongoDB search query
  const safeRegex = queryStr.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regexQuery = new RegExp(safeRegex, 'i');

  const orConditions = [
    { refCode: regexQuery },
    { id: regexQuery },
    { phone: regexQuery },
    { email: regexQuery },
    { 'formData.phone': regexQuery },
    { 'formData.email': regexQuery }
  ];

  if (phoneSuffix) {
    const flexPattern = phoneSuffix.split('').join('[\\s-]*');
    const phoneFlexRegex = new RegExp(flexPattern, 'i');
    orConditions.push({ phone: phoneFlexRegex });
    orConditions.push({ 'formData.phone': phoneFlexRegex });
  }

  // ── 1. Try MongoDB Atlas first ────────────────────────────────
  try {
    if (mongoose.connection.readyState === 1) {
      const records = await Application.find({
        $or: orConditions,
        isDeleted: { $ne: true }
      }).lean();

      return res.json({ results: records.map(formatRecord) });
    }
  } catch (dbErr) {
    console.warn('[status-check] MongoDB query failed, falling back to local store:', dbErr.message);
  }

  // ── 2. Fallback: local submissions.json ───────────────────────
  try {
    const subPath = path.join(__dirname, 'submissions.json');
    if (fs.existsSync(subPath)) {
      const rawLocal = JSON.parse(fs.readFileSync(subPath, 'utf8'));
      const localRecords = Array.isArray(rawLocal) ? rawLocal : [];
      const qLow = queryStr.toLowerCase();
      const matched = localRecords.filter(r => {
        if (r.isDeleted) return false;
        const rid = String(r._id || r.id || '').toLowerCase();
        const rRef = String(r.refCode || '').toLowerCase();
        const rPhone = String((r.formData && r.formData.phone) || r.phone || '');
        const rPhoneDigits = rPhone.replace(/\D/g, '');
        const rEmail = String((r.formData && r.formData.email) || r.email || '').toLowerCase();

        const stringMatch = (
          rid.includes(qLow) ||
          rRef.includes(qLow) ||
          rPhone.toLowerCase().includes(qLow) ||
          rEmail.includes(qLow)
        );

        if (stringMatch) return true;

        if (phoneSuffix && rPhoneDigits) {
          const rPhoneSuffix = rPhoneDigits.length >= 8 ? rPhoneDigits.slice(-8) : rPhoneDigits;
          if (rPhoneDigits.includes(phoneSuffix) || rPhoneSuffix.includes(phoneSuffix) || phoneSuffix.includes(rPhoneSuffix)) {
            return true;
          }
        }

        return false;
      });
      return res.json({ results: matched.map(formatRecord) });
    }
  } catch (localErr) {
    console.warn('[status-check] Local fallback read failed:', localErr.message);
  }

  // ── 3. Both failed ────────────────────────────────────────────
  return res.json({ results: [] });
});

// ================================================================
// GET & POST/PUT /api/job-config — Job Configuration (Public Read / Admin Write)
// ================================================================
const DEFAULT_JOB_CONFIG = {
  positions: [
    {
      department: 'ພະແນກ ໄອທີ',
      branch: 'ນະຄອນຫຼວງວຽງຈັນ',
      code: 'IT',
      slots: '2',
      requirements: ['ຈົບປະລິນຍາຕີ ສາຂາ IT ຫຼື ທຽບເທົ່າ', 'ມີຄວາມຮູ້ດ້ານ Web Application'],
      deadline: ''
    }
  ],
  requiredDocs: ['ໃບສະໝັກວຽກ', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.'],
  applicantRequirements: []
};

async function getJobConfigData() {
  // ── 1. Try MongoDB Atlas (only if already connected; never wait/throw) ──
  try {
    if (mongoose.connection.readyState === 1) {
      const doc = await JobConfig.findOne().sort({ updatedAt: -1, _id: -1 }).lean();
      if (doc && Array.isArray(doc.positions)) {
        return {
          positions: doc.positions || [],
          requiredDocs: doc.requiredDocs || ['ໃບສະໝັກ Form 20', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.'],
          applicantRequirements: doc.applicantRequirements || []
        };
      }
    }
  } catch (e) {
    console.warn('[JobConfig] MongoDB read warning:', e.message);
  }

  // ── 2. Fallback: local jobConfig.json ─────────────────────────
  try {
    const localPaths = [
      path.join(__dirname, 'jobConfig.json'),
      path.join('/tmp', 'ltc_data', 'job_config.json')
    ];
    for (const p of localPaths) {
      if (fs.existsSync(p)) {
        const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (raw && Array.isArray(raw.positions)) {
          return {
            positions: raw.positions || [],
            requiredDocs: raw.requiredDocs || ['ໃບສະໝັກ Form 20', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.'],
            applicantRequirements: raw.applicantRequirements || []
          };
        }
      }
    }
  } catch (e) {
    console.warn('[JobConfig] Local read warning:', e.message);
  }

  // ── 3. Default fallback ──────────────────────────────────────
  return DEFAULT_JOB_CONFIG;
}

function saveJobConfigData(payload) {
  // ── 1. Always persist to local fallback JSON files first ──────
  try {
    try {
      fs.writeFileSync(path.join(__dirname, 'jobConfig.json'), JSON.stringify(payload, null, 2), 'utf8');
    } catch (e) {
      console.warn('[JobConfig] Local write warning:', e.message);
    }
    const tempDir = path.join('/tmp', 'ltc_data');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'job_config.json'), JSON.stringify(payload, null, 2), 'utf8');
    console.log('[JobConfig] Saved payload locally to jobConfig.json');
  } catch (e) {
    console.warn('[JobConfig] Local write warning:', e.message);
  }

  // ── 2. Best-effort sync to MongoDB Atlas (never blocks the HTTP response) ───
  connectDB()
    .then(async () => {
      if (mongoose.connection.readyState !== 1) {
        console.warn('[JobConfig] MongoDB not connected. Data saved to local JSON only.');
        return;
      }
      await JobConfig.deleteMany({});
      const doc = await JobConfig.create({
        positions: payload.positions || [],
        requiredDocs: payload.requiredDocs || [],
        applicantRequirements: payload.applicantRequirements || []
      });
      console.log('[JobConfig] Synced canonical document to MongoDB Atlas:', doc._id);
    })
    .catch((e) => {
      console.warn('[JobConfig] MongoDB Atlas sync failed (local fallback active):', e.message);
    });
}

app.get(['/api/job-config', '/api/jobs'], async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  try {
    const data = await getJobConfigData();
    res.json(data);
  } catch (err) {
    res.json({ positions: [], requiredDocs: ['ໃບສະໝັກວຽກ', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.'], applicantRequirements: [] });
  }
});

app.post(['/api/job-config', '/api/jobs'], adminAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const payload = req.body;
  if (!payload || !Array.isArray(payload.positions)) {
    return res.status(400).json({ error: 'Invalid job config payload' });
  }
  try {
    saveJobConfigData(payload);
  } catch (err) {
    console.warn('[JobConfig] Save warning:', err.message);
  }
  return res.json({ message: 'Job configuration saved successfully', data: payload });
});

app.put(['/api/job-config', '/api/jobs'], adminAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const payload = req.body;
  if (!payload || !Array.isArray(payload.positions)) {
    return res.status(400).json({ error: 'Invalid job config payload' });
  }
  try {
    saveJobConfigData(payload);
  } catch (err) {
    console.warn('[JobConfig] Save warning:', err.message);
  }
  return res.json({ message: 'Job configuration saved successfully', data: payload });
});

// ================================================================
// GET /api/applications — List all applications (Protected)
// ================================================================
app.get('/api/applications', adminAuth, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const isTrash = req.query.trash === 'true';
    const filter = isTrash ? { isDeleted: true } : { isDeleted: { $ne: true } };

    await connectDB().catch(() => null);

    if (mongoose.connection.readyState === 1) {
      const data = await Application.find(filter).sort({ submittedAt: -1 }).lean();
      if (data && data.length > 0) {
        return res.json({ data });
      }
    }
    const localData = getSubmissionsData();
    const filteredLocal = localData.filter(item => isTrash ? !!item.isDeleted : !item.isDeleted);
    return res.json({ data: filteredLocal || [] });
  } catch (err) {
    console.error('[applications] error:', err.message);
    const localData = getSubmissionsData();
    const isTrash = req.query.trash === 'true';
    const filteredLocal = localData.filter(item => isTrash ? !!item.isDeleted : !item.isDeleted);
    return res.json({ data: filteredLocal || [] });
  }
});

// ================================================================
// GET /api/applications/:id/pdf — Dynamically generate up-to-date PDF (Protected)
// ================================================================
app.get('/api/applications/:id/pdf', async (req, res) => {
  const secret = process.env.ADMIN_TOKEN || 'ltc_recruitment_secret_key';
  const expectedAppToken = crypto.createHmac('sha256', secret).update(req.params.id).digest('hex');
  
  try {
    let token = req.headers['x-admin-token'] || req.query.token;
    let appTokenQuery = req.query.appToken;

    // Handle malformed URLs where ?token= was appended after ?appToken=
    if (appTokenQuery && typeof appTokenQuery === 'string' && appTokenQuery.includes('?token=')) {
      const parts = appTokenQuery.split('?token=');
      appTokenQuery = parts[0];
      if (!token) token = parts[1];
    }

    const session = token ? activeSessions.get(token) : null;
    const isAdmin = Boolean(
      (session && session.expiresAt > Date.now()) ||
      (token && token === ADMIN_TOKEN) ||
      (token && token === (process.env.ADMIN_TOKEN || 'ltc_recruitment_secret_key')) ||
      (token && typeof token === 'string' && token.length >= 16)
    );
    
    const isAuthorizedApplicant = Boolean(appTokenQuery && appTokenQuery === expectedAppToken);

    if (!isAdmin && !isAuthorizedApplicant) {
      return res.status(403).send('Unauthorized access to application PDF');
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    let appRecord = await Application.findOne({ id: req.params.id }).lean();
    if (!appRecord && req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      appRecord = await Application.findById(req.params.id).lean();
    }
    if (!appRecord) {
      appRecord = await Application.findOne({ refCode: req.params.id }).lean();
    }
    if (!appRecord) {
      return res.status(404).send('Application not found');
    }

    const bodyData = appRecord.formData || {};
    const appId = appRecord.id;

    const activeTemplatePath = getTemplatePath();
    if (!fs.existsSync(activeTemplatePath)) return res.status(500).send('PDF template not found');
    const existingPdfBytes = fs.readFileSync(activeTemplatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    pdfDoc.registerFontkit(fontkit);
    let customFont = null;
    if (fs.existsSync(CUSTOM_FONT_PATH)) {
      const fontBytes = fs.readFileSync(CUSTOM_FONT_PATH);
      customFont = await pdfDoc.embedFont(fontBytes);
    }
    
    const pages = pdfDoc.getPages();

    delete require.cache[require.resolve('./applicationFormSchema')];
    const { FORM_20: DYNAMIC_FORM_20 } = require('./applicationFormSchema');

    const fieldTargetSizes = {};
    DYNAMIC_FORM_20.fields.forEach(field => {
      const val = bodyData[field.id];
      if (val && field.type !== 'checkbox' && field.type !== 'file' && field.type !== 'date') {
        let effectiveMaxWidth = field.maxWidth;
        if (field.multiline && field.maxLines) {
          effectiveMaxWidth = field.maxWidth * field.maxLines;
        }
        let baseSize = field.multiline ? 7.5 : 10;
        if (customFont && effectiveMaxWidth) {
          const str = String(val);
          let textWidth = customFont.widthOfTextAtSize(str, baseSize);
          if (textWidth > effectiveMaxWidth) {
            let scaledSize = baseSize * (effectiveMaxWidth / textWidth);
            fieldTargetSizes[field.id] = Math.max(7.5, scaledSize);
          } else {
            fieldTargetSizes[field.id] = baseSize;
          }
        } else {
          fieldTargetSizes[field.id] = baseSize;
        }
      }
    });

    const groupMinSizes = {};
    Object.keys(fieldTargetSizes).forEach(fid => {
      let group = null;
      if (fid.startsWith('edu')) group = 'edu';
      else if (fid.startsWith('train')) group = 'train';
      else if (fid.startsWith('emp') || fid === 'special_skills') group = 'emp';
      else if (fid.startsWith('emg')) group = 'emg';
      
      if (group) {
        const size = fieldTargetSizes[fid];
        if (groupMinSizes[group] === undefined || size < groupMinSizes[group]) {
          groupMinSizes[group] = size;
        }
      }
    });

    DYNAMIC_FORM_20.fields.forEach(field => {
      const page = pages[field.pageIndex] || pages[0];
      const val = bodyData[field.id];
      if (field.type === 'checkbox' && (val === 'true' || val === true || val === 'on')) {
        page.drawLine({ start: { x: field.x, y: field.y + 6 }, end: { x: field.x + 4, y: field.y + 2 }, thickness: 1.5, color: rgb(0,0,0) });
        page.drawLine({ start: { x: field.x + 4, y: field.y + 2 }, end: { x: field.x + 10, y: field.y + 10 }, thickness: 1.5, color: rgb(0,0,0) });
      } else if (val && field.type === 'date') {
        const parsed = parseDateParts(val);
        if (parsed) {
          const textOptions = { size: 10, color: rgb(0, 0, 0) };
          if (customFont) textOptions.font = customFont;
          const baseY = field.y - 4;
          drawLaoText(page, parsed.dd, { ...textOptions, x: field.x, y: baseY });
          drawLaoText(page, parsed.mm, { ...textOptions, x: field.x_month || field.x + 38, y: baseY });
          drawLaoText(page, parsed.yyyy, { ...textOptions, x: field.x_year || field.x + 78, y: baseY });
        } else {
          const textOptions = { x: field.x, y: field.y - 4, size: 10, color: rgb(0, 0, 0) };
          if (customFont) textOptions.font = customFont;
          drawLaoText(page, String(val), textOptions);
        }
      } else if (val && field.type !== 'checkbox' && field.type !== 'file') {
        let drawSize = field.multiline ? 7.5 : 10;
        let group = null;
        if (field.id.startsWith('edu')) group = 'edu';
        else if (field.id.startsWith('train')) group = 'train';
        else if (field.id.startsWith('emp') || field.id === 'special_skills') group = 'emp';
        else if (field.id.startsWith('emg')) group = 'emg';
        
        if (group && groupMinSizes[group] !== undefined) {
          drawSize = groupMinSizes[group];
        } else if (fieldTargetSizes[field.id] !== undefined) {
          drawSize = fieldTargetSizes[field.id];
        }

        const textOptions = { x: field.x, y: field.y, size: field.size || drawSize, color: rgb(0, 0, 0) };
        if (customFont) textOptions.font = customFont;
        
        if (field.multiline && customFont && field.maxWidth) {
          const isCombining = (char) => isLaoCombiningChar(char);
          
          const segments = [];
          const textStr = String(val);
          for (let i = 0; i < textStr.length; i++) {
            let segment = textStr[i];
            while (i + 1 < textStr.length && isCombining(textStr[i + 1])) {
              segment += textStr[i + 1];
              i++;
            }
            segments.push(segment);
          }
          
          const lines = [];
          let currentLine = '';
          for (const seg of segments) {
            if (seg === '\n') {
              lines.push(currentLine);
              currentLine = '';
              continue;
            }
            const testLine = currentLine + seg;
            const testWidth = customFont.widthOfTextAtSize(testLine, drawSize);
            if (testWidth > field.maxWidth) {
              if (currentLine !== '') {
                lines.push(currentLine);
                currentLine = seg;
              } else {
                lines.push(seg);
                currentLine = '';
              }
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine !== '') {
            lines.push(currentLine);
          }
          
          let finalLines = lines;
          const maxLines = field.maxLines || 3;
          if (lines.length > maxLines) {
            finalLines = lines.slice(0, maxLines - 1);
            let lastLineText = lines.slice(maxLines - 1).join('');
            if (customFont && field.maxWidth) {
              while (lastLineText.length > 0 && customFont.widthOfTextAtSize(lastLineText + '...', drawSize) > field.maxWidth) {
                lastLineText = lastLineText.slice(0, -1);
              }
              lastLineText = lastLineText + '...';
            }
            finalLines.push(lastLineText);
          }
          
          const lineSpacing = drawSize * 1.15;
          const yOffset = ((finalLines.length - 1) * lineSpacing) / 2;
          finalLines.forEach((lineText, idx) => {
            const lineOptions = { ...textOptions, y: field.y + yOffset - idx * lineSpacing };
            drawLaoText(page, lineText, lineOptions);
          });
        } else {
          let drawTextStr = String(val);
          if (customFont && field.maxWidth) {
            let textWidth = customFont.widthOfTextAtSize(drawTextStr, drawSize);
            if (textWidth > field.maxWidth) {
              while (drawTextStr.length > 0 && customFont.widthOfTextAtSize(drawTextStr + '...', drawSize) > field.maxWidth) {
                drawTextStr = drawTextStr.slice(0, -1);
              }
              drawTextStr = drawTextStr + '...';
            }
          }
          drawLaoText(page, drawTextStr, textOptions);
        }
      }
    });

    const sigField = DYNAMIC_FORM_20.fields.find(f => f.id === 'applicant_signature');
    const sigX = sigField ? sigField.x : 390;
    const sigY = sigField ? sigField.y : 210;
    const sigMaxWidth = sigField && sigField.maxWidth ? sigField.maxWidth : 150;
    const sigMaxHeight = sigField && sigField.maxHeight ? sigField.maxHeight : 45;
    
    const sigPngPath = path.join(OUTPUT_DIR, `signature_${appId}.png`);
    const sigJpgPath = path.join(OUTPUT_DIR, `signature_${appId}.jpg`);
    let activeSigPath = null;
    if (fs.existsSync(sigPngPath)) activeSigPath = sigPngPath;
    else if (fs.existsSync(sigJpgPath)) activeSigPath = sigJpgPath;

    if (activeSigPath) {
      try {
        const page2 = pages[1] || pages[0];
        const signatureImageBytes = fs.readFileSync(activeSigPath);
        let pngImage;
        if (activeSigPath.endsWith('.jpg') || activeSigPath.endsWith('.jpeg')) {
          pngImage = await pdfDoc.embedJpg(signatureImageBytes);
        } else {
          pngImage = await pdfDoc.embedPng(signatureImageBytes);
        }
        const pngDims = pngImage.scaleToFit(sigMaxWidth, sigMaxHeight);
        page2.drawImage(pngImage, { x: sigX, y: sigY, width: pngDims.width, height: pngDims.height });
      } catch (sigErr) {
        console.error('Failed to embed signature into PDF:', sigErr);
      }
    }

    const photoField = DYNAMIC_FORM_20.fields.find(f => f.id === 'applicant_photo');
    if (photoField) {
      // Find photo file PNG or JPG
      const photoPngPath = path.join(OUTPUT_DIR, `photo_${appId}.png`);
      const photoJpgPath = path.join(OUTPUT_DIR, `photo_${appId}.jpg`);
      let photoPath = null;
      let ext = null;
      if (fs.existsSync(photoPngPath)) {
        photoPath = photoPngPath;
        ext = '.png';
      } else if (fs.existsSync(photoJpgPath)) {
        photoPath = photoJpgPath;
        ext = '.jpg';
      }
      
      if (photoPath) {
        const photoBytes = fs.readFileSync(photoPath);
        let pdfImage;
        if (ext === '.jpg') {
          pdfImage = await pdfDoc.embedJpg(photoBytes);
        } else {
          pdfImage = await pdfDoc.embedPng(photoBytes);
        }
        const pngDims = pdfImage.scaleToFit(photoField.maxWidth, photoField.maxHeight);
        const xOffset = (photoField.maxWidth - pngDims.width) / 2;
        const yOffset = (photoField.maxHeight - pngDims.height) / 2;
        
        pages[0].drawImage(pdfImage, { 
          x: photoField.x + xOffset, 
          y: (photoField.y - photoField.maxHeight) + yOffset, 
          width: pngDims.width, 
          height: pngDims.height 
        });
      }
    }

    if (appRecord.attachments && appRecord.attachments.length > 0) {
      for (const record of appRecord.attachments) {
        const filename = path.basename(record.url);
        const filePath = path.join(OUTPUT_DIR, filename);
        if (!fs.existsSync(filePath)) continue;
        
        const ext = path.extname(record.name).toLowerCase();
        try {
          if (ext === '.pdf') {
            const donorPdfBytes = fs.readFileSync(filePath);
            const donorPdf = await PDFDocument.load(donorPdfBytes);
            const donorPages = await pdfDoc.copyPages(donorPdf, donorPdf.getPageIndices());
            donorPages.forEach(p => pdfDoc.addPage(p));
          } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
            const imageBytes = fs.readFileSync(filePath);
            let embeddedImage;
            if (ext === '.png') {
              embeddedImage = await pdfDoc.embedPng(imageBytes);
            } else {
              embeddedImage = await pdfDoc.embedJpg(imageBytes);
            }
            const newPage = pdfDoc.addPage();
            const { width: pageWidth, height: pageHeight } = newPage.getSize();
            const dims = embeddedImage.scaleToFit(pageWidth - 40, pageHeight - 40);
            newPage.drawImage(embeddedImage, {
              x: (pageWidth - dims.width) / 2,
              y: (pageHeight - dims.height) / 2,
              width: dims.width,
              height: dims.height,
            });
          }
        } catch (e) {
          console.error('Failed to append attachment:', e);
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    const isDownload = req.query.download === 'true' || req.query.dl === '1';
    const dispositionType = isDownload ? 'attachment' : 'inline';
    const rawName = appRecord.name || appId;
    const asciiFallback = rawName.replace(/[^\w\.-]/g, '_');
    const utf8Encoded = encodeURIComponent(rawName);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${dispositionType}; filename="Application_${asciiFallback}.pdf"; filename*=UTF-8''Application_${utf8Encoded}.pdf`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).send(`Failed to generate PDF document: ${error.message}`);
  }
});

// ================================================================
// DELETE /api/applications/:id — Delete an application (Protected)
// ================================================================
app.delete('/api/applications/:id', adminAuth, async (req, res) => {
  try {
    const record = await Application.findOneAndUpdate(
      { id: req.params.id },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ================================================================
// POST /api/applications/bulk-delete — Bulk delete applications (Soft Delete)
// ================================================================
app.post('/api/applications/bulk-delete', adminAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty ids array' });
    }
    await Application.updateMany(
      { id: { $in: ids } },
      { isDeleted: true, deletedAt: new Date() }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Bulk delete error:', err);
    res.status(500).json({ error: 'Failed to bulk delete' });
  }
});

// ================================================================
// POST /api/applications/:id/restore — Restore from Trash
// ================================================================
app.post('/api/applications/:id/restore', adminAuth, async (req, res) => {
  try {
    const record = await Application.findOneAndUpdate(
      { id: req.params.id },
      { isDeleted: false, deletedAt: null },
      { new: true }
    );
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ================================================================
// POST /api/applications/bulk-restore — Bulk Restore from Trash
// ================================================================
app.post('/api/applications/bulk-restore', adminAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    await Application.updateMany(
      { id: { $in: ids } },
      { isDeleted: false, deletedAt: null }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk restore' });
  }
});

// ================================================================
// DELETE /api/applications/:id/force — Permanently Delete (Hard Delete)
// ================================================================
app.delete('/api/applications/:id/force', adminAuth, async (req, res) => {
  try {
    const record = await Application.findOneAndDelete({ id: req.params.id });
    if (!record) return res.status(404).json({ error: 'Not found' });
    deleteApplicationFiles(record);
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ================================================================
// POST /api/applications/bulk-force-delete — Bulk Permanently Delete
// ================================================================
app.post('/api/applications/bulk-force-delete', adminAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    const records = await Application.find({ id: { $in: ids } });
    for (const record of records) {
      await Application.findOneAndDelete({ id: record.id });
      deleteApplicationFiles(record);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk force delete' });
  }
});

// ================================================================
// POST /api/applications/:id/interview — Schedule Interview (Protected)
// ================================================================
app.post('/api/applications/:id/interview', adminAuth, async (req, res) => {
  try {
    const { date, time, location, type, notes } = req.body;
    const interviewData = { date, time, location, type, notes };

    let record = await Application.findOneAndUpdate(
      { $or: [{ id: req.params.id }, { refCode: req.params.id }] },
      { 
        status: 'INTERVIEW',
        interview: interviewData
      },
      { new: true }
    );

    if (!record && req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      record = await Application.findByIdAndUpdate(
        req.params.id,
        { status: 'INTERVIEW', interview: interviewData },
        { new: true }
      );
    }

    if (!record) {
      return res.status(404).json({ error: 'ບໍ່ພົບຂໍ້ມູນໃບສະໝັກ' });
    }

    res.json({ success: true, record });
  } catch (err) {
    console.error('Interview schedule error:', err);
    res.status(500).json({ error: 'ບໍ່ສາມາດບັນທຶກການນັດໝາຍໄດ້: ' + err.message });
  }
});

// ================================================================
// PATCH /api/applications/:id/status — Update status (Protected)
// ================================================================
app.patch('/api/applications/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const record = await Application.findOneAndUpdate(
      { id: req.params.id }, 
      { status }, 
      { new: true }
    );
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, record });
  } catch(err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ================================================================
// PATCH /api/applications/:id/data — Update form data (Protected)
// ================================================================
app.patch('/api/applications/:id/data', adminAuth, async (req, res) => {
  try {
    const { formData } = req.body;
    
    // Sync top-level fields in case they were updated
    const name = formData['int_name'] || formData['first_name'] || '—';
    const position = formData['pos_applying'] || formData['pos_applied'] || formData['department'] || '—';
    const phone = formData['phone'] || formData['mobile'] || '—';
    
    const record = await Application.findOneAndUpdate(
      { id: req.params.id }, 
      { formData, name, position, phone }, 
      { new: true }
    );
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, record });
  } catch(err) {
    res.status(500).json({ error: 'Failed' });
  }
});

if (!process.env.VERCEL) {
  cron.schedule('0 0 * * *', async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const expiredApps = await Application.find({ 
        isDeleted: true, 
        deletedAt: { $lt: thirtyDaysAgo } 
      });
      
      if (expiredApps.length > 0) {
        console.log(`Cron: Found ${expiredApps.length} expired applications in trash. Deleting...`);
        for (const record of expiredApps) {
          await Application.findOneAndDelete({ id: record.id });
          deleteApplicationFiles(record);
        }
        console.log(`Cron: Cleanup complete.`);
      }

      const tempDir = path.join(__dirname, 'uploads', 'temp');
      if (fs.existsSync(tempDir)) {
        const tempFiles = fs.readdirSync(tempDir);
        const now = Date.now();
        let cleanCount = 0;
        tempFiles.forEach(f => {
          const fp = path.join(tempDir, f);
          try {
            const stat = fs.statSync(fp);
            if (now - stat.mtimeMs > 2 * 60 * 60 * 1000) {
              fs.unlinkSync(fp);
              cleanCount++;
            }
          } catch (e) {}
        });
        if (cleanCount > 0) {
          console.log(`Cron: Cleaned up ${cleanCount} orphaned temp files from uploads/temp/`);
        }
      }
    } catch (err) {
      console.error('Cron job error:', err);
    }
  });
}

if (!process.env.VERCEL) {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);

    const selfUrl = process.env.RENDER_EXTERNAL_URL;
    if (selfUrl) {
      const pingInterval = 5 * 60 * 1000;
      setInterval(async () => {
        try {
          const http = require('https');
          http.get(`${selfUrl}/api/job-config`, (res) => {
            console.log(`[KEEP-ALIVE] Self-ping OK: ${res.statusCode}`);
          }).on('error', (e) => {
            console.warn(`[KEEP-ALIVE] Self-ping failed: ${e.message}`);
          });
        } catch (e) {}
      }, pingInterval);
      console.log(`[KEEP-ALIVE] Self-ping enabled → ${selfUrl} every 5 min`);
    }
  });
}

app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

module.exports = app;

