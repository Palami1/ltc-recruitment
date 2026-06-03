const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  department: String,
  code: String,
  slots: Number,
  requirements: [String],
  deadline: String
}, { _id: false });

const jobConfigSchema = new mongoose.Schema({
  positions: [positionSchema],
  requiredDocs: [String],
  applicantRequirements: [String]
}, {
  timestamps: true
});

module.exports = mongoose.model('JobConfig', jobConfigSchema);
