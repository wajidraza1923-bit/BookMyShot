const express = require("express");
const Creator = require("../models/Creator");
const Booking = require("../models/Booking");
const Planning = require("../models/Planning");
const CalendarEvent = require("../models/CalendarEvent");
const Notification = require("../models/Notification");
const Inquiry = require("../models/Inquiry");
const PaymentProof = require("../models/PaymentProof");
const PaymentRecord = require("../models/PaymentRecord");
const Commission = require("../models/Commission");
const Review = require("../models/Review");
const PDFDocument = require("pdfkit");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(protect, authorize("creator"));

const getCreator = async (userId) => Creator.findOne({ user: userId });

// Dashboard analytics
router.get("/analytics", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const bookings = await Booking.find({ creator: creator._id });
    const pending = bookings.filter((b) => b.status === "Booking Created").length;
    const accepted = bookings.filter((b) => b.status === "Creator Accepted").length;
    const upcoming = bookings.filter(
      (b) =>
        ["Creator Accepted", "Payment Submitted", "Payment Approved", "Event Scheduled"].includes(b.status) &&
        new Date(b.eventDate) > new Date()
    );
    const earnings = bookings
      .filter((b) => ["Creator Accepted", "Payment Approved", "Event Scheduled", "Completed"].includes(b.status))
      .reduce((s, b) => s + (b.amount || b.budget || 0), 0);

    // Reels count from creator's videos array
    const reels = (creator.videos && creator.videos.length) || 0;

    // Reviews count from Review collection
    const reviews = await Review.countDocuments({ creator: creator._id });

    res.json({
      success: true,
      stats: { pending, accepted, upcoming: upcoming.length, earnings, reels, reviews, totalBookings: bookings.length },
      upcomingEvents: upcoming.slice(0, 5),
    });
  } catch (e) {
    next(e);
  }
});

// Planning notebook
router.get("/planning", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    let planning = await Planning.findOne({ creator: creator._id });
    if (!planning) planning = await Planning.create({ creator: creator._id });
    res.json({ success: true, planning });
  } catch (e) {
    next(e);
  }
});

router.put("/planning", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const planning = await Planning.findOneAndUpdate(
      { creator: creator._id },
      { ...req.body, lastAutoSave: new Date() },
      { new: true, upsert: true }
    );
    res.json({ success: true, planning });
  } catch (e) {
    next(e);
  }
});

// ─── PRIVATE PERSONAL CALENDAR EVENTS ──────────────────────────────────────

// Get all private calendar events (personal + event type)
router.get("/calendar/private", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const events = await CalendarEvent.find({
      creator: creator._id,
      type: { $in: ["private", "reminder", "event"] },
    }).sort("date");
    res.json({ success: true, events });
  } catch (e) {
    next(e);
  }
});

// Create a private calendar event
router.post("/calendar/private", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const eventData = {
      ...req.body,
      creator: creator._id,
      type: req.body.type || "event",
    };
    const event = await CalendarEvent.create(eventData);
    res.status(201).json({ success: true, event });
  } catch (e) {
    next(e);
  }
});

// Update a private calendar event
router.put("/calendar/private/:id", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const event = await CalendarEvent.findOneAndUpdate(
      { _id: req.params.id, creator: creator._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    res.json({ success: true, event });
  } catch (e) {
    next(e);
  }
});

// Delete a private calendar event
router.delete("/calendar/private/:id", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    await CalendarEvent.findOneAndDelete({ _id: req.params.id, creator: creator._id });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// Create a calendar event (supports both simple and detailed event types)
router.post("/calendar", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const eventData = { ...req.body, creator: creator._id };
    
    // If type is "event", ensure it has the proper structure
    if (req.body.type === "event") {
      eventData.eventDate = req.body.eventDate || req.body.date;
      eventData.bookingDate = req.body.bookingDate || new Date();
    }
    
    const event = await CalendarEvent.create(eventData);
    res.status(201).json({ success: true, event });
  } catch (e) {
    next(e);
  }
});

