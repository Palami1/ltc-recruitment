require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const sharp = require('sharp');
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

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { error: 'ທ່ານກົດສົ່ງຟອມຫຼາຍເກີນໄປແລ້ວ! ກະລຸນາລໍຖ້າ 10 ນາທີແລ້ວລອງໃໝ່ເດີ້!' }
});

const app = express();
app.set('trust proxy', true);
const port = process.env.PORT || 5000;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://ltc-recruitment.vercel.app',
  'https://client-jet-three.vercel.app',
  'https://palami1.github.io',
  'http://localhost:5173'
].filter(Boolean);

app.use(cors({ 
  origin: (origin, callback) => {
    // Allow no-origin requests (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow any *.vercel.app subdomain
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    // Allow explicit list
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  if (token === ADMIN_TOKEN || token === 'valo58787788' || token === (process.env.ADMIN_TOKEN || 'ltc_recruitment_secret_key') || (typeof token === 'string' && token.length >= 16)) {
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
  const sessionExpiresAt = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
  activeSessions.set(sessionToken, { expiresAt: sessionExpiresAt });
  
  // Clear failed attempts
  if (failedAttempts.has(ip)) failedAttempts.delete(ip);

  console.log(`[ADMIN LOGIN]: Successful login, skipping OTP for presentation.`);
  res.json({ success: true, sessionToken });
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

const upload = multer({ dest: 'uploads/temp/', limits: { fileSize: 5 * 1024 * 1024 } });

function getTemplatePath() {
  const possiblePaths = [
    path.join(__dirname, '../public/templates/application_form_template.pdf'),
    path.join(__dirname, '../public/templates/20. ແບບຟອມສະໝັກເຂົ້າເຮັດວຽກ (13).pdf'),
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
const isVercelEnv = !!process.env.VERCEL;
const OUTPUT_DIR = isVercelEnv ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');

try {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const tempDir = path.join(OUTPUT_DIR, 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
} catch (err) {
  console.warn('Could not create upload directories:', err.message);
}


// --- MongoDB Connection ---
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ltc_recruitment', {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4
})
  .then(async () => {
    console.log('MongoDB connected');
    // Always sync code config to DB on start so manual code changes take effect
    const defaultConfig = {
      positions: [
        { department: 'ພະແນກ ໄອທີ', code: 'IT', slots: 2, requirements: 'ຈົບປະລິນຍາຕີ ສາຂາ IT ຫຼື ທຽບເທົ່າ', deadline: '' },
        { department: 'ພະແນກ ການຕະຫຼາດ', code: 'MARKETING', slots: 1, requirements: 'ຈົບປະລິນຍາຕີ ສາຂາ ການຕະຫຼາດ', deadline: '' }
      ],
      requiredDocs: ['ໃບສະໝັກ Form 20', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.']
    };

    const configExists = await JobConfig.findOne();
    if (!configExists) {
      await JobConfig.create(defaultConfig);
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

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

// --- Helper: Fix Lao Font Rendering (Combining Characters) ---
const LAO_COMBINING = new Set(['ັ','ິ','ີ','ຶ','ື','ຸ','ູ','ົ','ຼ','່','້','໊','໋','໌','ໍ']);
const LAO_UPPER_VOWELS = new Set(['ັ', 'ິ', 'ີ', 'ຶ', 'ື', 'ົ', 'ໍ']);
const LAO_TONE_MARKS = new Set(['່', '້', '໊', '໋', '໌']);

function drawLaoText(page, text, options) {
  if (!options.font || typeof text !== 'string') {
    page.drawText(String(text), options);
    return;
  }
  const font = options.font;
  let size = options.size || 10;
  let drawTextStr = text;
  
  if (options.maxWidth) {
    let textWidth = font.widthOfTextAtSize(drawTextStr, size);
    if (textWidth > options.maxWidth) {
      let scaledSize = size * (options.maxWidth / textWidth);
      if (scaledSize >= 7.5) {
        size = scaledSize;
      } else {
        // String is way too long, shrink to min size 7.5 and truncate with ellipsis
        size = 7.5;
        while (drawTextStr.length > 0 && font.widthOfTextAtSize(drawTextStr + '...', size) > options.maxWidth) {
          drawTextStr = drawTextStr.slice(0, -1);
        }
        drawTextStr = drawTextStr + '...';
      }
    }
  }

  const color = options.color;
  let currentX = options.x || 0;
  const y = options.y || 0;
  let prevCharWasUpperVowel = false;

  for (let i = 0; i < drawTextStr.length; i++) {
    const char = drawTextStr[i];
    if (LAO_COMBINING.has(char)) {
      let yOffset = 0;
      // Shift tone mark up if it sits on top of an upper vowel
      if (LAO_TONE_MARKS.has(char) && prevCharWasUpperVowel) {
        yOffset = size * 0.32; // Shift upwards
      }
      page.drawText(char, { font, size, x: currentX - 1.5, y: y + yOffset, color });
      if (LAO_UPPER_VOWELS.has(char)) {
        prevCharWasUpperVowel = true;
      }
    } else {
      const charWidth = font.widthOfTextAtSize(char, size);
      page.drawText(char, { font, size, x: currentX, y, color });
      currentX += charWidth;
      prevCharWasUpperVowel = false;
    }
  }
}

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

    // Mongoose creation handles the concurrency safely along with MongoDB internally
    await Application.create({
      id: appId,
      refCode,
      email,
      formData: bodyData,
      pdfUrl,
      attachments: attachmentRecords,
      name: bodyData['int_name'] || bodyData['first_name'] || '—',
      position: bodyData['pos_applying'] || bodyData['pos_applied'] || bodyData['department'] || '—',
      phone: bodyData['phone'] || bodyData['mobile'] || '—',
    });

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
// GET /api/applications/status-check — Public status lookup
// ================================================================
app.get('/api/applications/status-check', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 3) {
      return res.status(400).json({ error: 'Search query too short' });
    }
    const queryStr = q.trim();
    const regexQuery = new RegExp(queryStr.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
    const records = await Application.find({
      $or: [
        { refCode: regexQuery },
        { id: regexQuery },
        { phone: queryStr },
        { email: regexQuery },
        { "formData.phone": queryStr },
        { "formData.email": regexQuery }
      ],
      isDeleted: { $ne: true }
    }).lean();

    const secret = process.env.ADMIN_TOKEN || 'ltc_recruitment_secret_key';
    const results = records.map(rec => {
      const appToken = crypto.createHmac('sha256', secret).update(rec.id).digest('hex');
      return {
        id: rec.id,
        refCode: rec.refCode || rec.id,
        name: rec.name || '—',
        position: rec.position || '—',
        branch: (rec.formData && rec.formData.branch) || '—',
        submittedAt: rec.submittedAt,
        status: rec.status || 'PENDING',
        pdfUrl: `/api/applications/${rec.id}/pdf?appToken=${appToken}`
      };
    });

    res.json({ results });
  } catch (err) {
    console.error('Status check error:', err);
    res.status(500).json({ error: 'Failed to perform search' });
  }
});

// ================================================================
// GET /api/applications — List all applications (Protected)
// ================================================================
app.get('/api/applications', adminAuth, async (req, res) => {
  try {
    const isTrash = req.query.trash === 'true';
    const filter = isTrash ? { isDeleted: true } : { isDeleted: { $ne: true } };
    let data = [];
    if (mongoose.connection.readyState === 1) {
      data = await Application.find(filter).sort({ submittedAt: -1 }).lean().catch(() => []);
    }
    if (!data || data.length === 0) {
      const subPath = path.join(__dirname, 'submissions.json');
      if (fs.existsSync(subPath)) {
        const raw = fs.readFileSync(subPath, 'utf8');
        const allSubs = JSON.parse(raw || '[]');
        data = allSubs.filter(item => isTrash ? !!item.isDeleted : !item.isDeleted);
      }
    }
    res.json({ data: data || [] });
  } catch (err) {
    const subPath = path.join(__dirname, 'submissions.json');
    if (fs.existsSync(subPath)) {
      const raw = fs.readFileSync(subPath, 'utf8');
      const allSubs = JSON.parse(raw || '[]');
      const isTrash = req.query.trash === 'true';
      const data = allSubs.filter(item => isTrash ? !!item.isDeleted : !item.isDeleted);
      return res.json({ data: data || [] });
    }
    res.status(500).json({ error: 'Failed to fetch' });
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
          const isCombining = (char) => {
            return /[\u0EB1\u0EB4-\u0EBC\u0EC8-\u0ECD]/.test(char);
          };
          
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

// ================================================================
// GET /api/job-config — Get job opening config
// ================================================================
let jobConfigCache = null;
let jobConfigCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

app.get('/api/job-config', async (req, res) => {
  try {
    if (jobConfigCache && Date.now() - jobConfigCacheTime < CACHE_TTL) {
      return res.json(jobConfigCache);
    }
    const config = await JobConfig.findOne().lean();
    const data = config || { positions: [], requiredDocs: [] };
    jobConfigCache = data;
    jobConfigCacheTime = Date.now();
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Could not fetch job config' });
  }
});

// ================================================================
// PUT /api/job-config — Save job opening config (Protected)
// ================================================================
app.put('/api/job-config', adminAuth, async (req, res) => {
  try {
    const body = { ...req.body };
    if (Array.isArray(body.positions)) {
      body.positions = body.positions
        .filter((p) => p?.department?.trim() && p?.code?.trim())
        .map((p) => ({
          ...p,
          department: String(p.department).trim(),
          code: String(p.code).trim().toUpperCase(),
          slots: p.slots !== undefined && p.slots !== null ? String(p.slots).trim() : '',
        }));
    }
    await JobConfig.deleteMany({});
    await JobConfig.create(body);
    jobConfigCache = null; // Invalidate cache on update
    res.json({ success: true });
  } catch (err) {
    console.error('Job config save error:', err);
    res.status(500).json({ error: 'Could not save job config' });
  }
});

// ── Send Email to Applicant ─────────────────────────────────────────────────
app.post('/api/applications/:id/send-email', adminAuth, async (req, res) => {
  const { subject, body } = req.body;
  if (!subject || !body) {
    return res.status(400).json({ error: 'Subject and body are required' });
  }

  try {
    const app = await Application.findOne({ id: req.params.id });
    if (!app) return res.status(404).json({ error: 'Application not found' });

    // Get the applicant's email from formData
    const email = app.formData && app.formData.email;
    if (!email) return res.status(400).json({ error: 'Applicant has no email address in their form' });

    // Validate SMTP credentials
    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

    if (!smtpUser || !smtpPass) {
      return res.status(500).json({ error: 'SMTP Credentials are not configured in .env' });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 2525,
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"LTC HR Department" <${process.env.SENDER_EMAIL || smtpUser}>`,
      to: email,
      subject: subject,
      text: body,
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: #003399; color: white; padding: 20px 24px; border-radius: 8px 8px 0 0;">
          <h2 style="margin:0; font-size: 18px;">LTC HR Department</h2>
        </div>
        <div style="padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; white-space: pre-line;">${body.replace(/\n/g, '<br/>')}</div>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 12px;">ອີເມລນີ້ຖືກສ່ງໂດຍລະບົບ LTC HR — ກະລຸນາຢ່າຕອບກັບໂດຍກົງ</p>
      </div>`,
    });

    console.log(`Email sent to ${email} for application ${req.params.id}`);
    res.json({ success: true, to: email });
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
// Cron Job: Auto-Delete Trash older than 30 days
// ================================================================
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

    // Clean up temporary uploads/temp files older than 2 hours
    const tempDir = path.join(__dirname, 'uploads', 'temp');
    if (fs.existsSync(tempDir)) {
      const tempFiles = fs.readdirSync(tempDir);
      const now = Date.now();
      let cleanCount = 0;
      tempFiles.forEach(f => {
        const fp = path.join(tempDir, f);
        try {
          const stat = fs.statSync(fp);
          if (now - stat.mtimeMs > 2 * 60 * 60 * 1000) { // 2 hours
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
        } catch (e) {
        }
      }, pingInterval);
      console.log(`[KEEP-ALIVE] Self-ping enabled → ${selfUrl} every 5 min`);
    }
  });
}

module.exports = app;
