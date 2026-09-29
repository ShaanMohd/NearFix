const express = require('express');
const router = express.Router();
const JobRequest = require('../models/JobRequest');
const Notification = require('../models/Notification');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');
const { 
  parseDateTime, 
  formatTime12h, 
  validateBookingConflicts 
} = require('../utils/bookingConflicts');
const {
  calculateDistanceMeters,
  calculateCurrentRadius,
  parseServiceRadiusMeters,
  isSkillMatch,
  findEligibleWorkers,
  syncEmergencyBroadcast,
  autoExpireEmergencyRequests
} = require('../utils/emergencyDispatch');

// @route   POST /api/jobs
// @desc    Customer creates a new booking (Normal or Public Emergency)
router.post('/', auth, async (req, res) => {
  try {
    const { 
      workerId, 
      serviceType, 
      description, 
      date, 
      time, 
      preferredDate,
      preferredTime,
      preferredDateTime,
      estimatedDuration,
      location, 
      serviceAddress, 
      customerLocation, 
      isEmergency, 
      bookingType,
      serviceCharge, 
      emergencyCharge 
    } = req.body;

    const isEmerg = isEmergency === true || (bookingType && bookingType.toLowerCase() === 'emergency');

    let formattedCustomerLocation = undefined;
    if (customerLocation && Array.isArray(customerLocation.coordinates) && customerLocation.coordinates.length === 2) {
      const lng = Number(customerLocation.coordinates[0]);
      const lat = Number(customerLocation.coordinates[1]);
      if (!isNaN(lng) && !isNaN(lat)) {
        formattedCustomerLocation = {
          type: 'Point',
          coordinates: [lng, lat]
        };
      }
    }

    // Fallback: extract GPS coordinates from location or serviceAddress text
    if (!formattedCustomerLocation) {
      const combinedText = `${serviceAddress || ''} ${location || ''}`;
      const gpsMatch = combinedText.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
      if (gpsMatch) {
        const val1 = Number(gpsMatch[1]);
        const val2 = Number(gpsMatch[2]);
        let lat = val1;
        let lng = val2;
        if (val1 > 50 && val2 < 50) {
          lng = val1;
          lat = val2;
        }
        if (!isNaN(lat) && !isNaN(lng)) {
          formattedCustomerLocation = {
            type: 'Point',
            coordinates: [lng, lat]
          };
        }
      }
    }

    const resolvedAddress = serviceAddress || location || (formattedCustomerLocation ? `GPS Location (${formattedCustomerLocation.coordinates[1].toFixed(4)}, ${formattedCustomerLocation.coordinates[0].toFixed(4)})` : 'Customer Address');

    // ==========================================
    // 1. PUBLIC EMERGENCY DISPATCH CREATION
    // ==========================================
    if (isEmerg) {
      if (!serviceType || serviceType.trim() === '') {
        return res.status(400).json({ message: 'Service category is required for emergency dispatch.' });
      }
      if (!description || description.trim() === '') {
        return res.status(400).json({ message: 'Work description is required for emergency dispatch.' });
      }
      if (!formattedCustomerLocation) {
        return res.status(400).json({ message: 'GPS coordinates or service address is required for emergency dispatch.' });
      }

      // Validate customer acknowledged 10% emergency surcharge condition
      const acknowledged = req.body.customerAcceptedSurcharge === true || req.body.acceptSurchargeTerms === true;
      if (!acknowledged) {
        return res.status(400).json({ 
          message: 'You must acknowledge and accept that a 10% emergency surcharge applies to the agreed labor charge, excluding materials.' 
        });
      }

      const now = Date.now();
      const expiresAt = new Date(now + 5 * 60 * 1000); // 5-minute search window

      const newBooking = new JobRequest({
        customerId: req.user.userId,
        workerId: null, // Public dispatch: no initial worker assigned
        serviceType: serviceType.trim(),
        description: description.trim(),
        date: 'Today',
        time: 'Immediate (ASAP)',
        location: resolvedAddress,
        serviceAddress: resolvedAddress,
        customerLocation: formattedCustomerLocation,
        bookingType: 'emergency',
        isEmergency: true,
        emergencySurchargePercent: 10,
        customerAcceptedSurcharge: true,
        laborCharge: null,
        materialCost: 0,
        serviceCharge: 0,
        emergencyCharge: 0,
        totalAmount: null,
        quotationStatus: 'Pending',
        broadcastRadius: 2000, // Starts at 2 km (Round 1)
        notifiedWorkerIds: [],
        expiresAt,
        searchExpiresAt: expiresAt,
        status: 'Open'
      });

      const savedBooking = await newBooking.save();

      // Immediately synchronize initial radius broadcast (0-60s -> 2 km)
      await syncEmergencyBroadcast(savedBooking);

      const populatedBooking = await JobRequest.findById(savedBooking._id)
        .populate('customerId', 'name email phone avatar location address');

      return res.status(201).json(populatedBooking);
    }

    // ==========================================
    // 2. NORMAL SCHEDULED BOOKING CREATION
    // ==========================================
    if (!workerId) {
      return res.status(400).json({ message: 'workerId is required for normal bookings.' });
    }

    const worker = await User.findById(workerId);
    if (!worker) {
      return res.status(404).json({ message: 'Selected worker not found' });
    }

    const sCharge = Number(serviceCharge) || worker.hourlyRate || 500;
    const eCharge = 0;
    const totalAmount = sCharge;

    let scheduledStart = null;
    const duration = Math.max(15, Number(estimatedDuration) || 60);
    const inputDate = date || preferredDate;
    const inputTime = time || preferredTime;

    if (preferredDateTime) {
      scheduledStart = new Date(preferredDateTime);
    } else {
      scheduledStart = parseDateTime(inputDate, inputTime);
    }

    if (!scheduledStart || isNaN(scheduledStart.getTime())) {
      return res.status(400).json({ message: 'A valid appointment date and time is required for normal bookings.' });
    }

    const conflictCheck = await validateBookingConflicts({
      worker,
      startDateTime: scheduledStart,
      durationMinutes: duration
    });

    if (conflictCheck.hasConflict) {
      const statusCode = (conflictCheck.conflictType === 'PAST_DATE_TIME' || conflictCheck.conflictType === 'INVALID_DATE_TIME') ? 400 : 409;
      return res.status(statusCode).json({ message: conflictCheck.message, conflictType: conflictCheck.conflictType });
    }

    const newBooking = new JobRequest({
      customerId: req.user.userId,
      workerId,
      serviceType: serviceType || worker.skills?.[0] || 'General Service',
      description: description || '',
      date: inputDate || 'Today',
      time: inputTime || (scheduledStart ? formatTime12h(scheduledStart) : '10:00 AM'),
      location: resolvedAddress,
      serviceAddress: resolvedAddress,
      customerLocation: formattedCustomerLocation,
      bookingType: 'normal',
      isEmergency: false,
      emergencySurchargePercent: null,
      customerAcceptedSurcharge: false,
      laborCharge: sCharge,
      materialCost: 0,
      preferredDateTime: scheduledStart,
      scheduledDateTime: scheduledStart,
      estimatedDuration: duration,
      serviceCharge: sCharge,
      emergencyCharge: 0,
      totalAmount,
      quotationStatus: 'Approved',
      status: 'Pending'
    });

    const savedBooking = await newBooking.save();

    // Create Notification for the worker
    const customerUser = await User.findById(req.user.userId);
    const customerName = customerUser ? customerUser.name : 'A customer';

    await Notification.create({
      userId: workerId,
      type: 'BOOKING_REQUEST',
      message: `📅 New Booking Request from ${customerName} for ${savedBooking.serviceType} on ${savedBooking.date} at ${savedBooking.time}`,
      bookingId: savedBooking._id
    });

    const populatedBooking = await JobRequest.findById(savedBooking._id)
      .populate('customerId', 'name email phone avatar location address')
      .populate('workerId', 'name email phone avatar title skills hourlyRate isAvailable unavailableUntil');

    res.status(201).json(populatedBooking);
  } catch (err) {
    console.error('Error creating booking:', err.message);
    res.status(500).json({ message: 'Server Error creating booking: ' + err.message });
  }
});

