/**
 * Booking Fee Routes — Customer pays X% (from Admin Panel) to BookMyShot to confirm booking
 * Creator never pays anything.
 */
const express = require("express");
const Booking = require("../models/Booking");
const Creator = require("../models/Creator");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Get dynamic fee percent from Admin Panel (CommissionSettings)
async function getBookingFeePercent() {
  try {
    // Primary: use Master Settings (global admin control)
    const MasterSettings = require("../models/MasterSettings");
    const masterSettings = await MasterSettings.findOne();
    if (masterSettings && masterSettings.bookingCommission) {
      return masterSettings.bookingCommission;
    }
    // Fallback: old CommissionSettings model
    const CommissionSettings = require("../models/CommissionSettings");
    const settings = await CommissionSettings.getSettings();
    return settings.advanceBookingPercent || settings.bmsLeadCommissionPercent || 5;
  } catch {
    return 2.5; // fallback
  }
}

// ═══ Calculate booking fee ═══
router.get("/calculate/:bookingId", protect, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate("creator", "user").lean();
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    const BOOKING_FEE_PERCENT = await getBookingFeePercent();
    const totalAmount = booking.totalAmount || booking.quotedAmount || booking.amount || 0;
    const bookingFee = Math.round(totalAmount * BOOKING_FEE_PERCENT / 100);
    const remainingAmount = totalAmount - bookingFee;

    res.json({
      success: true,
      data: {
        bookingId: booking._id,
        totalAmount,
        bookingFeePercent: BOOKING_FEE_PERCENT,
        bookingFee,
        remainingAmount,
        creatorName: booking.creatorName || 'Creator',
        service: booking.service || booking.category || 'Wedding Service',
        eventDate: booking.eventDate,
        eventLocation: booking.eventLocation || booking.city || '',
        status: booking.status,
        feeStatus: booking.bookingFeePaid ? 'paid' : 'pending',
      },
    });
  } catch (e) { next(e); }
});

// ═══ Create Razorpay order for booking fee ═══
router.post("/create-order/:bookingId", protect, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.bookingFeePaid) return res.status(400).json({ success: false, message: "Booking fee already paid" });

    const BOOKING_FEE_PERCENT = await getBookingFeePercent();
    const totalAmount = booking.totalAmount || booking.quotedAmount || booking.amount || 0;
    if (totalAmount <= 0) return res.status(400).json({ success: false, message: "Invalid booking amount" });

    const bookingFee = Math.round(totalAmount * BOOKING_FEE_PERCENT / 100);

    // Create Razorpay order
    const Razorpay = require("razorpay");
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: bookingFee * 100, // paise
      currency: "INR",
      receipt: `bkfee_${booking._id}`,
      notes: {
        bookingId: String(booking._id),
        customerId: String(req.user._id),
        type: "booking_fee",
        totalBookingAmount: totalAmount,
        feePercent: BOOKING_FEE_PERCENT,
      },
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: bookingFee,
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY_ID,
        bookingId: booking._id,
        customerName: req.user.name,
        customerEmail: req.user.email,
        customerPhone: req.user.phone || '',
      },
    });
  } catch (e) { next(e); }
});

