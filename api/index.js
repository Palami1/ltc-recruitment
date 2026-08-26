const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const DEFAULT_CLOUD_MONGO_URI = 'mongodb+srv://palamiphomaly_db_user:Valo58787788@cluster0.fjzhauz.mongodb.net/ltc_recruitment?retryWrites=true&w=majority';

// Ultra-fast memory fallback store
let memoryJobConfig = {
  positions: [
    { department: 'ແຂວງສະຫວັນນະເຂດ', branch: 'ແຂວງສະຫວັນນະເຂດ', code: 'SVK', slots: '1', requirements: [], deadline: '' },
    { department: 'ແຂວງບໍລິຄຳໄຊ', branch: 'ແຂວງບໍລິຄຳໄຊ', code: 'BLK', slots: '1', requirements: [], deadline: '' },
    { department: 'ແຂວງຄຳມ່ວນ', branch: 'ແຂວງຄຳມ່ວນ', code: 'KHM', slots: '1', requirements: [], deadline: '' }
  ],
  requiredDocs: ['ໃບສະໝັກວຽກ', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.']
};

let memoryApplications = [];

let cachedDb = null;

async function getDb() {
  if (cachedDb) return cachedDb;
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI || DEFAULT_CLOUD_MONGO_URI, {
      connectTimeoutMS: 2000,
      serverSelectionTimeoutMS: 2000
    });
    await client.connect();
    cachedDb = client.db('ltc_recruitment');
    return cachedDb;
  } catch (e) {
    console.warn('Mongo connection skipped:', e.message);
    return null;
  }
}

// Helper to prevent Express 4 async crash 500s
const safe = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    console.error('API Error:', err.message);
    if (!res.headersSent) {
      return res.status(200).json({ success: true, fallback: true, error: err.message, positions: memoryJobConfig.positions });
    }
  }
};

// --- AUTH ROUTE ---
app.post(['/api/auth/login', '/auth/login'], (req, res) => {
  const { password } = req.body || {};
  if (password === 'Valo58787788' || password === 'valo58787788') {
    return res.json({ token: 'valo58787788', success: true });
  }
  return res.status(401).json({ error: 'Invalid password' });
});

// --- JOB CONFIG ROUTES ---
app.get(['/api/job-config', '/job-config'], safe(async (req, res) => {
  const db = await getDb().catch(() => null);
  if (db) {
    try {
      const docs = await db.collection('jobconfigs').find({}).sort({ updatedAt: -1 }).limit(1).toArray();
      if (docs.length > 0 && Array.isArray(docs[0].positions) && docs[0].positions.length > 0) {
        memoryJobConfig = docs[0];
        return res.json(docs[0]);
      }
    } catch (e) {}
  }
  return res.json(memoryJobConfig);
}));

app.all(['/api/job-config', '/job-config'], safe(async (req, res) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    let payload = req.body;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch(e){}
    }
    if (payload && Array.isArray(payload.positions)) {
      memoryJobConfig = payload;
      const db = await getDb().catch(() => null);
      if (db) {
        try {
          const col = db.collection('jobconfigs');
          await col.deleteMany({});
          await col.insertOne({
            positions: payload.positions || [],
            requiredDocs: payload.requiredDocs || [],
            applicantRequirements: payload.applicantRequirements || [],
            updatedAt: new Date()
          });
        } catch (e) {}
      }
    }
    return res.json({ success: true, data: memoryJobConfig });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}));

// --- APPLICATIONS ROUTES ---
app.get(['/api/applications', '/applications'], safe(async (req, res) => {
  const db = await getDb().catch(() => null);
  if (db) {
    try {
      const apps = await db.collection('applications').find({}).sort({ createdAt: -1 }).toArray();
      if (Array.isArray(apps)) {
        memoryApplications = apps;
        return res.json(apps);
      }
    } catch (e) {}
  }
  return res.json(memoryApplications);
}));

app.post(['/api/applications', '/applications'], safe(async (req, res) => {
  const payload = req.body || {};
  const doc = {
    ...payload,
    _id: String(Date.now()),
    createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
    updatedAt: new Date(),
    status: payload.status || 'PENDING'
  };
  memoryApplications.unshift(doc);

  const db = await getDb().catch(() => null);
  if (db) {
    try {
      await db.collection('applications').insertOne(doc);
    } catch (e) {}
  }
  return res.json({ success: true, id: doc._id, data: doc });
}));

app.put(['/api/applications/:id', '/applications/:id'], safe(async (req, res) => {
  const { id } = req.params;
  const payload = req.body || {};

  memoryApplications = memoryApplications.map(a => (a._id === id || a.id === id) ? { ...a, ...payload } : a);

  const db = await getDb().catch(() => null);
  if (db) {
    try {
      const { ObjectId } = require('mongodb');
      let filter = {};
      try { filter = { _id: new ObjectId(id) }; } catch(e) { filter = { id }; }
      delete payload._id;
      await db.collection('applications').updateOne(filter, { $set: { ...payload, updatedAt: new Date() } });
    } catch (e) {}
  }
  return res.json({ success: true });
}));

app.delete(['/api/applications/:id', '/applications/:id'], safe(async (req, res) => {
  const { id } = req.params;

  memoryApplications = memoryApplications.filter(a => a._id !== id && a.id !== id);

  const db = await getDb().catch(() => null);
  if (db) {
    try {
      const { ObjectId } = require('mongodb');
      let filter = {};
      try { filter = { _id: new ObjectId(id) }; } catch(e) { filter = { id }; }
      await db.collection('applications').deleteOne(filter);
    } catch (e) {}
  }
  return res.json({ success: true });
}));

// Fallback handler for all other /api routes
app.all('*', (req, res) => {
  return res.json({ status: 'ok', time: new Date() });
});

module.exports = (req, res) => {
  return app(req, res);
};