// @route   GET /api/jobs/emergency/open and GET /api/jobs/emergency/available
// @desc    Worker gets available public emergency offers in their area
const getAvailableEmergencyOffers = async (req, res) => {
  try {
    await autoExpireEmergencyRequests();

    const worker = await User.findById(req.user.userId);
    if (!worker || worker.role !== 'worker') {
      return res.status(403).json({ message: 'Access denied: Worker role required.' });
    }

    // Only active verified workers can see emergency offers
    const isWorkerVerified = worker.verified === true || worker.verificationStatus === 'Verified';
    if (!isWorkerVerified || worker.accountStatus === 'Suspended') {
      return res.json([]);
    }

    // Use saved service base location (primary) vs live GPS (fallback)
    const workerCoords = (worker.location?.coordinates?.length === 2 && !isNaN(worker.location.coordinates[0]))
      ? worker.location.coordinates
      : (worker.currentLocation?.coordinates?.length === 2 && !isNaN(worker.currentLocation.coordinates[0]) ? worker.currentLocation.coordinates : null);

    if (!workerCoords) {
      return res.json([]);
    }

    const openRequests = await JobRequest.find({
      isEmergency: true,
      status: 'Open',
      expiresAt: { $gt: new Date() }
    });

    const matchingOffers = [];

    for (const job of openRequests) {
      // Evaluate progressive radius expansion on poll
      await syncEmergencyBroadcast(job);

      if (job.status !== 'Open') continue;

      // 1. Check category match with description
      if (!isSkillMatch(worker.skills, job.serviceType, job.description)) continue;

      // 2. Check distance against current broadcast radius and worker's service radius
      const jobCoords = job.customerLocation?.coordinates;
      if (!jobCoords || jobCoords.length < 2) continue;

      const distMeters = calculateDistanceMeters(workerCoords, jobCoords);
      const currentRadius = job.broadcastRadius || 2000;
      const workerMaxRadius = parseServiceRadiusMeters(worker.serviceRadius);

      if (distMeters <= currentRadius && distMeters <= workerMaxRadius) {
        // Privacy safeguard: locality name or general area
        matchingOffers.push({
          _id: job._id,
          serviceType: job.serviceType,
          description: job.description,
          serviceArea: job.serviceAddress || job.location || 'Nearby Customer Area',
          distanceMeters: Math.round(distMeters),
          distanceKm: Number((distMeters / 1000).toFixed(1)),
          baseCharge: job.laborCharge !== null && job.laborCharge !== undefined ? job.laborCharge : (job.emergencySurchargePercent ? null : (job.serviceCharge || 500)),
          laborCharge: job.laborCharge,
          materialCost: job.materialCost || 0,
          emergencyCharge: job.emergencyCharge || 0,
          emergencySurchargePercent: job.emergencySurchargePercent || null,
          totalAmount: job.totalAmount !== null && job.totalAmount !== undefined ? job.totalAmount : (job.emergencySurchargePercent ? null : 650),
          quotationStatus: job.quotationStatus || 'Pending',
          createdAt: job.createdAt,
          expiresAt: job.expiresAt,
          broadcastRadius: job.broadcastRadius,
          secondsRemaining: Math.max(0, Math.floor((new Date(job.expiresAt).getTime() - Date.now()) / 1000))
        });
      }
    }

    // Nearest offers first
    matchingOffers.sort((a, b) => a.distanceMeters - b.distanceMeters);

    res.json(matchingOffers);
  } catch (err) {
    console.error('Error fetching emergency offers:', err.message);
    res.status(500).json({ message: 'Server error fetching emergency offers' });
  }
};

