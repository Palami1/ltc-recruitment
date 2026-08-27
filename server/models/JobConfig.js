const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  name: String,
  slots: String,
  requirements: [String],
  responsibilities: [String]
}, { _id: false });

const positionSchema = new mongoose.Schema({
  id: String,
  department: String,
  branch: String,
  title: String,
  section: String,
  sections: [sectionSchema],
  code: String,
  slots: mongoose.Schema.Types.Mixed,
  requirements: [String],
  deadline: String,
  expirationDate: String
}, { _id: false });

const jobConfigSchema = new mongoose.Schema({
  positions: [positionSchema],
  requiredDocs: [String],
  applicantRequirements: [String]
}, {
  timestamps: true
});

module.exports = mongoose.model('JobConfig', jobConfigSchema);

