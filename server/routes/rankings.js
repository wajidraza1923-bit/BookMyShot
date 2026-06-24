/**
 * Public Rankings API — Used by website and mobile app
 * Returns ranked creators for each section using priority system:
 * Paid Promotion > Admin Manual > Automatic (rating-based)
 */
const express = require("express");
const router = express.Router();
const CreatorRanking = require("../models/CreatorRanking");
const Creator = require("../models/Creator");

// GET /:section — Get ranked creators for a section
// Sections: all_creators, best_reviewed, featured, top_creators, trending
router.get("/:section", async (req, res, next) => {
  try {
    const { section } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const now = new Date();

    // Auto-expire old promotion rankings
    await CreatorRanking.deleteMany({ source: "promotion", section, promotionExpiry: { $lte: now } });

    // Get ranked creators (promotion + manual)
    const ranked = await CreatorRanking.find({ section })
      .populate({ path: "creator", populate: { path: "user", select: "name avatar" }, select: "user creatorId specialty city category rating portfolio videos badge rank featured subscriptionStatus status weddingsCount" })
      .sort("position")
      .lean();

    // Filter valid (approved + active sub)
    const valid = ranked.filter(r => r.creator && r.creator.status === "approved" && ["active", "trial"].includes(r.creator.subscriptionStatus));

    // Fill rest with automatic
    const rankedIds = new Set(valid.map(r => r.creator._id.toString()));
    const remaining = limit - valid.length;

    let automatic = [];
    if (remaining > 0) {
      automatic = await Creator.find({ status: "approved", subscriptionStatus: { $in: ["active", "trial"] }, _id: { $nin: [...rankedIds] } })
        .populate("user", "name avatar")
        .sort("-rating -weddingsCount")
        .limit(remaining)
        .lean();
    }

    const result = [
      ...valid.map(r => ({
        _id: r.creator._id,
        position: r.position,
        source: r.source,
        creatorId: r.creator.creatorId,
        name: r.creator.user?.name || "Creator",
        avatar: r.creator.user?.avatar || "",
        specialty: r.creator.specialty,
        city: r.creator.city,
        category: r.creator.category,
        rating: r.creator.rating,
        portfolio: r.creator.portfolio,
        badge: r.creator.badge,
        rank: r.creator.rank,
        featured: r.creator.featured,
      })),
      ...automatic.map((c, i) => ({
        _id: c._id,
        position: valid.length + i + 1,
        source: "automatic",
        creatorId: c.creatorId,
        name: c.user?.name || "Creator",
        avatar: c.user?.avatar || "",
        specialty: c.specialty,
        city: c.city,
        category: c.category,
        rating: c.rating,
        portfolio: c.portfolio,
        badge: c.badge,
        rank: c.rank,
        featured: c.featured,
      })),
    ];

    res.json({ success: true, section, data: result.slice(0, limit) });
  } catch (e) { next(e); }
});

module.exports = router;
