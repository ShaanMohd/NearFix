# 🚀 NearFix - Hyperlocal Service Marketplace
## 📖 Comprehensive Project Explanation & Presentation Guide

---

## 🎯 Executive Summary & Elevator Pitch

**NearFix** is an end-to-end, hyperlocal on-demand service marketplace platform designed to bridge the gap between local skilled micro-entrepreneurs (electricians, plumbers, carpenters, technicians) and local residents needing instant or scheduled home services. 

### Core Value Proposition:
1. **Hyperlocal Discovery**: Map-based and list-based discovery of verified local service providers nearby.
2. **Dual Booking Modes**: Emergency instant response dispatch vs. standard scheduled bookings.
3. **Safety & KYC Trust**: Admin-driven KYC verification system requiring workers to submit official government IDs and skill certificates.
4. **Dispute Resolution & Quality Control**: Integrated review rating mechanism and admin complaint resolution pipeline.

---

## 🛠️ Complete Tech Stack Breakdown

| Layer | Technologies Used | Key Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** + **Vite 8** | Modern, blazing-fast single page application (SPA) with HMR (Hot Module Replacement). |
| **Routing** | **React Router DOM v7** | Declarative client-side routing with nested layout routes (`/app`, `/admin`). |
| **UI Styling** | **Vanilla CSS (Glassmorphism design system)** | Custom modern dark-mode aesthetic, custom CSS variables, zero heavy framework lock-in. |
| **Icons & Media** | **Lucide React** | Lightweight, clean vector icons for modern UI controls. |
| **Mapping Engine** | **Leaflet** + **React-Leaflet** | Interactive OpenStreetMap rendering for locating nearby workers without expensive Google Maps billing. |
| **Backend Runtime** | **Node.js** + **Express.js (v5)** | Scalable RESTful API web server handling routes, middleware, and authentication. |
| **Database & ORM** | **MongoDB** + **Mongoose (v9)** | Flexible NoSQL document store with structured schema validation. |
| **Zero-Config Database Fallback** | **MongoMemoryServer (v11)** | In-memory MongoDB engine for instant execution if MongoDB Atlas cloud is offline. |
| **Authentication & Security**| **JWT (jsonwebtoken)** + **bcryptjs (v3)** | Stateless token authentication & 10-salt bcrypt password hashing. |
| **File Handling** | **Multer (v2)** | Express middleware for handling multi-part form data & KYC image/document uploads. |

---

## 📦 Package Dependencies Explained (Line-by-Line)

### Frontend (`package.json`)
* **`react` & `react-dom` (`^19.2.4`)**: Core UI engine powering component lifecycle, state hooks (`useState`, `useEffect`), and DOM rendering.
* **`react-router-dom` (`^7.13.1`)**: Provides dynamic route switching (`<Routes>`, `<Route>`, `useNavigate`, `<Outlet>`).
* **`leaflet` (`^1.9.4`) & `react-leaflet` (`^5.0.0`)**: Open-source mapping framework to display interactive tile maps and markers for worker locations.
* **`lucide-react` (`^0.577.0`)**: Provides scalable SVG icons like `Briefcase`, `UserSearch`, `ShieldCheck`, `MapPin`, etc.
* **`multer` (`^2.1.1`)**: Used for handling file uploads on the frontend/middleware.
* **`@react-google-maps/api` (`^2.20.8`)**: Optional Google Maps integration library.
* **`vite` (`^8.0.1`)**: Next-generation frontend build tool providing instantaneous server start and fast HMR updates.

### Backend (`backend/package.json`)
* **`express` (`^5.2.1`)**: Fast Node.js web server framework defining REST endpoints (`GET`, `POST`, `PUT`, `DELETE`).
* **`mongoose` (`^9.3.1`)**: Schema-based solution to model database entities (Users, Bookings, Complaints) with MongoDB.
* **`mongodb-memory-server` (`^11.2.0`)**: Embedded in-memory MongoDB server. Ensures the project runs seamlessly anywhere out-of-the-box without manual database installation!
* **`jsonwebtoken` (`^9.0.3`)**: Generates and verifies cryptographic bearer tokens for secure user sessions.
* **`bcryptjs` (`^3.0.3`)**: Hashes user passwords with salt before storing in database to enforce security standards.
* **`cors` (`^2.8.6`)**: Cross-Origin Resource Sharing middleware enabling React (port 5173/3000) to communicate with Express (port 5000).
* **`dotenv` (`^17.3.1`)**: Loads environment variables from `.env` file into `process.env`.
* **`nodemon` (`^3.1.14`)**: Development tool that automatically restarts the Node backend on code changes.

