# BOOKMYSHOT — API DEBUG REPORT

> **Issue:** Registration returns 404 on production (Vercel frontend + Northflank backend)
> **Date:** June 2026

---

## ROOT CAUSE (TLDR)

**The Vercel frontend (Next.js) is calling the backend using `NEXT_PUBLIC_API_URL` environment variable. If this variable is NOT set in Vercel's dashboard, the frontend defaults to `http://localhost:5000` — which doesn't exist in production, causing a 404.**

---

## 1. FRONTEND API ARCHITECTURE

This project has **TWO separate frontends**:

| Frontend | Location | Technology | Deployed On |
|----------|----------|-----------|-------------|
| Public Dashboard | `/public/` | Vanilla HTML/JS | Served by Express (same server) |
| Next.js App | `/frontend/` | Next.js + TypeScript | Vercel |

### Public Frontend API Client (`public/js/api.js`)

```javascript
// Line 5:
base: "",    // <-- EMPTY STRING = same-origin = works when served by Express

// Line 36:
const res = await fetch(`${this.base}/api${url}`, { ...options, headers });
// Results in: /api/auth/register (relative URL = same server)
```

**This works perfectly** when both frontend and backend are on the same server.

### Next.js Frontend API Client (`frontend/lib/api.ts`)

```typescript
// Line 3:
const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Creates axios instance with this base
export const apiClient = axios.create({ baseURL, ... });
```

### Next.js Register Page (`frontend/app/register/page.tsx`)

```typescript
// Line 23:
const response = await axios.post(
  `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/register`,
  { name, email, phone, password, role }
);
```

### Next.js Login Page (`frontend/app/login/page.tsx`)

```typescript
// Line 21:
const response = await axios.post(
  `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/login`,
  { email, password }
);
```

---

## 2. THE PROBLEM

| Environment | NEXT_PUBLIC_API_URL | What Happens |
|-------------|-------------------|-------------|
| Local development | Not set → defaults to `http://localhost:5000` | ✅ Works (Express runs on localhost:5000) |
| **Vercel production** | **NOT SET** | ❌ Calls `http://localhost:5000/api/auth/register` → 404 (no server at localhost on Vercel) |
| Vercel production | Set to Northflank URL | ✅ Works |

**The fix:** Set `NEXT_PUBLIC_API_URL` in Vercel's environment variables to your Northflank backend URL.

---

## 3. ALL FRONTEND → BACKEND API CALLS

### Next.js Frontend (deployed on Vercel)

| File | Line | Method | URL Called | Backend Route |
|------|------|--------|-----------|---------------|
| `frontend/app/register/page.tsx` | 23 | POST | `{API_URL}/api/auth/register` | `/api/auth` → `router.post("/register")` |
| `frontend/app/login/page.tsx` | 21 | POST | `{API_URL}/api/auth/login` | `/api/auth` → `router.post("/login")` |
| `frontend/app/admin/page.tsx` | 40 | GET | `{API_URL}/api/admin/dashboard-overview` | `/api/admin/dashboard-overview` |
| `frontend/app/creator/page.tsx` | 17 | GET | `{API_URL}/api/creator/analytics` | `/api/creator` routes |
| `frontend/app/user/page.tsx` | 23 | GET | `{API_URL}/api/creators?featured=true` | `/api/creators` |

### Public Frontend (served by Express — same origin)

| File | Method | URL Called | Backend Route | Status |
|------|--------|-----------|---------------|--------|
| `public/register.html` | POST | `/api/auth/register` | `server/routes/auth.js:12` | ✅ Match |
| `public/login.html` | POST | `/api/auth/login` | `server/routes/auth.js:89` | ✅ Match |
| `public/creator-auth.html` | POST | `/api/auth/register` | `server/routes/auth.js:12` | ✅ Match |
| `public/creator-auth.html` | POST | `/api/auth/login` | `server/routes/auth.js:89` | ✅ Match |
| `public/user-auth.html` | POST | `/api/auth/register` | `server/routes/auth.js:12` | ✅ Match |
| `public/user-auth.html` | POST | `/api/auth/login` | `server/routes/auth.js:89` | ✅ Match |
| `public/admin-login.html` | POST | `/api/auth/login` | `server/routes/auth.js:89` | ✅ Match |

---

## 4. BACKEND ROUTE REGISTRATION

**File:** `server/index.js`

