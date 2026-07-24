const express = require("express");
const PaymentProof = require("../models/PaymentProof");
const Booking = require("../models/Booking");
const Creator = require("../models/Creator");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Upload payment proof (user)
router.post("/", protect, async (req, res, next) => {
  try {
    const { bookingId, amount, screenshot, note } = req.body;
    if (!bookingId || !amount) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not your booking" });
    }

    // Upload screenshot to Cloudinary if it's a base64 data URL
    let screenshotUrl = screenshot || "";
    if (screenshotUrl && screenshotUrl.startsWith("data:")) {
      try {
        const { uploadBase64, isConfigured } = require("../services/cloudinaryService");
        if (isConfigured()) {
          const result = await uploadBase64(screenshotUrl, {
            folder: "bookmyshot/payment-proofs",
          });
          screenshotUrl = result.url;
        }
      } catch (uploadErr) {
        console.error("[PaymentProof] Cloudinary upload failed, storing as-is:", uploadErr.message);
      }
    }

    const proof = await PaymentProof.create({
      user: req.user._id,
      booking: bookingId,
      creator: booking.creator,
      amount,
      screenshot: screenshotUrl,
      note: note || "",
    });

    // Notify creator
    await Notification.create({
      user: booking.creator?.user || booking.creator,
      title: "💰 Payment Proof Uploaded",
      message: `A payment proof of ₹${amount} has been uploaded for booking`,
      type: "payment",
    });

    // Real-time: notify creator about payment proof
    try {
      const socketService = require("../services/socketService");
      const creatorDoc = await Creator.findById(booking.creator).select("user");
      if (creatorDoc) {
        socketService.notifyPaymentUpdate(req.user._id.toString(), creatorDoc.user.toString(), { bookingId, status: 'proof-submitted', amount });
      }
    } catch (e) {}

    res.status(201).json({ success: true, proof });
  } catch (e) {
    next(e);
  }
});

// Get payment proofs for a booking (user)
router.get("/booking/:bookingId", protect, async (req, res, next) => {
  try {
    const proofs = await PaymentProof.find({ booking: req.params.bookingId }).sort("-createdAt");
    res.json({ success: true, proofs });
  } catch (e) {
    next(e);
  }
});

// Get payment proofs for creator's bookings
router.get("/creator", protect, async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(403).json({ success: false, message: "Creator profile not found" });

    const proofs = await PaymentProof.find({ creator: creator._id })
      .populate("user", "name email phone")
      .populate({ path: "booking", select: "eventType eventDate clientName invoiceNumber amount budget" })
      .sort("-createdAt");

    res.json({ success: true, proofs });
  } catch (e) {
    next(e);
  }
});

// Creator verifies/rejects payment proof
router.patch("/:id/creator-verify", protect, async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;
    if (!["verified", "rejected"].includes(status)) return res.status(400).json({ success: false, message: "Status must be verified or rejected" });

    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(403).json({ success: false, message: "Not a creator" });

    const proof = await PaymentProof.findOne({ _id: req.params.id, creator: creator._id });
    if (!proof) return res.status(404).json({ success: false, message: "Payment proof not found" });

    proof.status = status;
    if (adminNote) proof.adminNote = adminNote;
    await proof.save();

    // If approved, update booking payment
    if (status === "verified" && proof.booking) {
      const Booking = require("../models/Booking");
      const booking = await Booking.findById(proof.booking);
      if (booking) {
        booking.advancePaid = (booking.advancePaid || 0) + (proof.amount || 0);
        booking.remaining = Math.max(0, (booking.amount || booking.budget || 0) - booking.advancePaid);
        if (booking.remaining <= 0) booking.paymentStatus = "paid";
        else booking.paymentStatus = "partial";
        await booking.save();
      }
    }

    // Notify user
    const notifTitle = status === "verified" ? "✅ Payment Approved" : "❌ Payment Rejected";
    const notifMsg = status === "verified"
      ? `Your payment of ₹${(proof.amount || 0).toLocaleString('en-IN')} has been approved.`
      : `Your payment proof was rejected. ${adminNote || ''}`;
    await Notification.create({ user: proof.user, type: "payment", title: notifTitle, message: notifMsg, targetScreen: "Bookings" });

    // Real-time: notify customer about payment verification
    try {
      const socketService = require("../services/socketService");
      socketService.notifyPaymentUpdate(proof.user.toString(), req.user._id.toString(), { bookingId: proof.booking?.toString(), status, amount: proof.amount });
    } catch (e) {}

    res.json({ success: true, message: `Payment ${status}` });
  } catch (e) { next(e); }
});

// Get all payment proofs (admin)
router.get("/all", protect, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ success: false, message: "Admin only" });

    const proofs = await PaymentProof.find()
      .populate("user", "name email phone")
      .populate({ path: "booking", select: "eventType eventDate clientName" })
      .populate({ path: "creator", populate: { path: "user", select: "name" } })
      .sort("-createdAt");

    res.json({ success: true, proofs });
  } catch (e) {
    next(e);
  }
});

// Verify/reject payment proof (admin)
router.patch("/:id/verify", protect, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ success: false, message: "Admin only" });

    const proof = await PaymentProof.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, adminNote: req.body.adminNote || "" },
      { new: true }
    );
    if (!proof) return res.status(404).json({ success: false, message: "Payment proof not found" });

    // If verified, create a PaymentRecord entry in the unified payment history
    if (req.body.status === "verified" && proof.booking) {
      const PaymentRecord = require("../models/PaymentRecord");

      // Use proof._id in notes to prevent duplicates
      const proofIdStr = proof._id.toString();
      const existingRecord = await PaymentRecord.findOne({
        booking: proof.booking,
        addedBy: "user",
        notes: { $regex: proofIdStr },
      });

      if (!existingRecord) {
        await PaymentRecord.create({
          booking: proof.booking,
          user: proof.user,
          creator: proof.creator,
          amount: proof.amount,
          paymentType: "partial",
          notes: "Payment proof #" + proofIdStr + (proof.note || "User payment proof approved by admin"),
          proof: proof.screenshot || "",
          addedBy: "user",
          status: "approved",
        });
      }

      // Recalculate booking totals from payment records
      const records = await PaymentRecord.find({ booking: proof.booking, status: "approved" });
      const totalPaid = records.reduce((s, r) => s + r.amount, 0);
      const booking = await Booking.findById(proof.booking);
      if (booking) {
        booking.advancePaid = totalPaid;
        booking.remaining = Math.max(0, (booking.amount || booking.budget || 0) - totalPaid);
        booking.paymentStatus = booking.remaining === 0 && totalPaid > 0 ? "paid" : totalPaid > 0 ? "partial" : "unpaid";
        booking.status = "Payment Approved";
        await booking.save();
      }
    }

    // Notify user
    await Notification.create({
      user: proof.user,
      title: "✅ Payment Proof " + (req.body.status === "verified" ? "Verified" : "Rejected"),
      message: `Your payment proof of ₹${proof.amount} has been ${req.body.status}`,
      type: "payment",
    });

    res.json({ success: true, proof });
  } catch (e) {
    next(e);
  }
});

module.exports = router;