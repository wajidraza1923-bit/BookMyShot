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
    const configService = require("../services/configService");
    const settings = await configService.getCommissionSettings();
    return settings.bmsLeadCommissionPercent || 5;
  } catch {
    return 5; // fallback
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
        bookingFeePaymentId: razorpay_payment_id,
        bookingFeeOrderId: razorpay_order_id,
        bookingFeePaidAt: new Date(),
        status: "Payment Approved",
      },
    }, { new: true });

    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

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

module.exports = router;
