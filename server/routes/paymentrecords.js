const express = require("express");
const PaymentRecord = require("../models/PaymentRecord");
const Booking = require("../models/Booking");
const Creator = require("../models/Creator");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

// Helper: recalculate booking payment summary
async function recalcPayment(bookingId) {
  const records = await PaymentRecord.find({ booking: bookingId, status: "approved" });
  const totalPaid = records.reduce((s, r) => s + r.amount, 0);
  const booking = await Booking.findById(bookingId);
  if (!booking) return;
  booking.advancePaid = totalPaid;
  booking.remaining = Math.max(0, (booking.amount || booking.budget || 0) - totalPaid);
  if (booking.remaining === 0 && totalPaid > 0) {
    booking.paymentStatus = "paid";
  } else if (totalPaid > 0) {
    booking.paymentStatus = "partial";
  }

  // AUTO-LOCK COMMISSION: Commission is now created immediately when amount is set.
  // This section only updates amountCollectedFromCustomer on the Commission record.
  if (booking.commissionLocked && booking.commissionAmount > 0) {
    const Commission = require("../models/Commission");
    const commission = await Commission.findOne({ booking: booking._id });
    if (commission) {
      commission.amountCollectedFromCustomer = totalPaid;
      // Update status based on collection
      const dealAmount = booking.amount || booking.budget || 0;
      if (totalPaid >= dealAmount && dealAmount > 0) {
        commission.status = commission.status === "paid" ? "paid" : "recovered";
      } else if (totalPaid > 0) {
        if (commission.status !== "paid") commission.status = "partially_recovered";
      }
      await commission.save();
    }
  }

  await booking.save();
  return booking;
}

// GET payment records for a booking (both user and creator can access)
router.get("/booking/:bookingId", async (req, res, next) => {
  try {
    const records = await PaymentRecord.find({ booking: req.params.bookingId })
      .sort("-createdAt");
    const booking = await Booking.findById(req.params.bookingId);
    const totalAmount = booking ? (booking.amount || booking.budget || 0) : 0;
    const approvedRecords = records.filter(r => r.status === "approved");
    const totalPaid = approvedRecords.reduce((s, r) => s + r.amount, 0);
    const remaining = Math.max(0, totalAmount - totalPaid);
    const progress = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;

    res.json({
      success: true,
      records,
      summary: { totalAmount, totalPaid, remaining, progress }
    });
  } catch (e) {
    next(e);
  }
});

// POST: User adds a payment record
router.post("/user", async (req, res, next) => {
  try {
    const { bookingId, amount, paymentType, notes, proof } = req.body;
    if (!bookingId || !amount) {
      return res.status(400).json({ success: false, message: "Booking ID and amount are required" });
    }
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be greater than 0" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not your booking" });
    }

    // ═══ VALIDATION: Total received must NEVER exceed booking amount ═══
    const bookingTotal = booking.amount || booking.budget || 0;
    if (bookingTotal > 0) {
      const existingRecords = await PaymentRecord.find({ booking: bookingId, status: { $in: ["approved", "pending"] } });
      const totalAlreadyRecorded = existingRecords.reduce((s, r) => s + r.amount, 0);
      if (totalAlreadyRecorded + amount > bookingTotal) {
        const maxAllowed = Math.max(0, bookingTotal - totalAlreadyRecorded);
        return res.status(400).json({
          success: false,
          message: `Payment exceeds booking amount. Booking total: ₹${bookingTotal}, Already recorded: ₹${totalAlreadyRecorded}, Maximum allowed: ₹${maxAllowed}`,
        });
      }
    }

    const record = await PaymentRecord.create({
      booking: bookingId,
      user: req.user._id,
      creator: booking.creator,
      amount,
      paymentType: paymentType || "other",
      notes: notes || "",
      proof: proof || "",
      addedBy: "user",
      status: "pending",
    });

    // Update booking status if still at Creator Accepted
    if (booking.status === "Creator Accepted") {
      booking.status = "Payment Submitted";
      booking.paymentStatus = "proof-submitted";
      await booking.save();
    }

    // Notify creator
    const creator = await Creator.findById(booking.creator);
    if (creator && creator.user) {
      await Notification.create({
        user: creator.user,
        title: "💰 New Payment Record",
        message: `₹${amount} ${paymentType || "payment"} recorded for ${booking.eventType}`,
        type: "payment",
      });
    }

    res.status(201).json({ success: true, record });
  } catch (e) {
    next(e);
  }
});

// POST: Creator adds a payment record
router.post("/creator", async (req, res, next) => {
  try {
    const { bookingId, amount, paymentType, notes, proof } = req.body;
    if (!bookingId || !amount) {
      return res.status(400).json({ success: false, message: "Booking ID and amount are required" });
    }
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be greater than 0" });
    }

    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(403).json({ success: false, message: "Creator not found" });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.creator.toString() !== creator._id.toString()) {
      return res.status(403).json({ success: false, message: "Not your booking" });
    }

    // ═══ VALIDATION: Total received must NEVER exceed booking amount ═══
    const bookingTotal = booking.amount || booking.budget || 0;
    if (bookingTotal <= 0) {
      return res.status(400).json({ success: false, message: "Booking amount not set. Please set the deal amount first." });
    }
    const existingRecords = await PaymentRecord.find({ booking: bookingId, status: "approved" });
    const totalAlreadyPaid = existingRecords.reduce((s, r) => s + r.amount, 0);
    if (totalAlreadyPaid + amount > bookingTotal) {
      const maxAllowed = bookingTotal - totalAlreadyPaid;
      return res.status(400).json({
        success: false,
        message: `Payment exceeds booking amount. Booking total: ₹${bookingTotal}, Already received: ₹${totalAlreadyPaid}, Maximum you can add: ₹${maxAllowed}`,
      });
    }

    // Creator-added records are auto-approved
    const record = await PaymentRecord.create({
      booking: bookingId,
      user: booking.user,
      creator: creator._id,
      amount,
      paymentType: paymentType || "other",
      notes: notes || "",
      proof: proof || "",
      addedBy: "creator",
      status: "approved",
    });

    // Recalculate booking totals
    await recalcPayment(bookingId);

    // Notify user
    await Notification.create({
      user: booking.user,
      title: "💰 Payment Recorded",
      message: `Creator recorded ₹${amount} ${paymentType || "payment"} for ${booking.eventType}`,
      type: "payment",
    });

    res.status(201).json({ success: true, record });
  } catch (e) {
    next(e);
  }
});

