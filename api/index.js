const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

const DEFAULT_CLOUD_MONGO_URI = 'mongodb+srv://palamiphomaly_db_user:Valo58787788@cluster0.fjzhauz.mongodb.net/ltc_recruitment?retryWrites=true&w=majority';

// Mongoose schema definition
const positionSchema = new mongoose.Schema({
  department: String,
  branch: String,
  section: String,
  code: String,
  slots: String,
  requirements: [String],
  deadline: String
}, { _id: false });

const jobConfigSchema = new mongoose.Schema({
  positions: [positionSchema],
  requiredDocs: [String],
  applicantRequirements: [String]
}, { timestamps: true });

const JobConfig = mongoose.models.JobConfig || mongoose.model('JobConfig', jobConfigSchema);

async function connectDb() {
  if (mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI || DEFAULT_CLOUD_MONGO_URI, {
      serverSelectionTimeoutMS: 3000
    });
  } catch (e) {
    console.warn('Mongo connect warning:', e.message);
  }
}

app.get('/api/job-config', async (req, res) => {
  await connectDb();
  try {
    const doc = await JobConfig.findOne().sort({ updatedAt: -1 }).lean();
    if (doc && Array.isArray(doc.positions) && doc.positions.length > 0) {
      return res.json(doc);
    }
  } catch (e) {}

  return res.json({
    positions: [
      { department: 'ແຂວງສະຫວັນນະເຂດ', branch: 'ແຂວງສະຫວັນນະເຂດ', code: 'SVK', slots: '1', requirements: [] },
      { department: 'ແຂວງບໍລິຄຳໄຊ', branch: 'ແຂວງບໍລິຄຳໄຊ', code: 'BLK', slots: '1', requirements: [] },
      { department: 'ແຂວງຄຳມ່ວນ', branch: 'ແຂວງຄຳມ່ວນ', code: 'KHM', slots: '1', requirements: [] }
    ],
    requiredDocs: ['ໃບສະໝັກວຽກ', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.']
  });
});

app.all('/api/job-config', async (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    await connectDb();
    try {
      const payload = req.body;
      if (payload && Array.isArray(payload.positions)) {
        await JobConfig.deleteMany({});
        await JobConfig.create({
          positions: payload.positions || [],
          requiredDocs: payload.requiredDocs || [],
          applicantRequirements: payload.applicantRequirements || []
        });
      }
      return res.json({ success: true, data: payload });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  next();
});

// Lazy load main server app to avoid function invocation crash on Vercel
let mainServerApp = null;
function getMainServerApp() {
  if (!mainServerApp) {
    try {
      mainServerApp = require('../server/index.js');
    } catch (e) {
      console.warn('Main server load warning:', e.message);
    }
  }
  return mainServerApp;
}

app.use((req, res, next) => {
  const handler = getMainServerApp();
  if (handler) return handler(req, res, next);
  next();
});

module.exports = app;
