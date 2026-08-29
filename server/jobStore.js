const { MongoClient } = require('mongodb');

const DEFAULT_URI = 'mongodb+srv://palamiphomaly_db_user:Valo58787788@cluster0.fjzhauz.mongodb.net/ltc_recruitment?retryWrites=true&w=majority';
const DOC_ID = 'public';

function mongoUri() {
  const uri = process.env.MONGODB_URI;
  if (typeof uri === 'string' && (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'))) {
    return uri;
  }
  return DEFAULT_URI;
}

function dbNameFromUri(uri) {
  try {
    const pathPart = uri.split('?')[0].split('/').pop();
    if (pathPart && pathPart !== 'mongodb.net') return pathPart;
  } catch (_) {}
  return 'ltc_recruitment';
}

function getGlobal() {
  if (!global.__ltcJobMongo) {
    global.__ltcJobMongo = { client: null, connecting: null };
  }
  return global.__ltcJobMongo;
}

async function getCollection() {
  const g = getGlobal();
  if (g.client) {
    return g.client.db(dbNameFromUri(mongoUri())).collection('public_jobs');
  }
  if (!g.connecting) {
    g.connecting = MongoClient.connect(mongoUri(), {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    }).then((client) => {
      g.client = client;
      g.connecting = null;
      return client;
    }).catch((err) => {
      g.connecting = null;
      throw err;
    });
  }
  const client = await g.connecting;
  return client.db(dbNameFromUri(mongoUri())).collection('public_jobs');
}

function normalize(raw) {
  if (!raw || !Array.isArray(raw.positions)) return null;
  return {
    positions: raw.positions,
    requiredDocs: raw.requiredDocs || ['ໃບສະໝັກ Form 20', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.'],
    applicantRequirements: raw.applicantRequirements || []
  };
}

async function readPublicJobs() {
  const col = await getCollection();
  const doc = await col.findOne({ _id: DOC_ID });
  return normalize(doc);
}

async function writePublicJobs(payload) {
  const doc = {
    _id: DOC_ID,
    positions: JSON.parse(JSON.stringify(payload.positions || [])),
    requiredDocs: Array.isArray(payload.requiredDocs) ? payload.requiredDocs : [],
    applicantRequirements: Array.isArray(payload.applicantRequirements) ? payload.applicantRequirements : [],
    updatedAt: new Date()
  };
  const col = await getCollection();
  await col.replaceOne({ _id: DOC_ID }, doc, { upsert: true });
  return normalize(doc);
}

module.exports = { readPublicJobs, writePublicJobs, normalize };
