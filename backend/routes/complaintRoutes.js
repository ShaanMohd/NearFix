const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const JobRequest = require('../models/JobRequest');
const auth = require('../middleware/authMiddleware');

// @route   POST /api/complaints
// @desc    Submit a complaint
router.post('/', auth, async (req, res) => {
  try {
    const { workerId, bookingId, category, description, evidence } = req.body;

    if (!category || !description) {
      return res.status(400).json({ message: 'Category and description are required' });
    }

    const complaint = new Complaint({
      customerId: req.user.userId,
      workerId,
      bookingId,
      category,
      description,
      evidence: evidence || [],
      status: 'Open'
    });

    await complaint.save();

    const populated = await Complaint.findById(complaint._id)
      .populate('workerId', 'name title avatar')
      .populate('bookingId');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Error creating complaint:', err.message);
    res.status(500).json({ message: 'Server Error creating complaint' });
  }
});

// @route   GET /api/complaints/my
// @desc    Get customer's submitted complaints
router.get('/my', auth, async (req, res) => {
  try {
    const complaints = await Complaint.find({ customerId: req.user.userId })
      .populate('workerId', 'name title avatar')
      .populate('bookingId')
      .sort({ createdAt: -1 });

    res.json(complaints);
  } catch (err) {
    console.error('Error fetching my complaints:', err.message);
    res.status(500).json({ message: 'Server Error fetching complaints' });
  }
});

module.exports = router;