router.get('/emergency/open', auth, getAvailableEmergencyOffers);
router.get('/emergency/available', auth, getAvailableEmergencyOffers);

// @route   PUT /api/jobs/:id/emergency-claim
// @desc    Worker claims an open emergency request with ETA (Atomic first acceptance)
router.put('/:id/emergency-claim', auth, async (req, res) => {
  try {
    await autoExpireEmergencyRequests();

    const { estimatedArrivalTime } = req.body;
    if (!estimatedArrivalTime || typeof estimatedArrivalTime !== 'string' || estimatedArrivalTime.trim() === '') {
      return res.status(400).json({ message: 'Estimated arrival time (ETA) is required to accept an emergency offer.' });
    }

    const worker = await User.findById(req.user.userId);
    if (!worker || worker.role !== 'worker') {
      return res.status(403).json({ message: 'Only registered service workers can claim emergency offers.' });
    }

    if (worker.verificationStatus !== 'Verified' || worker.accountStatus === 'Suspended') {
      return res.status(403).json({ message: 'Your worker account must be verified and active to claim emergency requests.' });
    }

    const booking = await JobRequest.findById(req.params.id);
    if (!booking || !booking.isEmergency) {
      return res.status(404).json({ message: 'Emergency request not found.' });
    }

    if (booking.status !== 'Open') {
      return res.status(409).json({ message: 'This emergency offer has already been claimed or is no longer open.' });
    }

    if (booking.expiresAt && new Date() > booking.expiresAt) {
      booking.status = 'Expired';
      await booking.save();
      return res.status(410).json({ message: 'This emergency request has expired (5-minute response limit exceeded).' });
    }

    // Validate category match
    if (!isSkillMatch(worker.skills, booking.serviceType, booking.description)) {
      return res.status(400).json({ message: `Your registered skills do not match the requested category (${booking.serviceType}).` });
    }

    // Validate distance using saved base service location (primary)
    const workerCoords = (worker.location?.coordinates?.length === 2 && !isNaN(worker.location.coordinates[0]))
      ? worker.location.coordinates
      : (worker.currentLocation?.coordinates?.length === 2 && !isNaN(worker.currentLocation.coordinates[0]) ? worker.currentLocation.coordinates : null);

    if (!workerCoords) {
      return res.status(400).json({ message: 'Worker profile location is missing or invalid.' });
    }

    const distMeters = calculateDistanceMeters(booking.customerLocation?.coordinates, workerCoords);
    const radiusMeters = booking.broadcastRadius || 2000;
    const workerMaxRadius = parseServiceRadiusMeters(worker.serviceRadius);

    if (distMeters > radiusMeters) {
      return res.status(400).json({ message: 'You are outside the current broadcast radius for this emergency request.' });
    }
    if (distMeters > workerMaxRadius) {
      return res.status(400).json({ message: 'The customer is outside your configured maximum service radius.' });
    }

    const now = new Date();
    const confirmationExpiry = new Date(Date.now() + 2 * 60 * 1000); // 2-minute customer confirmation deadline

    // Atomic claim via findOneAndUpdate
    const claimedJob = await JobRequest.findOneAndUpdate(
      {
        _id: req.params.id,
        isEmergency: true,
        status: 'Open',
        expiresAt: { $gt: now }
      },
      {
        $set: {
          workerId: worker._id,
          status: 'EmergencyAcceptedPendingCustomer',
          estimatedArrivalTime: estimatedArrivalTime.trim(),
          claimedAt: now,
          confirmationExpiresAt: confirmationExpiry
        }
      },
      { new: true }
    )
      .populate('customerId', 'name email phone avatar location address')
      .populate('workerId', 'name email phone avatar title skills hourlyRate rating reviewsCount');

    if (!claimedJob) {
      return res.status(409).json({ message: 'This emergency request was just claimed by another professional.' });
    }

    // Notify customer
    await Notification.create({
      userId: claimedJob.customerId._id || claimedJob.customerId,
      type: 'EMERGENCY_ACCEPTED_PENDING_CONFIRMATION',
      message: `🚨 Worker Found! ${worker.name} accepted your emergency request (ETA: ${claimedJob.estimatedArrivalTime}). Please confirm dispatch within 2 minutes!`,
      bookingId: claimedJob._id
    });

    res.json({
      message: 'Emergency request claimed successfully! Awaiting customer confirmation.',
      booking: claimedJob
    });
  } catch (err) {
    console.error('Error claiming emergency request:', err.message);
    res.status(500).json({ message: 'Server error claiming emergency request: ' + err.message });
  }
});

