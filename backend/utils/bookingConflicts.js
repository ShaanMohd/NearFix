const JobRequest = require('../models/JobRequest');

/**
 * Parses a date string ('YYYY-MM-DD') and time string ('HH:MM', '14:30', or '2:30 PM')
 * into a valid Date object.
 */
function parseDateTime(dateStr, timeStr) {
  if (!dateStr) return null;

  // If already an ISO string or full date representation
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  }

  // Handle 'Today' or 'Tomorrow'
  let baseDate = new Date();
  if (dateStr.toLowerCase() === 'today') {
    // keep today
  } else if (dateStr.toLowerCase() === 'tomorrow') {
    baseDate.setDate(baseDate.getDate() + 1);
  } else {
    // Expecting YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      baseDate = new Date(year, month, day);
    } else {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) baseDate = parsed;
    }
  }

  // Parse time
  let hours = 10;
  let minutes = 0;

  if (timeStr && timeStr.toUpperCase() !== 'ASAP') {
    const isPM = /pm/i.test(timeStr);
    const isAM = /am/i.test(timeStr);
    const cleanTime = timeStr.replace(/(am|pm)/i, '').trim();
    const timeParts = cleanTime.split(':');

    if (timeParts.length >= 2) {
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10);

      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
    }
  }

  baseDate.setHours(hours, minutes, 0, 0);
  return baseDate;
}

/**
 * Formats a Date object into human-readable 12-hour time (e.g., "2:30 PM")
 */
function formatTime12h(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Validates a normal booking proposal against past dates/times,
 * the worker's unavailable period, and existing confirmed bookings.
 */
async function validateBookingConflicts({
  worker,
  startDateTime,
  durationMinutes = 60,
  excludeBookingId = null
}) {
  const now = new Date();
  const startTime = new Date(startDateTime);

  if (isNaN(startTime.getTime())) {
    return { hasConflict: true, conflictType: 'INVALID_DATE_TIME', message: 'Invalid appointment date or time.' };
  }

  // 1. Check if appointment is in the past (allow 60s tolerance for clock skew)
  if (startTime.getTime() < now.getTime() - 60 * 1000) {
    return { hasConflict: true, conflictType: 'PAST_DATE_TIME', message: 'Appointment date and time must be in the future.' };
  }

  const duration = Math.max(15, Number(durationMinutes) || 60);
  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

  // 2. Check worker's current unavailable period (if marked Busy until a future time)
  if (worker && worker.isAvailable === false && worker.unavailableUntil) {
    const busyUntil = new Date(worker.unavailableUntil);
    // If unavailableUntil is in the future
    if (busyUntil > now) {
      // Overlap with [now, busyUntil]
      if (startTime < busyUntil) {
        return {
          hasConflict: true,
          conflictType: 'WORKER_UNAVAILABLE',
          message: `The worker is currently unavailable until ${formatTime12h(busyUntil)} on ${busyUntil.toLocaleDateString()}. Please select an appointment after this time.`
        };
      }
    }
  }

  // 3. Check conflicts with existing confirmed ('Accepted') bookings
  const query = {
    workerId: worker._id || worker.id,
    status: 'Accepted'
  };
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const confirmedBookings = await JobRequest.find(query);

  for (const booking of confirmedBookings) {
    let existingStart = booking.scheduledDateTime || booking.preferredDateTime;
    if (!existingStart && booking.date && booking.time) {
      existingStart = parseDateTime(booking.date, booking.time);
    }

    if (!existingStart) continue;

    const existingDuration = booking.estimatedDuration || 60;
    const existingEnd = new Date(existingStart.getTime() + existingDuration * 60 * 1000);

    // Overlap condition: start < existingEnd && end > existingStart
    if (startTime < existingEnd && endTime > existingStart) {
      const conflictSlot = `${formatTime12h(existingStart)} - ${formatTime12h(existingEnd)}`;
      return {
        hasConflict: true,
        conflictType: 'OVERLAPPING_BOOKING',
        message: `The worker already has a confirmed booking during this period (${conflictSlot}). Please select another time.`
      };
    }
  }

  return {
    hasConflict: false,
    startTime,
    endTime,
    durationMinutes: duration
  };
}

/**
 * Automatically marks unanswered emergency requests older than 5 minutes as 'Expired'.
 */
async function autoExpireEmergencyRequests() {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    await JobRequest.updateMany(
      {
        isEmergency: true,
        status: { $in: ['Open', 'Pending'] },
        $or: [
          { expiresAt: { $lt: new Date() } },
          { expiresAt: { $exists: false }, createdAt: { $lt: fiveMinutesAgo } }
        ]
      },
      {
        $set: { status: 'Expired' }
      }
    );
  } catch (err) {
    console.error('Error auto-expiring emergency requests:', err);
  }
}

module.exports = {
  parseDateTime,
  formatTime12h,
  validateBookingConflicts,
  autoExpireEmergencyRequests
};