// Update a calendar event
router.put("/calendar/:id", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const event = await CalendarEvent.findOneAndUpdate(
      { _id: req.params.id, creator: creator._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    res.json({ success: true, event });
  } catch (e) {
    next(e);
  }
});

router.delete("/calendar/:id", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    await CalendarEvent.findOneAndDelete({ _id: req.params.id, creator: creator._id });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// Public availability calendar
router.get("/calendar/availability", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const events = await CalendarEvent.find({
      creator: creator._id,
      type: { $in: ["unavailable", "booking"] },
    }).sort("date");
    res.json({ success: true, events });
  } catch (e) {
    next(e);
  }
});

// ─── BOOKING REQUESTS (for creator dashboard) ──────────────────────────────

// Get all booking requests for the creator
router.get("/booking-requests", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const bookings = await Booking.find({ creator: creator._id })
      .populate("user", "name email phone avatar")
      .sort("-createdAt");
    res.json({ success: true, bookings });
  } catch (e) {
    next(e);
  }
});

// Accept/reject/confirm booking request
router.patch("/booking-requests/:id", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const booking = await Booking.findOne({ _id: req.params.id, creator: creator._id });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    const { status, amount } = req.body;
    booking.status = status;
    if (amount) booking.amount = amount;
    await booking.save();

    // Create notification for user
    await Notification.create({
      user: booking.user,
      title: "Booking Update",
      message: `Your booking has been ${status}`,
      type: "booking",
    });

    res.json({ success: true, booking });
  } catch (e) {
    next(e);
  }
});

// ─── PACKAGE MANAGEMENT ────────────────────────────────────────────────────

// Get packages for the creator
router.get("/packages", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    res.json({ success: true, packages: creator.packages || [] });
  } catch (e) {
    next(e);
  }
});

// Add a single package
router.post("/packages", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const { name, price, description, features } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Package name is required" });
    creator.packages.push({ name, price: price || 0, description: description || "", features: features || [] });
    await creator.save();
    res.status(201).json({ success: true, packages: creator.packages });
  } catch (e) {
    next(e);
  }
});

// Save packages (bulk replace)
router.put("/packages", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    creator.packages = req.body.packages || [];
    await creator.save();
    res.json({ success: true, packages: creator.packages });
  } catch (e) {
    next(e);
  }
});

// Delete a single package by ID
router.delete("/packages/:id", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    creator.packages = creator.packages.filter(
      (pkg) => pkg._id.toString() !== req.params.id
    );
    await creator.save();
    res.json({ success: true, packages: creator.packages });
  } catch (e) {
    next(e);
  }
});

// ─── PROFILE IMAGE UPLOAD ──────────────────────────────────────────────────

// Upload profile image (avatar)
router.post("/upload/profile-image", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ success: false, message: "No image URL provided" });
    
    let finalUrl = imageUrl;
    let publicId = "";
    
    // If it's a base64 data URL, upload to Cloudinary
    if (imageUrl.startsWith("data:")) {
      try {
        const { uploadBase64, deleteFile, isConfigured } = require("../services/cloudinaryService");
        if (isConfigured()) {
          const result = await uploadBase64(imageUrl, { folder: "bookmyshot/avatars" });
          finalUrl = result.url;
          publicId = result.publicId;
          
          // Delete old avatar from Cloudinary
          const User = require("../models/User");
          const existingUser = await User.findById(req.user._id).select("avatarPublicId");
          if (existingUser && existingUser.avatarPublicId) {
            await deleteFile(existingUser.avatarPublicId, "image");
          }
        }
      } catch (uploadErr) {
        console.error("[Creator] Profile image Cloudinary upload failed:", uploadErr.message);
      }
    }
    
    // Update the user's avatar
    const User = require("../models/User");
    await User.findByIdAndUpdate(req.user._id, { avatar: finalUrl, avatarPublicId: publicId || undefined });
    
    res.json({ success: true, url: finalUrl });
  } catch (e) {
    next(e);
  }
});

// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────

router.get("/notifications", async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort("-createdAt").limit(50);
    res.json({ success: true, notifications });
  } catch (e) {
    next(e);
  }
});

router.patch("/notifications/read", async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id }, { read: true });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// Download booking PDF
router.get("/bookings/:id/pdf", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const booking = await Booking.findOne({ _id: req.params.id, creator: creator._id }).populate("user");
    if (!booking) return res.status(404).json({ success: false, message: "Not found" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=booking-${booking._id}.pdf`);

    const doc = new PDFDocument();
    doc.pipe(res);
    doc.fontSize(20).text("BookMyShot — Booking Details", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Client: ${booking.clientName}`);
    doc.text(`Email: ${booking.clientEmail}`);
    doc.text(`Phone: ${booking.clientPhone}`);
    doc.text(`Event: ${booking.eventType}`);
    doc.text(`Date: ${new Date(booking.eventDate).toLocaleDateString()}`);
    doc.text(`Location: ${booking.eventLocation}`);
    doc.text(`Budget: $${booking.budget}`);
    doc.text(`Status: ${booking.status}`);
    doc.text(`Notes: ${booking.creatorNotes || booking.message}`);
    doc.end();
  } catch (e) {
    next(e);
  }
});

// Toggle dark mode preference
router.patch("/settings", async (req, res, next) => {
  try {
    const creator = await Creator.findOneAndUpdate(
      { user: req.user._id },
      { darkMode: req.body.darkMode },
      { new: true }
    );
    res.json({ success: true, creator });
  } catch (e) {
    next(e);
  }
});

// ─── LEADS / INQUIRIES ──────────────────────────────────────────────────────

// Get all leads (inquiries) for the creator
router.get("/leads", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const inquiries = await Inquiry.find({ creator: creator._id })
      .populate("user", "name email phone avatar")
      .sort("-createdAt");
    res.json({ success: true, inquiries });
  } catch (e) {
    next(e);
  }
});

// Update lead status
router.patch("/leads/:id", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const inquiry = await Inquiry.findOneAndUpdate(
      { _id: req.params.id, creator: creator._id },
      { status: req.body.status },
      { new: true }
    );
    if (!inquiry) return res.status(404).json({ success: false, message: "Lead not found" });
    res.json({ success: true, inquiry });
  } catch (e) {
    next(e);
  }
});

// ─── INQUIRY REPLY ────────────────────────────────────────────────────────────

// Creator creates an inquiry + booking directly (for offline clients)
router.post("/inquiries", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const { name, phone, city, eventType, eventDate, budget, message, email } = req.body;

    if (!name || !eventType || !eventDate) {
      return res.status(400).json({ success: false, message: "Name, event type, and date are required" });
    }

    // Create the inquiry (auto-accepted, created by creator)
    const inquiry = await Inquiry.create({
      user: req.user._id, // Link to creator's own user account as placeholder
      creator: creator._id,
      name,
      phone: phone || "Not provided",
      city: city || "",
      eventType,
      eventDate,
      budget: budget || 0,
      message: message || "",
      status: "accepted",
      contactUnlocked: true,
    });

    // Create booking directly (auto-accepted, no approval needed)
    const booking = await Booking.create({
      user: req.user._id, // Creator's user ID (marks this as creator-created)
      creator: creator._id,
      clientName: name,
      clientEmail: email || `${name.toLowerCase().replace(/\s+/g, '')}@offline.bookmyshot.app`,
      clientPhone: phone || "Not provided",
      eventType,
      eventDate,
      eventLocation: city || "",
      budget: budget || 0,
      message: message || "",
      status: "Creator Accepted",
      amount: budget || 0,
      creatorNotes: "Created by creator",
      invoiceNumber: `BMS-CRT-${Date.now()}`,
      leadSource: "creator",
    });

    res.status(201).json({ success: true, inquiry, booking });
  } catch (e) {
    next(e);
  }
});