// ═══ Verify payment and confirm booking ═══
router.post("/verify/:bookingId", protect, async (req, res, next) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment verification data missing" });
    }

    // Verify signature
    const crypto = require("crypto");
    const generated = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    // Calculate fee amount for saving
    const BOOKING_FEE_PERCENT = await getBookingFeePercent();
    const existingBooking = await Booking.findById(req.params.bookingId);
    const totalAmount = existingBooking ? (existingBooking.totalAmount || existingBooking.quotedAmount || existingBooking.amount || 0) : 0;
    const bookingFeeAmount = Math.round(totalAmount * BOOKING_FEE_PERCENT / 100);

    // Update booking
    const booking = await Booking.findByIdAndUpdate(req.params.bookingId, {
      $set: {
        bookingFeePaid: true,
        bookingFeeAmount: bookingFeeAmount,
        bookingFeePercent: BOOKING_FEE_PERCENT,
        bookingFeePaymentId: razorpay_payment_id,
        bookingFeeOrderId: razorpay_order_id,
        bookingFeePaidAt: new Date(),
        advancePaid: bookingFeeAmount,
        remaining: totalAmount - bookingFeeAmount,
        paymentStatus: 'partial',
        amountLocked: true,
        status: "Payment Approved",
      },
    }, { new: true });

    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    // ═══ RECORD TRANSACTION ═══
    try {
      const PaymentTransaction = require("../models/PaymentTransaction");
      await PaymentTransaction.create({
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        razorpaySignature: razorpay_signature,
        amount: bookingFeeAmount,
        currency: "INR",
        status: "captured",
        type: "booking_fee",
        bookingId: req.params.bookingId,
        customerId: req.user._id,
        method: "",
        notes: { totalAmount, feePercent: BOOKING_FEE_PERCENT },
      });
    } catch (txErr) {
      console.log("[BookingFee] Transaction record error:", txErr.message);
    }

    // ═══ NOTIFICATIONS ═══
    // Notify customer
    await Notification.create({
      user: booking.user,
      title: "✅ Booking Confirmed!",
      message: `Your booking fee of ₹${bookingFeeAmount.toLocaleString('en-IN')} has been received. Booking is now confirmed. Pay the remaining ₹${(totalAmount - bookingFeeAmount).toLocaleString('en-IN')} directly to the creator.`,
      type: "payment",
      targetScreen: "Bookings",
      targetId: booking._id.toString(),
    });

    // Notify creator
    const creator = await Creator.findById(booking.creator).select("user");
    if (creator) {
      await Notification.create({
        user: creator.user,
        title: "💰 Booking Fee Received!",
        message: `Customer has paid ₹${bookingFeeAmount.toLocaleString('en-IN')} booking fee to BookMyShot. Booking is now confirmed. Collect the remaining ₹${(totalAmount - bookingFeeAmount).toLocaleString('en-IN')} directly from the customer.`,
        type: "payment",
        targetScreen: "CreatorBookings",
        targetId: booking._id.toString(),
      });
    }

    // ═══ SEND INVOICE EMAIL TO CUSTOMER ═══
    try {
      const emailService = require("../services/emailService");
      const User = require("../models/User");
      const customerUser = await User.findById(booking.user).select("name email");
      const creatorDoc = await Creator.findById(booking.creator).populate("user", "name");
      const creatorName = creatorDoc?.user?.name || booking.creatorName || "Creator";

      if (customerUser && customerUser.email) {
        await emailService.sendBookingAdvanceReceipt({
          email: customerUser.email,
          customerName: customerUser.name,
          creatorName,
          bookingId: booking._id.toString(),
          invoiceNumber: booking.invoiceNumber || `BMS-ADV-${Date.now()}`,
          eventDate: booking.eventDate,
          eventType: booking.eventType,
          eventLocation: booking.eventLocation || booking.city || "",
          totalAmount,
          advanceAmount: bookingFeeAmount,
          remainingAmount: totalAmount - bookingFeeAmount,
          advancePercent: BOOKING_FEE_PERCENT,
          paymentId: razorpay_payment_id,
          paymentMethod: "Razorpay (Online)",
          paidAt: new Date(),
          userId: booking.user.toString(),
        });
      }
    } catch (emailErr) {
      console.log("[BookingFee] Invoice email error (non-fatal):", emailErr.message);
    }

    // ═══ REAL-TIME SOCKET.IO ═══
    try {
      const socketService = require("../services/socketService");
      socketService.notifyPaymentUpdate(
        booking.user.toString(),
        creator ? creator.user.toString() : null,
        { bookingId: booking._id, status: 'Payment Approved', bookingFeePaid: true, bookingFeeAmount }
      );
      socketService.notifyBookingUpdate(
        booking.user.toString(),
        creator ? creator.user.toString() : null,
        { bookingId: booking._id, status: 'Payment Approved' }
      );
      socketService.emitToRole("admin", "dashboard:refresh", { type: "payment" });
    } catch (e) {}

    res.json({
      success: true,
      message: "Booking fee paid successfully. Booking confirmed!",
      data: {
        bookingId: booking._id,
        status: booking.status,
        paymentId: razorpay_payment_id,
        bookingFeeAmount,
      },
    });
  } catch (e) { next(e); }
});

