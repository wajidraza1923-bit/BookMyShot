# BOOKMYSHOT — MASTER DOCUMENTATION

> **Version:** 1.0 | **Date:** June 2026 | **Platform:** BookMyShot Creator Booking Platform

---

## How to Convert This Document

To generate PDF or DOCX versions:

**Using Pandoc (free, open source):**
```bash
pandoc BOOKMYSHOT_MASTER_DOCUMENTATION.md -o BOOKMYSHOT_MASTER_DOCUMENTATION.pdf
pandoc BOOKMYSHOT_MASTER_DOCUMENTATION.md -o BOOKMYSHOT_MASTER_DOCUMENTATION.docx
```

**Online converters:** Upload this .md file to https://md2pdf.netlify.app or https://cloudconvert.com

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Folder Structure](#3-folder-structure)
4. [Environment Setup](#4-environment-setup)
5. [Database Architecture](#5-database-architecture)
6. [Authentication System](#6-authentication-system)
7. [API Reference](#7-api-reference)
8. [Feature Documentation](#8-feature-documentation)
9. [Super Admin Panel](#9-super-admin-panel)
10. [Creator Dashboard](#10-creator-dashboard)
11. [User Dashboard](#11-user-dashboard)
12. [Homepage Architecture](#12-homepage-architecture)
13. [Non-Technical Owner Guide](#13-non-technical-owner-guide)
14. [Developer Handover Guide](#14-developer-handover-guide)
15. [Troubleshooting Guide](#15-troubleshooting-guide)
16. [Deployment Guide](#16-deployment-guide)
17. [Security Considerations](#17-security-considerations)
18. [Future Roadmap](#18-future-roadmap)

---

## 1. PROJECT OVERVIEW

BookMyShot is India's premium creator booking platform that connects clients with photographers, YouTubers, influencers, singers, models, actors, and event hosts. The platform provides:

- **For Clients:** Browse creators, send booking requests, make payments
- **For Creators:** Manage portfolio, accept bookings, track earnings
- **For Admin:** Complete business control — pricing, commissions, approvals, revenue tracking

### Business Model
- Creator Monthly Subscription: ₹299/month (configurable)
- BMS Lead Commission: 5% (configurable from admin)
- Creator Lead Commission: 3% (configurable from admin)
- Homepage Featured Placement: ₹1499/month (configurable)
- Rank Placements: ₹799-1999/month (configurable)

All prices are stored in MongoDB and editable from the Super Admin panel without code changes.

---

## 2. TECHNOLOGY STACK

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express.js |
| Database | MongoDB Atlas (Mongoose ODM) |
| Authentication | JWT (JSON Web Tokens) |
| Frontend | Vanilla HTML/CSS/JavaScript |
| CSS Framework | Custom premium dark theme |
| Hosting | Any Node.js host (VPS, Railway, Render) |
| File Storage | Local `/public/uploads/` |
| Fonts | Google Fonts (Outfit, Playfair Display) |
| Icons | Font Awesome 6.5 + custom SVG |

---

## 3. FOLDER STRUCTURE

```
BookMyShot/
├── server/                    # Backend application
│   ├── index.js              # Main server entry point
│   ├── config/
│   │   └── db.js            # MongoDB connection
│   ├── middleware/
│   │   ├── auth.js          # JWT auth + role authorization
│   │   ├── errorHandler.js  # Global error handler
│   │   ├── maintenance.js   # Maintenance mode check
│   │   ├── upload.js        # Multer file upload
│   │   └── validate.js      # Request validation
│   ├── models/               # Mongoose schemas
│   │   ├── User.js
│   │   ├── Creator.js
│   │   ├── Booking.js
│   │   ├── Commission.js
│   │   ├── Invoice.js
│   │   ├── Payment.js
│   │   ├── PaymentRecord.js
│   │   ├── Notification.js
│   │   ├── Message.js
│   │   ├── Inquiry.js
│   │   ├── Review.js
│   │   ├── CalendarEvent.js
│   │   ├── Homepage.js
│   │   ├── Contact.js
│   │   ├── PlatformSettings.js
│   │   ├── SubscriptionSettings.js
│   │   ├── CommissionSettings.js
│   │   ├── SearchBoost.js
│   │   ├── Announcement.js
│   │   ├── AuditLog.js
│   │   ├── SocialLinks.js
│   │   └── PromotionRequest.js
│   ├── routes/               # API route handlers
│   │   ├── auth.js
│   │   ├── admin.js         # Main admin routes
│   │   ├── admin/           # Admin sub-routers
│   │   │   ├── platformSettings.js
│   │   │   ├── subscriptionSettings.js
│   │   │   ├── commissionSettings.js
│   │   │   ├── creatorAccounts.js
│   │   │   ├── featuredPortfolios.js
│   │   │   ├── searchBoosts.js
│   │   │   ├── revenueCenter.js
│   │   │   ├── announcements.js
│   │   │   ├── financeControl.js
│   │   │   ├── auditLogs.js
│   │   │   ├── dashboard.js
│   │   │   └── socialLinks.js
│   │   ├── creators.js
│   │   ├── bookings.js
│   │   ├── commissions.js
│   │   ├── revenue.js
│   │   ├── promotionRequests.js
│   │   ├── payments.js
│   │   ├── messages.js
│   │   ├── notifications.js
│   │   └── homepage.js
│   ├── services/
│   │   ├── configService.js  # Cached config reads
│   │   └── auditService.js   # Audit logging
│   └── utils/
│       ├── generateToken.js
│       └── notify.js
├── public/                    # Frontend files
│   ├── index.html            # Homepage
│   ├── login.html
│   ├── register.html
│   ├── creators.html         # Public creator listing
│   ├── creator-portfolio.html
│   ├── about.html
│   ├── contact.html
│   ├── terms.html
│   ├── privacy.html
│   ├── refund-policy.html
│   ├── booking-cancellation.html
│   ├── cookie-policy.html
│   ├── creator-guidelines.html
│   ├── admin/
│   │   ├── dashboard.html    # Super Admin panel
│   │   └── admin.js
│   ├── creator/
│   │   ├── dashboard.html    # Creator panel
│   │   └── index.html
│   ├── user/
│   │   ├── dashboard.html    # User panel
│   │   └── user.js
│   ├── css/
│   │   └── premium-homepage.css
│   ├── js/
│   │   ├── api.js           # API client
│   │   ├── utils.js         # Shared utilities
│   │   └── homepage.js      # Homepage logic
│   └── uploads/             # User-uploaded files
├── package.json
├── .env                      # Environment variables
└── .gitignore
```

---

## 4. ENVIRONMENT SETUP

### Required .env Variables

```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bookmyshot
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=production
```

### Local Development Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd BookMyShot

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# 4. Start server
node server/index.js
# Server runs on http://localhost:5000
```

### Dependencies (package.json)

| Package | Purpose |
|---------|---------|
| express | Web framework |
| mongoose | MongoDB ODM |
| jsonwebtoken | JWT authentication |
| bcryptjs | Password hashing |
| cors | Cross-origin requests |
| dotenv | Environment variables |
| multer | File upload handling |

---

## 5. DATABASE ARCHITECTURE

### MongoDB Collections

| Collection | Model File | Purpose |
|-----------|-----------|---------|
| users | User.js | All registered users (admin/creator/user roles) |
| creators | Creator.js | Creator profiles, portfolios, subscription info |
| bookings | Booking.js | All booking records |
| commissions | Commission.js | Commission records per booking |
| invoices | Invoice.js | Financial invoices |
| payments | Payment.js | Payment transactions |
| paymentrecords | PaymentRecord.js | Detailed payment tracking |
| notifications | Notification.js | User notifications |
| messages | Message.js | Chat messages |
| inquiries | Inquiry.js | Booking inquiries |
| reviews | Review.js | Creator reviews |
| calendarevents | CalendarEvent.js | Creator calendar events |
| homepages | Homepage.js | Homepage CMS content |
| contacts | Contact.js | Contact form submissions |
| platformsettings | PlatformSettings.js | Global platform config |
| subscriptionsettings | SubscriptionSettings.js | Pricing configuration |
| commissionsettings | CommissionSettings.js | Commission rates |
| searchboosts | SearchBoost.js | Search boost requests |
| announcements | Announcement.js | Admin announcements |
| auditlogs | AuditLog.js | Admin action logs |
| sociallinks | SocialLinks.js | Social media URLs |
| promotionrequests | PromotionRequest.js | Creator promotion applications |

### Key Schema: Creator

```javascript
{
  user: ObjectId (ref User),
  status: "pending" | "approved" | "rejected",
  specialty: String,
  bio: String,
  city: String,
  category: String,
  rating: Number,
  featured: Boolean,
  featuredStartDate: Date,
  featuredEndDate: Date,
  verified: Boolean,
  badge: String (enum),
  rank: Number,
  portfolio: [String],
  videos: [String],
  packages: [{name, price, description, features}],
  subscriptionStatus: "trial" | "active" | "expired" | "suspended",
  subscriptionAmount: Number,
  subscriptionEndDate: Date,
  earnings: Number
}
```

### Key Schema: SubscriptionSettings (single document)

```javascript
{
  monthlyPlanPrice: 299,
  yearlyPlanPrice: 2999,
  trialDays: 30,
  gracePeriodDays: 7,
  featuredPortfolioPrice: 999,
  searchBoostPrice: 499,
  homepageFeaturedPrice: 1499,
  rank1Price: 1999,
  rank2Price: 1499,
  rank3Price: 999,
  rank4Price: 799,
  autoRenewDefault: true
}
```

### Key Schema: CommissionSettings (single document)

```javascript
{
  bmsLeadCommissionPercent: 5,
  creatorLeadCommissionPercent: 3,
  latePaymentFeePercent: 2,
  manualAdjustmentPercent: 0
}
```

---

## 6. AUTHENTICATION SYSTEM

### Flow
1. User registers via `/api/auth/register` → password hashed with bcrypt → JWT token returned
2. User logs in via `/api/auth/login` → credentials verified → JWT returned
3. Frontend stores token in `localStorage` as `bms_token`
4. Every API request includes `Authorization: Bearer <token>` header
5. `protect` middleware validates JWT and loads user from DB
6. `authorize("admin")` middleware checks user role

### Roles
| Role | Access |
|------|--------|
| user | Browse creators, create bookings, send inquiries |
| creator | Manage portfolio, accept bookings, track earnings |
| admin | Full platform control via Super Admin panel |

### Key Files
- `server/middleware/auth.js` — protect + authorize functions
- `server/routes/auth.js` — register, login, /me endpoints
- `server/utils/generateToken.js` — JWT creation
- `public/js/api.js` — Frontend token management

---

## 7. API REFERENCE

### Authentication
| Method | URL | Auth | Purpose |
|--------|-----|------|---------|
| POST | /api/auth/register | None | Register new user |
| POST | /api/auth/login | None | Login |
| GET | /api/auth/me | Token | Get current user |

### Creators (Public)
| Method | URL | Auth | Purpose |
|--------|-----|------|---------|
| GET | /api/creators | None | List approved creators |
| GET | /api/creators/:id | None | Single creator |
| GET | /api/creators/public/:id | None | Creator portfolio data |

### Bookings
| Method | URL | Auth | Purpose |
|--------|-----|------|---------|
| POST | /api/bookings | User | Create booking |
| GET | /api/bookings/all | Admin | All bookings |
| GET | /api/bookings/creator | Creator | Creator's bookings |

### Admin Settings
| Method | URL | Auth | Purpose |
|--------|-----|------|---------|
| GET/PUT | /api/admin/platform-settings | Admin | Platform config |
| GET/PUT | /api/admin/subscription-settings | Admin | Pricing config |
| GET/PUT | /api/admin/commission-settings | Admin | Commission rates |
| GET/PUT | /api/admin/social-links | Admin | Social media URLs |

### Admin Creator Management
| Method | URL | Auth | Purpose |
|--------|-----|------|---------|
| GET | /api/admin/creator-accounts | Admin | List all creators |
| PATCH | /api/admin/creator-accounts/:id/activate | Admin | Approve creator |
| PATCH | /api/admin/creator-accounts/:id/deactivate | Admin | Reject creator |
| PATCH | /api/admin/creator-accounts/:id/suspend | Admin | Suspend creator |
| PATCH | /api/admin/creator-accounts/:id/verify | Admin | Verify creator |
| PATCH | /api/admin/creator-accounts/:id/feature | Admin | Feature creator |
| PATCH | /api/admin/creator-accounts/:id/badge | Admin | Set badge |
| PATCH | /api/admin/creator-accounts/:id/rank | Admin | Set rank |

### Promotions
| Method | URL | Auth | Purpose |
|--------|-----|------|---------|
| GET | /api/promotions/plans | Any | Get plans with prices |
| POST | /api/promotions/apply | Creator | Apply for promotion |
| GET | /api/promotions/my-requests | Creator | My requests |
| GET | /api/promotions/admin/all | Admin | All requests |
| PATCH | /api/promotions/admin/:id/approve | Admin | Approve |
| PATCH | /api/promotions/admin/:id/reject | Admin | Reject |

### Public Config
| Method | URL | Auth | Purpose |
|--------|-----|------|---------|
| GET | /api/config/public | None | Pricing + commission info |
| GET | /api/social-links | None | Social media URLs |

---

## 8. FEATURE DOCUMENTATION

### 8.1 Commission System

**What it does:** Automatically calculates platform commission on every booking based on lead source.

| Item | Detail |
|------|--------|
| Files | `server/routes/revenue.js`, `server/routes/paymentrecords.js`, `server/routes/commissions.js` |
| API | `GET/PUT /api/admin/commission-settings` |
| DB Collection | `commissionsettings` |
| Config Service | `configService.getCommissionSettings()` |
| Frontend | Creator dashboard revenue panel, Admin dashboard |

**How it works:**
- When a booking amount is set, the system reads commission rates from `CommissionSettings` collection
- BMS-sourced bookings get `bmsLeadCommissionPercent` (default 5%)
- Creator-sourced bookings get `creatorLeadCommissionPercent` (default 3%)
- Admin changes rates → new bookings use new rate → existing bookings unchanged

**If you edit this:**
- Change `server/models/CommissionSettings.js` to add new rate fields
- Update `configService.js` if adding new config categories
- Frontend reads dynamically from `/api/config/public`

---

### 8.2 Subscription System

**What it does:** Manages creator monthly subscription for platform access.

| Item | Detail |
|------|--------|
| Files | `server/routes/revenue.js` (subscribe endpoint), `server/routes/auth.js` (trial setup) |
| API | `POST /api/revenue/creator/subscribe` |
| DB Fields | `Creator.subscriptionStatus`, `Creator.subscriptionAmount`, `Creator.subscriptionEndDate` |
| Pricing Source | `SubscriptionSettings.monthlyPlanPrice` |

**Flow:**
1. Creator registers → trial status for `trialDays` days
2. Trial expires → status becomes "expired"
3. Creator subscribes → reads price from DB → status becomes "active" for 30 days

---

### 8.3 Featured Creator System

**What it does:** Admin can mark creators as "Featured" to appear in the homepage Featured section.

| Item | Detail |
|------|--------|
| Files | `server/routes/admin/featuredPortfolios.js`, `server/routes/admin/creatorAccounts.js` |
| DB Fields | `Creator.featured`, `Creator.featuredStartDate`, `Creator.featuredEndDate` |
| Homepage | `public/js/homepage.js` → `loadFeaturedCreators()` |

**Rules:**
- Featured section hidden if 0 featured creators exist
- Maximum 4 creators shown
- Gold "★ FEATURED" badge on cards
- Expiry date checked (expired featured = not shown)

---

### 8.4 Creator Ranking & Badge System

**What it does:** Admin assigns rank numbers and visual badges to creators.

| Item | Detail |
|------|--------|
| DB Fields | `Creator.rank` (Number), `Creator.badge` (String enum) |
| API | `PATCH /api/admin/creator-accounts/:id/rank`, `PATCH /api/admin/creator-accounts/:id/badge` |
| Frontend | `homepage.js` → `getBadgeHtml()` + rank sorting |

**Rank:** Controls sort order in All Creators section (1=first, 0=unranked)
**Badge:** Visual label (Most Trusted, Premium Creator, Top Rated, etc.)
**Independent:** A creator can have rank + badge + featured simultaneously.

---

### 8.5 Promotion Request System

**What it does:** Creators apply for promotional placements, admin approves/rejects.

| Item | Detail |
|------|--------|
| Model | `server/models/PromotionRequest.js` |
| Route | `server/routes/promotionRequests.js` |
| Pricing | Read from `SubscriptionSettings` (rank1Price, rank2Price, etc.) |
| Creator UI | Creator Dashboard → Promotions panel |
| Admin UI | Admin Dashboard → 🏆 Promotion Requests |

**Flow:**
1. Creator sees plans with current prices from DB
2. Creator clicks "Apply Now" → creates pending request
3. Admin sees request in Promotion Requests panel
4. Admin approves → creator gets featured/rank for 30 days
5. After expiry → promotion auto-removed

---

### 8.6 Maintenance Mode

**What it does:** Blocks all non-admin traffic when enabled.

| Item | Detail |
|------|--------|
| File | `server/middleware/maintenance.js` |
| Config | `PlatformSettings.maintenanceMode` |
| Behavior | Returns 503 to non-admin users |
| Admin bypass | Admin users pass through |
| Auth bypass | `/api/auth` routes pass through |

---

### 8.7 Audit Logging

**What it does:** Records every admin action with full change history.

| Item | Detail |
|------|--------|
| Model | `server/models/AuditLog.js` |
| Service | `server/services/auditService.js` |
| Admin UI | Admin → 📋 Audit Logs |
| Stores | action, adminId, adminName, target, previousValues, newValues, timestamp |

---

### 8.8 Social Links Management

**What it does:** Admin configures social media URLs that display in homepage footer.

| Item | Detail |
|------|--------|
| Model | `server/models/SocialLinks.js` |
| Route | `server/routes/admin/socialLinks.js` |
| Public API | `GET /api/social-links` |
| Admin UI | Admin → 📱 Social Links |
| Homepage | Footer dynamically renders icons for configured URLs |

---

## 9. SUPER ADMIN PANEL

**URL:** `http://localhost:5000/admin/dashboard.html`
**File:** `public/admin/dashboard.html`

### Sidebar Navigation

| Menu Item | Function |
|-----------|----------|
| 📊 Dashboard | Platform overview stats |
| 📸 Creators | Creator list with approve/reject |
| 👥 Users | Registered users |
| 📅 Bookings | All bookings |
| 📩 Inquiries | Platform inquiries |
| 💰 Payments | Payment tracking |
| 📈 Commissions | Commission records |
| 💎 Revenue | Revenue breakdown |
| 👑 Subscriptions | Subscription management |
| 🔔 Notifications | Broadcast system |
| 📆 Calendar | All events |
| 📞 Contacts | Contact form submissions |
| 🏠 Homepage CMS | Hero content editor |
| 📱 Social Links | Social media URLs |
| 🏆 Promotion Requests | Creator promotion approvals |
| ⚙️ Platform Settings | Site name, email, maintenance |
| 💳 Subscription Settings | All pricing configuration |
| 📊 Commission Settings | Commission rates |
| ⭐ Featured Creators | Featured management |
| 🚀 Search Boosts | Boost management |
| 💰 Revenue Center | Time-filtered revenue |
| 📢 Announcements | Send announcements |
| 🏦 Finance | Manual payments, refunds |
| 👤 Creator Accounts | Full lifecycle management + rank/badge |
| 📋 Audit Logs | Action history |

---

## 10. CREATOR DASHBOARD

**URL:** `http://localhost:5000/creator/dashboard.html`
**File:** `public/creator/dashboard.html`

### Features
- Dashboard overview (stats, upcoming events)
- Profile management (bio, specialty, city, social links)
- Portfolio (photos + videos upload)
- Packages management
- Booking management (accept/reject requests)
- Personal calendar
- Public availability calendar
- Messages
- Earnings tracking
- Revenue & subscription
- **Promotion Plans** (apply for featured/rank placements)
- Settings

---

## 11. USER DASHBOARD

**URL:** `http://localhost:5000/user/dashboard.html`
**File:** `public/user/dashboard.html`

### Features
- Browse creators
- Send booking requests
- View booking status
- Messages with creators
- Notifications

---

## 12. HOMEPAGE ARCHITECTURE

**File:** `public/index.html`
**JS:** `public/js/homepage.js`
**CSS:** `public/css/premium-homepage.css`

### Sections
1. Header with hamburger menu
2. Hero section (headline, search, buttons)
3. Featured Creators (DB-driven, auto-hidden if empty)
4. Why Choose BookMyShot (4 feature cards)
5. All Creators (DB-driven, rank-sorted)
6. Booking form
7. Footer (DB-driven social links)

### Performance Fixes Applied
- All CSS animations disabled via inline overrides
- No backdrop-filter on scrollable elements
- No filter:blur on animated elements
- Page loader removed (was causing black screen)
- .reveal class shows content by default
- IntersectionObserver with safety timeout

---

## 13. NON-TECHNICAL OWNER GUIDE

### How to Manage Creators

1. Go to `yoursite.com/admin/dashboard.html`
2. Login with admin credentials
3. Click **"👤 Creator Accounts"** in the sidebar
4. You'll see all creators with their status
5. Click **Activate** to approve a pending creator
6. Click **Feature** to show them in Featured section
7. Change the **Rank number** (1=first, 2=second) to reorder creators
8. Select a **Badge** from the dropdown to give them a label

### How to Change Pricing

1. Go to Admin → **"💳 Subscription Settings"**
2. Change Monthly Plan Price, Featured Price, Rank Prices
3. Click **Save**
4. New prices take effect immediately for new subscriptions

### How to Change Commission Rates

1. Go to Admin → **"📊 Commission Settings"**
2. Change BMS Lead % or Creator Lead %
3. Click **Save**
4. New rates apply to future bookings only (existing bookings unchanged)

### How Revenue Works

BookMyShot earns from three sources:
- **Subscriptions:** Monthly fee from each active creator
- **Commissions:** Percentage of each booking amount
- **Promotions:** Featured/rank placement fees from creators

### How to Send Announcements

1. Go to Admin → **"📢 Announcements"**
2. Fill in title, message, type, audience
3. Click **Send**
4. All targeted users receive a notification

### How to Check What Admins Did

1. Go to Admin → **"📋 Audit Logs"**
2. Every admin action is recorded with before/after values
3. Filter by date, admin name, or action type

---

## 14. DEVELOPER HANDOVER GUIDE

### Setting Up Locally

```bash
# Prerequisites: Node.js 18+, MongoDB Atlas account

git clone <repo>
cd BookMyShot
npm install
cp .env.example .env
# Fill in MONGODB_URI and JWT_SECRET
node server/index.js
```

### Adding a New Feature

1. Create model in `server/models/NewFeature.js`
2. Create route in `server/routes/newFeature.js`
3. Register in `server/index.js` with `app.use("/api/new-feature", ...)`
4. Add admin UI in `public/admin/dashboard.html` (sidebar + panel + JS function)
5. **Restart server** after backend changes

### Code Conventions
- Backend: CommonJS modules (`require/module.exports`)
- Frontend: Vanilla JS (no frameworks)
- API responses: `{ success: true/false, data/message }`
- Auth: JWT in `Authorization: Bearer` header
- Config: Single-document pattern for settings collections
- Audit: Call `auditService.logAction()` for every admin mutation

### Common Issues

| Issue | Fix |
|-------|-----|
| 404 on new routes | Restart server |
| "No creators found" in admin | Check `data.data.creators` extraction |
| Page unresponsive | Check for CSS animations, backdrop-filter |
| Badge/rank not saving | Restart server to load new routes |
| Social icons not showing | Check if URLs are set in admin → Social Links |

---

## 15. TROUBLESHOOTING GUIDE

### Homepage White Screen
**Cause:** CSS `.reveal{opacity:0}` or page-loader overlay
**Fix:** Inline style overrides in `<head>`: `.reveal{opacity:1!important}`, `.page-loader{display:none!important}`

### Page Unresponsive
**Cause:** CSS animations (backdrop-filter + animated gradient on sticky header)
**Fix:** `animation:none!important` on `.brand-logo`, remove `backdrop-filter` from `.topbar`

### Admin Panel Shows "No creators found"
**Cause:** API returns `{data:{creators:[...]}}` but frontend reads `data.data` (object not array)
**Fix:** Use `(data.data && data.data.creators) || data.data || []`

### API Returns 404 for New Endpoints
**Cause:** Server running old code (module loaded at startup, new file not picked up)
**Fix:** Restart server: `Ctrl+C` then `node server/index.js`

### Commission/Pricing Not Updating
**Cause:** ConfigService has 60-second cache
**Fix:** Wait 60 seconds, or restart server to clear cache

---

## 16. DEPLOYMENT GUIDE

### Option 1: VPS (DigitalOcean, AWS EC2)

```bash
# On server:
git clone <repo>
cd BookMyShot
npm install --production
# Set environment variables
export MONGODB_URI=...
export JWT_SECRET=...
export PORT=5000
# Start with PM2
npm install -g pm2
pm2 start server/index.js --name bookmyshot
pm2 save
pm2 startup
```

### Option 2: Railway / Render

1. Connect GitHub repository
2. Set environment variables in dashboard
3. Set start command: `node server/index.js`
4. Deploy

### Required Environment Variables for Production
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=strong_random_string_here
PORT=5000
NODE_ENV=production
```

---

## 17. SECURITY CONSIDERATIONS

- Passwords hashed with bcrypt (never stored plain)
- JWT tokens expire after 7 days
- Admin routes protected with role check
- File uploads limited by multer size config
- No SQL injection possible (MongoDB + Mongoose validation)
- XSS mitigation: no `innerHTML` from user input
- CORS enabled for API access
- Rate limiting not yet implemented (recommended for production)

---

## 18. FUTURE ROADMAP

| Feature | Priority | Complexity |
|---------|----------|-----------|
| Razorpay Payment Gateway | High | Medium |
| Email Notifications (SendGrid) | High | Low |
| Mobile App (React Native) | Medium | High |
| Analytics Dashboard | Medium | Medium |
| Auto-expiry Cron Job | High | Low |
| Rate Limiting | High | Low |
| Image Optimization (Sharp) | Medium | Low |
| Creator Verification Docs | Medium | Medium |
| Multi-language Support | Low | High |
| Creator Analytics | Medium | Medium |

---

## APPENDIX: ALL FILE PATHS

### Backend Models
| File | Collection |
|------|-----------|
| server/models/User.js | users |
| server/models/Creator.js | creators |
| server/models/Booking.js | bookings |
| server/models/Commission.js | commissions |
| server/models/Invoice.js | invoices |
| server/models/Payment.js | payments |
| server/models/PlatformSettings.js | platformsettings |
| server/models/SubscriptionSettings.js | subscriptionsettings |
| server/models/CommissionSettings.js | commissionsettings |
| server/models/SearchBoost.js | searchboosts |
| server/models/Announcement.js | announcements |
| server/models/AuditLog.js | auditlogs |
| server/models/SocialLinks.js | sociallinks |
| server/models/PromotionRequest.js | promotionrequests |
| server/models/Notification.js | notifications |
| server/models/Message.js | messages |
| server/models/Inquiry.js | inquiries |
| server/models/Review.js | reviews |
| server/models/CalendarEvent.js | calendarevents |
| server/models/Homepage.js | homepages |
| server/models/Contact.js | contacts |

---

*Document generated for BookMyShot v1.0 — June 2026*
*For questions contact the development team.*
