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
    required: true
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

  customerLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number]
    }
  },

  status: {
    type: String,
    enum: [
      'Pending',
      'Accepted',
      'On The Way',
      'Arrived',
      'In Progress',
      'Completed',
      'Rejected',
      'Cancelled'
    ],
    default: 'Pending'
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