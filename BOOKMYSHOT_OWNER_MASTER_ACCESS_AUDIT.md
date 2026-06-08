# BOOKMYSHOT — OWNER MASTER ACCESS AUDIT

> **CONFIDENTIAL** | **Date:** June 2026 | **For Owner Eyes Only**
>
> ⚠️ **SECURITY NOTE:** Actual credentials are stored in your `.env` file at the project root.
> This document references them by location. Never copy credentials into shared documents.

---

## 1. ALL ENVIRONMENT VARIABLES

| Variable | Purpose | File Location | Status |
|----------|---------|---------------|--------|
| `PORT` | Server listening port | `.env` line 1 | Set to 5000 |
| `MONGODB_URI` | MongoDB Atlas connection | `.env` line 3 | **CONFIGURED** — contains username, password, cluster address |
| `JWT_SECRET` | Token signing key | `.env` line 5 | **CONFIGURED** — should be changed for production |
| `JWT_EXPIRE` | Token lifespan | `.env` line 6 | Set to 7d |
| `NODE_ENV` | Environment mode | `.env` line 7 | Set to development |
| `ADMIN_EMAIL` | Admin account reference | `.env` line 9 | admin@bookmyshot.com |
| `ADMIN_PASSWORD` | Admin account reference | `.env` line 10 | **CONFIGURED** — see .env file |

### How to View Actual Values
```bash
# On your computer, open:
C:\Users\HP\Desktop\BookMyShot\.env

# Or run in terminal:
type .env
```

### Variables NOT Yet Configured (Future)
| Variable | When Needed | Provider |
|----------|-------------|----------|
| `RAZORPAY_KEY_ID` | When enabling real payments | Razorpay dashboard |
| `RAZORPAY_KEY_SECRET` | When enabling real payments | Razorpay dashboard |
| `SENDGRID_API_KEY` | When enabling email notifications | SendGrid dashboard |
| `CLOUDINARY_URL` | When using cloud image storage | Cloudinary dashboard |

---

## 2. ALL DATABASES

### Primary Database

| Item | Value |
|------|-------|
| Provider | MongoDB Atlas |
| Cluster Host | `meoixp9.mongodb.net` |
| Cluster Name | `ac-tk0gd4q` |
| Database Name | `bookmyshot` |
| Plan | M0 Free Tier (512 MB limit) |
| Connection String Location | `.env` → `MONGODB_URI` |
| Atlas Dashboard | https://cloud.mongodb.com |
| Login Credentials | Same email/password used to create Atlas account |

### Collections (21 total)

| Collection | Documents | Critical Level |
|-----------|-----------|----------------|
| users | All registered accounts | 🔴 CRITICAL |
| creators | Creator profiles + portfolios | 🔴 CRITICAL |
| bookings | Booking records | 🔴 CRITICAL |
| commissions | Commission calculations | 🟡 HIGH |
| payments | Payment transactions | 🟡 HIGH |
| invoices | Financial invoices | 🟡 HIGH |
| paymentrecords | Detailed payment tracking | 🟡 HIGH |
| notifications | User notifications | 🟢 MEDIUM |
| messages | Chat messages | 🟢 MEDIUM |
| inquiries | Booking inquiries | 🟢 MEDIUM |
| reviews | Creator reviews | 🟢 MEDIUM |
| calendarevents | Creator calendars | 🟢 MEDIUM |
| homepages | CMS content | 🟢 LOW |
| contacts | Contact form entries | 🟢 LOW |
| platformsettings | Site configuration | 🟢 LOW (auto-seeds) |
| subscriptionsettings | Pricing configuration | 🟢 LOW (auto-seeds) |
| commissionsettings | Commission rates | 🟢 LOW (auto-seeds) |
| searchboosts | Search boost requests | 🟢 LOW |
| announcements | Sent announcements | 🟢 LOW |
| auditlogs | Admin action history | 🟢 MEDIUM |
| sociallinks | Social media URLs | 🟢 LOW (auto-seeds) |
| promotionrequests | Creator promotion applications | 🟢 LOW |

