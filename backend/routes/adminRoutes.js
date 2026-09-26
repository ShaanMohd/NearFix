const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const JobRequest = require('../models/JobRequest');
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');

// In-memory activity log store for recent admin activities
let recentActivities = [
  { id: 1, type: 'kyc_submitted', title: 'New KYC submitted', detail: 'Rahul V. applied for Electrician verification', time: '10 mins ago', icon: 'FileText' },
  { id: 2, type: 'worker_verified', title: 'Worker verified', detail: 'Elena Rodriguez approved for Painting', time: '1 hour ago', icon: 'CheckCircle' },
  { id: 3, type: 'complaint_received', title: 'Complaint received', detail: 'New ticket #CMP-1049 against Rajesh Kumar', time: '3 hours ago', icon: 'AlertTriangle' },
  { id: 4, type: 'complaint_resolved', title: 'Complaint resolved', detail: 'Ticket #CMP-1042 marked resolved', time: '5 hours ago', icon: 'ShieldCheck' }
];

function logActivity(type, title, detail, icon = 'Bell') {
  recentActivities.unshift({
    id: Date.now(),
    type,
    title,
    detail,
    time: 'Just now',
    icon
  });
  if (recentActivities.length > 20) recentActivities.pop();
}

// @route   GET /api/admin/dashboard
// @desc    Get dashboard metrics, pending queue, recent complaints, and recent activity
router.get('/dashboard', auth, admin, async (req, res) => {
  try {
    const pendingVerification = await User.countDocuments({ role: 'worker', verificationStatus: 'Pending' });
    const verifiedWorkers = await User.countDocuments({ role: 'worker', verificationStatus: 'Verified', accountStatus: { $ne: 'Suspended' } });
    const openComplaints = await Complaint.countDocuments({ status: { $in: ['Open', 'Under Review'] } });
    const suspendedWorkers = await User.countDocuments({ role: 'worker', $or: [{ accountStatus: 'Suspended' }, { verificationStatus: 'Suspended' }] });

    // Pending workers for quick table
    const pendingWorkers = await User.find({ role: 'worker', verificationStatus: 'Pending' })
      .select('name avatar skills experienceYears location createdAt verificationStatus title')
      .limit(5);

    // Recent open complaints
    const recentComplaints = await Complaint.find({ status: { $in: ['Open', 'Under Review'] } })
      .populate('customerId', 'name')
      .populate('workerId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      metrics: {
        pendingVerification,
        verifiedWorkers,
        openComplaints,
        suspendedWorkers
      },
      pendingWorkers,
      recentComplaints,
      activities: recentActivities
    });
  } catch (err) {
    console.error('Error fetching admin dashboard data:', err);
    res.status(500).json({ message: 'Server Error fetching dashboard metrics' });
  }
});

// @route   GET /api/admin/verifications
// @desc    Get worker applications filtered by status
router.get('/verifications', auth, admin, async (req, res) => {
  try {
    const { status, category, location, search } = req.query;
    const query = { role: 'worker' };

    if (status && status !== 'all') {
      query.verificationStatus = status;
    }
    if (category && category !== 'all') {
      query.skills = category;
    }
    if (location && location !== 'all') {
      query.location = { $regex: location, $options: 'i' };
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const workers = await User.find(query).sort({ createdAt: -1 });
    res.json(workers);
  } catch (err) {
    console.error('Error fetching verifications:', err);
    res.status(500).json({ message: 'Server Error fetching verifications' });
  }
});

// @route   GET /api/admin/verifications/:id
// @desc    Get single worker verification details
router.get('/verifications/:id', auth, admin, async (req, res) => {
  try {
    const worker = await User.findById(req.params.id);
    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({ message: 'Worker application not found' });
    }
    res.json(worker);
  } catch (err) {
    console.error('Error fetching verification detail:', err);
    res.status(500).json({ message: 'Server Error fetching application' });
  }
});

