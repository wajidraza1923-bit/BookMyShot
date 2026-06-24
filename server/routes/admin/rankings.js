/**
 * Creator Ranking Management — Admin API
 * 
 * Priority system: Paid Promotion > Admin Manual > Automatic
 * Sections: all_creators, best_reviewed, featured, top_creators, trending
 * 
 * GET / — Get all rankings for all sections
 * GET /:section — Get rankings for a specific section
 * PUT /:section/:position — Set a creator at a position
 * DELETE /:section/:position — Remove a ranking
 * DELETE /:section/creator/:creatorId — Remove creator from section
 * POST /reorder — Bulk reorder a section
 */
const express = require("express");
const router = express.Router();
const CreatorRanking = require("../../models/CreatorRanking");
const Creator = require("../../models/Creator");
const PromotionRequest = require("../../models/PromotionRequest");
const auditService = require("../../services/auditService");

const SECTIONS = ["all_creators", "best_reviewed", "featured", "top_creators", "trending"];

// GET / — All rankings grouped by section
router.get("/", async (req, res, next) => {
  try {
    const now = new Date();

    // Auto-expire promotion-based rankings
    await CreatorRanking.deleteMany({ source: "promotion", promotionExpiry: { $lte: now } });

    const rankings = await CreatorRanking.find()
      .populate({ path: "creator", populate: { path: "user", select: "name email avatar" }, select: "user creatorId specialty city category rating rank featured subscriptionStatus" })
      .sort("section position")
      .lean();

    // Group by section
    const grouped = {};
    SECTIONS.forEach(s => { grouped[s] = []; });
    rankings.forEach(r => {
      if (r.creator && grouped[r.section]) {
        grouped[r.section].push({
          _id: r._id,
          position: r.position,
          source: r.source,
          promotionExpiry: r.promotionExpiry,
          creator: {
            _id: r.creator._id,
            creatorId: r.creator.creatorId,
            name: r.creator.user?.name || "—",
            email: r.creator.user?.email || "",
            avatar: r.creator.user?.avatar || "",
            specialty: r.creator.specialty,
            city: r.creator.city,
            rating: r.creator.rating,
          },
        });
      }
    });

    res.json({ success: true, data: grouped, sections: SECTIONS });
  } catch (e) { next(e); }
});

// GET /:section — Rankings for a specific section (public-friendly)
router.get("/:section", async (req, res, next) => {
  try {
    const { section } = req.params;
    if (!SECTIONS.includes(section)) return res.status(400).json({ success: false, message: "Invalid section" });

    const now = new Date();
    await CreatorRanking.deleteMany({ source: "promotion", section, promotionExpiry: { $lte: now } });

    // Get manual/promotion rankings
    const manual = await CreatorRanking.find({ section })
      .populate({ path: "creator", populate: { path: "user", select: "name avatar" }, select: "user creatorId specialty city category rating portfolio subscriptionStatus status" })
      .sort("position")
      .lean();

    // Filter to only approved + active subscription
    const ranked = manual.filter(r => r.creator && r.creator.status === "approved" && ["active", "trial"].includes(r.creator.subscriptionStatus));

    // Fill remaining positions with automatic (rating-based) creators
    const rankedIds = new Set(ranked.map(r => r.creator._id.toString()));
    const automatic = await Creator.find({ status: "approved", subscriptionStatus: { $in: ["active", "trial"] }, _id: { $nin: [...rankedIds] } })
      .populate("user", "name avatar")
      .sort("-rating -weddingsCount")
      .limit(10)
      .lean();

    const combined = [
      ...ranked.map(r => ({ ...r, creator: { ...r.creator, user: r.creator.user } })),
      ...automatic.map((c, i) => ({ position: ranked.length + i + 1, source: "automatic", creator: c })),
    ];

    res.json({ success: true, section, data: combined });
  } catch (e) { next(e); }
});

