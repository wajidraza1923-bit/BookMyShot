const express = require("express");
const FeaturedMoment = require("../models/FeaturedMoment");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// PUBLIC: Get active featured moments (sorted)
router.get("/", async (req, res, next) => {
  try {
    let moments = await FeaturedMoment.find({ isActive: true }).sort("sortOrder").lean();
    // Auto-seed if empty
    if (moments.length === 0) {
      await FeaturedMoment.insertMany([
        { title: "Royal Wedding", location: "Udaipur, India", imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600", sortOrder: 1 },
        { title: "Bride Portrait", location: "Jaipur, India", imageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600", sortOrder: 2 },
        { title: "Mehndi Ceremony", location: "Delhi, India", imageUrl: "https://images.unsplash.com/photo-1606216794079-73f85bbd57d5?w=600", sortOrder: 3 },
        { title: "Destination Wedding", location: "Goa, India", imageUrl: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600", sortOrder: 4 },
        { title: "Cinematic Couple", location: "Kerala, India", imageUrl: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600", sortOrder: 5 },
        { title: "Palace Wedding", location: "Jodhpur, India", imageUrl: "https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=600", sortOrder: 6 },
      ]);
      moments = await FeaturedMoment.find({ isActive: true }).sort("sortOrder").lean();
    }
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
