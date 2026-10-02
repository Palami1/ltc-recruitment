const mongoose = require('mongoose');

const jobConfigSchema = new mongoose.Schema({
  _syncKey: { type: String, default: 'ltc-public-jobs', unique: true, index: true },
  positions: mongoose.Schema.Types.Mixed,
  requiredDocs: [String],
  applicantRequirements: mongoose.Schema.Types.Mixed
}, {
  timestamps: true,
  strict: false,
  collection: 'jobconfigs'
});

module.exports = mongoose.models.JobConfig || mongoose.model('JobConfig', jobConfigSchema);

