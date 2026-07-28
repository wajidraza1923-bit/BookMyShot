/**
 * Discovery Routes — Service Area based creator matching
 * Replaces GPS-based Near Me with city/district matching
 */
const express = require("express");
const Creator = require("../models/Creator");
const ServiceLocation = require("../models/ServiceLocation");
const { protect } = require("../middleware/auth");

const router = express.Router();

// ═══ PUBLIC: Get all states ═══
router.get("/states", async (req, res, next) => {
  try {
    const states = await ServiceLocation.distinct("state", { isActive: true });
    res.json({ success: true, states: states.sort() });
  } catch (e) { next(e); }
});

// ═══ PUBLIC: Get districts by state ═══
router.get("/districts", async (req, res, next) => {
  try {
    const { state } = req.query;
    if (!state) return res.status(400).json({ success: false, message: "State required" });
    const districts = await ServiceLocation.distinct("district", { state: new RegExp(state, "i"), isActive: true });
    res.json({ success: true, districts: districts.sort() });
  } catch (e) { next(e); }
});

// ═══ PUBLIC: Get cities by district ═══
router.get("/cities", async (req, res, next) => {
  try {
    const { district, state } = req.query;
    if (!district) return res.status(400).json({ success: false, message: "District required" });
    const filter = { district: new RegExp(district, "i"), isActive: true };
    if (state) filter.state = new RegExp(state, "i");
    const cities = await ServiceLocation.distinct("city", filter);
    res.json({ success: true, cities: cities.sort() });
  } catch (e) { next(e); }
});

// ═══ PUBLIC: Search locations ═══
router.get("/search-locations", async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, results: [] });
    const results = await ServiceLocation.find({
      isActive: true,
      $or: [
        { city: new RegExp(q, "i") },
        { district: new RegExp(q, "i") },
        { state: new RegExp(q, "i") },
      ],
    }).limit(20).sort("city");
    res.json({ success: true, results });
  } catch (e) { next(e); }
});

// ═══ PUBLIC: Find creators by service area (replaces Near Me GPS) ═══
router.get("/creators-by-area", async (req, res, next) => {
  try {
    const { city, district, state, category, sort, minPrice, maxPrice, verified, featured } = req.query;

    if (!city && !district && !state) {
      return res.status(400).json({ success: false, message: "At least city, district, or state required" });
    }

    const baseFilter = { status: "approved" };

    // Build service area matching query
    let areaConditions = [];

    if (city) {
      const cityRegex = new RegExp(city, "i");
      areaConditions.push(
        { serviceAreas: { $elemMatch: { $regex: cityRegex } } },
        { baseCity: cityRegex },
        { city: cityRegex },
        // Pan-India or state-wide creators also match
        { travelPreference: "pan_india" },
      );
      // Include district-wide creators if we know the district
      if (district) {
        areaConditions.push(
          { travelPreference: "my_district", district: new RegExp(district, "i") },
          { travelPreference: "multiple_districts", district: new RegExp(district, "i") },
        );
      }
      if (state) {
        areaConditions.push(
          { travelPreference: "entire_state", state: new RegExp(state, "i") },
        );
      }
    } else if (district) {
      const distRegex = new RegExp(district, "i");
      areaConditions.push(
        { district: distRegex },
        { serviceAreas: { $elemMatch: { $regex: distRegex } } },
        { travelPreference: "pan_india" },
      );
      if (state) {
        areaConditions.push({ travelPreference: "entire_state", state: new RegExp(state, "i") });
      }
    } else if (state) {
      const stateRegex = new RegExp(state, "i");
      areaConditions.push(
        { state: stateRegex },
        { travelPreference: "pan_india" },
      );
    }

    baseFilter.$or = areaConditions;

    // Category filter
    if (category && category !== 'all') {
      baseFilter.$and = baseFilter.$and || [];
      baseFilter.$and.push({
        $or: [
          { categorySlug: new RegExp(category, "i") },
          { category: new RegExp(category, "i") },
          { specialty: new RegExp(category, "i") },
        ],
      });
    }

    // Price filter
    if (minPrice) baseFilter.budgetMin = { $gte: Number(minPrice) };
    if (maxPrice) baseFilter.budgetMax = { $lte: Number(maxPrice) };

    // Verified filter
    if (verified === 'true') baseFilter.verified = true;
    if (featured === 'true') baseFilter.featured = true;

    let creators = await Creator.find(baseFilter).populate("user", "name avatar phone").lean();

    // Sort
    if (sort === 'rated') creators.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === 'price') creators.sort((a, b) => (a.budgetMin || 0) - (b.budgetMin || 0));
    else if (sort === 'bookings') creators.sort((a, b) => (b.weddingsCount || 0) - (a.weddingsCount || 0));
    else if (sort === 'newest') creators.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sort === 'featured') creators.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    else {
      // Default: prioritize exact city match > district match > state match
      creators.sort((a, b) => {
        const aCity = city && (a.baseCity || a.city || '').toLowerCase().includes(city.toLowerCase());
        const bCity = city && (b.baseCity || b.city || '').toLowerCase().includes(city.toLowerCase());
        if (aCity && !bCity) return -1;
        if (!aCity && bCity) return 1;
        return (b.rating || 0) - (a.rating || 0);
      });
    }

    // Normalize portfolio
    creators.forEach(c => {
      if (c.portfolio) c.portfolio = c.portfolio.map(item => typeof item === 'string' ? item : (item?.url || ''));
    });

    console.log(`[Discovery] Query: city=${city} district=${district} state=${state} | Found: ${creators.length}`);

    res.json({ success: true, count: creators.length, creators });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Manage locations ═══
router.get("/admin/locations", protect, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ success: false });
    const locations = await ServiceLocation.find().sort("state district city");
    res.json({ success: true, locations });
  } catch (e) { next(e); }
});

