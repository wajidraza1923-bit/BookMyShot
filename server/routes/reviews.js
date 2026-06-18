const express = require("express");
const mongoose = require("mongoose");
const Review = require("../models/Review");
const PlatformReview = require("../models/PlatformReview");
const Creator = require("../models/Creator");
const Booking = require("../models/Booking");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

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

// Get platform reviews (for homepage)
router.get("/platform", async (req, res, next) => {
  try {
    const reviews = await PlatformReview.find({ isActive: true }).populate("user", "name avatar").sort("-createdAt").limit(10);
    res.json({ success: true, data: reviews });
  } catch (e) { next(e); }
});

// ═══ USER ═══

// Submit creator review (must have completed booking or approved inquiry)
router.post("/", protect, async (req, res, next) => {
  try {
    const { creatorId, rating, title, text } = req.body;
    if (!creatorId || !rating) return res.status(400).json({ success: false, message: "Creator and rating required" });

    // Check for existing review (one per user per creator)
    const existing = await Review.findOne({ user: req.user._id, creator: creatorId });
    if (existing) return res.status(400).json({ success: false, message: "You have already reviewed this creator" });

    // Verify completed booking OR approved inquiry exists
    const booking = await Booking.findOne({ user: req.user._id, creator: creatorId, status: { $in: ["Completed", "Payment Approved"] } });
    let inquiryExists = false;
    if (!booking) {
      // Check for approved/responded inquiry
      const Inquiry = require("../models/Inquiry");
      const inquiry = await Inquiry.findOne({ user: req.user._id, creator: creatorId, status: { $in: ["approved", "responded", "contacted", "completed"] } });
      if (inquiry) inquiryExists = true;
    }

    if (!booking && !inquiryExists) {
      return res.status(403).json({ success: false, message: "You can only review creators after a completed booking or approved inquiry" });
    }

    const review = await Review.create({ user: req.user._id, creator: creatorId, booking: booking?._id, rating, title, text });

    // Update creator average rating
    const avg = await Review.aggregate([
      { $match: { creator: new mongoose.Types.ObjectId(creatorId), approved: true, hidden: false } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    if (avg[0]) await Creator.findByIdAndUpdate(creatorId, { rating: Math.round(avg[0].avg * 10) / 10, reviewCount: avg[0].count });

    res.status(201).json({ success: true, data: review });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ success: false, message: "You have already reviewed this creator" });
    next(e);
  }
});

// User edit own review
router.put("/:id", protect, async (req, res, next) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, user: req.user._id });
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });
    const { rating, title, text } = req.body;
    if (rating) review.rating = rating;
    if (title !== undefined) review.title = title;
    if (text !== undefined) review.text = text;
    await review.save();

    // Recalculate creator rating
    const avg = await Review.aggregate([
      { $match: { creator: review.creator, approved: true, hidden: false } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    if (avg[0]) await Creator.findByIdAndUpdate(review.creator, { rating: Math.round(avg[0].avg * 10) / 10, reviewCount: avg[0].count });

    res.json({ success: true, data: review });
  } catch (e) { next(e); }
});

// User delete own review
router.delete("/:id", protect, async (req, res, next) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, user: req.user._id });
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });
    const creatorId = review.creator;
    await Review.findByIdAndDelete(req.params.id);

    // Recalculate creator rating
    const avg = await Review.aggregate([
      { $match: { creator: creatorId, approved: true, hidden: false } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    if (avg[0]) {
      await Creator.findByIdAndUpdate(creatorId, { rating: Math.round(avg[0].avg * 10) / 10, reviewCount: avg[0].count });
    } else {
      await Creator.findByIdAndUpdate(creatorId, { rating: 5.0, reviewCount: 0 });
    }

    res.json({ success: true });
  } catch (e) { next(e); }
});

// Submit platform review (one per user)
router.post("/platform", protect, async (req, res, next) => {
  try {
    const { rating, text } = req.body;
    if (!rating || !text) return res.status(400).json({ success: false, message: "Rating and text required" });

    const existing = await PlatformReview.findOne({ user: req.user._id });
    if (existing) return res.status(400).json({ success: false, message: "You have already submitted a platform review" });

    const review = await PlatformReview.create({ user: req.user._id, name: req.user.name, rating, text, addedBy: "user" });
    res.status(201).json({ success: true, data: review });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ success: false, message: "Already reviewed" });
    next(e);
  }
});

// ═══ CREATOR ═══

// Get my reviews
router.get("/my-reviews", protect, authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });
    const reviews = await Review.find({ creator: creator._id }).populate("user", "name avatar").sort("-createdAt");
    const stats = await Review.aggregate([
      { $match: { creator: creator._id, approved: true, hidden: false } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 }, r1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } }, r2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } }, r3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } }, r4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } }, r5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } } } },
    ]);
    res.json({ success: true, reviews, stats: stats[0] || {} });
  } catch (e) { next(e); }
});

// Creator hide/show review
router.patch("/creator/:id/hide", protect, authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    const review = await Review.findOne({ _id: req.params.id, creator: creator._id });
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });
    review.hidden = !review.hidden;
    review.hiddenBy = review.hidden ? "creator" : "";
    await review.save();
    res.json({ success: true, data: review });
  } catch (e) { next(e); }
});

// ═══ ADMIN ═══

// Get all reviews
router.get("/admin/all", protect, authorize("admin"), async (req, res, next) => {
  try {
    const reviews = await Review.find().populate("user", "name email").populate({ path: "creator", populate: { path: "user", select: "name" } }).sort("-createdAt");
    res.json({ success: true, data: reviews });
  } catch (e) { next(e); }
});

// Admin edit review
router.put("/admin/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    res.json({ success: true, data: review });
  } catch (e) { next(e); }
});

// Admin delete review
router.delete("/admin/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { next(e); }
});

// Admin hide/restore review
router.patch("/admin/:id/visibility", protect, authorize("admin"), async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    review.hidden = !review.hidden;
    review.hiddenBy = review.hidden ? "admin" : "";
    await review.save();
    res.json({ success: true, data: review });
  } catch (e) { next(e); }
});

// Platform reviews admin CRUD
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
router.put("/admin/platform/:id", protect, authorize("admin"), async (req, res, next) => {
  try { res.json({ success: true, data: await PlatformReview.findByIdAndUpdate(req.params.id, req.body, { new: true }) }); } catch (e) { next(e); }
});
router.delete("/admin/platform/:id", protect, authorize("admin"), async (req, res, next) => {
  try { await PlatformReview.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { next(e); }
});

module.exports = router;
