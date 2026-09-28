/**
 * Utility functions for local dates, times, and worker availability evaluation.
 */

// Returns 'YYYY-MM-DD' in the user's local timezone
export function getTodayLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Returns 'HH:MM' in the user's local timezone
export function getCurrentLocalTimeString() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Returns a safe default appointment time (e.g., current time rounded up + 45 mins)
export function getDefaultBookingTimeString() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 45);
  // Round to nearest 5 minutes
  const remainder = now.getMinutes() % 5;
  if (remainder !== 0) {
    now.setMinutes(now.getMinutes() + (5 - remainder));
  }
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Formats 'HH:MM' or Date object into '9:30 AM'
export function formatTime12h(timeInput) {
  if (!timeInput) return '';

  if (timeInput instanceof Date) {
    return timeInput.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  if (typeof timeInput === 'string') {
    // If it contains AM/PM already
    if (/am|pm/i.test(timeInput)) return timeInput;

    const parts = timeInput.split(':');
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      if (h === 0) h = 12;
      return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
    }
  }

  return String(timeInput);
}

// Formats a date into '28 Sep 2026'
export function formatDateReadable(dateInput) {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

// Combines local 'YYYY-MM-DD' and local 'HH:MM' into a Date object
export function combineLocalDateAndTimeToDate(dateStr, timeStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  
  let hours = 10;
  let minutes = 0;

  if (timeStr) {
    if (/am|pm/i.test(timeStr)) {
      const isPM = /pm/i.test(timeStr);
      const clean = timeStr.replace(/(am|pm)/i, '').trim();
      const parts = clean.split(':').map(Number);
      hours = parts[0] || 10;
      minutes = parts[1] || 0;
      if (isPM && hours < 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
    } else {
      const parts = timeStr.split(':').map(Number);
      hours = parts[0] || 0;
      minutes = parts[1] || 0;
    }
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

// Checks if a given local date and time string has already passed
export function isDateTimeInPast(dateStr, timeStr) {
  const target = combineLocalDateAndTimeToDate(dateStr, timeStr);
  if (!target) return false;
  // 30 seconds buffer
  return target.getTime() < Date.now() - 30 * 1000;
}

// Calculates dynamic worker availability status
export function getWorkerAvailability(worker) {
  if (!worker) {
    return {
      isAvailable: true,
      isBusy: false,
      statusText: 'Available Now',
      badgeColor: '#10b981',
      badgeBg: '#ecfdf5',
      subtext: 'Accepting bookings'
    };
  }

  const now = new Date();
  let isAvail = worker.isAvailable !== false;
  const unavailableUntil = worker.unavailableUntil ? new Date(worker.unavailableUntil) : null;

  if (unavailableUntil && unavailableUntil <= now) {
    isAvail = true;
  }

  if (isAvail) {
    return {
      isAvailable: true,
      isBusy: false,
      statusText: 'Available Now',
      badgeColor: '#10b981',
      badgeBg: '#ecfdf5',
      subtext: 'Accepting appointments'
    };
  }

  if (unavailableUntil && unavailableUntil > now) {
    const timeStr = formatTime12h(unavailableUntil);
    const isToday = unavailableUntil.toDateString() === now.toDateString();
    const statusText = isToday 
      ? `Available after ${timeStr}`
      : `Busy until ${unavailableUntil.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;

    return {
      isAvailable: false,
      isBusy: true,
      statusText,
      badgeColor: '#d97706',
      badgeBg: '#fffbeb',
      subtext: `Unavailable until ${unavailableUntil.toLocaleString()}`
    };
  }

  return {
    isAvailable: false,
    isBusy: true,
    statusText: 'Currently Busy',
    badgeColor: '#ef4444',
    badgeBg: '#fef2f2',
    subtext: 'Busy / Offline'
  };
}