// Reply to an inquiry (update status)
router.patch("/inquiries/:id/reply", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const inquiry = await Inquiry.findOne({ _id: req.params.id, creator: creator._id });
    if (!inquiry) return res.status(404).json({ success: false, message: "Inquiry not found" });
    inquiry.status = req.body.status || "replied";
    await inquiry.save();

    // If accepted AND inquiry has a linked user, create a Booking automatically
    let createdBooking = null;
    if (inquiry.status === "accepted" && inquiry.user) {
      // Check if a booking already exists for this inquiry's user + creator + date
      const existingBooking = await Booking.findOne({
        user: inquiry.user,
        creator: creator._id,
        eventDate: inquiry.eventDate,
        eventType: inquiry.eventType,
      });

      if (!existingBooking) {
        createdBooking = await Booking.create({
          user: inquiry.user,
          creator: creator._id,
          clientName: inquiry.name,
          clientEmail: `${inquiry.name.toLowerCase().replace(/\s+/g, '')}@bookmyshot.app`,
          clientPhone: inquiry.phone || "Not provided",
          eventType: inquiry.eventType || "Event",
          eventDate: inquiry.eventDate,
          eventLocation: inquiry.city || "",
          budget: inquiry.budget || 0,
          message: inquiry.message || "",
          status: "Creator Accepted",
          amount: inquiry.budget || 0,
          invoiceNumber: `BMS-INQ-${Date.now()}`,
          leadSource: "bookmyshot",
        });
      }
    }

    // Notify user
    if (inquiry.user) {
      await Notification.create({
        user: inquiry.user,
        title: inquiry.status === "accepted"
          ? "✅ Inquiry Accepted"
          : inquiry.status === "rejected"
            ? "❌ Inquiry Declined"
            : "📩 Inquiry Update",
        message: inquiry.status === "accepted"
          ? `Your inquiry for ${inquiry.eventType} has been accepted! A booking has been created.`
          : inquiry.status === "rejected"
            ? `Your inquiry for ${inquiry.eventType} has been declined.`
            : `Your inquiry has been updated to: ${inquiry.status}`,
        type: "inquiry",
      });
    }

    res.json({ success: true, inquiry, booking: createdBooking });
  } catch (e) {
    next(e);
  }
});

// ─── PAYMENT PROOFS ─────────────────────────────────────────────────────────

// Get payment proofs for creator's bookings
router.get("/payment-proofs", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const proofs = await PaymentProof.find({ creator: creator._id })
      .populate("user", "name email phone")
      .populate({ path: "booking", select: "eventType eventDate clientName" })
      .populate({ path: "inquiry", select: "eventType eventDate name budget" })
      .sort("-createdAt");
    res.json({ success: true, proofs });
  } catch (e) {
    next(e);
  }
});

