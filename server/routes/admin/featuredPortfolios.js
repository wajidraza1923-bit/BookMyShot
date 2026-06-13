const express = require("express");
const Creator = require("../../models/Creator");
const PromotionRequest = require("../../models/PromotionRequest");
const Notification = require("../../models/Notification");
const auditService = require("../../services/auditService");
const emailService = require("../../services/emailService");

const router = express.Router();

// GET / - List all featured profiles from PromotionRequest (single source of truth)
router.get("/", async (req, res, next) => {
  try {
    const now = new Date();

    // Auto-expire past-due promotions and sync Creator model
    const expiredPromos = await PromotionRequest.find({ status: "approved", expiryDate: { $lte: now }, planType: { $in: ["homepage_featured", "featured_1", "featured_2", "featured_3", "featured_4"] } });
    for (const promo of expiredPromos) {
      promo.status = "expired";
      await promo.save();
      await Creator.updateOne({ _id: promo.creator }, { $set: { featured: false } });
    }

    // Get all featured promotion records as single source of truth
    const promotions = await PromotionRequest.find({
      planType: { $in: ["homepage_featured", "featured_1", "featured_2", "featured_3", "featured_4"] },
    })
      .populate({ path: "creator", populate: { path: "user", select: "name email avatar" }, select: "user creatorId specialty city category" })
      .sort({ status: 1, expiryDate: -1 })
      .lean();

    const data = promotions.map(p => ({
      _id: p._id,
      creatorDbId: p.creator?._id || "",
      creatorId: p.creator?.creatorId || "",
      creatorName: p.creator?.user?.name || p.creatorName || "—",
      creatorEmail: p.creator?.user?.email || "",
      planType: p.planType,
      status: p.status,
      startDate: p.startDate,
      expiryDate: p.expiryDate,
      lastExtendedDate: p.lastExtendedDate,
      lastPaymentDate: p.lastPaymentDate || p.createdAt,
      totalDaysPurchased: p.totalDaysPurchased || 30,
      price: p.price,
      daysRemaining: p.status === "approved" && p.expiryDate ? Math.max(0, Math.ceil((new Date(p.expiryDate) - now) / 86400000)) : 0,
      extensionCount: (p.extensionHistory || []).length,
    }));

    const active = data.filter(d => d.status === "approved").length;
    const expired = data.filter(d => d.status === "expired").length;

    res.json({ success: true, data, stats: { active, expired, total: data.length } });
  } catch (err) {
    next(err);
  }
});

// POST /:creatorId - Feature a creator manually (admin)
router.post("/:creatorId", async (req, res, next) => {
  try {
    const { days, planType } = req.body;
    const numDays = parseInt(days) || 30;
    const plan = planType || "homepage_featured";

    const now = new Date();
    const featuredEnd = new Date(now);
    featuredEnd.setDate(featuredEnd.getDate() + numDays);

    const creator = await Creator.findById(req.params.creatorId).populate("user", "name email");
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    // Create PromotionRequest record
    await PromotionRequest.create({
      creator: creator._id,
      creatorName: creator.user?.name || "",
      planType: plan,
      price: 0,
      status: "approved",
      startDate: now,
      expiryDate: featuredEnd,
      lastPaymentDate: now,
      totalDaysPurchased: numDays,
      extensionHistory: [{ daysAdded: numDays, previousExpiry: null, newExpiry: featuredEnd, method: "admin", adminId: req.user._id, timestamp: now }],
    });

    // Update Creator model
    await Creator.findByIdAndUpdate(creator._id, { $set: { featured: true, featuredStartDate: now, featuredEndDate: featuredEnd, featuredPaymentStatus: "paid" } });

    await Notification.create({ user: creator.user._id, type: "promotion", title: "⭐ You are now Featured!", message: `Your profile has been featured for ${numDays} days.` });

    await auditService.logAction({ adminId: req.user._id, adminName: req.user.name || "", action: "feature_creator", target: "creator", targetId: creator._id.toString(), previousValues: {}, newValues: { featured: true, days: numDays, expiryDate: featuredEnd }, ip: req.ip });

    res.json({ success: true, message: `Featured for ${numDays} days` });
  } catch (err) {
    next(err);
  }
});

