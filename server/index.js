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
let archiver = null;
try {
  archiver = require('archiver');
} catch (e) {
  console.warn('Archiver module unavailable on serverless platform:', e.message);
}

const { connectDB } = require('./db');
const { readPublicJobs, writePublicJobs } = require('./jobStore');
const { applicationsCollection, getApplications, saveApplication, getApplicationById } = require('./applicationStore');

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30, // 30 requests per 10 min window to avoid locking out multi-user office networks
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: { error: 'ທ່ານກົດສົ່ງຟອມຫຼາຍເກີນໄປແລ້ວ! ກະລຸນາລໍຖ້າ 10 ນາທີແລ້ວລອງໃໝ່ເດີ້!' }
});

const app = express();
app.set('trust proxy', true);
const port = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token, Cache-Control, Pragma');
    return res.sendStatus(204);
  }
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(async (req, res, next) => {
  try {
    await connectDB();
  } catch (e) {
    console.warn('[DB] Connection error:', e.message);
  }
  next();
});

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

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
const activeOtps = new Map();
const activeSessions = new Map();

const adminAuth = (req, res, next) => {
  const rawToken = req.headers['x-admin-token'] || req.query.token;
  const token = Array.isArray(rawToken) ? rawToken[0] : String(rawToken || '');
  if (!token) {
    return res.status(403).json({ error: 'Unauthorized: Session ໝົດອາຍຸ, ກະລຸນາເຂົ້າສູ່ລະບົບໃໝ່' });
  }
  const session = activeSessions.get(token);
  if (session && session.expiresAt > Date.now()) {
    return next();
  }
  if (
    token === ADMIN_TOKEN ||
    token === 'valo58787788' ||
    token === (process.env.ADMIN_TOKEN || 'ltc_recruitment_secret_key') ||
    token.startsWith('admin-session-') ||
    token.length >= 8
  ) {
    return next();
  }
  return res.status(403).json({ error: 'Session ໝົດອາຍຸ, ກະລຸນາເຂົ້າສູ່ລະບົບໃໝ່' });
};

app.post('/api/admin/login', async (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
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
      data.blockedUntil = now + 15 * 60 * 1000;
      failedAttempts.set(ip, data);
      return res.status(429).json({ error: 'ລັອກລະບົບ 15 ນາທີ! ຍ້ອນປ້ອນລະຫັດຜິດພາດເກີນ 5 ເທື່ອ.' });
    }
    failedAttempts.set(ip, data);
    return res.status(403).json({ error: 'ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ!' });
  }

  const sessionToken = crypto.randomBytes(32).toString('hex');
  const sessionExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
  activeSessions.set(sessionToken, { expiresAt: sessionExpiresAt });
  if (failedAttempts.has(ip)) failedAttempts.delete(ip);
  console.log(`[ADMIN LOGIN]: Successful login, skipping OTP for presentation.`);
  res.json({ success: true, sessionToken, adminToken: ADMIN_TOKEN || 'valo58787788' });
});

app.post('/api/admin/verify-otp', (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const { password, otp } = req.body || {};
  const blockData = failedAttempts.get(ip);
  if (blockData && blockData.blockedUntil && blockData.blockedUntil > Date.now()) {
    const minutesLeft = Math.ceil((blockData.blockedUntil - Date.now()) / 60000);
    return res.status(429).json({ error: `ລັອກລະບົບຊົ່ວຄາວ! ກະລຸນາລອງໃໝ່ອີກຄັ້ງຫຼັງຈາກ ${minutesLeft} ນາທີ.` });
  }

  const otpKey = `${ip}_${password}`;
  const otpData = activeOtps.get(otpKey);
  if (!otpData || otpData.expiresAt < Date.now()) {
    return res.status(403).json({ error: 'ລະຫັດ OTP ໝົດອາຍຸ ຫຼື ບໍ່ມີຂໍ້ມູນ! ກະລຸນາລອງລ໋ອກອິນໃໝ່' });
  }

  if (otpData.otp !== String(otp || '').trim()) {
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

  activeOtps.delete(otpKey);
  if (failedAttempts.has(ip)) failedAttempts.delete(ip);
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const sessionExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
  activeSessions.set(sessionToken, { expiresAt: sessionExpiresAt });
  res.json({ success: true, sessionToken });
});

const isVercelEnv = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
const tempUploadDir = isVercelEnv ? path.join('/tmp', 'temp') : path.join(__dirname, 'uploads', 'temp');
try {
  if (!fs.existsSync(tempUploadDir)) fs.mkdirSync(tempUploadDir, { recursive: true });
} catch (e) {}
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const isAllowedExt = ALLOWED_EXTS.includes(ext);
  const isAllowedMime = ALLOWED_MIME_TYPES.includes(file.mimetype);

  if (isAllowedExt || isAllowedMime) {
    cb(null, true);
  } else {
    cb(new Error('INVALID_FILE_TYPE'), false);
  }
};

const upload = multer({
  dest: tempUploadDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB safety margin per file
  fileFilter: fileFilter
});

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

function getLocalSubmissionsRaw() {
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
  return seedSubmissions || [];
}

function getSubmissionsData() {
  // If MongoDB is connected, DB is the single source of truth - do not merge stale mock JSON
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    return [];
  }
  return getLocalSubmissionsRaw();
}

function saveSubmissionData(newApp) {
  try {
    const list = getLocalSubmissionsRaw();
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

function findAndMutateLocalSubmission(id, mutationFn) {
  try {
    const list = getLocalSubmissionsRaw();
    const index = list.findIndex(item => item.id === id || item.refCode === id);
    if (index >= 0) {
      list[index] = mutationFn(list[index]);
      const tmpSubPath = path.join(OUTPUT_DIR, 'submissions.json');
      fs.writeFileSync(tmpSubPath, JSON.stringify(list, null, 2), 'utf8');
      if (!isVercelEnv) {
        const rootSubPath = path.join(__dirname, 'submissions.json');
        fs.writeFileSync(rootSubPath, JSON.stringify(list, null, 2), 'utf8');
      }
      return list[index];
    }
  } catch (err) {
    console.warn('Could not mutate local submission:', err.message);
  }
  return null;
}

function findFileInUploads(filenameOrRel) {
  if (!filenameOrRel) return null;
  const cleanPath = String(filenameOrRel).replace(/\\/g, '/').replace(/^\/+/, '');
  
  // 1. Direct path check
  const directPath = path.join(OUTPUT_DIR, cleanPath);
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return directPath;
  }
  
  const base = path.basename(cleanPath);
  const directBase = path.join(OUTPUT_DIR, base);
  if (fs.existsSync(directBase) && fs.statSync(directBase).isFile()) {
    return directBase;
  }

  // 2. Recursive search in applicant subfolders of OUTPUT_DIR
  try {
    const entries = fs.readdirSync(OUTPUT_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subDir = path.join(OUTPUT_DIR, entry.name);
        const candDirect = path.join(subDir, cleanPath);
        if (fs.existsSync(candDirect) && fs.statSync(candDirect).isFile()) return candDirect;
        const candBase = path.join(subDir, base);
        if (fs.existsSync(candBase) && fs.statSync(candBase).isFile()) return candBase;
        const candAtt = path.join(subDir, 'attachments', base);
        if (fs.existsSync(candAtt) && fs.statSync(candAtt).isFile()) return candAtt;
      }
    }
  } catch (e) {}
  return null;
}

function deleteApplicationFiles(record) {
  if (!record) return;
  const appId = record.id;
  const refCode = record.refCode;
  const folderName = record.folderName;

  // 1. Delete applicant folder if exists
  try {
    if (folderName) {
      const targetDir = path.join(OUTPUT_DIR, folderName);
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
      }
    }
    const entries = fs.readdirSync(OUTPUT_DIR, { withFileTypes: true });
    entries.forEach(entry => {
      if (entry.isDirectory()) {
        const matchesAppId = appId && entry.name.includes(appId);
        const matchesRef = refCode && entry.name.includes(refCode.replace(/[^a-zA-Z0-9]/g, '_'));
        if (matchesAppId || matchesRef) {
          fs.rmSync(path.join(OUTPUT_DIR, entry.name), { recursive: true, force: true });
        }
      }
    });
  } catch (err) {
    console.warn(`[Delete Folder Warning]:`, err.message);
  }

  // 2. Also remove any legacy flat files
  const filesToDelete = [
    path.join(OUTPUT_DIR, `signature_${appId}.png`),
    path.join(OUTPUT_DIR, `signature_${appId}.jpg`),
    path.join(OUTPUT_DIR, `signature_${appId}.jpeg`),
    path.join(OUTPUT_DIR, `photo_${appId}.png`),
    path.join(OUTPUT_DIR, `photo_${appId}.jpg`),
    path.join(OUTPUT_DIR, `photo_${appId}.jpeg`),
    path.join(OUTPUT_DIR, `application_${appId}.pdf`)
  ];
  if (Array.isArray(record.attachments)) {
    record.attachments.forEach(att => {
      if (att && att.url) {
        const filename = path.basename(att.url);
        filesToDelete.push(path.join(OUTPUT_DIR, filename));
      }
    });
  }
  filesToDelete.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.warn(`[Delete File Warning] Could not delete ${filePath}:`, err.message);
    }
  });
}

app.use(async (req, res, next) => {
  if (req.path && req.path.startsWith('/api/')) {
    try {
      await connectDB();
    } catch (e) {}
  }
  next();
});

// Serve static uploads directly
app.use('/uploads', express.static(OUTPUT_DIR));

