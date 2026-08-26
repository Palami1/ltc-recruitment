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
    return null;
  }
}

module.exports = async (req, res) => {
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
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e){}
  }

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

  return res.status(200).json({ status: 'ok' });
};
