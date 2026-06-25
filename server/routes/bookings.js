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
      highestBudget: budget || 0,
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
      const newAmount = amount || booking.budget || 0;
      booking.amount = newAmount;
      booking.remaining = newAmount;
      // Track highest budget — never decreases
      if (newAmount > (booking.highestBudget || 0)) {
        booking.highestBudget = newAmount;
      }
      if (creatorNotes) booking.creatorNotes = creatorNotes;

      // Immediately calculate commission (highest amount wins, no payment dependency)
      if (newAmount > 0) {
        const configService = require("../services/configService");
        const commSettings = await configService.getCommissionSettings();
        const leadSource = booking.leadSource || "bookmyshot";
        const commPercent = leadSource === "creator"
          ? (commSettings.creatorLeadCommissionPercent || 3)
          : (commSettings.bmsLeadCommissionPercent || 5);
        const previousHighest = booking.commissionLockedAmount || 0;

        if (newAmount > previousHighest) {
          const commAmount = Math.round((newAmount * commPercent) / 100);
          booking.commissionPercent = commPercent;
          booking.commissionAmount = commAmount;
          booking.commissionLockedAmount = newAmount;
          booking.commissionLocked = true;
          booking.creatorReceivable = newAmount - commAmount;
          booking.commissionStatus = "pending";

          // Create/update Commission record immediately
          const Commission = require("../models/Commission");
          let commission = await Commission.findOne({ booking: booking._id });
          if (commission) {
            commission.totalAmount = newAmount;
            commission.highestDealAmount = newAmount;
            commission.commissionPercent = commPercent;
            commission.commissionAmount = commAmount;
            commission.creatorEarning = newAmount - commAmount;
            if (commission.status === "cancelled") commission.status = "pending";
            await commission.save();
          } else {
            await Commission.create({
              booking: booking._id,
              creator: booking.creator,
              user: booking.user,
              totalAmount: newAmount,
              highestDealAmount: newAmount,
              leadSource,
              commissionPercent: commPercent,
              commissionAmount: commAmount,
              creatorEarning: newAmount - commAmount,
              status: "pending",
            });
          }
        } else {
          booking.creatorReceivable = newAmount - (booking.commissionAmount || 0);
        }
      }
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

    // Send detailed notification to user based on status
    const Notification = require("../models/Notification");
    const creatorName = booking.creator?.user?.name || "Creator";
    let notifTitle = "Booking Updated";
    let notifMsg = `Your booking status is now: ${booking.status}`;
    
    if (status === "Creator Accepted") {
      notifTitle = "✅ Inquiry Accepted";
      notifMsg = `${creatorName} accepted your inquiry. Amount: ₹${booking.amount?.toLocaleString('en-IN') || booking.budget}`;
    } else if (status === "rejected") {
      notifTitle = "❌ Inquiry Rejected";
      notifMsg = `${creatorName} has rejected your inquiry.${booking.creatorNotes ? ' Reason: ' + booking.creatorNotes : ''}`;
    } else if (status === "Completed") {
      notifTitle = "🎉 Booking Completed";
      notifMsg = `Your booking with ${creatorName} has been marked as completed!`;
    } else if (status === "cancelled") {
      notifTitle = "🚫 Booking Cancelled";
      notifMsg = `Your booking with ${creatorName} has been cancelled.`;
    }

    await Notification.create({
      user: booking.user._id || booking.user,
      type: "booking",
      title: notifTitle,
      message: notifMsg,
      targetScreen: "Bookings",
      targetId: booking._id.toString(),
    });

    // Real-time update
    try {
      const socketService = require("../services/socketService");
      const userId = (booking.user._id || booking.user).toString();
      const creatorUserId = booking.creator?.user?._id?.toString() || "";
      socketService.notifyBookingUpdate(userId, creatorUserId, { bookingId: booking._id, status: booking.status });
      socketService.emitToRole("admin", "dashboard:refresh", { type: "booking" });
    } catch (e) {}

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