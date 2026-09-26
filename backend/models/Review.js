const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
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

  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },

  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  }

}, {
  timestamps: true
});

// One completed booking can only be reviewed once
ReviewSchema.index(
  { bookingId: 1 },
  { unique: true }
);

module.exports = mongoose.model('Review', ReviewSchema);