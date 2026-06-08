# BOOKMYSHOT — ENVIRONMENT VARIABLES GUIDE

> **Version:** 1.0 | **Date:** June 2026

---

## Overview

All environment variables are stored in the `.env` file at the project root. This file is loaded by the `dotenv` package at server startup (`require('dotenv').config()` in `server/index.js`).

**IMPORTANT:** The `.env` file is excluded from Git via `.gitignore`. Never commit it to version control.

---

## Complete Variable Reference

### PORT

| Item | Detail |
|------|--------|
| **Purpose** | TCP port the Express server listens on |
| **Required** | No (defaults to 5000) |
| **Where Used** | `server/index.js` line: `const PORT = process.env.PORT \|\| 5000` |
| **Development Value** | `5000` |
| **Production Value** | `5000` (or whatever the host assigns — Railway/Render set this automatically) |
| **What Breaks if Missing** | Nothing — server falls back to port 5000 |
| **Sensitive** | No |

```env
PORT=5000
```

---

### MONGODB_URI

| Item | Detail |
|------|--------|
| **Purpose** | MongoDB Atlas connection string — connects to the database |
| **Required** | **YES — CRITICAL** |
| **Where Used** | `server/config/db.js` → `mongoose.connect(process.env.MONGODB_URI)` |
| **Development Value** | MongoDB Atlas free tier connection string |
| **Production Value** | MongoDB Atlas M10+ connection string (same or different cluster) |
| **What Breaks if Missing** | **ENTIRE APP FAILS** — no database, no data, no login, nothing works |
| **Sensitive** | **YES** — contains username and password |

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/bookmyshot?retryWrites=true&w=majority
```

**Format breakdown:**
```
mongodb+srv://
  USERNAME        → MongoDB Atlas database user
  :PASSWORD       → That user's password
  @cluster.mongodb.net  → Atlas cluster hostname
  /bookmyshot     → Database name
  ?retryWrites=true&w=majority  → Connection options
```

**How to get this value:**
1. Go to https://cloud.mongodb.com
2. Click your cluster → "Connect"
3. Choose "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your actual password

---

### JWT_SECRET

| Item | Detail |
|------|--------|
| **Purpose** | Secret key used to sign and verify JWT authentication tokens |
| **Required** | **YES — CRITICAL** |
| **Where Used** | `server/utils/generateToken.js`, `server/middleware/auth.js` |
| **Development Value** | Any string (e.g., `dev_secret_123`) |
| **Production Value** | Long random string (32+ characters) |
| **What Breaks if Missing** | Falls back to hardcoded default (`'bookmyshot_secret_2024'`) — **INSECURE** |
| **Sensitive** | **YES** — if leaked, anyone can forge admin tokens |

```env
JWT_SECRET=your_super_secret_jwt_key_change_in_production
```

**Generating a secure value:**
```bash
# Linux/Mac
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**What happens if you change it:**
- ALL existing user sessions become invalid instantly
- Every user must log in again
- No data is lost — only tokens are invalidated

---

### JWT_EXPIRE

| Item | Detail |
|------|--------|
| **Purpose** | How long JWT tokens remain valid |
| **Required** | No (defaults to `'7d'`) |
| **Where Used** | `server/utils/generateToken.js` → `jwt.sign(payload, secret, { expiresIn })` |
| **Development Value** | `7d` (7 days) |
| **Production Value** | `7d` or `24h` for stricter security |
| **What Breaks if Missing** | Tokens default to 7-day expiry |
| **Sensitive** | No |

```env
JWT_EXPIRE=7d
```

**Valid values:** `1h`, `2h`, `24h`, `7d`, `30d`

---

### NODE_ENV

| Item | Detail |
|------|--------|
| **Purpose** | Indicates environment mode (development vs production) |
| **Required** | No (defaults to undefined) |
| **Where Used** | Various — error detail visibility, some conditional logic |
| **Development Value** | `development` |
| **Production Value** | `production` |
| **What Breaks if Missing** | Nothing critical — app runs normally |
| **Sensitive** | No |

```env
NODE_ENV=development
```

**Effects:**
- `production`: Error messages are generic (no stack traces exposed to users)
- `development`: Full error details shown in API responses

---

### ADMIN_EMAIL