// PATCH: Creator approves a payment record
router.patch("/:id/approve", async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(403).json({ success: false, message: "Creator not found" });

    const record = await PaymentRecord.findOne({ _id: req.params.id, creator: creator._id });
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });

    record.status = "approved";
    await record.save();

    // Recalculate booking totals
    const booking = await recalcPayment(record.booking);

    // Notify user
    await Notification.create({
      user: record.user,
      title: "✅ Payment Approved",
      message: `Your payment of ₹${record.amount} has been approved.`,
      type: "payment",
    });

    res.json({ success: true, record, booking });
  } catch (e) {
    next(e);
  }
});

// PATCH: Creator rejects a payment record
router.patch("/:id/reject", async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(403).json({ success: false, message: "Creator not found" });

    const record = await PaymentRecord.findOne({ _id: req.params.id, creator: creator._id });
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });

    record.status = "rejected";
    record.rejectionReason = req.body.reason || "";
    await record.save();

    // Notify user
    await Notification.create({
      user: record.user,
      title: "❌ Payment Rejected",
      message: `Your payment of ₹${record.amount} was rejected. ${req.body.reason || "Please resubmit."}`,
      type: "payment",
    });

    res.json({ success: true, record });
  } catch (e) {
    next(e);
  }
});

// PATCH: Creator sets total project amount
router.patch("/booking/:bookingId/amount", async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(403).json({ success: false, message: "Creator not found" });

    const booking = await Booking.findOne({ _id: req.params.bookingId, creator: creator._id });
    if (!booking) {
      const anyBooking = await Booking.findById(req.params.bookingId);
      if (anyBooking) {
        return res.status(403).json({ success: false, message: "This booking belongs to a different creator" });
      }
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const newAmount = Number(req.body.amount);
    if (!newAmount || newAmount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    booking.amount = newAmount;

    // ═══════════════════════════════════════════════════════════════
    // COMMISSION LOGIC:
    // - First time: calculate commission on the amount set
    // - If amount INCREASES above previous highest: recalculate on new higher amount
    // - If amount DECREASES: commission stays at previous highest (never goes down)
    // - Commission is always based on the HIGHEST amount ever set
    // ═══════════════════════════════════════════════════════════════
    const configService = require("../services/configService");
    const commSettings = await configService.getCommissionSettings();
    const leadSource = booking.leadSource || "bookmyshot";
    const commissionPercent = leadSource === "creator"
      ? (commSettings.creatorLeadCommissionPercent || 3)
      : (commSettings.bmsLeadCommissionPercent || 5);

    const previousHighest = booking.commissionLockedAmount || 0;

    if (newAmount > previousHighest) {
      // New amount is HIGHER than ever before → recalculate commission on this new amount
      const commissionAmount = Math.round((newAmount * commissionPercent) / 100);

      booking.commissionPercent = commissionPercent;
      booking.commissionAmount = commissionAmount;
      booking.commissionLockedAmount = newAmount; // Track highest
      booking.commissionLocked = true;
      booking.creatorReceivable = newAmount - commissionAmount;
      if (!booking.commissionStatus) booking.commissionStatus = "pending";

      // Update or create commission record
      const Commission = require("../models/Commission");
      let commission = await Commission.findOne({ booking: booking._id });
      if (commission) {
        commission.totalAmount = newAmount;
        commission.leadSource = leadSource;
        commission.commissionPercent = commissionPercent;
        commission.commissionAmount = commissionAmount;
        commission.creatorEarning = newAmount - commissionAmount;
        await commission.save();
      } else {
        await Commission.create({
          booking: booking._id,
          creator: creator._id,
          user: booking.user,
          totalAmount: newAmount,
          leadSource,
          commissionPercent,
          commissionAmount,
          creatorEarning: newAmount - commissionAmount,
          status: "pending",
        });
      }
    } else {
      // Amount is SAME or LOWER than previous highest → commission stays unchanged
      booking.creatorReceivable = newAmount - booking.commissionAmount;
    }

    await booking.save();
    await recalcPayment(booking._id);

    // Re-fetch to return the latest state
    const updatedBooking = await Booking.findById(booking._id).lean();
    res.json({ success: true, booking: updatedBooking });
  } catch (e) {
    next(e);
  }
});

// PATCH: Creator marks booking as fully paid
router.patch("/booking/:bookingId/mark-paid", async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(403).json({ success: false, message: "Creator not found" });

    const booking = await Booking.findOne({ _id: req.params.bookingId, creator: creator._id });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    booking.paymentStatus = "paid";
    booking.remaining = 0;
    booking.advancePaid = booking.amount || booking.budget || 0;
    await booking.save();

    // Notify user
    await Notification.create({
      user: booking.user,
      title: "✅ Booking Fully Paid",
      message: `Your booking for ${booking.eventType} has been marked as fully paid.`,
      type: "payment",
    });

    res.json({ success: true, booking });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