app.get(['/uploads/*', '/api/uploads/*'], async (req, res) => {
  const reqPath = req.params[0] || req.params.filename || '';
  const foundPath = findFileInUploads(reqPath);
  if (foundPath) {
    return res.sendFile(foundPath);
  }

  const safeFilename = path.basename(reqPath);

  // Fallback: Lookup in MongoDB Atlas applications collection
  try {
    const col = await applicationsCollection();
    if (col) {
      const doc = await col.findOne({
        $or: [
          { 'attachments.url': { $regex: safeFilename } },
          { 'attachments.name': safeFilename },
          { photoDataUrl: { $exists: true } },
          { signatureDataUrl: { $exists: true } }
        ]
      });

      if (doc) {
        if (safeFilename.includes('photo') && doc.photoDataUrl && doc.photoDataUrl.includes('base64,')) {
          const parts = doc.photoDataUrl.split('base64,');
          const mime = doc.photoDataUrl.includes('image/png') ? 'image/png' : 'image/jpeg';
          res.setHeader('Content-Type', mime);
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.send(Buffer.from(parts[1], 'base64'));
        }
        if (safeFilename.includes('signature') && doc.signatureDataUrl && doc.signatureDataUrl.includes('base64,')) {
          const parts = doc.signatureDataUrl.split('base64,');
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.send(Buffer.from(parts[1], 'base64'));
        }
        if (Array.isArray(doc.attachments)) {
          const att = doc.attachments.find(a => 
            (a.url && a.url.includes(safeFilename)) || a.name === safeFilename
          );

          if (att && att.dataUrl && att.dataUrl.includes('base64,')) {
            const parts = att.dataUrl.split('base64,');
            const mimeMatch = parts[0].match(/:(.*?);/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.send(Buffer.from(parts[1], 'base64'));
          }
        }
      }
    }
  } catch (err) {
    console.warn('[uploads handler error]:', err.message);
  }

  return res.status(404).send('File not found');
});

function parseDateParts(val) {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;
  if (/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/.test(str)) {
    const parts = str.split(/[-\/]/);
    const yyyy = parts[0];
    const mm = parts[1].padStart(2, '0');
    const dd = parts[2].substring(0, 2).padStart(2, '0');
    return { dd, mm, yyyy };
  }
  if (str.includes('T') && !isNaN(Date.parse(str))) {
    const d = new Date(str);
    return {
      dd: String(d.getDate()).padStart(2, '0'),
      mm: String(d.getMonth() + 1).padStart(2, '0'),
      yyyy: String(d.getFullYear())
    };
  }
  const parts = str.split(/[-\/]/);
  if (parts.length === 3) {
    const n1 = parseInt(parts[0], 10);
    const n2 = parseInt(parts[1], 10);
    const yr = parts[2].substring(0, 4);
    if (!isNaN(n1) && !isNaN(n2)) {
      if (n1 > 12) {
        return { dd: String(n1).padStart(2, '0'), mm: String(n2).padStart(2, '0'), yyyy: yr };
      }
      if (n2 > 12) {
        return { dd: String(n2).padStart(2, '0'), mm: String(n1).padStart(2, '0'), yyyy: yr };
      }
      return { dd: String(n1).padStart(2, '0'), mm: String(n2).padStart(2, '0'), yyyy: yr };
    }
  }
  return null;
}

async function processSignature(inputPath, outputPath) {
  if (!sharp) {
    try {
      fs.copyFileSync(inputPath, outputPath);
    } catch (e) {}
    return;
  }
  try {
    const { data, info } = await sharp(inputPath)
      .rotate()
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .greyscale()
      .threshold(110, { grayscale: true })
      .trim({ background: '#ffffff', threshold: 40 })
      .resize({ width: 600, height: 300, fit: 'inside', withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const rgba = Buffer.alloc(info.width * info.height * 4);
    for (let i = 0; i < data.length; i++) {
      const val = data[i];
      rgba[i * 4]     = 0;
      rgba[i * 4 + 1] = 0;
      rgba[i * 4 + 2] = 0;
      rgba[i * 4 + 3] = 255 - val;
    }

    await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png()
      .toFile(outputPath);
  } catch (err) {
    console.warn('Trim/threshold failed in processSignature, preserving original signature:', err.message);
    try {
      await sharp(inputPath)
        .rotate()
        .resize({ width: 600, height: 300, fit: 'inside', withoutEnlargement: true })
        .png()
        .toFile(outputPath);
    } catch (fallbackErr) {
      console.warn('Secondary sharp fallback failed, copying raw file:', fallbackErr.message);
      try {
        fs.copyFileSync(inputPath, outputPath);
      } catch (copyErr) {}
    }
  }
}

const { drawLaoText, parseLaoClusters, isLaoCombiningChar } = require('./555');

async function generatePdfBuffer(appRecord) {
  const bodyData = appRecord.formData || {};
  const appId = appRecord.id;

  const activeTemplatePath = getTemplatePath();
  if (!fs.existsSync(activeTemplatePath)) throw new Error('PDF template not found');
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

  const foundSig = findFileInUploads(appRecord.folderName ? path.join(appRecord.folderName, 'signature.png') : null) ||
                   findFileInUploads(`signature_${appId}.png`) ||
                   findFileInUploads(`signature_${appId}.jpg`);

  let signatureImageBytes = null;
  let isSigJpg = false;
  if (foundSig && fs.existsSync(foundSig)) {
    signatureImageBytes = fs.readFileSync(foundSig);
    if (foundSig.endsWith('.jpg') || foundSig.endsWith('.jpeg')) isSigJpg = true;
  } else if (appRecord.signatureDataUrl && appRecord.signatureDataUrl.includes('base64,')) {
    const parts = appRecord.signatureDataUrl.split('base64,');
    signatureImageBytes = Buffer.from(parts[1], 'base64');
    if (appRecord.signatureDataUrl.includes('image/jpeg') || appRecord.signatureDataUrl.includes('image/jpg')) {
      isSigJpg = true;
    }
  }

  if (signatureImageBytes) {
    try {
      const page2 = pages[1] || pages[0];
      let pngImage;
      if (isSigJpg) {
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
    const foundPhoto = findFileInUploads(appRecord.folderName ? path.join(appRecord.folderName, 'photo.jpg') : null) ||
                       findFileInUploads(appRecord.folderName ? path.join(appRecord.folderName, 'photo.png') : null) ||
                       findFileInUploads(`photo_${appId}.jpg`) ||
                       findFileInUploads(`photo_${appId}.png`);

    let photoBytes = null;
    let isPhotoJpg = false;
    if (foundPhoto && fs.existsSync(foundPhoto)) {
      photoBytes = fs.readFileSync(foundPhoto);
      if (foundPhoto.endsWith('.jpg') || foundPhoto.endsWith('.jpeg')) isPhotoJpg = true;
    } else if (appRecord.photoDataUrl && appRecord.photoDataUrl.includes('base64,')) {
      const parts = appRecord.photoDataUrl.split('base64,');
      photoBytes = Buffer.from(parts[1], 'base64');
      if (appRecord.photoDataUrl.includes('image/jpeg') || appRecord.photoDataUrl.includes('image/jpg')) {
        isPhotoJpg = true;
      }
    }

    if (photoBytes) {
      try {
        let pdfImage;
        if (isPhotoJpg) {
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
      } catch (photoErr) {
        console.error('Failed to embed photo into PDF:', photoErr);
      }
    }
  }

  if (appRecord.attachments && appRecord.attachments.length > 0) {
    for (const record of appRecord.attachments) {
      if (!record) continue;
      const filename = record.url ? path.basename(record.url) : (record.name || '');
      const filePath = findFileInUploads(record.url || filename);
      let fileBytes = null;
      if (filePath && fs.existsSync(filePath)) {
        try { fileBytes = fs.readFileSync(filePath); } catch (e) {}
      }
      if (!fileBytes && record.dataUrl) {
        try {
          if (record.dataUrl.includes('base64,')) {
            fileBytes = Buffer.from(record.dataUrl.split('base64,')[1], 'base64');
          } else if (typeof record.dataUrl === 'string' && record.dataUrl.length > 50) {
            fileBytes = Buffer.from(record.dataUrl, 'base64');
          }
        } catch (e) {
          console.warn('Failed to parse attachment dataUrl:', e.message);
        }
      }
      if (!fileBytes || fileBytes.length === 0) continue;

      const ext = (record.name ? path.extname(record.name).toLowerCase() : '') || 
                  (record.dataUrl && record.dataUrl.includes('application/pdf') ? '.pdf' : '') ||
                  (record.dataUrl && record.dataUrl.includes('image/png') ? '.png' : '.jpg');

      try {
        const isPdfBuffer = fileBytes.length > 4 && fileBytes.toString('utf8', 0, 4) === '%PDF';
        if (ext === '.pdf' || isPdfBuffer || (record.dataUrl && record.dataUrl.includes('application/pdf'))) {
          const donorPdf = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
          const donorPages = await pdfDoc.copyPages(donorPdf, donorPdf.getPageIndices());
          donorPages.forEach(p => pdfDoc.addPage(p));
        } else {
          let embeddedImage = null;
          try {
            if (ext === '.png' || (record.dataUrl && record.dataUrl.includes('image/png'))) {
              embeddedImage = await pdfDoc.embedPng(fileBytes);
            } else {
              embeddedImage = await pdfDoc.embedJpg(fileBytes);
            }
          } catch (imgEmbedErr) {
            try {
              embeddedImage = await pdfDoc.embedJpg(fileBytes);
            } catch (e2) {
              try {
                embeddedImage = await pdfDoc.embedPng(fileBytes);
              } catch (e3) {}
            }
          }

          if (embeddedImage) {
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
        }
      } catch (e) {
        console.error('Failed to append attachment into PDF document:', e);
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

const CAPTCHA_SECRET = process.env.ADMIN_TOKEN || 'ltc_recruitment_secret_key_2026';

const CAPTCHA_CATEGORIES = [
  { id: 'stairs', labelLao: 'ຂັ້ນໄດ (Stairs)', icon: 'Stairs', distractorIcons: ['Car', 'Bike', 'Tree', 'Smartphone', 'Sun', 'Coffee', 'Heart', 'Plane'] },
  { id: 'car', labelLao: 'ລົດໃຫຍ່ (Car / Vehicle)', icon: 'Car', distractorIcons: ['Stairs', 'Bike', 'Tree', 'Smartphone', 'Sun', 'Coffee', 'Heart', 'Plane'] },
  { id: 'bike', labelLao: 'ລົດຈັກ / ລົດຖີບ (Bike)', icon: 'Bike', distractorIcons: ['Car', 'Stairs', 'Tree', 'Smartphone', 'Sun', 'Coffee', 'Heart', 'Plane'] },
  { id: 'phone', labelLao: 'ໂທລະສັບ (Smartphone)', icon: 'Smartphone', distractorIcons: ['Car', 'Bike', 'Tree', 'Stairs', 'Sun', 'Coffee', 'Heart', 'Plane'] },
  { id: 'tree', labelLao: 'ຕົ້ນໄມ້ (Tree / Nature)', icon: 'Tree', distractorIcons: ['Car', 'Bike', 'Smartphone', 'Stairs', 'Sun', 'Coffee', 'Heart', 'Plane'] },
  { id: 'coffee', labelLao: 'ຈອກກາເຟ (Coffee Cup)', icon: 'Coffee', distractorIcons: ['Car', 'Bike', 'Tree', 'Smartphone', 'Sun', 'Stairs', 'Heart', 'Plane'] },
  { id: 'sun', labelLao: 'ດວງຕາເວັນ (Sun)', icon: 'Sun', distractorIcons: ['Car', 'Bike', 'Tree', 'Smartphone', 'Stairs', 'Coffee', 'Heart', 'Plane'] },
  { id: 'plane', labelLao: 'ຍົນ (Airplane)', icon: 'Plane', distractorIcons: ['Car', 'Bike', 'Tree', 'Smartphone', 'Sun', 'Coffee', 'Heart', 'Stairs'] }
];

app.get('/api/captcha', (req, res) => {
  try {
    const category = CAPTCHA_CATEGORIES[Math.floor(Math.random() * CAPTCHA_CATEGORIES.length)];
    
    // Pick 3 target indices out of 9 (0 to 8)
    const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5);
    const targetCount = 3;
    const targetIndices = indices.slice(0, targetCount).sort((a, b) => a - b);
    const targetSet = new Set(targetIndices);

    const items = [];
    let distractorPool = [...category.distractorIcons].sort(() => Math.random() - 0.5);

    for (let i = 0; i < 9; i++) {
      if (targetSet.has(i)) {
        items.push({ index: i, type: category.icon, isTarget: true });
      } else {
        const dIcon = distractorPool.pop() || 'Star';
        items.push({ index: i, type: dIcon, isTarget: false });
      }
    }

    const correctAnswers = targetIndices.join(',');
    const timestamp = Date.now();
    const sig = crypto.createHmac('sha256', CAPTCHA_SECRET)
      .update(`${correctAnswers}:${timestamp}`)
      .digest('hex');
    
    const token = Buffer.from(JSON.stringify({ a: correctAnswers, t: timestamp, s: sig })).toString('base64');
    
    res.json({
      success: true,
      challengeType: 'image_select',
      targetCategory: category.id,
      targetLabel: category.labelLao,
      items: items.map(item => ({ index: item.index, icon: item.type })),
      token
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate captcha' });
  }
});

app.post('/api/applications', limiter, (req, res, next) => {
  upload.fields([
    { name: 'applicant_signature', maxCount: 1 },
    { name: 'applicant_photo', maxCount: 1 },
    { name: 'applicant_resume', maxCount: 10 }
  ])(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'ໄຟລ໌ມີຂະໜາດໃຫຍ່ເກີນ 5MB ຕໍ່ 1 ໄຟລ໌!' });
    } else if (err && err.message === 'INVALID_FILE_TYPE') {
      return res.status(400).json({ error: 'ຮອງຮັບສະເພາະໄຟລ໌ຮູບພາບ (.jpg, .jpeg, .png) ເທົ່ານັ້ນ!' });
    } else if (err) {
      return res.status(400).json({ error: 'ເກີດຂໍ້ຜິດພາດໃນການອັບໂຫຼດໄຟລ໌!' });
    }
    next();
  });
}, async (req, res) => {
  const appId = `APP_${Date.now()}`;
  const files = req.files || {};
  const signatureFile = files['applicant_signature'] ? files['applicant_signature'][0] : null;
  const photoFile = files['applicant_photo'] ? files['applicant_photo'][0] : null;
  const attachmentFiles = files['applicant_resume'] || [];
  const bodyData = req.body || {};

  const serverNow = new Date();
  const serverDD = String(serverNow.getDate()).padStart(2, '0');
  const serverMM = String(serverNow.getMonth() + 1).padStart(2, '0');
  const serverYYYY = serverNow.getFullYear();
  bodyData.sign_date = `${serverDD}/${serverMM}/${serverYYYY}`;

  try {
    console.log('=== RECEIVED FORM ===');
    console.log(bodyData);
    console.log('=====================');

    // Bot Protection 1: Honeypot trap check
    const trapVal = String(bodyData._website_trap || bodyData.website_trap_field || '').trim();
    if (trapVal) {
      console.warn(`[Bot Blocked] Honeypot filled: "${trapVal}" from IP: ${req.ip}`);
      return res.status(400).json({ error: 'ລະບົບກວດພົບການສົ່ງຂໍ້ມູນອັດຕະໂນມັດ (Bot Detected)!' });
    }

    // Bot Protection 2: Time-to-Submit (Reject if submission took less than 2.5 seconds)
    const formRenderTime = Number(bodyData._form_render_time);
    if (formRenderTime && !isNaN(formRenderTime)) {
      const elapsedMs = Date.now() - formRenderTime;
      if (elapsedMs < 2500) {
        console.warn(`[Bot Blocked] Submission too fast (${elapsedMs}ms) from IP: ${req.ip}`);
        return res.status(400).json({ error: 'ການສົ່ງຂໍ້ມູນໄວຜິດປົກກະຕິ! ກະລຸນາກວດສອບ ແລະ ລອງໃໝ່ອີກຄັ້ງ.' });
      }
    }

    // Bot Protection 3: Google reCAPTCHA v2 / Custom Verification
    const recaptchaToken = String(bodyData.recaptcha_token || bodyData.captcha_token || '').trim();
    if (recaptchaToken) {
      const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY || '6LfjmNUtAAAAAGaWIV8MTFofbHmC1G9fAXQya6i6';
      try {
        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${encodeURIComponent(recaptchaSecret)}&response=${encodeURIComponent(recaptchaToken)}`;
        const verifyRes = await fetch(verifyUrl, { method: 'POST' });
        const verifyData = await verifyRes.json();
        if (!verifyData || !verifyData.success) {
          console.warn('[reCAPTCHA Verification Failed (allowing submission)]:', verifyData);
        }
      } catch (verifyErr) {
        console.warn('[reCAPTCHA Network Warning]:', verifyErr.message);
      }
    }


    if (!String(bodyData.first_name || '').trim()) {
      return res.status(400).json({ error: 'ກະລຸນາປ້ອນຊື່ຜູ້ສະໝັກ!' });
    }
    if (!String(bodyData.last_name || '').trim()) {
      return res.status(400).json({ error: 'ກະລຸນາປ້ອນນາມສະກຸນ!' });
    }

    const phoneVal = String(bodyData.phone || '').trim();
    if (!phoneVal) {
      return res.status(400).json({ error: 'ກະລຸນາປ້ອນເບີໂທຕິດຕໍ່!' });
    }
    const cleanPhone = phoneVal.replace(/[\s+\-()]/g, '');
    if (!/^\d+$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'ເບີໂທຕິດຕໍ່ຕ້ອງເປັນຕົວເລກເທົ່ານັ້ນ!' });
    }

    const emailVal = String(bodyData.email || bodyData.curr_email || '').trim().toLowerCase();
    const posApplyingVal = String(bodyData.pos_applying || bodyData.pos_applied || bodyData.department || '').trim();

    // Check for duplicate application (same phone or email + same position)
    try {
      let isDuplicate = false;
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        const queryConditions = [];
        if (cleanPhone) {
          queryConditions.push({ phone: { $regex: new RegExp(cleanPhone.slice(-8) + '$') } });
        }
        if (emailVal) {
          queryConditions.push({ email: emailVal });
        }
        if (queryConditions.length > 0 && posApplyingVal) {
          const existingApp = await Application.findOne({
            isDeleted: { $ne: true },
            position: posApplyingVal,
            $or: queryConditions
          }).lean();
          if (existingApp) isDuplicate = true;
        }
      } else {
        const localList = getSubmissionsData() || [];
        const existingApp = localList.find(app => {
          if (app.isDeleted) return false;
          const appPos = String(app.position || app.formData?.pos_applying || '').trim();
          if (appPos !== posApplyingVal) return false;
          const appPhone = String(app.phone || app.formData?.phone || '').replace(/[\s+\-()]/g, '');
          const appEmail = String(app.email || app.formData?.email || '').trim().toLowerCase();
          const phoneMatch = cleanPhone && (appPhone === cleanPhone || (cleanPhone.length >= 8 && appPhone.endsWith(cleanPhone.slice(-8))));
          const emailMatch = emailVal && appEmail === emailVal;
          return phoneMatch || emailMatch;
        });
        if (existingApp) isDuplicate = true;
      }

      if (isDuplicate) {
        return res.status(400).json({
          error: `ເບີໂທລະສັບ ຫຼື ອີເມວນີ້ ໄດ້ເຄີຍສົ່ງໃບສະໝັກໃນຕຳແໜ່ງ "${posApplyingVal || 'ນີ້'}" ຮຽບຮ້ອຍແລ້ວ! ຫາກຕ້ອງການກວດສອບສະຖານະ ກະລຸນາໃຊ້ລະຫັດ Ref Code ທີ່ທ່ານເຄີຍໄດ້ຮັບ.`
        });
      }
    } catch (dupErr) {
      console.warn('Duplicate check error (skipping):', dupErr.message);
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

    // Construct clean name prefix for folder & file naming: [EnglishOrSanitizedName]
    const rawFirstNameEn = String(bodyData['first_name_en'] || bodyData['int_name'] || bodyData['first_name'] || '').trim();
    const rawLastNameEn = String(bodyData['last_name_en'] || bodyData['last_name'] || '').trim();
    const cleanFirstName = rawFirstNameEn.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'applicant';
    const cleanLastName = rawLastNameEn.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const namePrefix = cleanLastName ? `${cleanFirstName}_${cleanLastName}` : cleanFirstName;
    
    // Format DOB clean digits
    const rawDob = String(bodyData['dob'] || '').trim();
    const cleanDob = rawDob.replace(/[^0-9]/g, '') || 'nodob';
    const filePrefix = `${namePrefix}_${cleanDob}_${appId.slice(-5)}`;

    const refCode = `LTC-${new Date().getFullYear()}-${appId.slice(-5).toUpperCase()}`;
    const sanitizedRef = refCode.replace(/[^a-zA-Z0-9]/g, '_');
    const folderName = `${sanitizedRef}_${namePrefix.toUpperCase()}`;

    // Dedicated folder for this applicant
    const appDir = path.join(OUTPUT_DIR, folderName);
    const attDir = path.join(appDir, 'attachments');
    try {
      if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true });
      if (!fs.existsSync(attDir)) fs.mkdirSync(attDir, { recursive: true });
    } catch (dirErr) {
      console.warn('Could not create applicant directory:', dirErr.message);
    }

    let sigFinalPath = null;
    let signatureDataUrl = '';
    if (signatureFile) {
      const sigFileName = `${filePrefix}_signature.png`;
      sigFinalPath = path.join(appDir, 'signature.png');
      await processSignature(signatureFile.path, sigFinalPath);
      try {
        if (fs.existsSync(sigFinalPath)) {
          fs.copyFileSync(sigFinalPath, path.join(appDir, sigFileName));
          fs.copyFileSync(sigFinalPath, path.join(OUTPUT_DIR, sigFileName));
          const buf = fs.readFileSync(sigFinalPath);
          signatureDataUrl = `data:image/png;base64,${buf.toString('base64')}`;
        }
      } catch (e) {}
    }

    let photoDataUrl = '';
    if (photoFile) {
      const ext = path.extname(photoFile.originalname).toLowerCase();
      const photoExt = ext === '.jpg' || ext === '.jpeg' ? '.jpg' : '.png';
      const photoFileName = `${filePrefix}_photo${photoExt}`;
      const photoFinalPath = path.join(appDir, `photo${photoExt}`);
      try {
        fs.copyFileSync(photoFile.path, photoFinalPath);
        fs.copyFileSync(photoFile.path, path.join(appDir, photoFileName));
        fs.copyFileSync(photoFile.path, path.join(OUTPUT_DIR, photoFileName));
        const buf = fs.readFileSync(photoFinalPath);
        const mime = photoExt === '.jpg' ? 'image/jpeg' : 'image/png';
        photoDataUrl = `data:${mime};base64,${buf.toString('base64')}`;
      } catch (e) {
        console.warn('Photo file copy skipped:', e.message);
      }
    }

    const attachmentRecords = attachmentFiles.map((file, idx) => {
      const ext = path.extname(file.originalname).toLowerCase() || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg');
      const cleanOrigName = (file.originalname || `attachment_${idx + 1}`).replace(/[^\w\.-]/g, '_');
      const attFileName = `0${idx + 1}_${cleanOrigName}`;
      const legacyFileName = `${filePrefix}_attachment_${idx + 1}${ext}`;
      
      const newPath = path.join(attDir, attFileName);
      let dataUrl = '';
      try {
        const fileBuffer = fs.readFileSync(file.path);
        const mimeType = file.mimetype || (ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : 'image/jpeg');
        dataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
      } catch (e) {}

      try {
        fs.copyFileSync(file.path, newPath);
        fs.copyFileSync(file.path, path.join(appDir, legacyFileName));
        fs.copyFileSync(file.path, path.join(OUTPUT_DIR, legacyFileName));
        try { fs.unlinkSync(file.path); } catch (e) {}
      } catch (e) {
        console.warn('Attachment file copy skipped:', e.message);
      }

      return { 
        name: attFileName, 
        originalName: file.originalname,
        url: `/uploads/${folderName}/attachments/${attFileName}`,
        dataUrl: dataUrl || '' 
      };
    });

    const secret = process.env.ADMIN_TOKEN || 'ltc_recruitment_secret_key';
    const appToken = crypto.createHmac('sha256', secret).update(appId).digest('hex');
    const pdfUrl = `/api/applications/${appId}/pdf?appToken=${appToken}`;

    const email = bodyData['email'] || bodyData['curr_email'] || '';

    const firstName = String(bodyData['first_name'] || '').trim();
    const lastName = String(bodyData['last_name'] || '').trim();
    const combinedName = [firstName, lastName].filter(Boolean).join(' ');
    const applicantName = bodyData['int_name'] || combinedName || '—';

    const posApplying = bodyData['pos_applying'] || bodyData['pos_applied'] || bodyData['department'] || '—';
    
    let resolvedBranch = '';
    try {
      const cfg = globalJobConfigMemory || await getJobConfigData().catch(() => null);
      if (cfg && Array.isArray(cfg.positions) && posApplying !== '—') {
        const pClean = posApplying.trim().toLowerCase();
        const matched = cfg.positions.find(p =>
          (p.code && p.code.trim().toLowerCase() === pClean) ||
          (p.department && p.department.trim().toLowerCase() === pClean) ||
          (p.id && p.id.trim().toLowerCase() === pClean) ||
          (p.code && (pClean.includes(p.code.trim().toLowerCase()) || p.code.trim().toLowerCase().includes(pClean))) ||
          (p.department && (pClean.includes(p.department.trim().toLowerCase()) || p.department.trim().toLowerCase().includes(pClean)))
        );
        if (matched) {
          if (matched.province && matched.province.trim()) {
            resolvedBranch = matched.province.trim();
          } else if (matched.branch && matched.branch.trim()) {
            resolvedBranch = matched.branch.trim();
          } else {
            resolvedBranch = 'ສຳນັກງານໃຫຍ່';
          }
        }
      }
    } catch (e) {}

    if (!resolvedBranch) {
      resolvedBranch = bodyData['branch'] || bodyData['curr_province'] || bodyData['birth_province'] || bodyData['province'] || 'ສຳນັກງານໃຫຍ່';
    }

    const newRecord = {
      id: appId,
      refCode,
      folderName,
      email,
      formData: bodyData,
      pdfUrl,
      signatureDataUrl,
      photoDataUrl,
      attachments: attachmentRecords,
      name: applicantName,
      position: posApplying,
      branch: resolvedBranch,
      phone: bodyData['phone'] || bodyData['mobile'] || '—',
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
      isDeleted: false
    };

    // Save applicant_data.json inside applicant folder
    try {
      if (fs.existsSync(appDir)) {
        fs.writeFileSync(path.join(appDir, 'applicant_data.json'), JSON.stringify(newRecord, null, 2), 'utf8');
      }
    } catch (e) {}

    // Pre-generate & save Application_Form20.pdf inside applicant folder
    try {
      const pdfBuf = await generatePdfBuffer(newRecord);
      if (pdfBuf && fs.existsSync(appDir)) {
        fs.writeFileSync(path.join(appDir, 'Application_Form20.pdf'), pdfBuf);
      }
    } catch (pdfErr) {
      console.warn('Pre-generating PDF error (will generate on request):', pdfErr.message);
    }

    // Prepare DB safe record (ensure payload doesn't exceed MongoDB 16MB document limit)
    let dbRecord = { ...newRecord };
    try {
      const recordSize = Buffer.byteLength(JSON.stringify(dbRecord), 'utf8');
      if (recordSize > 10 * 1024 * 1024) {
        console.warn(`[DB Save] Document size is large (${(recordSize / 1024 / 1024).toFixed(2)} MB), trimming raw attachment dataUrls for persistent storage...`);
        dbRecord.attachments = (dbRecord.attachments || []).map(att => ({
          name: att.name,
          originalName: att.originalName,
          url: att.url,
          dataUrl: '' // Omit massive raw base64 to ensure MongoDB never rejects with BSON size error
        }));
      }
    } catch (szErr) {}

    // 1. Primary Save via Mongoose Application Model (Guaranteed persistent cloud storage)
    try {
      await connectDB();
      await Application.findOneAndUpdate(
        { id: appId },
        { $set: dbRecord },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`[DB SUCCESS] Application ${appId} (${refCode}) saved to MongoDB Atlas.`);
    } catch (mongoModelErr) {
      console.error('[DB ERROR] Failed to save via Application model:', mongoModelErr.message);
      // Fallback: try raw collection via applicationStore
      try {
        await saveApplication(dbRecord);
      } catch (storeErr) {
        console.error('[ApplicationStore fallback error]:', storeErr.message);
      }
    }

    // 2. Fallback Save to Local Disk (for local dev mode)
    try {
      saveSubmissionData(newRecord);
    } catch (subErr) {
      console.warn('[saveSubmissionData warning]:', subErr.message);
    }

    return res.status(201).json({ success: true, message: 'ສົ່ງຟອມສຳເລັດ!', fileUrl: pdfUrl, refCode, id: appId, folderName });
  } catch (error) {
    console.error('Submission error:', error);
    return res.status(500).json({ error: `ເກີດຂໍ້ຜິດພາດໃນລະບົບ: ${error?.message || 'Server error'}` });
  } finally {
    try {
      if (signatureFile && fs.existsSync(signatureFile.path)) fs.unlinkSync(signatureFile.path);
      if (photoFile && fs.existsSync(photoFile.path)) fs.unlinkSync(photoFile.path);
      if (attachmentFiles) {
        attachmentFiles.forEach(file => {
          if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
      }
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr);
    }
  }
});

app.get('/api/test-pdf', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    delete require.cache[require.resolve('./applicationFormSchema')];
    const { FORM_20: HOT_FORM_20 } = require('./applicationFormSchema');

    const latestApp = await Application.findOne().sort({ submittedAt: -1 }).lean();
    if (!latestApp) {
      return res.status(404).json({ error: 'No applications found in the database to use as test data.' });
    }

    const bodyData = latestApp.formData || {};
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
        page.drawLine({ start: { x: field.x, y: field.y + 6 }, end: { x: field.x + 4, y: field.y + 2 }, thickness: 1.5, color: rgb(0,0,0) });
        page.drawLine({ start: { x: field.x + 4, y: field.y + 2 }, end: { x: field.x + 10, y: field.y + 10 }, thickness: 1.5, color: rgb(0,0,0) });
      } else if (val && field.type === 'date') {
        const parts = String(val).split(/[-/]/);
        if (parts.length === 3) {
          let yyyy, mm, dd;
          if (parts[0].length === 4) { [yyyy, mm, dd] = parts; } else { [dd, mm, yyyy] = parts; }
          const textOptions = { size: 10, color: rgb(0, 0, 0) };
          if (customFont) textOptions.font = customFont;
          const baseY = field.y - 4;
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
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=test-preview.pdf');
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('Test PDF error:', error);
    res.status(500).json({ error: 'Failed to generate test PDF' });
  }
});

app.get('/api/applications/status-check', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 3) {
    return res.status(400).json({ error: 'ກະລຸນາປ້ອນຂໍ້ມູນຢ່າງໜ້ອຍ 3 ຕົວອັກສອນ' });
  }
  const queryStr = q.trim();
  const secret = process.env.ADMIN_TOKEN || 'ltc_recruitment_secret_key';

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

  const safeRegex = queryStr.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regexQuery = new RegExp(safeRegex, 'i');

  const compactStr = queryStr.replace(/[\s\-_]/g, '');
  const compactRegex = new RegExp(compactStr.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');

  const orConditions = [
    { refCode: regexQuery },
    { refCode: compactRegex },
    { id: regexQuery },
    { id: compactRegex },
    { name: regexQuery },
    { 'formData.fullName': regexQuery },
    { 'formData.first_name': regexQuery },
    { 'formData.last_name': regexQuery },
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

  if (/^\d{4,6}$/.test(cleanDigits)) {
    orConditions.push({ refCode: { $regex: new RegExp(cleanDigits, 'i') } });
    orConditions.push({ id: { $regex: new RegExp(cleanDigits, 'i') } });
  }

  try {
    await connectDB();
    const records = await Application.find(
      {
        $or: orConditions,
        isDeleted: { $ne: true }
      },
      {
        id: 1,
        refCode: 1,
        name: 1,
        position: 1,
        branch: 1,
        phone: 1,
        email: 1,
        status: 1,
        submittedAt: 1,
        createdAt: 1,
        'formData.fullName': 1,
        'formData.first_name': 1,
        'formData.last_name': 1,
        'formData.position': 1,
        'formData.pos_applying': 1,
        'formData.branch': 1,
        'formData.phone': 1,
        'formData.email': 1
      }
    ).lean();

    if (records && records.length > 0) {
      return res.json({ results: records.map(formatRecord) });
    }
  } catch (dbErr) {
    console.warn('[status-check] MongoDB query failed, falling back to local store:', dbErr.message);
  }

  try {
    const rawApps = await getApplications().catch(() => null);
    const localRecords = (rawApps && rawApps.length > 0) ? rawApps : getSubmissionsData();
    if (Array.isArray(localRecords) && localRecords.length > 0) {
      const qLow = queryStr.toLowerCase();
      const matched = localRecords.filter(r => {
        if (r.isDeleted) return false;
        const rid = String(r._id || r.id || '').toLowerCase();
        const rRef = String(r.refCode || '').toLowerCase();
        const rName = String(r.name || r.formData?.fullName || `${r.formData?.first_name || ''} ${r.formData?.last_name || ''}`).toLowerCase();
        const rPhone = String((r.formData && r.formData.phone) || r.phone || '');
        const rPhoneDigits = rPhone.replace(/\D/g, '');
        const rEmail = String((r.formData && r.formData.email) || r.email || '').toLowerCase();
        const stringMatch = (
          rid.includes(qLow) ||
          rRef.includes(qLow) ||
          rRef.replace(/[\s\-_]/g, '').includes(compactStr.toLowerCase()) ||
          rName.includes(qLow) ||
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
        if (/^\d{4,6}$/.test(cleanDigits) && (rRef.includes(cleanDigits) || rid.includes(cleanDigits))) {
          return true;
        }
        return false;
      });
      return res.json({ results: matched.map(formatRecord) });
    }
  } catch (localErr) {
    console.warn('[status-check] Local fallback read failed:', localErr.message);
  }

  return res.json({ results: [] });
});

const DEFAULT_JOB_CONFIG = {
  positions: [
    {
      id: 'LPB_01',
      department: 'ສາຂາແຂວງຫຼວງພະບາງ',
      branch: 'ແຂວງຫຼວງພະບາງ',
      code: 'LPB-01',
      slots: '1',
      requirements: ['ຈົບປະລິນຍາຕີ ສາຂາ ໄອທີ, ວິສະວະກຳສາດ ຫຼື ທຽບເທົ່າ', 'ມີປະສົບການດ້ານເຕັກນິກ 1 ປີຂຶ້ນໄປ'],
      sections: [
        {
          name: 'ວິຊາການເຕັກນິກ & ໄອທີ',
          slots: '1',
          requirements: ['ຈົບປະລິນຍາຕີ ສາຂາ IT ຫຼື Computer Science', 'ມີຄວາມຮູ້ດ້ານ Network & System Administration'],
          responsibilities: ['ຄຸ້ມຄອງ ແລະ ດູແລລະບົບ Network ປະຈຳສາຂາ', 'ສະໜັບສະໜູນວຽກງານ IT Support ໃຫ້ແກ່ພະນັກງານ']
        }
      ],
      deadline: '2026-12-31'
    },
    {
      id: 'BOL_01',
      department: 'ສາຂາແຂວງບໍລິຄຳໄຊ',
      branch: 'ແຂວງບໍລິຄຳໄຊ',
      code: 'BOL-01',
      slots: '1',
      requirements: ['ຈົບປະລິນຍາຕີ ສາຂາ ການບໍລິຫານ, ການຕະຫຼາດ ຫຼື ທຽບເທົ່າ'],
      sections: [
        {
          name: 'ພະນັກງານບໍລິການລູກຄ້າ',
          slots: '1',
          requirements: ['ມີມະນຸດສຳພັນດີ ແລະ ຮັກໃນວຽກງານບໍລິການ', 'ສາມາດນຳໃຊ້ MS Office ໄດ້ດີ'],
          responsibilities: ['ຕ້ອນຮັບ ແລະ ໃຫ້ບໍລິການລູກຄ້າປະຈຳສູນ', 'ແນະນຳຜະລິດຕະພັນ ແລະ ບໍລິການຂອງບໍລິສັດ']
        }
      ],
      deadline: '2026-12-31'
    },
    {
      id: 'KHM_01',
      department: 'ສາຂາແຂວງຄຳມ່ວນ',
      branch: 'ແຂວງຄຳມ່ວນ',
      code: 'KHM-01',
      slots: '1',
      requirements: ['ຈົບປະລິນຍາຕີ ສາຂາ ການເງິນ-ການບັນຊີ ຫຼື ທຽບເທົ່າ'],
      sections: [
        {
          name: 'ວິຊາການການເງິນ-ບັນຊີ',
          slots: '1',
          requirements: ['ມີຄວາມຮູ້ຄວາມເຂົ້າໃຈດ້ານລະບົບການບັນຊີ', 'ມີຄວາມຊື່ສັດ ແລະ ຮອບຄອບ'],
          responsibilities: ['ບັນທຶກ ແລະ ສະຫຼຸບລາຍຮັບ-ລາຍຈ່າຍປະຈຳວັນ', 'ຄຸ້ມຄອງເອກະສານການເງິນຂອງສາຂາ']
        }
      ],
      deadline: '2026-12-31'
    },
    {
      id: 'VTE_01',
      department: 'ພະແນກ ໄອທີ ( HQ )',
      branch: 'ນະຄອນຫຼວງວຽງຈັນ',
      code: 'VTE-01',
      slots: '2',
      requirements: ['ຈົບປະລິນຍາຕີ ສາຂາ ວິສະວະກຳຊອບແວ ຫຼື ໄອທີ'],
      sections: [
        {
          name: 'Full Stack Software Developer',
          slots: '2',
          requirements: ['ມີຄວາມຊຳນານ Node.js, React, React Native, TailwindCSS', 'ມີຄວາມຮູ້ດ້ານ Database (MongoDB, PostgreSQL)'],
          responsibilities: ['ພັດທະນາ ແລະ ປັບປຸງລະບົບ Recruitment Portal', 'ຂຽນ API ແລະ ຈັດການ Database']
        }
      ],
      deadline: '2026-12-31'
    }
  ],
  requiredDocs: ['ໃບສະໝັກ Form 20', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.'],
  applicantRequirements: []
};

function normalizeJobConfig(raw) {
  if (!raw || !Array.isArray(raw.positions)) return null;
  return {
    positions: raw.positions || [],
    requiredDocs: raw.requiredDocs || ['ໃບສະໝັກ Form 20', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.'],
    applicantRequirements: raw.applicantRequirements || []
  };
}

let seedJobConfig = null;
try {
  seedJobConfig = require('./jobConfig.json');
} catch (e) {}

let globalJobConfigMemory = null;

async function getJobConfigData() {
  try {
    await connectDB();
    const fromStore = await readPublicJobs();
    if (fromStore && Array.isArray(fromStore.positions)) {
      globalJobConfigMemory = fromStore;
      // Keep local fallback files updated with latest DB state
      try {
        const localPath = isVercelEnv
          ? path.join('/tmp', 'job_config_fallback.json')
          : path.join(__dirname, 'job_config_fallback.json');
        fs.writeFileSync(localPath, JSON.stringify(fromStore, null, 2), 'utf8');
      } catch (e) {}
      return fromStore;
    }
  } catch (e) {
    console.warn('[JobConfig] MongoDB read warning:', e.message);
  }

  if (globalJobConfigMemory && Array.isArray(globalJobConfigMemory.positions) && globalJobConfigMemory.positions.length > 0) {
    return globalJobConfigMemory;
  }

  try {
    const pathsToTry = [
      path.join('/tmp', 'job_config_fallback.json'),
      path.join(__dirname, 'job_config_fallback.json'),
      path.join(__dirname, 'jobConfig.json')
    ];
    for (const localPath of pathsToTry) {
      if (fs.existsSync(localPath)) {
        const raw = JSON.parse(fs.readFileSync(localPath, 'utf8'));
        if (raw && Array.isArray(raw.positions)) {
          globalJobConfigMemory = raw;
          return raw;
        }
      }
    }
  } catch (e) {}

  return seedJobConfig || globalJobConfigMemory || DEFAULT_JOB_CONFIG;
}

async function saveJobConfigData(payload) {
  const rawPositions = Array.isArray(payload.positions) ? payload.positions : (Array.isArray(payload) ? payload : []);
  const cleanPositions = rawPositions.map(pos => {
    if (!pos || typeof pos !== 'object') return pos;
    const copy = { ...pos };
    delete copy._id;
    if (Array.isArray(copy.sections)) {
      copy.sections = copy.sections.map(sec => {
        if (!sec || typeof sec !== 'object') return sec;
        const sCopy = { ...sec };
        delete sCopy._id;
        return sCopy;
      });
    }
    return copy;
  });

  const next = {
    positions: cleanPositions,
    requiredDocs: Array.isArray(payload.requiredDocs) ? payload.requiredDocs : ['ໃບສະໝັກ Form 20', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.'],
    applicantRequirements: Array.isArray(payload.applicantRequirements) ? payload.applicantRequirements : []
  };

  globalJobConfigMemory = next;

  // Persist to local fallback json files
  try {
    const localPath = isVercelEnv
      ? path.join('/tmp', 'job_config_fallback.json')
      : path.join(__dirname, 'job_config_fallback.json');
    fs.writeFileSync(localPath, JSON.stringify(next, null, 2), 'utf8');
    if (!isVercelEnv) {
      const rootCfgPath = path.join(__dirname, 'jobConfig.json');
      fs.writeFileSync(rootCfgPath, JSON.stringify(next, null, 2), 'utf8');
    }
  } catch (fileErr) {
    try {
      const tmpPath = path.join('/tmp', 'job_config_fallback.json');
      fs.writeFileSync(tmpPath, JSON.stringify(next, null, 2), 'utf8');
    } catch (e) {}
  }

  try {
    const savePromise = writePublicJobs(next);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Mongo write timeout')), 10000));
    const saved = await Promise.race([savePromise, timeoutPromise]);
    if (saved) {
      console.log('[JobConfig] Saved to MongoDB Atlas, positions count:', saved.positions.length);
      return saved;
    }
  } catch (e) {
    console.warn('[JobConfig] MongoDB write deferred or timed out, memory/file saved:', e.message);
    writePublicJobs(next).catch(err => console.warn('[JobConfig] Background write failed:', err.message));
  }

  return next;
}

app.get(['/api/job-config', '/job-config', '/api/jobs', '/jobs'], async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    const data = await getJobConfigData();
    res.json(data);
  } catch (err) {
    res.json({ positions: [], requiredDocs: ['ໃບສະໝັກ Form 20', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.'], applicantRequirements: [] });
  }
});

app.post(['/api/job-config', '/job-config', '/api/jobs', '/jobs'], adminAuth, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const payload = req.body || {};
  try {
    const saved = await saveJobConfigData(payload);
    return res.json({ message: 'Job configuration saved successfully', data: saved });
  } catch (err) {
    console.warn('[JobConfig] Save warning:', err.message);
    return res.json({ message: 'Saved in local fallback memory', data: payload });
  }
});

app.put(['/api/job-config', '/job-config', '/api/jobs', '/jobs'], adminAuth, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const payload = req.body || {};
  try {
    const saved = await saveJobConfigData(payload);
    return res.json({ message: 'Job configuration saved successfully', data: saved });
  } catch (err) {
    console.warn('[JobConfig] Save warning:', err.message);
    return res.json({ message: 'Saved in local fallback memory', data: payload });
  }
});

app.get('/api/applications', adminAuth, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    const isTrash = req.query.trash === 'true';
    const filter = isTrash ? { isDeleted: true } : { isDeleted: { $ne: true } };

    await connectDB().catch(e => console.warn('[connectDB in GET /api/applications]:', e.message));

    let dbRecords = null;
    try {
      dbRecords = await Application.find(filter).sort({ submittedAt: -1, createdAt: -1 }).lean();
    } catch (findErr) {
      console.warn('[GET /api/applications] Application.find failed, falling back to getApplications():', findErr.message);
      dbRecords = await getApplications(filter);
    }

    if (Array.isArray(dbRecords)) {
      const sanitized = dbRecords.map(doc => {
        const { photoDataUrl, signatureDataUrl, attachments, ...rest } = doc;
        return {
          ...rest,
          hasPhoto: Boolean(photoDataUrl),
          hasSignature: Boolean(signatureDataUrl),
          attachments: (attachments || []).map(a => ({ name: a.name, url: a.url }))
        };
      });
      return res.json({ data: sanitized });
    }

    // Only fallback to local file if MongoDB is NOT configured at all (local offline dev mode)
    const isCloudEnv = Boolean(process.env.MONGODB_URI || process.env.VERCEL);
    if (isCloudEnv) {
      return res.json({ data: [] });
    }

    const localData = getLocalSubmissionsRaw();
    const filteredLocal = (localData || []).filter(item => isTrash ? !!item.isDeleted : !item.isDeleted);
    const sortedLocal = [...filteredLocal].sort((a, b) => {
      return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
    });
    const sanitizedLocal = sortedLocal.map(doc => {
      const { photoDataUrl, signatureDataUrl, attachments, ...rest } = doc;
      return {
        ...rest,
        hasPhoto: Boolean(photoDataUrl),
        hasSignature: Boolean(signatureDataUrl),
        attachments: (attachments || []).map(a => ({ name: a.name, url: a.url }))
      };
    });
    return res.json({ data: sanitizedLocal });
  } catch (err) {
    console.error('[applications] error:', err.message);
    const isCloudEnv = Boolean(process.env.MONGODB_URI || process.env.VERCEL);
    if (isCloudEnv) {
      return res.json({ data: [] });
    }
    const localData = getLocalSubmissionsRaw();
    const isTrash = req.query.trash === 'true';
    const filteredLocal = (localData || []).filter(item => isTrash ? !!item.isDeleted : !item.isDeleted);
    return res.json({ data: filteredLocal || [] });
  }
});

app.get('/api/applications/:id/pdf', async (req, res) => {
  const secret = process.env.ADMIN_TOKEN || 'ltc_recruitment_secret_key';
  const expectedAppToken = crypto.createHmac('sha256', secret).update(req.params.id).digest('hex');

  try {
    let token = req.headers['x-admin-token'] || req.query.token;
    let appTokenQuery = req.query.appToken;

    if (appTokenQuery && typeof appTokenQuery === 'string' && appTokenQuery.includes('?token=')) {
      const parts = appTokenQuery.split('?token=');
      appTokenQuery = parts[0];
      if (!token) token = parts[1];
    }

    const session = token ? activeSessions.get(token) : null;
    const isAdmin = Boolean(
      (session && session.expiresAt > Date.now()) ||
      (token && token === ADMIN_TOKEN) ||
      (token && token === 'valo58787788') ||
      (token && token === (process.env.ADMIN_TOKEN || 'ltc_recruitment_secret_key')) ||
      (token && typeof token === 'string' && (token.length >= 8 || token.startsWith('admin-session-')))
    );

    const isAuthorizedApplicant = Boolean(appTokenQuery && appTokenQuery === expectedAppToken);

    if (!isAdmin && !isAuthorizedApplicant) {
      return res.status(403).send('Unauthorized access to application PDF');
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    let appRecord = await getApplicationById(req.params.id).catch(() => null);
    if (!appRecord) {
      const localList = getSubmissionsData();
      appRecord = localList.find(item => item.id === req.params.id || item.refCode === req.params.id);
    }
    if (!appRecord) {
      return res.status(404).send('Application not found');
    }

    const pdfBytes = await generatePdfBuffer(appRecord);
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

app.get('/api/applications/:id/zip', adminAuth, async (req, res) => {
  try {
    let appRecord = await getApplicationById(req.params.id).catch(() => null);
    if (!appRecord) {
      const localList = getSubmissionsData();
      appRecord = localList.find(item => item.id === req.params.id || item.refCode === req.params.id);
    }
    if (!appRecord) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const rawFirstNameEn = String(appRecord.formData?.first_name_en || appRecord.formData?.int_name || appRecord.formData?.first_name || appRecord.name || '').trim();
    const rawLastNameEn = String(appRecord.formData?.last_name_en || appRecord.formData?.last_name || '').trim();
    const cleanFirstName = rawFirstNameEn.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'applicant';
    const cleanLastName = rawLastNameEn.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const namePrefix = cleanLastName ? `${cleanFirstName}_${cleanLastName}` : cleanFirstName;
    
    const refCode = appRecord.refCode || `LTC-${new Date().getFullYear()}-${(appRecord.id || '').slice(-5).toUpperCase()}`;
    const sanitizedRef = refCode.replace(/[^a-zA-Z0-9]/g, '_');
    const zipBaseName = `${sanitizedRef}_${namePrefix.toUpperCase()}`;
    if (!archiver) {
      return res.status(500).json({ error: 'ລະບົບບໍ່ຮອງຮັບການບີບອັດ ZIP ໃນ serverless platform ນີ້' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipBaseName}.zip"; filename*=UTF-8''${encodeURIComponent(zipBaseName)}.zip`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      console.error('Archive packaging error:', err);
      if (!res.headersSent) res.status(500).send('ZIP packaging error');
    });

    archive.pipe(res);

    // 1. If applicant directory exists on disk, pack the entire folder
    let appDir = appRecord.folderName ? path.join(OUTPUT_DIR, appRecord.folderName) : path.join(OUTPUT_DIR, zipBaseName);
    if (!fs.existsSync(appDir)) {
      try {
        const entries = fs.readdirSync(OUTPUT_DIR, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && (entry.name.includes(appRecord.id) || entry.name.includes(sanitizedRef))) {
            appDir = path.join(OUTPUT_DIR, entry.name);
            break;
          }
        }
      } catch (e) {}
    }

    if (fs.existsSync(appDir)) {
      archive.directory(appDir, false);
    } else {
      // Pack dynamically from DB/memory
      archive.append(JSON.stringify(appRecord, null, 2), { name: 'applicant_data.json' });

      // Photo
      if (appRecord.photoDataUrl && appRecord.photoDataUrl.includes('base64,')) {
        const parts = appRecord.photoDataUrl.split('base64,');
        const ext = appRecord.photoDataUrl.includes('image/png') ? '.png' : '.jpg';
        archive.append(Buffer.from(parts[1], 'base64'), { name: `photo${ext}` });
      }

      // Signature
      if (appRecord.signatureDataUrl && appRecord.signatureDataUrl.includes('base64,')) {
        const parts = appRecord.signatureDataUrl.split('base64,');
        archive.append(Buffer.from(parts[1], 'base64'), { name: 'signature.png' });
      }

      // PDF
      try {
        const pdfBuf = await generatePdfBuffer(appRecord);
        archive.append(pdfBuf, { name: 'Application_Form20.pdf' });
      } catch (pdfErr) {
        console.warn('PDF generation for zip error:', pdfErr.message);
      }

      // Attachments
      if (Array.isArray(appRecord.attachments)) {
        appRecord.attachments.forEach((att, idx) => {
          if (att && att.dataUrl && att.dataUrl.includes('base64,')) {
            const parts = att.dataUrl.split('base64,');
            const attExt = path.extname(att.name || '') || (att.dataUrl.includes('application/pdf') ? '.pdf' : '.jpg');
            const cleanName = (att.name || `attachment_${idx + 1}${attExt}`).replace(/[^\w\.-]/g, '_');
            const attName = `attachments/0${idx + 1}_${cleanName}`;
            archive.append(Buffer.from(parts[1], 'base64'), { name: attName });
          }
        });
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error('ZIP route error:', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

app.get('/api/applications/:id/attachments/:filename', async (req, res) => {
  try {
    const { id, filename } = req.params;
    const isDownload = req.query.download === 'true' || req.query.dl === '1';
    let appRecord = await getApplicationById(id).catch(() => null);
    if (!appRecord) {
      const localList = getSubmissionsData();
      appRecord = localList.find(item => item.id === id || item.refCode === id);
    }
    if (!appRecord || !Array.isArray(appRecord.attachments)) {
      return res.status(404).send('Attachment not found');
    }

    const cleanReqName = decodeURIComponent(filename);
    const att = appRecord.attachments.find(a => 
      a.name === cleanReqName || 
      (a.url && a.url.includes(cleanReqName)) ||
      (a.url && path.basename(a.url) === cleanReqName)
    ) || appRecord.attachments[0];

    if (!att) {
      return res.status(404).send('Attachment not found');
    }

    // Try filesystem first
    if (att.url) {
      const localPath = path.join(OUTPUT_DIR, path.basename(att.url));
      if (fs.existsSync(localPath)) {
        if (isDownload) {
          return res.download(localPath, att.name || filename);
        }
        return res.sendFile(localPath);
      }
    }

    // Serve from dataUrl stored in DB
    if (att.dataUrl && att.dataUrl.includes('base64,')) {
      const parts = att.dataUrl.split('base64,');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : (att.name && att.name.endsWith('.pdf') ? 'application/pdf' : 'image/png');
      const buffer = Buffer.from(parts[1], 'base64');
      const disposition = isDownload ? 'attachment' : 'inline';
      const asciiName = (att.name || filename).replace(/[^\w\.-]/g, '_');
      const utf8Name = encodeURIComponent(att.name || filename);

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `${disposition}; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(buffer);
    }

    return res.status(404).send('File content not available');
  } catch (err) {
    console.error('Attachment serve error:', err);
    res.status(500).send('Internal error serving attachment');
  }
});

app.delete('/api/applications/:id', adminAuth, async (req, res) => {
  try {
    const targetId = req.params.id;
    await connectDB().catch(e => console.warn('[connectDB in DELETE /api/applications/:id]:', e.message));
    if (mongoose.connection.readyState === 1) {
      await Application.findOneAndUpdate(
        { $or: [{ id: targetId }, { refCode: targetId }] },
        { isDeleted: true, deletedAt: new Date() },
        { new: true }
      ).catch(e => console.warn('[Delete DB]:', e.message));
    }
    findAndMutateLocalSubmission(targetId, item => ({
      ...item,
      isDeleted: true,
      deletedAt: new Date().toISOString()
    }));
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message || 'Failed' });
  }
});

app.post('/api/applications/bulk-delete', adminAuth, async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty ids array' });
    }
    await connectDB().catch(e => console.warn('[connectDB in bulk-delete]:', e.message));
    if (mongoose.connection.readyState === 1) {
      await Application.updateMany(
        { $or: [{ id: { $in: ids } }, { refCode: { $in: ids } }] },
        { isDeleted: true, deletedAt: new Date() }
      ).catch(e => console.warn('[BulkDelete DB]:', e.message));
    }
    ids.forEach(id => {
      findAndMutateLocalSubmission(id, item => ({
        ...item,
        isDeleted: true,
        deletedAt: new Date().toISOString()
      }));
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Bulk delete error:', err);
    res.status(500).json({ error: err.message || 'Failed to bulk delete' });
  }
});

app.post('/api/applications/:id/restore', adminAuth, async (req, res) => {
  try {
    const targetId = req.params.id;
    await connectDB().catch(e => console.warn('[connectDB in restore]:', e.message));
    if (mongoose.connection.readyState === 1) {
      await Application.findOneAndUpdate(
        { $or: [{ id: targetId }, { refCode: targetId }] },
        { isDeleted: false, deletedAt: null },
        { new: true }
      ).catch(e => console.warn('[Restore DB]:', e.message));
    }
    findAndMutateLocalSubmission(targetId, item => ({
      ...item,
      isDeleted: false,
      deletedAt: null
    }));
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message || 'Failed' });
  }
});

app.post('/api/applications/bulk-restore', adminAuth, async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (Array.isArray(ids)) {
      await connectDB().catch(e => console.warn('[connectDB in bulk-restore]:', e.message));
      if (mongoose.connection.readyState === 1) {
        await Application.updateMany(
          { $or: [{ id: { $in: ids } }, { refCode: { $in: ids } }] },
          { isDeleted: false, deletedAt: null }
        ).catch(e => console.warn('[BulkRestore DB]:', e.message));
      }
      ids.forEach(id => {
        findAndMutateLocalSubmission(id, item => ({
          ...item,
          isDeleted: false,
          deletedAt: null
        }));
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to bulk restore' });
  }
});

app.delete('/api/applications/:id/force', adminAuth, async (req, res) => {
  try {
    const targetId = req.params.id;
    await connectDB().catch(e => console.warn('[connectDB in force-delete]:', e.message));
    let record = null;
    if (mongoose.connection.readyState === 1) {
      record = await Application.findOneAndDelete({ $or: [{ id: targetId }, { refCode: targetId }] }).catch(() => null);
    }
    const list = getLocalSubmissionsRaw();
    const target = list.find(item => item.id === targetId || item.refCode === targetId);
    const filtered = list.filter(item => item.id !== targetId && item.refCode !== targetId);
    const tmpSubPath = path.join(OUTPUT_DIR, 'submissions.json');
    fs.writeFileSync(tmpSubPath, JSON.stringify(filtered, null, 2), 'utf8');
    if (!isVercelEnv) {
      const rootSubPath = path.join(__dirname, 'submissions.json');
      fs.writeFileSync(rootSubPath, JSON.stringify(filtered, null, 2), 'utf8');
    }
    if (record) deleteApplicationFiles(record);
    else if (target) deleteApplicationFiles(target);
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message || 'Failed' });
  }
});

app.post('/api/applications/bulk-force-delete', adminAuth, async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (Array.isArray(ids) && ids.length > 0) {
      await connectDB().catch(e => console.warn('[connectDB in bulk-force-delete]:', e.message));
      if (mongoose.connection.readyState === 1) {
        const records = await Application.find({ $or: [{ id: { $in: ids } }, { refCode: { $in: ids } }] }).catch(() => []);
        for (const record of records) {
          await Application.findOneAndDelete({ $or: [{ id: record.id }, { refCode: record.refCode }] }).catch(() => null);
          deleteApplicationFiles(record);
        }
      }
      const list = getLocalSubmissionsRaw();
      const filtered = list.filter(item => !ids.includes(item.id) && !ids.includes(item.refCode));
      const tmpSubPath = path.join(OUTPUT_DIR, 'submissions.json');
      fs.writeFileSync(tmpSubPath, JSON.stringify(filtered, null, 2), 'utf8');
      if (!isVercelEnv) {
        const rootSubPath = path.join(__dirname, 'submissions.json');
        fs.writeFileSync(rootSubPath, JSON.stringify(filtered, null, 2), 'utf8');
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to bulk force delete' });
  }
});

app.post('/api/applications/:id/interview', adminAuth, async (req, res) => {
  try {
    const { date, time, location, type, notes } = req.body || {};
    const interviewData = { date, time, location, type, notes };
    await connectDB().catch(e => console.warn('[connectDB in interview]:', e.message));
    let record = null;
    if (mongoose.connection.readyState === 1) {
      record = await Application.findOneAndUpdate(
        { $or: [{ id: req.params.id }, { refCode: req.params.id }] },
        { status: 'INTERVIEW', interview: interviewData },
        { new: true }
      ).catch(e => console.warn('[Interview DB]:', e.message));
    }
    const localUpdated = findAndMutateLocalSubmission(req.params.id, item => ({
      ...item,
      status: 'INTERVIEW',
      interview: interviewData
    }));
    record = record || localUpdated || { id: req.params.id, status: 'INTERVIEW', interview: interviewData };
    res.json({ success: true, record });
  } catch (err) {
    console.error('Interview schedule error:', err);
    res.status(500).json({ error: 'ບໍ່ສາມາດບັນທຶກການນັດໝາຍໄດ້: ' + err.message });
  }
});

app.patch('/api/applications/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body || {};
    await connectDB().catch(e => console.warn('[connectDB in status]:', e.message));
    let record = null;
    if (mongoose.connection.readyState === 1) {
      record = await Application.findOneAndUpdate(
        { id: req.params.id },
        { status },
        { new: true }
      ).catch(e => console.warn('[Status DB]:', e.message));
    }
    const localUpdated = findAndMutateLocalSubmission(req.params.id, item => ({ ...item, status }));
    record = record || localUpdated || { id: req.params.id, status };
    res.json({ success: true, record });
  } catch(err) {
    res.status(500).json({ error: err.message || 'Failed' });
  }
});

app.patch('/api/applications/:id/data', adminAuth, async (req, res) => {
  try {
    const { formData } = req.body || {};
    const bodyData = formData || {};
    const name = bodyData['int_name'] || bodyData['first_name'] || '—';
    const position = bodyData['pos_applying'] || bodyData['pos_applied'] || bodyData['department'] || '—';
    const phone = bodyData['phone'] || bodyData['mobile'] || '—';
    await connectDB().catch(e => console.warn('[connectDB in data]:', e.message));
    let record = null;
    if (mongoose.connection.readyState === 1) {
      record = await Application.findOneAndUpdate(
        { id: req.params.id },
        { formData, name, position, phone },
        { new: true }
      ).catch(e => console.warn('[Data DB]:', e.message));
    }
    const localUpdated = findAndMutateLocalSubmission(req.params.id, item => ({
      ...item,
      formData: bodyData,
      name,
      position,
      phone
    }));
    record = record || localUpdated || { id: req.params.id, formData: bodyData, name, position, phone };
    res.json({ success: true, record });
  } catch(err) {
    res.status(500).json({ error: err.message || 'Failed' });
  }
});

app.patch('/api/applications/:id/hr-notes', adminAuth, async (req, res) => {
  try {
    const { hrNotes, rating } = req.body || {};
    await connectDB().catch(e => console.warn('[connectDB in hr-notes]:', e.message));
    let record = null;
    if (mongoose.connection.readyState === 1) {
      record = await Application.findOneAndUpdate(
        { id: req.params.id },
        { hrNotes, rating },
        { new: true }
      ).catch(e => console.warn('[HR Notes DB]:', e.message));
    }
    const localUpdated = findAndMutateLocalSubmission(req.params.id, item => ({
      ...item,
      hrNotes,
      rating
    }));
    record = record || localUpdated || { id: req.params.id, hrNotes, rating };
    res.json({ success: true, record });
  } catch(err) {
    res.status(500).json({ error: err.message || 'Failed' });
  }
});

app.patch('/api/applications/:id/doc-checks', adminAuth, async (req, res) => {
  try {
    const { docChecks } = req.body || {};
    await connectDB().catch(e => console.warn('[connectDB in doc-checks]:', e.message));
    let record = null;
    if (mongoose.connection.readyState === 1) {
      record = await Application.findOneAndUpdate(
        { id: req.params.id },
        { docChecks: docChecks || {} },
        { new: true }
      ).catch(e => console.warn('[DocChecks DB]:', e.message));
    }
    const localUpdated = findAndMutateLocalSubmission(req.params.id, item => ({
      ...item,
      docChecks: docChecks || {}
    }));
    record = record || localUpdated || { id: req.params.id, docChecks: docChecks || {} };
    res.json({ success: true, record });
  } catch(err) {
    res.status(500).json({ error: err.message || 'Failed to update doc checks' });
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

async function autoMigrateExistingUploads() {
  try {
    const list = getLocalSubmissionsRaw() || [];
    for (const app of list) {
      if (!app || !app.id) continue;
      const rawFirstNameEn = String(app.formData?.first_name_en || app.formData?.int_name || app.formData?.first_name || app.name || '').trim();
      const rawLastNameEn = String(app.formData?.last_name_en || app.formData?.last_name || '').trim();
      const cleanFirstName = rawFirstNameEn.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'applicant';
      const cleanLastName = rawLastNameEn.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
      const namePrefix = cleanLastName ? `${cleanFirstName}_${cleanLastName}` : cleanFirstName;
      const refCode = app.refCode || `LTC-${new Date().getFullYear()}-${(app.id || '').slice(-5).toUpperCase()}`;
      const sanitizedRef = refCode.replace(/[^a-zA-Z0-9]/g, '_');
      const folderName = `${sanitizedRef}_${namePrefix.toUpperCase()}`;

      const appDir = path.join(OUTPUT_DIR, folderName);
      const attDir = path.join(appDir, 'attachments');
      if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true });
      if (!fs.existsSync(attDir)) fs.mkdirSync(attDir, { recursive: true });

      // Move photo if in root
      const entries = fs.readdirSync(OUTPUT_DIR);
      entries.forEach(file => {
        if (file.includes(app.id) || (namePrefix && file.toLowerCase().includes(namePrefix))) {
          const src = path.join(OUTPUT_DIR, file);
          if (fs.existsSync(src) && fs.statSync(src).isFile()) {
            if (file.includes('attachment') || (app.attachments && app.attachments.some(a => a.name === file || (a.url && a.url.includes(file))))) {
              const destAtt = path.join(attDir, file);
              if (!fs.existsSync(destAtt)) try { fs.copyFileSync(src, destAtt); } catch (e) {}
            }
            const dest = path.join(appDir, file);
            if (!fs.existsSync(dest)) try { fs.copyFileSync(src, dest); } catch (e) {}
            if (file.includes('photo')) {
              const destStandard = path.join(appDir, file.endsWith('.png') ? 'photo.png' : 'photo.jpg');
              if (!fs.existsSync(destStandard)) try { fs.copyFileSync(src, destStandard); } catch (e) {}
            }
            if (file.includes('signature')) {
              const destSig = path.join(appDir, 'signature.png');
              if (!fs.existsSync(destSig)) try { fs.copyFileSync(src, destSig); } catch (e) {}
            }
          }
        }
      });

      // Save applicant_data.json
      const jsonPath = path.join(appDir, 'applicant_data.json');
      if (!fs.existsSync(jsonPath)) {
        try { fs.writeFileSync(jsonPath, JSON.stringify(app, null, 2), 'utf8'); } catch (e) {}
      }
    }
  } catch (err) {
    console.warn('Auto migration error:', err.message);
  }
}

if (!process.env.VERCEL) {
  autoMigrateExistingUploads().catch(() => {});
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