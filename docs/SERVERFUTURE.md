# BookMyShot — Server & Infrastructure Future Planning

## Current Stack (Free/Starter Tier)

| Service | Current Plan | Limitations | Monthly Cost |
|---------|-------------|-------------|--------------|
| **Server Hosting** | code.run (Northflank free) | Cold starts (5-10s), 503 during deploy, single instance, auto-sleep after inactivity | ₹0 |
| **Database** | MongoDB Atlas M0 (Free) | 512MB storage, shared RAM, limited connections (500), no backups, IP whitelist issues | ₹0 |
| **Cloudinary** | Free tier | 25GB storage, 25GB bandwidth/month, limited transformations | ₹0 |
| **Razorpay** | Live (standard) | 2% transaction fee per payment | Per-transaction |
| **Email** | Custom SMTP / Free tier | Rate limits, may land in spam, no dedicated IP | ₹0 |
| **Push Notifications** | Expo Push (free) | Unlimited for Expo apps | ₹0 |
| **EAS Build** | Free tier | 30 builds/month, queue wait time | ₹0 |
| **Domain** | None (using code.run URL) | Not professional, can't set Razorpay webhook properly | ₹0 |

---

## What to Upgrade (Priority Order)

### Priority 1: Database (MongoDB Atlas) — CRITICAL

**Current problem:** 512MB limit, shared cluster, slow queries, connection drops, no automated backups.

**Upgrade to:** MongoDB Atlas M10 (Dedicated)
- 10GB storage
- Dedicated RAM (2GB)
- Auto-scaling
- Automated daily backups
- No IP whitelist needed (VPC Peering)
- Better indexes & performance

**Cost:** ~$57/month (~₹4,750/month)

**When to upgrade:** When you have 50+ creators or 500+ bookings in DB.

**How to migrate:**
1. Create M10 cluster on MongoDB Atlas
2. Use `mongodump` to export current data
3. Use `mongorestore` to import into new cluster
4. Update `MONGODB_URI` in server environment
5. Zero code changes needed

---

### Priority 2: Server Hosting — HIGH

**Current problem:** Cold starts, 503 during deploy, single instance, auto-sleep.

**Options:**

| Provider | Plan | Cost/month | Benefits |
|----------|------|-----------|----------|
| **Railway.app** | Starter | ~₹500 | Always-on, auto-deploy from GitHub, no cold start |
| **Render.com** | Starter | ~₹600 | Always-on, free SSL, auto-deploy |
| **DigitalOcean App Platform** | Basic | ~₹800 | Reliable, scalable, good for India |
| **AWS EC2 t3.micro** | On-demand | ~₹1,200 | Full control, reserved instance cheaper |
| **Northflank (Paid)** | Developer | ~₹1,500 | Same platform, no cold starts |

**Recommended:** Railway.app or Render.com (easiest migration, auto-deploy from GitHub)

**How to migrate:**
1. Sign up on Railway/Render
2. Connect GitHub repo
3. Set environment variables (copy from current hosting)
4. Point your domain's DNS to new host
5. Update Razorpay webhook URL
6. Zero code changes

---

### Priority 3: Custom Domain — HIGH

**Current:** `https://site--bookmyshot--ykz2mr8mzlrv.code.run`

**Need:** `https://api.bookmyshot.app` or `https://api.bookmyshot.in`

**Cost:** ₹500-1000/year for .in domain, ₹800-1500/year for .app domain

**Why:**
- Professional appearance
- Required for Razorpay webhook configuration
- Better SEO if you add a website
- Email deliverability (custom domain emails)

**How:**
1. Buy domain from GoDaddy/Namecheap/Google Domains
2. Point A/CNAME record to your hosting
3. Update `API_BASE` in mobile app: change one line in `api.ts`
4. Update Razorpay dashboard webhook URL
5. Update email sender domain

---

### Priority 4: Cloudinary — MEDIUM

**Current problem:** 25GB bandwidth limit. With 100+ creators uploading portfolios + customers viewing, you'll hit this.

**Upgrade to:** Cloudinary Plus ($89/month)
- 225GB bandwidth
- 75GB storage
- Better transformations
- Video processing

**When:** When you have 100+ creators with portfolios

**Alternative:** Self-host images on S3 + CloudFront (cheaper at scale)
- AWS S3: ~₹2/GB storage
- CloudFront CDN: ~₹8/GB transfer
- Total for 50GB: ~₹500/month

---

### Priority 5: Email Service — MEDIUM

**Current problem:** Free SMTP has rate limits, emails may go to spam.

**Upgrade to:**

| Service | Cost | Benefit |
|---------|------|---------|
| **Resend.com** | Free up to 100/day, $20/mo for 50k | Modern API, great deliverability |
| **SendGrid** | Free 100/day, $15/mo for 40k | Industry standard |
| **AWS SES** | $0.10 per 1000 emails | Cheapest at scale |

