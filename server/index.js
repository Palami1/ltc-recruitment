require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { FORM_20 } = require('./form20Schema');
const Application = require('./models/Application');
const JobConfig = require('./models/JobConfig');
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { error: 'ທ່ານກົດສົ່ງຟອມຫຼາຍເກີນໄປແລ້ວ! ກະລຸນາລໍຖ້າ 10 ນາທີແລ້ວລອງໃໝ່ເດີ້!' }
});

const app = express();
const port = process.env.PORT || 5000;

const frontendUrl = process.env.FRONTEND_URL || 'https://ltc-recruitment.vercel.app';
app.use(cors({ 
  origin: frontendUrl,
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- Security Middleware ---
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'secret-admin-key';
const adminAuth = (req, res, next) => {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token !== ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
};

const upload = multer({ dest: 'uploads/temp/', limits: { fileSize: 5 * 1024 * 1024 } });

const TEMPLATE_PATH = path.join(__dirname, '../public/templates/20. ແບບຟອມສະໝັກເຂົ້າເຮັດວຽກ (13).pdf');
const CUSTOM_FONT_PATH = path.join(__dirname, '../public/fonts/Phetsarath OT.ttf');
const OUTPUT_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);
if (!fs.existsSync(path.join(OUTPUT_DIR, 'temp'))) fs.mkdirSync(path.join(OUTPUT_DIR, 'temp'), { recursive: true });

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ltc_recruitment')
  .then(async () => {
    console.log('MongoDB connected');
    // Ensure default JobConfig exists
    const configExists = await JobConfig.findOne();
    if (!configExists) {
      await JobConfig.create({
        positions: [
          { department: 'ພະແນກ ໄອທີ', code: 'IT', slots: 2, requirements: 'ຈົບປະລິນຍາຕີ ສາຂາ IT ຫຼື ທຽບເທົ່າ', deadline: '' },
          { department: 'ພະແນກ ການຕະຫຼາດ', code: 'MARKETING', slots: 1, requirements: 'ຈົບປະລິນຍາຕີ ສາຂາ ການຕະຫຼາດ', deadline: '' }
        ],
        requiredDocs: ['ໃບສະໝັກ Form 20', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.']
      });
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

// --- Serve uploaded files securely ---
app.get('/uploads/:filename', adminAuth, (req, res) => {
  const filePath = path.join(OUTPUT_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

// --- Signature processing ---
async function processSignature(inputPath, outputPath) {
  await sharp(inputPath).threshold(200).ensureAlpha().toColorspace('srgb').png().toFile(outputPath);
}

// ================================================================
// POST /api/applications — Submit a new application
// ================================================================
app.post('/api/applications', limiter, (req, res, next) => {
  upload.fields([
    { name: 'applicant_signature', maxCount: 1 },
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
  try {
    const files = req.files || {};
    const signatureFile = files['applicant_signature'] ? files['applicant_signature'][0] : null;
    const attachmentFiles = files['applicant_resume'] || [];
    const bodyData = req.body;

    let signatureImageBytes = null;
    if (signatureFile) {
      const processedSigPath = path.join(OUTPUT_DIR, 'temp', `${signatureFile.filename}_processed.png`);
      await processSignature(signatureFile.path, processedSigPath);
      signatureImageBytes = fs.readFileSync(processedSigPath);
      fs.unlinkSync(signatureFile.path);
      fs.unlinkSync(processedSigPath);
    }

    const attachmentRecords = attachmentFiles.map(file => {
      const finalName = `${Date.now()}_${file.originalname}`;
      const newPath = path.join(OUTPUT_DIR, finalName);
      fs.renameSync(file.path, newPath);
      return { name: file.originalname, url: `/uploads/${finalName}`, path: newPath };
    });

    if (!fs.existsSync(TEMPLATE_PATH)) return res.status(500).json({ error: 'PDF template not found' });
    const existingPdfBytes = fs.readFileSync(TEMPLATE_PATH);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // Register fontkit & Embed Lao Font
    pdfDoc.registerFontkit(fontkit);
    let customFont = null;
    if (fs.existsSync(CUSTOM_FONT_PATH)) {
      const fontBytes = fs.readFileSync(CUSTOM_FONT_PATH);
      customFont = await pdfDoc.embedFont(fontBytes);
    }
    
    const pages = pdfDoc.getPages();

    FORM_20.fields.forEach(field => {
      const page = pages[field.pageIndex] || pages[0];
      const val = bodyData[field.id];
      if (field.type === 'checkbox' && (val === 'true' || val === true || val === 'on')) {
        page.drawText('X', { x: field.x, y: field.y, size: 14, color: rgb(0, 0, 0) });
      } else if (val && field.type !== 'checkbox' && field.type !== 'file') {
        const textOptions = { x: field.x, y: field.y, size: 10, color: rgb(0, 0, 0) };
        if (customFont) textOptions.font = customFont;
        page.drawText(String(val), textOptions);
      }
    });

    if (signatureImageBytes) {
      const page2 = pages[1] || pages[0];
      const pngImage = await pdfDoc.embedPng(signatureImageBytes);
      const pngDims = pngImage.scale(0.25);
      page2.drawImage(pngImage, { x: 350, y: 150, width: pngDims.width, height: pngDims.height });
    }

    // Append attachments to the PDF as new pages
    for (const record of attachmentRecords) {
      if (!fs.existsSync(record.path)) continue;
      
      const ext = path.extname(record.name).toLowerCase();
      try {
        if (ext === '.pdf') {
          const donorPdfBytes = fs.readFileSync(record.path);
          const donorPdf = await PDFDocument.load(donorPdfBytes);
          const donorPages = await pdfDoc.copyPages(donorPdf, donorPdf.getPageIndices());
          donorPages.forEach(p => pdfDoc.addPage(p));
        } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
          const imageBytes = fs.readFileSync(record.path);
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

    const pdfBytes = await pdfDoc.save();
    const finalFilename = `application_${Date.now()}.pdf`;
    fs.writeFileSync(path.join(OUTPUT_DIR, finalFilename), pdfBytes);
    const pdfUrl = `/uploads/${finalFilename}`;

    // Mongoose creation handles the concurrency safely along with MongoDB internally
    await Application.create({
      id: `APP_${Date.now()}`,
      formData: bodyData,
      pdfUrl,
      attachments: attachmentRecords,
      name: bodyData['int_name'] || bodyData['first_name'] || '—',
      position: bodyData['pos_applied'] || bodyData['department'] || '—',
      phone: bodyData['phone'] || bodyData['mobile'] || '—',
    });

    res.status(201).json({ success: true, message: 'ສົ່ງຟອມສຳເລັດ!', fileUrl: pdfUrl });
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ error: 'Internal server error while processing document' });
  }
});

// ================================================================
// GET /api/applications — List all applications (Protected)
// ================================================================
app.get('/api/applications', adminAuth, async (req, res) => {
  try {
    const data = await Application.find().sort({ submittedAt: -1 }).lean();
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// ================================================================
// DELETE /api/applications/:id — Delete an application (Protected)
// ================================================================
app.delete('/api/applications/:id', adminAuth, async (req, res) => {
  try {
    const record = await Application.findOneAndDelete({ id: req.params.id });
    if (!record) return res.status(404).json({ error: 'Not found' });
    // Note: PDF files inside `uploads` are left on disk to save time, but usually we would unlink here
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: 'Failed' });
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
// GET /api/job-config — Get job opening config
// ================================================================
app.get('/api/job-config', async (req, res) => {
  try {
    const config = await JobConfig.findOne().lean();
    res.json(config || { positions: [], requiredDocs: [] });
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
          slots: Math.max(1, Number(p.slots) || 1),
        }));
    }
    await JobConfig.deleteMany({});
    await JobConfig.create(body);
    res.json({ success: true });
  } catch (err) {
    console.error('Job config save error:', err);
    res.status(500).json({ error: 'Could not save job config' });
  }
});

app.listen(port, () => console.log(`Server listening on port ${port}`));
