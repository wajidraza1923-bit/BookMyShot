const express = require("express");
const razorpayService = require("../services/razorpayService");
const configService = require("../services/configService");
const Creator = require("../models/Creator");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Invoice = require("../models/Invoice");
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
      const amount = subSettings.monthlyPlanPrice || 99;
      await Invoice.create({
        creator: creator._id,
        invoiceNumber: "BMS-RZP-" + Date.now(),
        type: "subscription",
        description: "Monthly Subscription (Razorpay)",
        amount,
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

      // ══ EMAIL: Creator — Subscription Activated + Payment Receipt ══
      emailService.sendSubscriptionActivated({
        email: req.user.email,
        name: req.user.name,
        planName: "Monthly Subscription",
        amount,
        endDate: newEndDate,
        paymentId: razorpay_payment_id,
        creatorId: creator._id,
        userId: req.user._id,
      }).catch(e => console.error("[Email] sendSubscriptionActivated failed:", e.message));

      emailService.sendPaymentReceipt({
        email: req.user.email,
        name: req.user.name,
        amount,
        paymentId: razorpay_payment_id,
        description: "Monthly Subscription",
        date: now,
        creatorId: creator._id,
        userId: req.user._id,
      }).catch(e => console.error("[Email] sendPaymentReceipt failed:", e.message));

      // ══ EMAIL: Admin — New Subscription ══
      emailService.sendAdminNewSubscription({
        creatorName: req.user.name,
        creatorEmail: req.user.email,
        amount,
        paymentId: razorpay_payment_id,
      }).catch(e => console.error("[Email] sendAdminNewSubscription failed:", e.message));
    }

    // Handle promotion payment
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

      // ══ EMAIL: Creator — Subscription Activated ══
      const subSettings = await configService.getSubscriptionSettings();
      emailService.sendSubscriptionActivated({
        email: req.user.email,
        name: req.user.name,
        planName: "Monthly Subscription (AutoPay)",
        amount: subSettings.monthlyPlanPrice || 99,
        endDate,
        paymentId: razorpay_payment_id,
        creatorId: creator._id,
        userId: req.user._id,
      }).catch(e => console.error("[Email] sendSubscriptionActivated (autopay) failed:", e.message));

      // ══ EMAIL: Admin — New Subscription ══
      emailService.sendAdminNewSubscription({
        creatorName: req.user.name,
        creatorEmail: req.user.email,
        amount: subSettings.monthlyPlanPrice || 99,
        paymentId: razorpay_payment_id,
      }).catch(e => console.error("[Email] sendAdminNewSubscription (autopay) failed:", e.message));
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
        console.log("[Razorpay] Payment captured:", payload.payment?.entity?.id);
        break;
      }

      case "subscription.activated": {
        const subId = payload.subscription?.entity?.id;
        const creator = await Creator.findOne({ razorpaySubscriptionId: subId }).populate("user");
        if (creator) {
          creator.subscriptionStatus = "active";
          if (!creator.subscriptionStartDate) creator.subscriptionStartDate = new Date();
          const end = new Date();
          end.setMonth(end.getMonth() + 1);
          creator.subscriptionEndDate = end;
          await creator.save();
          console.log("[Razorpay] Subscription activated for creator:", creator._id);

          // ══ EMAIL: Creator — Subscription Activated ══
          if (creator.user?.email) {
            const subSettings = await configService.getSubscriptionSettings();
            emailService.sendSubscriptionActivated({
              email: creator.user.email,
              name: creator.user.name,
              planName: "Monthly Subscription (AutoPay)",
              amount: subSettings.monthlyPlanPrice || 99,
              endDate: end,
              paymentId: payload.subscription?.entity?.id,
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
        const subId = payload.subscription?.entity?.id;
        const paymentId = payload.payment?.entity?.id || "";
        const amount = payload.payment?.entity?.amount ? payload.payment.entity.amount / 100 : 0;
        const creator = await Creator.findOne({ razorpaySubscriptionId: subId }).populate("user");
        if (creator) {
          creator.subscriptionStatus = "active";
          creator.lastPaymentDate = new Date();
          const end = new Date();
          end.setMonth(end.getMonth() + 1);
          creator.subscriptionEndDate = end;
          await creator.save();

          // Create invoice for recurring payment
          await Invoice.create({
            creator: creator._id,
            invoiceNumber: "BMS-AP-" + Date.now(),
            type: "subscription",
            description: "Monthly Subscription (AutoPay Renewal)",
            amount: amount || (await configService.getSubscriptionSettings()).monthlyPlanPrice || 99,
            status: "paid",
            paidAt: new Date(),
            dueDate: end,
          });

          console.log("[Razorpay] Subscription charged for creator:", creator._id);

          // ══ EMAIL: Creator — Subscription Renewed ══
          if (creator.user?.email) {
            const chargedAmount = amount || (await configService.getSubscriptionSettings()).monthlyPlanPrice || 99;
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

      case "subscription.cancelled":
      case "subscription.completed": {
        const subId = payload.subscription?.entity?.id;
        const creator = await Creator.findOne({ razorpaySubscriptionId: subId }).populate("user");
        if (creator) {
          creator.subscriptionStatus = "expired";
          await creator.save();
          console.log("[Razorpay] Subscription cancelled/completed for creator:", creator._id);

          // ══ EMAIL: Creator — Subscription Expired ══
          if (creator.user?.email) {
            emailService.sendSubscriptionExpired({
              email: creator.user.email,
              name: creator.user.name,
              creatorId: creator._id,
              userId: creator.user._id,
            }).catch(e => console.error("[Email] webhook sub expired:", e.message));

            emailService.sendAdminSubscriptionExpired({
              creatorName: creator.user.name,
              creatorEmail: creator.user.email,
            }).catch(e => console.error("[Email] admin webhook sub expired:", e.message));
          }
        }
        break;
      }

      case "payment.failed": {
        const subId = payload.payment?.entity?.subscription_id;
        const amount = payload.payment?.entity?.amount ? payload.payment.entity.amount / 100 : 0;
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
              message: "Your subscription payment failed. Please update your payment method.",
            });
            console.log("[Razorpay] Payment failed for creator:", creator._id);

            // ══ EMAIL: Creator — Payment Failed ══
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
