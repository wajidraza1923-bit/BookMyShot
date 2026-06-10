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
// CREATOR: Create Razorpay Subscription (AutoPay — TRUE recurring)
// This is the ONLY endpoint for creator subscriptions.
// Uses Razorpay Subscriptions API (not Orders API).
// Creator authorizes AutoPay once, then gets charged automatically.
// ═══════════════════════════════════════════════════════════════
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

    // If creator already has an active Razorpay subscription, don't create new one
    if (creator.razorpaySubscriptionId && creator.subscriptionStatus === "active") {
      return res.json({
        success: true,
        message: "Subscription already active",
        subscriptionId: creator.razorpaySubscriptionId,
        status: "active",
      });
    }

    // Step 1: Get or create a Razorpay Plan
    let planId = process.env.RAZORPAY_PLAN_ID || creator.razorpayPlanId;
    if (!planId) {
      console.log("[Razorpay] Creating new monthly plan: ₹" + amount);
      const plan = await razorpayService.createPlan("BookMyShot Creator Monthly", amount, "monthly", 1);
      planId = plan.id;
      console.log("[Razorpay] Plan created:", planId);
      // Store plan ID on creator for future reference
      creator.razorpayPlanId = planId;
    }

    // Step 2: Create Razorpay Subscription with trial
    console.log("[Razorpay] Creating subscription. Plan:", planId, "Trial:", trialDays, "days");
    const subscription = await razorpayService.createSubscription(planId, 60, trialDays, {
      creatorId: creator._id.toString(),
      userId: req.user._id.toString(),
      creatorEmail: req.user.email || "",
    });

    // Step 3: Save subscription ID on creator
    creator.razorpaySubscriptionId = subscription.id;
    if (trialDays > 0) {
      creator.subscriptionStatus = "trial";
      creator.subscriptionStartDate = new Date();
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + trialDays);
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
// CREATOR: Cancel subscription
// ═══════════════════════════════════════════════════════════════
router.post("/cancel-subscription", protect, authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator || !creator.razorpaySubscriptionId) {
      return res.status(400).json({ success: false, message: "No active subscription found" });
    }

    // Cancel at end of current billing period
    await razorpayService.cancelSubscription(creator.razorpaySubscriptionId, true);
    creator.autoRenew = false;
    await creator.save();

    res.json({ success: true, message: "Subscription will be cancelled at the end of current period" });
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
        const subId = payload.subscription?.entity?.id;
        console.log("[Razorpay] Subscription authenticated:", subId);
        const creator = await Creator.findOne({ razorpaySubscriptionId: subId });
        if (creator) {
          // Just log — actual activation happens on subscription.activated
          console.log("[Razorpay] Mandate authorized for creator:", creator._id);
        }
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
          creator.nextBillingDate = end;
          await creator.save();
          console.log("[Razorpay] Subscription activated for creator:", creator._id);

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
          creator.lastPaymentDate = new Date();
          creator.paymentFailCount = 0; // Reset fail count on success
          const end = new Date();
          end.setMonth(end.getMonth() + 1);
          creator.subscriptionEndDate = end;
          creator.nextBillingDate = end;
          await creator.save();

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
          await creator.save();
          console.log("[Razorpay] Subscription HALTED for creator:", creator._id);

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
        const subId = payload.subscription?.entity?.id;
        const creator = await Creator.findOne({ razorpaySubscriptionId: subId }).populate("user");
        if (creator) {
          creator.subscriptionStatus = "expired";
          creator.autoRenew = false;
          await creator.save();
          console.log("[Razorpay] Subscription cancelled/completed for creator:", creator._id);

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
