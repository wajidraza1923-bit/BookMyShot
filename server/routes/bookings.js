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

    // Fetch current Master Settings for commission & cashback snapshot
    const MasterSettings = require("../models/MasterSettings");
    let masterSettings = await MasterSettings.findOne();
    if (!masterSettings) masterSettings = { bookingCommission: 2.5, cashbackPercentage: 2.5, cashbackDeadlineDays: 30 };
    const commissionPct = masterSettings.bookingCommission || 2.5;
    const cashbackPct = masterSettings.cashbackPercentage || 2.5;
    const deadlineDaysSnapshot = masterSettings.cashbackDeadlineDays || 30;
    const bookingAmount = budget || 0;
    const commissionAmt = Math.round((bookingAmount * commissionPct) / 100);
    const cashbackAmt = Math.round((bookingAmount * cashbackPct) / 100);

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
      // Snapshot Master Settings at creation time (never changes)
      commissionPercentUsed: commissionPct,
      commissionPercent: commissionPct,
      commissionAmount: commissionAmt,
      cashbackPercentUsed: cashbackPct,
      cashbackAmount: cashbackAmt,
      cashbackDeadlineDaysUsed: deadlineDaysSnapshot,
      bookingFeePercent: commissionPct,
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

// ═══ EDIT BOOKING AMOUNT (Creator or Customer) ═══
// Rules: 
// - Creator can edit while status is "Booking Created" (pending) only
// - Customer can edit while advance payment NOT yet paid
// - After advance payment → amount is LOCKED permanently
router.patch("/:id/edit-amount", protect, async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be a positive number" });
    }

    const booking = await Booking.findById(req.params.id).populate("creator");
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    // Check if amount is locked (advance paid)
    if (booking.amountLocked || booking.bookingFeePaid) {
      return res.status(400).json({ success: false, message: "Amount is locked — advance payment has been completed. Cannot edit." });
    }

    // Determine who is editing
    const isCreator = booking.creator && (await Creator.findOne({ user: req.user._id, _id: booking.creator._id || booking.creator }));
    const isCustomer = booking.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isCreator && !isCustomer && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized to edit this booking" });
    }

    // Creator can only edit if status is "Booking Created" (pending)
    if (isCreator && booking.status !== "Booking Created") {
      return res.status(400).json({ success: false, message: "Creator can only edit amount while inquiry is pending (before accept/decline)" });
    }

    const oldAmount = booking.budget || booking.amount || 0;
    const newAmount = Number(amount);
    const changedBy = req.user.name || req.user.email || "Unknown";
    const changedByRole = isCreator ? "creator" : isCustomer ? "customer" : "admin";

    // Save history
    if (!booking.amountHistory) booking.amountHistory = [];
    booking.amountHistory.push({ oldAmount, newAmount, changedBy, changedByRole, changedAt: new Date() });

    // Update amount
    booking.budget = newAmount;
    booking.amount = newAmount;
    if (newAmount > (booking.highestBudget || 0)) booking.highestBudget = newAmount;
    await booking.save();

    // Notify the other party
    const Notification = require("../models/Notification");
    if (isCreator) {
      await Notification.create({ user: booking.user, type: "booking", title: "💰 Booking Amount Updated", message: `Creator updated booking amount to ₹${newAmount.toLocaleString('en-IN')}`, targetScreen: "Bookings", targetId: booking._id.toString() });
    } else if (isCustomer) {
      const creatorDoc = await Creator.findById(booking.creator).select("user");
      if (creatorDoc) await Notification.create({ user: creatorDoc.user, type: "booking", title: "💰 Booking Amount Updated", message: `Customer updated booking amount to ₹${newAmount.toLocaleString('en-IN')}`, targetScreen: "CreatorBookings", targetId: booking._id.toString() });
    }

    res.json({ success: true, message: `Amount updated to ₹${newAmount.toLocaleString('en-IN')}`, booking: { _id: booking._id, budget: booking.budget, amount: booking.amount, amountLocked: booking.amountLocked } });
  } catch (e) { next(e); }
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
      // Track highest budget â€” never decreases
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
          ? (commSettings.inquiryCommissionPercent || commSettings.creatorLeadCommissionPercent || 3)
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

    // ═══ AUTO-CANCEL CASHBACK on booking cancellation/rejection ═══
    if (status === "cancelled" || status === "rejected") {
      try {
        const CashbackTransaction = require("../models/CashbackTransaction");
        const cashbackTx = await CashbackTransaction.findOne({ booking: booking._id });
        if (cashbackTx && cashbackTx.status === "credited") {
          cashbackTx.status = "cancelled";
          cashbackTx.notes = `Auto-cancelled: Booking ${status} on ${new Date().toISOString().split('T')[0]}`;
          await cashbackTx.save();
        }
      } catch (cbErr) { console.error("Cashback reversal error:", cbErr.message); }
    }

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
      notifTitle = "ðŸŽ‰ Booking Completed";
      notifMsg = `Your booking with ${creatorName} has been marked as completed!`;
    } else if (status === "cancelled") {
      notifTitle = "ðŸš« Booking Cancelled";
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

    // ═══ AUTO-CREATE CHAT: System message when booking is accepted ═══
    if (status === "Creator Accepted") {
      try {
        const Message = require("../models/Message");
        const creatorUserId = booking.creator?.user?._id || booking.creator?.user;
        const bookingUserId = booking.user._id || booking.user;
        if (creatorUserId && bookingUserId) {
          await Message.create({
            booking: booking._id,
            sender: creatorUserId,
            receiver: bookingUserId,
            content: `Booking accepted! You can now chat about ${booking.eventType || "this booking"} details here.`,
            messageType: "system",
          });
        }
      } catch (e) { console.log("[Chat] System message creation failed (non-fatal):", e.message); }
    }

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
    const isReschedule = booking.scheduledDate != null;

    booking.status = "Event Scheduled";
    if (creatorNotes) booking.creatorNotes = creatorNotes;
    await booking.save();

    if (isReschedule) {
      const Notification = require("../models/Notification");
      await Notification.create({
        user: booking.user._id,
        type: "booking",
        title: "📅 Booking Rescheduled",
        message: `Your ${booking.eventType} has been rescheduled to ${new Date(scheduledDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} at ${scheduledTime || "TBD"}`,
        targetScreen: "BookingDetail",
        targetId: booking._id.toString(),
      });
    } else {
      await createNotification(
      booking.user._id,
      "ðŸ“… Event Scheduled",
      `Your ${booking.eventType} has been scheduled for ${new Date(scheduledDate).toLocaleDateString()} at ${scheduledTime || "TBD"}`,
      "booking"
    );
    }

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
