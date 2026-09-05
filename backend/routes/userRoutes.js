const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');

// @route   GET /api/users/workers
// @desc    Get verified active workers for customer discovery/map
router.get('/workers', async (req, res) => {
  try {
    const { category, search, verifiedOnly } = req.query;
    let query = { 
      role: 'worker', 
      accountStatus: { $ne: 'Suspended' }
    };

    if (verifiedOnly === 'true' || verifiedOnly === undefined) {
      query.verificationStatus = 'Verified';
    }

    if (category && category !== 'All') {
      const catRegex = new RegExp(category, 'i');
      query.$or = [
        { skills: { $in: [category, catRegex] } },
        { title: catRegex }
      ];
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    const workers = await User.find(query).select('-password');
    res.json(workers);
  } catch (err) {
    console.error('Error fetching workers:', err.message);
    res.status(500).json({ message: 'Server Error fetching workers' });
  }
});

// @route   GET /api/users/profile/:id
// @desc    Get user profile by ID
router.get('/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Error fetching user profile:', err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update logged-in user's profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { 
      name, phone, address, location, avatar, title, skills, hourlyRate, 
      isAvailable, experienceYears, serviceRadius, availabilityHours, documents 
    } = req.body;
    
    const profileFields = {};
    if (name !== undefined) profileFields.name = name;
    if (phone !== undefined) profileFields.phone = phone;
    if (address !== undefined) profileFields.address = address;
    if (location !== undefined) profileFields.location = location;
    if (avatar !== undefined) profileFields.avatar = avatar;
    if (title !== undefined) profileFields.title = title;
    if (skills !== undefined) profileFields.skills = skills;
    if (hourlyRate !== undefined) profileFields.hourlyRate = hourlyRate;
    if (isAvailable !== undefined) profileFields.isAvailable = isAvailable;
    if (experienceYears !== undefined) profileFields.experienceYears = experienceYears;
    if (serviceRadius !== undefined) profileFields.serviceRadius = serviceRadius;
    if (availabilityHours !== undefined) profileFields.availabilityHours = availabilityHours;

    if (documents) {
      profileFields.documents = documents;
      // If user is submitting KYC documents, update verification status to Pending
      profileFields.verificationStatus = 'Pending';
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: profileFields },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    console.error('Error updating profile:', err.message);
    res.status(500).json({ message: 'Server Error updating profile' });
  }
});

module.exports = router;