**When:** When you send 100+ emails/day (notifications, invoices, reminders)

**How:** Change SMTP credentials in `.env` — zero code changes.

---

### Priority 6: EAS Build — LOW (for now)

**Current:** 30 free builds/month with queue delays.

**Upgrade to:** EAS Production ($99/month)
- Unlimited builds
- Priority queue (no wait)
- Faster build times

**When:** When you're releasing updates daily and need faster builds.

---

## Revenue Projections vs Costs

| Scenario | Creators | Monthly Revenue | Infrastructure Cost | Profit |
|----------|----------|----------------|--------------------:|-------:|
| **Launch** | 10 | ₹2,000 (subs) + ₹1,000 (advance) | ₹0 (free tier) | ₹3,000 |
| **Growth** | 50 | ₹10,000 (subs) + ₹15,000 (advance) | ₹5,000 | ₹20,000 |
| **Scale** | 200 | ₹40,000 (subs) + ₹60,000 (advance) | ₹12,000 | ₹88,000 |
| **Mature** | 500 | ₹100,000 (subs) + ₹200,000 (advance) | ₹25,000 | ₹275,000 |

---

## Code Changes Needed for Migration

### Database Migration (Zero downtime)
```
No code changes. Just update MONGODB_URI in environment variables.
```

### Server Migration
```
No code changes. Just deploy to new hosting and set env vars.
```

### Domain Change
```javascript
// mobile/src/services/api.ts — Line 6
const API_BASE = 'https://api.bookmyshot.app/api';  // Change this one line
```

### Email Provider Change
```
No code changes. Update SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env
```

### Cloudinary Migration
```
No code changes if staying on Cloudinary (just upgrade plan).
If moving to S3: requires code changes in cloudinaryService.js
```

---

## Security Improvements for Production

1. **Add rate limiting** — `express-rate-limit` (prevent brute force)
2. **Add helmet.js** — Security headers
3. **Enable CORS properly** — Restrict to your domain only
4. **Add request logging** — Morgan/Winston for debugging production issues
5. **Move secrets to vault** — AWS Secrets Manager or hosting platform's secret management
6. **Enable MongoDB authentication** — Already done (Atlas handles this)
7. **Add SSL certificate** — Free with Let's Encrypt (most hosting platforms do this automatically)

---

## Business Logic Improvements (Future Features)

1. **Multi-city expansion** — Add more states/districts in admin
2. **Creator verification badge** — Manual verification process with docs
3. **Customer reviews with photos** — Add photo uploads to reviews
4. **Referral system** — Creator refers creator, both get bonus
5. **Seasonal pricing** — Different rates during wedding season
6. **Bulk booking discount** — Multiple services booked together
7. **Creator analytics** — Profile views, inquiry conversion rate, heatmaps
8. **Chat between customer & creator** — Real-time messaging (Socket.IO already set up)
9. **Video calling** — For remote consultations
10. **Multi-language** — Hindi, Urdu, Kashmiri support

---

## Migration Checklist (When Ready)

- [ ] Buy domain (bookmyshot.in / bookmyshot.app)
- [ ] Upgrade MongoDB Atlas to M10
- [ ] Move hosting to Railway.app or Render.com
- [ ] Configure custom domain DNS
- [ ] Update API_BASE in mobile app
- [ ] Update Razorpay webhook URL
- [ ] Set up proper email domain (SPF/DKIM records)
- [ ] Add SSL (automatic on most platforms)
- [ ] Test all flows on new infrastructure
- [ ] Build new APK with updated API URL
- [ ] Submit to Play Store

---

## Total Monthly Cost After Upgrade

| Service | Cost |
|---------|------|
| MongoDB Atlas M10 | ₹4,750 |
| Railway.app hosting | ₹500 |
| Domain (.in) | ₹80 (yearly = ₹960) |
| Cloudinary Plus | ₹0 (stay free until needed) |
| Email (Resend free) | ₹0 |
| **Total** | **~₹5,330/month** |

This covers you until 200+ creators. After that, scale as needed.

---

## Current Temporary Items to Fix Before Production

1. **JWT_SECRET** — Change from `bms_prod_jwt_secret_8f4a2c9d7e1b5k3m` to a proper random 64-char secret
2. **Remove debug endpoints** — `/booking-fee/reconcile`, `/booking-fee/fix-cashback` (or protect them better)
3. **Rate limit login** — Prevent brute force attacks
4. **Remove test data** — Clean all test bookings/users before public launch
5. **Add terms & privacy policy** — Legal requirement for Play Store
6. **Razorpay webhook** — Configure proper webhook URL in Razorpay dashboard
7. **Data retention** — The 3AM cleanup job deletes old data. Review if this is what you want.

---

*Last updated: August 1, 2026*
*Created by: Kiro (AI Development Partner)*
