const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('--- Starting Comprehensive NearFix Profile Management Tests ---');
  
  // 1. Customer Login
  console.log('\n[TEST 1] Logging in as Customer (customer@example.com)...');
  const custLoginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customer@example.com', password: 'password123' })
  });
  const custLoginData = await custLoginRes.json();
  if (!custLoginRes.ok) throw new Error('Customer login failed: ' + JSON.stringify(custLoginData));
  const customerToken = custLoginData.token;
  console.log('✓ Customer logged in successfully.');

  // 2. Avatar Upload for Customer (PNG)
  console.log('\n[TEST 2] Testing Profile Picture Upload for Customer...');
  // 1x1 valid PNG buffer
  const samplePngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  
  const blob = new Blob([samplePngBuffer], { type: 'image/png' });
  const formData = new FormData();
  formData.append('avatar', blob, 'test_avatar.png');

  const avatarRes = await fetch('http://localhost:5000/api/users/me/avatar', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${customerToken}` },
    body: formData
  });
  const avatarData = await avatarRes.json();
  if (!avatarRes.ok) throw new Error('Avatar upload failed: ' + JSON.stringify(avatarData));
  console.log('✓ Avatar uploaded:', avatarData.avatar);
  
  if (!avatarData.avatar.startsWith('/uploads/avatars/avatar-')) {
    throw new Error('Avatar path unexpected: ' + avatarData.avatar);
  }

  // Verify file on disk and static serving
  const staticRes = await fetch(`http://localhost:5000${avatarData.avatar}`);
  if (!staticRes.ok) throw new Error('Static file serving failed with status: ' + staticRes.status);
  console.log('✓ Static avatar serving verified via Express static route.');

  // 3. File type validation rejection
  console.log('\n[TEST 3] Testing Invalid File Format Rejection (text/plain)...');
  const txtBlob = new Blob(['hello world text file'], { type: 'text/plain' });
  const txtForm = new FormData();
  txtForm.append('avatar', txtBlob, 'doc.txt');

  const rejectTypeRes = await fetch('http://localhost:5000/api/users/me/avatar', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${customerToken}` },
    body: txtForm
  });
  const rejectTypeData = await rejectTypeRes.json();
  console.log('Response status:', rejectTypeRes.status, 'Message:', rejectTypeData.message);
  if (rejectTypeRes.status !== 400 || !rejectTypeData.message.includes('Only JPG, PNG and WebP')) {
    throw new Error('MIME validation failed to reject text file properly: ' + JSON.stringify(rejectTypeData));
  }
  console.log('✓ Unsupported file format correctly rejected with 400.');

  // 4. File size validation rejection (>5MB)
  console.log('\n[TEST 4] Testing File Size Limit Rejection (> 5 MB)...');
  const bigBuffer = Buffer.alloc(5.5 * 1024 * 1024); // 5.5MB
  const bigBlob = new Blob([bigBuffer], { type: 'image/png' });
  const bigForm = new FormData();
  bigForm.append('avatar', bigBlob, 'big.png');

  const rejectSizeRes = await fetch('http://localhost:5000/api/users/me/avatar', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${customerToken}` },
    body: bigForm
  });
  const rejectSizeData = await rejectSizeRes.json();
  console.log('Response status:', rejectSizeRes.status, 'Message:', rejectSizeData.message);
  if (rejectSizeRes.status !== 400 || !rejectSizeData.message.includes('5 MB')) {
    throw new Error('File size validation failed to reject 5.5MB file: ' + JSON.stringify(rejectSizeData));
  }
  console.log('✓ Oversized file correctly rejected with 400.');

  // 5. Customer Profile Update with Name, Phone, Address, and GeoJSON coordinates
  console.log('\n[TEST 5] Testing Customer Profile Update (Name, Phone, Address, GeoJSON)...');
  const updateCustRes = await fetch('http://localhost:5000/api/users/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      name: 'John Customer Verified',
      phone: '9847123456',
      address: 'Near Beach Road, Kozhikode, Kerala',
      location: {
        type: 'Point',
        coordinates: [75.7804, 11.2588] // [longitude, latitude]
      }
    })
  });
  const updateCustData = await updateCustRes.json();
  if (!updateCustRes.ok) throw new Error('Customer profile update failed: ' + JSON.stringify(updateCustData));
  console.log('✓ Customer profile updated: Name =', updateCustData.name, 'Phone =', updateCustData.phone, 'Coordinates =', updateCustData.location.coordinates);
  if (updateCustData.location.coordinates[0] !== 75.7804 || updateCustData.location.coordinates[1] !== 11.2588) {
    throw new Error('GeoJSON coordinates order incorrect!');
  }
  console.log('✓ GeoJSON coordinates verified as [longitude, latitude].');

  // 6. Customer Password Change
  console.log('\n[TEST 6] Testing Dedicated Password Change endpoint (/api/users/me/password)...');
  // Wrong current password
  const wrongPassRes = await fetch('http://localhost:5000/api/users/me/password', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      currentPassword: 'wrongPassword123',
      newPassword: 'NewPassword@2026',
      confirmPassword: 'NewPassword@2026'
    })
  });
  if (wrongPassRes.status !== 400) throw new Error('Did not reject wrong current password');
  console.log('✓ Wrong current password rejected.');

  // Weak password
  const weakPassRes = await fetch('http://localhost:5000/api/users/me/password', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      currentPassword: 'password123',
      newPassword: 'simple',
      confirmPassword: 'simple'
    })
  });
  if (weakPassRes.status !== 400) throw new Error('Did not reject weak password');
  console.log('✓ Weak password rejected with complexity error.');

  // Successful change
  const goodPassRes = await fetch('http://localhost:5000/api/users/me/password', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      currentPassword: 'password123',
      newPassword: 'NewPassword@2026',
      confirmPassword: 'NewPassword@2026'
    })
  });
  const goodPassData = await goodPassRes.json();
  if (!goodPassRes.ok) throw new Error('Password change failed: ' + JSON.stringify(goodPassData));
  console.log('✓ Password changed successfully.');

  // Verify login with new password
  const reLoginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customer@example.com', password: 'NewPassword@2026' })
  });
  if (!reLoginRes.ok) throw new Error('Login with new password failed');
  console.log('✓ Customer successfully logged in with newly updated password.');

  // Reset customer password back for reproducibility
  await fetch('http://localhost:5000/api/users/me/password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(await reLoginRes.json()).token}` },
    body: JSON.stringify({ currentPassword: 'NewPassword@2026', newPassword: 'password123', confirmPassword: 'password123' })
  });

  // 7. Worker Login & Profile Management
  console.log('\n[TEST 7] Testing Worker Profile & Avatar Management (rajesh@example.com)...');
  const workerLoginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rajesh@example.com', password: 'password123' })
  });
  const workerLoginData = await workerLoginRes.json();
  const workerToken = workerLoginData.token;

  // Upload Worker Avatar (WebP)
  const workerAvatarForm = new FormData();
  workerAvatarForm.append('avatar', blob, 'worker_pic.webp');
  const workerAvatarRes = await fetch('http://localhost:5000/api/users/me/avatar', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${workerToken}` },
    body: workerAvatarForm
  });
  const workerAvatarData = await workerAvatarRes.json();
  if (!workerAvatarRes.ok) throw new Error('Worker avatar upload failed: ' + JSON.stringify(workerAvatarData));
  console.log('✓ Worker avatar uploaded:', workerAvatarData.avatar);

  // 8. Admin Login & Settings Management
  console.log('\n[TEST 8] Testing Admin Settings & Avatar Management (admin@nearfix.com)...');
  const adminLoginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@nearfix.com', password: 'password123' })
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.token;

  // Admin Avatar Upload
  const adminAvatarForm = new FormData();
  adminAvatarForm.append('avatar', blob, 'admin_profile.jpg');
  const adminAvatarRes = await fetch('http://localhost:5000/api/users/me/avatar', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${adminToken}` },
    body: adminAvatarForm
  });
  const adminAvatarData = await adminAvatarRes.json();
  if (!adminAvatarRes.ok) throw new Error('Admin avatar upload failed: ' + JSON.stringify(adminAvatarData));
  console.log('✓ Admin avatar uploaded successfully:', adminAvatarData.avatar);

  // Admin Name Update
  const adminNameRes = await fetch('http://localhost:5000/api/admin/settings/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ name: 'Head Administrator' })
  });
  const adminNameData = await adminNameRes.json();
  if (!adminNameRes.ok) throw new Error('Admin name update failed: ' + JSON.stringify(adminNameData));
  console.log('✓ Administrator name updated:', adminNameData.user.name);

  console.log('\n======================================================');
  console.log('🎉 ALL PROFILE MANAGEMENT TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