---

## 🧱 Database Architecture & Schema Models

The database consists of **6 primary collections** in MongoDB:

```
                          ┌──────────────┐
                          │     User     │
                          │(Customer/    │
                          │Worker/Admin) │
                          └──────┬───────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           │                     │                     │
           ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  JobRequest /    │  │    Complaint     │  │     Review       │
│     Booking      │  │                  │  │                  │
└──────────┬───────┘  └──────────────────┘  └──────────────────┘
           │
           ▼
┌──────────────────┐
│   Notification   │
└──────────────────┘
```

1. **`User` Schema (`backend/models/User.js`)**:
   * Stores credentials, contact details, role (`customer`, `worker`, `admin`).
   * **Worker Fields**: `title`, `skills`, `hourlyRate`, `isAvailable`, `rating`, `reviewsCount`, `verified`, `verificationStatus` (`Pending`, `Verified`, `Rejected`, `Suspended`), `accountStatus`, `documents` (Identity proof, address proof, skill certificate, experience proof), `busySlots`.
2. **`JobRequest` Schema (`backend/models/JobRequest.js`)**:
   * Connects `customerId` and `workerId`.
   * Tracks `serviceType`, `description`, `date`, `time`, `location`, `status` (`Pending`, `Accepted`, `Rejected`, `Completed`, `Cancelled`), `isEmergency`, charges breakdown (`serviceCharge`, `emergencyCharge`, `totalAmount`).
3. **`Notification` Schema (`backend/models/Notification.js`)**:
   * Real-time notifications for users/workers for booking updates (`NORMAL_BOOKING_REQUEST`, `EMERGENCY_BOOKING_REQUEST`, `BOOKING_ACCEPTED`, `SERVICE_COMPLETED`, etc.).
4. **`Complaint` Schema (`backend/models/Complaint.js`)**:
   * Dispute reporting system linking Customer, Worker, and Booking. Categories include *Overcharging*, *Poor Service*, *Misconduct*, *Property Damage*, etc. Managed by Admin.
5. **`Review` Schema (`backend/models/Review.js`)**:
   * Ratings (1 to 5 stars) and text feedback left by customers after service completion.
6. **`Project` Schema (`backend/models/Project.js`)**:
   * Portfolio showcase items uploaded by workers showcasing past completed jobs with images and descriptions.

---

## 🏛️ Application Architecture & Folder Structure

```
mainNearFix/
├── backend/                  # Express REST API Server
│   ├── middleware/           # Auth JWT & Admin role verification
│   │   ├── authMiddleware.js
│   │   └── adminMiddleware.js
│   ├── models/               # Mongoose Schemas (User, JobRequest, Notification, etc.)
│   ├── routes/               # API Endpoints
│   │   ├── adminRoutes.js    # KYC approvals, complaints, user suspension
│   │   ├── authRoutes.js     # Signup/Login with JWT
│   │   ├── jobRoutes.js      # Booking lifecycle management
│   │   ├── complaintRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── projectRoutes.js
│   │   └── reviewRoutes.js
│   ├── seed.js               # Database seeder with realistic initial demo data
│   └── server.js             # Server entry point with MongoDB Atlas & Memory fallback
├── src/                      # React Frontend Application
│   ├── components/           # Reusable UI components & layouts
│   │   ├── AdminLayout.jsx   # Admin navigation header & sidebar
│   │   ├── MainLayout.jsx    # User/Worker top navbar & bottom navigation
│   │   ├── MapComponent.jsx  # Leaflet OpenStreetMap wrapper with custom markers
│   │   ├── RoleSelection.jsx # Initial portal selection screen
│   │   └── WorkerCard.jsx   # Worker profile preview card
│   ├── views/                # Full Page Views
│   │   ├── HomeView.jsx              # Customer discovery dashboard
│   │   ├── MapView.jsx               # Interactive worker map
│   │   ├── MyBookingsView.jsx        # Customer booking management
│   │   ├── WorkerHome.jsx            # Worker dashboard & active jobs
│   │   ├── WorkerProfileView.jsx     # Detailed profile & portfolio view
│   │   └── admin/                    # Admin portal views
│   │       ├── AdminDashboard.jsx    # System metrics & analytics
│   │       ├── WorkerVerification.jsx # KYC verification queue
│   │       └── Complaints.jsx        # Dispute management center
│   ├── App.jsx               # Main React Router setup
│   ├── main.jsx              # DOM root mount point
│   └── index.css             # Glassmorphism design system styles & tokens
└── package.json              # Client dependencies & scripts
```