// ═══ Razorpay Webhook — server-side payment confirmation (backup) ═══
// Razorpay sends event to this URL when payment is captured
router.post("/webhook", async (req, res) => {
  try {
    const crypto = require("crypto");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify webhook signature
    if (webhookSecret) {
      const signature = req.headers["x-razorpay-signature"];
      const generated = crypto.createHmac("sha256", webhookSecret)
        .update(JSON.stringify(req.body))
        .digest("hex");
      if (generated !== signature) {
        console.log("[Webhook] Invalid signature — ignoring");
        return res.status(400).json({ status: "invalid_signature" });
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === "payment.captured") {
      const payment = payload.payment?.entity;
      if (!payment) return res.json({ status: "ok" });

      const notes = payment.notes || {};
      const bookingId = notes.bookingId;
      const type = notes.type;

      if (type === "booking_fee" && bookingId) {
        // Check if already processed
        const existing = await Booking.findById(bookingId);
        if (existing && !existing.bookingFeePaid) {
          const BOOKING_FEE_PERCENT = await getBookingFeePercent();
          const totalAmount = existing.totalAmount || existing.quotedAmount || existing.amount || 0;
          const bookingFeeAmount = Math.round(totalAmount * BOOKING_FEE_PERCENT / 100);

          await Booking.findByIdAndUpdate(bookingId, {
            $set: {
              bookingFeePaid: true,
              bookingFeeAmount: bookingFeeAmount,
              bookingFeePercent: BOOKING_FEE_PERCENT,
              bookingFeePaymentId: payment.id,
              bookingFeeOrderId: payment.order_id,
              bookingFeePaidAt: new Date(),
              amountLocked: true,
              status: "Payment Approved",
            },
          });

          // Notify customer
          await Notification.create({
            user: existing.user,
            title: "✅ Booking Confirmed!",
            message: `Your advance payment of ₹${bookingFeeAmount.toLocaleString('en-IN')} has been received. Booking confirmed!`,
            type: "payment",
          });

          // Notify creator
          const creator = await Creator.findById(existing.creator).select("user");
          if (creator) {
            await Notification.create({
              user: creator.user,
              title: "💰 Advance Payment Received!",
              message: `Customer paid ₹${bookingFeeAmount.toLocaleString('en-IN')} advance. Booking confirmed. Collect remaining ₹${(totalAmount - bookingFeeAmount).toLocaleString('en-IN')} directly.`,
              type: "payment",
            });
          }

          console.log(`[Webhook] Booking fee confirmed for booking ${bookingId}, amount: ₹${bookingFeeAmount}`);
        }
      }
    }

    // Record transaction
    try {
      const PaymentTransaction = require("../models/PaymentTransaction");
      await PaymentTransaction.create({
        razorpayPaymentId: payload.payment?.entity?.id || "",
        razorpayOrderId: payload.payment?.entity?.order_id || "",
        amount: (payload.payment?.entity?.amount || 0) / 100,
        currency: payload.payment?.entity?.currency || "INR",
        status: event === "payment.captured" ? "captured" : event === "payment.failed" ? "failed" : event,
        type: payload.payment?.entity?.notes?.type || "unknown",
        bookingId: payload.payment?.entity?.notes?.bookingId || null,
        customerId: payload.payment?.entity?.notes?.customerId || null,
        method: payload.payment?.entity?.method || "",
        webhookEvent: event,
        rawPayload: JSON.stringify(req.body).substring(0, 5000),
      });
    } catch (txErr) {
      console.log("[Webhook] Transaction record error:", txErr.message);
    }

    res.json({ status: "ok" });
  } catch (e) {
    console.error("[Webhook] Error:", e.message);
    res.status(500).json({ status: "error" });
  }
});

// ═══ RECONCILIATION: Check Razorpay for missed payments ═══
// Secured with JWT_SECRET or RAZORPAY_KEY_SECRET as key (no user auth needed — internal tool)
router.post("/reconcile", async (req, res) => {
  try {
    const { secret } = req.body;
    // Accept either JWT_SECRET or RAZORPAY_KEY_SECRET for auth
    const validSecrets = [process.env.JWT_SECRET, process.env.RAZORPAY_KEY_SECRET].filter(Boolean);
    if (!validSecrets.includes(secret)) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const Razorpay = require("razorpay");
    const MasterSettings = require("../models/MasterSettings");
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return res.status(400).json({ success: false, message: "Razorpay not configured" });
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    // Fetch recent payments (last 60 days to catch old ones)
    const sixtyDaysAgo = Math.floor((Date.now() - 60 * 86400000) / 1000);
    let allPayments = [];
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const result = await razorpay.payments.all({ count: 100, skip, from: sixtyDaysAgo });
      const items = result.items || [];
      allPayments = allPayments.concat(items);
      if (items.length < 100) hasMore = false;
      else skip += 100;
    }

    const captured = allPayments.filter(p => p.status === "captured");
    let reconciled = 0;
    const details = [];

    for (const payment of captured) {
      const notes = payment.notes || {};
      const bookingId = notes.bookingId;
      const type = notes.type;

      if (type === "booking_fee" && bookingId) {
        const booking = await Booking.findById(bookingId);
        if (booking && !booking.bookingFeePaid) {
          const ms = await MasterSettings.findOne();
          const BOOKING_FEE_PERCENT = (ms && ms.bookingCommission) || 2.5;
          const totalAmount = booking.totalAmount || booking.quotedAmount || booking.amount || 0;
          const bookingFeeAmount = Math.round(totalAmount * BOOKING_FEE_PERCENT / 100) || (payment.amount / 100);

          await Booking.findByIdAndUpdate(bookingId, {
            $set: {
              bookingFeePaid: true,
              bookingFeeAmount,
              bookingFeePercent: BOOKING_FEE_PERCENT,
              bookingFeePaymentId: payment.id,
              bookingFeeOrderId: payment.order_id,
              bookingFeePaidAt: new Date(payment.created_at * 1000),
              advancePaid: bookingFeeAmount,
              remaining: totalAmount - bookingFeeAmount,
              paymentStatus: 'partial',
              amountLocked: true,
              status: "Payment Approved",
              cashbackDeadlineDaysUsed: (ms && ms.cashbackDeadlineDays) || 30,
              cashbackPercentUsed: (ms && ms.cashbackPercentage) || 10,
            },
          });

          if (booking.user) {
            await Notification.create({
              user: booking.user,
              title: "✅ Booking Confirmed!",
              message: `Your advance payment of ₹${bookingFeeAmount.toLocaleString('en-IN')} has been verified. Booking confirmed!`,
              type: "payment", targetScreen: "Bookings", targetId: bookingId.toString(),
            });
          }
          const creator = await Creator.findById(booking.creator).select("user");
          if (creator) {
            await Notification.create({
              user: creator.user,
              title: "💰 Advance Payment Received!",
              message: `Customer paid ₹${bookingFeeAmount.toLocaleString('en-IN')} advance. Booking confirmed.`,
              type: "payment", targetScreen: "CreatorBookings", targetId: bookingId.toString(),
            });
          }

          details.push({ paymentId: payment.id, bookingId: bookingId.toString(), amount: bookingFeeAmount, client: booking.clientName });
          reconciled++;
        }
      }
    }

    res.json({
      success: true,
      message: `Reconciliation complete: ${reconciled} payment(s) recovered`,
      totalPayments: allPayments.length,
      captured: captured.length,
      reconciled,
      details,
      allCaptured: captured.map(p => ({ id: p.id, amount: p.amount/100, notes: p.notes, created: new Date(p.created_at*1000).toISOString() })),
    });
  } catch (e) {
    console.error("[Reconciliation] Error:", e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
