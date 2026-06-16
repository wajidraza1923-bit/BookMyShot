const express = require("express");
const Testimonial = require("../models/Testimonial");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// PUBLIC: Get active testimonials
router.get("/", async (req, res, next) => {
  try {
    const testimonials = await Testimonial.find({ isActive: true }).sort("sortOrder").lean();
    res.json({ success: true, data: testimonials });
  } catch (e) { next(e); }
});

// ADMIN: Get all
router.get("/admin", protect, authorize("admin"), async (req, res, next) => {
  try {
    const testimonials = await Testimonial.find().sort("sortOrder").lean();
    res.json({ success: true, data: testimonials });
  } catch (e) { next(e); }
});

// ADMIN: Create
router.post("/admin", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { name, city, eventType, rating, review, imageUrl, verifiedBooking, sortOrder } = req.body;
    if (!name || !review) return res.status(400).json({ success: false, message: "Name and review required" });
    const testimonial = await Testimonial.create({ name, city, eventType, rating, review, imageUrl, verifiedBooking, sortOrder });
    res.status(201).json({ success: true, data: testimonial });
  } catch (e) { next(e); }
});

// ADMIN: Update
router.put("/admin/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const t = await Testimonial.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!t) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: t });
  } catch (e) { next(e); }
});

// ADMIN: Delete
router.delete("/admin/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    await Testimonial.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
