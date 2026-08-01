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
    const { city, district, state, category, subcategory, sort, minPrice, maxPrice, verified, featured, search } = req.query;

    if (!city && !district && !state && !search) {
      return res.status(400).json({ success: false, message: "At least city, district, state, or search required" });
    }

    // Fetch all approved creators first, then filter by visibility rules
    const baseFilter = { status: "approved" };
    if (category && category !== 'all') {
      // Map broad category chips to their subcategory slugs
      const CATEGORY_MAP = {
        'photography': ['photography', 'wedding-photography', 'wedding-photographer', 'pre-wedding', 'candid-photography', 'bridal-shoot', 'portrait', 'drone-coverage', 'destination-wedding', 'photography-videography'],
        'videography': ['videography', 'cinematography', 'wedding-films', 'drone-coverage', 'pre-wedding-video', 'cinematic-video', 'photography-videography'],
        'makeup': ['makeup', 'makeup-artist', 'makeup-artists', 'bridal-makeup', 'party-makeup', 'engagement-makeup', 'hair-styling', 'mehndi-artist', 'mehndi', 'beauty'],
        'decoration': ['decoration', 'decoration-floral', 'floral', 'stage-decoration', 'lighting', 'mandap-decoration', 'tent-house'],
        'dj': ['dj', 'djs-entertainment', 'anchors-djs', 'entertainment', 'anchor', 'music', 'band'],
        'catering': ['catering', 'catering-services', 'veg-catering', 'non-veg-catering', 'multi-cuisine', 'live-food-counter', 'tent-house'],
        'planner': ['planner', 'wedding-planners', 'wedding-planning', 'event-planner', 'coordinator'],
        'venues': ['venues', 'venue', 'banquet-hall', 'resort', 'hotel', 'destination'],
      };

      const subcats = CATEGORY_MAP[category.toLowerCase()] || [category];
      // Build regex OR conditions for all subcategory slugs
      const catConditions = [];
      subcats.forEach(s => {
        const r = new RegExp(s, 'i');
        catConditions.push({ categorySlug: r });
        catConditions.push({ subcategorySlug: r });
        catConditions.push({ category: r });
      });
      catConditions.push({ specialty: new RegExp(category.replace(/[-\s]+/g, '.*'), "i") });

      if (subcategory) {
        baseFilter.$or = [
          { categorySlug: category, subcategorySlug: subcategory },
          { categorySlug: subcategory },
          { subcategorySlug: subcategory },
          { specialty: new RegExp(subcategory.replace(/[-\s]+/g, '.*'), "i") },
        ];
      } else {
        baseFilter.$or = catConditions;
      }
    }
    if (minPrice) baseFilter.budgetMin = { $gte: Number(minPrice) };
    if (maxPrice) baseFilter.budgetMax = { $lte: Number(maxPrice) };
    if (verified === 'true') baseFilter.verified = true;
    if (featured === 'true') baseFilter.featured = true;

    let creators = await Creator.find(baseFilter).populate("user", "name avatar phone").lean();

    // ═══ STRICT VISIBILITY FILTERING ═══
    // Each creator is visible ONLY based on their travelPreference + serviceAreas
    const customerCity = (city || '').toLowerCase().trim();
    const customerDistrict = (district || '').toLowerCase().trim();
    const customerState = (state || '').toLowerCase().trim();
    const searchText = (search || '').toLowerCase().trim();

    creators = creators.filter(c => {
      const pref = c.travelPreference || '';
      const creatorCity = (c.baseCity || c.city || '').toLowerCase().trim();
      const creatorDistrict = (c.district || '').toLowerCase().trim();
      const creatorState = (c.state || '').toLowerCase().trim();
      const areas = (c.serviceAreas || []).map((a) => a.toLowerCase().trim());
      const creatorName = (c.user?.name || '').toLowerCase();
      const creatorSpec = (c.specialty || '').toLowerCase();

      // If search text provided — match against name, specialty, city, district, serviceAreas
      if (searchText && !customerCity && !customerDistrict && !customerState) {
        // Pure text search (user typed something not in the picker)
        if (creatorName.includes(searchText)) return true;
        if (creatorSpec.includes(searchText)) return true;
        if (creatorCity.includes(searchText)) return true;
        if (creatorDistrict.includes(searchText)) return true;
        if (creatorState.includes(searchText)) return true;
        if (areas.some(a => a.includes(searchText))) return true;
        return false;
      }

      // Rule 1: Check Service Areas (always applies regardless of travel preference)
      if (customerCity && areas.includes(customerCity)) return true;
      if (customerDistrict && areas.includes(customerDistrict)) return true;

      // Rule 2: Apply Travel Preference rules
      switch (pref) {
        case 'only_my_city':
          // Visible ONLY in their home city
          return customerCity && creatorCity === customerCity;

        case 'my_district':
          // Visible anywhere in their home district
          if (customerDistrict && creatorDistrict === customerDistrict) return true;
          return customerCity && creatorCity === customerCity;

        case 'multiple_districts':
          // Visible in selected districts
          const selDists = (c.selectedDistricts || []).map((d) => d.toLowerCase().trim());
          if (selDists.length > 0) {
            if (customerDistrict && selDists.includes(customerDistrict)) return true;
            if (customerCity && selDists.includes(customerCity)) return true;
            return false;
          }
          // Fallback to serviceAreas
          if (customerDistrict && areas.includes(customerDistrict)) return true;
          if (customerCity && areas.includes(customerCity)) return true;
          return false;

        case 'entire_state':
          // Visible anywhere in their home state — BUT only if same state
          if (customerState && creatorState === customerState) {
            // Tag as state-level match (will be sorted lower)
            c._stateLevel = true;
            return true;
          }
          return false;

        case 'multiple_states':
          // Visible in selected states
          const selStates = (c.selectedStates || []).map((s) => s.toLowerCase().trim());
          if (selStates.length > 0) {
            if (customerState && selStates.includes(customerState)) {
              c._stateLevel = true;
              return true;
            }
          }
          return false;

        case 'pan_india':
          // Visible everywhere but tagged as lowest priority
          c._stateLevel = true;
          return true;

        default:
          // No preference set — only show if creator's city/district matches
          if (customerCity && creatorCity === customerCity) return true;
          if (customerDistrict && creatorDistrict === customerDistrict) return true;
          return false;
      }
    });

    // Sort
    if (sort === 'rated') creators.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === 'price') creators.sort((a, b) => (a.budgetMin || 0) - (b.budgetMin || 0));
    else if (sort === 'bookings') creators.sort((a, b) => (b.weddingsCount || 0) - (a.weddingsCount || 0));
    else if (sort === 'newest') creators.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sort === 'featured') creators.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    else {
      // Default: prioritize locality. Same city > same district > same state (entire_state)
      creators.sort((a, b) => {
        const aCity = (a.baseCity || a.city || '').toLowerCase();
        const bCity = (b.baseCity || b.city || '').toLowerCase();
        const aDistrict = (a.district || '').toLowerCase();
        const bDistrict = (b.district || '').toLowerCase();
        
        // Priority 1: Exact city match
        const aCityMatch = customerCity && aCity === customerCity ? 3 : 0;
        const bCityMatch = customerCity && bCity === customerCity ? 3 : 0;
        
        // Priority 2: Same district
        const aDistMatch = customerDistrict && aDistrict === customerDistrict ? 2 : 0;
        const bDistMatch = customerDistrict && bDistrict === customerDistrict ? 2 : 0;
        
        // Priority 3: In service areas
        const aAreas = (a.serviceAreas || []).map(x => x.toLowerCase());
        const aInAreas = (customerCity && aAreas.includes(customerCity)) || (customerDistrict && aAreas.includes(customerDistrict)) ? 1 : 0;
        const bAreas = (b.serviceAreas || []).map(x => x.toLowerCase());
        const bInAreas = (customerCity && bAreas.includes(customerCity)) || (customerDistrict && bAreas.includes(customerDistrict)) ? 1 : 0;
        
        const aScore = aCityMatch + aDistMatch + aInAreas;
        const bScore = bCityMatch + bDistMatch + bInAreas;
        
        if (aScore !== bScore) return bScore - aScore;
        // Featured + rating as tiebreaker
        if (a.featured !== b.featured) return b.featured ? 1 : -1;
        return (b.rating || 0) - (a.rating || 0);
      });
    }

    // Normalize portfolio
    creators.forEach(c => {
      if (c.portfolio) c.portfolio = c.portfolio.map(item => typeof item === 'string' ? item : (item?.url || ''));
    });

    console.log(`[Discovery] city=${city} district=${district} state=${state} | Found: ${creators.length} (strict filter)`);
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
    const { serviceAreas, selectedDistricts, selectedStates, travelPreference, maxTravelDistance, baseCity, state, district, studioName, studioAddress, pincode } = req.body;
    const update = {};
    if (serviceAreas !== undefined) update.serviceAreas = serviceAreas;
    if (selectedDistricts !== undefined) update.selectedDistricts = selectedDistricts;
    if (selectedStates !== undefined) update.selectedStates = selectedStates;
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
