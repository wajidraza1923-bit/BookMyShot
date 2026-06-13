const express = require("express");
const Creator = require("../../models/Creator");
const Notification = require("../../models/Notification");
const auditService = require("../../services/auditService");

const router = express.Router();

// GET / - List all creators with their featured status (auto-expire old ones)
router.get("/", async (req, res, next) => {
  try {
    const now = new Date();

    // Auto-expire featured creators past their end date (uses updateMany - no hooks)
    await Creator.updateMany(
      { featured: true, featuredEndDate: { $lte: now } },
      { $set: { featured: false } }
    );

    const creators = await Creator.find({
      $or: [
        { featured: true },
        { featuredStartDate: { $exists: true, $ne: null } },
      ],
    })
      .populate("user", "name email avatar")
      .select("user creatorId featured featuredStartDate featuredEndDate featuredPaymentStatus specialty city category")
      .sort({ featured: -1, featuredStartDate: -1 })
      .lean();

    const active = creators.filter(c => c.featured).length;
    const expired = creators.filter(c => !c.featured && c.featuredStartDate).length;

    res.json({ success: true, data: creators, stats: { active, expired, total: creators.length } });
  } catch (err) {
    next(err);
  }
});

// POST /:creatorId - Feature a creator (uses findByIdAndUpdate - no hooks)
router.post("/:creatorId", async (req, res, next) => {
  try {
    const { endDate, days } = req.body;
    let featuredEnd;

    if (endDate) {
      featuredEnd = new Date(endDate);
    } else if (days) {
      featuredEnd = new Date();
      featuredEnd.setDate(featuredEnd.getDate() + parseInt(days));
    } else {
      featuredEnd = new Date();
      featuredEnd.setDate(featuredEnd.getDate() + 30);
    }

    const creator = await Creator.findByIdAndUpdate(
      req.params.creatorId,
      {
        $set: {
          featured: true,
          featuredStartDate: new Date(),
          featuredEndDate: featuredEnd,
          featuredPaymentStatus: "paid",
        },
      },
      { new: true }
    ).populate("user", "name email");

    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    await Notification.create({
      user: creator.user._id,
      type: "promotion",
      title: "⭐ You are now Featured!",
      message: `Your profile has been featured until ${featuredEnd.toLocaleDateString("en-IN")}.`,
    });

    await auditService.logAction({ adminId: req.user._id, adminName: req.user.name || "", action: "feature_creator", target: "creator", targetId: creator._id.toString(), previousValues: {}, newValues: { featured: true, featuredEndDate: featuredEnd }, ip: req.ip });

    res.json({ success: true, data: creator });
  } catch (err) {
    next(err);
  }
});

// PATCH /:creatorId/extend - Extend featured period (uses findByIdAndUpdate - no hooks)
router.patch("/:creatorId/extend", async (req, res, next) => {
  try {
    const { days } = req.body;
    if (!days || days <= 0) return res.status(400).json({ success: false, message: "days required (positive number)" });

    const existing = await Creator.findById(req.params.creatorId).lean();
    if (!existing) return res.status(404).json({ success: false, message: "Creator not found" });

    const currentEnd = existing.featuredEndDate ? new Date(existing.featuredEndDate) : new Date();
    const baseDate = currentEnd > new Date() ? currentEnd : new Date();
    const newEnd = new Date(baseDate);
    newEnd.setDate(newEnd.getDate() + parseInt(days));

    const creator = await Creator.findByIdAndUpdate(
      req.params.creatorId,
      { $set: { featured: true, featuredEndDate: newEnd } },
      { new: true }
    );

    await Notification.create({
      user: existing.user,
      type: "promotion",
      title: "⭐ Featured Extended!",
      message: `Your featured period has been extended by ${days} days.`,
    });

    await auditService.logAction({ adminId: req.user._id, adminName: req.user.name || "", action: "extend_featured", target: "creator", targetId: req.params.creatorId, previousValues: { featuredEndDate: currentEnd }, newValues: { featuredEndDate: newEnd }, ip: req.ip });

    res.json({ success: true, data: creator, newEndDate: newEnd });
  } catch (err) {
    next(err);
  }
});

// PATCH /:creatorId/expire - Force expire now (uses findByIdAndUpdate - no hooks)
router.patch("/:creatorId/expire", async (req, res, next) => {
  try {
    const creator = await Creator.findByIdAndUpdate(
      req.params.creatorId,
      { $set: { featured: false, featuredEndDate: new Date() } },
      { new: true }
    );

    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    await Notification.create({
      user: creator.user,
      type: "info",
      title: "Featured Status Ended",
      message: "Your featured profile placement has ended.",
    });

    await auditService.logAction({ adminId: req.user._id, adminName: req.user.name || "", action: "expire_featured", target: "creator", targetId: req.params.creatorId, previousValues: { featured: true }, newValues: { featured: false }, ip: req.ip });

    res.json({ success: true, message: "Featured expired" });
  } catch (err) {
    next(err);
  }
});

// DELETE /:creatorId - Remove from featured completely (uses findByIdAndUpdate - no hooks)
router.delete("/:creatorId", async (req, res, next) => {
  try {
    const creator = await Creator.findByIdAndUpdate(
      req.params.creatorId,
      {
        $set: { featured: false, featuredPaymentStatus: "none" },
        $unset: { featuredStartDate: "", featuredEndDate: "" },
      },
      { new: true }
    );

    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    await auditService.logAction({ adminId: req.user._id, adminName: req.user.name || "", action: "remove_featured", target: "creator", targetId: req.params.creatorId, previousValues: { featured: true }, newValues: { featured: false }, ip: req.ip });

    res.json({ success: true, message: "Featured removed" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
