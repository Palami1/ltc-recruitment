const { MongoClient } = require('mongodb');

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

  try {
    const db = await getDb();
    const col = db.collection('jobconfigs');

    if (req.method === 'GET') {
      const docs = await col.find({}).sort({ updatedAt: -1 }).limit(1).toArray();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      if (docs.length > 0) {
        return res.end(JSON.stringify(docs[0]));
      } else {
        return res.end(JSON.stringify({
          positions: [
            { department: 'ແຂວງສະຫວັນນະເຂດ', branch: 'ແຂວງສະຫວັນນະເຂດ', code: 'SVK', slots: '1', requirements: [], deadline: '' },
            { department: 'ແຂວງບໍລິຄຳໄຊ', branch: 'ແຂວງບໍລິຄຳໄຊ', code: 'BLK', slots: '1', requirements: [], deadline: '' },
            { department: 'ແຂວງຄຳມ່ວນ', branch: 'ແຂວງຄຳມ່ວນ', code: 'KHM', slots: '1', requirements: [], deadline: '' }
          ],
          requiredDocs: ['ໃບສະໝັກວຽກ', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.']
        }));
      }
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e){}
      }
      if (body && Array.isArray(body.positions)) {
        await col.deleteMany({});
        const docToInsert = {
          positions: body.positions || [],
          requiredDocs: body.requiredDocs || [],
          applicantRequirements: body.applicantRequirements || [],
          updatedAt: new Date()
        };
        await col.insertOne(docToInsert);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: true, data: docToInsert }));
      }
    }
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: err.message }));
  }
};