// PATCH /:promoId/extend - Extend featured period (by promo record ID)
router.patch("/:promoId/extend", async (req, res, next) => {
  try {
    const { days } = req.body;
    if (!days || days <= 0) return res.status(400).json({ success: false, message: "days required" });

    const promo = await PromotionRequest.findById(req.params.promoId);
    if (!promo) return res.status(404).json({ success: false, message: "Promotion record not found" });

    const now = new Date();
    const previousExpiry = promo.expiryDate ? new Date(promo.expiryDate) : now;
    const baseDate = previousExpiry > now ? previousExpiry : now;
    const newExpiry = new Date(baseDate);
    newExpiry.setDate(newExpiry.getDate() + parseInt(days));

    // Update PromotionRequest
    promo.expiryDate = newExpiry;
    promo.lastExtendedDate = now;
    promo.status = "approved";
    promo.totalDaysPurchased = (promo.totalDaysPurchased || 30) + parseInt(days);
    if (!promo.extensionHistory) promo.extensionHistory = [];
    promo.extensionHistory.push({ daysAdded: parseInt(days), previousExpiry, newExpiry, method: "admin", adminId: req.user._id, timestamp: now });
    await promo.save();

    // Sync Creator model
    await Creator.findByIdAndUpdate(promo.creator, { $set: { featured: true, featuredEndDate: newExpiry } });

    // Email notification
    const creator = await Creator.findById(promo.creator).populate("user", "name email");
    if (creator?.user?.email) {
      emailService.sendEmail({
        to: creator.user.email,
        subject: "⭐ Your Featured Listing Has Been Extended — BookMyShot",
        html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:2rem;background:#111;color:#f6eee7;border-radius:12px">
          <h2 style="color:#DAAF37;margin:0 0 1rem">Featured Listing Extended</h2>
          <p style="color:#b9aa98">Hello ${creator.user.name},</p>
          <p style="color:#d4c8bc">Your featured listing has been extended on BookMyShot.</p>
          <table style="width:100%;border-collapse:collapse;margin:1rem 0;font-size:0.85rem">
            <tr><td style="padding:0.4rem 0;color:#8a7e72">Position</td><td style="color:#f6eee7;text-align:right">${promo.planType}</td></tr>
            <tr><td style="padding:0.4rem 0;color:#8a7e72">Days Added</td><td style="color:#DAAF37;text-align:right;font-weight:600">+${days} days</td></tr>
            <tr><td style="padding:0.4rem 0;color:#8a7e72">Previous Expiry</td><td style="color:#f6eee7;text-align:right">${previousExpiry.toLocaleDateString("en-IN")}</td></tr>
            <tr><td style="padding:0.4rem 0;color:#8a7e72">New Expiry</td><td style="color:#10b981;text-align:right;font-weight:600">${newExpiry.toLocaleDateString("en-IN")}</td></tr>
          </table>
          <p style="color:#8a7e72;font-size:0.75rem">Thank you for using BookMyShot.</p>
        </div>`,
        type: "other",
        userId: creator.user._id,
        creatorId: creator._id,
        meta: { action: "featured_extended", days, previousExpiry, newExpiry },
      }).catch(e => console.error("[Email] featured extend:", e.message));
    }

    await Notification.create({ user: promo.creator ? (creator?.user?._id || promo.creator) : req.user._id, type: "promotion", title: "⭐ Featured Extended!", message: `+${days} days. New expiry: ${newExpiry.toLocaleDateString("en-IN")}` });
    await auditService.logAction({ adminId: req.user._id, adminName: req.user.name || "", action: "extend_featured", target: "promotion", targetId: promo._id.toString(), previousValues: { expiryDate: previousExpiry }, newValues: { expiryDate: newExpiry, days }, ip: req.ip });

    res.json({ success: true, message: `Extended by ${days} days`, newExpiry });
  } catch (err) {
    next(err);
  }
});

// PATCH /:promoId/expire - Force expire now
router.patch("/:promoId/expire", async (req, res, next) => {
  try {
    const promo = await PromotionRequest.findById(req.params.promoId);
    if (!promo) return res.status(404).json({ success: false, message: "Promotion record not found" });

    promo.status = "expired";
    promo.expiryDate = new Date();
    await promo.save();

    // Sync Creator model
    await Creator.findByIdAndUpdate(promo.creator, { $set: { featured: false } });

    await Notification.create({ user: promo.creator, type: "info", title: "Featured Status Ended", message: "Your featured placement has expired." });
    await auditService.logAction({ adminId: req.user._id, adminName: req.user.name || "", action: "expire_featured", target: "promotion", targetId: promo._id.toString(), previousValues: { status: "approved" }, newValues: { status: "expired" }, ip: req.ip });

    res.json({ success: true, message: "Featured expired" });
  } catch (err) {
    next(err);
  }
});

// DELETE /:promoId - Remove featured record completely
router.delete("/:promoId", async (req, res, next) => {
  try {
    const promo = await PromotionRequest.findById(req.params.promoId);
    if (!promo) return res.status(404).json({ success: false, message: "Record not found" });

    // Sync Creator model
    await Creator.findByIdAndUpdate(promo.creator, { $set: { featured: false }, $unset: { featuredStartDate: "", featuredEndDate: "" } });

    await PromotionRequest.findByIdAndDelete(req.params.promoId);
    await auditService.logAction({ adminId: req.user._id, adminName: req.user.name || "", action: "remove_featured", target: "promotion", targetId: req.params.promoId, previousValues: { status: promo.status }, newValues: { deleted: true }, ip: req.ip });

    res.json({ success: true, message: "Featured removed" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
