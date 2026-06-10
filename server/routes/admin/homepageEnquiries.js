const express = require("express");
const HomepageEnquiry = require("../../models/HomepageEnquiry");
const Creator = require("../../models/Creator");
const Booking = require("../../models/Booking");
const Notification = require("../../models/Notification");
const User = require("../../models/User");

const router = express.Router();

// GET: All homepage enquiries (admin only)
router.get("/", async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;

    const enquiries = await HomepageEnquiry.find(filter)
      .populate("user", "name email phone")
      .populate({ path: "selectedCreator", populate: { path: "user", select: "name" } })
      .populate({ path: "forwardedTo", populate: { path: "user", select: "name" } })
      .sort({ createdAt: -1 })
      .lean();

    // Stats
    const allCount = await HomepageEnquiry.countDocuments({});
    const totalNew = await HomepageEnquiry.countDocuments({ status: "new" });
    const totalContacted = await HomepageEnquiry.countDocuments({ status: "contacted" });
    const totalForwarded = await HomepageEnquiry.countDocuments({ status: "forwarded" });
    const totalClosed = await HomepageEnquiry.countDocuments({ status: "closed" });

    res.json({
      success: true,
      enquiries,
      stats: { total: allCount, new: totalNew, contacted: totalContacted, forwarded: totalForwarded, closed: totalClosed },
    });
  } catch (e) {
    next(e);
  }
});

// PATCH: Update enquiry status (admin only)
router.patch("/:id", async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;
    const enquiry = await HomepageEnquiry.findById(req.params.id);
    if (!enquiry) return res.status(404).json({ success: false, message: "Enquiry not found" });

    if (status) enquiry.status = status;
    if (adminNotes !== undefined) enquiry.adminNotes = adminNotes;
    await enquiry.save();

    res.json({ success: true, enquiry });
  } catch (e) {
    next(e);
  }
});

// POST: Forward enquiry to a creator (admin only)
// Creates a Booking for the creator with leadSource = "bookmyshot" (platform commission applies)
router.post("/:id/forward", async (req, res, next) => {
  try {
    const { creatorId } = req.body;
    const enquiry = await HomepageEnquiry.findById(req.params.id);
    if (!enquiry) return res.status(404).json({ success: false, message: "Enquiry not found" });

    // Determine target creator: manually chosen or user's selected creator
    const targetCreatorId = creatorId || (enquiry.selectedCreator ? enquiry.selectedCreator.toString() : null);
    if (!targetCreatorId) {
      return res.status(400).json({ success: false, message: "No creator specified. Select a creator to forward to." });
    }

    const creator = await Creator.findById(targetCreatorId).populate("user", "name email");
    if (!creator || creator.status !== "approved") {
      return res.status(400).json({ success: false, message: "Creator not found or not approved" });
    }

    // Find or create a system user for the booking
    let systemUser = await User.findOne({ email: enquiry.email || "homepage@bookmyshot.in" });
    if (!systemUser && enquiry.email) {
      systemUser = await User.findOne({ email: enquiry.email });
    }
    // Use admin as fallback user
    if (!systemUser) {
      systemUser = await User.findOne({ role: "admin" });
    }

    // Get commission settings
    const configService = require("../../services/configService");
    const commSettings = await configService.getCommissionSettings();
    const commPercent = commSettings.bmsLeadCommissionPercent || 5;

    // Create booking for the creator
    const booking = await Booking.create({
      user: systemUser._id,
      creator: targetCreatorId,
      clientName: enquiry.name || "Homepage Enquiry",
      clientEmail: enquiry.email || "",
      clientPhone: enquiry.phone || "",
      eventType: enquiry.eventType || "General",
      eventDate: enquiry.eventDate || new Date(),
      eventLocation: enquiry.eventLocation || enquiry.venueName || "",
      budget: enquiry.budget || 0,
      message: `[Forwarded by Admin from Homepage Enquiry]\n${enquiry.message || ""}\nVenue: ${enquiry.venueName || "—"}\nGuests: ${enquiry.guestCount || "—"}\nSpecial: ${enquiry.specialRequirements || "—"}`,
      status: "Booking Created",
      invoiceNumber: `BMS-HE-${Date.now()}`,
      leadSource: "bookmyshot",
      commissionPercent: commPercent,
      creatorNotes: "Forwarded from homepage enquiry by admin",
    });

    // Update enquiry status
    enquiry.status = "forwarded";
    enquiry.forwardedTo = targetCreatorId;
    enquiry.forwardedAt = new Date();
    enquiry.forwardedBookingId = booking._id;
    await enquiry.save();

    // Notify creator
    await Notification.create({
      user: creator.user._id,
      title: "📩 New Enquiry (Admin Forwarded)",
      message: `Admin forwarded a homepage enquiry from ${enquiry.name || "a customer"}. Event: ${enquiry.eventType || "General"}.`,
      type: "booking",
    });

    res.json({
      success: true,
      message: `Enquiry forwarded to ${creator.user.name}`,
      booking: { _id: booking._id, status: booking.status },
    });
  } catch (e) {
    next(e);
  }
});

// DELETE: Delete an enquiry (admin only)
router.delete("/:id", async (req, res, next) => {
  try {
    await HomepageEnquiry.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Enquiry deleted" });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
