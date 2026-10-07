const mongoose = require('mongoose');
const { connectDB } = require('./db');
const Application = require('./models/Application');

async function getApplications(filter = {}) {
  await connectDB();
  return await Application.find(filter).sort({ submittedAt: -1, createdAt: -1 }).lean();
}

async function saveApplication(appRecord) {
  await connectDB();
  const { id } = appRecord;
  return await Application.findOneAndUpdate(
    { id },
    { $set: appRecord },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function getApplicationById(id) {
  await connectDB();
  return await Application.findOne({ $or: [{ id }, { refCode: id }] }).lean();
}

module.exports = {
  getApplications,
  saveApplication,
  getApplicationById
};
