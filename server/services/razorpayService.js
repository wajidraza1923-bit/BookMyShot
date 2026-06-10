/**
 * Razorpay Payment Service
 * 
 * Environment Variables Required:
 * RAZORPAY_KEY_ID=rzp_live_xxxxx
 * RAZORPAY_KEY_SECRET=xxxxx
 * RAZORPAY_WEBHOOK_SECRET=xxxxx
 */

const Razorpay = require("razorpay");
const crypto = require("crypto");

// Initialize Razorpay instance
let razorpay = null;

function getInstance() {
  if (!razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      console.warn("[Razorpay] Not configured — RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing");
      return null;
    }
    razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return razorpay;
}

function isConfigured() {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/**
 * Create a Razorpay Order for one-time payment
 */
async function createOrder(amount, currency = "INR", receipt = "", notes = {}) {
  const rp = getInstance();
  if (!rp) throw new Error("Razorpay not configured");

  const options = {
    amount: Math.round(amount * 100), // Razorpay expects paise
    currency,
    receipt: receipt || `rcpt_${Date.now()}`,
    notes,
  };

  return await rp.orders.create(options);
}

/**
 * Create a Razorpay Subscription Plan
 */
async function createPlan(planName, amount, period = "monthly", interval = 1) {
  const rp = getInstance();
  if (!rp) throw new Error("Razorpay not configured");

  return await rp.plans.create({
    period,
    interval,
    item: {
      name: planName,
      amount: Math.round(amount * 100),
      currency: "INR",
    },
  });
}

/**
 * Create a Razorpay Subscription for a creator (AutoPay)
 */
async function createSubscription(planId, totalCount = 12, trialDays = 0, notes = {}) {
  const rp = getInstance();
  if (!rp) throw new Error("Razorpay not configured");

  const options = {
    plan_id: planId,
    total_count: totalCount,
    quantity: 1,
    notes,
  };

  if (trialDays > 0) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + trialDays);
    options.start_at = Math.floor(trialEnd.getTime() / 1000);
  }

  return await rp.subscriptions.create(options);
}

/**
 * Cancel a Razorpay Subscription
 */
async function cancelSubscription(subscriptionId, cancelAtEnd = true) {
  const rp = getInstance();
  if (!rp) throw new Error("Razorpay not configured");

  return await rp.subscriptions.cancel(subscriptionId, cancelAtEnd);
}

/**
 * Verify Razorpay Payment Signature (one-time payments)
 */
function verifyPaymentSignature(orderId, paymentId, signature) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
}

/**
 * Verify Razorpay Subscription Signature
 */
function verifySubscriptionSignature(subscriptionId, paymentId, signature) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const body = paymentId + "|" + subscriptionId;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
}

/**
 * Verify Razorpay Webhook Signature
 */
function verifyWebhookSignature(body, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
}

/**
 * Fetch payment details
 */
async function fetchPayment(paymentId) {
  const rp = getInstance();
  if (!rp) throw new Error("Razorpay not configured");
  return await rp.payments.fetch(paymentId);
}

/**
 * Fetch subscription details
 */
async function fetchSubscription(subscriptionId) {
  const rp = getInstance();
  if (!rp) throw new Error("Razorpay not configured");
  return await rp.subscriptions.fetch(subscriptionId);
}

module.exports = {
  getInstance,
  isConfigured,
  createOrder,
  createPlan,
  createSubscription,
  cancelSubscription,
  verifyPaymentSignature,
  verifySubscriptionSignature,
  verifyWebhookSignature,
  fetchPayment,
  fetchSubscription,
};
