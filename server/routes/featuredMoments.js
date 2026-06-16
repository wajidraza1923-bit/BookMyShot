const express = require("express");
const FeaturedMoment = require("../models/FeaturedMoment");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// PUBLIC: Get active featured moments (sorted)
router.get("/", async (req, res, next) => {
  try {
    const moments = await FeaturedMoment.find({ isActive: true }).sort("sortOrder").lean();
    res.json({ success: true, data: moments });
  } catch (e) { next(e); }
});

// ADMIN: Get all moments (including inactive)
router.get("/admin", protect, authorize("admin"), async (req, res, next) => {
  try {
    const moments = await FeaturedMoment.find().sort("sortOrder").lean();
    res.json({ success: true, data: moments });
  } catch (e) { next(e); }
});

// ADMIN: Create moment
router.post("/admin", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { title, location, imageUrl, sortOrder, isActive } = req.body;
    if (!title || !imageUrl) return res.status(400).json({ success: false, message: "Title and image URL required" });
    const moment = await FeaturedMoment.create({ title, location, imageUrl, sortOrder: sortOrder || 0, isActive: isActive !== false });
    res.status(201).json({ success: true, data: moment });
  } catch (e) { next(e); }
});

// ADMIN: Update moment
router.put("/admin/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const moment = await FeaturedMoment.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!moment) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: moment });
  } catch (e) { next(e); }
});

// ADMIN: Delete moment
router.delete("/admin/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    await FeaturedMoment.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
