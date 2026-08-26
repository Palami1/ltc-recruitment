const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

const DEFAULT_CLOUD_MONGO_URI = 'mongodb+srv://palamiphomaly_db_user:Valo58787788@cluster0.fjzhauz.mongodb.net/ltc_recruitment?retryWrites=true&w=majority';

let cachedClient = null;

async function getCollection() {
  if (!cachedClient) {
    cachedClient = new MongoClient(process.env.MONGODB_URI || DEFAULT_CLOUD_MONGO_URI, {
      connectTimeoutMS: 3000,
      serverSelectionTimeoutMS: 3000
    });
    await cachedClient.connect();
  }
  return cachedClient.db('ltc_recruitment').collection('jobconfigs');
}

const DEFAULT_CONFIG = {
  positions: [
    { department: 'ແຂວງສະຫວັນນະເຂດ', branch: 'ແຂວງສະຫວັນນະເຂດ', code: 'SVK', slots: '1', requirements: [] },
    { department: 'ແຂວງບໍລິຄຳໄຊ', branch: 'ແຂວງບໍລິຄຳໄຊ', code: 'BLK', slots: '1', requirements: [] },
    { department: 'ແຂວງຄຳມ່ວນ', branch: 'ແຂວງຄຳມ່ວນ', code: 'KHM', slots: '1', requirements: [] }
  ],
  requiredDocs: ['ໃບສະໝັກວຽກ', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.']
};

app.get(['/api/job-config', '/job-config'], async (req, res) => {
  try {
    const collection = await getCollection();
    const docs = await collection.find({}).sort({ updatedAt: -1 }).limit(1).toArray();
    if (docs.length > 0 && Array.isArray(docs[0].positions) && docs[0].positions.length > 0) {
      return res.json(docs[0]);
    }
  } catch (e) {
    console.warn('Mongo get error:', e.message);
  }
  return res.json(DEFAULT_CONFIG);
});

app.all(['/api/job-config', '/job-config'], async (req, res) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    let payload = req.body;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch(e){}
    }
    if (payload && Array.isArray(payload.positions)) {
      try {
        const collection = await getCollection();
        await collection.deleteMany({});
        await collection.insertOne({
          positions: payload.positions || [],
          requiredDocs: payload.requiredDocs || [],
          applicantRequirements: payload.applicantRequirements || [],
          updatedAt: new Date()
        });
      } catch (e) {
        console.warn('Mongo put error:', e.message);
      }
    }
    return res.json({ success: true, data: payload });
  }
  return res.status(405).json({ error: 'Method not allowed' });
});

// Fallback handler for all other /api routes
app.all('*', (req, res) => {
  return res.json({ status: 'ok', time: new Date() });
});

module.exports = (req, res) => {
  return app(req, res);
};