// Verify or reject payment proof (creator action)
router.patch("/payment-proofs/:id/verify", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const proof = await PaymentProof.findOne({ _id: req.params.id, creator: creator._id });
    if (!proof) return res.status(404).json({ success: false, message: "Payment proof not found" });
    proof.status = req.body.status; // "verified" or "rejected"
    if (req.body.status === "rejected" && req.body.adminNote) {
      proof.reason = req.body.adminNote;
    }
    await proof.save();

    console.log("[PaymentProof Verify] Proof ID:", proof._id.toString(), "| Status:", req.body.status, "| Amount:", proof.amount, "| Booking:", proof.booking ? proof.booking.toString() : "NONE");

    // Update booking payment status and create unified payment record
    const booking = await Booking.findById(proof.booking);
    if (booking) {
      if (req.body.status === "verified") {
        console.log("[PaymentProof Verify] Creating PaymentRecord for booking:", booking._id.toString());

        // Create a PaymentRecord so this proof appears in unified payment history
        // Use proof._id in notes to prevent duplicates if re-approved
        const proofIdStr = proof._id.toString();
        const existingRecord = await PaymentRecord.findOne({
          booking: proof.booking,
          addedBy: "user",
          notes: { $regex: proofIdStr },
        });

        console.log("[PaymentProof Verify] Existing record found:", !!existingRecord);

        if (!existingRecord) {
          // Store proof screenshot for thumbnail display in payment history
          const newRecord = await PaymentRecord.create({
            booking: proof.booking,
            user: proof.user,
            creator: creator._id,
            amount: proof.amount,
            paymentType: "partial",
            notes: "Payment proof #" + proofIdStr + (proof.note ? " - " + proof.note : ""),
            proof: proof.screenshot || "",
            addedBy: "user",
            status: "approved",
          });
          console.log("[PaymentProof Verify] PaymentRecord CREATED:", newRecord._id.toString());
        }

        // Recalculate from payment records (single source of truth)
        const records = await PaymentRecord.find({ booking: proof.booking, status: "approved" });
        const totalPaid = records.reduce((s, r) => s + r.amount, 0);
        console.log("[PaymentProof Verify] Recalc: approved records =", records.length, "| totalPaid =", totalPaid);
        booking.advancePaid = totalPaid;
        booking.remaining = Math.max(0, (booking.amount || booking.budget || 0) - totalPaid);
        booking.paymentStatus = booking.remaining === 0 && totalPaid > 0 ? "paid" : "partial";
        booking.status = "Payment Approved";
      } else {
        booking.paymentStatus = "rejected";
        // Revert to Creator Accepted so user can resubmit
        booking.status = "Creator Accepted";
      }
      await booking.save();
      console.log("[PaymentProof Verify] Booking saved. advancePaid:", booking.advancePaid, "| remaining:", booking.remaining, "| paymentStatus:", booking.paymentStatus);
    } else {
      console.log("[PaymentProof Verify] ERROR: Booking NOT FOUND for proof.booking:", proof.booking);
    }
    await Notification.create({
      user: proof.user,
      title: req.body.status === "verified"
        ? "✅ Payment Approved"
        : "❌ Payment Rejected",
      message: req.body.status === "verified"
        ? `Your payment of ₹${proof.amount} has been approved.`
        : `Your payment of ₹${proof.amount} has been rejected. Please upload a new payment proof.`,
      type: "payment",
    });
    res.json({ success: true, proof, booking });
  } catch (e) {
    console.error("[PaymentProof Verify] ERROR:", e.message, e.stack);
    next(e);
  }
});

// Mark booking as completed
router.patch("/bookings/:id/complete", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const booking = await Booking.findOne({ _id: req.params.id, creator: creator._id });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    booking.status = "completed";
    booking.bookingStatus = "completed";
    await booking.save();
    const Notification = require("../models/Notification");
    await Notification.create({
      user: booking.user,
      title: "✅ Booking Completed",
      message: `Your ${booking.eventType} has been marked as completed. Thank you!`,
      type: "booking",
    });
    res.json({ success: true, booking });
  } catch (e) {
    next(e);
  }
});

// ─── COMMISSIONS / EARNINGS ─────────────────────────────────────────────────

// Get creator's commission earnings
router.get("/earnings", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const commissions = await Commission.find({ creator: creator._id })
      .populate({ path: "booking", select: "eventType eventDate clientName" })
      .sort("-createdAt");
    const total = commissions.reduce((sum, c) => sum + (c.creatorEarning || 0), 0);
    const pending = commissions
      .filter((c) => c.status === "pending")
      .reduce((sum, c) => sum + (c.creatorEarning || 0), 0);
    const completed = commissions
      .filter((c) => c.status === "paid")
      .reduce((sum, c) => sum + (c.creatorEarning || 0), 0);
    res.json({
      success: true,
      earnings: { total, pending, completed },
      commissions,
      totalEarnings: total,
      pendingEarnings: pending,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
