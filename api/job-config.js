let mongoose;
try {
  mongoose = require('mongoose');
} catch (e) {
  console.error('Mongoose require failed:', e.message);
}

const DEFAULT_CLOUD_MONGO_URI = 'mongodb+srv://palamiphomaly_db_user:Valo58787788@cluster0.fjzhauz.mongodb.net/ltc_recruitment?retryWrites=true&w=majority';

let JobConfig;
if (mongoose) {
  try {
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

    JobConfig = mongoose.models.JobConfig || mongoose.model('JobConfig', jobConfigSchema);
  } catch (e) {}
}

function connectDb() {
  if (!mongoose || mongoose.connection.readyState === 1) return;
  mongoose.connect(process.env.MONGODB_URI || DEFAULT_CLOUD_MONGO_URI, {
    serverSelectionTimeoutMS: 2000,
    connectTimeoutMS: 2000
  }).catch(() => null);
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

    connectDb();

    if (req.method === 'GET') {
      try {
        if (mongoose && mongoose.connection.readyState === 1 && JobConfig) {
          const doc = await JobConfig.findOne().sort({ updatedAt: -1 }).lean().maxTimeMS(2000);
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
        try {
          if (mongoose && JobConfig) {
            if (mongoose.connection.readyState !== 1) {
              await mongoose.connect(process.env.MONGODB_URI || DEFAULT_CLOUD_MONGO_URI, {
                serverSelectionTimeoutMS: 4000
              });
            }
            await JobConfig.deleteMany({});
            await JobConfig.create({
              positions: payload.positions || [],
              requiredDocs: payload.requiredDocs || [],
              applicantRequirements: payload.applicantRequirements || []
            });
          }
        } catch (e) {
          console.warn('DB Save error:', e.message);
        }
      }
      return res.status(200).json({ success: true, data: payload });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(200).json(DEFAULT_CONFIG);
  }
};
