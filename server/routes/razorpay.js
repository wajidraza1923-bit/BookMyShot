const express = require("express");
const razorpayService = require("../services/razorpayService");
const configService = require("../services/configService");
const Creator = require("../models/Creator");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Invoice = require("../models/Invoice");
const Commission = require("../models/Commission");
const { protect, authorize } = require("../middleware/auth");
const emailService = require("../services/emailService");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// PUBLIC: Get Razorpay key for frontend
// ═══════════════════════════════════════════════════════════════
router.get("/config", (req, res) => {
  res.json({
    success: true,
    keyId: process.env.RAZORPAY_KEY_ID || "",
    configured: razorpayService.isConfigured(),
  });
});

// ═══════════════════════════════════════════════════════════════
// CREATOR: Create Razorpay Subscription (AutoPay — TRUE recurring)
// This is the ONLY endpoint for creator subscriptions.
// Uses Razorpay Subscriptions API (not Orders API).
// Creator authorizes AutoPay once, then gets charged automatically.
// ═══════════════════════════════════════════════════════════════
// CREATOR: Get AutoPay status — ALWAYS checks LIVE Razorpay API
// Single source of truth for subscription/autopay status
// ═══════════════════════════════════════════════════════════════
router.get("/autopay-status", protect, authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    const now = new Date();
    const subscriptionEndDate = creator.subscriptionEndDate;
    const daysRemaining = subscriptionEndDate ? Math.max(0, Math.ceil((subscriptionEndDate - now) / 86400000)) : 0;
    const subscriptionActive = creator.subscriptionStatus === "active" || creator.subscriptionStatus === "trial";

    // Default response
    const result = {
      autopayActive: false,
      razorpayStatus: "none",
      razorpaySubscriptionId: creator.razorpaySubscriptionId || null,
      subscriptionStatus: creator.subscriptionStatus,
      subscriptionEndDate: creator.subscriptionEndDate,
      subscriptionStartDate: creator.subscriptionStartDate,
      nextBillingDate: creator.nextBillingDate,
      lastPaymentDate: creator.lastPaymentDate,
      autoRenew: creator.autoRenew !== false,
      daysRemaining,
      subscriptionActive,
      message: "",
    };

    // If we have a Razorpay subscription ID, check its REAL status from Razorpay API
    if (creator.razorpaySubscriptionId && razorpayService.isConfigured()) {
      try {
        const rpSub = await razorpayService.fetchSubscription(creator.razorpaySubscriptionId);
        result.razorpayStatus = rpSub.status; // active, authenticated, pending, halted, cancelled, completed, paused
        result.autopayActive = rpSub.status === "active" || rpSub.status === "authenticated";
        result.currentStart = rpSub.current_start ? new Date(rpSub.current_start * 1000) : null;
        result.currentEnd = rpSub.current_end ? new Date(rpSub.current_end * 1000) : null;
        result.chargeAt = rpSub.charge_at ? new Date(rpSub.charge_at * 1000) : null;

        // Sync autoRenew with real Razorpay status (live truth)
        const rpAutoPayOn = rpSub.status === "active" || rpSub.status === "authenticated";
        if (creator.autoRenew !== rpAutoPayOn) {
          // DB is stale — update silently
          creator.autoRenew = rpAutoPayOn;
          await creator.save();
          result.autoRenew = rpAutoPayOn;
        }

        // Build user-friendly message
        if (result.autopayActive) {
          result.message = "AutoPay is active. Your subscription renews automatically each month.";
        } else if (rpSub.status === "cancelled" || rpSub.status === "completed") {
          if (subscriptionActive && daysRemaining > 0) {
            result.message = `AutoPay is OFF. Your subscription remains active until ${subscriptionEndDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}. Auto-renewal has been turned off. You can enable AutoPay again anytime.`;
          } else {
            result.message = "Subscription has ended. Subscribe again to restore your profile.";
          }
        } else if (rpSub.status === "halted") {
          result.message = "AutoPay is suspended due to payment failures. Please set up AutoPay again.";
        } else if (rpSub.status === "paused") {
          result.message = "AutoPay is paused. Your subscription will not renew until resumed.";
        } else {
          result.message = `AutoPay status: ${rpSub.status}. Contact support if this seems incorrect.`;
        }
      } catch (rpErr) {
        console.log("[AutoPay] Razorpay fetch failed:", rpErr.message);
        result.razorpayStatus = "error";
        result.autopayActive = false;
        result.message = "Unable to verify AutoPay status with Razorpay. Showing last known status.";
      }
    } else if (!creator.razorpaySubscriptionId) {
      result.message = "No AutoPay subscription linked. Set up AutoPay to enable automatic renewal.";
    }

    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

router.post("/create-subscription", protect, authorize("creator"), async (req, res, next) => {
  try {
    if (!razorpayService.isConfigured()) {
      return res.status(503).json({ success: false, message: "Payment gateway not configured" });
    }

    const subSettings = await configService.getSubscriptionSettings();
    const amount = subSettings.monthlyPlanPrice || 99;
    const trialDays = subSettings.trialDays || 0;

    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    // If creator already has an active Razorpay subscription, check if AutoPay is truly active
    if (creator.razorpaySubscriptionId && creator.subscriptionStatus === "active") {
      // Verify with Razorpay if the subscription is ACTUALLY active (not cancelled)
      let rpAutoPayActive = false;
      try {
        if (razorpayService.isConfigured()) {
          const rpSub = await razorpayService.fetchSubscription(creator.razorpaySubscriptionId);
          rpAutoPayActive = rpSub.status === "active" || rpSub.status === "authenticated";
        }
      } catch (e) { /* Razorpay check failed — allow creating new */ }

      if (rpAutoPayActive) {
        // AutoPay is genuinely active in Razorpay — don't create duplicate
        return res.json({
          success: true,
          message: "Subscription already active",
          subscriptionId: creator.razorpaySubscriptionId,
          status: "active",
          autopayActive: true,
        });
      }
      // AutoPay was cancelled/halted in Razorpay — allow creating new subscription for re-enabling
      console.log("[Razorpay] Existing subscription cancelled in Razorpay — creating new one for AutoPay re-enable");
    }

    // Step 1: Always create a fresh Razorpay Plan with LATEST admin-configured price
    // This ensures renewals after expiry always use the current price
    const isRenewal = creator.subscriptionStatus === "expired" || creator.subscriptionStatus === "suspended" || creator.subscriptionStatus === "overdue";
    const applyTrial = !isRenewal && !creator.subscriptionStartDate; // Trial only for first-time subscribers

    console.log("[Razorpay] Creating new monthly plan: ₹" + amount + (isRenewal ? " (RENEWAL)" : " (NEW)"));
    const plan = await razorpayService.createPlan("BookMyShot Creator Monthly ₹" + amount, amount, "monthly", 1);
    const planId = plan.id;
    console.log("[Razorpay] Plan created:", planId);

    // Step 2: Create Razorpay Subscription
    const effectiveTrialDays = applyTrial ? trialDays : 0;
    console.log("[Razorpay] Creating subscription. Plan:", planId, "Trial:", effectiveTrialDays, "days");
    const subscription = await razorpayService.createSubscription(planId, 60, effectiveTrialDays, {
      creatorId: creator._id.toString(),
      userId: req.user._id.toString(),
      creatorEmail: req.user.email || "",
    });

    // Step 3: Save subscription ID on creator
    creator.razorpaySubscriptionId = subscription.id;
    creator.razorpayPlanId = planId;
    creator.subscriptionPlanPrice = amount; // Lock the price this creator subscribed at
    if (effectiveTrialDays > 0) {
      creator.subscriptionStatus = "trial";
      creator.subscriptionStartDate = new Date();
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + effectiveTrialDays);
      creator.subscriptionEndDate = trialEnd;
      creator.nextBillingDate = trialEnd;
    }
    await creator.save();

    console.log("[Razorpay] Subscription created:", subscription.id, "for creator:", creator._id);

    res.json({
      success: true,
      subscriptionId: subscription.id,
      subscription,
      keyId: process.env.RAZORPAY_KEY_ID,
      amount,
      trialDays,
    });
  } catch (e) {
    console.error("[Razorpay] create-subscription error:", e.message || JSON.stringify(e));
    res.status(500).json({ success: false, message: e.message || "Subscription creation failed", error: e.error || e });
  }
});

