const User = require('../models/User');
const JobRequest = require('../models/JobRequest');
const Notification = require('../models/Notification');

/**
 * Calculates haversine distance in meters between two [lng, lat] coordinate pairs.
 */
function calculateDistanceMeters(coord1, coord2) {
  if (!coord1 || !coord2 || coord1.length < 2 || coord2.length < 2) return Infinity;
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  if (isNaN(lng1) || isNaN(lat1) || isNaN(lng2) || isNaN(lat2)) return Infinity;

  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Determines current search radius based on elapsed time from job creation:
 * - 0–60s: 2,000 meters (2 km)
 * - 60–120s: 5,000 meters (5 km)
 * - 120–300s: 10,000 meters (10 km)
 */
function calculateCurrentRadius(createdAt) {
  const elapsedMs = Math.max(0, Date.now() - new Date(createdAt).getTime());
  const elapsedSec = elapsedMs / 1000;

  if (elapsedSec <= 60) {
    return { radiusMeters: 2000, radiusKm: 2, round: 1, label: 'Round 1 (2 km)' };
  } else if (elapsedSec <= 120) {
    return { radiusMeters: 5000, radiusKm: 5, round: 2, label: 'Round 2 (5 km)' };
  } else {
    return { radiusMeters: 10000, radiusKm: 10, round: 3, label: 'Round 3 (10 km)' };
  }
}

/**
 * Parses worker's configured service radius string (e.g. '15 km', '20', '10 km') to meters.
 */
function parseServiceRadiusMeters(radiusStr) {
  if (!radiusStr) return 25000; // default 25 km
  const match = String(radiusStr).match(/(\d+(\.\d+)?)/);
  if (match) {
    return parseFloat(match[1]) * 1000;
  }
  return 25000;
}

/**
 * Category to skill normalization mapping.
 */
const CATEGORY_SKILL_MAP = {
  'plumbing': ['plumber', 'plumbing', 'sanitary & pipeline', 'pipe', 'pipeline'],
  'electrical': ['electrician', 'electrical', 'wireman'],
  'carpentry': ['carpenter', 'carpentry', 'woodworker'],
  'locks': ['locksmith', 'locks', 'lock repair'],
  'painting': ['painter', 'painting', 'interior design'],
  'appliance repair': ['appliance repair', 'appliance', 'appliance repairman', 'refrigerator', 'washing machine'],
  'sanitation': ['sanitation', 'sanitary', 'cleaning', 'cleaner'],
  'cleaning': ['cleaning', 'cleaner', 'sanitation']
};

/**
 * Helper to match worker skills with requested emergency service category.
 * Respects distinct locksmith skill vs general carpentry.
 */
function isSkillMatch(workerSkills, serviceType, description = '') {
  if (!serviceType) return true;
  if (!workerSkills || !Array.isArray(workerSkills) || workerSkills.length === 0) return false;

  const normType = serviceType.toLowerCase().trim();
  const lowerSkills = workerSkills.map(s => s.toLowerCase().trim());
  const combinedDesc = `${normType} ${description}`.toLowerCase();

  // If specific lock emergency requested, worker must explicitly offer locksmith/lock skills
  const isLockSpecific = /\b(lock|locks|locksmith|lockout|jammed lock)\b/i.test(combinedDesc);
  if (normType.includes('carpentry') && isLockSpecific) {
    return lowerSkills.some(s => s.includes('lock') || s.includes('locksmith'));
  }

  // Check mapped categories
  for (const [catKey, skillList] of Object.entries(CATEGORY_SKILL_MAP)) {
    if (normType.includes(catKey) || catKey.includes(normType)) {
      const hasMatch = lowerSkills.some(s =>
        skillList.some(mappedSkill => s.includes(mappedSkill) || mappedSkill.includes(s))
      );
      if (hasMatch) return true;
    }
  }

  // Direct substring fallback match
  return lowerSkills.some(s => s.includes(normType) || normType.includes(s));
}

/**
 * Finds all eligible verified workers within radius for a given service category.
 * Uses worker's saved base service location (location.coordinates) as the reliable anchor.
 */
async function findEligibleWorkers(customerCoords, serviceType, radiusMeters, description = '') {
  if (!customerCoords || customerCoords.length < 2) return [];

  // Query verified workers with active accounts
  const workers = await User.find({
    role: 'worker',
    $or: [
      { verified: true },
      { verificationStatus: 'Verified' }
    ],
    accountStatus: { $ne: 'Suspended' }
  }).select('_id name email phone skills location currentLocation hourlyRate rating reviewsCount avatar isAvailable unavailableUntil emergencyOptIn serviceRadius');

  const eligible = [];
  for (const w of workers) {
    // 1. Skill & Category Match
    if (!isSkillMatch(w.skills, serviceType, description)) continue;

    // 2. Emergency Opt-in check (Allow busy workers to receive emergency offers if opted in)
    if (w.emergencyOptIn === false) continue;

    // 3. Saved service base location (primary) vs live GPS (fallback)
    const workerCoords = (w.location?.coordinates?.length === 2 && !isNaN(w.location.coordinates[0]))
      ? w.location.coordinates
      : (w.currentLocation?.coordinates?.length === 2 && !isNaN(w.currentLocation.coordinates[0]) ? w.currentLocation.coordinates : null);

    if (!workerCoords) continue;

    // 4. Distance check
    const distMeters = calculateDistanceMeters(customerCoords, workerCoords);

    // 5. Respect worker's own configured maximum service radius
    const workerMaxRadius = parseServiceRadiusMeters(w.serviceRadius);
    if (distMeters > workerMaxRadius) continue;

    // 6. Within current progressive search wave radius
    if (distMeters <= radiusMeters) {
      eligible.push({
        worker: w,
        distanceMeters: Math.round(distMeters),
        distanceKm: Number((distMeters / 1000).toFixed(1))
      });
    }
  }

  // Sort by nearest first
  eligible.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return eligible;
}

/**
 * Evaluates progressive search expansion and notifies newly eligible workers without duplicates.
 */
async function syncEmergencyBroadcast(jobIdOrDoc) {
  const job = typeof jobIdOrDoc === 'object' && jobIdOrDoc._id
    ? jobIdOrDoc
    : await JobRequest.findById(jobIdOrDoc);

  if (!job || !job.isEmergency) return null;

  const now = new Date();

  // If already accepted, completed, rejected, cancelled, don't expand
  if (['Accepted', 'Completed', 'Rejected', 'Cancelled'].includes(job.status)) {
    return job;
  }

  // Handle confirmation expiration if in EmergencyAcceptedPendingCustomer state
  if (job.status === 'EmergencyAcceptedPendingCustomer') {
    if (job.confirmationExpiresAt && now > job.confirmationExpiresAt) {
      // Customer failed to confirm within 2 minutes
      if (job.searchExpiresAt && now < job.searchExpiresAt) {
        // Reopen offer for other workers
        job.status = 'Open';
        job.workerId = null;
        job.claimedAt = null;
        job.confirmationExpiresAt = null;
        await job.save();
      } else {
        job.status = 'Expired';
        await job.save();
        return job;
      }
    } else {
      return job;
    }
  }

  // Handle general 5-minute search expiration
  const expiryTime = job.searchExpiresAt || job.expiresAt;
  if (expiryTime && now > expiryTime) {
    if (job.status === 'Open' || job.status === 'Pending') {
      job.status = 'Expired';
      await job.save();
    }
    return job;
  }

  if (job.status !== 'Open') return job;

  // Calculate current radius round (2km -> 5km -> 10km)
  const { radiusMeters } = calculateCurrentRadius(job.createdAt);
  job.broadcastRadius = radiusMeters;

  // Find eligible workers within this radius
  const customerCoords = job.customerLocation?.coordinates;
  if (!customerCoords || customerCoords.length < 2) {
    await job.save();
    return job;
  }

  const eligibleWorkers = await findEligibleWorkers(customerCoords, job.serviceType, radiusMeters, job.description);

  const existingNotified = new Set((job.notifiedWorkerIds || []).map(id => id.toString()));
  const newNotifiedIds = [];

  for (const item of eligibleWorkers) {
    const wId = item.worker._id.toString();
    if (!existingNotified.has(wId)) {
      existingNotified.add(wId);
      newNotifiedIds.push(item.worker._id);

      const minsLeft = Math.max(1, Math.ceil(((job.expiresAt || job.searchExpiresAt) - Date.now()) / 60000));
      const distText = `${item.distanceKm} km away`;
      const area = job.location || job.serviceAddress || 'Nearby area';

      await Notification.create({
        userId: item.worker._id,
        type: 'EMERGENCY_BOOKING_REQUEST',
        message: `🚨 PUBLIC EMERGENCY: ${job.serviceType} in ${area} (${distText}). Surcharge: +₹150. Respond within ${minsLeft}m!`,
        bookingId: job._id
      });
    }
  }

  if (newNotifiedIds.length > 0) {
    job.notifiedWorkerIds = Array.from(existingNotified);
  }

  await job.save();
  return job;
}

/**
 * Runs cleanup across all pending/open emergency requests.
 */
async function autoExpireEmergencyRequests() {
  try {
    const now = new Date();

    // 1. Expire Open or Pending requests whose 5m window has elapsed
    await JobRequest.updateMany(
      {
        isEmergency: true,
        status: { $in: ['Open', 'Pending'] },
        $or: [
          { expiresAt: { $lt: now } },
          { searchExpiresAt: { $lt: now } }
        ]
      },
      {
        $set: { status: 'Expired' }
      }
    );

    // 2. Check pending customer confirmations that expired
    const expiredConfirmations = await JobRequest.find({
      isEmergency: true,
      status: 'EmergencyAcceptedPendingCustomer',
      confirmationExpiresAt: { $lt: now }
    });

    for (const req of expiredConfirmations) {
      if (req.searchExpiresAt && now < req.searchExpiresAt) {
        req.status = 'Open';
        req.workerId = null;
        req.claimedAt = null;
        req.confirmationExpiresAt = null;
        await req.save();
      } else {
        req.status = 'Expired';
        await req.save();
      }
    }
  } catch (err) {
    console.error('Error auto-expiring emergency requests:', err.message);
  }
}

module.exports = {
  calculateDistanceMeters,
  calculateCurrentRadius,
  parseServiceRadiusMeters,
  isSkillMatch,
  findEligibleWorkers,
  syncEmergencyBroadcast,
  autoExpireEmergencyRequests
};