// @route   PUT /api/admin/verifications/:id
// @desc    Verify or Reject a worker application
router.put('/verifications/:id', auth, admin, async (req, res) => {
  try {
    const { action, reason, details } = req.body;
    const worker = await User.findById(req.params.id);
    if (!worker) return res.status(404).json({ message: 'Worker not found' });

    if (action === 'verify') {
      worker.verificationStatus = 'Verified';
      worker.verified = true;
      worker.rejectionReason = null;
      worker.rejectionDetails = null;
      await worker.save();
      logActivity('worker_verified', 'Worker verified', `${worker.name} approved for ${worker.skills?.[0] || 'service'}`, 'CheckCircle');
      return res.json({ message: 'Worker verified successfully', worker });
    }

    if (action === 'reject') {
      worker.verificationStatus = 'Rejected';
      worker.verified = false;
      worker.rejectionReason = reason || 'Eligibility not confirmed';
      worker.rejectionDetails = details || '';
      await worker.save();
      logActivity('worker_rejected', 'Application rejected', `${worker.name}'s application rejected (${reason || 'Documents unclear'})`, 'XCircle');
      return res.json({ message: 'Worker application rejected', worker });
    }

    res.status(400).json({ message: 'Invalid action specified' });
  } catch (err) {
    console.error('Error updating worker verification:', err);
    res.status(500).json({ message: 'Server Error updating verification' });
  }
});

// @route   GET /api/admin/complaints
// @desc    Get all complaints with filters
router.get('/complaints', auth, admin, async (req, res) => {
  try {
    const { status, category, search } = req.query;
    let filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }
    if (category && category !== 'all') {
      filter.category = category;
    }

    let complaints = await Complaint.find(filter)
      .populate('customerId', 'name email phone avatar')
      .populate('workerId', 'name email phone avatar skills verificationStatus accountStatus')
      .populate('bookingId')
      .sort({ createdAt: -1 });

    if (search) {
      const lower = search.toLowerCase();
      complaints = complaints.filter(c => 
        (c.customerId?.name && c.customerId.name.toLowerCase().includes(lower)) ||
        (c.workerId?.name && c.workerId.name.toLowerCase().includes(lower)) ||
        (c._id.toString().toLowerCase().includes(lower)) ||
        (c.description && c.description.toLowerCase().includes(lower))
      );
    }

    const counts = {
      open: await Complaint.countDocuments({ status: 'Open' }),
      underReview: await Complaint.countDocuments({ status: 'Under Review' }),
      resolved: await Complaint.countDocuments({ status: 'Resolved' })
    };

    res.json({ complaints, counts });
  } catch (err) {
    console.error('Error fetching complaints:', err);
    res.status(500).json({ message: 'Server Error fetching complaints' });
  }
});

// @route   GET /api/admin/complaints/:id
// @desc    Get single complaint detail with worker complaint history
router.get('/complaints/:id', auth, admin, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('customerId', 'name email phone avatar location')
      .populate('workerId', 'name email phone avatar skills verificationStatus accountStatus title successRate')
      .populate('bookingId');

    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    // Count previous complaints against this worker
    const previousComplaintCount = await Complaint.countDocuments({ 
      workerId: complaint.workerId?._id,
      _id: { $ne: complaint._id }
    });

    res.json({ complaint, previousComplaintCount });
  } catch (err) {
    console.error('Error fetching complaint detail:', err);
    res.status(500).json({ message: 'Server Error fetching complaint' });
  }
});

// @route   PUT /api/admin/complaints/:id
// @desc    Update complaint status (Under Review, Resolved)
router.put('/complaints/:id', auth, admin, async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;
    const complaint = await Complaint.findById(req.params.id).populate('workerId', 'name');
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    if (status) complaint.status = status;
    if (resolutionNotes) complaint.resolutionNotes = resolutionNotes;
    await complaint.save();

    logActivity('complaint_status', `Complaint ${status}`, `Complaint #${complaint._id.toString().slice(-4)} against ${complaint.workerId?.name || 'Worker'} marked as ${status}`, 'ShieldCheck');

    res.json({ message: 'Complaint updated successfully', complaint });
  } catch (err) {
    console.error('Error updating complaint:', err);
    res.status(500).json({ message: 'Server Error updating complaint' });
  }
});

