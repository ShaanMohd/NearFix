const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  title: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1500
  },

  category: {
    type: String,
    required: true,
    trim: true
  },

  images: [{
    type: String
  }],

  imageUrl: {
    type: String,
    default: ''
  },

  location: {
    type: String,
    default: ''
  },

  completedAt: {
    type: Date
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('Project', ProjectSchema);