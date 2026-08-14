const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  name: String,
  slots: String
}, { _id: false });

const positionSchema = new mongoose.Schema({
  department: String,
  section: String,
  sections: [sectionSchema], // Updated to use object schema
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
