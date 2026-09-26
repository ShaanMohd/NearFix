const mongoose = require('mongoose');

const AadhaarOtpVerificationSchema = new mongoose.Schema({
  aadhaarHash: {
    type: String,
    required: true,
    index: true
  },
  phoneLast4: {
    type: String,
    default: ''
  },
  otpHash: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  attempts: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// TTL index to automatically purge expired Aadhaar OTP records
AadhaarOtpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AadhaarOtpVerification', AadhaarOtpVerificationSchema);
