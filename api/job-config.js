const mongoose = require('mongoose');

const DEFAULT_CLOUD_MONGO_URI = 'mongodb+srv://palamiphomaly_db_user:Valo58787788@cluster0.fjzhauz.mongodb.net/ltc_recruitment?retryWrites=true&w=majority';

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

let JobConfig;
try {
  JobConfig = mongoose.models.JobConfig || mongoose.model('JobConfig', jobConfigSchema);
} catch (e) {
  JobConfig = mongoose.model('JobConfig', jobConfigSchema);
}

async function connectDb() {
  if (mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI || DEFAULT_CLOUD_MONGO_URI, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000
    });
  } catch (e) {
    console.warn('Mongo connect warning:', e.message);
  }
}

const DEFAULT_CONFIG = {
  positions: [
    { department: 'ແຂວງສະຫວັນນະເຂດ', branch: 'ແຂວງສະຫວັນນະເຂດ', code: 'SVK', slots: '1', requirements: [] },
    { department: 'ແຂວງບໍລິຄຳໄຊ', branch: 'ແຂວງບໍລິຄຳໄຊ', code: 'BLK', slots: '1', requirements: [] },
    { department: 'ແຂວງຄຳມ່ວນ', branch: 'ແຂວງຄຳມ່ວນ', code: 'KHM', slots: '1', requirements: [] }
  ],
  requiredDocs: ['ໃບສະໝັກວຽກ', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.']
};

module.exports = async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    await connectDb();

    if (req.method === 'GET') {
      try {
        if (mongoose.connection.readyState === 1) {
          const doc = await JobConfig.findOne().sort({ updatedAt: -1 }).lean();
          if (doc && Array.isArray(doc.positions) && doc.positions.length > 0) {
            return res.status(200).json(doc);
          }
        }
      } catch (e) {}
      return res.status(200).json(DEFAULT_CONFIG);
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      let payload = req.body;
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch(e){}
      }
      if (payload && Array.isArray(payload.positions)) {
        if (mongoose.connection.readyState === 1) {
          await JobConfig.deleteMany({});
          await JobConfig.create({
            positions: payload.positions || [],
            requiredDocs: payload.requiredDocs || [],
            applicantRequirements: payload.applicantRequirements || []
          });
        }
      }
      return res.status(200).json({ success: true, data: payload });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal Error', message: err.message, stack: err.stack });
  }
};
