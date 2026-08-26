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

const DEFAULT_CLOUD_MONGO_URI = 'mongodb+srv://palamiphomaly_db_user:Valo58787788@cluster0.fjzhauz.mongodb.net/ltc_recruitment?retryWrites=true&w=majority';

async function getDb() {
  if (cachedDb) return cachedDb;
  try {
    const mongo = require('mongodb');
    const client = new mongo.MongoClient(process.env.MONGODB_URI || DEFAULT_CLOUD_MONGO_URI, {
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

module.exports = async (req, res) => {
  try {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-admin-token'
    );

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const url = req.url || '';

    // Parse JSON body safely
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e){}
    }

    // --- AUTH LOGIN ---
    if (url.includes('/auth/login')) {
      const { password } = body || {};
      if (password === 'Valo58787788' || password === 'valo58787788') {
        return res.status(200).json({ token: 'valo58787788', success: true });
      }
      return res.status(401).json({ error: 'Invalid password' });
    }

    // --- JOB CONFIG ---
    if (url.includes('/job-config')) {
      if (req.method === 'GET') {
        const db = await getDb().catch(() => null);
        if (db) {
          try {
            const docs = await db.collection('jobconfigs').find({}).sort({ updatedAt: -1 }).limit(1).toArray();
            if (docs.length > 0 && Array.isArray(docs[0].positions) && docs[0].positions.length > 0) {
              memoryJobConfig = docs[0];
              return res.status(200).json(docs[0]);
            }
          } catch (e) {}
        }
        return res.status(200).json(memoryJobConfig);
      }

      if (req.method === 'POST' || req.method === 'PUT') {
        if (body && Array.isArray(body.positions)) {
          memoryJobConfig = body;
          const db = await getDb().catch(() => null);
          if (db) {
            try {
              const col = db.collection('jobconfigs');
              await col.deleteMany({});
              await col.insertOne({
                positions: body.positions || [],
                requiredDocs: body.requiredDocs || [],
                applicantRequirements: body.applicantRequirements || [],
                updatedAt: new Date()
              });
            } catch (e) {}
          }
        }
        return res.status(200).json({ success: true, data: memoryJobConfig });
      }
    }

    // --- APPLICATIONS ---
    if (url.includes('/applications')) {
      if (req.method === 'GET') {
        const db = await getDb().catch(() => null);
        if (db) {
          try {
            const apps = await db.collection('applications').find({}).sort({ createdAt: -1 }).toArray();
            if (Array.isArray(apps)) {
              memoryApplications = apps;
              return res.status(200).json(apps);
            }
          } catch (e) {}
        }
        return res.status(200).json(memoryApplications);
      }

      if (req.method === 'POST') {
        const doc = {
          ...(body || {}),
          _id: String(Date.now()),
          createdAt: (body && body.createdAt) ? new Date(body.createdAt) : new Date(),
          updatedAt: new Date(),
          status: (body && body.status) || 'PENDING'
        };
        memoryApplications.unshift(doc);

        const db = await getDb().catch(() => null);
        if (db) {
          try {
            await db.collection('applications').insertOne(doc);
          } catch (e) {}
        }
        return res.status(200).json({ success: true, id: doc._id, data: doc });
      }

      if (req.method === 'PUT') {
        const parts = url.split('/');
        const id = parts[parts.length - 1];

        memoryApplications = memoryApplications.map(a => (a._id === id || a.id === id) ? { ...a, ...(body || {}) } : a);

        const db = await getDb().catch(() => null);
        if (db) {
          try {
            const mongo = require('mongodb');
            let filter = {};
            try { filter = { _id: new mongo.ObjectId(id) }; } catch(e) { filter = { id }; }
            const updateDoc = { ...(body || {}) };
            delete updateDoc._id;
            await db.collection('applications').updateOne(filter, { $set: { ...updateDoc, updatedAt: new Date() } });
          } catch (e) {}
        }
        return res.status(200).json({ success: true });
      }

      if (req.method === 'DELETE') {
        const parts = url.split('/');
        const id = parts[parts.length - 1];

        memoryApplications = memoryApplications.filter(a => a._id !== id && a.id !== id);

        const db = await getDb().catch(() => null);
        if (db) {
          try {
            const mongo = require('mongodb');
            let filter = {};
            try { filter = { _id: new mongo.ObjectId(id) }; } catch(e) { filter = { id }; }
            await db.collection('applications').deleteOne(filter);
          } catch (e) {}
        }
        return res.status(200).json({ success: true });
      }
    }

    return res.status(200).json({ status: 'ok', time: new Date() });
  } catch (err) {
    return res.status(200).json({ success: true, fallback: true, positions: memoryJobConfig.positions });
  }
};