// @route   GET /api/admin/workers
// @desc    Get all workers with safety/trust status and complaint counts
router.get('/workers', auth, admin, async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = { role: 'worker' };

    if (status && status !== 'all') {
      if (status === 'Suspended') {
        query.$or = [{ accountStatus: 'Suspended' }, { verificationStatus: 'Suspended' }];
      } else {
        query.verificationStatus = status;
        if (status === 'Verified') query.accountStatus = { $ne: 'Suspended' };
      }
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const workers = await User.find(query).sort({ createdAt: -1 });

    // Attach complaint counts for each worker
    const workersWithStats = await Promise.all(workers.map(async (w) => {
      const complaintCount = await Complaint.countDocuments({ workerId: w._id });
      const completedJobs = await JobRequest.countDocuments({ workerId: w._id, status: 'Completed' });
      return {
        ...w.toObject(),
        complaintCount,
        completedJobs
      };
    }));

    res.json(workersWithStats);
  } catch (err) {
    console.error('Error fetching workers:', err);
    res.status(500).json({ message: 'Server Error fetching workers' });
  }
});

// @route   PUT /api/admin/workers/:id/status
// @desc    Moderate worker (Suspend, Reactivate, Revoke Verification)
router.put('/workers/:id/status', auth, admin, async (req, res) => {
  try {
    const { action, reason } = req.body;
    const worker = await User.findById(req.params.id);
    if (!worker) return res.status(404).json({ message: 'Worker not found' });

    if (action === 'suspend') {
      worker.accountStatus = 'Suspended';
      worker.verificationStatus = 'Suspended';
      worker.rejectionReason = reason || 'Platform safety policy violation';
      await worker.save();
      logActivity('worker_suspended', 'Worker suspended', `${worker.name} was suspended. Reason: ${reason || 'Safety moderation'}`, 'AlertOctagon');
      return res.json({ message: 'Worker suspended successfully', worker });
    }

    if (action === 'reactivate') {
      worker.accountStatus = 'Active';
      worker.verificationStatus = 'Verified';
      worker.verified = true;
      worker.rejectionReason = null;
      await worker.save();
      logActivity('worker_reactivated', 'Worker reactivated', `${worker.name} has been reinstated to active service`, 'CheckCircle');
      return res.json({ message: 'Worker reactivated successfully', worker });
    }

    if (action === 'revoke') {
      worker.verificationStatus = 'Rejected';
      worker.verified = false;
      worker.rejectionReason = reason || 'Verification credentials revoked by administrator';
      await worker.save();
      logActivity('verification_revoked', 'Verification revoked', `Verification revoked for ${worker.name}`, 'XCircle');
      return res.json({ message: 'Worker verification revoked', worker });
    }

    res.status(400).json({ message: 'Invalid moderation action' });
  } catch (err) {
    console.error('Error moderating worker:', err);
    res.status(500).json({ message: 'Server Error moderating worker' });
  }
});

// @route   PUT /api/admin/settings/profile
// @desc    Update admin profile
router.put('/settings/profile', auth, admin, async (req, res) => {
  try {
    const { name, email, avatar } = req.body;
    const adminUser = await User.findById(req.user.userId);
    if (!adminUser) return res.status(404).json({ message: 'Admin not found' });

    if (name) adminUser.name = name;
    if (email) adminUser.email = email;
    if (avatar) adminUser.avatar = avatar;

    await adminUser.save();
    res.json({ message: 'Admin profile updated', user: { id: adminUser._id, name: adminUser.name, email: adminUser.email, role: adminUser.role, avatar: adminUser.avatar } });
  } catch (err) {
    console.error('Error updating admin profile:', err);
    res.status(500).json({ message: 'Server Error updating admin profile' });
  }
});

function isValidPassword(password) {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8 || password.length > 72) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);
  return hasUpper && hasLower && hasNumber && hasSpecial;
}

// @route   PUT /api/admin/settings/password
// @desc    Change admin password
router.put('/settings/password', auth, admin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminUser = await User.findById(req.user.userId);
    if (!adminUser) return res.status(404).json({ message: 'Admin not found' });

    const isMatch = await bcrypt.compare(currentPassword, adminUser.password);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({
        message: 'Password must be between 8 and 72 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    adminUser.password = await bcrypt.hash(newPassword, salt);
    await adminUser.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error changing admin password:', err);
    res.status(500).json({ message: 'Server Error changing password' });
  }
});

module.exports = router;