### Backup Recommendations
- **Free tier has NO automatic backups**
- Manual backup required: Run `mongodump` monthly minimum
- See `DATABASE_BACKUP_AND_RESTORE_GUIDE.md` for full instructions
- Upgrade to M10 ($57/month) for automatic daily backups

---

## 3. ALL EXTERNAL SERVICES

### Currently Active

| Service | URL | Account Required | Status | Cost |
|---------|-----|-----------------|--------|------|
| MongoDB Atlas | cloud.mongodb.com | ✅ Yes | Active (Free M0) | ₹0 |
| Google Fonts | fonts.googleapis.com | ❌ No | Active | ₹0 |
| Font Awesome CDN | cdnjs.cloudflare.com | ❌ No | Active | ₹0 |
| Unsplash Images | images.unsplash.com | ❌ No | Active (placeholders) | ₹0 |

### Installed But Not Active

| Service | NPM Package | Status | Activation Required |
|---------|-------------|--------|---------------------|
| Razorpay | `razorpay@^2.9.6` | Mock mode | Create Razorpay business account, add API keys |
| PDFKit | `pdfkit@^0.15.0` | Available | No activation needed (runs locally) |

### Not Configured (Recommended Future)

| Service | Purpose | Monthly Cost | Priority |
|---------|---------|-------------|----------|
| Hosting (Railway/Render) | Serve the app publicly | ₹0-800 | 🔴 Required for launch |
| Domain registrar | bookmyshot.com | ₹100/month (annual) | 🔴 Required for launch |
| SendGrid/Mailgun | Email notifications | ₹0-1500 | 🟡 Recommended |
| Cloudflare | DNS + CDN + protection | ₹0 | 🟡 Recommended |
| UptimeRobot | Uptime monitoring | ₹0 | 🟡 Recommended |
| Google Analytics | Traffic tracking | ₹0 | 🟢 Optional |
| AWS S3 / Cloudflare R2 | Cloud file storage | ₹0-500 | 🟢 Optional |

---

## 4. ALL CREDENTIALS LOCATION MAP

| Credential Type | Where Stored | How to Access |
|----------------|--------------|---------------|
| MongoDB username + password | `.env` file (MONGODB_URI) | Open `.env` in text editor |
| JWT signing secret | `.env` file (JWT_SECRET) | Open `.env` in text editor |
| Admin login password | `.env` file (ADMIN_PASSWORD) + MongoDB (hashed) | Open `.env` or reset via script |
| MongoDB Atlas dashboard login | Your email + password | https://cloud.mongodb.com |
| GitHub account | Your email + password | https://github.com |
| Hosting platform login | Your email + password | Depends on provider |
| Domain registrar login | Your email + password | Depends on provider |
| Razorpay keys (future) | Will go in `.env` | https://dashboard.razorpay.com |

### Risk Assessment

| Credential | If Leaked |
|-----------|-----------|
| MONGODB_URI | Attacker can read/delete ALL data |
| JWT_SECRET | Attacker can forge admin tokens (full platform control) |
| Admin password | Attacker controls admin panel |
| Razorpay secret | Attacker can create fraudulent payments |
| GitHub access | Attacker can modify code, inject malware |

---

## 5. PAYMENT SYSTEM STATUS

| System | Package | Status | Production Ready |
|--------|---------|--------|-----------------|
| Razorpay | `razorpay@^2.9.6` | ⚠️ MOCK MODE | No — needs API keys |
| Order creation | `server/routes/payments.js` | Mock (creates fake order IDs) | No |
| Payment verification | `server/routes/payments.js` | Mock (accepts any payment) | No |
| Subscription collection | `server/routes/revenue.js` | Mock (marks as paid without real charge) | No |

