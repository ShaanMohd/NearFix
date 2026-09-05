const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  role: {
    type: String,
    enum: ['customer', 'worker', 'admin'],
    required: true
  },

  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  password: {
    type: String,
    required: true
  },

  phone: {
    type: String,
    default: ''
  },

  address: {
    type: String,
    default: ''
  },

  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: undefined
    }
  },

  avatar: {
    type: String,
    default: ''
  },

  // Worker-Specific Fields

  title: {
    type: String,
    trim: true,
    default: ''
  },

  bio: {
    type: String,
    default: '',
    maxlength: 1000
  },

  skills: [{
    type: String,
    trim: true
  }],

  serviceMode: {
    type: String,
    enum: ['Home Service', 'Fixed Location', 'Both'],
    default: 'Home Service'
  },

  businessName: {
    type: String,
    default: ''
  },

  businessAddress: {
    type: String,
    default: ''
  },

  businessLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: undefined
    }
  },

  pricingType: {
    type: String,
    enum: [
      'Hourly',
      'Fixed',
      'Per Visit',
      'Per Session',
      'Per Project',
      'Custom'
    ],
    default: 'Custom'
  },

  startingPrice: {
    type: Number,
    default: 0,
    min: 0
  },

  isAvailable: {
    type: Boolean,
    default: true
  },

  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  reviewsCount: {
    type: Number,
    default: 0,
    min: 0
  },

  verified: {
    type: Boolean,
    default: false
  },

  verificationStatus: {
    type: String,
    enum: [
      'Not Submitted',
      'Pending',
      'Verified',
      'Rejected',
      'Suspended'
    ],
    default: 'Not Submitted'
  },

  accountStatus: {
    type: String,
    enum: ['Active', 'Suspended'],
    default: 'Active'
  },

  experienceYears: {
    type: Number,
    default: 0,
    min: 0
  },

  serviceRadius: {
    type: Number,
    default: 10,
    min: 0
  },

  availabilityHours: {
    type: String,
    default: ''
  },

  documents: {
    identityProof: {
      type: String,
      default: ''
    },
    addressProof: {
      type: String,
      default: ''
    },
    skillCertificate: {
      type: String,
      default: ''
    },
    experienceProof: {
      type: String,
      default: ''
    }
  },

  rejectionReason: {
    type: String,
    default: ''
  },

  busySlots: [{
    date: String,
    time: String
  }]

}, {
  timestamps: true
});

UserSchema.index({ location: '2dsphere' });
UserSchema.index({ businessLocation: '2dsphere' });

UserSchema.pre('init', function (doc) {
  if (doc && typeof doc.location === 'string') {
    doc.address = doc.address || doc.location;
    doc.location = undefined;
  }
});

module.exports = mongoose.model('User', UserSchema);