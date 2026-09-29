const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Project = require('./models/Project');
const Complaint = require('./models/Complaint');
const JobRequest = require('./models/JobRequest');
const Notification = require('./models/Notification');
const Review = require('./models/Review');

async function seedData(options = {}) {
  const force = options && options.force === true;
  const userCount = await User.countDocuments();

  if (userCount > 0 && !force) {
    console.log(`[Seed] Database already contains ${userCount} users. Skipping seed to protect user data.`);
    return;
  }

  // Clear existing development data ONLY when force is explicitly set
  if (force) {
    await User.deleteMany({});
    await Project.deleteMany({});
    await Complaint.deleteMany({});
    await JobRequest.deleteMany({});
    await Notification.deleteMany({});
    await Review.deleteMany({});
    console.log('[Seed] Cleared existing database models (forced reset).');
  }

  const salt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash('password123', salt);

  // 1 Admin User
  const adminUser = new User({
    name: 'Platform Admin',
    email: 'admin@nearfix.com',
    password,
    role: 'admin',
    phone: '+91 9999900000',
    address: 'Kozhikode HQ, Kerala',
    location: { type: 'Point', coordinates: [75.7804, 11.2588] },
    avatar: ''
  });
  await adminUser.save();

  // Customers
  const customer1 = new User({
    name: 'Anjali Nair',
    email: 'customer@example.com',
    password,
    role: 'customer',
    phone: '+91 9876543210',
    address: 'Mavoor Road, Kozhikode, Kerala',
    location: { type: 'Point', coordinates: [75.7800, 11.2580] },
    avatar: ''
  });
  await customer1.save();

  const customer2 = new User({
    name: 'Arjun Menon',
    email: 'arjun@example.com',
    password,
    role: 'customer',
    phone: '+91 9876543211',
    address: 'Palayam, Kozhikode, Kerala',
    location: { type: 'Point', coordinates: [75.7900, 11.2660] },
    avatar: ''
  });
  await customer2.save();

  // Verified Workers
  const worker1 = new User({
    name: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    password,
    role: 'worker',
    phone: '+91 8888888881',
    address: 'Mavoor Road, Kozhikode, Kerala',
    location: { type: 'Point', coordinates: [75.7804, 11.2588] },
    skills: ['Plumber'],
    title: 'Senior Plumber & Pipeline Specialist',
    hourlyRate: 500,
    isAvailable: true,
    rating: 4.9,
    reviewsCount: 18,
    verified: true,
    verificationStatus: 'Verified',
    accountStatus: 'Active',
    experienceYears: 7,
    serviceRadius: '15 km',
    availabilityHours: '8:00 AM - 8:00 PM',
    avatar: '',
    documents: {
      identityProof: 'Aadhaar Card (rajesh_aadhaar.pdf)',
      addressProof: 'Electricity Bill (rajesh_address.pdf)',
      skillCertificate: 'NSDC Certified Plumbing Tech (plumbing_nsdc.pdf)',
      experienceProof: 'Municipal Pipeline Project Reliever (exp_letter.pdf)'
    }
  });

  const worker2 = new User({
    name: 'Marcus Chen',
    email: 'marcus@example.com',
    password,
    role: 'worker',
    phone: '+91 8888888882',
    address: 'Palayam, Kozhikode, Kerala',
    location: { type: 'Point', coordinates: [75.7905, 11.2670] },
    skills: ['Electrician'],
    title: 'Master Electrician & Smart Home Tech',
    hourlyRate: 600,
    isAvailable: true,
    rating: 4.8,
    reviewsCount: 14,
    verified: true,
    verificationStatus: 'Verified',
    accountStatus: 'Active',
    experienceYears: 9,
    serviceRadius: '20 km',
    availabilityHours: '9:00 AM - 7:00 PM',
    avatar: '',
    documents: {
      identityProof: 'Passport (marcus_passport.pdf)',
      addressProof: 'Rental Agreement (marcus_rent.pdf)',
      skillCertificate: 'Certified Wireman License B-Grade (wireman_lic.pdf)'
    }
  });

  const worker3 = new User({
    name: 'Elena Rodriguez',
    email: 'elena@example.com',
    password,
    role: 'worker',
    phone: '+91 8888888883',
    address: 'Beach Road, Kozhikode, Kerala',
    location: { type: 'Point', coordinates: [75.7700, 11.2500] },
    skills: ['Painter', 'Interior Design'],
    title: 'Interior Painting Specialist',
    hourlyRate: 450,
    isAvailable: true,
    rating: 4.7,
    reviewsCount: 10,
    verified: true,
    verificationStatus: 'Verified',
    accountStatus: 'Active',
    experienceYears: 5,
    serviceRadius: '12 km',
    availabilityHours: '9:00 AM - 6:00 PM',
    avatar: '',
    documents: {
      identityProof: 'Aadhaar Card (elena_aadhaar.pdf)',
      addressProof: 'Utility Bill (elena_bill.pdf)',
      skillCertificate: 'Interior Decorative Painting Cert (painter_cert.pdf)'
    }
  });

  const worker4 = new User({
    name: 'Sanjeev Menon',
    email: 'sanjeev@example.com',
    password,
    role: 'worker',
    phone: '+91 8888888884',
    address: 'Medical College, Kozhikode, Kerala',
    location: { type: 'Point', coordinates: [75.8010, 11.2550] },
    skills: ['Carpenter'],
    title: 'Expert Carpenter & Woodworker',
    hourlyRate: 550,
    isAvailable: true,
    rating: 5.0,
    reviewsCount: 8,
    verified: true,
    verificationStatus: 'Verified',
    accountStatus: 'Active',
    experienceYears: 12,
    serviceRadius: '25 km',
    availabilityHours: '9:00 AM - 6:00 PM',
    avatar: '',
    documents: {
      identityProof: 'Aadhaar Card (sanjeev_aadhaar.pdf)',
      addressProof: 'Tax Receipt (sanjeev_tax.pdf)',
      skillCertificate: 'Master Carpenter Guild Cert (carpenter_cert.pdf)'
    }
  });

  // Pending KYC Workers
  const pendingWorker1 = new User({
    name: 'Rahul V.',
    email: 'rahul@example.com',
    password,
    role: 'worker',
    phone: '+91 9446738290',
    address: 'Calicut City Center, Kozhikode, Kerala',
    location: { type: 'Point', coordinates: [75.7850, 11.2420] },
    skills: ['Electrician'],
    title: 'Residential & Commercial Electrician',
    hourlyRate: 500,
    isAvailable: true,
    rating: 5.0,
    reviewsCount: 0,
    verified: false,
    verificationStatus: 'Pending',
    accountStatus: 'Active',
    experienceYears: 5,
    serviceRadius: '15 km',
    availabilityHours: '8:30 AM - 7:00 PM',
    avatar: '',
    documents: {
      identityProof: 'Aadhaar Card (rahul_aadhaar.pdf)',
      addressProof: 'Electricity Bill (rahul_bill.pdf)',
      skillCertificate: 'ITI Electrical Wireman Cert (iti_cert.pdf)',
      experienceProof: '5-Year Service Letter (exp_letter.pdf)'
    }
  });

  const pendingWorker2 = new User({
    name: 'Ananth K.',
    email: 'ananth@example.com',
    password,
    role: 'worker',
    phone: '+91 9446738291',
    address: 'Feroke, Kozhikode, Kerala',
    location: { type: 'Point', coordinates: [75.8200, 11.1700] },
    skills: ['Plumber'],
    title: 'Sanitary & Pipeline Technician',
    hourlyRate: 400,
    isAvailable: true,
    rating: 5.0,
    reviewsCount: 0,
    verified: false,
    verificationStatus: 'Pending',
    accountStatus: 'Active',
    experienceYears: 3,
    serviceRadius: '10 km',
    availabilityHours: '9:00 AM - 6:00 PM',
    avatar: '',
    documents: {
      identityProof: 'Voter ID Card (ananth_voter_id.pdf)',
      addressProof: 'Registered Rental Deed (ananth_rent.pdf)',
      skillCertificate: 'Vocational Plumbing Diploma (plumbing_diploma.pdf)'
    }
  });

  // Suspended Worker
  const suspendedWorker = new User({
    name: 'Vijay R.',
    email: 'vijay@example.com',
    password,
    role: 'worker',
    phone: '+91 9446738299',
    address: 'Koduvally, Kozhikode, Kerala',
    location: { type: 'Point', coordinates: [75.9100, 11.3500] },
    skills: ['Electrician'],
    title: 'Appliance Repairman',
    hourlyRate: 350,
    isAvailable: false,
    rating: 3.2,
    reviewsCount: 15,
    verified: true,
    verificationStatus: 'Suspended',
    accountStatus: 'Suspended',
    experienceYears: 2,
    serviceRadius: '10 km',
    avatar: '',
    rejectionReason: 'Multiple customer complaints of overcharging and unfulfilled appointments'
  });

  await worker1.save();
  await worker2.save();
  await worker3.save();
  await worker4.save();
  await pendingWorker1.save();
  await pendingWorker2.save();
  await suspendedWorker.save();

  // Portfolio Projects
  const p1 = new Project({
    workerId: worker1._id,
    title: 'Bathroom Pipeline & Concealed Valve Overhaul',
    description: 'Replaced corroded galvanized iron pipes with leak-proof CPVC lines and installed modern thermostatic shower mixer.',
    category: 'Plumbing',
    mediaType: 'image',
    projectType: 'New Installation',
    images: [
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800'
  });

  const p1_video = new Project({
    workerId: worker1._id,
    title: 'Under-Sink Trap Replacement & Leak Test',
    description: 'Replaced clogged P-trap and sealed junction fittings. Verified zero drips under high water pressure test.',
    category: 'Plumbing',
    mediaType: 'video',
    projectType: 'Repair',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    videoDuration: '0:15',
    imageUrl: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=800',
    images: ['https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=800']
  });

  const p1_before_after = new Project({
    workerId: worker1._id,
    title: 'Vintage Brass Tap to Chrome Mixer Upgrade',
    description: 'Removed heavily oxidized leaking tap fixture and installed brand new quarter-turn ceramic disc mixer with zero seepage.',
    category: 'Plumbing',
    mediaType: 'image',
    projectType: 'Before & After',
    beforeImage: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600',
    afterImage: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600',
    imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600',
    images: [
      'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600'
    ]
  });

  const p1_showcase = new Project({
    workerId: worker1._id,
    title: 'Walk-In Glass Shower Cubicle Installation',
    description: 'Precision alignment of 10mm toughened safety glass with magnetic waterproof door sweepers and concealed floor drain.',
    category: 'Plumbing',
    mediaType: 'image',
    projectType: 'Completed Work',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800'
  });

  const p2 = new Project({
    workerId: worker2._id,
    title: 'Full Flat Rewiring & Smart Breaker Setup',
    description: 'Complete 3BHK electrical rewiring, MCB distribution board installation, and smart app-controlled switchboard setup.',
    category: 'Electrical',
    mediaType: 'image',
    projectType: 'Completed Work',
    images: [
      'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?auto=format&fit=crop&w=800'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?auto=format&fit=crop&w=800'
  });

  const p3 = new Project({
    workerId: worker4._id,
    title: 'Custom Hardwood Modular Kitchen Cabinets',
    description: 'Handcrafted teakwood cabinets with soft-close Blum hinges and moisture-resistant polyurethane finish.',
    category: 'Carpentry',
    mediaType: 'image',
    projectType: 'Completed Work',
    images: [
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800'
  });

  await p1.save();
  await p1_video.save();
  await p1_before_after.save();
  await p1_showcase.save();
  await p2.save();
  await p3.save();

  // Bookings (Normal & Emergency)
  const job1 = new JobRequest({
    customerId: customer1._id,
    workerId: worker1._id,
    serviceType: 'Emergency Plumbing Repair',
    description: 'Burst main pipe under kitchen sink flooding the floor. Urgent assistance needed!',
    date: 'Today',
    time: 'ASAP',
    location: 'Mavoor Road, Kozhikode, Kerala',
    serviceAddress: 'Mavoor Road, Kozhikode, Kerala',
    customerLocation: { type: 'Point', coordinates: [75.7800, 11.2580] },
    isEmergency: true,
    serviceCharge: 500,
    emergencyCharge: 150,
    totalAmount: 650,
    status: 'Pending'
  });

  const job2 = new JobRequest({
    customerId: customer2._id,
    workerId: worker2._id,
    serviceType: 'Electrical Inspection',
    description: 'Replacing damaged main circuit breaker and installing surge protector.',
    date: '2026-08-30',
    time: '11:00 AM',
    location: 'Palayam, Kozhikode, Kerala',
    serviceAddress: 'Palayam, Kozhikode, Kerala',
    customerLocation: { type: 'Point', coordinates: [75.7815, 11.2505] },
    isEmergency: false,
    serviceCharge: 600,
    emergencyCharge: 0,
    totalAmount: 600,
    status: 'Accepted'
  });

  const job3 = new JobRequest({
    customerId: customer1._id,
    workerId: worker4._id,
    serviceType: 'Furniture Repair',
    description: 'Re-aligning cabinet doors and fixing dining table leg.',
    date: '2026-08-28',
    time: '02:00 PM',
    location: 'Beach Road, Kozhikode, Kerala',
    serviceAddress: 'Beach Road, Kozhikode, Kerala',
    customerLocation: { type: 'Point', coordinates: [75.7725, 11.2625] },
    isEmergency: false,
    serviceCharge: 550,
    emergencyCharge: 0,
    totalAmount: 550,
    status: 'Completed'
  });

  await job1.save();
  await job2.save();
  await job3.save();

  // Notifications
  await Notification.create({
    userId: worker1._id,
    type: 'EMERGENCY_BOOKING_REQUEST',
    message: '🚨 EMERGENCY REQUEST: Anjali Nair booked urgent service for Emergency Plumbing Repair (ASAP)',
    bookingId: job1._id
  });

  await Notification.create({
    userId: customer2._id,
    type: 'BOOKING_ACCEPTED',
    message: '✅ Marcus Chen accepted your booking request for Electrical Inspection!',
    bookingId: job2._id
  });

  await Notification.create({
    userId: customer1._id,
    type: 'SERVICE_COMPLETED',
    message: '🎉 Service completed! Please leave a rating & review for Sanjeev Menon.',
    bookingId: job3._id
  });

  // Reviews
  await Review.create({
    customerId: customer1._id,
    workerId: worker4._id,
    bookingId: job3._id,
    rating: 5,
    comment: 'Punctual, super professional, and fixed my dining table perfectly! Highly recommended.'
  });

  await Review.create({
    customerId: customer2._id,
    workerId: worker1._id,
    bookingId: job1._id,
    rating: 5,
    comment: 'Rajesh is a life saver! Fixed our leaking pipe within 30 minutes.'
  });

  // Complaints
  const c1 = new Complaint({
    customerId: customer2._id,
    workerId: suspendedWorker._id,
    bookingId: job1._id,
    category: 'Overcharging',
    description: 'Worker quoted ₹350 initial inspection fee but demanded ₹1500 after opening the appliance panel without doing repair work.',
    status: 'Open'
  });

  const c2 = new Complaint({
    customerId: customer1._id,
    workerId: worker2._id,
    bookingId: job2._id,
    category: 'Worker did not arrive',
    description: 'Confirmed appointment for 10:00 AM on Monday but did not turn up and phone was unreachable.',
    status: 'Under Review',
    resolutionNotes: 'Currently contacting worker for clarification.'
  });

  await c1.save();
  await c2.save();

  console.log('\n--- NEARFIX SEEDING COMPLETE ---');
  console.log('Admin Account   : admin@nearfix.com / password123');
  console.log('Customer Account: customer@example.com / password123');
  console.log('Worker Accounts : rajesh@example.com, marcus@example.com, elena@example.com, sanjeev@example.com');
  console.log('Pending KYC     : rahul@example.com, ananth@example.com');
}

async function runStandaloneSeed() {
  const force = process.argv.includes('--force') || process.argv.includes('-f');
  try {
    let mongoUri = process.env.MONGO_URI;
    try {
      if (mongoUri) {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
        console.log('MongoDB Connected for Seeding via MONGO_URI...');
      } else {
        throw new Error('No MONGO_URI');
      }
    } catch (err) {
      console.log('MongoDB URI connection failed, starting MongoMemoryServer fallback...');
      const mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log('Connected to MongoMemoryServer for Seeding...');
    }

    const count = await User.countDocuments();
    if (count > 0 && !force) {
      console.log(`\n⚠️  Database already contains ${count} users.`);
      console.log('To prevent accidental data loss, existing records were NOT deleted.');
      console.log('If you want to completely reset and re-seed all demo data, run:');
      console.log('  node seed.js --force\n');
      process.exit(0);
    }

    await seedData({ force: true });
    process.exit(0);
  } catch (err) {
    console.error('Seed Error:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runStandaloneSeed();
}

module.exports = seedData;
