# 🛠️ NearFix: Complete System Architecture, Tech Stack, Feature Modules & Database Design Specification

> **Purpose of this Document**: This document is an exhaustive, production-grade technical blueprint designed to allow any engineer or AI assistant to rebuild the **NearFix** Hyperlocal Service Marketplace completely from scratch. It contains exact tech stack dependencies, complete database schemas with validation rules and relationships, full module-by-module feature specifications, API contracts, and an implementation sequence.

---

## 📑 Table of Contents
1. [Executive Summary & System Architecture](#1-executive-summary--system-architecture)
2. [Complete Tech Stack & Package Manifest](#2-complete-tech-stack--package-manifest)
3. [Database Architecture & Complete Schema Design](#3-database-architecture--complete-schema-design)
4. [Module-Wise Feature Breakdown](#4-module-wise-feature-breakdown)
   - [4.1 Authentication & Role-Based Access Control (RBAC)](#41-authentication--role-based-access-control-rbac)
   - [4.2 Customer Portal Module](#42-customer-portal-module)
   - [4.3 Worker / Service Professional Module](#43-worker--service-professional-module)
   - [4.4 Admin Operations & Governance Portal](#44-admin-operations--governance-portal)
   - [4.5 Dual-Engine Booking System (Standard vs. Emergency)](#45-dual-engine-booking-system-standard-vs-emergency)
   - [4.6 Interactive Hyperlocal Map & Geolocation Engine](#46-interactive-hyperlocal-map--geolocation-engine)
   - [4.7 Review & Rating Aggregation Engine](#47-review--rating-aggregation-engine)
   - [4.8 Dispute & Complaint Resolution Pipeline](#48-dispute--complaint-resolution-pipeline)
   - [4.9 Notification & Alert Dispatch Engine](#49-notification--alert-dispatch-engine)
5. [Complete REST API Contract & Endpoint Reference](#5-complete-rest-api-contract--endpoint-reference)
6. [Frontend Application Architecture & Route Tree](#6-frontend-application-architecture--route-tree)
7. [Environment Configuration & Seeding Instructions](#7-environment-configuration--seeding-instructions)
8. [Step-by-Step Rebuild & Reproduction Guide](#8-step-by-step-rebuild--reproduction-guide)

---

## 1. Executive Summary & System Architecture

**NearFix** is an on-demand hyperlocal marketplace connecting local service specialists (plumbers, electricians, carpenters, painters) with neighborhood residents for standard scheduled appointments and high-priority emergency interventions.

### High-Level Architecture
```
                                 ┌─────────────────────────────────┐
                                 │     Client Layer (React 19)     │
                                 │   Vite + Leaflet OpenStreetMap  │
                                 │   Glassmorphism Modern UI       │
                                 └───────────────┬─────────────────┘
                                                 │ HTTPS / REST (Axios/Fetch)
                                                 │ Bearer JWT Token
                                                 ▼
                                 ┌─────────────────────────────────┐
                                 │    API Gateway & Express Server │
                                 │   (Node.js v20+ / Express v5)   │
                                 │  • authMiddleware (JWT Check)   │
                                 │  • adminMiddleware (RBAC Check) │
                                 │  • Static File Serving (/uploads)
                                 └───────────────┬─────────────────┘
                                                 │
                                                 ▼
                 ┌─────────────────────────────────────────────────────────────────┐
                 │                      Persistence Layer                          │
                 │   MongoDB Atlas (Cloud) ──[Auto-Fallback]──► MongoMemoryServer  │
                 │              (Mongoose v9 Object Document Mapper)               │
                 └─────────────────────────────────────────────────────────────────┘
```

---

## 2. Complete Tech Stack & Package Manifest

### 2.1 Frontend Stack (`package.json`)
* **Core Framework**: React 19 (`react: ^19.2.4`, `react-dom: ^19.2.4`)
* **Build Tool**: Vite 8 (`vite: ^8.0.1`, `@vitejs/plugin-react: ^6.0.1`)
* **Routing**: React Router DOM v7 (`react-router-dom: ^7.13.1`)
* **Map & Geospatial Visualization**:
  * `leaflet: ^1.9.4` (Open-source interactive raster mapping engine)
  * `react-leaflet: ^5.0.0` (React abstraction for Leaflet)
  * `@react-google-maps/api: ^2.20.8` (Optional auxiliary Google Maps support)
* **Iconography & UI Micro-elements**:
  * `lucide-react: ^0.577.0` (Comprehensive tree-shakeable SVG icon kit)
* **Styling**:
  * Pure CSS3 Design System (`src/index.css`) featuring custom CSS variables, glassmorphism panels (`backdrop-filter: blur()`), responsive CSS grid/flexbox layouts, and zero heavy styling framework overhead.
* **Linting & Code Quality**:
  * `eslint: ^9.39.4`, `@eslint/js: ^9.39.4`, `eslint-plugin-react-hooks: ^7.0.1`, `eslint-plugin-react-refresh: ^0.5.2`

### 2.2 Backend Stack (`backend/package.json`)
* **Runtime**: Node.js (v18 - v24+)
* **HTTP Web Framework**: Express 5 (`express: ^5.2.1`)
* **Database & ODM**:
  * `mongoose: ^9.3.1` (Schema definition, indexing, population, query sanitization)
  * `mongodb-memory-server: ^11.2.0` (Zero-config embedded MongoDB for instant local evaluation when remote Atlas database is unreachable)
* **Authentication & Cryptography**:
  * `jsonwebtoken: ^9.0.3` (Stateless HMAC-SHA256 JWT tokens for session verification)
  * `bcryptjs: ^3.0.3` (10-salt rounds one-way cryptographic hashing for passwords)
* **Networking & Utilities**:
  * `cors: ^2.8.6` (Cross-Origin Resource Sharing handling)
  * `dotenv: ^17.3.1` (Environment variable configuration)
  * `multer: ^2.1.1` (Multipart/form-data upload pipeline for KYC and proof documents)
  * `nodemon: ^3.1.14` (Hot-reloading development runner)

---

## 3. Database Architecture & Complete Schema Design

NearFix utilizes **6 primary MongoDB collections** interconnected through foreign ObjectId references.

### 3.1 Entity Relationship Diagram (ERD)

```
                            ┌─────────────────────────┐
                            │          User           │
                            │ ─────────────────────── │
                            │ _id: ObjectId           │
                            │ role: enum              │
                            │ email: String (Unique)  │
                            │ password: Hash          │
                            │ verificationStatus: enum│
                            │ accountStatus: enum     │
                            └────────────┬────────────┘
                                         │
                 ┌───────────────────────┼───────────────────────┐
           1     │                       │ 1                     │ 1
                 ▼ *                     ▼ *                     ▼ *
      ┌──────────────────────┐┌──────────────────────┐┌──────────────────────┐
      │      JobRequest      ││      Complaint       ││        Review        │
      │ ──────────────────── ││ ──────────────────── ││ ──────────────────── │
      │ customerId ──► User  ││ customerId ──► User  ││ customerId ──► User  │
      │ workerId   ──► User  ││ workerId   ──► User  ││ workerId   ──► User  │
      │ status: enum         ││ bookingId ──► JobReq ││ bookingId ──► JobReq │
      │ isEmergency: Boolean ││ status: enum         ││ rating: Number (1-5) │
      └──────────┬───────────┘└──────────────────────┘└──────────────────────┘
                 │ 1
                 ▼ *
      ┌──────────────────────┐                       ┌──────────────────────┐
      │     Notification     │                       │       Project        │
      │ ──────────────────── │                       │ ──────────────────── │
      │ userId ──► User      │                       │ workerId ──► User    │
      │ bookingId ──► JobReq │                       │ title, description   │
      │ type: enum           │                       │ images: [String]     │
      └──────────────────────┘                       └──────────────────────┘
```

---

### 3.2 Detailed Schema Definitions

#### Model 1: `User` (`backend/models/User.js`)
Stores identities for Customers, Workers, and Platform Administrators.

| Field Name | Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `role` | `String` | **Required**, enum: `['customer', 'worker', 'admin']` | Access privilege level |
| `name` | `String` | **Required**, trim | Full user name |
| `email` | `String` | **Required**, `unique: true`, lowercase | Primary login email |
| `password` | `String` | **Required** | Bcrypt salted hash (min 6 chars before hash) |
| `phone` | `String` | Optional, default: `""` | Contact phone number |
| `location` | `String` | Default: `'Mumbai, India'` | City/neighborhood descriptor |
| `avatar` | `String` | Default: Unsplash stock avatar URL | Profile photo URL |
| **Worker Specific:** | | | |
| `title` | `String` | Optional (e.g., 'Master Electrician') | Professional title |
| `skills` | `[String]` | Array of strings (e.g., `['Plumber']`) | Service disciplines |
| `hourlyRate` | `Number` | Default: `500` | Standard base rate per hour (INR) |
| `isAvailable` | `Boolean` | Default: `true` | On/Off toggle for customer booking requests |
| `rating` | `Number` | Default: `4.8`, min: 1, max: 5 | Dynamic calculated rating average |
| `reviewsCount` | `Number` | Default: `0` | Total number of rated orders |
| `verified` | `Boolean` | Default: `false` (Auto `true` for customers) | Quick boolean verification status |
| `verificationStatus` | `String` | enum: `['Pending', 'Verified', 'Rejected', 'Suspended']`, Default: `'Pending'` for workers | Admin KYC lifecycle status |
| `accountStatus` | `String` | enum: `['Active', 'Suspended']`, Default: `'Active'` | Platform moderation status |
| `experienceYears` | `Number` | Default: `3` | Stated years in trade |
| `serviceRadius` | `String` | Default: `'15 km'` | Operating radius |
| `availabilityHours`| `String` | Default: `'9:00 AM - 6:00 PM'` | Operating business hours |
| `documents` | `Object` | Nested document paths | KYC verification files: |
| ↳ `identityProof` | `String` | Path or filename | Govt ID (Aadhaar, Passport, etc.) |
| ↳ `addressProof` | `String` | Path or filename | Utility bill, lease, tax receipt |
| ↳ `skillCertificate` | `String` | Path or filename | Trade license, NSDC / ITI certificate |
| ↳ `experienceProof` | `String` | Path or filename | Service relief letter, reference |
| `rejectionReason` | `String` | Optional | Admin feedback if KYC is rejected |
| `busySlots` | `[Object]` | `[{ date: String, time: String }]` | Reserved slots where worker is unavailable |
| `createdAt` | `Date` | Default: `Date.now` | Account creation timestamp |

---

#### Model 2: `JobRequest` (`backend/models/JobRequest.js` / alias `Booking.js`)
Tracks the entire lifecycle of a customer service dispatch.

| Field Name | Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `customerId` | `ObjectId` | **Required**, `ref: 'User'` | Reference to customer making request |
| `workerId` | `ObjectId` | **Required**, `ref: 'User'` | Reference to target service professional |
| `serviceType` | `String` | **Required** | Specific service requested (e.g. 'Plumbing') |
| `description` | `String` | Optional | Problem description entered by customer |
| `date` | `String` | Default: `'Today'` | Service appointment date |
| `time` | `String` | Default: `'ASAP'` | Service appointment slot |
| `location` | `String` | Default: `'Customer Location'` | Service address / destination |
| `status` | `String` | enum: `['Pending', 'Accepted', 'Rejected', 'Completed', 'Cancelled']`, Default: `'Pending'` | Booking lifecycle state |
| `isEmergency` | `Boolean` | Default: `false` | Urgent emergency dispatch flag |
| `serviceCharge` | `Number` | Default: `500` | Base inspection/labor fee |
| `emergencyCharge`| `Number` | Default: `0` (₹150 if emergency) | Surge charge for instant emergency dispatch |
| `totalAmount` | `Number` | Default: `500` | Calculated total = `serviceCharge + emergencyCharge` |
| `createdAt` | `Date` | Default: `Date.now` | Booking initiation timestamp |
| `updatedAt` | `Date` | Default: `Date.now` | Last status modification timestamp |

---

#### Model 3: `Complaint` (`backend/models/Complaint.js`)
Customer dispute management records for administrative governance.

| Field Name | Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `customerId` | `ObjectId` | **Required**, `ref: 'User'` | User who lodged the complaint |
| `workerId` | `ObjectId` | **Required**, `ref: 'User'` | Service worker against whom complaint is filed |
| `bookingId` | `ObjectId` | Optional, `ref: 'JobRequest'` | Associated booking request ID |
| `category` | `String` | **Required**, enum: `['Worker did not arrive', 'Poor service', 'Misconduct', 'Inappropriate behaviour', 'Overcharging', 'Property damage', 'Other']` | Categorical dispute classification |
| `description` | `String` | **Required** | Detailed description of incident |
| `status` | `String` | enum: `['Open', 'Under Review', 'Resolved']`, Default: `'Open'` | Dispute handling status |
| `evidence` | `[String]` | Array of file/image URLs | Attached photo or receipt evidence |
| `resolutionNotes`| `String` | Optional | Admin notes documenting the resolution |
| `createdAt` | `Date` | Default: `Date.now` | Complaint filing timestamp |

---

#### Model 4: `Notification` (`backend/models/Notification.js`)
In-app alert records for customers and service providers.

| Field Name | Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `userId` | `ObjectId` | **Required**, `ref: 'User'` | Target recipient of notification |
| `type` | `String` | **Required**, enum: `['NORMAL_BOOKING_REQUEST', 'EMERGENCY_BOOKING_REQUEST', 'BOOKING_ACCEPTED', 'BOOKING_REJECTED', 'SERVICE_COMPLETED', 'BOOKING_CANCELLED', 'SYSTEM']` | Notification event type |
| `message` | `String` | **Required** | Human-readable alert text |
| `bookingId` | `ObjectId` | Optional, `ref: 'JobRequest'` | Associated booking reference |
| `isRead` | `Boolean` | Default: `false` | Read/unread receipt flag |
| `createdAt` | `Date` | Default: `Date.now` | Notification timestamp |

---

#### Model 5: `Review` (`backend/models/Review.js`)
Post-service feedback records left by customers.

| Field Name | Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `customerId` | `ObjectId` | **Required**, `ref: 'User'` | Review author |
| `workerId` | `ObjectId` | **Required**, `ref: 'User'` | Reviewed worker |
| `bookingId` | `ObjectId` | Optional, `ref: 'JobRequest'` | Target service appointment |
| `rating` | `Number` | **Required**, min: 1, max: 5 | Star score |
| `comment` | `String` | **Required** | Written experience review |
| `createdAt` | `Date` | Default: `Date.now` | Review publication timestamp |

---

#### Model 6: `Project` (`backend/models/Project.js`)
Worker portfolio items showcasing completed works.

| Field Name | Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `workerId` | `ObjectId` | **Required**, `ref: 'User'` | Worker owner |
| `title` | `String` | **Required** | Showcase project headline |
| `description` | `String` | **Required** | Scope of work explanation |
| `category` | `String` | **Required** | Trade discipline (e.g. 'Plumbing') |
| `images` | `[String]` | Array of image URLs | Work photos |
| `imageUrl` | `String` | Cover image URL | Primary thumbnail |
| `createdAt` | `Date` | Default: `Date.now` | Project creation date |

---

## 4. Module-Wise Feature Breakdown

### 4.1 Authentication & Role-Based Access Control (RBAC)
* **Portal Selector (`/`)**: Gateway entry screen allowing users to pick their specific persona:
  1. *Customer Portal*
  2. *Worker Portal*
  3. *Admin Portal*
* **Separate Login Views**:
  * `CustomerLoginView.jsx`: Supports email/password login and one-click signup.
  * `WorkerLoginView.jsx`: Includes trade selection (`skills`), hourly rate defaults, and KYC onboarding flags.
  * `AdminLoginView.jsx`: Restricted administrative login gate with security warnings.
* **Security Middleware Pipeline**:
  * `authMiddleware.js`: Extracts `Authorization: Bearer <token>` header, verifies signature via `jwt.verify`, injects decoded `{ userId, role }` into `req.user`.
  * `adminMiddleware.js`: Inspects `req.user.role === 'admin'`. Rejects non-admins with `403 Forbidden`.
  * **Suspension Enforcement**: Any user with `accountStatus === 'Suspended'` is blocked from logging in with a 403 status message.

---

### 4.2 Customer Portal Module
* **Discovery Dashboard (`HomeView.jsx`)**:
  * Category quick-filters: All Services, Plumbing, Electrical, Painting, Carpentry.
  * Instant text search matching worker name, skills, title, or locality.
  * Worker preview cards (`WorkerCard.jsx`) with ratings, verification badges, pricing, and distance.
* **Worker Deep Dive (`WorkerProfileView.jsx`)**:
  * Detailed bio, hourly pricing, service radius, and operating hours.
  * Tabbed subviews: **About & Skills**, **Portfolio Showcase**, and **Customer Reviews**.
* **Interactive Booking Dispatch**:
  * Standard scheduled booking (Date picker + Time slot picker).
  * **Emergency Mode Toggle**: One-click instant dispatch with ASAP timing and emergency surcharge notice.
* **My Bookings Center (`MyBookingsView.jsx`)**:
  * Status-based order listing: Pending, Accepted, Completed, Cancelled.
  * **Action: Cancel Booking**: Allows canceling pending appointments.
  * **Action: Review Service**: Rate completed services from 1-5 stars with feedback comments.
  * **Action: Raise Complaint**: Opens dispute modal with categorical reason selector and description.
* **In-App Notifications (`NotificationsView.jsx`)**:
  * Real-time notifications for booking acceptance, rejection, and completion.
  * Mark individual or all notifications as read.

---

### 4.3 Worker / Service Professional Module
* **Worker Command Center (`WorkerHome.jsx`)**:
  * Instant **Availability Toggle**: Master switch to turn online/offline status on and off.
  * **Incoming Queue**: Cards for pending requests with **Accept** / **Decline** buttons.
  * **Active Jobs**: Accepted jobs with customer address, contact phone, and **Mark Completed** trigger.
* **Schedule & Calendar Manager (`WorkerScheduleView.jsx`)**:
  * Set default working hours (e.g. `9:00 AM - 6:00 PM`) and service coverage radius (`15 km`).
  * Add custom **Busy Slots** (specific date and time slots worker cannot take jobs).
  * View upcoming scheduled calendar bookings.
* **Portfolio Showcase Management**:
  * Upload showcase projects with title, category, description, and proof-of-work images.
* **KYC Verification Submission**:
  * Upload Aadhaar/Passport Identity Proof, Address Proof, Trade License/NSDC Certificate, and Experience Letter.
  * Automatic submission to Admin Verification Queue.

---

### 4.4 Admin Operations & Governance Portal
Accessible under `/admin/*` protected by `adminMiddleware`:
* **Admin Dashboard (`AdminDashboard.jsx`)**:
  * Live KPI Cards: Pending Verifications, Active Verified Workers, Open Complaints, Suspended Workers.
  * Quick-access pending worker approval queue.
  * Urgent complaints table.
  * Real-time audit activity feed logging administrative actions.
* **Worker KYC Verification Hub (`WorkerVerification.jsx` & `WorkerVerificationDetail.jsx`)**:
  * Filter workers by status (`Pending`, `Verified`, `Rejected`), trade category, and locality.
  * Deep-dive document viewer for inspecting Aadhaar, Address proofs, and NSDC skill licenses.
  * **Verify Action**: One-click instant activation of worker with badge.
  * **Reject Action**: Form to input specific rejection reasons (e.g., "Blurry document", "Missing license").
* **Dispute & Complaints Desk (`Complaints.jsx` & `ComplaintDetail.jsx`)**:
  * Categorized ticket pipeline (`Open`, `Under Review`, `Resolved`).
  * Full dossier displaying Customer statements, Worker profile, and Booking transaction context.
  * Worker prior dispute history counter (flags repeat offenders).
  * **Resolution Notes**: Input and save formal dispute resolution records.
  * **Direct Moderation Action**: Suspend offending worker account directly from complaint ticket.
* **Worker Directory & Trust Moderation (`Workers.jsx`)**:
  * Complete registry of all registered workers with complaint counters and completed job metrics.
  * Actions: Suspend Worker, Reactivate Worker, Revoke Verification.
* **Admin Profile & Security Settings (`Settings.jsx`)**:
  * Update admin name, email, avatar.
  * Change administrative password with current password verification.

---

### 4.5 Dual-Engine Booking System (Standard vs. Emergency)
| Feature | Standard Booking | Emergency Dispatch |
| :--- | :--- | :--- |
| **Trigger** | Schedule button in worker profile | "🚨 Emergency Dispatch" toggle button |
| **Scheduling** | User picks specific Date & Time Slot | Hardcoded to Date: "Today", Time: "ASAP" |
| **Pricing Calculation** | `worker.hourlyRate` | `worker.hourlyRate + ₹150 Emergency Charge` |
| **Worker Notification** | `NORMAL_BOOKING_REQUEST` | `EMERGENCY_BOOKING_REQUEST` with high-priority siren badge |
| **Display Order** | Sorted by date/time | Pinned to top of worker queue (`sort({ isEmergency: -1 })`) |

---

### 4.6 Interactive Hyperlocal Map & Geolocation Engine
* **Technology**: Leaflet + React-Leaflet + OpenStreetMap tile servers (`tile.openstreetmap.org`).
* **Client Geolocation**: Uses browser `navigator.geolocation.getCurrentPosition` with high accuracy fallback.
* **Proximity Radius Filter**: Interactive radius toggle: **2 km**, **5 km**, **10 km** using the Haversine distance formula:
  $$\Delta\sigma = 2 \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
  $$\text{Distance} = R \times \Delta\sigma \quad (\text{where } R = 6371\text{ km})$$
* **Custom Map Elements**:
  * Glowing animated SVG dot for user's detected location.
  * Custom blue pin markers for available workers.
  * Interactive popups with worker avatar, trade title, hourly rate, calculated distance, and instant "View Profile" link.
  * Dynamic visual coverage circle representing the search radius.

---

### 4.7 Review & Rating Aggregation Engine
* Ratings range from 1 to 5 stars.
* When a customer submits a review via `POST /api/reviews`:
  1. New `Review` document is created linking `customerId`, `workerId`, and `bookingId`.
  2. The system executes a MongoDB query for all reviews where `workerId == targetWorker`:
     $$\text{New Average} = \frac{\sum \text{ratings}}{\text{Total Reviews Count}}$$
  3. The `User` document is atomically updated with `rating: newAverage` and `reviewsCount: totalReviewsCount`.

---

### 4.8 Dispute & Complaint Resolution Pipeline
* Customer selects from 7 standardized categories:
  * *Worker did not arrive*, *Poor service*, *Misconduct*, *Inappropriate behaviour*, *Overcharging*, *Property damage*, *Other*.
* Attaches incident description and optional proof image URLs.
* Ticket automatically enters `Open` status in Admin Complaints Desk.
* Admin transitions ticket to `Under Review` while contacting parties.
* Admin enters `resolutionNotes` and transitions ticket to `Resolved`.
* In extreme cases, Admin triggers `action: 'suspend'`, immediately preventing the worker from accepting future work or logging into the platform.

---

### 4.9 Notification & Alert Dispatch Engine
* System dispatches internal notifications at critical lifecycle points:
  * `NORMAL_BOOKING_REQUEST` / `EMERGENCY_BOOKING_REQUEST` $\rightarrow$ Worker
  * `BOOKING_ACCEPTED` $\rightarrow$ Customer
  * `BOOKING_REJECTED` $\rightarrow$ Customer
  * `SERVICE_COMPLETED` $\rightarrow$ Customer (triggers review prompt)
  * `BOOKING_CANCELLED` $\rightarrow$ Worker
* Features unread counter badge and one-click "Mark All as Read" action.

---

## 5. Complete REST API Contract & Endpoint Reference

### Base URL: `http://localhost:5000/api`

| Method | Endpoint | Protection | Request Payload / Query Params | Response Summary |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | | | | |
| `POST` | `/auth/register` | Public | `{ name, email, password, role, phone, location, skills, hourlyRate, ... }` | `{ token, user }` |
| `POST` | `/auth/login` | Public | `{ email, password }` | `{ token, user }` (Blocks suspended) |
| **Users** | | | | |
| `GET` | `/users/workers` | Public | `?category=&search=&verifiedOnly=` | `[User]` (Array of active verified workers) |
| `GET` | `/users/profile/:id`| Public | None | `User` object without password |
| `PUT` | `/users/profile` | `auth` | `{ name, phone, location, avatar, isAvailable, busySlots, documents, ... }` | Updated `User` object |
| **Jobs / Bookings** | | | | |
| `POST` | `/jobs` | `auth` | `{ workerId, serviceType, description, date, time, location, isEmergency, serviceCharge, emergencyCharge }` | Created `JobRequest` + triggers Notification |
| `GET` | `/jobs` | `auth` | `?asCustomer=true|false` | `[JobRequest]` sorted by emergency & creation |
| `GET` | `/jobs/:id` | `auth` | None | Single populated `JobRequest` |
| `PUT` | `/jobs/:id/status` | `auth` | `{ status: 'Accepted' | 'Rejected' | 'Completed' | 'Cancelled' }` | Updated `JobRequest` + triggers Notification |
| **Reviews** | | | | |
| `POST` | `/reviews` | `auth` | `{ workerId, bookingId, rating, comment }` | Created `Review` + updates Worker rating |
| `GET` | `/reviews/worker/:workerId` | Public | None | `[Review]` populated with customer avatar |
| **Projects / Portfolio** | | | | |
| `GET` | `/projects/worker/:workerId` | Public | None | `[Project]` array for worker |
| `POST` | `/projects` | `auth` | `{ title, description, category, images, imageUrl }` | Created `Project` |
| `DELETE` | `/projects/:id` | `auth` | None | `{ message: 'Portfolio item deleted' }` |
| **Complaints** | | | | |
| `POST` | `/complaints` | `auth` | `{ workerId, bookingId, category, description, evidence }` | Created `Complaint` in Open status |
| `GET` | `/complaints/my` | `auth` | None | `[Complaint]` filed by current customer |
| **Notifications** | | | | |
| `GET` | `/notifications` | `auth` | None | `{ notifications: [Notification], unreadCount: Number }` |
| `PUT` | `/notifications/:id/read` | `auth` | None | `{ message: 'Notification marked as read' }` |
| `PUT` | `/notifications/read-all` | `auth` | None | `{ message: 'All notifications marked as read' }` |
| **Admin Operations** | | | | |
| `GET` | `/admin/dashboard` | `auth + admin` | None | `{ metrics, pendingWorkers, recentComplaints, activities }` |
| `GET` | `/admin/verifications` | `auth + admin` | `?status=&category=&location=&search=` | `[User]` workers in verification queue |
| `GET` | `/admin/verifications/:id` | `auth + admin` | None | Detailed worker verification document record |
| `PUT` | `/admin/verifications/:id` | `auth + admin` | `{ action: 'verify' | 'reject', reason, details }` | Updated worker verification status |
| `GET` | `/admin/complaints` | `auth + admin` | `?status=&category=&search=` | `{ complaints: [Complaint], counts }` |
| `GET` | `/admin/complaints/:id` | `auth + admin` | None | Single complaint + worker prior complaint count |
| `PUT` | `/admin/complaints/:id` | `auth + admin` | `{ status, resolutionNotes }` | Updated complaint status and resolution |
| `GET` | `/admin/workers` | `auth + admin` | `?status=&search=` | `[User]` with `complaintCount` and `completedJobs` |
| `PUT` | `/admin/workers/:id/status` | `auth + admin` | `{ action: 'suspend' | 'reactivate' | 'revoke', reason }` | Updated worker status |
| `PUT` | `/admin/settings/profile` | `auth + admin` | `{ name, email, avatar }` | Updated admin profile |
| `PUT` | `/admin/settings/password`| `auth + admin` | `{ currentPassword, newPassword }` | Password change confirmation |

---

## 6. Frontend Application Architecture & Route Tree

```
/                                  --> RoleSelection.jsx (Portal Choice)
├── /login/customer                --> CustomerLoginView.jsx (Auth)
├── /login/worker                  --> WorkerLoginView.jsx (Auth)
├── /login/admin                   --> AdminLoginView.jsx (Auth)
│
├── /app                           --> MainLayout.jsx (Navbar + Mobile Nav)
│   ├── /app/                      --> HomeView.jsx (Discovery & Filtering)
│   ├── /app/map                   --> MapView.jsx (Leaflet Geospatial Map)
│   ├── /app/bookings              --> MyBookingsView.jsx (Customer Bookings)
│   ├── /app/notifications         --> NotificationsView.jsx (In-app Alerts)
│   ├── /app/profile               --> ProfileView.jsx (User Settings)
│   ├── /app/worker/:id            --> WorkerProfileView.jsx (Profile/Portfolio/Book)
│   │
│   │   [Worker Sub-routes]
│   ├── /app/workerHome            --> WorkerHome.jsx (Worker Queue & Toggle)
│   ├── /app/worker/bookings       --> WorkerBookingsView.jsx (Job History)
│   ├── /app/worker/schedule       --> WorkerScheduleView.jsx (Calendar & Slots)
│   └── /app/workerProfile         --> WorkerProfileView.jsx (Self-Profile & KYC)
│
└── /admin                         --> AdminLayout.jsx (Admin Nav & Sidebar)
    ├── /admin/dashboard           --> AdminDashboard.jsx (Metrics & KPIs)
    ├── /admin/verification        --> WorkerVerification.jsx (KYC Queue)
    ├── /admin/verification/:id    --> WorkerVerificationDetail.jsx (Docs Audit)
    ├── /admin/complaints          --> Complaints.jsx (Dispute Pipeline)
    ├── /admin/complaints/:id      --> ComplaintDetail.jsx (Dispute Dossier)
    ├── /admin/workers             --> Workers.jsx (Trust & Moderation)
    └── /admin/settings            --> Settings.jsx (Admin Security)
```

---

## 7. Environment Configuration & Seeding Instructions

### 7.1 Backend Environment File (`backend/.env`)
```env
PORT=5000
JWT_SECRET=nearfix_secret_key_2026
# Optional: Provide remote MongoDB URI. If omitted or fails, MongoMemoryServer starts automatically.
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/nearfix?retryWrites=true&w=majority
```

### 7.2 Database Seeding Architecture (`backend/seed.js`)
* The seed script populates realistic demo accounts across all three personas:
  * **Admin Account**: `admin@nearfix.com` / `password123`
  * **Customer Account**: `customer@example.com` / `password123`
  * **Verified Worker**: `rajesh@example.com` / `password123` (Plumber)
  * **Verified Worker**: `marcus@example.com` / `password123` (Electrician)
  * **Verified Worker**: `elena@example.com` / `password123` (Painter)
  * **Verified Worker**: `sanjeev@example.com` / `password123` (Carpenter)
  * **Pending KYC Workers**: `rahul@example.com`, `ananth@example.com`
* **Important Execution Note**:
  * `seed.js` is automatically triggered whenever `backend/server.js` boots up!
  * If executing manually, make sure your working directory is `backend/`:
    ```bash
    cd backend
    node seed.js
    ```
    *(Running `node seed.js` from the workspace root will produce `Cannot find module .../seed.js` because `seed.js` lives inside the `backend` folder).*

---

## 8. Step-by-Step Rebuild & Reproduction Guide

If you are recreating this project in a clean directory:

### Step 1: Initialize Backend
1. Create `backend/` directory and initialize:
   ```bash
   mkdir backend && cd backend
   npm init -y
   ```
2. Install backend dependencies:
   ```bash
   npm install express@^5.2.1 mongoose@^9.3.1 jsonwebtoken@^9.0.3 bcryptjs@^3.0.3 cors@^2.8.6 dotenv@^17.3.1 mongodb-memory-server@^11.2.0 multer@^2.1.1
   npm install --save-dev nodemon@^3.1.14
   ```
3. Create `backend/models/`: `User.js`, `JobRequest.js`, `Booking.js`, `Complaint.js`, `Notification.js`, `Project.js`, `Review.js`.
4. Create `backend/middleware/`: `authMiddleware.js`, `adminMiddleware.js`.
5. Create `backend/routes/`: `authRoutes.js`, `userRoutes.js`, `jobRoutes.js`, `complaintRoutes.js`, `notificationRoutes.js`, `projectRoutes.js`, `reviewRoutes.js`, `adminRoutes.js`.
6. Implement `backend/seed.js` and `backend/server.js` with MongoMemoryServer fallback.

### Step 2: Initialize Frontend
1. Return to project root and create Vite React app:
   ```bash
   npm create vite@latest . -- --template react
   ```
2. Install frontend dependencies:
   ```bash
   npm install react-router-dom@^7.13.1 leaflet@^1.9.4 react-leaflet@^5.0.0 lucide-react@^0.577.0 @react-google-maps/api@^2.20.8 multer@^2.1.1
   ```
3. Create styles in `src/index.css` implementing glassmorphism CSS variables (`--bg-primary`, `--accent-primary`, `--glass-bg`, etc.).
4. Create layout wrappers: `src/components/MainLayout.jsx` and `src/components/AdminLayout.jsx`.
5. Implement interactive Leaflet map component in `src/components/MapComponent.jsx`.
6. Build pages inside `src/views/` and `src/views/admin/`.
7. Configure routes in `src/App.jsx`.

### Step 3: Run the Application
1. **Start Backend Server**:
   ```bash
   cd backend
   node server.js
   # Running on http://localhost:5000
   ```
2. **Start Frontend Dev Server**:
   ```bash
   # In root directory
   npm run dev
   # Running on http://localhost:5173
   ```
3. Open `http://localhost:5173` to explore Customer, Worker, and Admin interfaces.
