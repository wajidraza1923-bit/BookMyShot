# BOOKMYSHOT — RECOVERY & DISASTER GUIDE

> **Version:** 1.0 | **Date:** June 2026 | **Priority:** KEEP THIS FILE SAFE OFFLINE

---

## TABLE OF CONTENTS

1. [Domain Expires](#1-domain-expires)
2. [Hosting Account Lost (Vercel/Railway/VPS)](#2-hosting-account-lost)
3. [GitHub Account Lost](#3-github-account-lost)
4. [MongoDB Database Deleted](#4-mongodb-database-deleted)
5. [Admin Password Forgotten](#5-admin-password-forgotten)
6. [Website Hacked](#6-website-hacked)
7. [Payment Gateway Disabled](#7-payment-gateway-disabled)
8. [Server Down](#8-server-down)
9. [Prevention Checklist](#9-prevention-checklist)
10. [Emergency Contacts Template](#10-emergency-contacts-template)

---

## 1. DOMAIN EXPIRES

### Symptoms
- Website shows "This site can't be reached"
- Domain registrar shows "expired" status
- Email to domain stops working

### Severity: HIGH
**Downtime:** 1 hour to 30 days depending on grace period

### Step-by-Step Recovery

1. **Log in to domain registrar** (Cloudflare, Namecheap, GoDaddy)
2. **Check domain status:**
   - Grace period (0-30 days after expiry) → Renew normally
   - Redemption period (30-60 days) → Pay extra redemption fee (₹5,000-15,000)
   - Pending deletion (60-75 days) → Domain may be lost
3. **Renew the domain** — pay renewal fee immediately
4. **Wait for propagation** — DNS takes 1-48 hours to update globally
5. **Verify site is accessible** from multiple devices

### If Domain is Permanently Lost

1. Purchase a new domain (e.g., `bookmyshot.in`, `bookmyshotapp.com`)
2. Update DNS records to point to your server
3. Update all marketing materials, social media bios
4. Set up 301 redirect from old domain if possible
5. Notify all registered users via email/WhatsApp

### Prevention
- Enable auto-renewal on domain registrar
- Add 2 payment methods (card + UPI)
- Set calendar reminder 30 days before expiry
- Register domain for 3-5 years to reduce renewal frequency
- Keep registrar login credentials in password manager

---

## 2. HOSTING ACCOUNT LOST

### Symptoms
- Website returns 502/503 error
- Cannot access deployment dashboard
- Server not responding

### Severity: HIGH
**Downtime:** 30 minutes to 24 hours

### Step-by-Step Recovery

#### If you have the source code (GitHub/local):

1. **Choose new hosting provider:**
   - Railway: https://railway.app
   - Render: https://render.com
   - DigitalOcean: https://digitalocean.com
2. **Create account** on new provider
3. **Deploy fresh:**
   ```bash
   # Option A: Connect GitHub repo
   # Link your GitHub repository in the hosting dashboard
   
   # Option B: Manual deploy (Railway CLI)
   npm install -g @railway/cli
   railway login
   railway init
   railway up
   ```
4. **Set environment variables** in hosting dashboard:
   ```
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key
   NODE_ENV=production
   ```
5. **Update DNS** — Point your domain to new server IP/URL
6. **Verify** — Test all pages: homepage, login, admin, creator dashboard

#### If you lost Vercel account specifically:

1. Go to https://vercel.com/signup
2. Create new account (use different email if needed)
3. Connect GitHub repository
4. Import project → set root directory and build settings
5. Add environment variables
6. Deploy

### Prevention
- Keep local copy of entire project on your computer
- Push to GitHub regularly
- Store `.env` file contents in a secure note (not on the server)
- Use 2FA on hosting accounts
- Document hosting login in password manager

---

## 3. GITHUB ACCOUNT LOST

### Symptoms
- Cannot push code changes
- Cannot access repository
- Hosting platform can't pull updates

### Severity: MEDIUM
**Impact:** Cannot deploy updates (existing site stays running)

### Step-by-Step Recovery

#### If you have local copy of code:

1. **Create new GitHub account** (or recover existing)
2. **Create new repository:**
   ```bash
   cd BookMyShot
   git remote remove origin
   git remote add origin https://github.com/NEW_USERNAME/BookMyShot.git
   git push -u origin main
   ```
3. **Reconnect hosting** — Update GitHub integration in Railway/Render/Vercel
4. **Update any CI/CD** pipelines

#### If you have NO local copy:

1. **Check hosting platform** — Some hosts (Railway, Render) keep a copy of your deployed code
2. **Check other computers** — Any machine you developed on has a copy
3. **Check email** — GitHub sends download links for repos
4. **Contact GitHub support** — If account was hacked, they may restore access
5. **Last resort:** Rebuild from this documentation

### Prevention
- Keep code on at least 2 locations (local + GitHub + USB backup)
- Enable 2FA on GitHub
- Store recovery codes in safe location
- Add backup email to GitHub account
- Download repository ZIP quarterly as offline backup

---

## 4. MONGODB DATABASE DELETED

### Symptoms
- All pages show empty content
- "No creators found" everywhere
- Login fails for all users
- API returns empty arrays

### Severity: CRITICAL
**Data Loss:** Complete loss of all user accounts, bookings, creators, payments

### Step-by-Step Recovery

#### If MongoDB Atlas Backup Exists:

1. **Log in to MongoDB Atlas:** https://cloud.mongodb.com
2. **Go to** your cluster → Backup tab
3. **Find most recent backup** (Atlas takes daily snapshots on paid plans)
4. **Click "Restore"** → Choose "Restore to this cluster"
5. **Wait** for restoration (5-30 minutes depending on size)
6. **Verify** — Check admin dashboard shows data

#### If NO Backup Exists:

1. **Accept data loss** — this is unrecoverable without backups
2. **Create fresh database:**
   ```bash
   # Start server — it will create empty collections
   node server/index.js
   # ConfigService will seed default settings automatically
   ```
3. **Create admin account manually:**
   ```bash
   node -e "
   const mongoose = require('mongoose');
   require('dotenv').config();
   const User = require('./server/models/User');
   const bcrypt = require('bcryptjs');
   mongoose.connect(process.env.MONGODB_URI).then(async () => {
     const hash = await bcrypt.hash('NewAdminPassword123', 10);
     await User.create({
       name: 'Admin',
       email: 'admin@bookmyshot.com',
       password: hash,
       role: 'admin',
       emailVerified: true
     });
     console.log('Admin created');
     mongoose.disconnect();
   });
   "
   ```
4. **Notify all users** — they need to re-register
5. **Set up proper backups** (see Prevention below)

### Prevention
- **Enable MongoDB Atlas Backups:**
  - Free tier: No automatic backups (manual export only)
  - M10+: Daily automatic snapshots + point-in-time recovery
- **Manual backup script** (run weekly):
  ```bash
  mongodump --uri="YOUR_MONGODB_URI" --out=./backups/$(date +%Y%m%d)
  ```
- **Store backups** in Google Drive, AWS S3, or external hard drive
- **Test restore** quarterly to ensure backups work

---

## 5. ADMIN PASSWORD FORGOTTEN

### Symptoms
- Cannot log in to Super Admin panel
- "Invalid credentials" error
- No way to manage platform

### Severity: MEDIUM
**Downtime:** 0 (site works, just can't admin it)

### Step-by-Step Recovery

#### Method 1: Reset via MongoDB (requires database access)

```bash
node -e "
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('./server/models/User');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const newPassword = 'NewSecurePassword123!';
  const hash = await bcrypt.hash(newPassword, 10);
  await User.findOneAndUpdate(
    { role: 'admin' },
    { password: hash }
  );
  console.log('Admin password reset to:', newPassword);
  mongoose.disconnect();
});
"
```

#### Method 2: Reset via MongoDB Atlas UI

1. Go to https://cloud.mongodb.com
2. Navigate to your cluster → Collections → `users`
3. Find the document where `role: "admin"`
4. Generate new bcrypt hash online: https://bcrypt-generator.com (use 10 rounds)
5. Edit the document → replace `password` field with new hash
6. Login with new password

#### Method 3: Create new admin account

```bash
node -e "
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('./server/models/User');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const hash = await bcrypt.hash('TempAdmin2026!', 10);
  await User.create({
    name: 'Recovery Admin',
    email: 'recovery@bookmyshot.com',
    password: hash,
    role: 'admin',
    emailVerified: true
  });
  console.log('New admin created: recovery@bookmyshot.com / TempAdmin2026!');
  mongoose.disconnect();
});
"
```

### Prevention
- Store admin credentials in password manager (1Password, Bitwarden)
- Create 2 admin accounts (primary + backup)
- Document admin email/password in secure offline location
- Never rely on single admin account

---

## 6. WEBSITE HACKED

### Symptoms
- Unknown content appearing on pages
- Users reporting phishing/redirects
- Unauthorized admin activity in audit logs
- Suspicious user accounts created
- Database modifications you didn't make
- Google showing "This site may be hacked" warning

### Severity: CRITICAL
**Response Time:** IMMEDIATE

### Step-by-Step Recovery

#### Phase 1: CONTAIN (First 30 minutes)

1. **Enable maintenance mode** (if you still have admin access):
   - Admin → Platform Settings → Enable Maintenance Mode → Save
2. **Change ALL passwords immediately:**
   - MongoDB Atlas password
   - Admin account password
   - JWT_SECRET in .env (invalidates all active sessions)
   - GitHub password
   - Hosting platform password
3. **Revoke all tokens** — Changing JWT_SECRET forces all users to re-login

#### Phase 2: INVESTIGATE (1-4 hours)

4. **Check Audit Logs:**
   - Admin → Audit Logs → Look for unknown admin actions
   - Check for unauthorized creator approvals, setting changes
5. **Check database for unauthorized accounts:**
   ```bash
   # Find recently created admin accounts
   node -e "
   const mongoose = require('mongoose');
   require('dotenv').config();
   const User = require('./server/models/User');
   mongoose.connect(process.env.MONGODB_URI).then(async () => {
     const admins = await User.find({ role: 'admin' });
     admins.forEach(a => console.log(a.email, a.createdAt));
     mongoose.disconnect();
   });
   "
   ```
6. **Check for modified files:**
   ```bash
   git status
   git diff
   ```

#### Phase 3: CLEAN (2-8 hours)

7. **Remove unauthorized admin accounts** from database
8. **Restore code from clean Git commit:**
   ```bash
   git log --oneline -20  # Find last known good commit
   git reset --hard <good_commit_hash>
   ```
9. **Rotate all secrets:**
   - Generate new JWT_SECRET
   - Generate new MongoDB password (update in Atlas + .env)
   - Generate new Razorpay keys (if configured)
10. **Redeploy clean code** to hosting

#### Phase 4: SECURE (ongoing)

11. **Enable 2FA** on all accounts (GitHub, MongoDB Atlas, hosting, domain)
12. **Scan for vulnerabilities** — check npm packages: `npm audit`
13. **Notify affected users** if personal data was accessed
14. **Monitor audit logs** daily for 2 weeks

### Prevention
- Enable 2FA on EVERY external service
- Use strong unique passwords (16+ characters)
- Keep npm packages updated (`npm audit fix`)
- Don't store secrets in code (use .env only)
- Limit admin accounts to minimum necessary
- Review audit logs weekly

---

## 7. PAYMENT GATEWAY DISABLED

### Symptoms
- Users cannot make payments
- Payment page shows errors
- Razorpay dashboard shows account suspended

### Severity: HIGH (revenue loss)
**Impact:** No new subscription payments, no booking payments

### Step-by-Step Recovery

#### If Razorpay Account Suspended:

1. **Contact Razorpay support:** support@razorpay.com or dashboard chat
2. **Check email** for suspension reason (usually compliance/KYC)
3. **Submit required documents** (usually ID, business proof, bank statement)
4. **Wait for review** (1-7 business days)
5. **Meanwhile:** Offer manual payment methods (UPI direct, bank transfer)

#### If Razorpay Keys Revoked:

1. Login to https://dashboard.razorpay.com
2. Go to Settings → API Keys
3. Generate new Key ID and Secret
4. Update `.env` file:
   ```
   RAZORPAY_KEY_ID=new_key_here
   RAZORPAY_KEY_SECRET=new_secret_here
   ```
5. Restart server

#### If Need to Switch Payment Provider:

1. Choose alternative: PayU, Cashfree, Stripe
2. Install their SDK: `npm install cashfree-sdk`
3. Update `server/routes/payments.js` with new provider's API
4. Update frontend payment flow
5. Test with test mode first
6. Switch to live mode after verification

### Prevention
- Keep KYC documents updated
- Maintain minimum balance in settlement account
- Monitor Razorpay emails (don't ignore compliance requests)
- Have backup payment method documented (manual UPI)
- Keep Cashfree/PayU as registered backup

---

## 8. SERVER DOWN

### Symptoms
- Website completely inaccessible
- "502 Bad Gateway" or "Connection Refused"
- All API calls failing

### Severity: CRITICAL
**Target Recovery:** Under 30 minutes

### Step-by-Step Recovery

#### Diagnosis:

1. **Check hosting dashboard** — Is the server running?
2. **Check server logs:**
   ```bash
   # Railway
   railway logs
   
   # PM2 on VPS
   pm2 logs bookmyshot
   
   # Direct
   cat /var/log/bookmyshot.log
   ```
3. **Common causes:**
   - Out of memory → Restart or upgrade server
   - MongoDB connection failed → Check Atlas status
   - Port conflict → Kill other process on port 5000
   - Crashed due to code error → Check error logs

#### Quick Fixes:

**Restart the server:**
```bash
# PM2
pm2 restart bookmyshot

# Systemd
sudo systemctl restart bookmyshot

# Manual
kill $(lsof -t -i:5000)
node server/index.js &
```

**If server crashes on start (code error):**
```bash
# Check the error
node server/index.js
# Read the error message
# Fix the issue in code
# Restart
```

**If MongoDB is unreachable:**
1. Check https://status.mongodb.com for Atlas outage
2. Verify MONGODB_URI in .env is correct
3. Check if IP whitelist needs updating (Atlas → Network Access)
4. Add `0.0.0.0/0` to allow all IPs (less secure but works anywhere)

**If out of memory:**
```bash
# Check memory
free -h

# Restart with more memory (PM2)
pm2 restart bookmyshot --max-memory-restart 512M

# Or upgrade server plan
```

#### Full Redeploy (if nothing else works):

```bash
git pull origin main
npm install
# Set environment variables
export MONGODB_URI=...
export JWT_SECRET=...
export PORT=5000
pm2 start server/index.js --name bookmyshot
```

### Prevention
- Use PM2 or systemd for auto-restart on crash
- Set up uptime monitoring (UptimeRobot — free)
- Configure PM2 auto-restart on memory limit
- Keep server logs for debugging
- Have deployment script ready for quick redeploy

---

## 9. PREVENTION CHECKLIST

### Weekly Tasks
- [ ] Check site is accessible
- [ ] Review audit logs for suspicious activity
- [ ] Check MongoDB storage usage

### Monthly Tasks
- [ ] Run `npm audit` for security vulnerabilities
- [ ] Backup database manually (if on free tier)
- [ ] Review server logs for errors
- [ ] Check domain expiry date
- [ ] Verify all admin credentials work

### Quarterly Tasks
- [ ] Test database restore from backup
- [ ] Update npm packages (`npm update`)
- [ ] Rotate JWT_SECRET (forces re-login)
- [ ] Review and remove unused admin accounts
- [ ] Download full project backup to offline storage

### Annual Tasks
- [ ] Renew domain name
- [ ] Review hosting plan (upgrade if needed)
- [ ] Update all external service passwords
- [ ] Review and update this disaster guide
- [ ] Check MongoDB Atlas plan adequacy

---

## 10. EMERGENCY CONTACTS TEMPLATE

Fill in and keep this information in a SECURE offline location:

```
=== BOOKMYSHOT EMERGENCY CONTACTS ===

Domain Registrar: _______________
  Login URL: _______________
  Email: _______________
  Password: _______________
  Support: _______________

Hosting Provider: _______________
  Login URL: _______________
  Email: _______________
  Password: _______________
  Support: _______________

MongoDB Atlas: https://cloud.mongodb.com
  Email: _______________
  Password: _______________
  Cluster: ac-tk0gd4q (meoixp9.mongodb.net)

GitHub: https://github.com
  Username: _______________
  Password: _______________
  2FA Recovery Codes: _______________

Razorpay: https://dashboard.razorpay.com
  Email: _______________
  Password: _______________
  Key ID: _______________
  Key Secret: _______________

Admin Account:
  Email: admin@bookmyshot.com
  Password: _______________

JWT Secret: _______________

Developer Contact: _______________
  Phone: _______________
  Email: _______________
```

**⚠️ STORE THIS OFFLINE — Not in email, not in cloud, not in code.**
Print a physical copy and keep in a safe location.

---

*Recovery Guide generated for BookMyShot — June 2026*
*Review and update this guide every 6 months.*
