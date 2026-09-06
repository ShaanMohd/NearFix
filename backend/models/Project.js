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
    trim: true,
    default: '',
    maxlength: 1500
  },

  category: {
    type: String,
    required: true,
    trim: true
  },

  mediaType: {
    type: String,
    enum: ['image', 'video'],
    default: 'image'
  },

  videoUrl: {
    type: String,
    default: ''
  },

  videoDuration: {
    type: String,
    default: ''
  },

  projectType: {
    type: String,
    enum: ['Completed Work', 'Before & After', 'New Installation', 'Installation', 'Repair', 'Maintenance', 'Other'],
    default: 'Completed Work'
  },

  beforeImage: {
    type: String,
    default: ''
  },

  afterImage: {
    type: String,
    default: ''
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