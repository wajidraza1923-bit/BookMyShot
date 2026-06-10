const express = require("express");
const razorpayService = require("../services/razorpayService");
const configService = require("../services/configService");
const Creator = require("../models/Creator");
const Notification = require("../models/Notification");
const Invoice = require("../models/Invoice");
const { protect, authorize } = require("../middleware/auth");

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
// CREATOR: Create order for subscription payment
// ═══════════════════════════════════════════════════════════════
router.post("/create-subscription-order", protect, authorize("creator"), async (req, res, next) => {
  try {
    if (!razorpayService.isConfigured()) {
      return res.status(503).json({ success: false, message: "Payment gateway not configured" });
    }

    const subSettings = await configService.getSubscriptionSettings();
    const amount = subSettings.monthlyPlanPrice || 99;

    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    const order = await razorpayService.createOrder(amount, "INR", `sub_${Date.now()}`, {
      creatorId: creator._id.toString(),
      userId: req.user._id.toString(),
      type: "subscription",
    });

    res.json({ success: true, order, amount, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (e) {
    console.error("[Razorpay] create-subscription-order error:", e.message || JSON.stringify(e));
    res.status(500).json({ success: false, message: e.message || "Payment order creation failed", error: e.error || e });
  }
});

// ═══════════════════════════════════════════════════════════════
// CREATOR: Create order for promotion/featured payment
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
// CREATOR: Create AutoPay subscription
// ═══════════════════════════════════════════════════════════════
router.post("/create-autopay-subscription", protect, authorize("creator"), async (req, res, next) => {
  try {
    if (!razorpayService.isConfigured()) {
      return res.status(503).json({ success: false, message: "Payment gateway not configured" });
    }

    const subSettings = await configService.getSubscriptionSettings();
    const amount = subSettings.monthlyPlanPrice || 99;
    const trialDays = subSettings.trialDays || 0;

    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    // Create plan if not exists (or use existing)
    let planId = process.env.RAZORPAY_PLAN_ID;
    if (!planId) {
      const plan = await razorpayService.createPlan("BookMyShot Creator Monthly", amount, "monthly", 1);
      planId = plan.id;
    }

    const subscription = await razorpayService.createSubscription(planId, 12, trialDays, {
      creatorId: creator._id.toString(),
      userId: req.user._id.toString(),
    });

    // Save subscription ID on creator
    creator.razorpaySubscriptionId = subscription.id;
    await creator.save();

    res.json({
      success: true,
      subscriptionId: subscription.id,
      subscription,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// VERIFY: Verify payment after Razorpay checkout
// ═══════════════════════════════════════════════════════════════
router.post("/verify-payment", protect, async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, type, planType } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment verification data" });
    }

    // Server-side signature verification
    const isValid = razorpayService.verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      return res.status(400).json({ success: false, message: "Payment verification failed — invalid signature" });
    }

    const creator = await Creator.findOne({ user: req.user._id });

    // Handle subscription payment
    if (type === "subscription" && creator) {
      const now = new Date();
      const currentEnd = creator.subscriptionEndDate ? new Date(creator.subscriptionEndDate) : now;
      const baseDate = currentEnd > now ? currentEnd : now;
      const newEndDate = new Date(baseDate);
      newEndDate.setMonth(newEndDate.getMonth() + 1);

      creator.subscriptionStatus = "active";
      if (!creator.subscriptionStartDate) creator.subscriptionStartDate = now;
      creator.subscriptionEndDate = newEndDate;
      creator.lastPaymentDate = now;
      creator.razorpayCustomerId = razorpay_payment_id;
      await creator.save();

      // Create invoice
      const subSettings = await configService.getSubscriptionSettings();
      await Invoice.create({
        creator: creator._id,
        invoiceNumber: "BMS-RZP-" + Date.now(),
        type: "subscription",
        description: "Monthly Subscription (Razorpay)",
        amount: subSettings.monthlyPlanPrice || 99,
        status: "paid",
        paidAt: now,
        dueDate: newEndDate,
      });

      await Notification.create({
        user: req.user._id,
        type: "payment",
        title: "✅ Subscription Activated",
        message: "Your subscription payment was successful. Account is now active!",
      });
    }

    // Handle promotion payment
    if (type === "promotion" && planType && creator) {
      const PromotionRequest = require("../models/PromotionRequest");
      const subSettings = await configService.getSubscriptionSettings();

      const now = new Date();
      const expiry = new Date(now);
      expiry.setDate(expiry.getDate() + 30);

      const promo = await PromotionRequest.create({
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

      // Apply promotion
      if (planType.startsWith("featured_") || planType === "homepage_featured") {
        creator.featured = true;
        creator.featuredStartDate = now;
        creator.featuredEndDate = expiry;
      } else if (planType.startsWith("rank_")) {
        creator.rank = parseInt(planType.split("_")[1], 10);
      }
      await creator.save();

      await Notification.create({
        user: req.user._id,
        type: "payment",
        title: "🏆 Promotion Activated",
        message: `Your ${planType} promotion is now active for 30 days!`,
      });
    }

    res.json({ success: true, message: "Payment verified and activated", paymentId: razorpay_payment_id });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// VERIFY: Verify subscription authentication
// ═══════════════════════════════════════════════════════════════
router.post("/verify-subscription", protect, async (req, res, next) => {
  try {
    const { razorpay_subscription_id, razorpay_payment_id, razorpay_signature } = req.body;

    const isValid = razorpayService.verifySubscriptionSignature(razorpay_subscription_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      return res.status(400).json({ success: false, message: "Subscription verification failed" });
    }

    const creator = await Creator.findOne({ user: req.user._id });
    if (creator) {
      creator.subscriptionStatus = "active";
      creator.razorpaySubscriptionId = razorpay_subscription_id;
      if (!creator.subscriptionStartDate) creator.subscriptionStartDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      creator.subscriptionEndDate = endDate;
      creator.lastPaymentDate = new Date();
      await creator.save();
    }

    res.json({ success: true, message: "Subscription verified and activated" });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// WEBHOOK: Razorpay webhooks (no auth — verified by signature)
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
        // Payment successful
        console.log("[Razorpay] Payment captured:", payload.payment?.entity?.id);
        break;
      }

      case "subscription.activated": {
        // Subscription started
        const subId = payload.subscription?.entity?.id;
        const creator = await Creator.findOne({ razorpaySubscriptionId: subId });
        if (creator) {
          creator.subscriptionStatus = "active";
          if (!creator.subscriptionStartDate) creator.subscriptionStartDate = new Date();
          const end = new Date();
          end.setMonth(end.getMonth() + 1);
          creator.subscriptionEndDate = end;
          await creator.save();
          console.log("[Razorpay] Subscription activated for creator:", creator._id);
        }
        break;
      }

      case "subscription.charged": {
        // Recurring payment success
        const subId = payload.subscription?.entity?.id;
        const creator = await Creator.findOne({ razorpaySubscriptionId: subId });
        if (creator) {
          creator.subscriptionStatus = "active";
          creator.lastPaymentDate = new Date();
          const end = new Date();
          end.setMonth(end.getMonth() + 1);
          creator.subscriptionEndDate = end;
          await creator.save();
          console.log("[Razorpay] Subscription charged for creator:", creator._id);
        }
        break;
      }

      case "subscription.cancelled":
      case "subscription.completed": {
        const subId = payload.subscription?.entity?.id;
        const creator = await Creator.findOne({ razorpaySubscriptionId: subId });
        if (creator) {
          creator.subscriptionStatus = "expired";
          await creator.save();
          console.log("[Razorpay] Subscription cancelled/completed for creator:", creator._id);
        }
        break;
      }

      case "payment.failed": {
        const subId = payload.payment?.entity?.subscription_id;
        if (subId) {
          const creator = await Creator.findOne({ razorpaySubscriptionId: subId });
          if (creator) {
            creator.subscriptionStatus = "overdue";
            creator.paymentFailCount = (creator.paymentFailCount || 0) + 1;
            await creator.save();
            // Notify creator
            await Notification.create({
              user: creator.user,
              type: "payment",
              title: "⚠️ Payment Failed",
              message: "Your subscription payment failed. Please update your payment method.",
            });
            console.log("[Razorpay] Payment failed for creator:", creator._id);
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
