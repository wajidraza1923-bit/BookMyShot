const express = require("express");
const SearchBoost = require("../../models/SearchBoost");
const Creator = require("../../models/Creator");
const Notification = require("../../models/Notification");
const auditService = require("../../services/auditService");

const router = express.Router();

// GET / - List all boost requests
router.get("/", async (req, res, next) => {
  try {
    const boosts = await SearchBoost.find()
      .populate({
        path: "creator",
        populate: { path: "user", select: "name email" },
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: boosts });
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/approve - Approve a boost
router.patch("/:id/approve", async (req, res, next) => {
  try {
    const boost = await SearchBoost.findById(req.params.id);
    if (!boost) {
      return res.status(404).json({ success: false, message: "Boost not found" });
    }

    const previousValues = {
      status: boost.status,
      startDate: boost.startDate,
      endDate: boost.endDate,
      approvedBy: boost.approvedBy,
    };

    const duration = req.body.duration; // duration in days
    boost.status = "active";
    boost.startDate = new Date();
    boost.endDate = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
    boost.approvedBy = req.user._id;

    await boost.save();

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "approve_search_boost",
      target: "search_boost",
      targetId: boost._id.toString(),
      previousValues,
      newValues: {
        status: boost.status,
        startDate: boost.startDate,
        endDate: boost.endDate,
        approvedBy: boost.approvedBy,
      },
      ip: req.ip,
    });

    res.json({ success: true, data: boost });
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/reject - Reject a boost
router.patch("/:id/reject", async (req, res, next) => {
  try {
    const boost = await SearchBoost.findById(req.params.id).populate({
      path: "creator",
      populate: { path: "user", select: "name" },
    });
    if (!boost) {
      return res.status(404).json({ success: false, message: "Boost not found" });
    }

    const previousValues = {
      status: boost.status,
      rejectionReason: boost.rejectionReason,
    };

    boost.status = "rejected";
    boost.rejectionReason = req.body.reason || "";

    await boost.save();

    // Create notification for the creator's user
    if (boost.creator && boost.creator.user) {
      const userId = boost.creator.user._id || boost.creator.user;
      await Notification.create({
        user: userId,
        type: "boost_rejected",
        title: "Search Boost Rejected",
        message: `Your search boost request was rejected. Reason: ${boost.rejectionReason}`,
      });
    }

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "reject_search_boost",
      target: "search_boost",
      targetId: boost._id.toString(),
      previousValues,
      newValues: {
        status: boost.status,
        rejectionReason: boost.rejectionReason,
      },
      ip: req.ip,
    });

    res.json({ success: true, data: boost });
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/extend - Extend a boost duration
router.patch("/:id/extend", async (req, res, next) => {
  try {
    const boost = await SearchBoost.findById(req.params.id);
    if (!boost) {
      return res.status(404).json({ success: false, message: "Boost not found" });
    }

    const previousEndDate = boost.endDate;
    const extensionDays = req.body.extensionDays || req.body.days;

    const currentEndDate = new Date(boost.endDate);
    boost.endDate = new Date(currentEndDate.getTime() + extensionDays * 24 * 60 * 60 * 1000);

    await boost.save();

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "extend_search_boost",
      target: "search_boost",
      targetId: boost._id.toString(),
      previousValues: { endDate: previousEndDate },
      newValues: { endDate: boost.endDate, extensionDays },
      ip: req.ip,
    });

    res.json({ success: true, data: boost });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