| Item | Detail |
|------|--------|
| **Purpose** | Default admin account email (used for initial setup reference) |
| **Required** | No (informational only — admin is created via registration or script) |
| **Where Used** | Referenced in `.env.example` for documentation |
| **Development Value** | `admin@bookmyshot.com` |
| **Production Value** | Your actual admin email |
| **What Breaks if Missing** | Nothing — this is not read by the server code |
| **Sensitive** | No |

```env
ADMIN_EMAIL=admin@bookmyshot.com
```

---

### ADMIN_PASSWORD

| Item | Detail |
|------|--------|
| **Purpose** | Default admin account password (reference only) |
| **Required** | No (not read by server — just documented in .env for owner reference) |
| **Where Used** | Not used in code — informational reference |
| **Development Value** | Any test password |
| **Production Value** | Strong password (16+ characters) |
| **What Breaks if Missing** | Nothing |
| **Sensitive** | **YES** — keep secure |

```env
ADMIN_PASSWORD=Admin@123456
```

**NOTE:** This variable is NOT read by the application. It's stored here as a reminder of the admin login credentials. The actual password is hashed in MongoDB.

---

### RAZORPAY_KEY_ID (Future)

| Item | Detail |
|------|--------|
| **Purpose** | Razorpay payment gateway public key |
| **Required** | No (payment system is currently in mock mode) |
| **Where Used** | `server/routes/payments.js` (when real payments are enabled) |
| **Development Value** | Razorpay test key: `rzp_test_xxxxxxxxxxxxx` |
| **Production Value** | Razorpay live key: `rzp_live_xxxxxxxxxxxxx` |
| **What Breaks if Missing** | Payment processing won't work (currently mocked anyway) |
| **Sensitive** | Partially — this is the public key (safe to expose in frontend) |

```env
RAZORPAY_KEY_ID=rzp_test_yourkey
```

---

### RAZORPAY_KEY_SECRET (Future)

| Item | Detail |
|------|--------|
| **Purpose** | Razorpay payment gateway secret key |
| **Required** | No (payment system is currently in mock mode) |
| **Where Used** | `server/routes/payments.js` (server-side verification) |
| **Development Value** | Razorpay test secret |
| **Production Value** | Razorpay live secret |
| **What Breaks if Missing** | Payment verification won't work |
| **Sensitive** | **YES — NEVER expose this in frontend code** |

```env
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

---

## Summary Table

| Variable | Required | Sensitive | Default if Missing | Severity |
|----------|----------|-----------|-------------------|----------|
| PORT | No | No | 5000 | Low |
| MONGODB_URI | **YES** | **YES** | None — app crashes | **CRITICAL** |
| JWT_SECRET | **YES** | **YES** | Hardcoded fallback (insecure) | **HIGH** |
| JWT_EXPIRE | No | No | 7d | Low |
| NODE_ENV | No | No | undefined | Low |
| ADMIN_EMAIL | No | No | N/A (reference only) | None |
| ADMIN_PASSWORD | No | **YES** | N/A (reference only) | None |
| RAZORPAY_KEY_ID | No | No | Mock mode | Low |
| RAZORPAY_KEY_SECRET | No | **YES** | Mock mode | Low |

---

## Template .env File

Copy this to create your `.env`:

```env
# Server
PORT=5000
NODE_ENV=development

# Database (REQUIRED)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bookmyshot?retryWrites=true&w=majority

# Authentication (REQUIRED)
JWT_SECRET=change_this_to_random_64_char_string
JWT_EXPIRE=7d

# Admin Reference (not used by code)
ADMIN_EMAIL=admin@bookmyshot.com
ADMIN_PASSWORD=YourSecurePassword

# Payment Gateway (configure when ready)
# RAZORPAY_KEY_ID=rzp_test_xxx
# RAZORPAY_KEY_SECRET=xxx
```

---

## Production Deployment Checklist

Before going live, verify:

- [ ] `MONGODB_URI` points to production cluster (not development)
- [ ] `JWT_SECRET` is a unique random string (not the default)
- [ ] `NODE_ENV=production` is set
- [ ] `ADMIN_PASSWORD` is changed from default
- [ ] Razorpay keys are live mode (not test mode) if payments enabled
- [ ] `.env` file is NOT committed to Git
- [ ] Environment variables are set in hosting dashboard (not just local file)

---

*Guide generated for BookMyShot — June 2026*
