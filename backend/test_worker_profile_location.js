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

async function runTests() {
  console.log('--- STARTING WORKER PROFILE & LOCATION TESTS ---');
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
    // 1. Worker Login (rajesh@example.com / password123)
    let loginRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'rajesh@example.com', password: 'password123' });

    assert(loginRes.status === 200 && !!loginRes.data.token, 'Worker login successful & JWT token received');
    const token = loginRes.data.token;
    const workerId = loginRes.data.user.id || loginRes.data.user._id;

    // 2. Existing availability toggle check (PUT /api/users/profile with isAvailable: false)
    let res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/profile',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, { isAvailable: false });
    assert(res.status === 200 && res.data.isAvailable === false, 'Existing isAvailable toggle: set to false (OFFLINE)');

    // Toggle back to true (ONLINE)
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/profile',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, { isAvailable: true });
    assert(res.status === 200 && res.data.isAvailable === true, 'Existing isAvailable toggle: set to true (ONLINE)');

    // 3. Update Worker Profile with all editable fields & normal service location
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/profile',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      name: 'Rajesh V. Kumar',
      phone: '9876543210',
      title: 'Master Electrician & Automation Specialist',
      bio: 'Over 6 years of expertise in electrical diagnostics, commercial wiring, and home automation.',
      skills: ['Electrical', 'Wiring', 'Automation', 'Solar Installation'],
      experienceYears: 6,
      serviceRadius: '25 km',
      serviceMode: 'Both',
      pricingType: 'Hourly',
      startingPrice: 650,
      businessName: 'Rajesh ElectroTech Solutions',
      address: 'Mavoor Road, Kozhikode, Kerala',
      location: {
        type: 'Point',
        coordinates: [75.7890, 11.2650] // GeoJSON [longitude, latitude]
      }
    });

    assert(
      res.status === 200 &&
      res.data.name === 'Rajesh V. Kumar' &&
      res.data.phone === '9876543210' &&
      res.data.title === 'Master Electrician & Automation Specialist' &&
      res.data.experienceYears === 6 &&
      res.data.serviceMode === 'Both' &&
      res.data.startingPrice === 650 &&
      res.data.businessName === 'Rajesh ElectroTech Solutions' &&
      res.data.location?.coordinates?.[0] === 75.7890 &&
      res.data.location?.coordinates?.[1] === 11.2650,
      'Worker profile edited successfully with base service location coordinates'
    );

    // 4. Verify protected fields cannot be altered via profile update
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/profile',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      role: 'admin',
      rating: 5.0,
      reviewsCount: 999,
      accountStatus: 'Suspended',
      verificationStatus: 'Rejected'
    });

    assert(
      res.status === 200 &&
      res.data.role === 'worker' &&
      res.data.rating !== 5.0 &&
      res.data.accountStatus === 'Active' &&
      res.data.verificationStatus === 'Verified',
      'Protected fields (role, rating, accountStatus, verificationStatus) ignored & unchanged'
    );

    // 5. Test validation rejections
    // Invalid phone
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/profile',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, { phone: '12345' });
    assert(res.status === 400 && res.data.message.includes('Indian mobile number'), 'Invalid phone number rejected (400)');

    // Invalid name
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/profile',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, { name: '12345' });
    assert(res.status === 400 && res.data.message.includes('Full Name'), 'Numbers-only name rejected (400)');

    // Invalid service radius
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/profile',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, { serviceRadius: 150 });
    assert(res.status === 400 && res.data.message.includes('Service Radius'), 'Out-of-range service radius (>100 km) rejected (400)');

    // Invalid coordinates
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/profile',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      location: {
        type: 'Point',
        coordinates: [200, 95] // Out of range
      }
    });
    assert(res.status === 400 && res.data.message.includes('coordinates'), 'Out-of-range coordinates rejected (400)');

    // 6. Test PUT /api/users/current-location
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/current-location',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      coordinates: [75.7855, 11.2615] // [longitude, latitude]
    });

    assert(
      res.status === 200 &&
      res.data.currentLocation?.type === 'Point' &&
      res.data.currentLocation?.coordinates?.[0] === 75.7855 &&
      res.data.currentLocation?.coordinates?.[1] === 11.2615 &&
      !!res.data.currentLocation?.updatedAt,
      'Current physical location updated via PUT /api/users/current-location'
    );

    // 7. Test PUT /api/workers/current-location route alias with { latitude, longitude }
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/workers/current-location',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      latitude: 11.2620,
      longitude: 75.7865
    });

    assert(
      res.status === 200 &&
      res.data.currentLocation?.coordinates?.[0] === 75.7865 &&
      res.data.currentLocation?.coordinates?.[1] === 11.2620,
      'Current physical location updated via alias PUT /api/workers/current-location'
    );

    // 8. Test Customer Discovery Map (/api/users/workers)
    // Ensures discovery still uses normal service location (User.location) and respects verification
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/workers?verifiedOnly=true',
      method: 'GET'
    });

    assert(res.status === 200 && Array.isArray(res.data) && res.data.length > 0, 'Customer discovery returns verified active workers');
    const rajeshInDiscovery = res.data.find(w => w._id === workerId || w.email === 'rajesh@example.com');
    assert(
      rajeshInDiscovery &&
      rajeshInDiscovery.location?.coordinates?.[0] === 75.7890 &&
      rajeshInDiscovery.location?.coordinates?.[1] === 11.2650,
      'Discovery map uses normal service location (User.location: [75.7890, 11.2650]), NOT currentLocation'
    );

  } catch (err) {
    console.error('Test execution error:', err);
    failures++;
  }

  console.log(`\n--- TEST SUMMARY: ${failures === 0 ? 'ALL TESTS PASSED' : failures + ' TESTS FAILED'} ---`);
  process.exit(failures === 0 ? 0 : 1);
}

runTests();
