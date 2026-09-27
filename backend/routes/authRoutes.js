const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const OtpVerification = require('../models/OtpVerification');
const AadhaarOtpVerification = require('../models/AadhaarOtpVerification');
const { sendOtpEmail } = require('../utils/emailService');
const { hashAadhaar, findDemoAadhaar } = require('../utils/demoAadhaarRegistry');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_nearfix2026';

// Email validation helper (max 254 chars, valid format)
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && email.trim().length <= 254 && emailRegex.test(email.trim());
};

// Full Name validation helper: min 2, max 60, letters, spaces, common punctuation, not all numbers
const isValidName = (name) => {
  if (typeof name !== 'string') return false;
  const clean = name.trim().replace(/\s+/g, ' ');
  if (clean.length < 2 || clean.length > 60) return false;
  // allow letters, spaces, hyphens, apostrophes, and periods
  const nameRegex = /^[a-zA-Z\s.'-]+$/;
  return nameRegex.test(clean);
};

// Indian 10-digit mobile number: starts with 6, 7, 8, or 9
const isValidIndianPhone = (phone) => {
  if (typeof phone !== 'string') return false;
  const digits = phone.replace(/\D/g, '');
  return /^[6-9][0-9]{9}$/.test(digits);
};

// Password Complexity: min 8, max 72, uppercase, lowercase, number, special char
const isValidPassword = (password) => {
  if (typeof password !== 'string') return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[@$!%*?&#^()_\-+={}[\]|:;"'<>,.~`]/.test(password);
  const hasValidLength = password.length >= 8 && password.length <= 72;
  return hasValidLength && hasUpper && hasLower && hasNumber && hasSpecial;
};

// ==========================================
// MOCK AADHAAR VERIFICATION ENDPOINTS (WORKER)
// ==========================================

// @route   POST /api/auth/worker/aadhaar/send-otp
// @desc    Validate 12-digit demo Aadhaar, check registry, generate and hash 6-digit mock OTP
router.post('/worker/aadhaar/send-otp', async (req, res) => {
  try {
    const { aadhaarNumber } = req.body;

    if (!aadhaarNumber) {
      return res.status(400).json({ message: 'Aadhaar number is required.' });
    }

    const normalizedAadhaar = aadhaarNumber.toString().replace(/\s+/g, '').trim();

    // 1. Format validation: exactly 12 numeric digits
    if (!/^[0-9]{12}$/.test(normalizedAadhaar)) {
      return res.status(400).json({ message: 'Enter a valid 12-digit Aadhaar number.' });
    }

    const aadhaarHash = hashAadhaar(normalizedAadhaar);

    // 2. Check if this Aadhaar is already registered to an existing worker
    const existingWorker = await User.findOne({ 'aadhaarVerification.aadhaarHash': aadhaarHash });
    if (existingWorker) {
      return res.status(400).json({
        message: 'This Aadhaar number is already linked to an existing registered service provider account.'
      });
    }

    // 3. Look up in Demo Aadhaar Registry
    const demoRecord = findDemoAadhaar(aadhaarHash);
    if (!demoRecord) {
      return res.status(400).json({
        message: 'Aadhaar not found in mock demo registry. For the academic prototype, please use a demo Aadhaar number (e.g. 1111 2222 3333, 4444 5555 6666, 9999 8888 7777, or 1234 1234 1234).'
      });
    }

    // 4. Rate-limiting: Prevent rapid repeated OTP requests within cooldown window (45 seconds)
    const latestOtp = await AadhaarOtpVerification.findOne({ aadhaarHash }).sort({ createdAt: -1 });
    if (latestOtp) {
      const secondsElapsed = (Date.now() - new Date(latestOtp.createdAt).getTime()) / 1000;
      if (secondsElapsed < 45) {
        const waitSeconds = Math.ceil(45 - secondsElapsed);
        return res.status(429).json({
          message: `Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before requesting a new Aadhaar code.`
        });
      }
    }

    // 5. Generate secure 6-digit OTP using crypto.randomInt
    const otp = crypto.randomInt(100000, 1000000).toString();

    // 6. Hash OTP before storing
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);

    // 7. Expire after 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 8. Clean up prior unverified attempts for this Aadhaar and save new record
    await AadhaarOtpVerification.deleteMany({ aadhaarHash });
    await AadhaarOtpVerification.create({
      aadhaarHash,
      phoneLast4: demoRecord.phone.slice(-4),
      otpHash,
      expiresAt,
      attempts: 0
    });

    const maskedPhone = `******${demoRecord.phone.slice(-4)}`;

    // In local development / academic demo, log the OTP to the console
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n========================================`);
      console.log(`[NearFix MOCK AADHAAR OTP SERVICE]`);
      console.log(`Simulated Aadhaar: ${normalizedAadhaar.slice(0, 4)} XXXX ${normalizedAadhaar.slice(-4)}`);
      console.log(`Linked Phone: ${maskedPhone} (${demoRecord.name})`);
      console.log(`6-Digit Aadhaar OTP: ${otp}`);
      console.log(`Notice: Identity verification is simulated for the academic prototype.`);
      console.log(`========================================\n`);
    }

    return res.json({
      message: `Verification code sent to demo Aadhaar-linked mobile number ending in ${demoRecord.phone.slice(-4)}.`,
      maskedPhone,
      demoOtp: (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEMO_OTP === 'true') ? otp : undefined
    });

  } catch (err) {
    console.error('worker/aadhaar/send-otp error:', err);
    return res.status(500).json({ message: 'Server error while dispatching Aadhaar verification code.' });
  }
});

// @route   POST /api/auth/worker/aadhaar/verify-otp
// @desc    Verify mock Aadhaar OTP and issue 10-minute aadhaarVerificationToken
router.post('/worker/aadhaar/verify-otp', async (req, res) => {
  try {
    const { aadhaarNumber, otp } = req.body;

    if (!aadhaarNumber || !otp) {
      return res.status(400).json({ message: 'Aadhaar number and 6-digit verification code are required.' });
    }

    const normalizedAadhaar = aadhaarNumber.toString().replace(/\s+/g, '').trim();
    const aadhaarHash = hashAadhaar(normalizedAadhaar);
    const cleanOtp = otp.toString().trim();

    // Find active unexpired record
    const record = await AadhaarOtpVerification.findOne({
      aadhaarHash,
      expiresAt: { $gt: new Date() }
    });

    if (!record) {
      return res.status(400).json({
        message: 'Aadhaar verification code has expired or was not requested. Please request a new code.'
      });
    }

    // Max 5 attempts
    if (record.attempts >= 5) {
      await AadhaarOtpVerification.deleteOne({ _id: record._id });
      return res.status(400).json({
        message: 'Too many failed attempts. This verification code has been invalidated. Please request a new code.'
      });
    }

    // Compare with hashed OTP
    const isMatch = await bcrypt.compare(cleanOtp, record.otpHash);

    if (!isMatch) {
      record.attempts += 1;
      await record.save();

      if (record.attempts >= 5) {
        await AadhaarOtpVerification.deleteOne({ _id: record._id });
        return res.status(400).json({
          message: 'Too many failed attempts. Verification code has been invalidated. Please request a new code.'
        });
      }

      const remainingAttempts = 5 - record.attempts;
      return res.status(400).json({
        message: `Invalid Aadhaar verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`
      });
    }

    // Delete temporary OTP record to prevent reuse
    await AadhaarOtpVerification.deleteOne({ _id: record._id });

    // Issue short-lived signed JWT aadhaarVerificationToken (10 minutes)
    const aadhaarVerificationToken = jwt.sign(
      {
        aadhaarHash,
        aadhaarLast4: normalizedAadhaar.slice(-4),
        purpose: 'AADHAAR_VERIFIED'
      },
      JWT_SECRET,
      { expiresIn: '10m' }
    );

    return res.json({
      message: 'Aadhaar identity verified successfully.',
      aadhaarVerificationToken,
      aadhaarLast4: normalizedAadhaar.slice(-4)
    });

  } catch (err) {
    console.error('worker/aadhaar/verify-otp error:', err);
    return res.status(500).json({ message: 'Server error during Aadhaar verification.' });
  }
});

// ==========================================
// EMAIL OTP VERIFICATION ENDPOINTS
// ==========================================

// @route   POST /api/auth/send-register-otp
// @desc    Validate email, generate 6-digit OTP, hash and store, then send via Nodemailer
router.post('/send-register-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Ensure email is not already registered
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists. Please sign in instead.' });
    }

    // Rate-limiting: Prevent repeated OTP requests within cooldown window (45 seconds)
    const latestOtp = await OtpVerification.findOne({
      email: normalizedEmail,
      purpose: 'REGISTER'
    }).sort({ createdAt: -1 });

    if (latestOtp) {
      const secondsElapsed = (Date.now() - new Date(latestOtp.createdAt).getTime()) / 1000;
      if (secondsElapsed < 45) {
        const waitSeconds = Math.ceil(45 - secondsElapsed);
        return res.status(429).json({
          message: `Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before requesting a new code.`
        });
      }
    }

    // Generate secure 6-digit OTP using crypto.randomInt
    const otp = crypto.randomInt(100000, 1000000).toString();

    // Hash OTP before storing
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);

    // OTP expires after 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Clean up previous registration OTPs for this email and store new record
    await OtpVerification.deleteMany({ email: normalizedEmail, purpose: 'REGISTER' });
    await OtpVerification.create({
      email: normalizedEmail,
      otpHash,
      purpose: 'REGISTER',
      expiresAt,
      attempts: 0
    });

    // Send OTP via Nodemailer
    await sendOtpEmail(normalizedEmail, otp);

    return res.json({
      message: 'Verification code sent to your email. The code is valid for 5 minutes.',
      demoOtp: (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEMO_OTP === 'true') ? otp : undefined
    });

  } catch (err) {
    console.error('send-register-otp error:', err);
    return res.status(500).json({
      message: 'Failed to send verification email. Please verify your email address or try again later.'
    });
  }
});

// @route   POST /api/auth/verify-register-otp
// @desc    Verify 6-digit OTP, enforce attempt limits, and return 10-minute emailVerificationToken
router.post('/verify-register-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and 6-digit verification code are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    // Find active unexpired OTP record
    const record = await OtpVerification.findOne({
      email: normalizedEmail,
      purpose: 'REGISTER',
      expiresAt: { $gt: new Date() }
    });

    if (!record) {
      return res.status(400).json({
        message: 'Verification code has expired or was not requested. Please request a new code.'
      });
    }

    // Check failed attempt limit (max 5)
    if (record.attempts >= 5) {
      await OtpVerification.deleteOne({ _id: record._id });
      return res.status(400).json({
        message: 'Too many failed attempts. This code has been invalidated. Please request a new code.'
      });
    }

    // Compare entered OTP with hashed OTP
    const isMatch = await bcrypt.compare(cleanOtp, record.otpHash);

    if (!isMatch) {
      record.attempts += 1;
      await record.save();

      if (record.attempts >= 5) {
        await OtpVerification.deleteOne({ _id: record._id });
        return res.status(400).json({
          message: 'Too many failed attempts. Verification code has been invalidated. Please request a new code.'
        });
      }

      const remainingAttempts = 5 - record.attempts;
      return res.status(400).json({
        message: `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`
      });
    }

    // Correct OTP: delete the OTP record immediately to prevent reuse
    await OtpVerification.deleteOne({ _id: record._id });

    // Generate short-lived emailVerificationToken (10 minutes)
    const emailVerificationToken = jwt.sign(
      { email: normalizedEmail, purpose: 'EMAIL_VERIFIED' },
      JWT_SECRET,
      { expiresIn: '10m' }
    );

    return res.json({
      message: 'Email verified successfully.',
      emailVerificationToken
    });

  } catch (err) {
    console.error('verify-register-otp error:', err);
    return res.status(500).json({ message: 'Server error during OTP verification.' });
  }
});

// ==========================================
// REGISTRATION ENDPOINT (CUSTOMER & WORKER)
// ==========================================

// @route   POST /api/auth/register
// @desc    Register user with cryptographic verification token enforcement & strict validation
router.post('/register', async (req, res) => {
  try {
    const { 
      emailVerificationToken,
      aadhaarVerificationToken,
      name, email, password, role, phone, address, location, 
      category, skill, title, skills, hourlyRate, experienceYears, serviceRadius, availabilityHours 
    } = req.body;

    // 1. Role restriction: Public registration strictly permits 'customer' or 'worker'
    const targetRole = role || 'customer';
    if (targetRole !== 'customer' && targetRole !== 'worker') {
      return res.status(400).json({
        message: 'Access denied: Only customer and service provider accounts can be created through public registration.'
      });
    }

    // 2. Email validation
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: 'A valid email address is required (maximum 254 characters).' });
    }
    const normalizedEmail = email.trim().toLowerCase();

    // 3. Name validation
    if (!isValidName(name)) {
      return res.status(400).json({
        message: 'Full Name must be between 2 and 60 characters and contain valid letters and punctuation.'
      });
    }
    const cleanName = name.trim().replace(/\s+/g, ' ');

    // 4. Password validation (8-72 chars, upper, lower, number, special char)
    if (!isValidPassword(password)) {
      return res.status(400).json({
        message: 'Password must be between 8 and 72 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
      });
    }

    // 5. Verify emailVerificationToken
    if (!emailVerificationToken) {
      return res.status(400).json({
        message: 'Email verification is required before creating an account. Please verify with OTP first.'
      });
    }

    let decodedEmailToken;
    try {
      decodedEmailToken = jwt.verify(emailVerificationToken, JWT_SECRET);
    } catch (tokenErr) {
      if (tokenErr.name === 'TokenExpiredError') {
        return res.status(400).json({
          message: 'Email verification token has expired. Please verify your email again.'
        });
      }
      return res.status(400).json({
        message: 'Invalid or forged email verification token. Please verify your email again.'
      });
    }

    if (!decodedEmailToken || decodedEmailToken.email !== normalizedEmail) {
      return res.status(400).json({
        message: 'Email verification token does not match the registration email.'
      });
    }

    if (decodedEmailToken.purpose !== 'EMAIL_VERIFIED') {
      return res.status(400).json({
        message: 'Invalid email verification token purpose.'
      });
    }

    // 6. Ensure user does not already exist
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    // 7. Worker-Specific Validations & Aadhaar Verification Enforcement
    let aadhaarData = {
      verified: false,
      aadhaarLast4: '',
      aadhaarHash: ''
    };

    let cleanPhone = (phone || '').replace(/\D/g, '');
    let cleanAddress = (address || (typeof location === 'string' ? location : '')).trim();

    if (targetRole === 'worker') {
      // Validate Phone
      if (!isValidIndianPhone(phone)) {
        return res.status(400).json({
          message: 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'
        });
      }

      // Validate Address / Location
      if (!cleanAddress || cleanAddress.length < 5 || cleanAddress.length > 200) {
        return res.status(400).json({
          message: 'Location / Address must be between 5 and 200 characters.'
        });
      }

      // Mandatory Aadhaar Verification Token Check
      if (!aadhaarVerificationToken) {
        return res.status(400).json({
          message: 'Aadhaar identity verification is required for service provider registration. Please complete Step 2.'
        });
      }

      let decodedAadhaarToken;
      try {
        decodedAadhaarToken = jwt.verify(aadhaarVerificationToken, JWT_SECRET);
      } catch (aadhaarErr) {
        if (aadhaarErr.name === 'TokenExpiredError') {
          return res.status(400).json({
            message: 'Aadhaar verification session has expired. Please verify your Aadhaar again.'
          });
        }
        return res.status(400).json({
          message: 'Invalid or forged Aadhaar verification token.'
        });
      }

      if (!decodedAadhaarToken || decodedAadhaarToken.purpose !== 'AADHAAR_VERIFIED' || !decodedAadhaarToken.aadhaarHash) {
        return res.status(400).json({
          message: 'Invalid Aadhaar verification credentials.'
        });
      }

      // Check if Aadhaar is already linked to another worker
      const duplicateAadhaar = await User.findOne({
        'aadhaarVerification.aadhaarHash': decodedAadhaarToken.aadhaarHash
      });
      if (duplicateAadhaar) {
        return res.status(400).json({
          message: 'This Aadhaar number is already linked to an existing account.'
        });
      }

      aadhaarData = {
        verified: true,
        aadhaarLast4: decodedAadhaarToken.aadhaarLast4 || '',
        aadhaarHash: decodedAadhaarToken.aadhaarHash,
        verifiedAt: new Date()
      };
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userAddress = cleanAddress || 'Kozhikode, Kerala';
    const userLocation = typeof location === 'object' && location?.coordinates ? location : { type: 'Point', coordinates: [75.7804, 11.2588] };

    // Format skills array
    let workerSkills = [];
    if (Array.isArray(skills) && skills.length > 0) {
      workerSkills = skills;
    } else if (skill) {
      workerSkills = [skill.trim()];
    } else if (category) {
      workerSkills = [category.trim()];
    }

    // 8. Create User (Identity is verified; Professional platform KYC remains 'Pending' for admin review)
    const user = new User({
      name: cleanName,
      email: normalizedEmail,
      password: hashedPassword,
      role: targetRole,
      phone: cleanPhone,
      address: userAddress,
      location: userLocation,
      title: title || (workerSkills.length > 0 ? workerSkills[0] : (targetRole === 'worker' ? 'Professional Service Provider' : undefined)),
      skills: workerSkills,
      hourlyRate: hourlyRate || 500,
      experienceYears: experienceYears || 2,
      serviceRadius: serviceRadius || '15 km',
      availabilityHours: availabilityHours || '9:00 AM - 6:00 PM',
      verificationStatus: targetRole === 'worker' ? 'Pending' : 'Verified',
      verified: targetRole === 'customer',
      accountStatus: 'Active',
      aadhaarVerification: aadhaarData
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
        location: user.location,
        aadhaarVerified: user.aadhaarVerification?.verified || false,
        aadhaarLast4: user.aadhaarVerification?.aadhaarLast4 || ''
      } 
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// ==========================================
// LOGIN ENDPOINT (PRESERVED)
// ==========================================

// @route   POST /api/auth/login
// @desc    Authenticate user & get token with strict role matching when specified
router.post('/login', async (req, res) => {
  try {
    const { email, password, role, expectedRole } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    if (user.accountStatus === 'Suspended') {
      return res.status(403).json({ message: 'Your account has been suspended by an administrator. Please contact support.' });
    }

    // Role-based separation check: if portal specifies required role, enforce matching
    const targetRole = role || expectedRole;
    if (targetRole && targetRole !== user.role) {
      if (targetRole === 'worker' && user.role === 'customer') {
        return res.status(403).json({
          message: 'Access denied: This account is registered as a Customer. Please sign in via the Customer login page.'
        });
      } else if (targetRole === 'customer' && user.role === 'worker') {
        return res.status(403).json({
          message: 'Access denied: This account is registered as a Service Provider. Please sign in via the Worker login page.'
        });
      } else if (targetRole === 'admin') {
        return res.status(403).json({
          message: 'Access denied: This account does not possess administrator privileges.'
        });
      } else if (user.role === 'admin') {
        return res.status(403).json({
          message: 'Access denied: This account is an Administrator. Please access via the Admin console.'
        });
      } else {
        return res.status(403).json({
          message: `Access denied: Account role (${user.role}) does not have permission to access the ${targetRole} portal.`
        });
      }
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
        location: user.location,
        aadhaarVerified: user.aadhaarVerification?.verified || false,
        aadhaarLast4: user.aadhaarVerification?.aadhaarLast4 || ''
      } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server Error during login' });
  }
});

module.exports = router;
