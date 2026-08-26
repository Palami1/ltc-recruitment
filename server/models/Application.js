const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  name: String,
  url: String
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  refCode: { type: String },
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'PENDING' }, // 'PENDING' | 'REVIEWING' | 'INTERVIEW' | 'APPROVED' | 'REJECTED'
  name: String,
  position: String,
  phone: String,
  email: String,
  pdfUrl: String,
  attachments: [attachmentSchema],
  formData: { type: mongoose.Schema.Types.Mixed }, // Stores the raw form object
  notes: { type: String, default: '' },
  interview: { type: mongoose.Schema.Types.Mixed },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  hrNotes: { type: String, default: '' },   // Internal HR review notes
  rating: { type: Number, default: 0 }       // HR star rating 1-5
}, {
  timestamps: true
});

module.exports = mongoose.model('Application', applicationSchema);
