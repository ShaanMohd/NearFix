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
    required: true
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
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: [Number]
  },

  status: {
    type: String,
    enum: [
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
    default: 0
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

module.exports = mongoose.model('JobRequest', JobRequestSchema);