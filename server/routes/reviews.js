const express = require("express");
const mongoose = require("mongoose");
const Review = require("../models/Review");
const PlatformReview = require("../models/PlatformReview");
const Creator = require("../models/Creator");
const Booking = require("../models/Booking");
const { protect, authorize } = require("../middleware/auth");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// Phone validation: exactly 10 digits, no letters
function isValidPhone(phone) {
  return /^\d{10}$/.test(phone);
}

// Optional auth middleware
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
  } catch {}
  next();
}

// Helper: recalculate creator rating
async function recalcCreatorRating(creatorId) {
  const avg = await Review.aggregate([
    { $match: { creator: new mongoose.Types.ObjectId(creatorId), approved: true, hidden: false } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  if (avg[0]) {
    await Creator.findByIdAndUpdate(creatorId, { rating: Math.round(avg[0].avg * 10) / 10, reviewCount: avg[0].count });
  } else {
    await Creator.findByIdAndUpdate(creatorId, { rating: 5.0, reviewCount: 0 });
  }
}

// ═══ PUBLIC ═══

// Get approved visible reviews for a creator
router.get("/creator/:id", async (req, res, next) => {
  try {
    const reviews = await Review.find({ creator: req.params.id, approved: true, hidden: false })
      .populate("user", "name avatar").sort("-createdAt");
    const stats = await Review.aggregate([
      { $match: { creator: new mongoose.Types.ObjectId(req.params.id), approved: true, hidden: false } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    res.json({ success: true, reviews, stats: stats[0] || { avg: 0, count: 0 } });
  } catch (e) { next(e); }
});

// Get platform reviews (for homepage/app)
router.get("/platform", async (req, res, next) => {
  try {
    const reviews = await PlatformReview.find({ isActive: true }).populate("user", "name avatar").sort("-createdAt").limit(20);
    res.json({ success: true, data: reviews });
  } catch (e) { next(e); }
});

// ═══ SUBMIT CREATOR REVIEW (Logged-in OR Guest with phone) ═══
router.post("/", optionalAuth, async (req, res, next) => {
  try {
    const { creatorId, rating, title, text, phone, name, professionalism, qualityOfWork, communication, valueForMoney, wouldRecommend, eventType } = req.body;

    if (!creatorId) return res.status(400).json({ success: false, message: "Creator is required" });
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    if (!text || text.trim().length < 5) return res.status(400).json({ success: false, message: "Please write at least a short review (5+ characters)" });

    // Verify creator exists
    const creator = await Creator.findById(creatorId);
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    // Shared review fields
    const reviewFields = {
      rating, title: title || "", text: text.trim(),
      professionalism: professionalism || 0,
      qualityOfWork: qualityOfWork || 0,
      communication: communication || 0,
      valueForMoney: valueForMoney || 0,
      wouldRecommend: wouldRecommend !== false,
      eventType: eventType || "",
    };

    // MODE A: Logged-in user
    if (req.user) {
      const existing = await Review.findOne({ user: req.user._id, creator: creatorId });
      if (existing) return res.status(400).json({ success: false, message: "You have already reviewed this creator. You can edit your existing review." });

      const review = await Review.create({ user: req.user._id, creator: creatorId, name: req.user.name, ...reviewFields });

      await recalcCreatorRating(creatorId);
      // Log activity
      try { const LA = require("../models/LiveActivity"); await LA.create({ type: "review", text: `New ${rating}★ review in ${creator.city || 'India'}`, icon: "⭐", city: creator.city }); } catch {}
      return res.status(201).json({ success: true, data: review });
    }

    // MODE B: Guest user with phone number
    if (!phone) return res.status(400).json({ success: false, message: "Phone number is required for guest reviews" });
    if (!isValidPhone(phone)) return res.status(400).json({ success: false, message: "Phone must be exactly 10 digits (numbers only, no letters)" });
    if (!name || name.trim().length < 2) return res.status(400).json({ success: false, message: "Name is required (at least 2 characters)" });

    const existingByPhone = await Review.findOne({ phone, creator: creatorId });
    if (existingByPhone) return res.status(400).json({ success: false, message: "This phone number has already submitted a review for this creator" });

    const review = await Review.create({ creator: creatorId, phone, name: name.trim(), ...reviewFields });

    await recalcCreatorRating(creatorId);
    try { const LA = require("../models/LiveActivity"); await LA.create({ type: "review", text: `New ${rating}★ review in ${creator.city || 'India'}`, icon: "⭐", city: creator.city }); } catch {}
    res.status(201).json({ success: true, data: review });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ success: false, message: "You have already reviewed this creator" });
    next(e);
  }
});

// ═══ SUBMIT PLATFORM REVIEW (Logged-in OR Guest) ═══
router.post("/platform", optionalAuth, async (req, res, next) => {
  try {
    const { rating, text, phone, name, city } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    if (!text || text.trim().length < 5) return res.status(400).json({ success: false, message: "Review text is required (5+ characters)" });

    // MODE A: Logged-in user
    if (req.user) {
      const existing = await PlatformReview.findOne({ user: req.user._id });
      if (existing) return res.status(400).json({ success: false, message: "You have already reviewed BookMyShot. You can edit your existing review." });

      const review = await PlatformReview.create({ user: req.user._id, name: req.user.name, rating, text: text.trim(), city: city || "", addedBy: "user" });
      return res.status(201).json({ success: true, data: review });
    }

    // MODE B: Guest with phone
    if (!phone) return res.status(400).json({ success: false, message: "Phone number is required for guest reviews" });
    if (!isValidPhone(phone)) return res.status(400).json({ success: false, message: "Phone must be exactly 10 digits (numbers only, no letters)" });
    if (!name || name.trim().length < 2) return res.status(400).json({ success: false, message: "Name is required" });

    const existingByPhone = await PlatformReview.findOne({ phone });
    if (existingByPhone) return res.status(400).json({ success: false, message: "This phone number has already reviewed BookMyShot" });

    const review = await PlatformReview.create({ phone, name: name.trim(), rating, text: text.trim(), city: city || "", addedBy: "guest" });
    res.status(201).json({ success: true, data: review });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ success: false, message: "Duplicate review not allowed" });
    next(e);
  }
});

// ═══ EDIT OWN REVIEW (logged-in) ═══
router.put("/:id", protect, async (req, res, next) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, user: req.user._id });
    if (!review) return res.status(404).json({ success: false, message: "Review not found or not yours" });
    const { rating, title, text } = req.body;
    if (rating && rating >= 1 && rating <= 5) review.rating = rating;
    if (title !== undefined) review.title = title;
    if (text !== undefined) review.text = text;
    await review.save();
    await recalcCreatorRating(review.creator);
    res.json({ success: true, data: review });
  } catch (e) { next(e); }
});

