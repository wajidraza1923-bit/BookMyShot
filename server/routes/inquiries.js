const express = require("express");
const Inquiry = require("../models/Inquiry");
const Creator = require("../models/Creator");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// Optional auth - populate req.user if token exists, but don't reject if missing
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
  } catch (e) {
    // Token invalid or expired — proceed without user
  }
  next();
}

// Create an inquiry (public - anyone can submit from portfolio page)
router.post("/", optionalAuth, async (req, res, next) => {
  try {
    const { creatorId, name, email, phone, city, eventType, eventDate, budget, message } = req.body;
    if (!creatorId || !name || !email) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const creator = await Creator.findById(creatorId);
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    // Block inquiries to expired/suspended creators
    if (!["active", "trial"].includes(creator.subscriptionStatus)) {
      return res.status(403).json({ success: false, message: "This creator is currently unavailable" });
    }

    const inquiry = await Inquiry.create({
      user: req.user ? req.user._id : undefined,
      creator: creatorId,
      name,
      phone: phone || "Not provided",
      city: city || "",
      eventType: eventType || "General Inquiry",
      eventDate: eventDate || new Date(),
      budget: budget || 0,
      message: message || "",
      contactUnlocked: true,
    });

    // Notify creator
    await Notification.create({
      user: creator.user,
      title: "📩 New Inquiry",
      message: `${name} sent you an inquiry for ${eventType}`,
      type: "inquiry",
    });

    // Return creator contact details since inquiry was submitted
    const creatorUser = await require("../models/User").findById(creator.user).select("name email phone avatar");

    res.status(201).json({
      success: true,
      inquiry,
      unlockedContact: {
        name: creatorUser?.name,
        email: creatorUser?.email,
        phone: creatorUser?.phone,
        whatsapp: creator.social?.instagram ? `https://wa.me/${creatorUser?.phone}` : null,
      },
    });
  } catch (e) {
    next(e);
  }
});

// Get user's inquiries
router.get("/my", protect, async (req, res, next) => {
  try {
    const inquiries = await Inquiry.find({ user: req.user._id })
      .populate({ path: "creator", populate: { path: "user", select: "name avatar phone" } })
      .sort("-createdAt");
    res.json({ success: true, inquiries });
  } catch (e) {
    next(e);
  }
});

// Get inquiries for a creator (creator dashboard)
router.get("/creator", protect, async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(403).json({ success: false, message: "Creator profile not found" });

    const inquiries = await Inquiry.find({ creator: creator._id })
      .populate("user", "name email phone avatar")
      .sort("-createdAt");
    res.json({ success: true, inquiries });
  } catch (e) {
    next(e);
  }
});

// Update inquiry status (creator)
router.patch("/:id/status", protect, async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    const inquiry = await Inquiry.findOne({ _id: req.params.id, creator: creator?._id });
    if (!inquiry) return res.status(404).json({ success: false, message: "Inquiry not found" });

    inquiry.status = req.body.status || inquiry.status;
    await inquiry.save();

    // Notify user
    await Notification.create({
      user: inquiry.user,
      title: "📋 Inquiry Update",
      message: `Your inquiry status has been updated to "${inquiry.status}"`,
      type: "inquiry",
    });

    res.json({ success: true, inquiry });
  } catch (e) {
    next(e);
  }
});

// Get all inquiries (admin)
router.get("/all", protect, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ success: false, message: "Admin only" });
    const inquiries = await Inquiry.find()
      .populate("user", "name email phone")
      .populate({ path: "creator", populate: { path: "user", select: "name" } })
      .sort("-createdAt");
    res.json({ success: true, inquiries });
  } catch (e) {
    next(e);
  }
});

module.exports = router;