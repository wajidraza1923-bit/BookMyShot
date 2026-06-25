c# BOOKMYSHOT — BUSINESS OPERATIONS GUIDE

> **For:** Platform Owner | **Date:** June 2026 | **Language:** Simple, non-technical

---

## TABLE OF CONTENTS

1. [How You Earn Money](#1-how-you-earn-money)
2. [Revenue Stream 1: Creator Subscriptions](#2-revenue-stream-1-creator-subscriptions)
3. [Revenue Stream 2: Booking Commissions](#3-revenue-stream-2-booking-commissions)
4. [Revenue Stream 3: Promotion Placements](#4-revenue-stream-3-promotion-placements)
5. [Pricing Strategy](#5-pricing-strategy)
6. [Daily Operations](#6-daily-operations)
7. [Growth Strategy](#7-growth-strategy)
8. [Monthly Maintenance Checklist](#8-monthly-maintenance-checklist)
9. [Key Metrics to Track](#9-key-metrics-to-track)
10. [Future Roadmap](#10-future-roadmap)

---

## 1. HOW YOU EARN MONEY

BookMyShot earns revenue from **three independent streams**:

```
┌─────────────────────────────────────────────────────┐
│                  BOOKMYSHOT REVENUE                   │
├─────────────────┬──────────────────┬────────────────┤
│  SUBSCRIPTIONS  │   COMMISSIONS    │  PROMOTIONS    │
│                 │                  │                │
│  ₹299/month    │  5% BMS leads    │  ₹799-1999    │
│  per creator    │  3% Creator leads│  per placement │
│                 │                  │                │
│  RECURRING      │  PER BOOKING     │  MONTHLY       │
└─────────────────┴──────────────────┴────────────────┘
```

**Simple explanation:**
- Every creator pays you ₹299/month to be on the platform
- Every time a booking happens, you take a small percentage
- Creators can pay extra to appear first on the homepage

---

## 2. REVENUE STREAM 1: CREATOR SUBSCRIPTIONS

### What It Is
Every creator who wants to use BookMyShot pays a monthly subscription fee. This is like a membership fee — they pay to have their profile listed on the platform.

### How It Works
1. Creator registers on BookMyShot
2. They get a **free trial** (configurable — currently 30 days)
3. After trial expires, they must subscribe to continue
4. Monthly payment: **₹299/month** (you can change this anytime)

### Revenue Calculation

| Scenario | Active Creators | Monthly Revenue |
|----------|----------------|-----------------|
| Starting | 10 creators | ₹2,990/month |
| Growing | 50 creators | ₹14,950/month |
| Established | 200 creators | ₹59,800/month |
| Scaling | 500 creators | ₹1,49,500/month |

### How to Change Price
1. Login to Super Admin
2. Go to **Subscription Settings**
3. Change "Monthly Plan Price"
4. Click Save
5. New price applies to all future subscriptions (existing active subscriptions keep old price until renewal)

### What Creator Gets for ₹299/month
- Profile listed on BookMyShot
- Appears in search results
- Can receive booking requests
- Access to creator dashboard
- Portfolio page with photos/videos
- Calendar management
- Earnings tracking

---

## 3. REVENUE STREAM 2: BOOKING COMMISSIONS

### What It Is
When a client books a creator through BookMyShot, you take a percentage of the booking amount as platform commission. This is your earnings for connecting the client with the creator.

### Two Commission Rates

| Lead Source | Commission Rate | Meaning |
|-------------|----------------|---------|
| **BMS Lead** | 5% | Client found the creator through BookMyShot (platform sourced) |
| **Creator Lead** | 3% | Creator brought their own client but used BookMyShot for booking management |

### Revenue Calculation

| Booking Amount | BMS Lead (5%) | Creator Lead (3%) |
|---------------|---------------|-------------------|
| ₹10,000 | You earn ₹500 | You earn ₹300 |
| ₹25,000 | You earn ₹1,250 | You earn ₹750 |
| ₹50,000 | You earn ₹2,500 | You earn ₹1,500 |
| ₹1,00,000 | You earn ₹5,000 | You earn ₹3,000 |

### Example Month (50 bookings)
- 30 BMS leads × ₹20,000 avg = ₹6,00,000 booking volume → You earn ₹30,000
- 20 Creator leads × ₹15,000 avg = ₹3,00,000 booking volume → You earn ₹9,000
- **Total commission revenue: ₹39,000/month**

### How to Change Rates
1. Super Admin → **Commission Settings**
2. Change "BMS Lead Commission %" or "Creator Lead Commission %"
3. Save — new rate applies to all future bookings

### Important Rule
- Changing the rate does NOT affect existing bookings
- Only new bookings get the new rate
- Old bookings keep whatever rate was active when they were created

---

## 4. REVENUE STREAM 3: PROMOTION PLACEMENTS

### What It Is
Creators can pay extra to get better visibility on the platform. This is like "sponsored" or "premium" placement — they appear first or in special sections.

### Available Promotion Plans

| Plan | Price | What Creator Gets |
|------|-------|-------------------|
| Homepage Featured | ₹1,499/month | Appears in "Featured Creators" section at top of homepage |
| Rank #1 | ₹1,999/month | First position in "All Creators" section |
| Rank #2 | ₹1,499/month | Second position |
| Rank #3 | ₹999/month | Third position |
| Rank #4 | ₹799/month | Fourth position |

### How It Works
1. Creator sees promotion plans in their dashboard
2. Creator clicks "Apply Now"
3. You receive the request in Super Admin → Promotion Requests
4. You approve → Creator gets the placement for 30 days
5. After 30 days → Placement expires automatically

### Revenue Potential

| Scenario | Promotions Sold | Monthly Revenue |
|----------|----------------|-----------------|
| Minimum | 2 featured + 2 ranked | ₹6,996/month |
| Moderate | 4 featured + 4 ranked | ₹17,988/month |
| Good | 8 featured + 8 ranked | ₹35,976/month |

### How to Change Prices
1. Super Admin → **Subscription Settings**
2. Change "Homepage Featured Price", "Rank #1 Price", etc.
3. Save — new prices shown to creators immediately

---

## 5. PRICING STRATEGY

### Current Pricing (Configurable)

| Item | Current Price | Recommended Range |
|------|--------------|-------------------|
| Monthly Subscription | ₹299 | ₹199 - ₹999 |
| BMS Commission | 5% | 3% - 10% |
| Creator Commission | 3% | 2% - 5% |
| Homepage Featured | ₹1,499 | ₹499 - ₹4,999 |
| Rank #1 | ₹1,999 | ₹999 - ₹4,999 |

### Pricing Tips

**For Subscriptions:**
- Start low (₹199-299) to attract initial creators
- Increase gradually as platform grows and delivers bookings
- Offer yearly plan at discount (e.g., ₹2,999/year = 2 months free)

**For Commissions:**
- 5% BMS / 3% Creator is industry standard
- Don't go above 10% — creators will leave
- Lower commission = more creators join = more bookings = more total revenue

**For Promotions:**
- Price based on value delivered (bookings generated from featured position)
- Offer first month free to early adopters
- Increase prices as demand grows

### Revenue Projection (Year 1)

| Month | Creators | Bookings/mo | Monthly Revenue |
|-------|----------|-------------|-----------------|
| Month 1-3 | 10-20 | 5-15 | ₹5,000-15,000 |
| Month 4-6 | 30-60 | 20-50 | ₹20,000-60,000 |
| Month 7-9 | 80-120 | 50-100 | ₹60,000-1,50,000 |
| Month 10-12 | 150-250 | 100-200 | ₹1,50,000-4,00,000 |

---

## 6. DAILY OPERATIONS

### What You Should Do Every Day (10 minutes)

1. **Check new creator registrations**
   - Admin → Creators → Filter "Pending"
   - Review profile, portfolio quality
   - Approve or reject

2. **Check promotion requests**
   - Admin → Promotion Requests
   - Approve/reject as appropriate

3. **Glance at dashboard stats**
   - Total revenue, pending payments, new bookings

### What You Should Do Weekly (30 minutes)

4. **Review audit logs** — check for any suspicious activity
5. **Check subscription expiries** — remind creators to renew
6. **Review commission payments** — release pending commissions
7. **Send announcements** if needed (offers, updates)

### What Requires Your Attention

| Situation | Action |
|-----------|--------|
| New creator pending | Review and approve/reject within 24-48 hours |
| Promotion request | Approve within 24 hours (they paid for it) |
| Commission dispute | Review booking details, adjust if needed |
| Creator complaint | Handle via messaging or direct contact |
| Technical issue | Contact developer or check troubleshooting guide |

---

## 7. GROWTH STRATEGY

### Phase 1: Launch (Month 1-3)
**Goal:** Get first 20 creators on the platform

- Personally invite photographers/creators you know
- Offer free 3-month trial (no subscription fee)
- Offer free Featured placement to first 5 creators
- Focus on one city first (your city)
- Create social media pages (Instagram, YouTube)

### Phase 2: Grow (Month 4-6)
**Goal:** Reach 50-100 creators, first real bookings

- Start charging subscription (₹199-299/month)
- Run Instagram/Facebook ads targeting creators
- Ask happy clients to leave reviews
- Expand to 2-3 more cities
- Start collecting commission on bookings

### Phase 3: Scale (Month 7-12)
**Goal:** 200+ creators, consistent bookings

- Raise subscription to ₹499-999 if demand is high
- Launch promotion plans (featured/rank)
- Hire support person for creator/client queries
- Expand categories beyond wedding (YouTube, events, corporate)
- Consider mobile app development

### Phase 4: Dominate (Year 2+)
**Goal:** Market leader in creator booking

- Integrate real payment gateway (Razorpay)
- Launch mobile app
- Add new cities aggressively
- Partner with event companies
- Consider investor funding for rapid expansion

### Growth Levers (What Moves the Needle)

| Lever | Impact | Effort |
|-------|--------|--------|
| More creators on platform | High | Medium |
| Better SEO (Google ranking) | High | Low ongoing |
| Social media marketing | Medium | Medium |
| Word of mouth (quality service) | Very High | Time |
| Lower commission (attract creators) | Medium | Easy |
| Featured/promotion upselling | Medium | Easy |

---

## 8. MONTHLY MAINTENANCE CHECKLIST

### Technical (Do or Ask Developer)

- [ ] Backup database (see Database Backup Guide)
- [ ] Check server is running without errors
- [ ] Verify all pages load correctly
- [ ] Check MongoDB Atlas storage (stay under limits)
- [ ] Review and apply security updates if any
- [ ] Verify domain is not expiring soon

### Business Operations

- [ ] Review total revenue for the month
- [ ] Count new creators registered
- [ ] Count active subscriptions
- [ ] Calculate total commissions earned
- [ ] Check promotion revenue
- [ ] Identify top-performing creators
- [ ] Follow up with creators whose subscriptions expired
- [ ] Plan next month's marketing activities

### Content & Marketing

- [ ] Post on social media (minimum 4 posts/month)
- [ ] Update homepage if needed (new featured creators)
- [ ] Respond to all contact form messages
- [ ] Ask top creators for testimonials
- [ ] Monitor competitor platforms

### Financial

- [ ] Record all revenue in accounting
- [ ] Track hosting/domain costs
- [ ] Calculate net profit
- [ ] Set aside money for annual domain renewal
- [ ] Set aside money for potential server upgrade

---

## 9. KEY METRICS TO TRACK

### Revenue Metrics

| Metric | How to Check | Target Growth |
|--------|-------------|---------------|
| Monthly Recurring Revenue (MRR) | Active creators × subscription price | +10-20% monthly |
| Commission Revenue | Admin → Revenue Center | Grows with bookings |
| Promotion Revenue | Promotion Requests (approved × price) | +5% monthly |
| Total Revenue | Sum of all three | +15% monthly |

### Growth Metrics

| Metric | How to Check | Healthy Range |
|--------|-------------|---------------|
| New creators/month | Admin → Creators (sort by date) | 5-20 new/month |
| Creator approval rate | Approved ÷ Total applications | 60-80% |
| Active subscription rate | Active ÷ Total creators | 70%+ |
| Bookings/month | Admin → Bookings | Growing month over month |

### Health Metrics

| Metric | Concern If | Action |
|--------|-----------|--------|
| Creator churn rate | > 20%/month leaving | Improve value, lower price |
| Booking completion rate | < 70% | Investigate cancellations |
| Average booking value | Declining | Attract higher-end creators |
| Commission disputes | > 5%/month | Review commission policy |

---

## 10. FUTURE ROADMAP

### Short Term (Next 3 months)

| Priority | Feature | Business Impact |
|----------|---------|-----------------|
| 🔴 High | Payment gateway (Razorpay) | Automate subscription collection |
| 🔴 High | Email notifications | Better user experience, less manual work |
| 🟡 Medium | Creator analytics dashboard | Retain creators (they see value) |
| 🟡 Medium | Automated subscription expiry reminders | Reduce churn |

### Medium Term (3-6 months)

| Priority | Feature | Business Impact |
|----------|---------|-----------------|
| 🟡 Medium | Mobile app (React Native) | Reach more users |
| 🟡 Medium | Advanced search filters | Better booking conversion |
| 🟢 Low | Creator video reels (TikTok-style) | Attract younger creators |
| 🟢 Low | Client reviews system | Build trust, attract more clients |

### Long Term (6-12 months)

| Feature | Business Impact |
|---------|-----------------|
| Multi-city expansion | 10x revenue potential |
| Corporate event category | Higher-value bookings |
| Subscription tiers (Basic/Pro/Premium) | Higher ARPU |
| Affiliate/referral program | Organic growth |
| AI-powered creator recommendations | Better conversion |
| Invoice and tax automation | Professional operations |

### Revenue Milestones

| Milestone | What It Means | Estimated Timeline |
|-----------|---------------|-------------------|
| ₹10,000/month | Platform sustains itself (covers hosting) | Month 2-3 |
| ₹50,000/month | Part-time income | Month 5-7 |
| ₹1,00,000/month | Full-time viable business | Month 8-12 |
| ₹5,00,000/month | Hire team, scale aggressively | Year 2 |
| ₹10,00,000/month | Market leader position | Year 2-3 |

---

## QUICK DAILY CHECKLIST (Print This)

```
□ Check pending creator approvals
□ Check promotion requests
□ Glance at today's bookings
□ Respond to any messages/contacts
□ 1 social media post (optional but recommended)

Time required: 5-10 minutes/day
```

---

*Business Operations Guide — BookMyShot — June 2026*
*Review quarterly and update pricing/strategy as needed.*
