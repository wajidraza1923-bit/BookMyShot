const express = require("express");
const Commission = require("../models/Commission");
const Booking = require("../models/Booking");
const Creator = require("../models/Creator");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Create commission record (admin)
router.post("/", protect, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ success: false, message: "Admin only" });

    const { bookingId, totalAmount, commissionPercent } = req.body;
    if (!bookingId || !totalAmount) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    // Use provided percent or load from database settings
    let percent = commissionPercent;
    if (!percent) {
      const configService = require("../services/configService");
      const commSettings = await configService.getCommissionSettings();
      const leadSource = booking.leadSource || "bookmyshot";
      percent = leadSource === "creator"
        ? (commSettings.inquiryCommissionPercent || commSettings.creatorLeadCommissionPercent || 3)
        : (commSettings.bmsLeadCommissionPercent || 5);
    }
    const commissionAmount = (totalAmount * percent) / 100;
    const creatorEarning = totalAmount - commissionAmount;

    const commission = await Commission.create({
      booking: bookingId,
      creator: booking.creator,
      user: booking.user,
      totalAmount,
      commissionPercent: percent,
      commissionAmount,
      creatorEarning,
    });

    res.status(201).json({ success: true, commission });
  } catch (e) {
    next(e);
  }
});

// Get all commissions (admin)
router.get("/", protect, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ success: false, message: "Admin only" });

    const commissions = await Commission.find()
      .populate({ path: "booking", select: "eventType eventDate clientName" })
      .populate({ path: "creator", populate: { path: "user", select: "name" } })
      .populate("user", "name email")
      .sort("-createdAt");

    const totalRevenue = commissions
      .filter((c) => c.status === "paid")
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    res.json({ success: true, commissions, totalRevenue });
  } catch (e) {
    next(e);
  }
});

// Get creator's commissions
router.get("/creator", protect, async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(403).json({ success: false, message: "Creator profile not found" });

    const commissions = await Commission.find({ creator: creator._id })
      .populate({ path: "booking", select: "eventType eventDate clientName" })
      .sort("-createdAt");

    const totalEarnings = commissions
      .filter((c) => c.status === "paid")
      .reduce((sum, c) => sum + c.creatorEarning, 0);

    res.json({ success: true, commissions, totalEarnings });
  } catch (e) {
    next(e);
  }
});

// Update commission status (admin)
router.patch("/:id", protect, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ success: false, message: "Admin only" });

    const commission = await Commission.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, paidAt: req.body.status === "paid" ? new Date() : undefined },
      { new: true }
    );
    if (!commission) return res.status(404).json({ success: false, message: "Commission not found" });

    res.json({ success: true, commission });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
