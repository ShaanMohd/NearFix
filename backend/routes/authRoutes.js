const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'nearfix_secret_key_2026';

// @route   POST /api/auth/register
// @desc    Register a new user (Customer or Worker)
router.post('/register', async (req, res) => {
  try {
    const { 
      name, email, password, role, phone, address, location, 
      title, skills, hourlyRate, experienceYears, serviceRadius, availabilityHours 
    } = req.body;
    
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists with this email' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userAddress = address || (typeof location === 'string' ? location : 'Kozhikode, Kerala');
    const userLocation = typeof location === 'object' && location?.coordinates ? location : { type: 'Point', coordinates: [75.7804, 11.2588] };

    user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'customer',
      phone: phone || '',
      address: userAddress,
      location: userLocation,
      title: title || (role === 'worker' ? 'Professional Worker' : undefined),
      skills: skills || [],
      hourlyRate: hourlyRate || 500,
      experienceYears: experienceYears || 2,
      serviceRadius: serviceRadius || '15 km',
      availabilityHours: availabilityHours || '9:00 AM - 6:00 PM',
      verificationStatus: role === 'worker' ? 'Pending' : 'Verified',
      verified: role === 'customer'
    });

    await user.save();

    const payload = { userId: user._id, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ 
      token, 
      user: { 
        id: user._id, 
        _id: user._id,
        name: user.name, 
        email: user.email, 
        role: user.role, 
        avatar: user.avatar,
        verificationStatus: user.verificationStatus,
        verified: user.verified,
        address: user.address,
        location: user.location
      } 
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server Error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    if (user.accountStatus === 'Suspended') {
      return res.status(403).json({ message: 'Your account has been suspended by an administrator. Please contact support.' });
    }

    const payload = { userId: user._id, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        _id: user._id,
        name: user.name, 
        email: user.email, 
        role: user.role, 
        avatar: user.avatar,
        verificationStatus: user.verificationStatus,
        verified: user.verified,
        skills: user.skills,
        hourlyRate: user.hourlyRate,
        address: user.address,
        location: user.location
      } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server Error during login' });
  }
});

module.exports = router;
