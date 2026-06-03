const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  name: String,
  url: String
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  name: String,
  position: String,
  phone: String,
  pdfUrl: String,
  attachments: [attachmentSchema],
  formData: { type: mongoose.Schema.Types.Mixed } // Stores the raw form object
}, {
  timestamps: true
});

module.exports = mongoose.model('Application', applicationSchema);
