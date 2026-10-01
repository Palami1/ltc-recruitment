const mongoose = require('mongoose');
const { connectDB } = require('./db');

const SYNC_KEY = 'ltc-public-jobs';

function normalize(raw) {
  if (!raw || !Array.isArray(raw.positions)) return null;
  return {
    positions: raw.positions,
    requiredDocs: raw.requiredDocs || ['ໃບສະໝັກ Form 20', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.'],
    applicantRequirements: raw.applicantRequirements || []
  };
}

async function jobsCollection() {
  try { await connectDB(); } catch (e) {}
  if (mongoose.connection && mongoose.connection.readyState === 1 && mongoose.connection.db) {
    return mongoose.connection.db.collection('jobconfigs');
  }
  return null;
}

async function readPublicJobs() {
  try {
    await connectDB();
    const col = await jobsCollection();
    if (!col) return null;
    const doc = await col.findOne({ _syncKey: SYNC_KEY });
    if (doc) return normalize(doc);

    const latest = await col.findOne({}, { sort: { updatedAt: -1 } });
    return normalize(latest);
  } catch (err) {
    console.warn('[readPublicJobs error]:', err.message);
    return null;
  }
}

async function writePublicJobs(payload) {
  try {
    await connectDB();
    const col = await jobsCollection();
    if (!col) return null;
    const $set = {
      _syncKey: SYNC_KEY,
      positions: JSON.parse(JSON.stringify(payload.positions || [])),
      requiredDocs: Array.isArray(payload.requiredDocs) ? payload.requiredDocs : [],
      applicantRequirements: Array.isArray(payload.applicantRequirements) ? payload.applicantRequirements : [],
      updatedAt: new Date()
    };
    await col.updateOne({ _syncKey: SYNC_KEY }, { $set }, { upsert: true });
    return normalize($set);
  } catch (err) {
    console.warn('[writePublicJobs error]:', err.message);
    return null;
  }
}

module.exports = { readPublicJobs, writePublicJobs, normalize };