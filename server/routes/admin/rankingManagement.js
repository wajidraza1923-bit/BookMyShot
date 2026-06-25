/**
 * Ranking Management — Simple, direct control
 * 
 * SECTION 1: Featured Creators (max 4, manually selected)
 * SECTION 2: Overall Creators (all creators, manually ordered)
 * 
 * Single database fields on Creator model: featuredRank, displayOrder
 * Both Website and App read from same Creator collection.
 */
const express = require("express");
const router = express.Router();
const Creator = require("../../models/Creator");
const auditService = require("../../services/auditService");

// ═══════════════════════════════════════════════════════════════
// FEATURED CREATORS (Top 4)
// ═══════════════════════════════════════════════════════════════

// GET /featured — Get featured creators (ranked 1-4)
router.get("/featured", async (req, res, next) => {
  try {
    const featured = await Creator.find({ featuredRank: { $gte: 1, $lte: 4 }, status: "approved" })
      .populate("user", "name email avatar phone")
      .sort("featuredRank")
      .lean();
    // Normalize portfolio for lean results
    featured.forEach(c => { if (c.portfolio) c.portfolio = c.portfolio.map(i => typeof i === 'string' ? i : (i?.url || '')); });
    res.json({ success: true, data: featured });
  } catch (e) { next(e); }
});

// PUT /featured — Set featured rankings (body: [{creatorId, rank}])
router.put("/featured", async (req, res, next) => {
  try {
    const { rankings } = req.body; // [{creatorId: "xxx", rank: 1}, ...]
    if (!Array.isArray(rankings)) return res.status(400).json({ success: false, message: "rankings array required" });

    // Clear all current featured rankings
    await Creator.updateMany({ featuredRank: { $gte: 1 } }, { $set: { featuredRank: 0, featured: false } });

    // Set new rankings (max 4)
    for (const { creatorId, rank } of rankings.slice(0, 4)) {
      if (creatorId && rank >= 1 && rank <= 4) {
        await Creator.updateOne({ _id: creatorId }, { $set: { featuredRank: rank, featured: true, rank: rank } });
      }
    }

    await auditService.logAction({ adminId: req.user._id, adminName: req.user.name || "", action: "update_featured_rankings", target: "rankings", targetId: "featured", previousValues: {}, newValues: { rankings }, ip: req.ip });
    res.json({ success: true, message: "Featured rankings saved" });
  } catch (e) { next(e); }
});

// PUT /featured/:creatorId/:rank — Quick set single featured rank
router.put("/featured/:creatorId/:rank", async (req, res, next) => {
  try {
    const rank = parseInt(req.params.rank);
    if (rank < 1 || rank > 4) return res.status(400).json({ success: false, message: "Rank must be 1-4" });

    // Remove whoever is currently at this rank
    await Creator.updateOne({ featuredRank: rank }, { $set: { featuredRank: 0, featured: false } });
    // Remove this creator from any current featured rank
    await Creator.updateOne({ _id: req.params.creatorId }, { $set: { featuredRank: rank, featured: true, rank: rank } });

    res.json({ success: true, message: `Set as Featured #${rank}` });
  } catch (e) { next(e); }
});

// DELETE /featured/:creatorId — Remove from featured
router.delete("/featured/:creatorId", async (req, res, next) => {
  try {
    await Creator.updateOne({ _id: req.params.creatorId }, { $set: { featuredRank: 0, featured: false, rank: 0 } });
    res.json({ success: true, message: "Removed from featured" });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════
// OVERALL CREATORS (all creators, manual order)
// ═══════════════════════════════════════════════════════════════

// GET /overall — Get all creators in display order
router.get("/overall", async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;

    let filter = { status: "approved" };
    if (search) {
      const User = require("../../models/User");
      const regex = new RegExp(search, "i");
      const matchUsers = await User.find({ $or: [{ name: regex }, { email: regex }] }).select("_id");
      filter.user = { $in: matchUsers.map(u => u._id) };
    }

    const total = await Creator.countDocuments(filter);
    const creators = await Creator.find(filter)
      .populate("user", "name email avatar phone")
      .sort("displayOrder createdAt")
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    res.json({ success: true, data: creators, total, page: pageNum, limit: limitNum });
  } catch (e) { next(e); }
});

// PUT /overall/reorder — Save display order (body: [{creatorId, order}])
router.put("/overall/reorder", async (req, res, next) => {
  try {
    const { rankings } = req.body; // [{creatorId: "xxx", order: 1}, ...]
    if (!Array.isArray(rankings)) return res.status(400).json({ success: false, message: "rankings array required" });

    const bulkOps = rankings.map(({ creatorId, order }) => ({
      updateOne: { filter: { _id: creatorId }, update: { $set: { displayOrder: order } } }
    }));
    if (bulkOps.length > 0) await Creator.bulkWrite(bulkOps);

    await auditService.logAction({ adminId: req.user._id, adminName: req.user.name || "", action: "reorder_overall", target: "rankings", targetId: "overall", previousValues: {}, newValues: { count: rankings.length }, ip: req.ip });
    res.json({ success: true, message: `${rankings.length} creators reordered` });
  } catch (e) { next(e); }
});

// PUT /overall/:creatorId/move — Move creator up or down
router.put("/overall/:creatorId/move", async (req, res, next) => {
  try {
    const { direction } = req.body; // "up" or "down"
    const creator = await Creator.findById(req.params.creatorId);
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    const currentOrder = creator.displayOrder || 9999;
    const newOrder = direction === "up" ? Math.max(1, currentOrder - 1) : currentOrder + 1;

    // Swap with whoever is at the new position
    await Creator.updateOne({ displayOrder: newOrder, status: "approved" }, { $set: { displayOrder: currentOrder } });
    creator.displayOrder = newOrder;
    await creator.save();

    res.json({ success: true, message: `Moved ${direction}`, newOrder });
  } catch (e) { next(e); }
});

module.exports = router;
