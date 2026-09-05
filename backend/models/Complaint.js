const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobRequest' },
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
  description: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Open', 'Under Review', 'Resolved'], 
    default: 'Open' 
  },
  evidence: [{ type: String }],
  resolutionNotes: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Complaint', ComplaintSchema);
