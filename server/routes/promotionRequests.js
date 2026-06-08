const express = require("express");
const PromotionRequest = require("../models/PromotionRequest");
const Creator = require("../models/Creator");
const configService = require("../services/configService");
const auditService = require("../services/auditService");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// PUBLIC: Get rank slot occupancy (who owns each rank currently)
// ═══════════════════════════════════════════════════════════════
router.get("/rank-status", async (req, res, next) => {
  try {
    const now = new Date();
    // Auto-expire old promotions
    const expired = await PromotionRequest.find({ status: "approved", expiryDate: { $lte: now } });
    for (const promo of expired) {
      promo.status = "expired";
      await promo.save();
      // Remove rank from creator
      const creator = await Creator.findById(promo.creator);
      if (creator) {
        if (promo.planType === "homepage_featured") {
          creator.featured = false;
        } else if (promo.planType.startsWith("rank_")) {
          const rankNum = parseInt(promo.planType.split("_")[1], 10);
          if (creator.rank === rankNum) creator.rank = 0;
        }
        await creator.save();
      }
    }

    // Get active rank holders
    const activeRanks = await PromotionRequest.find({
      status: "approved",
      expiryDate: { $gt: now },
      planType: { $in: ["rank_1", "rank_2", "rank_3", "rank_4"] },
    }).populate({ path: "creator", populate: { path: "user", select: "name" } });

    const slots = {};
    activeRanks.forEach(r => {
      slots[r.planType] = {
        occupied: true,
        ownerName: r.creator?.user?.name || r.creatorName || "Unknown",
        creatorId: r.creator?._id || r.creator,
        expiryDate: r.expiryDate,
        startDate: r.startDate,
      };
    });

    res.json({ success: true, slots });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// CREATOR: Get my active promotion
// ═══════════════════════════════════════════════════════════════
router.get("/my-active", protect, authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    const now = new Date();
    const active = await PromotionRequest.findOne({
      creator: creator._id,
      status: "approved",
      expiryDate: { $gt: now },
    });

    if (!active) return res.json({ success: true, active: null });

    const daysRemaining = Math.max(0, Math.ceil((active.expiryDate - now) / 86400000));
    res.json({
      success: true,
      active: {
        planType: active.planType,
        price: active.price,
        startDate: active.startDate,
        expiryDate: active.expiryDate,
        daysRemaining,
        status: "active",
      },
    });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// CREATOR: Get available promotion plans with prices
// ═══════════════════════════════════════════════════════════════
router.get("/plans", protect, async (req, res, next) => {
  try {
    const settings = await configService.getSubscriptionSettings();
    res.json({
      success: true,
      plans: [
        { id: "homepage_featured", name: "Homepage Featured", price: settings.homepageFeaturedPrice || 1499, benefits: ["Appear in Featured Creators section", "Higher visibility", "Priority exposure"] },
        { id: "rank_1", name: "Rank #1", price: settings.rank1Price || 1999, benefits: ["First position in All Creators"] },
        { id: "rank_2", name: "Rank #2", price: settings.rank2Price || 1499, benefits: ["Second position in All Creators"] },
        { id: "rank_3", name: "Rank #3", price: settings.rank3Price || 999, benefits: ["Third position in All Creators"] },
        { id: "rank_4", name: "Rank #4", price: settings.rank4Price || 799, benefits: ["Fourth position in All Creators"] },
      ],
    });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// CREATOR: Apply for promotion
// ═══════════════════════════════════════════════════════════════
router.post("/apply", protect, authorize("creator"), async (req, res, next) => {
  try {
    const { planType, screenshot, utr } = req.body;
    const validPlans = ["homepage_featured", "rank_1", "rank_2", "rank_3", "rank_4"];
    if (!planType || !validPlans.includes(planType)) {
      return res.status(400).json({ success: false, message: "Invalid plan type" });
    }
    if (!screenshot || !utr) {
      return res.status(400).json({ success: false, message: "Payment screenshot and UTR are required" });
    }

    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    // Check for existing pending request of same type
    const existing = await PromotionRequest.findOne({ creator: creator._id, planType, status: "pending" });
    if (existing) {
      return res.status(400).json({ success: false, message: "You already have a pending request for this plan" });
    }

    // Upload screenshot to Cloudinary
    let screenshotUrl = screenshot;
    if (screenshotUrl.startsWith("data:")) {
      try {
        const { uploadBase64, isConfigured } = require("../services/cloudinaryService");
        if (isConfigured()) {
          const result = await uploadBase64(screenshotUrl, { folder: "bookmyshot/promotion-payments" });
          screenshotUrl = result.url;
        }
      } catch (e) { /* keep original */ }
    }

    const settings = await configService.getSubscriptionSettings();
    const priceMap = {
      homepage_featured: settings.homepageFeaturedPrice || 1499,
      rank_1: settings.rank1Price || 1999,
      rank_2: settings.rank2Price || 1499,
      rank_3: settings.rank3Price || 999,
      rank_4: settings.rank4Price || 799,
    };

    const request = await PromotionRequest.create({
      creator: creator._id,
      creatorName: req.user.name || "",
      planType,
      price: priceMap[planType],
      screenshot: screenshotUrl,
      utr: utr.trim(),
      status: "pending",
      requestDate: new Date(),
    });

    // Notify admin
    const User = require("../models/User");
    const Notification = require("../models/Notification");
    const admins = await User.find({ role: "admin" }).select("_id");
    for (const admin of admins) {
      await Notification.create({
        user: admin._id,
        type: "payment",
        title: "🏆 New Promotion Payment",
        message: `${req.user.name} submitted payment for ${planType} promotion (₹${priceMap[planType]})`,
      });
    }

    res.status(201).json({ success: true, data: request });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// CREATOR: Get my promotion requests
// ═══════════════════════════════════════════════════════════════
router.get("/my-requests", protect, authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });
    const requests = await PromotionRequest.find({ creator: creator._id }).sort("-createdAt");
    res.json({ success: true, data: requests });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN: Get all promotion requests
// ═══════════════════════════════════════════════════════════════
router.get("/admin/all", protect, authorize("admin"), async (req, res, next) => {
  try {
    const requests = await PromotionRequest.find().populate({ path: "creator", populate: { path: "user", select: "name email" } }).sort("-createdAt");
    res.json({ success: true, data: requests });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN: Approve promotion request
// ═══════════════════════════════════════════════════════════════
router.patch("/admin/:id/approve", protect, authorize("admin"), async (req, res, next) => {
  try {
    const promo = await PromotionRequest.findById(req.params.id);
    if (!promo) return res.status(404).json({ success: false, message: "Request not found" });

    const now = new Date();
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + 30); // 30-day promotion

    promo.status = "approved";
    promo.startDate = now;
    promo.expiryDate = expiry;
    await promo.save();

    // Apply promotion to creator
    const creator = await Creator.findById(promo.creator);
    if (creator) {
      if (promo.planType === "homepage_featured") {
        creator.featured = true;
        creator.featuredStartDate = now;
        creator.featuredEndDate = expiry;
      } else if (promo.planType.startsWith("rank_")) {
        const rankNum = parseInt(promo.planType.split("_")[1], 10);
        creator.rank = rankNum;
      }
      await creator.save();
    }

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "approve_promotion",
      target: "promotion_request",
      targetId: promo._id.toString(),
      previousValues: { status: "pending" },
      newValues: { status: "approved", planType: promo.planType, expiryDate: expiry },
      ip: req.ip,
    });

    res.json({ success: true, data: promo });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN: Reject promotion request
// ═══════════════════════════════════════════════════════════════
router.patch("/admin/:id/reject", protect, authorize("admin"), async (req, res, next) => {
  try {
    const promo = await PromotionRequest.findById(req.params.id);
    if (!promo) return res.status(404).json({ success: false, message: "Request not found" });

    promo.status = "rejected";
    promo.adminNote = req.body.reason || "";
    await promo.save();

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "reject_promotion",
      target: "promotion_request",
      targetId: promo._id.toString(),
      previousValues: { status: "pending" },
      newValues: { status: "rejected" },
      ip: req.ip,
    });

    res.json({ success: true, data: promo });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN: Force expire a promotion
// ═══════════════════════════════════════════════════════════════
router.patch("/admin/:id/expire", protect, authorize("admin"), async (req, res, next) => {
  try {
    const promo = await PromotionRequest.findById(req.params.id);
    if (!promo) return res.status(404).json({ success: false, message: "Request not found" });

    promo.status = "expired";
    promo.expiryDate = new Date();
    await promo.save();

    // Remove rank from creator
    const creator = await Creator.findById(promo.creator);
    if (creator) {
      if (promo.planType === "homepage_featured") {
        creator.featured = false;
      } else if (promo.planType.startsWith("rank_")) {
        const rankNum = parseInt(promo.planType.split("_")[1], 10);
        if (creator.rank === rankNum) creator.rank = 0;
      }
      await creator.save();
    }

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "expire_promotion",
      target: "promotion_request",
      targetId: promo._id.toString(),
      previousValues: { status: "approved" },
      newValues: { status: "expired" },
      ip: req.ip,
    });

    res.json({ success: true, data: promo });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN: Extend promotion by 30 days
// ═══════════════════════════════════════════════════════════════
router.patch("/admin/:id/extend", protect, authorize("admin"), async (req, res, next) => {
  try {
    const promo = await PromotionRequest.findById(req.params.id);
    if (!promo) return res.status(404).json({ success: false, message: "Request not found" });

    const days = parseInt(req.body.days, 10) || 30;
    const currentExpiry = promo.expiryDate ? new Date(promo.expiryDate) : new Date();
    currentExpiry.setDate(currentExpiry.getDate() + days);
    promo.expiryDate = currentExpiry;
    if (promo.status === "expired") promo.status = "approved";
    await promo.save();

    // Re-apply rank if it was expired
    const creator = await Creator.findById(promo.creator);
    if (creator && promo.planType.startsWith("rank_")) {
      const rankNum = parseInt(promo.planType.split("_")[1], 10);
      creator.rank = rankNum;
      await creator.save();
    } else if (creator && promo.planType === "homepage_featured") {
      creator.featured = true;
      creator.featuredEndDate = currentExpiry;
      await creator.save();
    }

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "extend_promotion",
      target: "promotion_request",
      targetId: promo._id.toString(),
      previousValues: null,
      newValues: { expiryDate: currentExpiry, days },
      ip: req.ip,
    });

    res.json({ success: true, data: promo });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
