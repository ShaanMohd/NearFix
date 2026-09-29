const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  type: {
    type: String,
    enum: [
      'BOOKING_REQUEST',
      'NORMAL_BOOKING_REQUEST',
      'EMERGENCY_BOOKING_REQUEST',
      'BOOKING_ACCEPTED',
      'BOOKING_REJECTED',
      'EMERGENCY_ACCEPTED_PENDING_CONFIRMATION',
      'EMERGENCY_CONFIRMED',
      'BOOKING_RESCHEDULE_PROPOSED',
      'WORKER_ON_THE_WAY',
      'WORKER_ARRIVED',
      'SERVICE_STARTED',
      'SERVICE_COMPLETED',
      'BOOKING_CANCELLED',
      'QUOTATION_SUBMITTED',
      'QUOTATION_APPROVED',
      'QUOTATION_DECLINED',
      'SYSTEM'
    ],
    required: true
  },

  message: {
    type: String,
    required: true
  },

  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobRequest'
  },

  isRead: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', NotificationSchema);