// ═══════════════════════════════════════════════════════════════
// CREATOR: Verify subscription after AutoPay authorization
// Called after Razorpay Checkout closes with subscription auth
// ═══════════════════════════════════════════════════════════════
router.post("/verify-subscription", protect, async (req, res, next) => {
  try {
    const { razorpay_subscription_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_subscription_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing subscription verification data" });
    }

    // Verify signature: payment_id|subscription_id
    const isValid = razorpayService.verifySubscriptionSignature(razorpay_subscription_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      return res.status(400).json({ success: false, message: "Subscription verification failed — invalid signature" });
    }

    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    const subSettings = await configService.getSubscriptionSettings();
    const amount = subSettings.monthlyPlanPrice || 99;
    const trialDays = subSettings.trialDays || 0;
    const now = new Date();

    // Update creator subscription status
    creator.subscriptionStatus = trialDays > 0 ? "trial" : "active";
    creator.razorpaySubscriptionId = razorpay_subscription_id;
    creator.razorpayCustomerId = razorpay_payment_id;
    if (!creator.subscriptionStartDate) creator.subscriptionStartDate = now;
    
    // AUTO-UNSUSPEND LOGIC:
    // If commission is overdue >30 days, subscription alone does NOT reactivate.
    // Only reactivate if no critical overdue commission exists.
    if (creator.status === "suspended" || creator.status === "pending") {
      const thirtyDaysAgo = new Date(now - 30 * 86400000);
      const criticalComm = await Commission.countDocuments({
        creator: creator._id,
        status: { $in: ["pending", "overdue"] },
        dueDate: { $lte: thirtyDaysAgo },
      });
      if (criticalComm === 0) {
        creator.status = "approved";
      }
      // If critical commission exists, account stays suspended — they must pay commission first
    }
    
    // Set end date based on trial
    const endDate = new Date(now);
    if (trialDays > 0) {
      endDate.setDate(endDate.getDate() + trialDays);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }
    creator.subscriptionEndDate = endDate;
    creator.nextBillingDate = endDate;
    creator.lastPaymentDate = now;
    await creator.save();

    // Create invoice (for the auth payment or first charge)
    await Invoice.create({
      creator: creator._id,
      invoiceNumber: "BMS-SUB-" + Date.now(),
      type: "subscription",
      description: trialDays > 0 ? `Subscription Activated (${trialDays}-day trial)` : "Monthly Subscription (First Payment)",
      amount: trialDays > 0 ? 0 : amount,
      status: "paid",
      paidAt: now,
      dueDate: endDate,
    });

    // In-app notification
    await Notification.create({
      user: req.user._id,
      type: "payment",
      title: "✅ Subscription Activated",
      message: trialDays > 0 
        ? `Your ${trialDays}-day free trial has started! AutoPay will charge ₹${amount}/month after trial.`
        : "Your subscription is active. AutoPay will renew automatically every month.",
    });

    // ══ EMAIL: Creator — Subscription Activated ══
    emailService.sendSubscriptionActivated({
      email: req.user.email,
      name: req.user.name,
      planName: "Monthly Subscription (AutoPay)",
      amount: trialDays > 0 ? 0 : amount,
      endDate,
      paymentId: razorpay_payment_id,
      creatorId: creator._id,
      userId: req.user._id,
    }).catch(e => console.error("[Email] sendSubscriptionActivated failed:", e.message));

    // ══ EMAIL: Admin — New Subscription ══
    emailService.sendAdminNewSubscription({
      creatorName: req.user.name,
      creatorEmail: req.user.email,
      amount: trialDays > 0 ? 0 : amount,
      paymentId: razorpay_payment_id,
    }).catch(e => console.error("[Email] sendAdminNewSubscription failed:", e.message));

    // Real-time Socket.IO update — UI refreshes instantly
    try {
      const socketService = require("../services/socketService");
      socketService.emitToUser(req.user._id, "subscription:updated", {
        subscriptionStatus: creator.subscriptionStatus,
        autoRenew: true,
        autopayActive: true,
        razorpayStatus: "active",
        subscriptionEndDate: endDate,
        lastPaymentDate: now,
      });
      socketService.emitToRole("admin", "subscription:updated", {
        creatorId: creator._id,
        subscriptionStatus: creator.subscriptionStatus,
        autoRenew: true,
      });
    } catch (e) {}

    res.json({ 
      success: true, 
      message: trialDays > 0 ? `Trial started! ${trialDays} free days.` : "Subscription activated!",
      subscriptionId: razorpay_subscription_id,
    });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// CREATOR: Get subscription status
// ═══════════════════════════════════════════════════════════════
router.get("/subscription-status", protect, authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    let razorpayStatus = null;
    if (creator.razorpaySubscriptionId && razorpayService.isConfigured()) {
      try {
        razorpayStatus = await razorpayService.fetchSubscription(creator.razorpaySubscriptionId);
      } catch (e) {
        console.error("[Razorpay] Failed to fetch subscription:", e.message);
      }
    }

    res.json({
      success: true,
      subscription: {
        status: creator.subscriptionStatus,
        startDate: creator.subscriptionStartDate,
        endDate: creator.subscriptionEndDate,
        nextBillingDate: creator.nextBillingDate,
        razorpaySubscriptionId: creator.razorpaySubscriptionId,
        razorpayStatus: razorpayStatus ? razorpayStatus.status : null,
        autoRenew: creator.autoRenew,
        paymentFailCount: creator.paymentFailCount,
      },
    });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// CREATOR: Cancel AutoPay (turn OFF auto-renewal)
// IMPORTANT: This does NOT cancel the current subscription period!
// The creator keeps all premium features until subscriptionEndDate.
// Only future renewals are disabled.
// ═══════════════════════════════════════════════════════════════
router.post("/cancel-subscription", protect, authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator || !creator.razorpaySubscriptionId) {
      return res.status(400).json({ success: false, message: "No active subscription found" });
    }

    // Cancel at end of current billing period (NOT immediately)
    // Razorpay cancel_at_cycle_end=true means the subscription runs until current period ends
    await razorpayService.cancelSubscription(creator.razorpaySubscriptionId, true);
    
    // Mark autoRenew as false — but keep subscriptionStatus as "active"
    // The subscription remains active until subscriptionEndDate
    creator.autoRenew = false;
    // DO NOT change subscriptionStatus here — creator keeps premium access
    await creator.save();

    const daysLeft = creator.subscriptionEndDate ? Math.ceil((creator.subscriptionEndDate - new Date()) / 86400000) : 0;
    const expiryDateStr = creator.subscriptionEndDate 
      ? creator.subscriptionEndDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "unknown";

    // Notification — clearly state subscription stays active
    await Notification.create({
      user: req.user._id,
      type: "subscription",
      title: "⏹️ AutoPay Turned Off",
      message: `Auto-renewal has been disabled. Your subscription remains active until ${expiryDateStr} (${daysLeft} day${daysLeft > 1 ? "s" : ""} remaining). You can enable AutoPay again anytime before expiry.`,
    });

    // Email
    if (req.user.email) {
      emailService.sendSubscriptionExpiryReminder({ 
        email: req.user.email, 
        name: req.user.name, 
        daysLeft, 
        endDate: creator.subscriptionEndDate, 
        creatorId: creator._id, 
        userId: req.user._id 
      }).catch(() => {});
    }

    // Real-time Socket.IO update
    try {
      const socketService = require("../services/socketService");
      socketService.emitToUser(req.user._id, "subscription:updated", {
        subscriptionStatus: creator.subscriptionStatus,
        autoRenew: false,
        autopayActive: false,
        razorpayStatus: "cancelled",
        subscriptionEndDate: creator.subscriptionEndDate,
        daysRemaining: daysLeft,
        message: `Your subscription will remain active until ${expiryDateStr}. Auto-renewal has been turned off.`,
      });
      socketService.emitToRole("admin", "subscription:updated", {
        creatorId: creator._id,
        autoRenew: false,
        subscriptionStatus: creator.subscriptionStatus,
      });
    } catch (e) {}

    res.json({ 
      success: true, 
      message: `AutoPay has been turned off. Your subscription remains active until ${expiryDateStr}. You can enable AutoPay again anytime.`,
      subscriptionStatus: creator.subscriptionStatus,
      subscriptionEndDate: creator.subscriptionEndDate,
      autoRenew: false,
      daysRemaining: daysLeft,
    });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// CREATOR: Create order for promotion/featured payment (one-time)
// Promotions remain as one-time payments (not subscriptions)
// ═══════════════════════════════════════════════════════════════
router.post("/create-promotion-order", protect, authorize("creator"), async (req, res, next) => {
  try {
    if (!razorpayService.isConfigured()) {
      return res.status(503).json({ success: false, message: "Payment gateway not configured" });
    }

    const { planType, amount } = req.body;
    if (!planType || !amount) return res.status(400).json({ success: false, message: "Plan type and amount required" });

    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    const order = await razorpayService.createOrder(amount, "INR", `promo_${Date.now()}`, {
      creatorId: creator._id.toString(),
      userId: req.user._id.toString(),
      type: "promotion",
      planType,
    });

    res.json({ success: true, order, amount, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// CREATOR: Create order for commission payment (one-time)
// ═══════════════════════════════════════════════════════════════
router.post("/create-commission-order", protect, authorize("creator"), async (req, res, next) => {
  try {
    if (!razorpayService.isConfigured()) {
      return res.status(503).json({ success: false, message: "Payment gateway not configured" });
    }

    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: "Amount required" });

    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    try {
      const order = await razorpayService.createOrder(amount, "INR", `comm_${Date.now()}`, {
        creatorId: creator._id.toString(),
        userId: req.user._id.toString(),
        type: "commission",
      });
      res.json({ success: true, order, amount, keyId: process.env.RAZORPAY_KEY_ID });
    } catch (rpError) {
      console.error("[Razorpay] Commission order creation failed:", rpError.message || rpError);
      return res.status(500).json({ success: false, message: "Failed to create payment order: " + (rpError.message || "Razorpay API error") });
    }
  } catch (e) {
    console.error("[Razorpay] create-commission-order error:", e.message);
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// VERIFY: Verify commission payment
// ═══════════════════════════════════════════════════════════════
router.post("/verify-commission-payment", protect, async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment verification data" });
    }

    const isValid = razorpayService.verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    const paidAmount = Number(amount) || 0;

    // Update creator.commissionPaid
    await Creator.updateOne({ _id: creator._id }, { $inc: { commissionPaid: paidAmount } });

    // Mark pending commissions as paid (oldest first)
    let remaining = paidAmount;
    const pendingComms = await Commission.find({ creator: creator._id, status: { $in: ["pending", "overdue"] } }).sort({ createdAt: 1 });
    for (const comm of pendingComms) {
      if (remaining <= 0) break;
      if (remaining >= comm.commissionAmount) {
        comm.status = "paid";
        comm.paidAt = new Date();
        comm.notes = `Razorpay: ${razorpay_payment_id}`;
        remaining -= comm.commissionAmount;
      }
      await comm.save();
    }

    // If creator was suspended due to unpaid commission, reactivate
    if (creator.subscriptionStatus === "suspended") {
      await Creator.updateOne({ _id: creator._id }, { $set: { subscriptionStatus: "active" } });
    }

    // Create invoice record
    await Invoice.create({
      creator: creator._id,
      invoiceNumber: "BMS-COMM-" + Date.now(),
      type: "commission",
      description: "Commission Payment (Razorpay)",
      amount: paidAmount,
      status: "paid",
      paidAt: new Date(),
      notes: razorpay_payment_id,
    });

    // Notification
    await Notification.create({
      user: req.user._id,
      type: "payment",
      title: "✅ Commission Paid",
      message: `Your commission payment of ₹${paidAmount} has been received. Thank you!`,
    });

    // Real-time: notify admin dashboard
    try {
      const socketService = require("../services/socketService");
      socketService.emitToRole("admin", "commission:new", { creatorId: creator._id, amount: paidAmount, status: "paid" });
      socketService.emitToRole("admin", "dashboard:refresh", { type: "commission" });
    } catch (e) {}

    // Email
    emailService.sendPaymentReceipt({
      email: req.user.email,
      name: req.user.name,
      amount: paidAmount,
      paymentId: razorpay_payment_id,
      description: "Commission Payment",
      date: new Date(),
      creatorId: creator._id,
      userId: req.user._id,
    }).catch(e => console.error("[Email] commission receipt:", e.message));

    res.json({ success: true, message: "Commission payment verified", paymentId: razorpay_payment_id, amountPaid: paidAmount });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// VERIFY: Verify one-time payment (promotions only)
// ═══════════════════════════════════════════════════════════════
router.post("/verify-payment", protect, async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, type, planType } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment verification data" });
    }

    const isValid = razorpayService.verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      return res.status(400).json({ success: false, message: "Payment verification failed — invalid signature" });
    }

    const creator = await Creator.findOne({ user: req.user._id });

    // Handle promotion payment (one-time)
    if (type === "promotion" && planType && creator) {
      const PromotionRequest = require("../models/PromotionRequest");

      const now = new Date();
      const expiry = new Date(now);
      expiry.setDate(expiry.getDate() + 30);

      await PromotionRequest.create({
        creator: creator._id,
        creatorName: req.user.name || "",
        planType,
        price: req.body.amount || 0,
        screenshot: "razorpay:" + razorpay_payment_id,
        utr: razorpay_payment_id,
        status: "approved",
        startDate: now,
        expiryDate: expiry,
      });

      // Use findByIdAndUpdate to avoid pre-save hook (E11000 fix)
      if (planType.startsWith("featured_") || planType === "homepage_featured") {
        await Creator.findByIdAndUpdate(creator._id, {
          $set: { featured: true, featuredStartDate: now, featuredEndDate: expiry, featuredPaymentStatus: "paid" }
        });
      } else if (planType.startsWith("rank_")) {
        await Creator.findByIdAndUpdate(creator._id, {
          $set: { rank: parseInt(planType.split("_")[1], 10) }
        });
      }

      await Notification.create({
        user: req.user._id,
        type: "payment",
        title: "🏆 Promotion Activated",
        message: `Your ${planType} promotion is now active for 30 days!`,
      });

      // ══ EMAIL: Creator — Promotion Activated ══
      emailService.sendPromotionActivated({
        email: req.user.email,
        name: req.user.name,
        planType,
        amount: req.body.amount || 0,
        expiryDate: expiry,
        paymentId: razorpay_payment_id,
        creatorId: creator._id,
        userId: req.user._id,
      }).catch(e => console.error("[Email] sendPromotionActivated failed:", e.message));

      emailService.sendPaymentReceipt({
        email: req.user.email,
        name: req.user.name,
        amount: req.body.amount || 0,
        paymentId: razorpay_payment_id,
        description: `Promotion: ${planType}`,
        date: now,
        creatorId: creator._id,
        userId: req.user._id,
      }).catch(e => console.error("[Email] sendPaymentReceipt (promo) failed:", e.message));

      // ══ EMAIL: Admin — Promotion Purchase ══
      emailService.sendAdminPromotionPurchase({
        creatorName: req.user.name,
        creatorEmail: req.user.email,
        planType,
        amount: req.body.amount || 0,
        paymentId: razorpay_payment_id,
      }).catch(e => console.error("[Email] sendAdminPromotionPurchase failed:", e.message));
    }

    res.json({ success: true, message: "Payment verified and activated", paymentId: razorpay_payment_id });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// WEBHOOK: Razorpay webhooks (no auth — verified by signature)
// Handles recurring subscription charges automatically
// ═══════════════════════════════════════════════════════════════
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    if (!razorpayService.verifyWebhookSignature(body, signature)) {
      console.error("[Razorpay Webhook] Invalid signature");
      return res.status(400).json({ success: false });
    }

    const event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const eventType = event.event;
    const payload = event.payload;

    console.log(`[Razorpay Webhook] Event: ${eventType}`);

    switch (eventType) {
      case "payment.captured": {
        console.log("[Razorpay] Payment captured:", payload.payment?.entity?.id);
        break;
      }

      case "subscription.authenticated": {
        // Creator authorized the mandate — subscription is ready
        // AUTO-APPROVE: If creator is pending, approve them immediately
        const subId = payload.subscription?.entity?.id;
        console.log("[Razorpay] Subscription authenticated:", subId);
        const creator = await Creator.findOne({ razorpaySubscriptionId: subId });
        if (creator) {
          console.log("[Razorpay] Mandate authorized for creator:", creator._id, "current status:", creator.status);
          if (creator.status === "pending") {
            creator.status = "approved";
            creator.subscriptionStatus = "active";
            if (!creator.subscriptionStartDate) creator.subscriptionStartDate = new Date();
            const end = new Date();
            end.setMonth(end.getMonth() + 1);
            creator.subscriptionEndDate = end;
            creator.nextBillingDate = end;
            creator.lastPaymentDate = new Date();
            creator.autoRenew = true;
            await creator.save();
            console.log("[Razorpay] ✅ Creator auto-approved via webhook:", creator._id);
            // Notify creator
            if (creator.user) {
              await Notification.create({
                user: creator.user,
                type: "subscription",
                title: "✅ Account Approved!",
                message: "Your subscription is active and your creator account has been approved. Welcome to BookMyShot!",
              });
              // Real-time Socket.IO
              try {
                const socketService = require("../services/socketService");
                socketService.emitToUser(creator.user, "subscription:updated", {
                  subscriptionStatus: "active",
                  autoRenew: true,
                  autopayActive: true,
                  razorpayStatus: "authenticated",
                  subscriptionEndDate: end,
                });
                socketService.emitToRole("admin", "subscription:updated", { creatorId: creator._id, subscriptionStatus: "active", autoRenew: true });
              } catch (e) {}
            }
          }
        }
        break;
      }

      case "subscription.activated": {
        const subId = payload.subscription?.entity?.id;
        const creator = await Creator.findOne({ razorpaySubscriptionId: subId }).populate("user");
        if (creator) {
          creator.subscriptionStatus = "active";
          creator.autoRenew = true;
          // AUTO-UNSUSPEND only if no critical overdue commission (>30 days)
          if (creator.status === "suspended" || creator.status === "pending") {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
            const criticalComm = await Commission.countDocuments({ creator: creator._id, status: { $in: ["pending", "overdue"] }, dueDate: { $lte: thirtyDaysAgo } });
            if (criticalComm === 0) creator.status = "approved";
          }
          if (!creator.subscriptionStartDate) creator.subscriptionStartDate = new Date();
          const end = new Date();
          end.setMonth(end.getMonth() + 1);
          creator.subscriptionEndDate = end;
          creator.nextBillingDate = end;
          await creator.save();
          console.log("[Razorpay] Subscription activated for creator:", creator._id);

          // Real-time Socket.IO
          try {
            const socketService = require("../services/socketService");
            const userId = creator.user?._id || creator.user;
            socketService.emitToUser(userId, "subscription:updated", {
              subscriptionStatus: "active",
              autoRenew: true,
              autopayActive: true,
              razorpayStatus: "active",
              subscriptionEndDate: end,
            });
            socketService.emitToRole("admin", "subscription:updated", { creatorId: creator._id, subscriptionStatus: "active", autoRenew: true });
          } catch (e) {}

          if (creator.user?.email) {
            const subSettings = await configService.getSubscriptionSettings();
            emailService.sendSubscriptionActivated({
              email: creator.user.email,
              name: creator.user.name,
              planName: "Monthly Subscription (AutoPay)",
              amount: subSettings.monthlyPlanPrice || 99,
              endDate: end,
              paymentId: subId,
              creatorId: creator._id,
              userId: creator.user._id,
            }).catch(e => console.error("[Email] webhook sub activated:", e.message));

            emailService.sendAdminNewSubscription({
              creatorName: creator.user.name,
              creatorEmail: creator.user.email,
              amount: subSettings.monthlyPlanPrice || 99,
              paymentId: subId,
            }).catch(e => console.error("[Email] admin webhook sub activated:", e.message));
          }
        }
        break;
      }

      case "subscription.charged": {
        // Recurring payment success — this fires every month
        const subId = payload.subscription?.entity?.id;
        const paymentId = payload.payment?.entity?.id || "";
        const amountPaise = payload.payment?.entity?.amount || 0;
        const amount = amountPaise / 100;
        const creator = await Creator.findOne({ razorpaySubscriptionId: subId }).populate("user");
        if (creator) {
          creator.subscriptionStatus = "active";
          creator.autoRenew = true;
          // AUTO-UNSUSPEND on recurring payment only if no critical overdue commission
          if (creator.status === "suspended") {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
            const criticalComm = await Commission.countDocuments({ creator: creator._id, status: { $in: ["pending", "overdue"] }, dueDate: { $lte: thirtyDaysAgo } });
            if (criticalComm === 0) creator.status = "approved";
          }
          creator.lastPaymentDate = new Date();
          creator.paymentFailCount = 0; // Reset fail count on success
          const end = new Date();
          end.setMonth(end.getMonth() + 1);
          creator.subscriptionEndDate = end;
          creator.nextBillingDate = end;
          await creator.save();

          // Real-time Socket.IO
          try {
            const socketService = require("../services/socketService");
            const userId = creator.user?._id || creator.user;
            socketService.emitToUser(userId, "subscription:updated", {
              subscriptionStatus: "active",
              autoRenew: true,
              autopayActive: true,
              razorpayStatus: "active",
              subscriptionEndDate: end,
              lastPaymentDate: new Date(),
            });
            socketService.emitToRole("admin", "subscription:updated", { creatorId: creator._id, subscriptionStatus: "active", autoRenew: true, charged: amount });
          } catch (e) {}

          // Create invoice for this recurring charge
          const chargedAmount = amount || (await configService.getSubscriptionSettings()).monthlyPlanPrice || 99;
          await Invoice.create({
            creator: creator._id,
            invoiceNumber: "BMS-AP-" + Date.now(),
            type: "subscription",
            description: "Monthly Subscription (AutoPay Recurring)",
            amount: chargedAmount,
            status: "paid",
            paidAt: new Date(),
            dueDate: end,
            notes: paymentId,
          });

          console.log("[Razorpay] Subscription charged ₹" + chargedAmount + " for creator:", creator._id);

          // In-app notification
          await Notification.create({
            user: creator.user._id || creator.user,
            type: "payment",
            title: "✅ Subscription Renewed",
            message: `Your monthly subscription (₹${chargedAmount}) was charged successfully. Next billing: ${end.toLocaleDateString("en-IN")}.`,
          });

          // ══ EMAILS ══
          if (creator.user?.email) {
            emailService.sendSubscriptionRenewed({
              email: creator.user.email,
              name: creator.user.name,
              amount: chargedAmount,
              endDate: end,
              paymentId,
              creatorId: creator._id,
              userId: creator.user._id,
            }).catch(e => console.error("[Email] webhook sub renewed:", e.message));

            emailService.sendPaymentReceipt({
              email: creator.user.email,
              name: creator.user.name,
              amount: chargedAmount,
              paymentId,
              description: "Monthly Subscription (AutoPay)",
              date: new Date(),
              creatorId: creator._id,
              userId: creator.user._id,
            }).catch(e => console.error("[Email] webhook payment receipt:", e.message));

            emailService.sendAdminNewSubscription({
              creatorName: creator.user.name,
              creatorEmail: creator.user.email,
              amount: chargedAmount,
              paymentId,
            }).catch(e => console.error("[Email] admin webhook renewal:", e.message));
          }
        }
        break;
      }

      case "subscription.pending": {
        // Payment is pending (e.g. mandate not debited yet)
        const subId = payload.subscription?.entity?.id;
        console.log("[Razorpay] Subscription pending:", subId);
        break;
      }

      case "subscription.halted": {
        // Multiple payment failures — subscription halted
        const subId = payload.subscription?.entity?.id;
        const creator = await Creator.findOne({ razorpaySubscriptionId: subId }).populate("user");
        if (creator) {
          creator.subscriptionStatus = "suspended";
          creator.autoRenew = false;
          await creator.save();
          console.log("[Razorpay] Subscription HALTED for creator:", creator._id);

          // Real-time Socket.IO
          try {
            const socketService = require("../services/socketService");
            const userId = creator.user?._id || creator.user;
            socketService.emitToUser(userId, "subscription:updated", {
              subscriptionStatus: "suspended",
              autoRenew: false,
              autopayActive: false,
              razorpayStatus: "halted",
            });
            socketService.emitToRole("admin", "subscription:updated", { creatorId: creator._id, subscriptionStatus: "suspended", razorpayStatus: "halted" });
          } catch (e) {}

          await Notification.create({
            user: creator.user._id || creator.user,
            type: "payment",
            title: "🚫 Subscription Suspended",
            message: "Your subscription has been suspended due to repeated payment failures. Please update your payment method.",
          });

          if (creator.user?.email) {
            emailService.sendPaymentFailed({
              email: creator.user.email,
              name: creator.user.name,
              amount: 0,
              reason: "Subscription halted — multiple payment failures",
              creatorId: creator._id,
              userId: creator.user._id,
            }).catch(e => console.error("[Email] webhook halted:", e.message));

            emailService.sendAdminPaymentFailed({
              creatorName: creator.user.name,
              creatorEmail: creator.user.email,
              amount: 0,
              reason: "Subscription HALTED — multiple failures",
            }).catch(e => console.error("[Email] admin webhook halted:", e.message));
          }
        }
        break;
      }

      case "subscription.cancelled":
      case "subscription.completed": {
        // AutoPay cancelled/completed — but subscription STAYS ACTIVE until end date
        // DO NOT expire immediately. Only mark autoRenew=false.
        // The scheduler will expire it when subscriptionEndDate passes.
        const subId = payload.subscription?.entity?.id;
        const creator = await Creator.findOne({ razorpaySubscriptionId: subId }).populate("user");
        if (creator) {
          const now = new Date();
          const daysRemaining = creator.subscriptionEndDate ? Math.max(0, Math.ceil((creator.subscriptionEndDate - now) / 86400000)) : 0;

          // Only expire if the subscription end date has already passed
          if (daysRemaining <= 0) {
            creator.subscriptionStatus = "expired";
          }
          // Always mark autoRenew false — no future charges
          creator.autoRenew = false;
          await creator.save();
          
          console.log(`[Razorpay] Subscription ${eventType} for creator: ${creator._id}. Days remaining: ${daysRemaining}. Status kept: ${creator.subscriptionStatus}`);

          // Notification
          const expiryStr = creator.subscriptionEndDate 
            ? creator.subscriptionEndDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : "N/A";
          
          if (daysRemaining > 0) {
            await Notification.create({
              user: creator.user._id || creator.user,
              type: "subscription",
              title: "⏹️ AutoPay Cancelled",
              message: `Auto-renewal is now off. Your subscription remains active until ${expiryStr} (${daysRemaining} days). Enable AutoPay again before then to continue without interruption.`,
            });
          } else {
            await Notification.create({
              user: creator.user._id || creator.user,
              type: "subscription",
              title: "⚠️ Subscription Expired",
              message: "Your subscription has expired. Profile is hidden from search. Subscribe again to restore access.",
            });
            if (creator.user?.email) {
              emailService.sendSubscriptionExpired({
                email: creator.user.email,
                name: creator.user.name,
                creatorId: creator._id,
                userId: creator.user._id,
              }).catch(e => console.error("[Email] webhook sub expired:", e.message));
            }
          }

          // Real-time Socket.IO update
          try {
            const socketService = require("../services/socketService");
            const userId = creator.user._id || creator.user;
            socketService.emitToUser(userId, "subscription:updated", {
              subscriptionStatus: creator.subscriptionStatus,
              autoRenew: false,
              autopayActive: false,
              razorpayStatus: eventType === "subscription.cancelled" ? "cancelled" : "completed",
              subscriptionEndDate: creator.subscriptionEndDate,
              daysRemaining,
            });
            socketService.emitToRole("admin", "subscription:updated", {
              creatorId: creator._id,
              autoRenew: false,
              subscriptionStatus: creator.subscriptionStatus,
              razorpayStatus: eventType.replace("subscription.", ""),
            });
          } catch (e) {}
        }
        break;
      }

      case "payment.failed": {
        const subId = payload.payment?.entity?.subscription_id;
        const amountPaise = payload.payment?.entity?.amount || 0;
        const amount = amountPaise / 100;
        const reason = payload.payment?.entity?.error_description || payload.payment?.entity?.error_reason || "";
        if (subId) {
          const creator = await Creator.findOne({ razorpaySubscriptionId: subId }).populate("user");
          if (creator) {
            creator.subscriptionStatus = "overdue";
            creator.paymentFailCount = (creator.paymentFailCount || 0) + 1;
            await creator.save();

            await Notification.create({
              user: creator.user._id || creator.user,
              type: "payment",
              title: "⚠️ Payment Failed",
              message: `Your subscription payment of ₹${amount} failed. Razorpay will retry automatically.`,
            });
            console.log("[Razorpay] Payment failed for creator:", creator._id, "Fail count:", creator.paymentFailCount);

            // Real-time Socket.IO
            try {
              const socketService = require("../services/socketService");
              const userId = creator.user?._id || creator.user;
              socketService.emitToUser(userId, "subscription:updated", {
                subscriptionStatus: "overdue",
                autoRenew: creator.autoRenew,
                razorpayStatus: "payment_failed",
                paymentFailCount: creator.paymentFailCount,
              });
              socketService.emitToRole("admin", "subscription:updated", { creatorId: creator._id, subscriptionStatus: "overdue", paymentFailCount: creator.paymentFailCount });
            } catch (e) {}

            if (creator.user?.email) {
              emailService.sendPaymentFailed({
                email: creator.user.email,
                name: creator.user.name,
                amount,
                reason,
                creatorId: creator._id,
                userId: creator.user._id,
              }).catch(e => console.error("[Email] webhook payment failed:", e.message));

              emailService.sendAdminPaymentFailed({
                creatorName: creator.user.name,
                creatorEmail: creator.user.email,
                amount,
                reason,
              }).catch(e => console.error("[Email] admin webhook payment failed:", e.message));
            }
          }
        }
        break;
      }

      case "subscription.paused": {
        // Subscription paused (rare — custom pause implementations only)
        const subId = payload.subscription?.entity?.id;
        const creator = await Creator.findOne({ razorpaySubscriptionId: subId }).populate("user");
        if (creator) {
          creator.autoRenew = false;
          await creator.save();
          console.log("[Razorpay] Subscription paused for creator:", creator._id);

          await Notification.create({
            user: creator.user._id || creator.user,
            type: "subscription",
            title: "⏸️ AutoPay Paused",
            message: "Your AutoPay has been paused. Subscription will not renew automatically. Resume or pay manually before expiry.",
          });

          // Real-time Socket.IO
          try {
            const socketService = require("../services/socketService");
            const userId = creator.user._id || creator.user;
            socketService.emitToUser(userId, "subscription:updated", {
              subscriptionStatus: creator.subscriptionStatus,
              autoRenew: false,
              autopayActive: false,
              razorpayStatus: "paused",
              subscriptionEndDate: creator.subscriptionEndDate,
            });
            socketService.emitToRole("admin", "subscription:updated", { creatorId: creator._id, autoRenew: false, razorpayStatus: "paused" });
          } catch (e) {}
        }
        break;
      }

      case "token.confirmed":
      case "mandate.revoked": {
        // UPI/bank mandate revoked — AutoPay is no longer authorized
        // This means the bank/UPI app cancelled the recurring mandate
        // IMPORTANT: Subscription stays active until end date, only autoRenew is OFF
        const tokenEntity = payload.token?.entity || payload.payment?.entity || {};
        const customerId = tokenEntity.customer_id || "";
        console.log("[Razorpay] Mandate/token revoked. Customer:", customerId);

        // Find creator by Razorpay customer ID or subscription association
        let creator = null;
        if (customerId) {
          creator = await Creator.findOne({ razorpayCustomerId: customerId }).populate("user");
        }
        if (!creator && tokenEntity.subscription_id) {
          creator = await Creator.findOne({ razorpaySubscriptionId: tokenEntity.subscription_id }).populate("user");
        }

        if (creator) {
          creator.autoRenew = false;
          // DO NOT change subscriptionStatus — premium access continues until end date
          await creator.save();
          
          const daysRemaining = creator.subscriptionEndDate ? Math.max(0, Math.ceil((creator.subscriptionEndDate - new Date()) / 86400000)) : 0;
          const expiryStr = creator.subscriptionEndDate
            ? creator.subscriptionEndDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : "N/A";
          
          console.log(`[Razorpay] Mandate revoked — AutoPay OFF for creator: ${creator._id}. Days remaining: ${daysRemaining}`);

          await Notification.create({
            user: creator.user._id || creator.user,
            type: "subscription",
            title: "🔴 AutoPay Mandate Revoked",
            message: `Your bank/UPI has revoked the AutoPay mandate. Subscription remains active until ${expiryStr}. Enable AutoPay again before expiry to avoid interruption.`,
          });

          // Real-time Socket.IO
          try {
            const socketService = require("../services/socketService");
            const userId = creator.user._id || creator.user;
            socketService.emitToUser(userId, "subscription:updated", {
              subscriptionStatus: creator.subscriptionStatus,
              autoRenew: false,
              autopayActive: false,
              razorpayStatus: "mandate_revoked",
              subscriptionEndDate: creator.subscriptionEndDate,
              daysRemaining,
              message: `AutoPay mandate revoked. Subscription active until ${expiryStr}.`,
            });
            socketService.emitToRole("admin", "subscription:updated", { creatorId: creator._id, autoRenew: false, razorpayStatus: "mandate_revoked" });
          } catch (e) {}

          if (creator.user?.email) {
            emailService.sendSubscriptionExpiryReminder({
              email: creator.user.email,
              name: creator.user.name,
              daysLeft: daysRemaining,
              endDate: creator.subscriptionEndDate,
              creatorId: creator._id,
              userId: creator.user._id,
            }).catch(e => console.error("[Email] mandate revoked reminder:", e.message));
          }
        }
        break;
      }

      default:
        console.log("[Razorpay Webhook] Unhandled event:", eventType);
    }

    res.json({ success: true });
  } catch (e) {
    console.error("[Razorpay Webhook] Error:", e.message);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
