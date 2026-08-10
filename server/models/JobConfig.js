const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  department: String,
  section: String,
  sections: [String],
  code: String,
  slots: String,
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