// PUT /:section/:position — Set creator at position (admin manual)
router.put("/:section/:position", async (req, res, next) => {
  try {
    const { section, position } = req.params;
    const { creatorId, note } = req.body;
    if (!SECTIONS.includes(section)) return res.status(400).json({ success: false, message: "Invalid section" });
    if (!creatorId) return res.status(400).json({ success: false, message: "creatorId required" });

    const pos = parseInt(position);
    const creator = await Creator.findById(creatorId);
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    // Check if position is held by a paid promotion (can't override)
    const existing = await CreatorRanking.findOne({ section, position: pos });
    if (existing && existing.source === "promotion" && existing.promotionExpiry && new Date(existing.promotionExpiry) > new Date()) {
      return res.status(400).json({ success: false, message: `Position #${pos} is held by a paid promotion until ${new Date(existing.promotionExpiry).toLocaleDateString()}. Cannot override.` });
    }

    // Remove creator from any existing position in this section
    await CreatorRanking.deleteOne({ section, creator: creatorId });
    // Remove existing occupant of this position (if admin-placed)
    await CreatorRanking.deleteOne({ section, position: pos, source: { $ne: "promotion" } });

    // Set new ranking
    await CreatorRanking.create({
      section, position: pos, creator: creatorId,
      source: "admin_manual", note: note || "", setBy: req.user._id,
    });

    // Also update the Creator model rank if it's "all_creators" section
    if (section === "all_creators" || section === "best_reviewed") {
      await Creator.updateOne({ _id: creatorId }, { $set: { rank: pos } });
    }

    await auditService.logAction({ adminId: req.user._id, adminName: req.user.name || "", action: "set_ranking", target: "creator_ranking", targetId: creatorId, previousValues: {}, newValues: { section, position: pos }, ip: req.ip });

    res.json({ success: true, message: `Creator set at #${pos} in ${section}` });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ success: false, message: "Position already taken or creator already in this section" });
    next(e);
  }
});

// DELETE /:section/:position — Remove ranking
router.delete("/:section/:position", async (req, res, next) => {
  try {
    const { section, position } = req.params;
    const ranking = await CreatorRanking.findOneAndDelete({ section, position: parseInt(position), source: { $ne: "promotion" } });
    if (ranking) {
      await Creator.updateOne({ _id: ranking.creator }, { $set: { rank: 0 } });
    }
    res.json({ success: true, message: "Ranking removed" });
  } catch (e) { next(e); }
});

// DELETE /:section/creator/:creatorId — Remove creator from section
router.delete("/:section/creator/:creatorId", async (req, res, next) => {
  try {
    await CreatorRanking.deleteOne({ section: req.params.section, creator: req.params.creatorId, source: { $ne: "promotion" } });
    await Creator.updateOne({ _id: req.params.creatorId }, { $set: { rank: 0 } });
    res.json({ success: true, message: "Creator removed from section" });
  } catch (e) { next(e); }
});

// POST /reorder — Bulk reorder (array of {creatorId, position})
router.post("/reorder", async (req, res, next) => {
  try {
    const { section, rankings } = req.body;
    if (!SECTIONS.includes(section)) return res.status(400).json({ success: false, message: "Invalid section" });
    if (!Array.isArray(rankings)) return res.status(400).json({ success: false, message: "rankings array required" });

    // Only reorder non-promotion entries
    for (const { creatorId, position } of rankings) {
      const existing = await CreatorRanking.findOne({ section, position, source: "promotion" });
      if (existing) continue; // Skip promotion-held positions

      await CreatorRanking.findOneAndUpdate(
        { section, creator: creatorId },
        { section, position, creator: creatorId, source: "admin_manual", setBy: req.user._id },
        { upsert: true }
      );
      if (section === "all_creators" || section === "best_reviewed") {
        await Creator.updateOne({ _id: creatorId }, { $set: { rank: position } });
      }
    }

    await auditService.logAction({ adminId: req.user._id, adminName: req.user.name || "", action: "reorder_rankings", target: "creator_ranking", targetId: section, previousValues: {}, newValues: { count: rankings.length }, ip: req.ip });

    res.json({ success: true, message: `Reordered ${rankings.length} creators in ${section}` });
  } catch (e) { next(e); }
});

module.exports = router;
