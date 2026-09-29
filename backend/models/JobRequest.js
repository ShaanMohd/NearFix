const mongoose = require('mongoose');

const JobRequestSchema = new mongoose.Schema({

  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  serviceType: {
    type: String,
    required: true
  },

  serviceMode: {
    type: String,
    enum: ['Home Service', 'Visit Provider'],
    default: 'Home Service'
  },

  description: {
    type: String,
    default: ''
  },

  date: {
    type: String,
    default: 'Today'
  },

  time: {
    type: String,
    default: 'ASAP'
  },

  location: {
    type: String,
    default: ''
  },

  serviceAddress: {
    type: String,
    default: ''
  },

  customerLocation: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: [Number]
  },

  status: {
    type: String,
    enum: [
      'Open',
      'Pending',
      'Accepted',
      'EmergencyAcceptedPendingCustomer',
      'RescheduleProposed',
      'On The Way',
      'Arrived',
      'In Progress',
      'Completed',
      'Rejected',
      'Cancelled',
      'Expired'
    ],
    default: 'Pending'
  },

  bookingType: {
    type: String,
    enum: ['normal', 'emergency'],
    default: 'normal'
  },

  preferredDateTime: {
    type: Date
  },

  scheduledDateTime: {
    type: Date
  },

  estimatedDuration: {
    type: Number,
    default: 60 // in minutes
  },

  estimatedArrivalTime: {
    type: String,
    default: ''
  },

  expiresAt: {
    type: Date
  },

  // Progressive Radius & Public Emergency Dispatch Fields
  broadcastRadius: {
    type: Number,
    default: 2000 // In meters: 2000 (2km), 5000 (5km), 10000 (10km)
  },

  notifiedWorkerIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  searchExpiresAt: {
    type: Date
  },

  claimedAt: {
    type: Date
  },

  confirmationExpiresAt: {
    type: Date
  },

  proposedAlternative: {
    dateTime: { type: Date },
    date: { type: String },
    time: { type: String },
    estimatedDuration: { type: Number, default: 60 },
    note: { type: String, default: '' }
  },

  isEmergency: {
    type: Boolean,
    default: false
  },

  emergencySurchargePercent: {
    type: Number,
    default: null
  },

  customerAcceptedSurcharge: {
    type: Boolean,
    default: false
  },

  laborCharge: {
    type: Number,
    default: null
  },

  materialCost: {
    type: Number,
    default: 0
  },

  serviceCharge: {
    type: Number,
    default: 0
  },

  emergencyCharge: {
    type: Number,
    default: 0
  },

  totalAmount: {
    type: Number,
    default: null
  },

  quotationStatus: {
    type: String,
    enum: ['Pending', 'Submitted', 'Approved', 'Declined'],
    default: 'Pending'
  },

  quotationSubmittedAt: {
    type: Date
  },

  quotationApprovedAt: {
    type: Date
  },

  workerNote: {
    type: String,
    default: ''
  },

  completedAt: {
    type: Date
  }

}, {
  timestamps: true
});

JobRequestSchema.index({ customerLocation: '2dsphere' }, { sparse: true });
JobRequestSchema.index({ status: 1, isEmergency: 1 });

module.exports = mongoose.model('JobRequest', JobRequestSchema);