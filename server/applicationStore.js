const mongoose = require('mongoose');
const { connectDB } = require('./db');

async function applicationsCollection() {
  try { await connectDB(); } catch (e) {}
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    await new Promise(r => setTimeout(r, 2000));
    await connectDB().catch(() => {});
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      return null;
    }
  }
  return mongoose.connection.db.collection('applications');
}

async function getApplications(filter = {}) {
  const col = await applicationsCollection();
  if (!col) return null;
  const docs = await col.find(filter).sort({ submittedAt: -1 }).toArray();
  return docs || [];
}

async function saveApplication(appRecord) {
  const col = await applicationsCollection();
  if (!col) return null;
  const { id, ...rest } = appRecord;
  await col.updateOne({ id }, { $set: appRecord }, { upsert: true });
  return appRecord;
}

async function getApplicationById(id) {
  const col = await applicationsCollection();
  if (!col) return null;
  return await col.findOne({ $or: [{ id }, { refCode: id }] });
}

module.exports = {
  applicationsCollection,
  getApplications,
  saveApplication,
  getApplicationById
};