### To Activate Real Payments
1. Create Razorpay business account (https://razorpay.com)
2. Complete KYC verification
3. Get live API keys from dashboard
4. Add to `.env`: `RAZORPAY_KEY_ID=rzp_live_xxx` and `RAZORPAY_KEY_SECRET=xxx`
5. Update `server/routes/payments.js` to use real Razorpay SDK calls
6. Test with test keys first, then switch to live

---

## 6. WEBHOOKS

| Webhook | Status | Purpose |
|---------|--------|---------|
| Razorpay payment webhook | ❌ Not configured | Auto-confirm payments |
| Razorpay subscription webhook | ❌ Not configured | Auto-renew subscriptions |

No webhooks are currently active. When payment gateway goes live, webhooks will be needed for:
- Payment success/failure notifications
- Subscription renewal confirmations
- Refund notifications

---

## 7. EMAIL CONFIGURATION

**Status: NOT CONFIGURED**

No email sending capability exists in the current deployment. This means:
- No password reset emails
- No booking confirmation emails
- No subscription reminder emails
- No notification emails

All notifications are currently in-app only (stored in `notifications` collection, shown in dashboard).

### To Add Email
1. Choose provider (SendGrid recommended)
2. Install: `npm install @sendgrid/mail`
3. Add API key to `.env`
4. Create email templates
5. Add send calls in booking/notification routes

---

## 8. DOMAIN & DEPLOYMENT

### Current State
| Item | Status |
|------|--------|
| Domain | ❌ Not purchased |
| Hosting | ❌ Not deployed (local only) |
| SSL | N/A (auto with hosting) |
| CDN | ❌ Not configured |
| DNS | N/A |

### Current Access
- Application runs at: `http://localhost:5000`
- Accessible only on the development machine
- Not publicly available on the internet

---

## 9. ALL NPM PACKAGES

| Package | Version | Purpose | License | Security Risk |
|---------|---------|---------|---------|---------------|
| express | ^4.21.0 | Web framework | MIT | Low |
| mongoose | ^8.7.0 | MongoDB ODM | MIT | Low |
| jsonwebtoken | ^9.0.2 | Auth tokens | MIT | Low |
| bcryptjs | ^2.4.3 | Password hashing | MIT | Low |
| cors | ^2.8.5 | CORS headers | MIT | Low |
| dotenv | ^16.4.5 | Env variables | BSD-2 | Low |
| multer | ^1.4.5-lts.1 | File uploads | MIT | Low |
| mongodb | ^7.2.0 | DB driver | Apache-2.0 | Low |
| razorpay | ^2.9.6 | Payment SDK | MIT | Low |
| pdfkit | ^0.15.0 | PDF generation | MIT | Low |
| @fullcalendar/core | ^6.1.20 | Calendar UI | MIT | Low |
| @fullcalendar/daygrid | ^6.1.20 | Calendar view | MIT | Low |
| @fullcalendar/interaction | ^6.1.20 | Calendar clicks | MIT | Low |
| @fullcalendar/list | ^6.1.20 | Calendar list | MIT | Low |
| @fullcalendar/timegrid | ^6.1.20 | Calendar time | MIT | Low |

**Total packages:** 15 direct dependencies
**Security audit:** Run `npm audit` to check for vulnerabilities

---

## 10. COMPLETE OWNER CHECKLIST

### Accounts You Must Keep Safe

| Account | Purpose | If Lost |
|---------|---------|---------|
| MongoDB Atlas | Database access | ALL DATA LOST if no backup |
| GitHub | Source code | Must rebuild from local copy |
| Hosting (future) | Public access | Site goes offline |
| Domain registrar (future) | Domain ownership | Lose web address |
| Razorpay (future) | Payment collection | Can't collect money |
| Email provider (future) | Send notifications | No emails sent |

### Credentials That Must Be Backed Up

- [ ] `.env` file contents (print and store safely)
- [ ] MongoDB Atlas login (email + password)
- [ ] GitHub login (email + password + 2FA recovery codes)
- [ ] Admin panel credentials
- [ ] Domain registrar login (when purchased)
- [ ] Hosting platform login (when deployed)

### Services That May Charge Money

| Service | When | Estimated Cost |
|---------|------|---------------|
| MongoDB Atlas | When you upgrade from free tier | ₹4,500+/month |
| Hosting | When deployed publicly | ₹400-800/month |
| Domain | Annual renewal | ₹800-1500/year |
| Razorpay | Per transaction (2%) | Variable |
| Email (SendGrid) | If exceeding free tier | ₹0-1500/month |

### Annual Renewals

| Item | Frequency | Estimated Date | Action |
|------|-----------|---------------|--------|
| Domain name | Yearly | ___ / ___ / 20___ | Renew or lose domain |
| SSL certificate | Auto (90 days) | Automatic | None needed |
| Hosting | Monthly auto-bill | N/A | Keep card active |

---

## 11. COMPLETE MIGRATION GUIDE

### Moving to a New Laptop

```bash
# On NEW laptop:
1. Install Node.js 18+ (https://nodejs.org)
2. Install Git (https://git-scm.com)
3. Clone repository:
   git clone https://github.com/YOUR_USERNAME/BookMyShot.git
4. Navigate to folder:
   cd BookMyShot
5. Install packages:
   npm install
6. Create .env file:
   Copy .env from old laptop (or recreate from this document)
7. Start server:
   node server/index.js
8. Open browser: http://localhost:5000
```

### Moving Hosting Provider

```bash
1. Ensure latest code is pushed to GitHub
2. Sign up on new hosting (Railway/Render/etc.)
3. Connect GitHub repository
4. Set all environment variables (from .env)
5. Deploy
6. Update DNS to point domain to new host
7. Wait 1-48 hours for DNS propagation
8. Verify site works on new host
9. Cancel old hosting account
```

### Moving Database to New Cluster

```bash
1. Backup current database:
   mongodump --uri="CURRENT_URI" --out=./migration_backup
2. Create new MongoDB Atlas cluster
3. Restore to new cluster:
   mongorestore --uri="NEW_URI" --db=bookmyshot ./migration_backup/bookmyshot/
4. Update MONGODB_URI in .env / hosting variables
5. Restart server
6. Verify all data present
```

### Restoring Everything from Backup

```bash
1. Get project code (GitHub clone or local copy)
2. Get database backup (mongodump folder)
3. Get .env file (from secure storage)
4. Set up hosting → deploy code
5. Set environment variables
6. Restore database: mongorestore --uri="URI" backup_folder/
7. Verify admin login works
8. Verify all data present
```

---

## 12. FINAL SUMMARY TABLE

| Service | Login Required | Credential Status | Monthly Cost | Risk if Lost | Action Needed |
|---------|---------------|-------------------|-------------|--------------|---------------|
| MongoDB Atlas | ✅ | ✅ Configured | ₹0 (free tier) | 🔴 CRITICAL | Back up monthly |
| GitHub | ✅ | ⚠️ Check access | ₹0 | 🟡 HIGH | Enable 2FA |
| Node.js/Express | ❌ | N/A | ₹0 | N/A | None |
| Google Fonts | ❌ | N/A | ₹0 | 🟢 LOW | None |
| Font Awesome | ❌ | N/A | ₹0 | 🟢 LOW | None |
| Razorpay | ✅ | ❌ Not configured | ₹0 (2% per txn) | 🟡 MEDIUM | Set up when ready |
| Domain | ✅ | ❌ Not purchased | ₹100/mo | 🔴 HIGH | Purchase before launch |
| Hosting | ✅ | ❌ Not deployed | ₹400-800/mo | 🔴 HIGH | Set up before launch |
| Email Provider | ✅ | ❌ Not configured | ₹0-1500/mo | 🟡 MEDIUM | Set up when ready |
| SSL | ❌ | Auto | ₹0 | 🟢 LOW | Automatic |
| Analytics | ✅ | ❌ Not configured | ₹0 | 🟢 LOW | Optional |

---

## IMMEDIATE ACTION ITEMS

| Priority | Action | Time Required |
|----------|--------|---------------|
| 🔴 | Back up `.env` file to secure offline location | 2 minutes |
| 🔴 | Enable 2FA on MongoDB Atlas account | 5 minutes |
| 🔴 | Enable 2FA on GitHub account | 5 minutes |
| 🟡 | Run `mongodump` backup of database | 5 minutes |
| 🟡 | Purchase domain name | 15 minutes |
| 🟡 | Choose and set up hosting | 30 minutes |
| 🟢 | Create Razorpay business account | 30 minutes |
| 🟢 | Set up UptimeRobot monitoring | 5 minutes |

---

*Master Access Audit — BookMyShot — June 2026*
*Store this document SECURELY. Review every 3 months.*
