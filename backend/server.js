const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 5000;

const { MongoMemoryServer } = require('mongodb-memory-server');
const seedData = require('./seed');

// Database Connection
async function connectDatabase() {
  let connected = false;
  if (process.env.MONGO_URI) {
    try {
      await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 3000 });
      console.log('MongoDB Atlas Connected successfully');
      connected = true;
      await seedData();
    } catch (err) {
      console.log('MongoDB Atlas connection failed:', err.message);
    }
  }

  if (!connected) {
    try {
      console.log('Initializing local MongoMemoryServer fallback...');
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log('Connected to local MongoMemoryServer:', mongoUri);
      await seedData();
    } catch (fallbackErr) {
      console.error('Failed to initialize MongoMemoryServer fallback:', fallbackErr);
    }
  }
}

connectDatabase();

// Basic API check
app.get('/', (req, res) => {
  res.json({ message: 'NearFix Server is running smoothly' });
});

app.get('/api', (req, res) => {
  res.json({ message: 'NearFix Hyperlocal Service Marketplace API Pipeline Running' });
});

// Active Core Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`NearFix Server running on port ${PORT}`);
  });
}

module.exports = app;

