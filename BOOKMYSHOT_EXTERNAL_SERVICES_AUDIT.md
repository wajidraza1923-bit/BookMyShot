# BOOKMYSHOT — EXTERNAL SERVICES & DEPENDENCIES AUDIT

> **Audit Date:** June 2026 | **Project:** BookMyShot Creator Booking Platform

---

## TABLE OF CONTENTS

1. [NPM Packages (Backend Dependencies)](#1-npm-packages)
2. [Database Services](#2-database-services)
3. [CDN & Fonts](#3-cdn--fonts)
4. [External Image Services](#4-external-image-services)
5. [Payment Gateway](#5-payment-gateway)
6. [Hosting & Domain](#6-hosting--domain)
7. [Authentication Services](#7-authentication-services)
8. [Email Services](#8-email-services)
9. [Cloud Storage](#9-cloud-storage)
10. [Analytics](#10-analytics)
11. [Social Media Integrations](#11-social-media-integrations)
12. [Environment Variables](#12-environment-variables)
13. [Future Costs & Renewal Checklist](#13-future-costs--renewal-checklist)

---

## 1. NPM PACKAGES

### Core Dependencies

| Package | Version | Purpose | Free/Paid | Risk if Removed |
|---------|---------|---------|-----------|-----------------|
| express | ^4.21.0 | Web server framework | Free (MIT) | App won't start |
| mongoose | ^8.7.0 | MongoDB ODM | Free (MIT) | No database access |
| jsonwebtoken | ^9.0.2 | JWT auth tokens | Free (MIT) | No authentication |
| bcryptjs | ^2.4.3 | Password hashing | Free (MIT) | No secure passwords |
| cors | ^2.8.5 | Cross-origin requests | Free (MIT) | Frontend can't call API |
| dotenv | ^16.4.5 | Environment variables | Free (BSD) | No .env loading |
| multer | ^1.4.5-lts.1 | File upload handling | Free (MIT) | No photo/video uploads |
| mongodb | ^7.2.0 | MongoDB driver | Free (Apache 2.0) | Required by Mongoose |
| razorpay | ^2.9.6 | Payment gateway SDK | Free SDK (paid service) | No payment processing |
| pdfkit | ^0.15.0 | PDF generation | Free (MIT) | No invoice PDFs |

### FullCalendar (Creator Calendar)

| Package | Version | Purpose | Free/Paid |
|---------|---------|---------|-----------|
| @fullcalendar/core | ^6.1.20 | Calendar engine | Free (MIT) |
| @fullcalendar/daygrid | ^6.1.20 | Month/day view | Free (MIT) |
| @fullcalendar/interaction | ^6.1.20 | Click/drag events | Free (MIT) |
| @fullcalendar/list | ^6.1.20 | List view | Free (MIT) |
| @fullcalendar/timegrid | ^6.1.20 | Time grid view | Free (MIT) |

**Monthly Cost:** ₹0 (all packages are open source)
**Risk:** Package deprecation — low risk, all actively maintained
**Migration:** No migration needed, these are static dependencies

---

## 2. DATABASE SERVICES

### MongoDB Atlas

| Item | Detail |
|------|--------|
| **Service Name** | MongoDB Atlas |
| **Provider** | MongoDB Inc. |
| **Where Used** | Entire backend — all data storage |
| **File Paths** | `server/config/db.js`, `.env` (MONGODB_URI) |
| **Current Plan** | Free tier (M0 Shared) |
| **Free Tier Limits** | 512 MB storage, shared RAM, 100 max connections |
| **Paid Plans** | M10 starts at ~$57/month, M20 at ~$170/month |
| **Pricing Model** | Per-cluster monthly billing |
| **Current Cluster** | `ac-tk0gd4q-shard-00-00.meoixp9.mongodb.net` |
| **Database Name** | `bookmyshot` |
| **Risk if Stops** | ENTIRE APP STOPS — no data access at all |
| **Owner Action** | Monitor storage usage, upgrade before 512MB limit |
| **Monthly Cost** | ₹0 (free tier) → ₹4,500+ when upgrading |
| **Migration Difficulty** | Medium — export/import via mongodump/mongorestore |
| **Alternatives** | Self-hosted MongoDB, DigitalOcean Managed DB, AWS DocumentDB |

**⚠️ CRITICAL:** This is the single most important external service. If MongoDB Atlas goes down, the entire platform is inaccessible.

---

## 3. CDN & FONTS

### Google Fonts

| Item | Detail |
|------|--------|
| **Service Name** | Google Fonts |
| **Provider** | Google |
| **Where Used** | All HTML pages — typography |
| **URLs** | `fonts.googleapis.com`, `fonts.gstatic.com` |
| **Fonts Used** | Outfit (body), Playfair Display (headings), Inter (legal pages), Cormorant Garamond (auth pages) |
| **File Paths** | Every `.html` file in `public/` |
| **Free/Paid** | 100% Free |
| **Risk if Stops** | Pages use fallback system fonts — ugly but functional |
| **Monthly Cost** | ₹0 |
| **Migration** | Download fonts, self-host in `/public/fonts/` |
| **Migration Difficulty** | Low |

### Font Awesome (Icons)

| Item | Detail |
|------|--------|
| **Service Name** | Font Awesome CDN |
| **Provider** | Fonticons Inc. |
| **Where Used** | Admin dashboard, creator dashboard icons |
| **URL** | `cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css` |
| **File Paths** | `public/admin/dashboard.html`, `public/creator/dashboard.html` |
| **Free/Paid** | Free (CDN via Cloudflare) |
| **Risk if Stops** | Icons disappear — buttons show text only |
| **Monthly Cost** | ₹0 |
| **Migration** | Download Font Awesome, self-host |
| **Migration Difficulty** | Low |

---

## 4. EXTERNAL IMAGE SERVICES

### Unsplash (Placeholder Images)

| Item | Detail |
|------|--------|
| **Service Name** | Unsplash |
| **Provider** | Unsplash Inc. |
| **Where Used** | Fallback images for creators without portfolio |
| **URL Pattern** | `images.unsplash.com/photo-...?w=400` |
| **File Paths** | `public/js/homepage.js`, `public/creators.html`, `public/index.html` |
| **Free/Paid** | Free (Unsplash license) |
| **Risk if Stops** | Placeholder images show broken — real creator images unaffected |
| **Monthly Cost** | ₹0 |
| **Migration** | Replace with local placeholder image in `/public/images/` |
| **Migration Difficulty** | Very Low |

---

## 5. PAYMENT GATEWAY

### Razorpay

| Item | Detail |
|------|--------|
| **Service Name** | Razorpay |
| **Provider** | Razorpay Software Pvt Ltd (India) |
| **Where Used** | Payment processing (currently MOCK MODE) |
| **File Paths** | `server/routes/payments.js` |
| **NPM Package** | `razorpay` ^2.9.6 (installed but not actively used) |
| **Current Status** | ⚠️ MOCK MODE — no real payments processed |
| **Free/Paid** | Transaction fee: 2% per transaction |
| **Pricing Model** | Pay per transaction (no monthly fee) |
| **Risk if Stops** | No payment collection possible |
| **Owner Action** | Complete Razorpay account setup, add API keys to .env |
| **Monthly Cost** | ₹0 now (2% when live) |
| **Required .env** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (not yet configured) |
| **Migration Difficulty** | Medium |
| **Alternatives** | PayU, Cashfree, Stripe (India), PhonePe Business |

**⚠️ NOTE:** Payment gateway is installed but running in mock mode. Orders and payments are simulated. Real payment integration requires Razorpay business account activation.

---

## 6. HOSTING & DOMAIN

### Current Hosting

| Item | Detail |
|------|--------|
| **Service Name** | Local Development / Not yet deployed |
| **Current URL** | `localhost:5000` |
| **Where Configured** | `.env` → PORT variable |
| **Risk** | No public access until deployed |

### Recommended Hosting Options

| Provider | Monthly Cost | Migration Difficulty |
|----------|-------------|---------------------|
| Railway | ₹0-500 (hobby) | Very Low |
| Render | ₹0-600 (free tier available) | Very Low |
| DigitalOcean Droplet | ₹500-800 | Low |
| AWS EC2 t3.micro | ₹800-1200 | Medium |
| Vercel (static) + Railway (API) | ₹0-500 | Medium |

### Domain (Not yet purchased)

| Item | Detail |
|------|--------|
| **bookmyshot.com** | Needs to be purchased |
| **Estimated Cost** | ₹800-1500/year |
| **Recommended Registrar** | Cloudflare, Namecheap, GoDaddy |
| **Renewal** | Annual |

---

## 7. AUTHENTICATION SERVICES

### JWT (Self-hosted)

| Item | Detail |
|------|--------|
| **Service Name** | JSON Web Tokens (self-implemented) |
| **Provider** | Self-hosted (no external service) |
| **File Paths** | `server/middleware/auth.js`, `server/utils/generateToken.js` |
| **Dependencies** | `jsonwebtoken` npm package |
| **Free/Paid** | Free |
| **Risk** | If JWT_SECRET is leaked, all tokens compromised |
| **Owner Action** | Keep JWT_SECRET secure, rotate periodically |
| **Monthly Cost** | ₹0 |
| **External API Calls** | None — entirely self-contained |

---

## 8. EMAIL SERVICES

### Current Status: NOT CONFIGURED

| Item | Detail |
|------|--------|
| **Service Name** | None currently |
| **Where Needed** | Password reset, booking confirmations, subscription alerts |
| **File Paths** | No email integration exists yet |
| **Owner Action** | Choose and integrate email provider |
| **Monthly Cost** | ₹0 now |

### Recommended Providers

| Provider | Free Tier | Monthly Cost | Best For |
|----------|-----------|-------------|----------|
| SendGrid | 100 emails/day | ₹0-1500 | Transactional emails |
| Mailgun | 5000/month (3 months) | ₹600+ | API-first approach |
| AWS SES | 62,000/month (from EC2) | ₹0-500 | High volume |
| Nodemailer + Gmail | 500/day | ₹0 | Development/low volume |

---

## 9. CLOUD STORAGE

### Current: Local File Storage

| Item | Detail |
|------|--------|
| **Service Name** | Local filesystem |
| **Where Used** | Creator portfolio images, videos, avatars |
| **File Path** | `public/uploads/` (avatars, portfolio, videos) |
| **Upload Handler** | `server/middleware/upload.js` (Multer) |
| **Risk** | Files lost if server disk fails |
| **Monthly Cost** | ₹0 (part of server storage) |
| **Migration Path** | Move to AWS S3 or Cloudflare R2 |

### Recommended Upgrade

| Provider | Free Tier | Monthly Cost | Migration Difficulty |
|----------|-----------|-------------|---------------------|
| AWS S3 | 5 GB | ₹100-500 | Medium |
| Cloudflare R2 | 10 GB | ₹0-200 | Medium |
| DigitalOcean Spaces | 250 GB | ₹400 | Low |

---

## 10. ANALYTICS

### Current Status: NOT CONFIGURED

| Item | Detail |
|------|--------|
| **Service Name** | None |
| **Where Needed** | Homepage traffic, user behavior, conversion tracking |
| **Owner Action** | Add Google Analytics or Plausible |

### Recommended

| Provider | Free/Paid | Privacy-Friendly |
|----------|-----------|------------------|
| Google Analytics 4 | Free | No |
| Plausible | $9/month | Yes |
| Umami (self-hosted) | Free | Yes |

---

## 11. SOCIAL MEDIA INTEGRATIONS

### WhatsApp (Click-to-Chat)

| Item | Detail |
|------|--------|
| **Type** | Simple URL link (`wa.me/91...`) |
| **Where Used** | Footer, contact page |
| **Cost** | Free |
| **Risk** | None — it's just a URL |

### Instagram / Facebook / YouTube / Twitter / LinkedIn

| Item | Detail |
|------|--------|
| **Type** | Simple profile links |
| **Where Used** | Footer (managed via Admin → Social Links) |
| **Cost** | Free |
| **Source** | Database (`sociallinks` collection) |
| **Admin Panel** | Admin → 📱 Social Links |

**No API integrations with social platforms.** All links are simple URL redirects.

---

## 12. ENVIRONMENT VARIABLES

| Variable | Purpose | Required | Sensitive |
|----------|---------|----------|-----------|
| `PORT` | Server port | Yes | No |
| `MONGODB_URI` | Database connection string | Yes | **YES** |
| `JWT_SECRET` | Token signing key | Yes | **YES** |
| `JWT_EXPIRE` | Token expiration (e.g. "7d") | No | No |
| `NODE_ENV` | development/production | No | No |
| `ADMIN_EMAIL` | Default admin account email | No | No |
| `ADMIN_PASSWORD` | Default admin account password | No | **YES** |
| `RAZORPAY_KEY_ID` | Payment gateway key (future) | No | **YES** |
| `RAZORPAY_KEY_SECRET` | Payment gateway secret (future) | No | **YES** |

### Security Notes
- **NEVER** commit `.env` to git (it's in `.gitignore`)
- Rotate `JWT_SECRET` if compromised (invalidates all active sessions)
- `MONGODB_URI` contains username:password — keep secret
- Change `ADMIN_PASSWORD` immediately in production

---

## 13. FUTURE COSTS & RENEWAL CHECKLIST

### Current Monthly Costs

| Service | Cost | Status |
|---------|------|--------|
| MongoDB Atlas (Free M0) | ₹0 | Active |
| Google Fonts CDN | ₹0 | Active |
| Font Awesome CDN | ₹0 | Active |
| NPM packages | ₹0 | Active |
| **Total Current** | **₹0/month** | |

### When Going Live (Estimated)

| Service | Monthly Cost | Annual Cost | Renewal Reminder |
|---------|-------------|-------------|------------------|
| Domain (bookmyshot.com) | ~₹100 | ₹800-1500 | Annual renewal |
| Hosting (Railway/Render) | ₹400-800 | ₹5,000-10,000 | Monthly billing |
| MongoDB Atlas (M10) | ₹4,500 | ₹54,000 | Monthly billing |
| SSL Certificate | ₹0 (Let's Encrypt) | ₹0 | Auto-renews |
| Razorpay Transaction Fees | 2% of GMV | Variable | Per transaction |
| Email Service (SendGrid) | ₹0-1500 | ₹0-18,000 | Monthly billing |
| Cloud Storage (R2/S3) | ₹0-500 | ₹0-6,000 | Monthly billing |
| **Total Estimated** | **₹5,000-7,500** | **₹60,000-90,000** | |

### Renewal Calendar

| Item | Frequency | Action Required |
|------|-----------|-----------------|
| Domain registration | Yearly | Renew before expiry (30-day warning) |
| MongoDB Atlas | Monthly (if paid) | Auto-debit from card |
| Hosting | Monthly | Auto-debit from card |
| SSL Certificate | Every 90 days | Auto-renewed by Let's Encrypt |
| Razorpay account | N/A | No renewal needed |
| NPM packages | N/A | Run `npm audit` monthly for security |

### Risk Assessment

| Service | Impact if Down | Recovery Time | Backup Strategy |
|---------|---------------|---------------|-----------------|
| MongoDB Atlas | **CRITICAL** — app unusable | 1-4 hours (restore from backup) | Enable daily backups |
| Domain | Site unreachable | 1-24 hours | Keep registrar access secure |
| Hosting | Site offline | 30 min (redeploy) | Keep deployment scripts ready |
| Google Fonts | Ugly fonts | Instant fallback | Self-host fonts |
| Razorpay | No payments | 1-2 days (switch provider) | Keep Cashfree as backup |

---

## SUMMARY

**Total External Services Currently Used: 4**
1. MongoDB Atlas (database) — FREE
2. Google Fonts (typography) — FREE
3. Font Awesome via Cloudflare CDN (icons) — FREE
4. Unsplash (placeholder images) — FREE

**Total Monthly Cost: ₹0**

**Services Ready But Not Active:**
- Razorpay (payment gateway) — installed, in mock mode
- Email service — not configured

**Services Needed Before Launch:**
- Domain name purchase
- Production hosting
- Email service
- Payment gateway activation
- Cloud storage for uploads (recommended)

---

*Audit generated for BookMyShot — June 2026*
