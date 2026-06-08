# BOOKMYSHOT — DATABASE BACKUP & RESTORE GUIDE

> **Version:** 1.0 | **Date:** June 2026 | **Database:** MongoDB Atlas

---

## TABLE OF CONTENTS

1. [Overview](#1-overview)
2. [MongoDB Atlas Built-in Backups](#2-mongodb-atlas-built-in-backups)
3. [Manual Backup Using mongodump](#3-manual-backup-using-mongodump)
4. [Manual Backup Using MongoDB Compass](#4-manual-backup-using-mongodb-compass)
5. [Export Individual Collections](#5-export-individual-collections)
6. [Restore from Backup](#6-restore-from-backup)
7. [Disaster Recovery Scenarios](#7-disaster-recovery-scenarios)
8. [Monthly Backup Checklist](#8-monthly-backup-checklist)
9. [Backup Storage Locations](#9-backup-storage-locations)
10. [Automated Backup Script](#10-automated-backup-script)

---

## 1. OVERVIEW

### BookMyShot Database Details

| Item | Value |
|------|-------|
| Database Name | `bookmyshot` |
| Host | MongoDB Atlas (cloud.mongodb.com) |
| Cluster | `ac-tk0gd4q` on `meoixp9.mongodb.net` |
| Total Collections | 21 |
| Current Plan | M0 Free Tier |
| Auto Backups | ❌ Not available on free tier |
| Manual Backups | ✅ Must be done manually |

### Critical Collections (Data Loss = Business Impact)

| Collection | Priority | Impact if Lost |
|-----------|----------|----------------|
| users | 🔴 CRITICAL | All accounts gone — no one can log in |
| creators | 🔴 CRITICAL | All creator profiles, portfolios lost |
| bookings | 🔴 CRITICAL | All booking records gone |
| commissions | 🟡 HIGH | Financial records lost |
| payments | 🟡 HIGH | Payment history lost |
| invoices | 🟡 HIGH | Invoice records lost |
| platformsettings | 🟢 MEDIUM | Can be recreated (auto-seeds defaults) |
| subscriptionsettings | 🟢 MEDIUM | Can be recreated (auto-seeds defaults) |
| commissionsettings | 🟢 MEDIUM | Can be recreated (auto-seeds defaults) |

---

## 2. MONGODB ATLAS BUILT-IN BACKUPS

### Free Tier (M0) — No Automatic Backups

The free M0 cluster does NOT include automatic backups. You must back up manually.

### Paid Tiers (M10+) — Automatic Backups

If you upgrade to M10 or higher:

1. Go to MongoDB Atlas → Your Cluster → Backup tab
2. Backups are taken automatically every day
3. Point-in-time recovery available (within retention window)
4. To restore: Backup tab → Select snapshot → Restore

**Cost:** M10 starts at ~$57/month (includes daily backups with 2-day retention)

### Enable Cloud Backup (M10+)

1. Atlas Dashboard → Cluster → "..." menu → "Edit Configuration"
2. Under "Backup" → Enable "Cloud Backup"
3. Set retention: Minimum 7 days recommended
4. Save changes

---

## 3. MANUAL BACKUP USING MONGODUMP

### Prerequisites

Install MongoDB Database Tools:
- Download from: https://www.mongodb.com/try/download/database-tools
- Includes `mongodump` and `mongorestore` commands

### Full Database Backup

```bash
# Replace YOUR_MONGODB_URI with your actual connection string
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/bookmyshot" --out=./backups/backup_$(date +%Y%m%d_%H%M%S)
```

**Windows (PowerShell):**
```powershell
$date = Get-Date -Format "yyyyMMdd_HHmmss"
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/bookmyshot" --out=".\backups\backup_$date"
```

### What Gets Created

```
backups/
└── backup_20260607_143022/
    └── bookmyshot/
        ├── users.bson
        ├── users.metadata.json
        ├── creators.bson
        ├── creators.metadata.json
        ├── bookings.bson
        ├── bookings.metadata.json
        ├── commissions.bson
        ├── payments.bson
        ├── invoices.bson
        ├── notifications.bson
        ├── messages.bson
        ├── inquiries.bson
        ├── calendarevents.bson
        ├── platformsettings.bson
        ├── subscriptionsettings.bson
        ├── commissionsettings.bson
        ├── searchboosts.bson
        ├── announcements.bson
        ├── auditlogs.bson
        ├── sociallinks.bson
        └── promotionrequests.bson
```

### Backup Size Estimate

| Stage | Approximate Size |
|-------|-----------------|
| Fresh install (few creators) | 1-5 MB |
| 100 creators, 500 bookings | 20-50 MB |
| 1000 creators, 5000 bookings | 100-300 MB |

---

## 4. MANUAL BACKUP USING MONGODB COMPASS

MongoDB Compass is a GUI tool — no command line needed.

### Steps

1. Download MongoDB Compass: https://www.mongodb.com/try/download/compass
2. Open Compass → Paste your connection string → Connect
3. Click on `bookmyshot` database
4. For each collection:
   - Click the collection name
   - Click "Export Collection" (top menu)
   - Choose format: JSON (recommended) or CSV
   - Export all fields
   - Save to `backups/` folder on your computer

### When to Use Compass

- You're not comfortable with command line
- You need to export specific collections only
- You want to visually inspect data before backup

---

## 5. EXPORT INDIVIDUAL COLLECTIONS

### Export Specific Collection (Command Line)

```bash
# Export only users collection
mongoexport --uri="YOUR_URI" --db=bookmyshot --collection=users --out=users_backup.json

# Export only creators
mongoexport --uri="YOUR_URI" --db=bookmyshot --collection=creators --out=creators_backup.json

# Export only bookings
mongoexport --uri="YOUR_URI" --db=bookmyshot --collection=bookings --out=bookings_backup.json
```

### Export Using Node.js Script

Save this as `backup-script.js` in your project:

```javascript
const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

// Import all models
require('./server/models/User');
require('./server/models/Creator');
require('./server/models/Booking');
require('./server/models/Commission');
require('./server/models/Payment');

async function backup() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const collections = ['users', 'creators', 'bookings', 'commissions', 'payments',
    'invoices', 'notifications', 'messages', 'inquiries', 'platformsettings',
    'subscriptionsettings', 'commissionsettings', 'sociallinks'];
  
  const date = new Date().toISOString().split('T')[0];
  const dir = `./backups/${date}`;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  for (const name of collections) {
    try {
      const data = await mongoose.connection.db.collection(name).find({}).toArray();
      fs.writeFileSync(`${dir}/${name}.json`, JSON.stringify(data, null, 2));
      console.log(`✓ ${name}: ${data.length} documents`);
    } catch (e) {
      console.log(`✗ ${name}: ${e.message}`);
    }
  }

  console.log(`\nBackup saved to: ${dir}`);
  await mongoose.disconnect();
}

backup();
```

Run it:
```bash
node backup-script.js
```

---

## 6. RESTORE FROM BACKUP

### Full Restore (mongorestore)

**⚠️ WARNING:** This OVERWRITES existing data. Use `--drop` only if you want to replace everything.

```bash
# Restore entire database (REPLACES all existing data)
mongorestore --uri="YOUR_URI" --db=bookmyshot --drop ./backups/backup_20260607/bookmyshot/

# Restore WITHOUT dropping (merges — may cause duplicates)
mongorestore --uri="YOUR_URI" --db=bookmyshot ./backups/backup_20260607/bookmyshot/
```

### Restore Single Collection

```bash
# Restore only the users collection
mongorestore --uri="YOUR_URI" --db=bookmyshot --collection=users --drop ./backups/backup_20260607/bookmyshot/users.bson
```

### Restore from JSON Export

```bash
# Import a JSON file into a collection
mongoimport --uri="YOUR_URI" --db=bookmyshot --collection=users --drop --file=users_backup.json
```

### Restore Using Node.js

```javascript
const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

async function restore(collection, filePath) {
  await mongoose.connect(process.env.MONGODB_URI);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // Drop existing collection
  await mongoose.connection.db.collection(collection).deleteMany({});
  
  // Insert backup data
  if (data.length > 0) {
    await mongoose.connection.db.collection(collection).insertMany(data);
  }
  
  console.log(`Restored ${data.length} documents to ${collection}`);
  await mongoose.disconnect();
}

// Usage: node restore.js users ./backups/2026-06-07/users.json
const collection = process.argv[2];
const file = process.argv[3];
if (collection && file) restore(collection, file);
else console.log('Usage: node restore.js <collection> <file>');
```

---

## 7. DISASTER RECOVERY SCENARIOS

### Scenario A: Accidental Collection Deletion

**Symptoms:** A specific section of the app shows no data (e.g., all bookings gone)

**Recovery:**
1. Identify which collection was deleted
2. Find most recent backup containing that collection
3. Restore single collection:
   ```bash
   mongorestore --uri="YOUR_URI" --db=bookmyshot --collection=bookings ./backups/latest/bookmyshot/bookings.bson
   ```
4. Verify data is restored

---

### Scenario B: Entire Database Wiped

**Symptoms:** Nothing works — empty everywhere, no logins

**Recovery:**
1. Locate latest full backup folder
2. Restore everything:
   ```bash
   mongorestore --uri="YOUR_URI" --db=bookmyshot --drop ./backups/latest/bookmyshot/
   ```
3. Restart server: `pm2 restart bookmyshot`
4. Verify admin login works
5. Check creator/booking data

---

### Scenario C: Database Corrupted (Partial Data Loss)

**Symptoms:** Some data missing, some present, errors in API

**Recovery:**
1. Export current (partially corrupted) data as emergency backup
2. Compare with last good backup
3. Restore from last known good backup
4. Manually re-enter any data created between backup and corruption

---

### Scenario D: Need to Migrate to New Cluster

**Steps:**
1. Back up current database: `mongodump --uri="OLD_URI" --out=./migration`
2. Create new Atlas cluster
3. Restore to new cluster: `mongorestore --uri="NEW_URI" --db=bookmyshot ./migration/bookmyshot/`
4. Update `MONGODB_URI` in .env / hosting variables
5. Restart server
6. Verify all data present

---

### Scenario E: No Backup Exists (Worst Case)

**Recovery:**
1. Accept data loss — no backup means no recovery
2. Start server — configService will seed default settings
3. Create new admin account (see Recovery Guide)
4. Notify all users to re-register
5. **Learn from this: Set up regular backups immediately**

---

## 8. MONTHLY BACKUP CHECKLIST

### Perform on the 1st of Every Month

- [ ] **Run full backup:**
  ```bash
  mongodump --uri="YOUR_URI" --out=./backups/monthly_$(date +%Y%m)
  ```
- [ ] **Verify backup size** is reasonable (not 0 bytes)
- [ ] **Copy backup** to external storage (Google Drive / external hard drive)
- [ ] **Test restore** on a separate test database (quarterly):
  ```bash
  mongorestore --uri="TEST_DB_URI" --db=bookmyshot_test ./backups/monthly_202606/bookmyshot/
  ```
- [ ] **Delete old backups** older than 6 months (keep at least 3 recent)
- [ ] **Check MongoDB Atlas** storage usage (stay under 512MB on free tier)
- [ ] **Document** what was backed up and where it's stored

### Backup Log Template

```
Date: ___________
Backup Location: ___________
Size: _____ MB
Collections: _____ total
Verified: Yes / No
Stored Offsite: Yes / No
Notes: ___________
```

---

## 9. BACKUP STORAGE LOCATIONS

### Recommended 3-2-1 Rule

Keep **3 copies** of your data, on **2 different media**, with **1 copy offsite**.

| Location | Type | Example |
|----------|------|---------|
| Local computer | Primary | `C:\BookMyShot\backups\` |
| External drive | Secondary | USB drive / external HDD |
| Cloud storage | Offsite | Google Drive / Dropbox |

### Cloud Storage Options

| Service | Free Storage | Monthly Cost | Auto-Sync |
|---------|-------------|-------------|-----------|
| Google Drive | 15 GB | ₹0 | Yes |
| Dropbox | 2 GB | ₹0 | Yes |
| OneDrive | 5 GB | ₹0 | Yes |
| AWS S3 | 5 GB (12 months) | ₹50+ | Via script |

### Retention Policy

| Backup Type | Keep For | Frequency |
|-------------|----------|-----------|
| Daily (if automated) | 7 days | Daily |
| Weekly | 4 weeks | Every Sunday |
| Monthly | 12 months | 1st of month |
| Before major updates | Permanent | Before each deploy |

---

## 10. AUTOMATED BACKUP SCRIPT

### For VPS / Server with Cron

Save as `/home/user/backup-bookmyshot.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR="/home/user/backups/bookmyshot/$DATE"
MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/bookmyshot"

# Create backup
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR"

# Compress
tar -czf "$BACKUP_DIR.tar.gz" -C "/home/user/backups/bookmyshot" "$DATE"
rm -rf "$BACKUP_DIR"

# Delete backups older than 30 days
find /home/user/backups/bookmyshot -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR.tar.gz"
```

Make executable and schedule:
```bash
chmod +x /home/user/backup-bookmyshot.sh

# Add to crontab (runs daily at 3 AM)
crontab -e
# Add this line:
0 3 * * * /home/user/backup-bookmyshot.sh >> /home/user/backups/backup.log 2>&1
```

### For Windows (Task Scheduler)

Save as `backup.bat`:
```batch
@echo off
set DATE=%date:~-4%%date:~4,2%%date:~7,2%
set BACKUP_DIR=C:\BookMyShot\backups\%DATE%
set URI=mongodb+srv://username:password@cluster.mongodb.net/bookmyshot

mongodump --uri="%URI%" --out="%BACKUP_DIR%"
echo Backup complete: %BACKUP_DIR%
```

Schedule via Windows Task Scheduler → Create Basic Task → Weekly/Monthly trigger.

---

## QUICK REFERENCE

```
╔══════════════════════════════════════════════╗
║     BACKUP: mongodump --uri=URI --out=DIR    ║
║    RESTORE: mongorestore --uri=URI DIR       ║
║     EXPORT: mongoexport --uri=URI -c=COL     ║
║     IMPORT: mongoimport --uri=URI -c=COL     ║
╠══════════════════════════════════════════════╣
║  Frequency: Monthly minimum, weekly ideal    ║
║  Storage: Local + External + Cloud           ║
║  Test restore: Quarterly                     ║
╚══════════════════════════════════════════════╝
```

---

*Guide generated for BookMyShot — June 2026*
*Next backup due: 1st of next month*