// @route   GET /api/jobs/:id/emergency-status
// @desc    Poll status, progressive radius, countdown, and confirmation for an emergency request
router.get('/:id/emergency-status', auth, async (req, res) => {
  try {
    if (!JobRequest.base.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Emergency request not found' });
    }

    await autoExpireEmergencyRequests();

    let job = await JobRequest.findById(req.params.id)
      .populate('customerId', 'name email phone avatar location address')
      .populate('workerId', 'name email phone avatar title skills hourlyRate rating reviewsCount');

    if (!job || !job.isEmergency) {
      return res.status(404).json({ message: 'Emergency request not found' });
    }

    // Advance progressive radius if still Open
    if (job.status === 'Open') {
      job = await syncEmergencyBroadcast(job);
    }

    const now = Date.now();
    const searchExpiry = (job.searchExpiresAt || job.expiresAt) ? new Date(job.searchExpiresAt || job.expiresAt).getTime() : now;
    const searchSecondsRemaining = Math.max(0, Math.floor((searchExpiry - now) / 1000));

    let confirmationSecondsRemaining = 0;
    if (job.status === 'EmergencyAcceptedPendingCustomer' && job.confirmationExpiresAt) {
      confirmationSecondsRemaining = Math.max(0, Math.floor((new Date(job.confirmationExpiresAt).getTime() - now) / 1000));
    }

    const { round, label } = calculateCurrentRadius(job.createdAt);

    res.json({
      _id: job._id,
      status: job.status,
      serviceType: job.serviceType,
      description: job.description,
      location: job.location,
      serviceAddress: job.serviceAddress,
      customerLocation: job.customerLocation,
      totalAmount: job.totalAmount,
      serviceCharge: job.serviceCharge,
      laborCharge: job.laborCharge,
      materialCost: job.materialCost,
      emergencyCharge: job.emergencyCharge,
      emergencySurchargePercent: job.emergencySurchargePercent,
      quotationStatus: job.quotationStatus,
      quotationSubmittedAt: job.quotationSubmittedAt,
      quotationApprovedAt: job.quotationApprovedAt,
      broadcastRadius: job.broadcastRadius,
      radiusKm: Number(((job.broadcastRadius || 2000) / 1000).toFixed(1)),
      searchRound: round,
      searchRoundLabel: label,
      notifiedWorkersCount: (job.notifiedWorkerIds || []).length,
      searchSecondsRemaining,
      confirmationSecondsRemaining,
      estimatedArrivalTime: job.estimatedArrivalTime,
      worker: job.workerId || null,
      customerId: job.customerId?._id || job.customerId,
      createdAt: job.createdAt,
      expiresAt: job.expiresAt,
      confirmationExpiresAt: job.confirmationExpiresAt
    });
  } catch (err) {
    console.error('Error fetching emergency status:', err.message);
    res.status(500).json({ message: 'Server error fetching emergency status' });
  }
});

// @route   GET /api/jobs
// @desc    Get all bookings for logged-in user (as customer or worker)
router.get('/', auth, async (req, res) => {
  try {
    await autoExpireEmergencyRequests();

    const asWorker = req.query.asWorker === 'true' || (req.user.role === 'worker' && req.query.asCustomer !== 'true');
    const query = asWorker 
      ? { workerId: req.user.userId }
      : { customerId: req.user.userId };

    const jobs = await JobRequest.find(query)
      .populate('customerId', 'name email phone avatar location address')
      .populate('workerId', 'name email phone avatar title skills hourlyRate rating reviewsCount isAvailable unavailableUntil')
      .sort({ createdAt: -1 });

    res.json(jobs);
  } catch (err) {
    console.error('Error fetching bookings:', err.message);
    res.status(500).json({ message: 'Server Error fetching bookings' });
  }
});

