const mongoose = require('mongoose');
const { connectDB } = require('./db');
const Application = require('./models/Application');

async function applicationsCollection() {
  try { await connectDB(); } catch (e) {}
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    return mongoose.connection.db.collection('applications');
  }
  return null;
}

async function getApplications(filter = {}) {
  try {
    await connectDB();
    const docs = await Application.find(filter).sort({ submittedAt: -1, createdAt: -1 }).lean();
    return docs;
  } catch (err) {
    console.warn('[getApplications] MongoDB query failed:', err.message);
    const col = await applicationsCollection();
    if (col) {
      return await col.find(filter).sort({ submittedAt: -1 }).toArray().catch(() => null);
    }
    return null;
  }
}

async function saveApplication(appRecord) {
  try {
    await connectDB();
    const { id } = appRecord;
    await Application.findOneAndUpdate(
      { id },
      { $set: appRecord },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return appRecord;
  } catch (err) {
    console.warn('[saveApplication] Application.findOneAndUpdate failed:', err.message);
    const col = await applicationsCollection();
    if (col) {
      await col.updateOne({ id: appRecord.id }, { $set: appRecord }, { upsert: true }).catch(() => null);
    }
    return appRecord;
  }
}

async function getApplicationById(id) {
  try {
    await connectDB();
    const doc = await Application.findOne({ $or: [{ id }, { refCode: id }] }).lean();
    if (doc) return doc;
  } catch (err) {
    console.warn('[getApplicationById] Application.findOne failed:', err.message);
  }
  const col = await applicationsCollection();
  if (col) {
    return await col.findOne({ $or: [{ id }, { refCode: id }] }).catch(() => null);
  }
  return null;
}

module.exports = {
  applicationsCollection,
  getApplications,
  saveApplication,
  getApplicationById
};

