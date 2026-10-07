const mongoose = require('mongoose');

const loginAttemptSchema = new mongoose.Schema({
  ip: { type: String, required: true, unique: true, index: true },
  count: { type: Number, default: 0 },
  blockedUntil: { type: Date, default: null },
  updatedAt: { type: Date, default: Date.now, expires: 1800 } // TTL 30 minutes auto-clean in MongoDB Atlas
});

module.exports = mongoose.models.LoginAttempt || mongoose.model('LoginAttempt', loginAttemptSchema);
