const { MongoClient, ObjectId } = require('mongodb');

const DEFAULT_CLOUD_MONGO_URI = 'mongodb+srv://palamiphomaly_db_user:Valo58787788@cluster0.fjzhauz.mongodb.net/ltc_recruitment?retryWrites=true&w=majority';

let cachedClient = null;

async function getDb() {
  if (cachedClient && cachedClient.topology && cachedClient.topology.isConnected()) {
    return cachedClient.db('ltc_recruitment');
  }
  const client = new MongoClient(process.env.MONGODB_URI || DEFAULT_CLOUD_MONGO_URI, {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000
  });
  await client.connect();
  cachedClient = client;
  return client.db('ltc_recruitment');
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
    res.statusCode = 200;
    return res.end();
  }

  const url = req.url || '';
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e){}
  }

  try {
    const db = await getDb();
    const col = db.collection('applications');

    if (req.method === 'GET') {
      const apps = await col.find({}).sort({ createdAt: -1 }).toArray();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(apps));
    }

    if (req.method === 'POST') {
      const doc = {
        ...(body || {}),
        createdAt: (body && body.createdAt) ? new Date(body.createdAt) : new Date(),
        updatedAt: new Date(),
        status: (body && body.status) || 'PENDING'
      };
      const result = await col.insertOne(doc);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: true, id: result.insertedId, data: doc }));
    }

    if (req.method === 'PUT') {
      const parts = url.split('/');
      const id = parts[parts.length - 1];
      let filter = {};
      try { filter = { _id: new ObjectId(id) }; } catch(e) { filter = { _id: id }; }
      const updateDoc = { ...(body || {}) };
      delete updateDoc._id;
      await col.updateOne(filter, { $set: { ...updateDoc, updatedAt: new Date() } });
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: true }));
    }

    if (req.method === 'DELETE') {
      const parts = url.split('/');
      const id = parts[parts.length - 1];
      let filter = {};
      try { filter = { _id: new ObjectId(id) }; } catch(e) { filter = { _id: id }; }
      await col.deleteOne(filter);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: true }));
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ status: 'ok' }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: err.message }));
  }
};
