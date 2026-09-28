const express = require('express');
const router = express.Router();
const JobRequest = require('../models/JobRequest');
const Notification = require('../models/Notification');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');
const { 
  parseDateTime, 
  formatTime12h, 
  validateBookingConflicts, 
  autoExpireEmergencyRequests 
} = require('../utils/bookingConflicts');

// @route   POST /api/jobs
// @desc    Customer creates a new booking (Normal or Emergency)
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

    const worker = await User.findById(workerId);
    if (!worker) {
      return res.status(404).json({ message: 'Selected worker not found' });
    }

    const sCharge = Number(serviceCharge) || worker.hourlyRate || 500;
    const isEmerg = isEmergency === true || (bookingType && bookingType.toLowerCase() === 'emergency');
    const eCharge = isEmerg ? (Number(emergencyCharge) || 150) : 0;
    const totalAmount = sCharge + eCharge;

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

    let scheduledStart = null;
    let expiresAt = null;
    const duration = Math.max(15, Number(estimatedDuration) || 60);

    const inputDate = date || preferredDate;
    const inputTime = time || preferredTime;

    if (isEmerg) {
      // Emergency requests can be sent even if the worker is busy!
      // Valid for 5 minutes
      expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    } else {
      // Normal booking: parse appointment start time and perform conflict validation
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
    }

    const newBooking = new JobRequest({
      customerId: req.user.userId,
      workerId,
      serviceType: serviceType || worker.skills?.[0] || 'General Service',
      description: description || '',
      date: isEmerg ? 'Today' : (inputDate || 'Today'),
      time: isEmerg ? 'ASAP' : (inputTime || (scheduledStart ? formatTime12h(scheduledStart) : '10:00 AM')),
      location: resolvedAddress,
      serviceAddress: resolvedAddress,
      customerLocation: formattedCustomerLocation,
      bookingType: isEmerg ? 'emergency' : 'normal',
      isEmergency: isEmerg,
      preferredDateTime: scheduledStart,
      scheduledDateTime: scheduledStart,
      estimatedDuration: duration,
      expiresAt,
      serviceCharge: sCharge,
      emergencyCharge: eCharge,
      totalAmount,
      status: 'Pending'
    });

    const savedBooking = await newBooking.save();

    // Create Notification for the worker
    const customerUser = await User.findById(req.user.userId);
    const customerName = customerUser ? customerUser.name : 'A customer';
    const notifType = isEmerg ? 'EMERGENCY_BOOKING_REQUEST' : 'BOOKING_REQUEST';
    const notifMsg = isEmerg 
      ? `🚨 EMERGENCY OFFER: ${customerName} sent an urgent offer (+₹150 surcharge) for ${savedBooking.serviceType}. Respond within 5 minutes!`
      : `📅 New Booking Request from ${customerName} for ${savedBooking.serviceType} on ${savedBooking.date} at ${savedBooking.time}`;

    await Notification.create({
      userId: workerId,
      type: notifType,
      message: notifMsg,
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

// @route   GET /api/jobs
// @desc    Get all bookings for logged-in user (as customer or worker)
router.get('/', auth, async (req, res) => {
  try {
    // Automatically expire any emergency requests older than 5 minutes
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

    const isWorker = booking.workerId.toString() === req.user.userId.toString();
    const isCustomer = booking.customerId.toString() === req.user.userId.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isWorker && !isCustomer && !isAdmin) {
      return res.status(403).json({ message: 'Access denied: You are not authorized to update this booking.' });
    }

    // Check emergency expiration
    if (booking.isEmergency) {
      if (booking.status === 'Expired' || (booking.expiresAt && new Date() > booking.expiresAt && booking.status === 'Pending')) {
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
      if (!isWorker && !isAdmin) {
        return res.status(403).json({ message: 'Only the worker can complete this service.' });
      }
      booking.status = 'Completed';
      booking.completedAt = new Date();
      booking.updatedAt = Date.now();
      await booking.save();

      await Notification.create({
        userId: booking.customerId,
        type: 'SERVICE_COMPLETED',
        message: `🎉 Service completed! Please leave a rating & review for ${workerName}.`,
        bookingId: booking._id
      });
    } else if (status === 'Cancelled') {
      booking.status = 'Cancelled';
      booking.updatedAt = Date.now();
      await booking.save();

      const notifyRecipient = isCustomer ? booking.workerId : booking.customerId;
      const cancelledBy = isCustomer ? customerName : workerName;
      await Notification.create({
        userId: notifyRecipient,
        type: 'BOOKING_CANCELLED',
        message: `⚠️ Booking for ${booking.serviceType} was cancelled by ${cancelledBy}.`,
        bookingId: booking._id
      });
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
