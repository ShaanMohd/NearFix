const crypto = require('crypto');

/**
 * Normalizes and hashes an Aadhaar number using SHA-256
 * @param {string|number} aadhaar 
 * @returns {string} SHA-256 hash in hex format
 */
const hashAadhaar = (aadhaar) => {
  const normalized = (aadhaar || '').toString().replace(/\s+/g, '').trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

/**
 * Development & Academic Demo Aadhaar Registry.
 * NOTE: This is NOT connected to UIDAI. All records below are simulated mock test records.
 */
const DEMO_AADHAAR_REGISTRY = [
  {
    aadhaarNumber: '111122223333',
    aadhaarLast4: '3333',
    name: 'Arun Kumar',
    phone: '9876543210',
    isActive: true
  },
  {
    aadhaarNumber: '444455556666',
    aadhaarLast4: '6666',
    name: 'Meera Nair',
    phone: '9123456789',
    isActive: true
  },
  {
    aadhaarNumber: '999988887777',
    aadhaarLast4: '7777',
    name: 'Rajesh V',
    phone: '9447123456',
    isActive: true
  },
  {
    aadhaarNumber: '555566667777',
    aadhaarLast4: '7777',
    name: 'Mohammed Shaan',
    phone: '9847112233',
    isActive: true
  },
  {
    aadhaarNumber: '123412341234',
    aadhaarLast4: '1234',
    name: 'Demo Service Worker',
    phone: '9895012345',
    isActive: true
  }
].map(item => ({
  ...item,
  aadhaarHash: hashAadhaar(item.aadhaarNumber)
}));

/**
 * Searches demo registry by normalized 12-digit number or 64-char hash
 */
const findDemoAadhaar = (aadhaarInput) => {
  const clean = (aadhaarInput || '').toString().replace(/\s+/g, '').trim();
  const hash = clean.length === 64 ? clean : hashAadhaar(clean);
  return DEMO_AADHAAR_REGISTRY.find(record => record.aadhaarHash === hash && record.isActive);
};

module.exports = {
  DEMO_AADHAAR_REGISTRY,
  hashAadhaar,
  findDemoAadhaar
};