| Mount Path | Route File | Key Endpoints |
|-----------|-----------|---------------|
| `/api/auth` | `server/routes/auth.js` | POST /register, POST /login, GET /me |
| `/api/admin` | `server/routes/admin.js` | Analytics, creators, users, bookings |
| `/api/admin/creator-accounts` | `server/routes/admin/creatorAccounts.js` | GET /, PATCH /:id/* |
| `/api/admin/platform-settings` | `server/routes/admin/platformSettings.js` | GET, PUT |
| `/api/admin/subscription-settings` | `server/routes/admin/subscriptionSettings.js` | GET, PUT |
| `/api/admin/commission-settings` | `server/routes/admin/commissionSettings.js` | GET, PUT |
| `/api/admin/social-links` | `server/routes/admin/socialLinks.js` | GET, PUT |
| `/api/creators` | `server/routes/creators.js` | GET / (public list) |
| `/api/creator` | `server/routes/creator.js` | Protected creator routes |
| `/api/bookings` | `server/routes/bookings.js` | CRUD |
| `/api/revenue` | `server/routes/revenue.js` | Creator subscription, dashboard |
| `/api/promotions` | `server/routes/promotionRequests.js` | Plans, apply, admin approve |
| `/api/payments` | `server/routes/payments.js` | Mock order/verify |

---

## 5. ENVIRONMENT VARIABLES

| Variable | File | Required For | Production Value Needed |
|----------|------|-------------|------------------------|
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | Next.js → backend connection | **YOUR NORTHFLANK URL** |
| `PORT` | `server/.env` | Express port | 5000 (or Northflank assigns) |
| `MONGODB_URI` | `server/.env` | Database | Atlas connection string |
| `JWT_SECRET` | `server/.env` | Auth tokens | Random 64-char string |

---

## 6. ROUTE MATCH TABLE

| Frontend Request | Backend Route | Match Status |
|-----------------|---------------|-------------|
| `POST {API_URL}/api/auth/register` | `app.use("/api/auth", authRoutes)` → `router.post("/register")` | ✅ **MATCH** |
| `POST {API_URL}/api/auth/login` | `app.use("/api/auth", authRoutes)` → `router.post("/login")` | ✅ **MATCH** |
| `GET {API_URL}/api/auth/me` | `app.use("/api/auth", authRoutes)` → `router.get("/me")` | ✅ **MATCH** |
| `GET {API_URL}/api/creators` | `app.use("/api/creators", creatorsRoutes)` → `router.get("/")` | ✅ **MATCH** |
| `GET {API_URL}/api/admin/dashboard-overview` | `app.use("/api/admin/dashboard-overview", ...)` | ✅ **MATCH** |

**All routes match correctly.** The 404 is NOT a route mismatch — it's a connection failure.

---

## 7. WHY 404 HAPPENS ON PRODUCTION

```
Vercel (frontend)                    Northflank (backend)
┌──────────────────┐                ┌──────────────────┐
│  Next.js App     │                │  Express Server  │
│                  │   HTTP POST    │                  │
│  Register form   │ ─────────────→ │  /api/auth/register │
│                  │                │                  │
│  NEXT_PUBLIC_    │                │  Listening on    │
│  API_URL = ???   │                │  port 5000       │
└──────────────────┘                └──────────────────┘
```

**If `NEXT_PUBLIC_API_URL` is not set on Vercel:**
- Frontend calls `http://localhost:5000/api/auth/register`
- But `localhost` on Vercel's servers doesn't have your Express app
- Result: 404 or network error

**If `NEXT_PUBLIC_API_URL` is set but wrong:**
- Frontend calls wrong URL → 404

**If CORS is not allowing the Vercel origin:**
- Frontend gets CORS error (not 404, but could appear as failed request)

---

## 8. EXACT FIXES REQUIRED

### Fix 1: Set Environment Variable on Vercel

1. Go to https://vercel.com → Your BookMyShot project
2. Settings → Environment Variables
3. Add:
   ```
   Name: NEXT_PUBLIC_API_URL
   Value: https://your-northflank-backend-url.northflank.app
   ```
   (Replace with your actual Northflank URL)
4. **IMPORTANT:** Redeploy after adding the variable (Vercel needs rebuild for `NEXT_PUBLIC_*` vars)

### Fix 2: Verify CORS on Backend

**File:** `server/index.js` line 44

Current:
```javascript
app.use(cors());
```

This allows ALL origins — should work. But if Northflank adds restrictions, explicitly allow your Vercel domain:

```javascript
app.use(cors({
  origin: ['https://your-vercel-app.vercel.app', 'http://localhost:3000'],
  credentials: true
}));
```

### Fix 3: Verify Northflank is Serving API

Test directly:
```bash
curl https://your-northflank-url.northflank.app/api/auth/me
```

Expected response:
```json
{"success":false,"message":"Not authorized, no token"}
```

If this returns 404 or connection refused → Northflank deployment is broken.

---

## 9. DIAGNOSTIC STEPS

Run these in order:

### Step 1: Check Northflank is running
```bash
curl https://YOUR_NORTHFLANK_URL/api/creators
# Should return JSON with creators array
```

### Step 2: Check Vercel env var
- Vercel Dashboard → Project → Settings → Environment Variables
- Confirm `NEXT_PUBLIC_API_URL` = `https://YOUR_NORTHFLANK_URL`

### Step 3: Check browser console
- Open Vercel deployed site → Register page
- Open DevTools → Network tab
- Submit registration form
- Check the failing request:
  - What URL is it calling?
  - What's the response status?
  - Is it CORS error or 404?

### Step 4: Check Northflank logs
- Northflank Dashboard → Service → Logs
- See if the request reaches the server at all
- If no log entry → request never arrived (URL wrong or CORS blocked)

---

## 10. SUMMARY

| Question | Answer |
|----------|--------|
| Are routes correct? | ✅ Yes — all match perfectly |
| Is code broken? | ❌ No — works locally |
| Is it a deployment config issue? | ✅ **YES** |
| Root cause | `NEXT_PUBLIC_API_URL` not set on Vercel OR set to wrong value |
| Fix complexity | **EASY** — 1 environment variable change + redeploy |

---

*Report generated for BookMyShot — June 2026*