// ═══ DELETE OWN REVIEW (logged-in) ═══
router.delete("/:id", protect, async (req, res, next) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, user: req.user._id });
    if (!review) return res.status(404).json({ success: false, message: "Review not found or not yours" });
    const creatorId = review.creator;
    await Review.findByIdAndDelete(req.params.id);
    await recalcCreatorRating(creatorId);
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ═══ CREATOR ═══

// Get my reviews (creator dashboard)
router.get("/my-reviews", protect, authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });
    const reviews = await Review.find({ creator: creator._id }).populate("user", "name avatar").sort("-createdAt");
    const stats = await Review.aggregate([
      { $match: { creator: creator._id, approved: true, hidden: false } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 }, r1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } }, r2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } }, r3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } }, r4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } }, r5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } } } },
    ]);
    const totalReviews = reviews.length;
    const hiddenCount = reviews.filter(r => r.hidden).length;
    const visibleCount = totalReviews - hiddenCount;
    res.json({ success: true, reviews, stats: stats[0] || {}, counts: { total: totalReviews, visible: visibleCount, hidden: hiddenCount } });
  } catch (e) { next(e); }
});

// Creator hide/show review
router.patch("/creator/:id/hide", protect, authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    const review = await Review.findOne({ _id: req.params.id, creator: creator._id });
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });
    
    // If admin hid it, creator cannot unhide
    if (review.hiddenBy === "admin" && review.hidden) {
      return res.status(403).json({ success: false, message: "This review was hidden by admin and cannot be changed" });
    }
    
    review.hidden = !review.hidden;
    review.hiddenBy = review.hidden ? "creator" : "";
    await review.save();
    await recalcCreatorRating(creator._id);
    res.json({ success: true, data: review });
  } catch (e) { next(e); }
});

// Creator reply to review
router.patch("/creator/:id/reply", protect, authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    const review = await Review.findOne({ _id: req.params.id, creator: creator._id });
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });
    review.reply = req.body.reply || "";
    review.repliedAt = review.reply ? new Date() : undefined;
    await review.save();
    res.json({ success: true, data: review });
  } catch (e) { next(e); }
});

// ═══ ADMIN ═══

router.get("/admin/all", protect, authorize("admin"), async (req, res, next) => {
  try {
    const reviews = await Review.find().populate("user", "name email").populate({ path: "creator", populate: { path: "user", select: "name" } }).sort("-createdAt");
    res.json({ success: true, data: reviews });
  } catch (e) { next(e); }
});

router.put("/admin/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    res.json({ success: true, data: review });
  } catch (e) { next(e); }
});

router.delete("/admin/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (review) {
      const creatorId = review.creator;
      await Review.findByIdAndDelete(req.params.id);
      await recalcCreatorRating(creatorId);
    }
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.patch("/admin/:id/visibility", protect, authorize("admin"), async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: "Not found" });
    review.hidden = !review.hidden;
    review.hiddenBy = review.hidden ? "admin" : "";
    await review.save();
    await recalcCreatorRating(review.creator);
    res.json({ success: true, data: review });
  } catch (e) { next(e); }
});

// Platform reviews admin
router.get("/admin/platform", protect, authorize("admin"), async (req, res, next) => {
  try { res.json({ success: true, data: await PlatformReview.find().sort("-createdAt") }); } catch (e) { next(e); }
});
router.post("/admin/platform", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { name, rating, text, city, featured } = req.body;
    const review = await PlatformReview.create({ name, rating, text, city, featured, addedBy: "admin" });
    res.status(201).json({ success: true, data: review });
  } catch (e) { next(e); }
});
router.delete("/admin/platform/:id", protect, authorize("admin"), async (req, res, next) => {
  try { await PlatformReview.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { next(e); }
});

module.exports = router;