// @route   GET /api/jobs/:id
// @desc    Get single booking details
router.get('/:id', auth, async (req, res) => {
  try {
    await autoExpireEmergencyRequests();

    const job = await JobRequest.findById(req.params.id)
      .populate('customerId', 'name email phone avatar location')
      .populate('workerId', 'name email phone avatar title skills hourlyRate rating reviewsCount isAvailable unavailableUntil');

    if (!job) return res.status(404).json({ message: 'Booking not found' });
    res.json(job);
  } catch (err) {
    console.error('Error fetching booking detail:', err.message);
    res.status(500).json({ message: 'Server Error fetching booking detail' });
  }
});

// @route   PUT /api/jobs/:id/quotation
// @desc    Worker submits or revises emergency quotation (labor + materials)
router.put('/:id/quotation', auth, async (req, res) => {
  try {
    const { laborCharge, materialCost, note } = req.body;

    const job = await JobRequest.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (!job.isEmergency) {
      return res.status(400).json({ message: 'Quotations are only applicable for emergency bookings.' });
    }

    // Only assigned worker can submit quotation
    if (!job.workerId || job.workerId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'Only the assigned professional can submit a quotation for this booking.' });
    }

    // Validate booking state: must be active/in-progress and not expired or cancelled
    const activeStatuses = ['Accepted', 'On The Way', 'Arrived', 'In Progress'];
    if (!activeStatuses.includes(job.status)) {
      return res.status(400).json({ 
        message: `Cannot submit quotation when booking status is ${job.status}. Booking must be confirmed and in progress.` 
      });
    }

    // Lock against unilateral changes once approved
    if (job.quotationStatus === 'Approved') {
      return res.status(400).json({ 
        message: 'This quotation has already been approved by the customer and cannot be modified unilaterally.' 
      });
    }

    // Monetary Validation
    const parsedLabor = Number(laborCharge);
    if (isNaN(parsedLabor) || parsedLabor <= 0) {
      return res.status(400).json({ message: 'Labor charge must be a valid positive number greater than 0.' });
    }

    let parsedMaterial = 0;
    if (materialCost !== undefined && materialCost !== null && materialCost !== '') {
      parsedMaterial = Number(materialCost);
      if (isNaN(parsedMaterial) || parsedMaterial < 0) {
        return res.status(400).json({ message: 'Material cost cannot be negative.' });
      }
    }

    // Currency precision: Integer paise calculation
    const laborPaise = Math.round(parsedLabor * 100);
    const materialPaise = Math.round(parsedMaterial * 100);
    const surchargePercent = job.emergencySurchargePercent || 10;
    const surchargePaise = Math.round((laborPaise * surchargePercent) / 100);
    const totalPaise = laborPaise + surchargePaise + materialPaise;

    const finalLabor = laborPaise / 100;
    const finalMaterial = materialPaise / 100;
    const finalSurcharge = surchargePaise / 100;
    const finalTotal = totalPaise / 100;

    job.laborCharge = finalLabor;
    job.serviceCharge = finalLabor;
    job.materialCost = finalMaterial;
    job.emergencyCharge = finalSurcharge;
    job.totalAmount = finalTotal;
    job.quotationStatus = 'Submitted';
    job.quotationSubmittedAt = new Date();
    if (note && typeof note === 'string') {
      job.workerNote = note.trim();
    }
    job.updatedAt = Date.now();
    await job.save();

    // Send customer notification
    const workerUser = await User.findById(req.user.userId);
    const workerName = workerUser ? workerUser.name : 'Your professional';

    await Notification.create({
      userId: job.customerId,
      type: 'QUOTATION_SUBMITTED',
      message: `📋 Quotation from ${workerName}: Labor ₹${finalLabor.toLocaleString('en-IN')} + 10% Emergency Surcharge (₹${finalSurcharge.toLocaleString('en-IN')})${finalMaterial > 0 ? ` + Materials ₹${finalMaterial.toLocaleString('en-IN')}` : ''} = Total ₹${finalTotal.toLocaleString('en-IN')}. Please approve to begin work.`,
      bookingId: job._id
    });

    const populated = await JobRequest.findById(job._id)
      .populate('customerId', 'name email phone avatar location address')
      .populate('workerId', 'name email phone avatar title skills hourlyRate rating reviewsCount');

    res.json({
      message: 'Quotation submitted successfully. Awaiting customer approval.',
      booking: populated
    });
  } catch (err) {
    console.error('Error submitting quotation:', err);
    res.status(500).json({ message: 'Server error submitting quotation: ' + err.message });
  }
});