---

## ⚡ Core Workflows & Feature Walkthroughs

### 1. Multi-Role Authentication & Access Control
* **Role Selection**: User chooses between **User (Customer)**, **Worker**, or **Admin**.
* **Authentication**: Login/Registration routes exchange hashed credentials for JWT tokens, stored in client `localStorage`.
* **Account Moderation**: Suspended accounts are immediately blocked from logging in via auth middleware checks.

### 2. Hyperlocal Worker Search & Interactive Map
* **Filtering**: Search by worker name, category (Plumber, Master Electrician, AC Repair, Painter), rating, or location.
* **Map View (`MapComponent.jsx`)**: Displays worker positions using Leaflet map markers over OpenStreetMap. Custom jitter offsets prevent overlapping markers at identical coordinates. Popups display hourly rate and quick booking buttons.

### 3. Dual-Mode Booking System (Standard vs. Emergency)
* **Standard Booking**: Customer selects date/time slot, provides location details, and dispatches job request.
* **Emergency Dispatch**: High-priority alert triggered for urgent issues (e.g., pipe burst, electrical short circuit). Automatically adds an emergency surge fee.
* **Notification Dispatch**: Triggers automated system notifications to the targeted worker.

### 4. Worker Lifecycle & Schedule Management
* **Job Queue**: Workers view incoming requests under "Pending", accept or decline.
* **Busy Slots**: Workers can mark unavailable time slots on their calendar.
* **Portfolio Showcase**: Workers upload pictures and project titles to showcase proof of work on their profile.

### 5. Admin Verification Portal & Dispute Resolution (KYC & Trust)
* **KYC Document Inspection**: Admin reviews uploaded Aadhaar IDs, Address Proofs, and Skill Certificates.
* **Approval Pipeline**: Admin approves or rejects applicant with specific reason feedback (e.g., "ID document blurred").
* **Dispute Handling**: Admin investigates customer complaints, examines uploaded evidence photos, writes resolution notes, and can suspend fraudulent worker accounts.

---

## 🔑 Live Presentation Demo Credentials

Use these pre-seeded demo accounts during your presentation:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@nearfix.com` | `password123` | Full access to KYC verification, complaints, worker suspension |
| **Customer** | `customer@example.com` | `password123` | Customer Anjali Nair with active bookings & history |
| **Worker (Plumber)** | `rajesh@example.com` | `password123` | Rajesh Kumar (Verified Plumber with ratings & portfolio) |

---

## ❓ Frequently Asked Viva / Presentation Questions & Winning Answers

### Q1: What problem does NearFix solve?
> **Answer**: Unorganized local service sectors lack transparent pricing, instant booking verification, and safety. NearFix provides a trusted, hyperlocal platform with verified micro-entrepreneurs, real-time map discovery, emergency instant bookings, and admin-led KYC safety.

### Q2: Why did you choose React + Vite over traditional server-side rendering?
> **Answer**: NearFix requires a dynamic, highly responsive single-page application (SPA) experience where map views, notifications, and booking state updates transition seamlessly without full page reloads. Vite provides instant module reloading and optimized bundle production.

### Q3: How does the application handle database connections if internet or MongoDB Atlas is unavailable?
> **Answer**: NearFix features an automatic fallback architecture built into `backend/server.js`. It first attempts to connect to MongoDB Atlas. If Atlas times out or lacks network connectivity, it automatically boots up an in-memory database using `mongodb-memory-server` and seeds realistic sample data. This guarantees zero-downtime execution anywhere!

### Q4: How is security handled in NearFix?
> **Answer**: 
> 1. Passwords are never stored in plaintext—they are salted and hashed using `bcryptjs`.
> 2. API routes are secured via JWT bearer token middleware (`authMiddleware.js`).
> 3. Admin routes require strict role validation (`adminMiddleware.js`).
> 4. Suspended accounts are immediately blocked at authentication level.

### Q5: Why open-source Leaflet over Google Maps?
> **Answer**: Leaflet with OpenStreetMap tiles is completely free, open-source, lightweight, and eliminates reliance on commercial API keys or usage billing limits, while remaining visually styled to match our modern dark glassmorphism theme.

---

## 🚀 How to Run the Application for Demo

1. **Start Backend Server**:
   ```bash
   cd backend
   node server.js
   ```
   *(Server starts on `http://localhost:5000`)*

2. **Start Frontend Client**:
   ```bash
   # In root directory
   npm run dev
   ```
   *(Frontend opens on `http://localhost:5173`)*
