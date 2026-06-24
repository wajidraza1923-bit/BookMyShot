/**
 * Admin Backup Management Routes
 * GET / — list backup history
 * POST /trigger — manually trigger a backup
 * POST /cleanup — run retention cleanup
 * GET /stats — backup storage stats
 */
const express = require("express");
const router = express.Router();
const { createBackup, cleanupOldBackups, getBackupHistory } = require("../../services/backupService");
const BackupLog = require("../../models/BackupLog");

// GET / — Backup history
router.get("/", async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const backups = await getBackupHistory(limit);
    const stats = {
      total: await BackupLog.countDocuments(),
      completed: await BackupLog.countDocuments({ status: "completed" }),
      failed: await BackupLog.countDocuments({ status: "failed" }),
      lastBackup: backups[0] || null,
    };
    res.json({ success: true, data: backups, stats });
  } catch (e) { next(e); }
});

// POST /trigger — Manually trigger backup
router.post("/trigger", async (req, res, next) => {
  try {
    const type = req.body.type || "manual";
    const log = await createBackup(type);
    res.json({ success: true, message: `Backup (${type}) completed`, data: log });
  } catch (e) {
    res.status(500).json({ success: false, message: "Backup failed: " + e.message });
  }
});

// POST /cleanup — Run retention cleanup
router.post("/cleanup", async (req, res, next) => {
  try {
    const result = await cleanupOldBackups();
    res.json({ success: true, message: "Cleanup completed", ...result });
  } catch (e) { next(e); }
});

// GET /stats — Storage stats
router.get("/stats", async (req, res, next) => {
  try {
    const totalSize = await BackupLog.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$sizeBytes" } } },
    ]);
    const daily = await BackupLog.countDocuments({ type: "daily", status: "completed" });
    const weekly = await BackupLog.countDocuments({ type: "weekly", status: "completed" });
    res.json({
      success: true,
      data: {
        totalSizeMB: ((totalSize[0]?.total || 0) / 1024 / 1024).toFixed(2),
        dailyBackups: daily,
        weeklyBackups: weekly,
        retentionPolicy: {
          daily: "90 days",
          weekly: "1 year",
        },
      },
    });
  } catch (e) { next(e); }
});

module.exports = router;