// @route   PUT /api/jobs/:id/quotation-respond
// @desc    Customer approves or declines emergency quotation
router.put('/:id/quotation-respond', auth, async (req, res) => {
  try {
    const { action, reason } = req.body;

    if (!['approve', 'decline'].includes(action)) {
      return res.status(400).json({ message: 'Action must be either "approve" or "decline".' });
    }

    const job = await JobRequest.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (!job.isEmergency) {
      return res.status(400).json({ message: 'Quotation responses are only applicable for emergency bookings.' });
    }

    // Only customer of this booking can respond
    if (job.customerId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'Only the customer can approve or decline this quotation.' });
    }

    if (job.quotationStatus !== 'Submitted') {
      if (job.quotationStatus === 'Approved') {
        return res.status(400).json({ message: 'This quotation has already been approved.' });
      }
      return res.status(400).json({ message: 'No submitted quotation is currently pending customer review.' });
    }

    const customerUser = await User.findById(req.user.userId);
    const customerName = customerUser ? customerUser.name : 'Customer';

    if (action === 'approve') {
      job.quotationStatus = 'Approved';
      job.quotationApprovedAt = new Date();
      job.updatedAt = Date.now();
      await job.save();

      if (job.workerId) {
        await Notification.create({
          userId: job.workerId,
          type: 'QUOTATION_APPROVED',
          message: `✅ ${customerName} approved your quotation (Total: ₹${job.totalAmount.toLocaleString('en-IN')})! You may now proceed with the repair work.`,
          bookingId: job._id
        });
      }

      const populated = await JobRequest.findById(job._id)
        .populate('customerId', 'name email phone avatar location address')
        .populate('workerId', 'name email phone avatar title skills hourlyRate rating reviewsCount');

      return res.json({
        message: 'Quotation approved successfully. Worker has been notified to proceed.',
        booking: populated
      });
    }

    if (action === 'decline') {
      job.quotationStatus = 'Declined';
      job.updatedAt = Date.now();
      await job.save();

      if (job.workerId) {
        const declineMsg = reason 
          ? `⚠️ ${customerName} declined the quotation: "${reason}". Please consult and submit a revised quotation.`
          : `⚠️ ${customerName} declined the quotation. Please consult with the customer and submit a revised quotation.`;

        await Notification.create({
          userId: job.workerId,
          type: 'QUOTATION_DECLINED',
          message: declineMsg,
          bookingId: job._id
        });
      }

      const populated = await JobRequest.findById(job._id)
        .populate('customerId', 'name email phone avatar location address')
        .populate('workerId', 'name email phone avatar title skills hourlyRate rating reviewsCount');

      return res.json({
        message: 'Quotation declined. The worker may revise and resubmit.',
        booking: populated
      });
    }
  } catch (err) {
    console.error('Error responding to quotation:', err);
    res.status(500).json({ message: 'Server error responding to quotation: ' + err.message });
  }
});

