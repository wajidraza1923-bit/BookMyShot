const express = require("express");
const crypto = require("crypto");
const { protect } = require("../middleware/auth");
const Payment = require("../models/Payment");
const Booking = require("../models/Booking");

const router = express.Router();

const createMockOrderId = () => `mock_order_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
const createMockPaymentId = () => `mock_payment_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

// Create order (server-side) — returns mock order id to frontend
router.post("/order", protect, async (req, res, next) => {
  try {
    const { amount, currency = "INR", bookingId } = req.body;
    const orderId = createMockOrderId();

    const payment = await Payment.create({
      user: req.user._id,
      booking: bookingId,
      razorpayOrderId: orderId,
      amount: amount || 0,
      currency,
      status: "created",
    });

    res.json({
      success: true,
      orderId,
      amount: Math.round((amount || 0) * 100),
      currency,
      payment,
      mock: true,
      message: "Mock payment order created successfully.",
    });
  } catch (e) {
    next(e);
  }
});

// Verify mock payment
router.post("/verify", protect, async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id || createMockPaymentId(),
        razorpaySignature: razorpay_signature || crypto.createHash("sha256").update(`${razorpay_order_id}|mock`).digest("hex"),
        status: "paid",
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment record not found." });
    }

    let updatedBooking = null;
    if (payment.booking) {
      updatedBooking = await Booking.findByIdAndUpdate(
        payment.booking,
        { status: "completed", amount: payment.amount },
        { new: true }
      );
    }

    res.json({ success: true, payment, mock: true, updatedBooking, message: "Mock payment verified successfully." });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
