const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const DEFAULT_CLOUD_MONGO_URI = 'mongodb+srv://palamiphomaly_db_user:Valo58787788@cluster0.fjzhauz.mongodb.net/ltc_recruitment?retryWrites=true&w=majority';

let memoryJobConfig = {
  positions: [
    { department: 'ແຂວງສະຫວັນນະເຂດ', branch: 'ແຂວງສະຫວັນນະເຂດ', code: 'SVK', slots: '1', requirements: [], deadline: '' },
    { department: 'ແຂວງບໍລິຄຳໄຊ', branch: 'ແຂວງບໍລິຄຳໄຊ', code: 'BLK', slots: '1', requirements: [], deadline: '' },
    { department: 'ແຂວງຄຳມ່ວນ', branch: 'ແຂວງຄຳມ່ວນ', code: 'KHM', slots: '1', requirements: [], deadline: '' }
  ],
  requiredDocs: ['ໃບສະໝັກວຽກ', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.']
};

let memoryApplications = [];
let cachedClient = null;

async function getDb() {
  if (cachedClient && cachedClient.topology && cachedClient.topology.isConnected()) {
    return cachedClient.db('ltc_recruitment');
  }
  const client = new MongoClient(process.env.MONGODB_URI || DEFAULT_CLOUD_MONGO_URI, {
    connectTimeoutMS: 3000,
    serverSelectionTimeoutMS: 3000
  });
  await client.connect();
  cachedClient = client;
  return client.db('ltc_recruitment');
}

app.post(['/api/auth/login', '/auth/login'], (req, res) => {
  const { password } = req.body || {};
  if (password === 'Valo58787788' || password === 'valo58787788') {
    return res.json({ token: 'valo58787788', success: true });
  }
  return res.status(401).json({ error: 'Invalid password' });
});

app.get(['/api/job-config', '/job-config'], async (req, res) => {
  try {
    const db = await getDb();
    if (db) {
      const docs = await db.collection('jobconfigs').find({}).sort({ updatedAt: -1 }).limit(1).toArray();
      if (docs.length > 0 && Array.isArray(docs[0].positions) && docs[0].positions.length > 0) {
        memoryJobConfig = docs[0];
        return res.json(docs[0]);
      }
    }
  } catch (e) {
    console.warn('Mongo job-config error:', e.message);
  }
  return res.json(memoryJobConfig);
});

app.all(['/api/job-config', '/job-config'], async (req, res) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    let payload = req.body;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch(e){}
    }
    if (payload && Array.isArray(payload.positions)) {
      memoryJobConfig = payload;
      try {
        const db = await getDb();
        if (db) {
          const col = db.collection('jobconfigs');
          await col.deleteMany({});
          await col.insertOne({
            positions: payload.positions || [],
            requiredDocs: payload.requiredDocs || [],
            applicantRequirements: payload.applicantRequirements || [],
            updatedAt: new Date()
          });
        }
      } catch (e) {
        console.warn('Mongo put job-config warning:', e.message);
      }
    }
    return res.json({ success: true, data: memoryJobConfig });
  }
  return res.status(405).json({ error: 'Method not allowed' });
});

app.get(['/api/applications', '/applications'], async (req, res) => {
  try {
    const db = await getDb();
    if (db) {
      const apps = await db.collection('applications').find({}).sort({ createdAt: -1 }).toArray();
      if (Array.isArray(apps)) {
        memoryApplications = apps;
        return res.json(apps);
      }
    }
  } catch (e) {
    console.warn('Mongo applications error:', e.message);
  }
  return res.json(memoryApplications);
});

app.post(['/api/applications', '/applications'], async (req, res) => {
  const payload = req.body || {};
  const doc = {
    ...payload,
    _id: new ObjectId().toString(),
    createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
    updatedAt: new Date(),
    status: payload.status || 'PENDING'
  };
  memoryApplications.unshift(doc);

  try {
    const db = await getDb();
    if (db) {
      await db.collection('applications').insertOne(doc);
    }
  } catch (e) {
    console.warn('Mongo post application warning:', e.message);
  }
  return res.json({ success: true, id: doc._id, data: doc });
});

app.all('*', (req, res) => {
  return res.json({ status: 'ok', time: new Date() });
});

module.exports = app;
