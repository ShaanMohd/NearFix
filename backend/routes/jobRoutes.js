const express = require('express');
const router = express.Router();
const JobRequest = require('../models/JobRequest');
const Notification = require('../models/Notification');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');

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
      location, 
      serviceAddress, 
      customerLocation, 
      isEmergency, 
      serviceCharge, 
      emergencyCharge 
    } = req.body;

    const worker = await User.findById(workerId);
    if (!worker) {
      return res.status(404).json({ message: 'Selected worker not found' });
    }

    const sCharge = Number(serviceCharge) || worker.hourlyRate || 500;
    const eCharge = isEmergency ? (Number(emergencyCharge) || 150) : 0;
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

    // Fallback: extract GPS coordinates from location or serviceAddress text if not supplied as an object
    if (!formattedCustomerLocation) {
      const combinedText = `${serviceAddress || ''} ${location || ''}`;
      const gpsMatch = combinedText.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
      if (gpsMatch) {
        const val1 = Number(gpsMatch[1]);
        const val2 = Number(gpsMatch[2]);
        let lat = val1;
        let lng = val2;
        // In India longitude is typically 68-98 and latitude is 8-37
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

    const newBooking = new JobRequest({
      customerId: req.user.userId,
      workerId,
      serviceType: serviceType || worker.skills?.[0] || 'General Service',
      description: description || '',
      date: date || 'Today',
      time: time || (isEmergency ? 'ASAP' : '10:00 AM'),
      location: resolvedAddress,
      serviceAddress: resolvedAddress,
      customerLocation: formattedCustomerLocation,
      isEmergency: !!isEmergency,
      serviceCharge: sCharge,
      emergencyCharge: eCharge,
      totalAmount,
      status: 'Pending'
    });

    const savedBooking = await newBooking.save();

    // Create Notification for the worker
    const customerUser = await User.findById(req.user.userId);
    const customerName = customerUser ? customerUser.name : 'A customer';
    const notifType = isEmergency ? 'EMERGENCY_BOOKING_REQUEST' : 'BOOKING_REQUEST';
    const notifMsg = isEmergency 
      ? `🚨 EMERGENCY REQUEST: ${customerName} booked urgent service for ${savedBooking.serviceType} (ASAP)`
      : `📅 New Booking Request from ${customerName} for ${savedBooking.serviceType} on ${savedBooking.date}`;

    await Notification.create({
      userId: workerId,
      type: notifType,
      message: notifMsg,
      bookingId: savedBooking._id
    });

    const populatedBooking = await JobRequest.findById(savedBooking._id)
      .populate('customerId', 'name email phone avatar location address')
      .populate('workerId', 'name email phone avatar title skills hourlyRate');

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
    const asWorker = req.query.asWorker === 'true' || (req.user.role === 'worker' && req.query.asCustomer !== 'true');
    const query = asWorker 
      ? { workerId: req.user.userId }
      : { customerId: req.user.userId };

    const jobs = await JobRequest.find(query)
      .populate('customerId', 'name email phone avatar location address')
      .populate('workerId', 'name email phone avatar title skills hourlyRate rating reviewsCount')
      .sort({ isEmergency: -1, createdAt: -1 });

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
    const job = await JobRequest.findById(req.params.id)
      .populate('customerId', 'name email phone avatar location')
      .populate('workerId', 'name email phone avatar title skills hourlyRate rating reviewsCount');

    if (!job) return res.status(404).json({ message: 'Booking not found' });
    res.json(job);
  } catch (err) {
    console.error('Error fetching booking detail:', err.message);
    res.status(500).json({ message: 'Server Error fetching booking detail' });
  }
});

// @route   PUT /api/jobs/:id/status
// @desc    Update booking status (Accepted, Rejected, Completed, Cancelled)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await JobRequest.findById(req.params.id);

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.status = status;
    booking.updatedAt = Date.now();
    await booking.save();

    // Trigger appropriate Notification
    const workerUser = await User.findById(booking.workerId);
    const customerUser = await User.findById(booking.customerId);
    const workerName = workerUser ? workerUser.name : 'The worker';
    const customerName = customerUser ? customerUser.name : 'The customer';

    if (status === 'Accepted') {
      await Notification.create({
        userId: booking.customerId,
        type: 'BOOKING_ACCEPTED',
        message: `✅ ${workerName} accepted your ${booking.isEmergency ? 'Emergency ' : ''}booking request for ${booking.serviceType}!`,
        bookingId: booking._id
      });
    } else if (status === 'Rejected') {
      await Notification.create({
        userId: booking.customerId,
        type: 'BOOKING_REJECTED',
        message: `❌ ${workerName} was unable to accept your request for ${booking.serviceType}. Please select another worker.`,
        bookingId: booking._id
      });
    } else if (status === 'Completed') {
      await Notification.create({
        userId: booking.customerId,
        type: 'SERVICE_COMPLETED',
        message: `🎉 Service completed! Please leave a rating & review for ${workerName}.`,
        bookingId: booking._id
      });
    } else if (status === 'Cancelled') {
      await Notification.create({
        userId: booking.workerId,
        type: 'BOOKING_CANCELLED',
        message: `⚠️ Booking for ${booking.serviceType} was cancelled by ${customerName}.`,
        bookingId: booking._id
      });
    }

    const updated = await JobRequest.findById(req.params.id)
      .populate('customerId', 'name email phone avatar location')
      .populate('workerId', 'name email phone avatar title skills hourlyRate rating reviewsCount');

    res.json(updated);
  } catch (err) {
    console.error('Error updating booking status:', err.message);
    res.status(500).json({ message: 'Server Error updating booking status' });
  }
});

module.exports = router;
