const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

function getJob(res) {
  return res.data?.job || res.data;
}

function getUser(res) {
  return res.data?.user || res.data;
}

async function runBookingAvailabilityTests() {
  console.log('====================================================');
  console.log('--- STARTING NEARFIX BOOKING & AVAILABILITY SUITE ---');
  console.log('====================================================\n');

  let failures = 0;

  function assert(condition, message, extra = null) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
    } else {
      console.error(`❌ FAIL: ${message}`, extra ? JSON.stringify(extra) : '');
      failures++;
    }
  }

  try {
    // 1. Authenticate Customer (customer@example.com / password123)
    const customerLogin = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'customer@example.com', password: 'password123' });

    assert(customerLogin.status === 200 && !!customerLogin.data.token, 'Customer login successful');
    const customerToken = customerLogin.data.token;
    const customerId = customerLogin.data.user.id || customerLogin.data.user._id;

    // 2. Authenticate Worker (rajesh@example.com / password123)
    const workerLogin = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'rajesh@example.com', password: 'password123' });

    assert(workerLogin.status === 200 && !!workerLogin.data.token, 'Worker login successful');
    const workerToken = workerLogin.data.token;
    const workerId = workerLogin.data.user.id || workerLogin.data.user._id;

    // Reset worker availability to clean state and clear customer test bookings
    const jobModel = require('./models/JobRequest');
    const mongoose = require('mongoose');
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nearfix';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    await jobModel.deleteMany({ customerId });

    await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/profile',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${workerToken}`
      }
    }, { isAvailable: true, unavailableUntil: null });

    // 3. Scenario 1: Booking with past date is rejected
    const pastBookingRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/jobs',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      }
    }, {
      workerId: workerId,
      category: 'Electrical',
      description: 'Fix bathroom pipe leakage',
      bookingType: 'Normal',
      preferredDate: '1990-02-15',
      preferredTime: '10:00 AM',
      serviceAddress: '123 Main Street',
      estimatedCost: 350
    });

    assert(pastBookingRes.status === 400, 'Scenario 1: Past date (1990-02-15) rejected with HTTP 400', pastBookingRes.data);

    // 4. Scenario 3: Past time today is rejected
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // An hour in the past today
    let pastHour = now.getHours() - 2;
    if (pastHour >= 0) {
      const pastTimeStr = `${String(pastHour).padStart(2, '0')}:00`;
      const pastTimeRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/jobs',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${customerToken}`
        }
      }, {
        workerId: workerId,
        category: 'Electrical',
        description: 'Past time test',
        bookingType: 'Normal',
        preferredDate: todayStr,
        preferredTime: pastTimeStr,
        serviceAddress: '123 Main Street',
        estimatedCost: 350
      });
      assert(pastTimeRes.status === 400, `Scenario 3: Past time today (${pastTimeStr}) rejected with HTTP 400`, pastTimeRes.data);
    } else {
      console.log('ℹ️ Skipping early morning past time check as local hour < 2 AM');
    }

    // 5. Scenario 4: Flexible arbitrary appointment time (e.g. tomorrow at 09:35 AM) is accepted
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    
    const arbitraryTimeRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/jobs',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      }
    }, {
      workerId: workerId,
      category: 'Electrical',
      description: 'Arbitrary time appointment at 09:35 AM',
      bookingType: 'Normal',
      preferredDate: tomorrowStr,
      preferredTime: '09:35',
      estimatedDuration: 60,
      serviceAddress: '123 Main Street',
      estimatedCost: 400
    });

    const createdJob = getJob(arbitraryTimeRes);
    assert(arbitraryTimeRes.status === 201 && createdJob?._id, 'Scenario 4: Arbitrary time (09:35 AM) booking accepted', arbitraryTimeRes.data);
    const normalJobId = createdJob?._id;

    // Worker accepts this normal booking to make it a confirmed appointment
    const acceptNormalRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/jobs/${normalJobId}/status`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${workerToken}`
      }
    }, { status: 'Accepted' });

    const acceptedJob = getJob(acceptNormalRes);
    assert(acceptNormalRes.status === 200 && acceptedJob?.status === 'Accepted', 'Worker confirmed normal appointment', acceptNormalRes.data);

    // 6. Scenario 8: Conflicted / Overlapping normal booking with confirmed appointment is rejected
    const overlapBookingRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/jobs',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      }
    }, {
      workerId: workerId,
      category: 'Electrical',
      description: 'Overlapping request at 09:50 AM (within 09:35 - 10:35 window)',
      bookingType: 'Normal',
      preferredDate: tomorrowStr,
      preferredTime: '09:50',
      estimatedDuration: 45,
      serviceAddress: '123 Main Street',
      estimatedCost: 350
    });

    assert(overlapBookingRes.status === 409, 'Scenario 8: Overlapping booking (09:50 AM during 09:35-10:35) rejected with HTTP 409', overlapBookingRes.data);

    // 7. Scenario 5: Worker sets themselves Busy until a specific time (unavailableUntil)
    const unavailableUntilTime = new Date(Date.now() + 4 * 3600 * 1000); // 4 hours in future
    const setBusyRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/profile',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${workerToken}`
      }
    }, {
      isAvailable: false,
      unavailableUntil: unavailableUntilTime.toISOString()
    });

    const updatedWorkerProfile = getUser(setBusyRes);
    assert(setBusyRes.status === 200 && updatedWorkerProfile.isAvailable === false, 'Scenario 5: Worker set Busy with unavailableUntil timestamp', setBusyRes.data);

    // 8. Scenario 6: Busy worker remains visible in Discover / Worker listings
    const workersRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/workers',
      method: 'GET'
    });

    const busyWorkerFound = workersRes.data?.find(w => (w._id === workerId || w.id === workerId));
    assert(workersRes.status === 200 && !!busyWorkerFound, 'Scenario 6: Busy worker remains visible in worker discovery list');
    assert(busyWorkerFound && busyWorkerFound.unavailableUntil !== undefined, 'Busy worker includes unavailableUntil field in discovery');

    // 9. Scenario 7: Normal booking during worker unavailable window is rejected
    // Pick a time 1 hour from now (within the 4-hour busy window)
    const oneHourFromNow = new Date(Date.now() + 1 * 3600 * 1000);
    const busyDateStr = `${oneHourFromNow.getFullYear()}-${String(oneHourFromNow.getMonth() + 1).padStart(2, '0')}-${String(oneHourFromNow.getDate()).padStart(2, '0')}`;
    const busyTimeStr = `${String(oneHourFromNow.getHours()).padStart(2, '0')}:${String(oneHourFromNow.getMinutes()).padStart(2, '0')}`;

    const busyWindowBookingRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/jobs',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      }
    }, {
      workerId: workerId,
      category: 'Electrical',
      description: 'Attempt booking during unavailable window',
      bookingType: 'Normal',
      preferredDate: busyDateStr,
      preferredTime: busyTimeStr,
      estimatedDuration: 60,
      serviceAddress: '123 Main Street',
      estimatedCost: 350
    });

    assert(busyWindowBookingRes.status === 409, 'Scenario 7: Normal booking during worker unavailable window rejected with HTTP 409', busyWindowBookingRes.data);

    // 10. Scenario 9: Emergency offer CAN reach busy workers
    const emergencyRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/jobs',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      }
    }, {
      workerId: workerId,
      category: 'Electrical',
      description: 'Burst electrical switch sparking dangerously!',
      bookingType: 'Emergency',
      serviceAddress: '123 Main Street',
      estimatedCost: 500,
      emergencyCharge: 150,
      totalAmount: 650
    });

    const emergencyJob = getJob(emergencyRes);
    assert(emergencyRes.status === 201 && emergencyJob?.isEmergency === true, 'Scenario 9: Emergency offer reaches busy worker with ₹150 surcharge', emergencyRes.data);
    const emergencyJobId = emergencyJob?._id;
    assert(emergencyJob?.expiresAt !== undefined, 'Emergency offer has 5-minute expiresAt timestamp set');

    // 11. Scenario 10 & 11: Worker accepts emergency offer with estimated arrival time (ETA)
    const workerAcceptEmergencyRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/jobs/${emergencyJobId}/status`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${workerToken}`
      }
    }, {
      status: 'EmergencyAcceptedPendingCustomer',
      estimatedArrivalTime: '20 minutes'
    });

    const pendingEmergencyJob = getJob(workerAcceptEmergencyRes);
    assert(
      workerAcceptEmergencyRes.status === 200 &&
      pendingEmergencyJob?.status === 'EmergencyAcceptedPendingCustomer' &&
      pendingEmergencyJob?.estimatedArrivalTime === '20 minutes',
      'Scenario 10 & 11 (Worker): Worker responds with estimated arrival time (20 minutes)',
      workerAcceptEmergencyRes.data
    );

    // Customer confirms the emergency dispatch
    const customerConfirmEmergencyRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/jobs/${emergencyJobId}/status`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      }
    }, {
      status: 'Accepted'
    });

    const confirmedEmergencyJob = getJob(customerConfirmEmergencyRes);
    assert(
      customerConfirmEmergencyRes.status === 200 &&
      confirmedEmergencyJob?.status === 'Accepted',
      'Scenario 11 (Customer): Customer confirms emergency dispatch, booking becomes Accepted',
      customerConfirmEmergencyRes.data
    );

    // 12. Scenario 12: Emergency offers expire if unanswered after 5 minutes
    // Create an emergency offer with expiresAt set in the past to test expiration trigger
    const expiredEmergencyOffer = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/jobs',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      }
    }, {
      workerId: workerId,
      category: 'Electrical',
      description: 'Emergency test to verify 5-minute timeout',
      bookingType: 'Emergency',
      serviceAddress: '123 Main Street',
      estimatedCost: 500,
      emergencyCharge: 150,
      totalAmount: 650
    });

    const expJob = getJob(expiredEmergencyOffer);
    const expJobId = expJob?._id;

    // Simulate 5 minutes having passed by updating expiresAt to the past in database
    await jobModel.findByIdAndUpdate(expJobId, { expiresAt: new Date(Date.now() - 60000) });

    // Now trigger GET /api/jobs which executes autoExpireEmergencyRequests()
    await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/jobs',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${workerToken}` }
    });

    const checkExpiredJob = await jobModel.findById(expJobId);
    assert(checkExpiredJob.status === 'Expired', 'Scenario 12: Unanswered emergency offer automatically marked Expired after 5 minutes');

    // Worker attempts to accept expired offer -> must be rejected
    const acceptExpiredAttempt = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/jobs/${expJobId}/status`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${workerToken}`
      }
    }, {
      status: 'EmergencyAcceptedPendingCustomer',
      estimatedArrivalTime: '15 mins'
    });

    assert(acceptExpiredAttempt.status === 400, 'Expired emergency offer cannot be accepted afterward (HTTP 400)', acceptExpiredAttempt.data);

    // 13. Scenario: Worker proposes alternative appointment time
    const futureDate = new Date(Date.now() + 3 * 24 * 3600 * 1000);
    const futureDateStr = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;

    const altBookingRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/jobs',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      }
    }, {
      workerId: workerId,
      category: 'Electrical',
      description: 'Book for 3 days later',
      bookingType: 'Normal',
      preferredDate: futureDateStr,
      preferredTime: '15:00',
      estimatedDuration: 60,
      serviceAddress: '123 Main Street',
      estimatedCost: 350
    });

    const altJob = getJob(altBookingRes);
    const altJobId = altJob?._id;

    // Worker proposes 16:30 instead
    const proposeRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/jobs/${altJobId}/status`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${workerToken}`
      }
    }, {
      status: 'RescheduleProposed',
      proposedDate: futureDateStr,
      proposedTime: '16:30',
      proposedReason: 'Currently on another site until 4 PM'
    });

    const proposedJob = getJob(proposeRes);
    assert(proposeRes.status === 200 && proposedJob?.status === 'RescheduleProposed', 'Worker proposed alternative appointment time', proposeRes.data);

    // Customer accepts the proposed alternative
    const customerAcceptAltRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/jobs/${altJobId}/status`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      }
    }, {
      status: 'Accepted'
    });

    const customerAcceptedJob = getJob(customerAcceptAltRes);
    assert(customerAcceptAltRes.status === 200 && customerAcceptedJob?.status === 'Accepted', 'Customer approved proposed alternative appointment time', customerAcceptAltRes.data);

    // 14. Reset Worker availability back to Available
    const setAvailableRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/profile',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${workerToken}`
      }
    }, {
      isAvailable: true,
      unavailableUntil: null
    });

    const finalWorker = getUser(setAvailableRes);
    assert(setAvailableRes.status === 200 && finalWorker.isAvailable === true, 'Worker manually reset status back to Available');

    console.log('\n====================================================');
    if (failures === 0) {
      console.log('🎉 ALL BOOKING & AVAILABILITY SYSTEM TESTS PASSED! 🎉');
    } else {
      console.error(`💥 ${failures} TEST(S) FAILED!`);
    }
    console.log('====================================================\n');

    process.exit(failures > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runBookingAvailabilityTests();