// @route   PUT /api/jobs/:id/status
// @desc    Update booking status (Accepted, Rejected, Completed, Cancelled, RescheduleProposed, EmergencyAcceptedPendingCustomer)
router.put('/:id/status', auth, async (req, res) => {
  try {
    await autoExpireEmergencyRequests();

    const { 
      status, 
      estimatedArrivalTime, 
      alternativeDate, 
      alternativeTime, 
      alternativeDuration,
      workerNote,
      proposedDate,
      proposedTime,
      proposedDuration,
      proposedReason
    } = req.body;

    const booking = await JobRequest.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isWorker = booking.workerId && booking.workerId.toString() === req.user.userId.toString();
    const isCustomer = booking.customerId && booking.customerId.toString() === req.user.userId.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isWorker && !isCustomer && !isAdmin) {
      return res.status(403).json({ message: 'Access denied: You are not authorized to update this booking.' });
    }

    // Check emergency expiration
    if (booking.isEmergency) {
      if (booking.status === 'Expired' || (booking.expiresAt && new Date() > booking.expiresAt && (booking.status === 'Pending' || booking.status === 'Open'))) {
        booking.status = 'Expired';
        await booking.save();
        return res.status(400).json({ message: 'This emergency offer has expired (5-minute response limit exceeded).' });
      }
    }

    const workerUser = await User.findById(booking.workerId);
    const customerUser = await User.findById(booking.customerId);
    const workerName = workerUser ? workerUser.name : 'The worker';
    const customerName = customerUser ? customerUser.name : 'The customer';

    // 1. Worker Proposes Alternative Time
    if (status === 'RescheduleProposed') {
      if (!isWorker && !isAdmin) {
        return res.status(403).json({ message: 'Only the worker can propose an alternative appointment time.' });
      }

      const reschedDate = alternativeDate || proposedDate;
      const reschedTime = alternativeTime || proposedTime;
      const reschedDuration = alternativeDuration || proposedDuration;
      const reschedNote = workerNote || proposedReason || '';

      if (!reschedDate || !reschedTime) {
        return res.status(400).json({ message: 'Alternative date and time are required.' });
      }

      const altStart = parseDateTime(reschedDate, reschedTime);
      const altDuration = Math.max(15, Number(reschedDuration) || booking.estimatedDuration || 60);

      const conflictCheck = await validateBookingConflicts({
        worker: workerUser,
        startDateTime: altStart,
        durationMinutes: altDuration,
        excludeBookingId: booking._id
      });

      if (conflictCheck.hasConflict) {
        return res.status(409).json({ message: conflictCheck.message });
      }

      booking.proposedAlternative = {
        dateTime: altStart,
        date: reschedDate,
        time: reschedTime,
        estimatedDuration: altDuration,
        note: reschedNote
      };
      booking.status = 'RescheduleProposed';
      booking.updatedAt = Date.now();
      await booking.save();

      await Notification.create({
        userId: booking.customerId,
        type: 'BOOKING_RESCHEDULE_PROPOSED',
        message: `📅 ${workerName} proposed an alternative appointment: ${alternativeDate} at ${alternativeTime}. Please review & confirm.`,
        bookingId: booking._id
      });

      const updated = await JobRequest.findById(req.params.id)
        .populate('customerId', 'name email phone avatar location')
        .populate('workerId', 'name email phone avatar title skills hourlyRate isAvailable unavailableUntil');
      return res.json(updated);
    }

    // 2. Worker Accepts Emergency Offer -> Requires Estimated Arrival Time
    if (booking.isEmergency && status === 'EmergencyAcceptedPendingCustomer') {
      if (!isWorker && !isAdmin) {
        return res.status(403).json({ message: 'Only the assigned worker can accept this emergency offer.' });
      }

      if (!estimatedArrivalTime || typeof estimatedArrivalTime !== 'string' || estimatedArrivalTime.trim() === '') {
        return res.status(400).json({ message: 'Please provide an estimated arrival time (e.g., 20 mins) to accept an emergency offer.' });
      }

      booking.estimatedArrivalTime = estimatedArrivalTime.trim();
      booking.status = 'EmergencyAcceptedPendingCustomer';
      booking.updatedAt = Date.now();
      await booking.save();

      await Notification.create({
        userId: booking.customerId,
        type: 'EMERGENCY_ACCEPTED_PENDING_CONFIRMATION',
        message: `🚨 ${workerName} accepted your emergency offer! Estimated arrival: ${booking.estimatedArrivalTime}. Please confirm to dispatch.`,
        bookingId: booking._id
      });

      const updated = await JobRequest.findById(req.params.id)
        .populate('customerId', 'name email phone avatar location')
        .populate('workerId', 'name email phone avatar title skills hourlyRate isAvailable unavailableUntil');
      return res.json(updated);
    }

    // 3. Customer Approves Reschedule Proposal or Confirms Emergency
    if (status === 'Accepted' && isCustomer) {
      if (booking.status === 'RescheduleProposed') {
        if (booking.proposedAlternative?.dateTime) {
          booking.scheduledDateTime = booking.proposedAlternative.dateTime;
          booking.preferredDateTime = booking.proposedAlternative.dateTime;
          booking.date = booking.proposedAlternative.date || booking.date;
          booking.time = booking.proposedAlternative.time || booking.time;
          booking.estimatedDuration = booking.proposedAlternative.estimatedDuration || booking.estimatedDuration;
        }
        booking.status = 'Accepted';
        booking.updatedAt = Date.now();
        await booking.save();

        await Notification.create({
          userId: booking.workerId,
          type: 'BOOKING_ACCEPTED',
          message: `✅ ${customerName} approved your proposed alternative time for ${booking.serviceType}! Booking confirmed.`,
          bookingId: booking._id
        });

        const updated = await JobRequest.findById(req.params.id)
          .populate('customerId', 'name email phone avatar location')
          .populate('workerId', 'name email phone avatar title skills hourlyRate isAvailable unavailableUntil');
        return res.json(updated);
      }

      if (booking.status === 'EmergencyAcceptedPendingCustomer') {
        booking.status = 'Accepted';
        booking.updatedAt = Date.now();
        await booking.save();

        await Notification.create({
          userId: booking.workerId,
          type: 'EMERGENCY_CONFIRMED',
          message: `🚨 ${customerName} confirmed emergency dispatch (ETA: ${booking.estimatedArrivalTime})! Please proceed immediately.`,
          bookingId: booking._id
        });

        const updated = await JobRequest.findById(req.params.id)
          .populate('customerId', 'name email phone avatar location')
          .populate('workerId', 'name email phone avatar title skills hourlyRate isAvailable unavailableUntil');
        return res.json(updated);
      }
    }

    // 4. Worker Accepts Normal Booking
    if (status === 'Accepted') {
      if (!isWorker && !isAdmin) {
        return res.status(403).json({ message: 'Only the assigned worker can accept this booking.' });
      }

      // Re-validate for conflicts at moment of acceptance
      if (!booking.isEmergency && booking.scheduledDateTime) {
        const conflictCheck = await validateBookingConflicts({
          worker: workerUser,
          startDateTime: booking.scheduledDateTime,
          durationMinutes: booking.estimatedDuration || 60,
          excludeBookingId: booking._id
        });

        if (conflictCheck.hasConflict) {
          return res.status(409).json({ 
            message: `Cannot accept: ${conflictCheck.message} You can propose an alternative time instead.` 
          });
        }
      }

      if (booking.isEmergency && estimatedArrivalTime) {
        booking.estimatedArrivalTime = estimatedArrivalTime;
      }

      booking.status = 'Accepted';
      booking.updatedAt = Date.now();
      await booking.save();

      await Notification.create({
        userId: booking.customerId,
        type: 'BOOKING_ACCEPTED',
        message: `✅ ${workerName} accepted your booking request for ${booking.serviceType}!`,
        bookingId: booking._id
      });

      const updated = await JobRequest.findById(req.params.id)
        .populate('customerId', 'name email phone avatar location')
        .populate('workerId', 'name email phone avatar title skills hourlyRate isAvailable unavailableUntil');
      return res.json(updated);
    }

    // 5. Worker or Admin Rejects
    if (status === 'Rejected') {
      if (!isWorker && !isAdmin) {
        return res.status(403).json({ message: 'Only the assigned worker can reject this booking.' });
      }
      booking.status = 'Rejected';
      booking.workerNote = workerNote || booking.workerNote;
      booking.updatedAt = Date.now();
      await booking.save();

      await Notification.create({
        userId: booking.customerId,
        type: 'BOOKING_REJECTED',
        message: `❌ ${workerName} was unable to accept your request for ${booking.serviceType}.`,
        bookingId: booking._id
      });

      const updated = await JobRequest.findById(req.params.id)
        .populate('customerId', 'name email phone avatar location')
        .populate('workerId', 'name email phone avatar title skills hourlyRate isAvailable unavailableUntil');
      return res.json(updated);
    }

    // 6. Complete or Cancel
    if (status === 'Completed') {
      if (!isCustomer && !isAdmin) {
        return res.status(403).json({ message: 'Only the customer can confirm and mark this service as completed.' });
      }

      // Requirement 8: For emergency bookings using the percentage system, require an approved quotation before completion
      if (booking.isEmergency && booking.emergencySurchargePercent) {
        if (booking.quotationStatus !== 'Approved') {
          return res.status(400).json({ 
            message: 'Cannot complete emergency booking: An agreed quotation must be submitted by the worker and approved by the customer before completion.' 
          });
        }
      }

      booking.status = 'Completed';
      booking.completedAt = new Date();
      booking.updatedAt = Date.now();
      await booking.save();

      // Notify the worker that the customer confirmed completion
      if (booking.workerId) {
        await Notification.create({
          userId: booking.workerId,
          type: 'SERVICE_COMPLETED',
          message: `🎉 Customer ${customerName} has confirmed service completion for ${booking.serviceType}! Great job.`,
          bookingId: booking._id
        });
      }

      await Notification.create({
        userId: booking.customerId,
        type: 'SERVICE_COMPLETED',
        message: `🎉 Service completed! Please leave a rating & review for ${workerName}.`,
        bookingId: booking._id
      });
    } else if (status === 'Cancelled' || status === 'DeclineWorker') {
      if (booking.isEmergency && booking.status === 'EmergencyAcceptedPendingCustomer' && isCustomer) {
        const prevWorkerId = booking.workerId;
        const now = new Date();
        if (booking.searchExpiresAt && now < booking.searchExpiresAt) {
          booking.status = 'Open';
          booking.workerId = null;
          booking.claimedAt = null;
          booking.confirmationExpiresAt = null;
          booking.updatedAt = Date.now();
          await booking.save();

          if (prevWorkerId) {
            await Notification.create({
              userId: prevWorkerId,
              type: 'BOOKING_CANCELLED',
              message: `⚠️ Customer declined the proposed arrival time for ${booking.serviceType}. Offer reopened for other workers.`,
              bookingId: booking._id
            });
          }

          await syncEmergencyBroadcast(booking);

          const updated = await JobRequest.findById(req.params.id)
            .populate('customerId', 'name email phone avatar location address');
          return res.json(updated);
        } else {
          booking.status = 'Expired';
          await booking.save();
          return res.json(booking);
        }
      }

      booking.status = 'Cancelled';
      booking.updatedAt = Date.now();
      await booking.save();

      const notifyRecipient = isCustomer ? booking.workerId : booking.customerId;
      const cancelledBy = isCustomer ? customerName : workerName;
      if (notifyRecipient) {
        await Notification.create({
          userId: notifyRecipient,
          type: 'BOOKING_CANCELLED',
          message: `⚠️ Booking for ${booking.serviceType} was cancelled by ${cancelledBy}.`,
          bookingId: booking._id
        });
      }
    } else {
      // Other progress states like 'On The Way', 'Arrived', 'In Progress'
      booking.status = status;
      booking.updatedAt = Date.now();
      await booking.save();
    }

    const updated = await JobRequest.findById(req.params.id)
      .populate('customerId', 'name email phone avatar location')
      .populate('workerId', 'name email phone avatar title skills hourlyRate isAvailable unavailableUntil');

    res.json(updated);
  } catch (err) {
    console.error('Error updating booking status:', err.message);
    res.status(500).json({ message: 'Server Error updating booking status: ' + err.message });
  }
});

module.exports = router;
