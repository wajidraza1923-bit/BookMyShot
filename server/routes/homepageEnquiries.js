const express = require("express");
const HomepageEnquiry = require("../models/HomepageEnquiry");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// Optional auth — populate req.user if token exists
async function optionalAuth(req, res, next) {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "REDACTED_JWT_DEV_SECRET");
      req.user = await User.findById(decoded.id).select("-password");
    }
  } catch (e) { /* proceed without user */ }
  next();
}

// POST: Submit a homepage enquiry (public — no auth required)
router.post("/", optionalAuth, async (req, res, next) => {
  try {
    const { name, email, phone, eventDate, eventLocation, eventType, message, budget } = req.body;

    if (!eventDate && !eventLocation && !message) {
      return res.status(400).json({ success: false, message: "Please provide at least a date, location, or message" });
    }

    const enquiry = await HomepageEnquiry.create({
      name: name || (req.user ? req.user.name : ""),
      email: email || (req.user ? req.user.email : ""),
      phone: phone || "",
      eventDate: eventDate || undefined,
      eventLocation: eventLocation || "",
      eventType: eventType || "General Enquiry",
      message: message || "",
      budget: budget || 0,
      source: "homepage",
      type: "general_enquiry",
      user: req.user ? req.user._id : undefined,
    });

    res.status(201).json({
      success: true,
      message: "Enquiry submitted successfully! Our team will contact you soon.",
      enquiry: { _id: enquiry._id, status: enquiry.status },
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
