/**
 * Profile Interactions API — Likes, Saves, Shares, Views
 */
const express = require("express");
const ProfileInteraction = require("../models/ProfileInteraction");
const Creator = require("../models/Creator");
const { protect } = require("../middleware/auth");

const router = express.Router();

// GET stats for a creator (public)
router.get("/stats/:creatorId", async (req, res, next) => {
  try {
    const id = req.params.creatorId;
    const [likes, saves, shares, views] = await Promise.all([
      ProfileInteraction.countDocuments({ creator: id, type: "like" }),
      ProfileInteraction.countDocuments({ creator: id, type: "save" }),
      ProfileInteraction.countDocuments({ creator: id, type: "share" }),
      ProfileInteraction.countDocuments({ creator: id, type: "view" }),
    ]);
    res.json({ success: true, data: { likes, saves, shares, views } });
  } catch (e) { next(e); }
});

// GET user's interactions with a creator
router.get("/my/:creatorId", protect, async (req, res, next) => {
  try {
    const interactions = await ProfileInteraction.find({ user: req.user._id, creator: req.params.creatorId });
    const liked = interactions.some(i => i.type === "like");
    const saved = interactions.some(i => i.type === "save");
    res.json({ success: true, data: { liked, saved } });
  } catch (e) { next(e); }
});

// POST toggle like/save
router.post("/toggle", protect, async (req, res, next) => {
  try {
    const { creatorId, type } = req.body;
    if (!creatorId || !["like", "save"].includes(type)) return res.status(400).json({ success: false, message: "creatorId and type (like/save) required" });

    const existing = await ProfileInteraction.findOne({ user: req.user._id, creator: creatorId, type });
    if (existing) {
      await existing.deleteOne();
      res.json({ success: true, action: "removed", type });
    } else {
      await ProfileInteraction.create({ user: req.user._id, creator: creatorId, type });
      res.json({ success: true, action: "added", type });
    }
  } catch (e) { next(e); }
});

// POST record view (idempotent per session — we allow one view per user per day)
router.post("/view", protect, async (req, res, next) => {
  try {
    const { creatorId } = req.body;
    if (!creatorId) return res.status(400).json({ success: false, message: "creatorId required" });
    // One view per user per creator per day
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const existing = await ProfileInteraction.findOne({ user: req.user._id, creator: creatorId, type: "view", createdAt: { $gte: today } });
    if (!existing) {
      await ProfileInteraction.create({ user: req.user._id, creator: creatorId, type: "view" });
    }
    res.json({ success: true });
  } catch (e) { next(e); }
});

// POST record share
router.post("/share", protect, async (req, res, next) => {
  try {
    const { creatorId } = req.body;
    if (!creatorId) return res.status(400).json({ success: false, message: "creatorId required" });
    await ProfileInteraction.create({ user: req.user._id, creator: creatorId, type: "share" });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// GET user's saved creators
router.get("/saved", protect, async (req, res, next) => {
  try {
    const saves = await ProfileInteraction.find({ user: req.user._id, type: "save" }).select("creator").populate({ path: "creator", populate: { path: "user", select: "name avatar" } });
    const creators = saves.map(s => s.creator).filter(Boolean);
    res.json({ success: true, data: creators });
  } catch (e) { next(e); }
});

module.exports = router;
