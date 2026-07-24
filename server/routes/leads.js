const express = require("express");
const LeadSettings = require("../models/LeadSettings");
const LeadUnlock = require("../models/LeadUnlock");
const Creator = require("../models/Creator");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// ═══ PUBLIC: Get lead/subscription settings ═══
router.get("/settings", async (req, res, next) => {
  try {
    const settings = await LeadSettings.getSettings();
    res.json({ success: true, data: settings });
  } catch (e) { next(e); }
});

// ═══ CREATOR: Get my lead usage ═══
router.get("/my-usage", protect, authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id }).select("_id subscriptionStatus subscriptionEndDate subscriptionExpiry freeLeadsUsed freeLeadsLimit").lean();
    if (!creator) return res.status(404).json({ success: false, message: "Creator profile not found" });

    const settings = await LeadSettings.getSettings();

    // Use creator.freeLeadsUsed (set by accept inquiry logic) as primary source
    const freeUsed = creator.freeLeadsUsed || 0;
    const freeLimit = creator.freeLeadsLimit || settings.freeLeadLimit || 3;

    const isSubscribed = (creator.subscriptionStatus === "active" || creator.subscriptionStatus === "trial") && 
      (creator.subscriptionEndDate || creator.subscriptionExpiry) && 
      new Date(creator.subscriptionEndDate || creator.subscriptionExpiry) > new Date();
    const freeRemaining = Math.max(0, freeLimit - freeUsed);
    const canUnlock = isSubscribed || freeRemaining > 0;

    res.json({
      success: true,
      data: {
        freeLeadLimit: freeLimit,
        freeUsed,
        freeRemaining,
        totalUnlocked: freeUsed,
        isSubscribed,
        subscriptionExpiry: creator.subscriptionEndDate || creator.subscriptionExpiry,
        canUnlock,
        leadCountMode: settings.leadCountMode || 'booking',
        enableLeadLimit: settings.enableLeadLimit !== false,
        showLeadDashboardCard: settings.showLeadDashboardCard !== false,
        monthlyPrice: settings.monthlyPrice,
        yearlyPrice: settings.yearlyPrice,
        benefits: settings.benefits,
        freePlanBenefits: settings.freePlanBenefits,
      },
    });
  } catch (e) { next(e); }
});

// ═══ CREATOR: Unlock a lead ═══
router.post("/unlock", protect, authorize("creator"), async (req, res, next) => {
  try {
    const { customerId, bookingId } = req.body;
    if (!customerId) return res.status(400).json({ success: false, message: "customerId is required" });

    const creator = await Creator.findOne({ user: req.user._id }).lean();
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    // Check if already unlocked
    const existing = await LeadUnlock.findOne({ creator: creator._id, customer: customerId });
    if (existing) return res.json({ success: true, data: existing, message: "Already unlocked" });

    // Check quota
    const settings = await LeadSettings.getSettings();
    const freeUsed = await LeadUnlock.countDocuments({ creator: creator._id, isFree: true });
    const isSubscribed = creator.subscriptionStatus === "active" && creator.subscriptionExpiry && new Date(creator.subscriptionExpiry) > new Date();

    if (!isSubscribed && freeUsed >= settings.freeLeadLimit) {
      return res.status(403).json({
        success: false,
        message: "Free lead limit reached. Subscribe to unlock unlimited leads.",
        code: "LEAD_LIMIT_REACHED",
        freeUsed,
        freeLeadLimit: settings.freeLeadLimit,
      });
    }

    // Unlock the lead
    const unlock = await LeadUnlock.create({
      creator: creator._id,
      customer: customerId,
      booking: bookingId || null,
      isFree: !isSubscribed,
    });

    res.status(201).json({ success: true, data: unlock });
  } catch (e) {
    if (e.code === 11000) return res.json({ success: true, message: "Already unlocked" });
    next(e);
  }
});

// ═══ CREATOR: Check if a specific lead is unlocked ═══
router.get("/check/:customerId", protect, authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id }).select("_id").lean();
    if (!creator) return res.status(404).json({ success: false });
    const unlocked = await LeadUnlock.findOne({ creator: creator._id, customer: req.params.customerId });
    res.json({ success: true, unlocked: !!unlocked });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Get/Update lead settings ═══
router.get("/admin/settings", protect, authorize("admin"), async (req, res, next) => {
  try { res.json({ success: true, data: await LeadSettings.getSettings() }); } catch (e) { next(e); }
});

router.put("/admin/settings", protect, authorize("admin"), async (req, res, next) => {
  try {
    const settings = await LeadSettings.updateSettings(req.body);
    res.json({ success: true, data: settings });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Lead unlock stats ═══
router.get("/admin/stats", protect, authorize("admin"), async (req, res, next) => {
  try {
    const [total, free, paid] = await Promise.all([
      LeadUnlock.countDocuments(),
      LeadUnlock.countDocuments({ isFree: true }),
      LeadUnlock.countDocuments({ isFree: false }),
    ]);
    res.json({ success: true, data: { total, free, paid } });
  } catch (e) { next(e); }
});

module.exports = router;
