const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobRequest',
    required: true
  },

  category: {
    type: String,
    enum: [
      'Worker did not arrive',
      'Poor service',
      'Misconduct',
      'Inappropriate behaviour',
      'Overcharging',
      'Property damage',
      'Other'
    ],
    required: true
  },

  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },

  status: {
    type: String,
    enum: ['Open', 'Under Review', 'Resolved'],
    default: 'Open'
  },

  evidence: [{
    type: String
  }],

  resolutionNotes: {
    type: String,
    default: '',
    trim: true
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('Complaint', ComplaintSchema);