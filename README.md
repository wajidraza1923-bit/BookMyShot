# BookMyShot

Premium multi-panel wedding photographer booking platform.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js + Express
- **Database:** MongoDB
- **Auth:** JWT + bcrypt
- **Uploads:** Multer

## Project Structure

```
BookMyShot/
├── server/
│   ├── index.js           # Express entry
│   ├── config/db.js       # MongoDB connection
│   ├── models/            # Mongoose schemas
│   ├── routes/            # API routes
│   ├── middleware/        # Auth, upload, errors
│   ├── utils/             # Token, notifications
│   └── seed.js            # Demo data
├── public/
│   ├── index.html         # Public homepage
│   ├── login.html         # Unified login
│   ├── register.html      # User signup
│   ├── css/               # theme, dashboard, homepage
│   ├── js/                # api, utils, homepage
│   ├── admin/             # Admin dashboard
│   ├── creator/           # Creator dashboard
│   ├── user/              # User dashboard
│   └── uploads/           # Uploaded files
├── package.json
└── .env.example
```

## Setup

### 1. Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [MongoDB](https://www.mongodb.com/) running locally **or** a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) connection string in `.env`

**Seed failed with `ECONNREFUSED`?** MongoDB is not running. Start it (`net start MongoDB` on Windows) or use Atlas:

```env
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/bookmyshot
```

### 2. Install

```bash
cd BookMyShot
npm install
cp .env.example .env
```

Edit `.env` with your MongoDB URI and JWT secret.

### 3. Seed database

```bash
npm run seed
```

**Demo accounts:**

| Role    | Email                  | Password      |
|---------|------------------------|---------------|
| Admin   | admin@bookmyshot.com   | Admin@123456  |
| Creator | sarah@bookmyshot.com   | Creator@123   |
| User    | user@bookmyshot.com    | User@123456   |

### 4. Run server

```bash
npm start
```

Open **http://localhost:5000**

## Frontend dashboard app

A premium Next.js dashboard frontend has been added in `frontend/`.

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the backend API to be available at `http://localhost:5000` by default. Set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` if you want a custom API endpoint.

## Dashboards

| Dashboard | URL |
|-----------|-----|
| Homepage  | `/` |
| Admin     | `/admin/` |
| Creator   | `/creator/` |
| User      | `/user/dashboard.html` |
| Creator Register | `/creator/register.html` |

## API Overview

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Register user/creator |
| `POST /api/auth/login` | Login |
| `GET /api/creators` | List photographers (search/filter) |
| `POST /api/bookings` | Create booking |
| `GET /api/admin/*` | Admin management |
| `GET /api/creator/*` | Creator tools, planning, calendar |
| `GET /api/user/*` | User favorites, invoices |

## Features

### Admin
- Approve/reject creators, manage users
- View all bookings & analytics
- Homepage CMS, contact forms
- Featured creators, portfolio review

### Creator
- Profile, portfolio, video uploads
- Booking accept/reject, PDF export
- Private planning notebook (auto-save)
- Private + public availability calendars
- Messages, earnings, notifications

### User
- Search/filter photographers
- Book with full form (name, phone, email, event, date, location, budget)
- Track bookings, chat, download invoices
- Save favorites

## License

MIT
