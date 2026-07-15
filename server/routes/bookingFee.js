/**
 * Booking Fee Routes — Customer pays 5% to BookMyShot to confirm booking
 * Creator never pays anything.
 */
const express = require("express");
const Booking = require("../models/Booking");
const { protect } = require("../middleware/auth");

const router = express.Router();

const BOOKING_FEE_PERCENT = 5;

// ═══ Calculate booking fee ═══
router.get("/calculate/:bookingId", protect, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate("creator", "user").lean();
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

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

    // Update booking
    const totalAmount = 0;
    const booking = await Booking.findByIdAndUpdate(req.params.bookingId, {
      $set: {
        bookingFeePaid: true,
        bookingFeePaymentId: razorpay_payment_id,
        bookingFeeOrderId: razorpay_order_id,
        bookingFeePaidAt: new Date(),
        status: "Payment Approved",
      },
    }, { new: true });

    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    // TODO: Send notifications to both customer and creator

    res.json({
      success: true,
      message: "Booking fee paid successfully. Booking confirmed!",
      data: {
        bookingId: booking._id,
        status: booking.status,
        paymentId: razorpay_payment_id,
      },
    });
  } catch (e) { next(e); }
});

module.exports = router;
