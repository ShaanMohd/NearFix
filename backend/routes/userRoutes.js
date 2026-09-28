const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');

// Setup avatar storage directory
const avatarUploadDir = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(avatarUploadDir)) {
  fs.mkdirSync(avatarUploadDir, { recursive: true });
}

// Multer disk storage setup for avatars
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  }
});

// MIME type validator (JPG, JPEG, PNG, WebP)
const avatarFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG and WebP images are allowed.'), false);
  }
};

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max limit
  }
});

// Middleware for avatar upload with clean error messages
const handleAvatarUpload = (req, res, next) => {
  const uploadSingle = avatarUpload.single('avatar');
  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Profile image must be smaller than 5 MB.' });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

function isValidPassword(password) {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8 || password.length > 72) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);
  return hasUpper && hasLower && hasNumber && hasSpecial;
}

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

    const rawWorkers = await User.find(query).select('-password');
    const now = new Date();
    const workers = rawWorkers.map(w => {
      const wObj = w.toObject();
      if (wObj.unavailableUntil && new Date(wObj.unavailableUntil) <= now) {
        wObj.isAvailable = true;
      }
      return wObj;
    });
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
    const userObj = user.toObject();
    if (userObj.unavailableUntil && new Date(userObj.unavailableUntil) <= new Date()) {
      userObj.isAvailable = true;
    }
    res.json(userObj);
  } catch (err) {
    console.error('Error fetching user profile:', err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Helper validation functions
function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 60) return false;
  if (/^\d+$/.test(trimmed)) return false;
  return /^[a-zA-Z\s.'-]+$/.test(trimmed);
}

function isValidIndianPhone(phone) {
  if (!phone) return false;
  const digits = phone.toString().replace(/\D/g, '');
  return /^[6-9][0-9]{9}$/.test(digits);
}

function isValidCoordinate(lng, lat) {
  if (typeof lng !== 'number' || typeof lat !== 'number') return false;
  if (isNaN(lng) || isNaN(lat)) return false;
  return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
}

// @route   PUT /api/users/profile
// @desc    Update logged-in user's profile with strict whitelisting & validation
router.put('/profile', auth, async (req, res) => {
  try {
    const { 
      name, phone, title, bio, skills, experienceYears, serviceRadius, 
      serviceMode, pricingType, startingPrice, hourlyRate, businessName, 
      address, location, currentLocation, avatar, isAvailable, unavailableUntil,
      availabilityHours, documents 
    } = req.body;
    
    const profileFields = {};

    // 1. Name validation (2-60 chars)
    if (name !== undefined) {
      if (!isValidName(name)) {
        return res.status(400).json({ 
          message: 'Full Name must be between 2 and 60 characters and contain valid letters and punctuation.' 
        });
      }
      profileFields.name = name.trim().replace(/\s+/g, ' ');
    }

    // 2. Phone validation (10 digits starting with 6-9)
    if (phone !== undefined && phone !== '') {
      if (!isValidIndianPhone(phone)) {
        return res.status(400).json({ 
          message: 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.' 
        });
      }
      profileFields.phone = phone.toString().replace(/\D/g, '');
    }

    // 3. Worker Title (2-80 chars)
    if (title !== undefined) {
      const cleanTitle = title.trim();
      if (cleanTitle.length > 0 && (cleanTitle.length < 2 || cleanTitle.length > 80)) {
        return res.status(400).json({ 
          message: 'Worker Title must be between 2 and 80 characters.' 
        });
      }
      profileFields.title = cleanTitle;
    }

    // 4. Bio / About (max 1000 chars)
    if (bio !== undefined) {
      if (typeof bio === 'string' && bio.length > 1000) {
        return res.status(400).json({ 
          message: 'Bio / About section cannot exceed 1000 characters.' 
        });
      }
      profileFields.bio = typeof bio === 'string' ? bio.trim() : '';
    }

    // 5. Skills / Services (array or comma-separated string)
    if (skills !== undefined) {
      let parsedSkills = [];
      if (Array.isArray(skills)) {
        parsedSkills = skills.map(s => String(s).trim()).filter(Boolean);
      } else if (typeof skills === 'string') {
        parsedSkills = skills.split(',').map(s => s.trim()).filter(Boolean);
      }
      profileFields.skills = parsedSkills;
    }

    // 6. Experience Years (number >= 0)
    if (experienceYears !== undefined) {
      const exp = Number(experienceYears);
      if (isNaN(exp) || exp < 0 || exp > 70) {
        return res.status(400).json({ 
          message: 'Years of Experience must be a positive number (0 to 70).' 
        });
      }
      profileFields.experienceYears = exp;
    }

    // 7. Service Radius (1-100 km)
    if (serviceRadius !== undefined) {
      let radNumeric = typeof serviceRadius === 'number' ? serviceRadius : parseInt(serviceRadius, 10);
      if (isNaN(radNumeric) || radNumeric < 1 || radNumeric > 100) {
        return res.status(400).json({ 
          message: 'Service Radius must be between 1 km and 100 km.' 
        });
      }
      profileFields.serviceRadius = `${radNumeric} km`;
    }

    // 8. Service Mode ('Home Service' | 'Fixed Location' | 'Both')
    if (serviceMode !== undefined) {
      const validModes = ['Home Service', 'Fixed Location', 'Both'];
      if (!validModes.includes(serviceMode)) {
        return res.status(400).json({ 
          message: 'Service Mode must be "Home Service", "Fixed Location", or "Both".' 
        });
      }
      profileFields.serviceMode = serviceMode;
    }

    // 9. Pricing Type ('Hourly' | 'Fixed' | 'Per Visit' | 'Per Session' | 'Per Project' | 'Custom')
    if (pricingType !== undefined) {
      const validTypes = ['Hourly', 'Fixed', 'Per Visit', 'Per Session', 'Per Project', 'Custom'];
      if (!validTypes.includes(pricingType)) {
        return res.status(400).json({ 
          message: 'Invalid Pricing Type selected.' 
        });
      }
      profileFields.pricingType = pricingType;
    }

    // 10. Starting Price / Hourly Rate (number >= 0)
    if (startingPrice !== undefined || hourlyRate !== undefined) {
      const priceVal = Number(startingPrice !== undefined ? startingPrice : hourlyRate);
      if (isNaN(priceVal) || priceVal < 0) {
        return res.status(400).json({ 
          message: 'Starting Price must be a valid non-negative number.' 
        });
      }
      profileFields.startingPrice = priceVal;
      profileFields.hourlyRate = priceVal; // Keep backward-compatible hourlyRate in sync
    }

    // 11. Business Name (max 100 chars)
    if (businessName !== undefined) {
      profileFields.businessName = String(businessName).trim().slice(0, 100);
    }

    // 12. Address (max 200 chars)
    if (address !== undefined) {
      const cleanAddress = String(address).trim();
      if (cleanAddress.length > 200) {
        return res.status(400).json({ 
          message: 'Service Address cannot exceed 200 characters.' 
        });
      }
      profileFields.address = cleanAddress;
    }

    // 13. Normal Base Service Location (User.location: GeoJSON Point [longitude, latitude])
    if (location !== undefined) {
      if (location === null) {
        profileFields.location = undefined;
      } else if (location.coordinates && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
        const lng = Number(location.coordinates[0]);
        const lat = Number(location.coordinates[1]);
        if (!isValidCoordinate(lng, lat)) {
          return res.status(400).json({ 
            message: 'Invalid location coordinates: Longitude must be between -180 and 180, Latitude between -90 and 90.' 
          });
        }
        profileFields.location = {
          type: 'Point',
          coordinates: [lng, lat]
        };
      }
    }

    // 14. Current Location (User.currentLocation: GeoJSON Point [longitude, latitude] + updatedAt)
    if (currentLocation !== undefined) {
      if (currentLocation === null) {
        profileFields.currentLocation = undefined;
      } else if (currentLocation.coordinates && Array.isArray(currentLocation.coordinates) && currentLocation.coordinates.length === 2) {
        const lng = Number(currentLocation.coordinates[0]);
        const lat = Number(currentLocation.coordinates[1]);
        if (!isValidCoordinate(lng, lat)) {
          return res.status(400).json({ 
            message: 'Invalid current location coordinates: Longitude must be between -180 and 180, Latitude between -90 and 90.' 
          });
        }
        profileFields.currentLocation = {
          type: 'Point',
          coordinates: [lng, lat],
          updatedAt: new Date()
        };
      }
    }

    // 15. Other permissible worker fields
    if (avatar !== undefined) profileFields.avatar = avatar;
    if (availabilityHours !== undefined) profileFields.availabilityHours = availabilityHours;

    // Manage flexible worker availability and unavailableUntil
    if (isAvailable !== undefined) {
      profileFields.isAvailable = Boolean(isAvailable);
      if (profileFields.isAvailable) {
        profileFields.unavailableUntil = null;
      }
    }

    if (unavailableUntil !== undefined) {
      if (unavailableUntil) {
        const uDate = new Date(unavailableUntil);
        if (isNaN(uDate.getTime())) {
          return res.status(400).json({ message: 'Invalid unavailableUntil date format.' });
        }
        if (uDate <= new Date()) {
          return res.status(400).json({ message: 'Unavailable until time must be in the future.' });
        }
        profileFields.unavailableUntil = uDate;
        profileFields.isAvailable = false;
      } else {
        profileFields.unavailableUntil = null;
      }
    }

    // Preserve existing KYC documents submission
    if (documents) {
      profileFields.documents = documents;
      profileFields.verificationStatus = 'Pending';
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: profileFields },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    res.json(updatedUser);
  } catch (err) {
    console.error('Error updating profile:', err.message);
    res.status(500).json({ message: 'Server Error updating profile: ' + err.message });
  }
});

// @route   PUT /api/users/current-location
// @desc    Update worker's real-time current physical location
router.put('/current-location', auth, async (req, res) => {
  try {
    let { coordinates, latitude, longitude, lat, lng } = req.body;

    let finalLng, finalLat;

    if (Array.isArray(coordinates) && coordinates.length === 2) {
      // MongoDB GeoJSON order: [longitude, latitude]
      finalLng = Number(coordinates[0]);
      finalLat = Number(coordinates[1]);
    } else if (latitude !== undefined && longitude !== undefined) {
      finalLng = Number(longitude);
      finalLat = Number(latitude);
    } else if (lat !== undefined && lng !== undefined) {
      finalLng = Number(lng);
      finalLat = Number(lat);
    } else {
      return res.status(400).json({ 
        message: 'Please provide valid coordinates as [longitude, latitude] or { latitude, longitude }.' 
      });
    }

    if (!isValidCoordinate(finalLng, finalLat)) {
      return res.status(400).json({ 
        message: 'Invalid coordinates: Longitude must be between -180 and 180, Latitude between -90 and 90.' 
      });
    }

    const currentLocation = {
      type: 'Point',
      coordinates: [finalLng, finalLat],
      updatedAt: new Date()
    };

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { currentLocation } },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    res.json({
      message: 'Current physical location updated successfully.',
      currentLocation: user.currentLocation
    });
  } catch (err) {
    console.error('Error updating current location:', err.message);
    res.status(500).json({ message: 'Server Error updating current location.' });
  }
});

// @route   PUT /api/users/me/avatar
// @route   POST /api/users/me/avatar
// @desc    Upload profile picture (JPG, PNG, WebP up to 5MB) for logged-in user
const avatarHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please select an image file (JPG, PNG, or WebP) to upload.' });
    }

    const relativePath = `/uploads/avatars/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { avatar: relativePath } },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    res.json({
      message: 'Profile picture updated successfully.',
      avatar: user.avatar,
      avatarUrl: `http://localhost:5000${user.avatar}`,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('Error in avatar upload handler:', err);
    res.status(500).json({ message: 'Server Error while uploading profile picture.' });
  }
};

router.put('/me/avatar', auth, handleAvatarUpload, avatarHandler);
router.post('/me/avatar', auth, handleAvatarUpload, avatarHandler);

// @route   PUT /api/users/me/password
// @desc    Update password for authenticated user (customer, worker, admin)
router.put('/me/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required.' });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password do not match.' });
    }

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({
        message: 'Password must be between 8 and 72 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ message: 'Server error while updating password.' });
  }
});

module.exports = router;
