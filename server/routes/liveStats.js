/**
 * Live Stats & Activity Feed — Real-time platform data
 * All numbers come from actual database counts.
 * Activity feed from LiveActivity collection (auto-populated by hooks).
 */
const express = require("express");
const Creator = require("../models/Creator");
const Booking = require("../models/Booking");
const Review = require("../models/Review");
const LiveActivity = require("../models/LiveActivity");

const router = express.Router();

// GET /api/live-stats — Real platform stats + recent activity
router.get("/", async (req, res, next) => {
  try {
    const [creatorsCount, citiesAgg, bookingsCount, reviewsAgg, activities] = await Promise.all([
      Creator.countDocuments({ status: "approved", subscriptionStatus: { $in: ["active", "trial"] } }),
      Creator.aggregate([
        { $match: { status: "approved", subscriptionStatus: { $in: ["active", "trial"] } } },
        { $group: { _id: "$city" } },
        { $count: "total" },
      ]),
      Booking.countDocuments({ status: { $in: ["Completed", "Payment Approved", "Creator Accepted", "Event Scheduled"] } }),
      Review.aggregate([
        { $match: { approved: true, hidden: false } },
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]),
      LiveActivity.find().sort("-createdAt").limit(10).lean(),
    ]);

    const citiesCount = citiesAgg[0]?.total || 0;
    const reviewStats = reviewsAgg[0] || { avg: 0, count: 0 };

    res.json({
      success: true,
      stats: {
        creators: creatorsCount,
        bookings: bookingsCount,
        cities: citiesCount,
        reviews: reviewStats.count,
        avgRating: reviewStats.avg ? Math.round(reviewStats.avg * 10) / 10 : 0,
      },
      activities: activities.map(a => ({ icon: a.icon, text: a.text, time: a.createdAt })),
    });
  } catch (e) { next(e); }
});

// POST /api/live-stats/activity — Internal: push activity (called by other routes)
router.post("/activity", async (req, res, next) => {
  try {
    const { type, text, icon, city } = req.body;
    if (!type || !text) return res.status(400).json({ success: false, message: "type and text required" });
    const activity = await LiveActivity.create({ type, text, icon: icon || "📸", city: city || "" });
    res.status(201).json({ success: true, data: activity });
  } catch (e) { next(e); }
});

module.exports = router;
