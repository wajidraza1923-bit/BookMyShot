const express = require("express");
const District = require("../models/District");
const TrendingSearch = require("../models/TrendingSearch");
const InspirationGallery = require("../models/InspirationGallery");
const Category = require("../models/Category");
const Creator = require("../models/Creator");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// ═══ PUBLIC ENDPOINTS ═══

// GET /categories — all active categories with creator count
router.get("/categories", async (req, res, next) => {
  try {
    let cats = await Category.find({ isActive: true }).sort("sortOrder").lean();
    // Auto-seed if empty
    if (cats.length === 0) {
      const seedCats = [
        { name: "Wedding Photography", slug: "wedding-photography", icon: "camera", imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=400", sortOrder: 1 },
        { name: "Cinematography", slug: "cinematography", icon: "film", imageUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400", sortOrder: 2 },
        { name: "Wedding Films", slug: "wedding-films", icon: "videocam", imageUrl: "https://images.unsplash.com/photo-1505932794465-147d1f1b2c97?w=400", sortOrder: 3 },
        { name: "Drone Coverage", slug: "drone-coverage", icon: "airplane", imageUrl: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400", sortOrder: 4 },
        { name: "Pre Wedding", slug: "pre-wedding", icon: "heart-circle", imageUrl: "https://images.unsplash.com/photo-1606216794079-73f85bbd57d5?w=400", sortOrder: 5 },
        { name: "Bridal Shoot", slug: "bridal-shoot", icon: "diamond", imageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400", sortOrder: 6 },
        { name: "Candid Photography", slug: "candid-photography", icon: "aperture", imageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400", sortOrder: 7 },
        { name: "Makeup Artist", slug: "makeup-artist", icon: "color-palette", imageUrl: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400", sortOrder: 8 },
        { name: "Anchors & DJs", slug: "anchors-djs", icon: "mic", imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400", sortOrder: 9 },
        { name: "Destination Wedding", slug: "destination-wedding", icon: "navigate", imageUrl: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400", sortOrder: 10 },
      ];
      await Category.insertMany(seedCats);
      cats = await Category.find({ isActive: true }).sort("sortOrder").lean();
    }
    const withCounts = await Promise.all(cats.map(async (c) => {
      const count = await Creator.countDocuments({ category: new RegExp(c.slug || c.name, "i"), status: "approved", subscriptionStatus: { $in: ["active", "trial"] } });
      return { ...c, creatorCount: count };
    }));
    res.json({ success: true, data: withCounts });
  } catch (e) { next(e); }
});

// GET /districts — all active districts with creator count
router.get("/districts", async (req, res, next) => {
  try {
    let districts = await District.find({ isActive: true }).sort("sortOrder").lean();
    // Auto-seed if empty
    if (districts.length === 0) {
      const seedDist = [
        { name: "Poonch", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400", sortOrder: 1 },
        { name: "Surankote", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400", sortOrder: 2 },
        { name: "Rajouri", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=400", sortOrder: 3 },
        { name: "Jammu", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=400", sortOrder: 4 },
        { name: "Srinagar", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1597074866923-dc0589150458?w=400", sortOrder: 5 },
        { name: "Kathua", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400", sortOrder: 6 },
        { name: "Udhampur", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400", sortOrder: 7 },
        { name: "Anantnag", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=400", sortOrder: 8 },
        { name: "Baramulla", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400", sortOrder: 9 },
        { name: "Doda", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400", sortOrder: 10 },
      ];
      await District.insertMany(seedDist);
      districts = await District.find({ isActive: true }).sort("sortOrder").lean();
    }
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
    let searches = await TrendingSearch.find({ isActive: true }).sort("sortOrder").lean();
    if (searches.length === 0) {
      await TrendingSearch.insertMany([
        { title: "Pre Wedding", icon: "heart-circle", sortOrder: 1 },
        { title: "Wedding Photography", icon: "camera", sortOrder: 2 },
        { title: "Cinematography", icon: "film", sortOrder: 3 },
        { title: "Drone Coverage", icon: "airplane", sortOrder: 4 },
        { title: "Bridal Shoot", icon: "diamond", sortOrder: 5 },
        { title: "Destination Wedding", icon: "navigate", sortOrder: 6 },
      ]);
      searches = await TrendingSearch.find({ isActive: true }).sort("sortOrder").lean();
    }
    res.json({ success: true, data: searches });
  } catch (e) { next(e); }
});

// GET /inspiration-gallery
router.get("/inspiration", async (req, res, next) => {
  try {
    let items = await InspirationGallery.find({ isActive: true }).sort("sortOrder").lean();
    if (items.length === 0) {
      await InspirationGallery.insertMany([
        { title: "Royal Kashmiri Weddings", imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600", category: "Traditional", sortOrder: 1 },
        { title: "Mountain Weddings", imageUrl: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600", category: "Destination", sortOrder: 2 },
        { title: "Traditional Ceremonies", imageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600", category: "Traditional", sortOrder: 3 },
        { title: "Cinematic Wedding Films", imageUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600", category: "Cinematic", sortOrder: 4 },
      ]);
      items = await InspirationGallery.find({ isActive: true }).sort("sortOrder").lean();
    }
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

// Categories CRUD
router.get("/admin/categories", protect, authorize("admin"), async (req, res, next) => {
  try { res.json({ success: true, data: await Category.find().sort("sortOrder") }); } catch (e) { next(e); }
});
router.post("/admin/categories", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { name, icon, imageUrl, sortOrder } = req.body;
    const slug = (name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    res.status(201).json({ success: true, data: await Category.create({ name, slug, icon, imageUrl, sortOrder }) });
  } catch (e) { next(e); }
});
router.put("/admin/categories/:id", protect, authorize("admin"), async (req, res, next) => {
  try { res.json({ success: true, data: await Category.findByIdAndUpdate(req.params.id, req.body, { new: true }) }); } catch (e) { next(e); }
});
router.delete("/admin/categories/:id", protect, authorize("admin"), async (req, res, next) => {
  try { await Category.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { next(e); }
});

module.exports = router;
