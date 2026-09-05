const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  role: { type: String, enum: ['customer', 'worker', 'admin'], required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  address: { type: String, default: '' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: undefined }
  },
  avatar: { type: String, default: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=100&h=100' },

  // Worker-Specific Fields
  title: { type: String }, // e.g., 'Senior Electrician'
  skills: [{ type: String }],
  hourlyRate: { type: Number, default: 500 },
  isAvailable: { type: Boolean, default: true },
  rating: { type: Number, default: 4.8 },
  reviewsCount: { type: Number, default: 12 },
  verified: { type: Boolean, default: false },
  verificationStatus: { 
    type: String, 
    enum: ['Pending', 'Verified', 'Rejected', 'Suspended'], 
    default: 'Pending' 
  },
  accountStatus: {
    type: String,
    enum: ['Active', 'Suspended'],
    default: 'Active'
  },
  experienceYears: { type: Number, default: 3 },
  serviceRadius: { type: String, default: '15 km' },
  availabilityHours: { type: String, default: '9:00 AM - 6:00 PM' },
  documents: {
    identityProof: { type: String },
    addressProof: { type: String },
    skillCertificate: { type: String },
    experienceProof: { type: String }
  },
  rejectionReason: { type: String },
  busySlots: [{
    date: { type: String },
    time: { type: String }
  }],

  createdAt: { type: Date, default: Date.now }
});

UserSchema.index({ location: '2dsphere' });

UserSchema.pre('init', function(doc) {
  if (doc && typeof doc.location === 'string') {
    doc.address = doc.address || doc.location;
    doc.location = undefined;
  }
});

module.exports = mongoose.model('User', UserSchema);
