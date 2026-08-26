const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const DEFAULT_CLOUD_MONGO_URI = 'mongodb+srv://palamiphomaly_db_user:Valo58787788@cluster0.fjzhauz.mongodb.net/ltc_recruitment?retryWrites=true&w=majority';

let cachedClient = null;

async function getDb() {
  if (!cachedClient) {
    cachedClient = new MongoClient(process.env.MONGODB_URI || DEFAULT_CLOUD_MONGO_URI, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000
    });
    await cachedClient.connect();
  }
  return cachedClient.db('ltc_recruitment');
}

const DEFAULT_CONFIG = {
  positions: [
    { department: 'ແຂວງສະຫວັນນະເຂດ', branch: 'ແຂວງສະຫວັນນະເຂດ', code: 'SVK', slots: '1', requirements: [] },
    { department: 'ແຂວງບໍລິຄຳໄຊ', branch: 'ແຂວງບໍລິຄຳໄຊ', code: 'BLK', slots: '1', requirements: [] },
    { department: 'ແຂວງຄຳມ່ວນ', branch: 'ແຂວງຄຳມ່ວນ', code: 'KHM', slots: '1', requirements: [] }
  ],
  requiredDocs: ['ໃບສະໝັກວຽກ', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.']
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
app.get(['/api/job-config', '/job-config'], async (req, res) => {
  try {
    const db = await getDb();
    const docs = await db.collection('jobconfigs').find({}).sort({ updatedAt: -1 }).limit(1).toArray();
    if (docs.length > 0 && Array.isArray(docs[0].positions) && docs[0].positions.length > 0) {
      return res.json(docs[0]);
    }
  } catch (e) {
    console.warn('Mongo get job-config error:', e.message);
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
        const db = await getDb();
        const col = db.collection('jobconfigs');
        await col.deleteMany({});
        await col.insertOne({
          positions: payload.positions || [],
          requiredDocs: payload.requiredDocs || [],
          applicantRequirements: payload.applicantRequirements || [],
          updatedAt: new Date()
        });
        return res.json({ success: true, data: payload });
      } catch (e) {
        console.warn('Mongo put job-config error:', e.message);
        return res.status(500).json({ error: e.message });
      }
    }
    return res.json({ success: true, data: payload });
  }
  return res.status(405).json({ error: 'Method not allowed' });
});

// --- APPLICATIONS ROUTES ---
app.get(['/api/applications', '/applications'], async (req, res) => {
  try {
    const db = await getDb();
    const apps = await db.collection('applications').find({}).sort({ createdAt: -1 }).toArray();
    return res.json(apps);
  } catch (e) {
    console.warn('Mongo get applications error:', e.message);
    return res.json([]);
  }
});

app.post(['/api/applications', '/applications'], async (req, res) => {
  try {
    const payload = req.body || {};
    const db = await getDb();
    const doc = {
      ...payload,
      createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
      updatedAt: new Date(),
      status: payload.status || 'PENDING'
    };
    const result = await db.collection('applications').insertOne(doc);
    return res.json({ success: true, id: result.insertedId, data: doc });
  } catch (e) {
    console.warn('Mongo post application error:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

app.put(['/api/applications/:id', '/applications/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};
    const db = await getDb();
    let filter = {};
    try { filter = { _id: new ObjectId(id) }; } catch(e) { filter = { id }; }

    delete payload._id;
    await db.collection('applications').updateOne(filter, { $set: { ...payload, updatedAt: new Date() } });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.delete(['/api/applications/:id', '/applications/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    let filter = {};
    try { filter = { _id: new ObjectId(id) }; } catch(e) { filter = { id }; }

    await db.collection('applications').deleteOne(filter);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Fallback handler for all other /api routes
app.all('*', (req, res) => {
  return res.json({ status: 'ok', time: new Date() });
});

module.exports = (req, res) => {
  return app(req, res);
};
