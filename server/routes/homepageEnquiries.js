const express = require("express");
const HomepageEnquiry = require("../models/HomepageEnquiry");
const Creator = require("../models/Creator");
const Notification = require("../models/Notification");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// Optional auth
async function optionalAuth(req, res, next) {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
    }
  } catch (e) { /* proceed without user */ }
  next();
}

// POST: Submit homepage enquiry (public — multi-step form)
router.post("/", optionalAuth, async (req, res, next) => {
  try {
    const {
      name, email, phone,
      eventDate, eventLocation, eventType, eventCity, venueName,
      budget, budgetRange, guestCount, specialRequirements, message,
      selectedCreatorId, selectedCreatorName,
    } = req.body;

    if (!name && !email && !phone && !eventDate && !eventLocation) {
      return res.status(400).json({ success: false, message: "Please provide enquiry details" });
    }

    const enquiryData = {
      name: name || (req.user ? req.user.name : ""),
      email: email || (req.user ? req.user.email : ""),
      phone: phone || "",
      eventDate: eventDate || undefined,
      eventLocation: eventLocation || "",
      eventType: eventType || "General Enquiry",
      eventCity: eventCity || "",
      venueName: venueName || "",
      budget: budget || 0,
      budgetRange: budgetRange || "",
      guestCount: guestCount || "",
      specialRequirements: specialRequirements || "",
      message: message || "",
      source: "homepage",
      type: "general_enquiry",
      user: req.user ? req.user._id : undefined,
    };

    // If user selected a creator
    if (selectedCreatorId) {
      enquiryData.selectedCreator = selectedCreatorId;
      enquiryData.selectedCreatorName = selectedCreatorName || "";
    }

    const enquiry = await HomepageEnquiry.create(enquiryData);

    // Notify all admins about new enquiry
    try {
      const admins = await User.find({ role: "admin" }).select("_id");
      for (const admin of admins) {
        await Notification.create({
          user: admin._id,
          type: "inquiry",
          title: "📝 New Homepage Enquiry",
          message: `${enquiryData.name || "Someone"} submitted an enquiry for ${enquiryData.eventType || "an event"}`,
          link: "/admin/dashboard.html#homepage-enquiries",
        });
      }
    } catch (notifErr) { /* don't fail request if notification fails */ }

    res.status(201).json({
      success: true,
      message: "Enquiry submitted successfully! Our team will contact you soon.",
      enquiry: { _id: enquiry._id, status: enquiry.status },
    });
  } catch (e) {
    next(e);
  }
});

// GET: Approved creators for the "Choose Your Creator" step (public)
router.get("/creators", async (req, res, next) => {
  try {
    const creators = await Creator.find({ status: "approved" })
      .populate("user", "name avatar email")
      .select("user specialty city category rating portfolio rank featured")
      .sort({ rank: 1, featured: -1, rating: -1 })
      .lean();

    const formatted = creators.map(c => ({
      _id: c._id,
      name: c.user?.name || "Creator",
      avatar: c.user?.avatar || "",
      specialty: c.specialty || c.category || "",
      city: c.city || "",
      rating: c.rating || 5,
      portfolio: (c.portfolio || []).slice(0, 1),
      featured: c.featured || false,
      rank: c.rank || 0,
    }));

    res.json({ success: true, creators: formatted });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
