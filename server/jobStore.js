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
  await connectDB();
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    throw new Error('MongoDB not connected');
  }
  return mongoose.connection.db.collection('jobconfigs');
}

async function readPublicJobs() {
  const col = await jobsCollection();
  const doc = await col.findOne({ _syncKey: SYNC_KEY });
  return normalize(doc);
}

async function writePublicJobs(payload) {
  const col = await jobsCollection();
  const $set = {
    _syncKey: SYNC_KEY,
    positions: JSON.parse(JSON.stringify(payload.positions || [])),
    requiredDocs: Array.isArray(payload.requiredDocs) ? payload.requiredDocs : [],
    applicantRequirements: Array.isArray(payload.applicantRequirements) ? payload.applicantRequirements : [],
    updatedAt: new Date()
  };
  await col.updateOne({ _syncKey: SYNC_KEY }, { $set }, { upsert: true });
  return normalize($set);
}

module.exports = { readPublicJobs, writePublicJobs, normalize };
