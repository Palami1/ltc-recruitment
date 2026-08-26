let memoryJobConfig = {
  positions: [
    { id: '88', department: 'ແຂວງສະຫວັນນະເຂດ', branch: 'ແຂວງສະຫວັນນະເຂດ', title: 'ວິຊາການໄອທີ (IT)', code: '88', slots: '1', requirements: [], deadline: '' },
    { id: '99', department: 'ແຂວງບໍລິຄຳໄຊ', branch: 'ແຂວງບໍລິຄຳໄຊ', title: 'ວິຊາການເຕັກນິກ (DEV-TEST)', code: '99', slots: '1', requirements: [], deadline: '' },
    { id: '100', department: 'ແຂວງຄຳມ່ວນ', branch: 'ແຂວງຄຳມ່ວນ', title: 'ພະນັກງານບໍລິການ (KHM)', code: '100', slots: '1', requirements: [], deadline: '' }
  ],
  requiredDocs: ['ໃບສະໝັກວຽກ', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.']
};

let cachedDb = null;

async function getDb() {
  if (cachedDb) return cachedDb;
  try {
    const mongo = await import('mongodb');
    const client = new mongo.MongoClient(process.env.MONGODB_URI || 'mongodb+srv://palamiphomaly_db_user:Valo58787788@cluster0.fjzhauz.mongodb.net/ltc_recruitment?retryWrites=true&w=majority', {
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

module.exports = async function handler(req, res) {
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
    if (req.method === 'GET') {
      const db = await getDb().catch(() => null);
      if (db) {
        try {
          const docs = await db.collection('jobconfigs').find({}).sort({ updatedAt: -1 }).limit(1).toArray();
          if (docs.length > 0 && Array.isArray(docs[0].positions) && docs[0].positions.length > 0) {
            memoryJobConfig = docs[0];
          }
        } catch (e) {}
      }
    } else if (req.method === 'POST' || req.method === 'PUT') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e){}
      }
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
    }
  } catch (err) {}

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(memoryJobConfig));
};
