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
      enum: ['Point']
    },
    coordinates: {
      type: [Number]
    }
  },

  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: undefined
    },
    updatedAt: {
      type: Date
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
      enum: ['Point']
    },
    coordinates: {
      type: [Number]
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

  minimumCharge: {
    type: Number,
    default: 0,
    min: 0
  },

  isAvailable: {
    type: Boolean,
    default: true
  },

  unavailableUntil: {
    type: Date,
    default: null
  },

  emergencyOptIn: {
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
    type: String,
    default: '15 km'
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
  }],

  aadhaarVerification: {
    verified: {
      type: Boolean,
      default: false
    },
    aadhaarLast4: {
      type: String,
      default: ''
    },
    aadhaarHash: {
      type: String,
      default: ''
    },
    verifiedAt: {
      type: Date
    }
  }

}, {
  timestamps: true
});

UserSchema.index({ location: '2dsphere' }, { sparse: true });
UserSchema.index({ businessLocation: '2dsphere' }, { sparse: true });
UserSchema.index({ currentLocation: '2dsphere' }, { sparse: true });

UserSchema.pre('save', function () {
  if (this.businessLocation && (!this.businessLocation.coordinates || this.businessLocation.coordinates.length !== 2)) {
    this.businessLocation = undefined;
  }
  if (this.location && (!this.location.coordinates || this.location.coordinates.length !== 2)) {
    this.location = undefined;
  }
  if (this.currentLocation && (!this.currentLocation.coordinates || this.currentLocation.coordinates.length !== 2)) {
    this.currentLocation = undefined;
  }
});

UserSchema.pre('init', function (doc) {
  if (doc && typeof doc.location === 'string') {
    doc.address = doc.address || doc.location;
    doc.location = undefined;
  }
});

module.exports = mongoose.model('User', UserSchema);