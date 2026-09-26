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

require('dotenv').config();
const mongoose = require('mongoose');

async function runTests() {
  console.log('--- STARTING NEARFIX WORKER REGISTRATION & AADHAAR TESTS ---');
  let failures = 0;

  // Connect to DB and clear test records
  const mongoUri = process.env.MONGO_URI || 'mongodb+srv://shaanmohd786:s2P-B2E-g2h-74z@cluster0.o5cgh.mongodb.net/nearfix?retryWrites=true&w=majority&appName=Cluster0';
  await mongoose.connect(mongoUri);
  const User = require('./models/User');
  const AadhaarOtpVerification = require('./models/AadhaarOtpVerification');
  const OtpVerification = require('./models/OtpVerification');
  
  await User.deleteMany({ email: /^(worker_test|customer_test|worker2_)/ });
  await AadhaarOtpVerification.deleteMany({});
  await OtpVerification.deleteMany({ email: /^(worker_test|customer_test)/ });
  console.log('✅ Cleaned previous test database fixtures');

  function assert(condition, message, extra = null) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
    } else {
      console.error(`❌ FAIL: ${message}`, extra ? JSON.stringify(extra) : '');
      failures++;
    }
  }

  try {
    // 1. Send OTP with invalid Aadhaar format
    let res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/worker/aadhaar/send-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { aadhaarNumber: '12345' });
    assert(res.status === 400, 'Invalid Aadhaar format rejected (400)');

    // 2. Send OTP with Aadhaar not in demo registry
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/worker/aadhaar/send-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { aadhaarNumber: '999900001111' });
    assert(res.status === 400 && res.data.message.includes('not found in mock demo registry'), 'Unregistered demo Aadhaar rejected (400)');

    // 3. Send OTP with valid demo Aadhaar (1111 2222 3333)
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/worker/aadhaar/send-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { aadhaarNumber: '1111 2222 3333' });
    assert(res.status === 200 && res.data.maskedPhone === '******3210', 'Mock Aadhaar OTP generated, maskedPhone returned (******3210)', res);
    const demoAadhaarOtp = res.data.demoOtp;
    assert(!!demoAadhaarOtp, `Demo OTP exposed in dev mode (${demoAadhaarOtp})`, res);

    // 4. Test Cooldown protection (immediate resend)
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/worker/aadhaar/send-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { aadhaarNumber: '1111 2222 3333' });
    assert(res.status === 429, 'Immediate Aadhaar OTP resend rate-limited (429 cooldown)');

    // 5. Verify Aadhaar OTP with incorrect OTP
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/worker/aadhaar/verify-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { aadhaarNumber: '1111 2222 3333', otp: '000000' });
    assert(res.status === 400 && res.data.message.includes('remaining'), 'Incorrect Aadhaar OTP rejected and shows remaining attempts');

    // 6. Verify Aadhaar OTP with correct OTP
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/worker/aadhaar/verify-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { aadhaarNumber: '1111 2222 3333', otp: demoAadhaarOtp });
    assert(res.status === 200 && !!res.data.aadhaarVerificationToken, 'Valid Aadhaar OTP verified & aadhaarVerificationToken issued');
    const aadhaarToken = res.data.aadhaarVerificationToken;

    // 7. Verify OTP cannot be reused
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/worker/aadhaar/verify-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { aadhaarNumber: '1111 2222 3333', otp: demoAadhaarOtp });
    assert(res.status === 400, 'Used Aadhaar OTP cannot be reused (400)');

    // 8. Generate Email OTP for worker
    const workerEmail = `worker_test_${Date.now()}@example.com`;
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/send-register-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: workerEmail });
    assert(res.status === 200, 'Email OTP sent/generated');
    const demoEmailOtp = res.data.demoOtp;

    // 9. Verify Email OTP
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/verify-register-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: workerEmail, otp: demoEmailOtp });
    assert(res.status === 200 && !!res.data.emailVerificationToken, 'Email OTP verified & emailVerificationToken issued');
    const emailToken = res.data.emailVerificationToken;

    // 10. Attempt Worker Registration without Aadhaar token
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      name: 'Arun Kumar',
      email: workerEmail,
      phone: '9876543210',
      password: 'Password@123',
      role: 'worker',
      category: 'Repair & Technical',
      skills: ['Laptop Repair Technician'],
      location: '123 Main Road, Kochi',
      emailVerificationToken: emailToken
    });
    assert(res.status === 400 && res.data.message.includes('Aadhaar'), 'Worker registration without Aadhaar token rejected');

    // 11. Attempt Worker Registration with weak password
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      name: 'Arun Kumar',
      email: workerEmail,
      phone: '9876543210',
      password: 'weak',
      role: 'worker',
      category: 'Repair & Technical',
      skills: ['Laptop Repair Technician'],
      location: '123 Main Road, Kochi',
      emailVerificationToken: emailToken,
      aadhaarVerificationToken: aadhaarToken
    });
    assert(res.status === 400 && res.data.message.includes('Password must be'), 'Worker registration with weak password rejected');

    // 12. Attempt Worker Registration with invalid phone (e.g. 5 digits or starting with 1)
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      name: 'Arun Kumar',
      email: workerEmail,
      phone: '1234567890',
      password: 'Password@123',
      role: 'worker',
      category: 'Repair & Technical',
      skills: ['Laptop Repair Technician'],
      location: '123 Main Road, Kochi',
      emailVerificationToken: emailToken,
      aadhaarVerificationToken: aadhaarToken
    });
    assert(res.status === 400 && res.data.message.includes('Indian mobile number'), 'Worker registration with invalid phone rejected');

    // 13. Valid Worker Registration
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      name: 'Arun Kumar',
      email: workerEmail,
      phone: '9876543210',
      password: 'Password@123',
      role: 'worker',
      category: 'Repair & Technical',
      skills: ['Laptop Repair Technician'],
      location: '123 Main Road, Kochi, Kerala',
      emailVerificationToken: emailToken,
      aadhaarVerificationToken: aadhaarToken
    });
    assert(
      res.status === 201 &&
      res.data.user.role === 'worker' &&
      res.data.user.aadhaarVerified === true &&
      res.data.user.verificationStatus === 'Pending',
      'Worker account created successfully with aadhaarVerified=true & verificationStatus=Pending'
    );

    // 14. Duplicate Aadhaar prevention test
    // Request new email OTP and new Aadhaar OTP with SAME Aadhaar (111122223333)
    const workerEmail2 = `worker2_${Date.now()}@example.com`;
    // Wait for cooldown or check duplicate Aadhaar rejection at send-otp
    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/worker/aadhaar/send-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { aadhaarNumber: '111122223333' });
    // Since 111122223333 is now registered to Arun Kumar, send-otp or register should reject it
    assert(res.status === 400 && res.data.message.includes('already linked'), 'Duplicate registered Aadhaar prevented from sending OTP (400)', res);

    // 15. Customer registration remains backward compatible (no Aadhaar needed)
    const customerEmail = `customer_test_${Date.now()}@example.com`;
    const custOtpRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/send-register-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: customerEmail });
    const custEmailTokenRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/verify-register-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: customerEmail, otp: custOtpRes.data.demoOtp });

    res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      name: 'Priya Sharma',
      email: customerEmail,
      phone: '9876500000',
      password: 'Password@123',
      role: 'customer',
      emailVerificationToken: custEmailTokenRes.data.emailVerificationToken
    });
    assert(res.status === 201 && res.data.user.role === 'customer', 'Customer registration still functions normally with email verification only');

  } catch (err) {
    console.error('Test execution error:', err);
    failures++;
  }

  console.log(`\n--- TEST SUMMARY: ${failures === 0 ? 'ALL TESTS PASSED' : failures + ' TESTS FAILED'} ---`);
  process.exit(failures === 0 ? 0 : 1);
}

runTests();