router.post("/admin/locations", protect, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ success: false });
    const { state, district, city, pincode } = req.body;
    if (!state || !district || !city) return res.status(400).json({ success: false, message: "State, district, city required" });
    const existing = await ServiceLocation.findOne({ state, district, city });
    if (existing) return res.status(400).json({ success: false, message: "Location already exists" });
    const loc = await ServiceLocation.create({ state, district, city, pincode: pincode || "" });
    res.status(201).json({ success: true, location: loc });
  } catch (e) { next(e); }
});

router.post("/admin/locations/bulk", protect, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ success: false });
    const { locations } = req.body; // Array of { state, district, city }
    if (!Array.isArray(locations)) return res.status(400).json({ success: false, message: "locations array required" });
    const results = [];
    for (const loc of locations) {
      if (!loc.state || !loc.district || !loc.city) continue;
      const existing = await ServiceLocation.findOne({ state: loc.state, district: loc.district, city: loc.city });
      if (!existing) {
        results.push(await ServiceLocation.create(loc));
      }
    }
    res.json({ success: true, added: results.length });
  } catch (e) { next(e); }
});

router.delete("/admin/locations/:id", protect, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ success: false });
    await ServiceLocation.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ═══ CREATOR: Update service areas ═══
router.put("/creator/service-areas", protect, async (req, res, next) => {
  try {
    if (req.user.role !== "creator") return res.status(403).json({ success: false });
    const { serviceAreas, travelPreference, maxTravelDistance, baseCity, state, district, studioName, studioAddress, pincode } = req.body;
    const update = {};
    if (serviceAreas !== undefined) update.serviceAreas = serviceAreas;
    if (travelPreference !== undefined) update.travelPreference = travelPreference;
    if (maxTravelDistance !== undefined) update.maxTravelDistance = maxTravelDistance;
    if (baseCity !== undefined) { update.baseCity = baseCity; update.city = baseCity; }
    if (state !== undefined) update.state = state;
    if (district !== undefined) update.district = district;
    if (studioName !== undefined) update.studioName = studioName;
    if (studioAddress !== undefined) update.studioAddress = studioAddress;
    if (pincode !== undefined) update.pincode = pincode;

    const creator = await Creator.findOneAndUpdate({ user: req.user._id }, { $set: update }, { new: true });
    res.json({ success: true, creator });
  } catch (e) { next(e); }
});

module.exports = router;
