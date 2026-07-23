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
    const creator = await Creator.findOne({ user: req.user._id }).select("_id subscriptionStatus subscriptionEndDate subscriptionExpiry freeLeadsUsed freeLeadsLimit assignedMode quotaCompleted unlockedLeads").lean();
    if (!creator) return res.status(404).json({ success: false, message: "Creator profile not found" });

    const settings = await LeadSettings.getSettings();

    const freeUsed = creator.freeLeadsUsed || 0;
    const freeLimit = creator.freeLeadsLimit || settings.freeLeadLimit || 3;
    const isSubscribed = (creator.subscriptionStatus === "active" || creator.subscriptionStatus === "trial") && 
      (creator.subscriptionEndDate || creator.subscriptionExpiry) && 
      new Date(creator.subscriptionEndDate || creator.subscriptionExpiry) > new Date();
    const freeRemaining = Math.max(0, freeLimit - freeUsed);
    const quotaCompleted = creator.quotaCompleted || freeRemaining <= 0;
    const canAccess = isSubscribed || !quotaCompleted;

    // Determine active mode for this creator
    const activeMode = creator.assignedMode || settings.leadCountMode || 'booking';

    res.json({
      success: true,
      data: {
        // Creator's status
        freeLeadLimit: freeLimit,
        freeUsed,
        freeRemaining,
        isSubscribed,
        canAccess,
        quotaCompleted,
        unlockedCount: (creator.unlockedLeads || []).length,
        // Admin-configured settings
        activeMode,
        leadCountMode: settings.leadCountMode || 'booking',
        leadUnlockPrice: settings.leadUnlockPrice || 70,
        monthlyPrice: settings.monthlyPrice || 199,
        yearlyPrice: settings.yearlyPrice || 1999,
        enableLeadLimit: settings.enableLeadLimit !== false,
        enablePerLeadPurchase: settings.enablePerLeadPurchase !== false,
        enableSubscription: settings.enableSubscription !== false,
        showLeadDashboardCard: settings.showLeadDashboardCard !== false,
        benefits: settings.benefits || [],
        freePlanBenefits: settings.freePlanBenefits || [],
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

// ═══ CREATOR: Create Razorpay order for per-lead unlock ═══
router.post("/unlock-order", protect, authorize("creator"), async (req, res, next) => {
  try {
    const { inquiryId } = req.body;
    if (!inquiryId) return res.status(400).json({ success: false, message: "inquiryId required" });

    const settings = await LeadSettings.getSettings();
    const price = settings.leadUnlockPrice || 70;

    const Razorpay = require("razorpay");
    const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

    const order = await razorpay.orders.create({
      amount: price * 100,
      currency: "INR",
      receipt: `lead_${inquiryId}`,
      notes: { inquiryId, creatorUserId: String(req.user._id), type: "lead_unlock" },
    });

    res.json({ success: true, data: { orderId: order.id, amount: price, keyId: process.env.RAZORPAY_KEY_ID } });
  } catch (e) { next(e); }
});

// ═══ CREATOR: Verify lead unlock payment and unlock ═══
router.post("/unlock-verify", protect, authorize("creator"), async (req, res, next) => {
  try {
    const { inquiryId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    if (!inquiryId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment data" });
    }

    // Verify signature
    const crypto = require("crypto");
    const generated = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    if (generated !== razorpay_signature) return res.status(400).json({ success: false, message: "Payment verification failed" });

    // Unlock the lead for this creator
    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    if (!creator.unlockedLeads) creator.unlockedLeads = [];
    if (!creator.unlockedLeads.includes(inquiryId)) {
      creator.unlockedLeads.push(inquiryId);
      await creator.save();
    }

    res.json({ success: true, message: "Lead unlocked successfully!" });
  } catch (e) { next(e); }
});

module.exports = router;
