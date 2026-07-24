/**
 * Reviews API — Verified reviews for creators
 */
const express = require("express");
const Review = require("../models/Review");
const Booking = require("../models/Booking");
const Creator = require("../models/Creator");
const Notification = require("../models/Notification");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// GET reviews for a creator (public)
router.get("/creator/:creatorId", async (req, res, next) => {
  try {
    const { sort = "newest", page = 1, limit = 20 } = req.query;
    const filter = { creator: req.params.creatorId, status: "active" };
    let sortObj = { createdAt: -1 };
    if (sort === "highest") sortObj = { rating: -1, createdAt: -1 };
    if (sort === "lowest") sortObj = { rating: 1, createdAt: -1 };

    const [reviews, total] = await Promise.all([
      Review.find(filter).sort(sortObj).skip((page - 1) * limit).limit(Number(limit))
        .populate("user", "name avatar"),
      Review.countDocuments(filter),
    ]);

    // Aggregate stats
    const stats = await Review.aggregate([
      { $match: { creator: require("mongoose").Types.ObjectId.createFromHexString(req.params.creatorId), status: "active" } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 }, sum5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } }, sum4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } }, sum3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } }, sum2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } }, sum1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } } } },
    ]);

    res.json({ success: true, reviews, total, page: Number(page), stats: stats[0] || { avg: 0, count: 0 } });
  } catch (e) { next(e); }
});

// POST create review (customer only, must have completed booking)
router.post("/", protect, async (req, res, next) => {
  try {
    const { bookingId, creatorId, rating, title, text, photos } = req.body;
    if (!rating) return res.status(400).json({ success: false, message: "Rating required" });
    if (rating < 1 || rating > 5) return res.status(400).json({ success: false, message: "Rating must be 1-5" });

    let targetCreatorId = creatorId;
    let targetBookingId = bookingId;

    if (bookingId) {
      // Verified review path — verify booking
      const booking = await Booking.findById(bookingId);
      if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
      if (String(booking.user) !== String(req.user._id)) return res.status(403).json({ success: false, message: "Not your booking" });
      if (booking.status !== "Completed" && booking.status !== "completed") return res.status(400).json({ success: false, message: "Can only review completed bookings" });
      targetCreatorId = booking.creator;
      // Prevent duplicate per booking
      const existing = await Review.findOne({ user: req.user._id, booking: bookingId });
      if (existing) return res.status(409).json({ success: false, message: "You already reviewed this booking" });
    } else if (creatorId) {
      // Direct review path — verify user has at least one completed booking with this creator
      const completedBooking = await Booking.findOne({ user: req.user._id, creator: creatorId, status: { $in: ["Completed", "completed"] } });
      if (!completedBooking) return res.status(403).json({ success: false, message: "Only customers with completed bookings can review" });
      targetBookingId = completedBooking._id;
      // Prevent duplicate per creator
      const existing = await Review.findOne({ user: req.user._id, creator: creatorId });
      if (existing) return res.status(409).json({ success: false, message: "You already reviewed this creator" });
    } else {
      return res.status(400).json({ success: false, message: "bookingId or creatorId required" });
    }

    const review = await Review.create({
      user: req.user._id,
      creator: targetCreatorId,
      booking: targetBookingId,
      rating,
      title: title || "",
      text: text || "",
      photos: photos || [],
    });

    // Update creator's average rating
    const allReviews = await Review.find({ creator: targetCreatorId, status: "active" });
    const avgRating = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    await Creator.findByIdAndUpdate(targetCreatorId, { rating: Math.round(avgRating * 10) / 10 });

    // Notify creator
    const creator = await Creator.findById(targetCreatorId).select("user");
    if (creator) {
      await Notification.create({ user: creator.user, title: "⭐ New Review", message: `You received a ${rating}-star review!`, type: "review", targetScreen: "CreatorReviews" });
    }

    res.status(201).json({ success: true, review });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ success: false, message: "Already reviewed" });
    next(e);
  }
});

// PATCH creator reply to review
router.patch("/:id/reply", protect, authorize("creator"), async (req, res, next) => {
  try {
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ success: false, message: "Reply text required" });
    const creator = await Creator.findOne({ user: req.user._id });
    const review = await Review.findOne({ _id: req.params.id, creator: creator._id });
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });
    review.reply = reply;
    review.repliedAt = new Date();
    await review.save();
    res.json({ success: true, review });
  } catch (e) { next(e); }
});

// POST mark review helpful
router.post("/:id/helpful", protect, async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });
    if (review.helpfulUsers.includes(req.user._id)) return res.status(400).json({ success: false, message: "Already marked" });
    review.helpfulUsers.push(req.user._id);
    review.helpfulCount = review.helpfulUsers.length;
    await review.save();
    res.json({ success: true, helpfulCount: review.helpfulCount });
  } catch (e) { next(e); }
});

// PATCH report review
router.patch("/:id/report", protect, async (req, res, next) => {
  try {
    const { reason } = req.body;
    await Review.findByIdAndUpdate(req.params.id, { status: "reported", reportReason: reason || "Inappropriate", reportedBy: req.user._id });
    res.json({ success: true, message: "Review reported" });
  } catch (e) { next(e); }
});

// ADMIN: Get all reviews with moderation
router.get("/admin/all", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};
    const reviews = await Review.find(filter).sort("-createdAt").skip((page - 1) * limit).limit(Number(limit))
      .populate("user", "name avatar").populate("creator", "specialty city");
    const total = await Review.countDocuments(filter);
    res.json({ success: true, reviews, total });
  } catch (e) { next(e); }
});

// ADMIN: Moderate review
router.patch("/admin/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["active", "hidden", "removed"].includes(status)) return res.status(400).json({ success: false, message: "Invalid status" });
    await Review.findByIdAndUpdate(req.params.id, { status });
    res.json({ success: true, message: `Review ${status}` });
  } catch (e) { next(e); }
});

module.exports = router;
