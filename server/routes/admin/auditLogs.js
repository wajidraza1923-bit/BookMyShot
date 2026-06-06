const express = require("express");
const AuditLog = require("../../models/AuditLog");

const router = express.Router();

// GET / - Filtered, paginated audit logs (immutable - no PUT/PATCH/DELETE)
router.get("/", async (req, res, next) => {
  try {
    const {
      action,
      dateFrom,
      dateTo,
      admin,
      target,
      page = 1,
      limit = 50,
    } = req.query;

    // Build filter object
    const filter = {};

    if (action) {
      filter.action = { $regex: action, $options: "i" };
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.createdAt.$lte = new Date(dateTo);
      }
    }

    if (admin) {
      filter.adminName = { $regex: admin, $options: "i" };
    }

    if (target) {
      filter.targetType = target;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("admin", "name email"),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        total,
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
