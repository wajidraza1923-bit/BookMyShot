const express = require("express");
const mongoose = require("mongoose");
const Review = require("../models/Review");
const Creator = require("../models/Creator");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Get all reviews (public)
router.get("/", async (req, res, next) => {
  try {
    const reviews = await Review.find({ approved: true })
      .populate("user", "name avatar")
      .populate("creator", "specialty")
      .sort("-createdAt")
      .limit(20);
    res.json({ success: true, reviews });
  } catch (e) {
    next(e);
  }
});

// Post a review (authenticated users)
router.post("/", protect, async (req, res, next) => {
  try {
    const { creatorId, rating, title, text } = req.body;
    if (!creatorId || !rating) {
      return res.status(400).json({ success: false, message: "creatorId and rating are required" });
    }
    const r = await Review.create({ user: req.user._id, creator: creatorId, rating, title, text });
    // update creator rating simple aggregate
    const avg = await Review.aggregate([
      { $match: { creator: new mongoose.Types.ObjectId(creatorId) } },
      { $group: { _id: "$creator", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    if (avg && avg[0]) {
      await Creator.findByIdAndUpdate(creatorId, { rating: Math.round(avg[0].avg * 10) / 10, weddingsCount: avg[0].count });
    }
    res.status(201).json({ success: true, review: r });
  } catch (e) {
    next(e);
  }
});

// Get reviews for a specific creator
router.get("/creator/:id", async (req, res, next) => {
  try {
    const reviews = await Review.find({ creator: req.params.id, approved: true }).populate("user", "name avatar");
    res.json({ success: true, reviews });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
