bhg# BOOKMYSHOT — DEPLOYMENT PLAYBOOK

> **Version:** 1.0 | **Date:** June 2026 | **From Zero to Live in 1 Hour**

---

## TABLE OF CONTENTS

1. [Prerequisites](#1-prerequisites)
2. [Step 1: GitHub Setup](#2-step-1-github-setup)
3. [Step 2: MongoDB Atlas Setup](#3-step-2-mongodb-atlas-setup)
4. [Step 3: Deploy to Railway (Recommended)](#4-step-3-deploy-to-railway)
5. [Step 3B: Deploy to Render (Alternative)](#5-step-3b-deploy-to-render)
6. [Step 3C: Deploy to VPS (Advanced)](#6-step-3c-deploy-to-vps)
7. [Step 4: Domain & DNS Setup](#7-step-4-domain--dns-setup)
8. [Step 5: SSL Certificate](#8-step-5-ssl-certificate)
9. [Step 6: Environment Variables (Production)](#9-step-6-environment-variables)
10. [Step 7: Create Admin Account](#10-step-7-create-admin-account)
11. [Step 8: Verify Deployment](#11-step-8-verify-deployment)
12. [Production Checklist](#12-production-checklist)
13. [Post-Deployment Monitoring](#13-post-deployment-monitoring)
14. [Updating the Live Site](#14-updating-the-live-site)

---

## 1. PREREQUISITES

Before starting, ensure you have:

- [ ] BookMyShot project code on your computer
- [ ] A GitHub account (free: https://github.com)
- [ ] A MongoDB Atlas account (free: https://cloud.mongodb.com)
- [ ] A domain name (purchase from Cloudflare/Namecheap: ~₹800-1500/year)
- [ ] A hosting account (Railway, Render, or VPS)
- [ ] Node.js 18+ installed locally for testing

**Estimated time:** 45-60 minutes for complete deployment

---

## 2. STEP 1: GITHUB SETUP

### 2.1 Create Repository

1. Go to https://github.com/new
2. Repository name: `BookMyShot`
3. Visibility: **Private** (your code is proprietary)
4. Do NOT initialize with README (you already have code)
5. Click "Create repository"

### 2.2 Push Code to GitHub

Open terminal in your BookMyShot project folder:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial deployment"

# Connect to GitHub
git remote add origin https://github.com/YOUR_USERNAME/BookMyShot.git

# Push code
git branch -M main
git push -u origin main
```

### 2.3 Verify .gitignore

Ensure these are in your `.gitignore` (should already be):

```
node_modules/
.env
public/uploads/avatars/*
public/uploads/portfolio/*
public/uploads/videos/*
!public/uploads/.gitkeep
```

**⚠️ CRITICAL:** The `.env` file must NEVER be pushed to GitHub. It contains passwords.

---

## 3. STEP 2: MONGODB ATLAS SETUP

### 3.1 Create Cluster

1. Go to https://cloud.mongodb.com
2. Sign up / Sign in
3. Click "Build a Database"
4. Choose **M0 Free** tier (sufficient for launch)
5. Provider: AWS
6. Region: Mumbai (ap-south-1) for India
7. Cluster Name: `BookMyShotDB`
8. Click "Create Cluster"

### 3.2 Create Database User

1. Go to Security → Database Access
2. Click "Add New Database User"
3. Authentication: Password
4. Username: `bookmyshot_admin`
5. Password: Generate a strong password → **SAVE THIS**
6. Database User Privileges: "Read and write to any database"
7. Click "Add User"

### 3.3 Configure Network Access

1. Go to Security → Network Access
2. Click "Add IP Address"
3. For development: "Add Current IP Address"
4. **For production: Click "Allow Access from Anywhere" (0.0.0.0/0)**
   - This is needed because hosting platforms use dynamic IPs
5. Click "Confirm"

### 3.4 Get Connection String

1. Go to Deployment → Database
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Driver: Node.js, Version: 5.5 or later
5. Copy the connection string
6. Replace `<password>` with your database user's password
7. Add `/bookmyshot` before the `?` to specify database name

**Final format:**
```
mongodb+srv://bookmyshot_admin:YOUR_PASSWORD@bookmyshotdb.xxxxx.mongodb.net/bookmyshot?retryWrites=true&w=majority
```

---

## 4. STEP 3: DEPLOY TO RAILWAY (Recommended)

Railway is the simplest option for Node.js apps. Free tier available.

### 4.1 Create Account

1. Go to https://railway.app
2. Sign up with GitHub (recommended — links your repo automatically)

### 4.2 Create Project

1. Click "New Project"
2. Choose "Deploy from GitHub repo"
3. Select your `BookMyShot` repository
4. Railway auto-detects Node.js

### 4.3 Add Environment Variables

1. Click on your service → "Variables" tab
2. Add each variable:

```
PORT=5000
MONGODB_URI=mongodb+srv://bookmyshot_admin:PASSWORD@cluster.mongodb.net/bookmyshot?retryWrites=true&w=majority
JWT_SECRET=generate_a_64_character_random_string_here
JWT_EXPIRE=7d
NODE_ENV=production
```

### 4.4 Configure Start Command

1. Go to service → Settings
2. Start Command: `node server/index.js`
3. Railway will build and deploy automatically

### 4.5 Get Public URL

1. Go to service → Settings → Networking
2. Click "Generate Domain"
3. You'll get a URL like: `bookmyshot-production.up.railway.app`
4. Test it in your browser

**Cost:** Free tier = 500 hours/month. Hobby plan = $5/month (unlimited).

---

## 5. STEP 3B: DEPLOY TO RENDER (Alternative)

### 5.1 Setup

1. Go to https://render.com
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect your BookMyShot repository

### 5.2 Configure

| Setting | Value |
|---------|-------|
| Name | bookmyshot |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `node server/index.js` |
| Plan | Free (spins down after 15 min inactivity) or Starter ($7/month) |

### 5.3 Environment Variables

Add all variables in the "Environment" tab (same as Railway above).

### 5.4 Deploy

Click "Create Web Service" — Render builds and deploys automatically.

**Note:** Free tier "sleeps" after 15 minutes of inactivity. First request takes 30-60 seconds to wake up. Starter plan ($7/month) stays always-on.

---

## 6. STEP 3C: DEPLOY TO VPS (Advanced)

For full control. Requires Linux knowledge.

### 6.1 Get a VPS

- DigitalOcean Droplet: $6/month (1GB RAM)
- AWS EC2 t3.micro: ~$8/month
- Hostinger VPS: ₹399/month

### 6.2 Server Setup

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Clone your repository
git clone https://github.com/YOUR_USERNAME/BookMyShot.git
cd BookMyShot

# Install dependencies
npm install --production

# Create .env file
nano .env
# Paste all environment variables, save with Ctrl+X → Y → Enter

# Start with PM2
pm2 start server/index.js --name bookmyshot
pm2 save
pm2 startup  # Auto-start on server reboot
```

### 6.3 Nginx Reverse Proxy (optional but recommended)

```bash
sudo apt install nginx

# Create config
sudo nano /etc/nginx/sites-available/bookmyshot
```

Paste:
```nginx
server {
    listen 80;
    server_name bookmyshot.com www.bookmyshot.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/bookmyshot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 7. STEP 4: DOMAIN & DNS SETUP

### 7.1 Purchase Domain

Recommended registrars:
- **Cloudflare Registrar** — cheapest (at-cost pricing)
- **Namecheap** — good interface
- **GoDaddy** — popular but expensive renewals

### 7.2 Configure DNS

#### For Railway/Render:

1. In your hosting dashboard, find the "Custom Domain" section
2. Add your domain: `bookmyshot.com`
3. The host gives you a CNAME target (e.g., `cname.railway.app`)
4. In your domain registrar's DNS settings, add:

```
Type: CNAME
Name: @  (or www)
Target: your-app.up.railway.app (or cname.railway.app)
```

#### For VPS:

1. In your domain registrar's DNS, add:

```
Type: A
Name: @
Value: YOUR_SERVER_IP

Type: A
Name: www
Value: YOUR_SERVER_IP
```

### 7.3 Wait for Propagation

DNS changes take 1-48 hours to propagate globally. Use https://dnschecker.org to monitor.

---

## 8. STEP 5: SSL CERTIFICATE

### Railway/Render:
**Automatic.** SSL is provisioned automatically when you add a custom domain. No action needed.

### VPS with Nginx:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate (replace with your domain)
sudo certbot --nginx -d bookmyshot.com -d www.bookmyshot.com

# Auto-renewal is configured automatically
# Test it:
sudo certbot renew --dry-run
```

SSL certificates from Let's Encrypt are **free** and auto-renew every 90 days.

---

## 9. STEP 6: ENVIRONMENT VARIABLES

### Production .env Values

```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://bookmyshot_admin:STRONG_PASSWORD@cluster.mongodb.net/bookmyshot?retryWrites=true&w=majority
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0
JWT_EXPIRE=7d
```

### Generate JWT_SECRET:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Where to Set Variables:

| Platform | How to Set |
|----------|-----------|
| Railway | Dashboard → Service → Variables tab |
| Render | Dashboard → Service → Environment tab |
| VPS | `.env` file in project root |
| Vercel | Dashboard → Project → Settings → Environment Variables |

---

## 10. STEP 7: CREATE ADMIN ACCOUNT

After deployment, create the admin account:

### Option A: Register via Website

1. Go to `https://yourdomain.com/register.html`
2. Register with email: `admin@bookmyshot.com`
3. Then manually change role in MongoDB:
   - Go to MongoDB Atlas → Browse Collections → `users`
   - Find your user document
   - Change `role` from `"user"` to `"admin"`

### Option B: Run Script (if you have server SSH access)

```bash
cd BookMyShot
node -e "
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('./server/models/User');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const hash = await bcrypt.hash('YourSecurePassword123!', 10);
  await User.create({
    name: 'Admin',
    email: 'admin@bookmyshot.com',
    password: hash,
    role: 'admin',
    emailVerified: true
  });
  console.log('Admin account created successfully');
  mongoose.disconnect();
}).catch(e => console.error(e));
"
```

### Option C: Via Railway/Render Console

Most platforms have a "Shell" or "Console" feature in the dashboard where you can run the script above.

---

## 11. STEP 8: VERIFY DEPLOYMENT

Test every critical function:

| Test | URL | Expected Result |
|------|-----|----------------|
| Homepage loads | `https://yourdomain.com` | Page with hero section visible |
| Admin login | `https://yourdomain.com/admin/dashboard.html` | Login form, then dashboard |
| Creator registration | `https://yourdomain.com/register.html` | Registration works |
| API responds | `https://yourdomain.com/api/creators` | JSON response with creators |
| Static files | `https://yourdomain.com/css/premium-homepage.css` | CSS file loads |
| HTTPS works | Check for padlock icon in browser | Green padlock present |
| Mobile works | Open on phone | Responsive layout |

---

## 12. PRODUCTION CHECKLIST

### Before Going Live

- [ ] Domain purchased and DNS configured
- [ ] SSL certificate active (HTTPS working)
- [ ] MongoDB Atlas password is strong and unique
- [ ] JWT_SECRET is random 64-character string
- [ ] NODE_ENV set to `production`
- [ ] Admin account created with strong password
- [ ] `.env` file NOT in GitHub
- [ ] All pages load without errors
- [ ] Creator registration → approval flow works
- [ ] Booking creation works
- [ ] Admin panel fully functional
- [ ] Mobile responsive on all pages
- [ ] Social links configured in admin
- [ ] Platform settings configured (site name, email)
- [ ] Subscription pricing set correctly
- [ ] Commission rates set correctly

### Security Hardening

- [ ] 2FA enabled on GitHub
- [ ] 2FA enabled on MongoDB Atlas
- [ ] 2FA enabled on hosting platform
- [ ] 2FA enabled on domain registrar
- [ ] MongoDB Atlas IP whitelist configured
- [ ] Admin password is 16+ characters
- [ ] `npm audit` shows no critical vulnerabilities

### Monitoring Setup

- [ ] Uptime monitoring (UptimeRobot — free) configured
- [ ] MongoDB Atlas alerts enabled (storage, connections)
- [ ] Error logs accessible via hosting dashboard

---

## 13. POST-DEPLOYMENT MONITORING

### Daily (Automated)
- UptimeRobot pings your site every 5 minutes
- Alerts you via email/SMS if site goes down

### Weekly (Manual — 5 minutes)
- Check admin dashboard loads
- Check MongoDB Atlas storage usage
- Glance at audit logs for anomalies

### Monthly (Manual — 15 minutes)
- Run `npm audit` locally for security patches
- Check domain renewal date
- Verify backups are working
- Review hosting costs

---

## 14. UPDATING THE LIVE SITE

### Push Update via GitHub

```bash
# On your local machine:
# Make changes to code
git add .
git commit -m "Description of changes"
git push origin main
```

**Railway/Render:** Auto-deploys from GitHub push. Wait 1-2 minutes.

**VPS:**
```bash
# SSH into server
ssh root@YOUR_IP
cd BookMyShot
git pull origin main
npm install  # if new packages added
pm2 restart bookmyshot
```

### Rolling Back a Bad Deploy

```bash
# Find previous good commit
git log --oneline -10

# Revert to that commit
git revert HEAD  # undo last commit
git push origin main

# Or hard reset (destructive)
git reset --hard COMMIT_HASH
git push -f origin main
```

---

## QUICK REFERENCE CARD

Print this and keep near your workstation:

```
╔══════════════════════════════════════════╗
║  BOOKMYSHOT DEPLOYMENT QUICK REFERENCE  ║
╠══════════════════════════════════════════╣
║                                          ║
║  Deploy: git push origin main            ║
║  Restart: pm2 restart bookmyshot         ║
║  Logs: pm2 logs bookmyshot               ║
║  Stop: pm2 stop bookmyshot               ║
║                                          ║
║  MongoDB: cloud.mongodb.com              ║
║  Hosting: railway.app (or render.com)    ║
║  Domain: cloudflare.com                  ║
║  Monitor: uptimerobot.com                ║
║                                          ║
║  Admin URL: /admin/dashboard.html        ║
║  Admin Email: admin@bookmyshot.com       ║
║                                          ║
║  Emergency: See RECOVERY_GUIDE.md        ║
╚══════════════════════════════════════════╝
```

---

*Playbook generated for BookMyShot — June 2026*
