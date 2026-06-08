# BOOKMYSHOT — DEPLOYMENT DISCOVERY CHECKLIST

> **Purpose:** Identify everything needed before deploying to production
> **Date:** June 2026

---

## 1. REQUIRED ENVIRONMENT VARIABLES

These must be set before the application can function:

| Variable | Required | Can Be Auto-Generated | Must Be Provided By Owner |
|----------|----------|----------------------|--------------------------|
| `PORT` | Yes | ✅ Yes (defaults to 5000) | No |
| `MONGODB_URI` | **YES** | ❌ No | **YES — owner must provide** |
| `JWT_SECRET` | **YES** | ✅ Yes (generate random) | No (but should be unique) |
| `JWT_EXPIRE` | No | ✅ Yes (defaults to 7d) | No |
| `NODE_ENV` | No | ✅ Yes (set to production) | No |
| `RAZORPAY_KEY_ID` | No (future) | ❌ No | **YES — when payment goes live** |
| `RAZORPAY_KEY_SECRET` | No (future) | ❌ No | **YES — when payment goes live** |

---

## 2. REQUIRED EXTERNAL SERVICES

| Service | Required For Launch | Status | Owner Must Set Up |
|---------|-------------------|--------|-------------------|
| MongoDB Atlas | ✅ Yes — core database | Exists (free tier) | Provide URI |
| Node.js Hosting | ✅ Yes — runs the server | Not deployed yet | Choose & set up |
| Domain Name | ✅ Yes — public URL | Not purchased yet | Purchase domain |
| DNS Provider | ✅ Yes — connects domain to host | N/A | Configure |
| SSL Certificate | ✅ Yes — HTTPS | Auto (Let's Encrypt) | Nothing (automatic) |
| GitHub | Recommended — code backup | May exist | Provide repo URL |
| Payment Gateway | ❌ Optional (mock mode works) | Not configured | Provide keys when ready |
| Email Provider | ❌ Optional (no emails sent yet) | Not configured | Choose when ready |
| Cloud Storage | ❌ Optional (local uploads work) | Not configured | Choose when scaling |
| Analytics | ❌ Optional | Not configured | Choose when ready |

---

## 3. VALUES THAT CANNOT BE DISCOVERED FROM SOURCE CODE

These pieces of information **do not exist anywhere in the codebase** and must come from the owner:

| Information | Why It's Needed | Where It Goes |
|-------------|-----------------|---------------|
| MongoDB Atlas credentials | Database access | `MONGODB_URI` in .env |
| Chosen domain name | Public URL | DNS settings |
| Hosting provider account | Deployment target | Platform dashboard |
| Admin email preference | Admin login | Used during account creation |
| Admin password | Admin login | Used during account creation |
| Razorpay business account | Payments | `RAZORPAY_KEY_ID/SECRET` |
| Social media account URLs | Footer links | Admin → Social Links |
| Business phone number | WhatsApp link | Admin → Social Links |
| Support email address | Contact page | Admin → Platform Settings |

---

## 4. MANUAL INFORMATION REQUIRED FROM OWNER

**Fill in every blank below before deployment begins:**

---

### A) DOMAIN & HOSTING

```
Domain Name: ________________________________
  (e.g., bookmyshot.com)

Domain Registrar: ________________________________
  (e.g., Cloudflare, Namecheap, GoDaddy)

Domain Registrar Login Email: ________________________________

Preferred Hosting Platform: ________________________________
  [ ] Railway (recommended — simplest)
  [ ] Render
  [ ] DigitalOcean VPS
  [ ] AWS
  [ ] Other: ________________

Hosting Account Email: ________________________________
```

---

### B) MONGODB ATLAS

```
MongoDB Atlas Account Email: ________________________________

MongoDB Atlas Cluster Name: ________________________________
  (Current: ac-tk0gd4q on meoixp9.mongodb.net)

Database Name: ________________________________
  (Current: bookmyshot)

Database User: ________________________________

Database Password: ________________________________
  (KEEP SECRET — do not share)

Full Connection URI:
mongodb+srv://________:________@________.mongodb.net/bookmyshot?retryWrites=true&w=majority
```

---

### C) ADMIN ACCOUNT

```
Admin Full Name: ________________________________

Admin Email: ________________________________
  (e.g., admin@bookmyshot.com)

Admin Password: ________________________________
  (Minimum 12 characters, include numbers + symbols)

Backup Admin Email (optional): ________________________________
```

---

### D) PAYMENT GATEWAY (When Ready)

```
Payment Provider: ________________________________
  [ ] Razorpay (recommended for India)
  [ ] Cashfree
  [ ] PayU
  [ ] Stripe

Razorpay Business Account Email: ________________________________

Razorpay Key ID (Test): ________________________________

Razorpay Key Secret (Test): ________________________________

Razorpay Key ID (Live): ________________________________

Razorpay Key Secret (Live): ________________________________

Settlement Bank Account: ________________________________
```

---

### E) EMAIL PROVIDER (When Ready)

```
Email Service: ________________________________
  [ ] SendGrid
  [ ] Mailgun
  [ ] AWS SES
  [ ] Gmail SMTP (development only)

API Key: ________________________________

Sender Email: ________________________________
  (e.g., noreply@bookmyshot.com)

Support Email: ________________________________
  (e.g., support@bookmyshot.com)
```

---

### F) SOCIAL MEDIA ACCOUNTS

```
Instagram URL: ________________________________
  (e.g., https://instagram.com/bookmyshot)

Facebook URL: ________________________________
  (e.g., https://facebook.com/bookmyshot)

YouTube URL: ________________________________
  (e.g., https://youtube.com/@bookmyshot)

WhatsApp Number: ________________________________
  (e.g., +919876543210)

WhatsApp URL: ________________________________
  (e.g., https://wa.me/919876543210)

X (Twitter) URL: ________________________________

LinkedIn URL: ________________________________

Telegram URL: ________________________________
```

---

### G) ANALYTICS (Optional)

```
Analytics Provider: ________________________________
  [ ] Google Analytics (GA4)
  [ ] Plausible
  [ ] None for now

Google Analytics Measurement ID: ________________________________
  (e.g., G-XXXXXXXXXX)
```

---

### H) DNS CONFIGURATION

```
DNS Provider: ________________________________
  [ ] Cloudflare (recommended)
  [ ] Domain registrar's built-in DNS
  [ ] Route53 (AWS)

Nameservers (if using Cloudflare):
  NS1: ________________________________
  NS2: ________________________________

A Record Target (VPS IP): ________________________________
  OR
CNAME Target (Railway/Render URL): ________________________________
```

---

### I) BUSINESS INFORMATION

```
Business Name: BookMyShot

Business Type: ________________________________
  [ ] Sole Proprietorship
  [ ] Partnership
  [ ] Private Limited Company

GST Number (if registered): ________________________________

PAN: ________________________________

Business Address:
________________________________
________________________________
________________________________

Business Phone: ________________________________

Business Email: ________________________________
```

---

### J) PLATFORM SETTINGS (Configurable After Deploy)

```
Site Name: ________________________________
  (Default: BookMyShot)

Site Description: ________________________________
  (Default: Premium Creator Booking Platform)

Currency: ________________________________
  [ ] INR (₹)
  [ ] USD ($)

Monthly Subscription Price: ₹ ________
  (Default: 299)

BMS Lead Commission: ________%
  (Default: 5%)

Creator Lead Commission: ________%
  (Default: 3%)

Homepage Featured Price: ₹ ________/month
  (Default: 1499)

Rank #1 Price: ₹ ________/month
  (Default: 1999)
```

---

## 5. PRE-DEPLOYMENT VERIFICATION

After filling in all blanks above, verify:

- [ ] MongoDB Atlas cluster is accessible with provided URI
- [ ] Domain name is registered and you control DNS
- [ ] Hosting account is created
- [ ] GitHub repository contains latest code
- [ ] All environment variables are documented
- [ ] Admin credentials decided
- [ ] Social media URLs ready (at least Instagram + WhatsApp)
- [ ] This document is saved securely offline

---

## 6. DEPLOYMENT ORDER

Execute in this exact sequence:

```
Step 1: Verify MongoDB Atlas is working
Step 2: Push code to GitHub (if not already)
Step 3: Create hosting account (Railway/Render)
Step 4: Set environment variables in hosting
Step 5: Deploy application
Step 6: Verify app runs on hosting URL
Step 7: Configure custom domain DNS
Step 8: Wait for DNS propagation (1-48 hours)
Step 9: Verify HTTPS works on custom domain
Step 10: Create admin account
Step 11: Configure platform settings in admin
Step 12: Configure social links in admin
Step 13: Run full testing checklist
Step 14: Announce launch
```

---

## 7. POST-DEPLOYMENT FIRST-DAY TASKS

After successful deployment:

- [ ] Log in to admin panel
- [ ] Set platform settings (name, email, currency)
- [ ] Set subscription pricing
- [ ] Set commission rates
- [ ] Add social media links
- [ ] Approve first creators (or create test creator)
- [ ] Test full booking flow (register → book → creator accepts)
- [ ] Test creator registration → approval flow
- [ ] Verify homepage shows creators
- [ ] Test on mobile phone
- [ ] Share URL with 2-3 trusted testers
- [ ] Set up UptimeRobot monitoring (free: https://uptimerobot.com)

---

## 8. INFORMATION SECURITY NOTES

**Store this document SECURELY after filling in:**

- ❌ Do NOT email this document (contains passwords)
- ❌ Do NOT upload to Google Docs without encryption
- ❌ Do NOT share in WhatsApp/Telegram
- ✅ Print and keep in locked drawer
- ✅ Store in password manager (1Password/Bitwarden)
- ✅ Keep encrypted USB backup

**Passwords in this document should be:**
- Minimum 16 characters
- Include uppercase + lowercase + numbers + symbols
- Unique (not reused from other accounts)
- Changed every 6 months

---

*Checklist generated for BookMyShot — June 2026*
*Fill this out completely before starting deployment.*
