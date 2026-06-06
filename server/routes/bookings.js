const express = require("express");
const Booking = require("../models/Booking");
const Creator = require("../models/Creator");
const User = require("../models/User");
const CalendarEvent = require("../models/CalendarEvent");
const { protect, authorize } = require("../middleware/auth");
const { createNotification } = require("../utils/notify");

const router = express.Router();

// Public: check date availability
router.get("/availability/:creatorId", async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    const events = await CalendarEvent.find({
      creator: req.params.creatorId,
      type: { $in: ["unavailable", "booking", "private"] },
      date: { $gte: start, $lte: end },
    });
    const bookings = await Booking.find({
      creator: req.params.creatorId,
      eventDate: { $gte: start, $lte: end },
      status: { $in: ["Booking Created", "Creator Accepted", "Payment Submitted", "Payment Approved", "Event Scheduled"] },
    });
    res.json({ success: true, unavailable: events, bookings });
  } catch (e) {
    next(e);
  }
});

// Create booking (user or guest via registered user)
router.post("/", protect, async (req, res, next) => {
  try {
    let {
      creatorId,
      clientName,
      clientEmail,
      clientPhone,
      eventType,
      eventDate,
      eventLocation,
      budget,
      message,
    } = req.body;

    if (!creatorId) {
      let defaultCreator = await Creator.findOne({ status: "approved", featured: true }).sort("-createdAt");
      if (!defaultCreator) {
        defaultCreator = await Creator.findOne({ status: "approved" }).sort("-createdAt");
      }
      if (!defaultCreator) {
        return res.status(400).json({ success: false, message: "No creator available for booking" });
      }
      creatorId = defaultCreator._id;
    }

    const dayStart = new Date(eventDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(eventDate);
    dayEnd.setHours(23, 59, 59, 999);
    const blocked = await CalendarEvent.findOne({
      creator: creatorId,
      type: { $in: ["unavailable", "private"] },
      date: { $gte: dayStart, $lte: dayEnd },
    });
    if (blocked) {
      return res.status(400).json({ success: false, message: "Date unavailable" });
    }

    const creator = await Creator.findById(creatorId).populate("user");
    if (!creator || creator.status !== "approved") {
      return res.status(400).json({ success: false, message: "Creator not available" });
    }

    const booking = await Booking.create({
      user: req.user._id,
      creator: creatorId,
      clientName,
      clientEmail,
      clientPhone,
      eventType: eventType || "Premium Booking",
      eventDate,
      eventLocation,
      budget,
      message,
      status: "Booking Created",
      invoiceNumber: `BMS-${Date.now()}`,
      leadSource: "bookmyshot",
    });

    await CalendarEvent.create({
      creator: creatorId,
      type: "booking",
      title: `Booking: ${clientName}`,
      date: new Date(eventDate),
    });

    await createNotification(
      creator.user._id,
      "New Booking Request",
      `${clientName} requested a ${eventType} on ${new Date(eventDate).toLocaleDateString()}`,
      "booking",
      "/creator/"
    );

    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await createNotification(
        admin._id,
        "New Platform Booking",
        `New booking for ${creator.user?.name || "creator"}`,
        "booking"
      );
    }

    res.status(201).json({ success: true, booking });
  } catch (e) {
    next(e);
  }
});

// User bookings
router.get("/my", protect, async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate({ path: "creator", populate: { path: "user", select: "name avatar email phone" } })
      .sort("-createdAt");
    res.json({ success: true, bookings });
  } catch (e) {
    next(e);
  }
});

// Creator bookings
router.get("/creator", protect, authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    const bookings = await Booking.find({ creator: creator._id })
      .populate("user", "name email phone avatar")
      .sort("-createdAt");
    res.json({ success: true, bookings });
  } catch (e) {
    next(e);
  }
});

// Admin all bookings
router.get("/all", protect, authorize("admin"), async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate("user", "name email")
      .populate({ path: "creator", populate: { path: "user", select: "name email" } })
      .sort("-createdAt");
    res.json({ success: true, bookings });
  } catch (e) {
    next(e);
  }
});

// Update booking status (accept/reject by creator)
router.patch("/:id/status", protect, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("creator user");
    if (!booking) return res.status(404).json({ success: false, message: "Not found" });

    const creator = await Creator.findOne({ user: req.user._id });
    const isCreator = creator && booking.creator._id.toString() === creator._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { status, amount, creatorNotes } = req.body;

    if (status === "Creator Accepted") {
      booking.status = "Creator Accepted";
      booking.amount = amount || booking.budget || 0;
      booking.remaining = booking.amount;
      if (creatorNotes) booking.creatorNotes = creatorNotes;
    } else if (status === "rejected") {
      booking.status = "rejected";
      if (creatorNotes) booking.creatorNotes = creatorNotes;
    } else if (status === "Completed") {
      booking.status = "Completed";
      booking.bookingStatus = "completed";
    } else {
      booking.status = status;
    }

    if (req.body.creatorNotes) booking.creatorNotes = req.body.creatorNotes;
    await booking.save();

    await createNotification(
      booking.user._id,
      "Booking Updated",
      `Your booking is now ${booking.status}`,
      "booking"
    );

    res.json({ success: true, booking });
  } catch (e) {
    next(e);
  }
});

// Schedule event (creator sets date, time, location)
router.patch("/:id/schedule", protect, authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    const booking = await Booking.findOne({ _id: req.params.id, creator: creator._id });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    const { scheduledDate, scheduledTime, scheduledLocation, creatorNotes } = req.body;
    if (!scheduledDate) return res.status(400).json({ success: false, message: "Scheduled date is required" });

    booking.scheduledDate = scheduledDate;
    booking.scheduledTime = scheduledTime || "";
    booking.scheduledLocation = scheduledLocation || booking.eventLocation || "";
    booking.status = "Event Scheduled";
    if (creatorNotes) booking.creatorNotes = creatorNotes;
    await booking.save();

    await createNotification(
      booking.user._id,
      "📅 Event Scheduled",
      `Your ${booking.eventType} has been scheduled for ${new Date(scheduledDate).toLocaleDateString()} at ${scheduledTime || "TBD"}`,
      "booking"
    );

    res.json({ success: true, booking });
  } catch (e) {
    next(e);
  }
});

// Mark booking as completed
router.patch("/:id/complete", protect, authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    const booking = await Booking.findOne({ _id: req.params.id, creator: creator._id });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    booking.status = "Completed";
    booking.bookingStatus = "completed";
    await booking.save();

    await createNotification(
      booking.user._id,
      "✅ Booking Completed",
      `Your ${booking.eventType} has been marked as completed. Thank you!`,
      "booking"
    );

    res.json({ success: true, booking });
  } catch (e) {
    next(e);
  }
});

module.exports = router;