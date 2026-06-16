const express = require("express");
const District = require("../models/District");
const TrendingSearch = require("../models/TrendingSearch");
const InspirationGallery = require("../models/InspirationGallery");
const Creator = require("../models/Creator");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// ═══ PUBLIC ENDPOINTS ═══

// GET /districts — all active districts with creator count
router.get("/districts", async (req, res, next) => {
  try {
    const districts = await District.find({ isActive: true }).sort("sortOrder").lean();
    // Add creator count per district
    const withCounts = await Promise.all(districts.map(async (d) => {
      const count = await Creator.countDocuments({ city: new RegExp(d.name, "i"), status: "approved", subscriptionStatus: { $in: ["active", "trial"] } });
      return { ...d, creatorCount: count };
    }));
    res.json({ success: true, data: withCounts });
  } catch (e) { next(e); }
});

// GET /trending-searches
router.get("/trending-searches", async (req, res, next) => {
  try {
    const searches = await TrendingSearch.find({ isActive: true }).sort("sortOrder").lean();
    res.json({ success: true, data: searches });
  } catch (e) { next(e); }
});

// GET /inspiration-gallery
router.get("/inspiration", async (req, res, next) => {
  try {
    const items = await InspirationGallery.find({ isActive: true }).sort("sortOrder").lean();
    res.json({ success: true, data: items });
  } catch (e) { next(e); }
});

// GET /featured-creators — active featured approved verified
router.get("/featured-creators", async (req, res, next) => {
  try {
    const creators = await Creator.find({ featured: true, status: "approved", subscriptionStatus: { $in: ["active", "trial"] } })
      .populate("user", "name avatar email phone").lean();
    res.json({ success: true, data: creators });
  } catch (e) { next(e); }
});

// GET /trending — most viewed/booked creators
router.get("/trending", async (req, res, next) => {
  try {
    const creators = await Creator.find({ status: "approved", subscriptionStatus: { $in: ["active", "trial"] } })
      .populate("user", "name avatar").sort("-rating").limit(10).lean();
    res.json({ success: true, data: creators });
  } catch (e) { next(e); }
});

// ═══ ADMIN ENDPOINTS ═══

// Districts CRUD
router.get("/admin/districts", protect, authorize("admin"), async (req, res, next) => {
  try { res.json({ success: true, data: await District.find().sort("sortOrder") }); } catch (e) { next(e); }
});
router.post("/admin/districts", protect, authorize("admin"), async (req, res, next) => {
  try {
    const d = await District.create(req.body);
    res.status(201).json({ success: true, data: d });
  } catch (e) { next(e); }
});
router.put("/admin/districts/:id", protect, authorize("admin"), async (req, res, next) => {
  try { res.json({ success: true, data: await District.findByIdAndUpdate(req.params.id, req.body, { new: true }) }); } catch (e) { next(e); }
});
router.delete("/admin/districts/:id", protect, authorize("admin"), async (req, res, next) => {
  try { await District.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { next(e); }
});

// Trending Searches CRUD
router.get("/admin/trending-searches", protect, authorize("admin"), async (req, res, next) => {
  try { res.json({ success: true, data: await TrendingSearch.find().sort("sortOrder") }); } catch (e) { next(e); }
});
router.post("/admin/trending-searches", protect, authorize("admin"), async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await TrendingSearch.create(req.body) }); } catch (e) { next(e); }
});
router.put("/admin/trending-searches/:id", protect, authorize("admin"), async (req, res, next) => {
  try { res.json({ success: true, data: await TrendingSearch.findByIdAndUpdate(req.params.id, req.body, { new: true }) }); } catch (e) { next(e); }
});
router.delete("/admin/trending-searches/:id", protect, authorize("admin"), async (req, res, next) => {
  try { await TrendingSearch.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { next(e); }
});

// Inspiration Gallery CRUD
router.get("/admin/inspiration", protect, authorize("admin"), async (req, res, next) => {
  try { res.json({ success: true, data: await InspirationGallery.find().sort("sortOrder") }); } catch (e) { next(e); }
});
router.post("/admin/inspiration", protect, authorize("admin"), async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await InspirationGallery.create(req.body) }); } catch (e) { next(e); }
});
router.put("/admin/inspiration/:id", protect, authorize("admin"), async (req, res, next) => {
  try { res.json({ success: true, data: await InspirationGallery.findByIdAndUpdate(req.params.id, req.body, { new: true }) }); } catch (e) { next(e); }
});
router.delete("/admin/inspiration/:id", protect, authorize("admin"), async (req, res, next) => {
  try { await InspirationGallery.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { next(e); }
});

module.exports = router;
