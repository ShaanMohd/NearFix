const mongoose = require('mongoose');

const JobRequestSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceType: { type: String, required: true },
  description: { type: String },
  date: { type: String, default: 'Today' },
  time: { type: String, default: 'ASAP' },
  location: { type: String, default: 'Customer Location' },
  status: { 
    type: String, 
    enum: ['Pending', 'Accepted', 'Rejected', 'Completed', 'Cancelled'], 
    default: 'Pending' 
  },
  isEmergency: { type: Boolean, default: false },
  serviceCharge: { type: Number, default: 500 },
  emergencyCharge: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 500 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('JobRequest', JobRequestSchema);
