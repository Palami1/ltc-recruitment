const mongoose = require('mongoose');
const { connectDB } = require('./db');

const SYNC_KEY = 'ltc-public-jobs';

const JobConfigSchema = new mongoose.Schema({
  _syncKey: { type: String, default: SYNC_KEY, unique: true, index: true },
  positions: { type: Array, default: [] },
  requiredDocs: { type: Array, default: [] },
  applicantRequirements: { type: Array, default: [] },
  updatedAt: { type: Date, default: Date.now }
}, { strict: false, timestamps: true });

const JobConfig = mongoose.models.JobConfig || mongoose.model('JobConfig', JobConfigSchema);

function normalize(raw) {
  if (!raw || !Array.isArray(raw.positions)) return null;
  return {
    positions: raw.positions,
    requiredDocs: raw.requiredDocs || ['ໃບສະໝັກ Form 20', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.'],
    applicantRequirements: raw.applicantRequirements || []
  };
}

async function readPublicJobs() {
  try {
    await connectDB();
    const doc = await JobConfig.findOne({ _syncKey: SYNC_KEY }).lean();
    if (doc) return normalize(doc);

    const latest = await JobConfig.findOne({}).sort({ updatedAt: -1 }).lean();
    if (latest) return normalize(latest);
    return null;
  } catch (err) {
    console.warn('[readPublicJobs error]:', err.message);
    return null;
  }
}

async function writePublicJobs(payload) {
  try {
    await connectDB();
    const cleanPositions = Array.isArray(payload.positions) ? JSON.parse(JSON.stringify(payload.positions)) : [];
    const updateData = {
      _syncKey: SYNC_KEY,
      positions: cleanPositions,
      requiredDocs: Array.isArray(payload.requiredDocs) ? payload.requiredDocs : ['ໃບສະໝັກ Form 20', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.'],
      applicantRequirements: Array.isArray(payload.applicantRequirements) ? payload.applicantRequirements : [],
      updatedAt: new Date()
    };
    const saved = await JobConfig.findOneAndUpdate(
      { _syncKey: SYNC_KEY },
      { $set: updateData },
      { upsert: true, new: true, setDefaultsOnInsert: true, lean: true }
    );
    return normalize(saved || updateData);
  } catch (err) {
    console.warn('[writePublicJobs error]:', err.message);
    return null;
  }
}

module.exports = { readPublicJobs, writePublicJobs, normalize };