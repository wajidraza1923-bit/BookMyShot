const express = require("express");
const Creator = require("../models/Creator");
const User = require("../models/User");
const CalendarEvent = require("../models/CalendarEvent");
const { protect, authorize } = require("../middleware/auth");
const { upload, uploadPhotos, uploadVideos } = require("../middleware/upload");

// Media slot limits
const MAX_PHOTOS = 10;
const MAX_VIDEOS = 4;

const router = express.Router();

// ═══ Known city coordinates (fallback when creator has no GPS coordinates) ═══
const CITY_COORDS = {
  'poonch': [33.77, 74.09], 'surankote': [33.64, 74.03], 'rajouri': [33.38, 74.31],
  'jammu': [32.73, 74.87], 'srinagar': [34.08, 74.79], 'kathua': [32.39, 75.52],
  'udhampur': [32.92, 75.14], 'anantnag': [33.73, 75.15], 'baramulla': [34.20, 74.34],
  'doda': [33.15, 75.55], 'kishtwar': [33.31, 75.77], 'reasi': [33.08, 74.83],
  'sunderbani': [33.36, 74.20], 'mendhar': [33.75, 74.10], 'haveli': [33.82, 73.97],
  'delhi': [28.61, 77.21], 'new delhi': [28.61, 77.21], 'mumbai': [19.07, 72.87],
  'bangalore': [12.97, 77.59], 'bengaluru': [12.97, 77.59], 'jaipur': [26.91, 75.79],
  'chandigarh': [30.73, 76.77], 'lucknow': [26.85, 80.95], 'pune': [18.52, 73.85],
  'hyderabad': [17.38, 78.49], 'kolkata': [22.57, 88.36], 'ahmedabad': [23.02, 72.57],
  'goa': [15.49, 73.83], 'noida': [28.57, 77.32], 'gurgaon': [28.46, 77.03],
  'gurugram': [28.46, 77.03], 'amritsar': [31.63, 74.87], 'ludhiana': [30.90, 75.86],
  'dehradun': [30.32, 78.03], 'patna': [25.60, 85.10], 'bhopal': [23.26, 77.41],
  'indore': [22.72, 75.86], 'nagpur': [21.15, 79.09], 'chennai': [13.08, 80.27],
  'coimbatore': [11.00, 76.96], 'kochi': [9.93, 76.26], 'thiruvananthapuram': [8.52, 76.94],
  'visakhapatnam': [17.69, 83.22], 'agra': [27.18, 78.02], 'varanasi': [25.32, 83.01],
  'udaipur': [24.58, 73.68], 'jodhpur': [26.29, 73.02], 'mysore': [12.30, 76.66],
};

// Haversine distance formula (km)
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Get creator coordinates: use stored lat/lng, or fallback to city lookup
function getCreatorCoords(creator) {
  if (creator.latitude && creator.longitude) {
    return { lat: creator.latitude, lng: creator.longitude, source: 'gps' };
  }
  // Fallback: lookup city
  const city = (creator.city || creator.location || '').toLowerCase().trim();
  const match = CITY_COORDS[city];
  if (match) return { lat: match[0], lng: match[1], source: 'city' };
  return null;
}

// ═══ Public: Get nearby creators with distance calculation ═══
router.get("/nearby", async (req, res, next) => {
  try {
    const { lat, lng, radius, category } = req.query;
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const maxRadius = parseFloat(radius) || 100; // default 100km

    if (!userLat || !userLng || isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({ success: false, message: "User latitude and longitude required (lat, lng query params)" });
    }

    // Fetch all approved creators
    const filter = { status: "approved" };
    const creators = await Creator.find(filter).populate("user", "name avatar").lean();

    // Calculate distance for each creator
    const withDistance = creators.map(c => {
      const coords = getCreatorCoords(c);
      if (!coords) return { ...c, distance: null, distanceSource: 'none' };
      const distance = haversineKm(userLat, userLng, coords.lat, coords.lng);
      return { ...c, distance: Math.round(distance * 10) / 10, distanceSource: coords.source, creatorLat: coords.lat, creatorLng: coords.lng };
    });

    // Filter by radius
    let results = withDistance.filter(c => c.distance !== null && c.distance <= maxRadius);

    // Filter by category if provided
    if (category && category !== 'all') {
      results = results.filter(c => {
        const cat = (c.category || c.categorySlug || c.specialty || '').toLowerCase();
        return cat.includes(category.toLowerCase());
      });
    }

    // Sort by distance (nearest first)
    results.sort((a, b) => (a.distance || 9999) - (b.distance || 9999));

    // Normalize portfolio/videos
    results.forEach(c => {
      if (c.portfolio) c.portfolio = c.portfolio.map(item => typeof item === 'string' ? item : (item?.url || ''));
      if (c.videos) c.videos = c.videos.map(item => typeof item === 'string' ? item : (item?.url || ''));
    });

    console.log(`[NearMe] User: ${userLat.toFixed(4)}, ${userLng.toFixed(4)} | Found: ${results.length} creators within ${maxRadius}km`);

    res.json({
      success: true,
      count: results.length,
      userLocation: { lat: userLat, lng: userLng },
      creators: results,
    });
  } catch (e) {
    next(e);
  }
});

// ═══ Live search suggestions (as-you-type, grouped) ═══
router.get("/suggestions", async (req, res, next) => {
  try {
    const { q, state } = req.query;
    if (!q || String(q).length < 2) return res.json({ success: true, locations: [], creators: [], categories: [], popular: [] });

    const query = String(q).trim();
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const selectedState = state ? String(state).trim() : '';

    // Search locations — filter by state if provided
    const ServiceLocation = require("../models/ServiceLocation");
    const locFilter = { isActive: true, $or: [{ city: regex }, { district: regex }] };
    if (selectedState) locFilter.state = new RegExp(selectedState, 'i');
    const locations = await ServiceLocation.find(locFilter).limit(5).lean();

    // Search creators by name — filter by state
    const creatorUsers = await User.find({ name: regex, role: 'creator' }).select('_id name').limit(10);
    const creatorIds = creatorUsers.map(u => u._id);
    let creatorFilter = { user: { $in: creatorIds }, status: "approved" };
    if (selectedState) creatorFilter.state = new RegExp(selectedState, 'i');
    const creatorResults = creatorIds.length > 0
      ? await Creator.find(creatorFilter).populate("user", "name avatar").select("user specialty city studioName categorySlug state").limit(5).lean()
      : [];

    // Search categories/services
    const catFilter = { status: "approved", specialty: regex };
    if (selectedState) catFilter.state = new RegExp(selectedState, 'i');
    const categoryMatches = await Creator.distinct("specialty", catFilter);
    const categoryResults = categoryMatches.slice(0, 5);

    res.json({
      success: true,
      locations: locations.map(l => ({ city: l.city, district: l.district, state: l.state })),
      creators: creatorResults.map(c => ({ _id: c._id, name: c.user?.name, avatar: c.user?.avatar, specialty: c.specialty, city: c.city, studioName: c.studioName })),
      categories: categoryResults,
      popular: ['Wedding Photographer', 'Bridal Makeup', 'Mehendi Artist', 'Wedding Decor', 'DJ'].filter(p => regex.test(p)),
    });
  } catch (e) { next(e); }
});

// ═══ Fast creator search (real-time, as-you-type) ═══
router.get("/search", async (req, res, next) => {
  try {
    const { q, state, district, category } = req.query;
    if (!q || String(q).length < 2) return res.json({ success: true, creators: [], suggestions: [] });

    const query = String(q).trim();
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const selectedState = state ? String(state).toLowerCase().trim() : '';
    const selectedDistrict = district ? String(district).toLowerCase().trim() : '';

    // Step 1: Find creators matching the search text
    const textFilter = {
      status: "approved",
      $or: [
        { specialty: regex },
        { category: regex },
        { categorySlug: regex },
        { subcategorySlug: regex },
        { city: regex },
        { baseCity: regex },
        { district: regex },
        { state: regex },
        { studioName: regex },
        { serviceAreas: { $elemMatch: { $regex: regex } } },
      ],
    };
    if (category) textFilter.categorySlug = new RegExp(category, 'i');

    let creators = await Creator.find(textFilter).populate("user", "name avatar").limit(50).lean();

    // Also search by user name
    const userMatches = await User.find({ name: regex, role: 'creator' }).select('_id').limit(10);
    if (userMatches.length > 0) {
      const nameFilter = { user: { $in: userMatches.map(u => u._id) }, status: "approved" };
      const nameResults = await Creator.find(nameFilter).populate("user", "name avatar").limit(10).lean();
      creators = [...creators, ...nameResults];
    }

    // Deduplicate
    const seen = new Set();
    creators = creators.filter(c => { const id = c._id.toString(); if (seen.has(id)) return false; seen.add(id); return true; });

    // Search shows ALL matching creators — no location restriction
    // (Location filtering is done on Near Me/Discovery pages, not on text search)

    // STATE FILTER: If state is provided, only show creators from that state
    // (Creators with no state or pan_india preference still show)
    if (state) {
      const selectedState = String(state).toLowerCase().trim();
      creators = creators.filter(c => {
        const creatorState = (c.state || '').toLowerCase().trim();
        const pref = c.travelPreference || '';
        // Pan India creators show everywhere
        if (pref === 'pan_india') return true;
        // No state set on creator = show everywhere (default)
        if (!creatorState) return true;
        // Must match selected state
        return creatorState === selectedState;
      });
    }

    // Normalize portfolio
    creators.forEach(c => {
      if (c.portfolio) c.portfolio = c.portfolio.map((item) => typeof item === 'string' ? item : (item?.url || ''));
    });

    // Generate suggestions
    const suggestions = [];
    const addSuggestion = (val) => { if (val && !suggestions.includes(val)) suggestions.push(val); };
    creators.forEach(c => {
      if (c.specialty && regex.test(c.specialty)) addSuggestion(c.specialty);
      if (c.city && regex.test(c.city)) addSuggestion(c.city);
      if (c.district && regex.test(c.district)) addSuggestion(c.district);
    });

    console.log(`[Search] q="${query}" state="${selectedState}" district="${selectedDistrict}" → ${creators.length} results`);
    res.json({ success: true, count: creators.length, creators: creators.slice(0, 20), suggestions: suggestions.slice(0, 5) });
  } catch (e) { next(e); }
});

// Public: list approved creators with filters (NO email exposed)
router.get("/", async (req, res, next) => {
  try {
    const { city, category, subcategory, budget, search, featured } = req.query;
    const filter = { status: "approved" };
    // Include creators with free/active/trial OR missing subscriptionStatus (legacy)
    const conditions = [{ $or: [{ subscriptionStatus: { $in: ["free", "active", "trial"] } }, { subscriptionStatus: { $exists: false } }, { subscriptionStatus: "" }, { subscriptionStatus: null }] }];

    if (city) filter.city = new RegExp(city, "i");
    if (category && subcategory) {
      // When both category and subcategory are provided, match creators who have EITHER:
      // - categorySlug = parent category AND subcategorySlug = subcategory
      // - OR categorySlug = subcategory (creators who saved subcategory as their categorySlug)
      // - OR specialty matches the subcategory name
      conditions.push({ $or: [
        { categorySlug: category, subcategorySlug: subcategory },
        { categorySlug: subcategory },
        { subcategorySlug: subcategory },
        { specialty: new RegExp(subcategory.replace(/[-\s]+/g, '.*'), "i") },
        { category: new RegExp(subcategory.replace(/[-\s]+/g, '.*'), "i") },
      ]});
    } else if (category) {
      conditions.push({ $or: [
        { categorySlug: category },
        { category: new RegExp(category.replace(/[-\s]+/g, '.*'), "i") },
      ]});
    } else if (subcategory) {
      conditions.push({ $or: [
        { subcategorySlug: subcategory },
        { categorySlug: subcategory },
        { specialty: new RegExp(subcategory.replace(/[-\s]+/g, '.*'), "i") },
      ]});
    }
    if (featured === "true") filter.featured = true;
    if (budget) filter.budgetMax = { $gte: Number(budget) };
    if (conditions.length > 0) filter.$and = conditions;

    let creators = await Creator.find(filter).populate("user", "name avatar");

    if (search) {
      const s = search.toLowerCase();
      creators = creators.filter(
        (c) =>
          c.user?.name?.toLowerCase().includes(s) ||
          c.specialty?.toLowerCase().includes(s) ||
          c.city?.toLowerCase().includes(s)
      );
    }

    // Apply search boost ordering: creators with active boosts appear first
    try {
      const SearchBoost = require("../models/SearchBoost");
      const activeBoosts = await SearchBoost.find({
        status: "active",
        endDate: { $gte: new Date() },
        boostType: { $in: ["top_search", "category_priority"] },
      }).select("creator boostType").lean();

      if (activeBoosts.length > 0) {
        const boostedIds = new Set(activeBoosts.map(b => b.creator.toString()));
        // Sort: displayOrder (admin manual) > boosted > featured > rating
        creators.sort((a, b) => {
          // Admin manual display order takes highest priority
          const aOrder = a.displayOrder || 9999;
          const bOrder = b.displayOrder || 9999;
          if (aOrder !== bOrder) return aOrder - bOrder;
          // Then boosted
          const aBoost = boostedIds.has(a._id.toString()) ? 1 : 0;
          const bBoost = boostedIds.has(b._id.toString()) ? 1 : 0;
          if (aBoost !== bBoost) return bBoost - aBoost;
          if (a.featured !== b.featured) return b.featured ? 1 : -1;
          return (b.rating || 0) - (a.rating || 0);
        });
      }
    } catch (boostErr) {
      // Fallback: sort by displayOrder then rating
      creators.sort((a, b) => {
        const aOrder = a.displayOrder || 9999;
        const bOrder = b.displayOrder || 9999;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return (b.rating || 0) - (a.rating || 0);
      });
    }

    // Normalize portfolio/video items to strings (lean() bypasses toJSON transform)
    creators.forEach(c => {
      if (c.portfolio) c.portfolio = c.portfolio.map((item) => typeof item === 'string' ? item : (item?.url || item?.uri || ''));
      if (c.videos) c.videos = c.videos.map((item) => typeof item === 'string' ? item : (item?.url || item?.uri || ''));
    });

    res.json({ success: true, creators });
  } catch (e) {
    next(e);
  }
});

// Public: single creator with full user data (for portfolio page)
router.get("/public/:id", async (req, res, next) => {
  try {
    const creator = await Creator.findById(req.params.id)
      .populate("user", "name email avatar phone")
      .select("-__v");
    if (!creator || creator.status !== "approved") {
      return res.status(404).json({ success: false, message: "Creator not found" });
    }

    // If subscription expired, mark as unavailable (profile visible but can't accept work)
    const isAvailable = ["active", "trial"].includes(creator.subscriptionStatus);

    const user = creator.user || {};
    res.json({ success: true, creator, user, isAvailable });
  } catch (e) {
    next(e);
  }
});

// Creator: get own profile (includes email for dashboard use)
// MUST be before /:id to prevent "profile" from being treated as an ObjectId
router.get("/profile", protect, authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id }).populate("user", "name email phone avatar");
    if (!creator) return res.status(404).json({ success: false, message: "Creator profile not found" });
    res.json({ success: true, creator });
  } catch (e) {
    next(e);
  }
});

// Creator: update own profile
router.put("/profile", protect, authorize("creator"), async (req, res, next) => {
  try {
    // Whitelist allowed fields — prevent creators from modifying sensitive fields
    const ALLOWED_FIELDS = ['specialty', 'bio', 'experience', 'location', 'city', 'category', 'categorySlug', 'subcategorySlug', 'categoryGroup', 'categoryData', 'budgetMin', 'budgetMax', 'social', 'gear', 'team', 'darkMode', 'coverImage', 'state', 'district', 'baseCity', 'studioName', 'studioAddress', 'pincode', 'serviceAreas', 'selectedDistricts', 'selectedStates', 'travelPreference', 'maxTravelDistance'];
    const update = {};
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const creator = await Creator.findOneAndUpdate(
      { user: req.user._id },
      { $set: update },
      { new: true, runValidators: true }
    );
    // Also update user name/phone if provided
    if (req.body.name || req.body.phone) {
      await User.findByIdAndUpdate(req.user._id, {
        ...(req.body.name && { name: req.body.name }),
        ...(req.body.phone && { phone: req.body.phone }),
      });
    }
    res.json({ success: true, creator });
  } catch (e) {
    next(e);
  }
});

// Public: single creator with full user data (alternate URL used by portfolio page)
router.get("/:id/public", async (req, res, next) => {
  try {
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: "Invalid creator ID" });
    }
    const creator = await Creator.findById(req.params.id)
      .populate("user", "name email avatar phone")
      .select("-__v");
    if (!creator || creator.status !== "approved") {
      return res.status(404).json({ success: false, message: "Creator not found" });
    }
    const user = creator.user || {};
    res.json({ success: true, creator, user });
  } catch (e) {
    next(e);
  }
});

// Public: get creator's blocked/unavailable dates (for portfolio display)
router.get("/:id/availability", async (req, res, next) => {
  try {
    const creator = await Creator.findById(req.params.id);
    if (!creator || creator.status !== "approved") {
      return res.status(404).json({ success: false, message: "Creator not found" });
    }
    const events = await CalendarEvent.find({
      creator: creator._id,
      type: { $in: ["unavailable", "booking"] },
      date: { $gte: new Date() },
    }).sort("date");
    res.json({ success: true, events });
  } catch (e) {
    next(e);
  }
});

// Get media stats (slots, sizes) — must be BEFORE /:id to avoid conflict
router.get(
  "/media-stats",
  protect,
  authorize("creator"),
  async (req, res, next) => {
    try {
      const creator = await Creator.findOne({ user: req.user._id });
      if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

      const photoCount = (creator.portfolio || []).length;
      const videoCount = (creator.videos || []).length;

      let totalBytes = 0;
      (creator.portfolio || []).forEach((item) => {
        if (typeof item === "object" && item.size) totalBytes += item.size;
      });
      (creator.videos || []).forEach((item) => {
        if (typeof item === "object" && item.size) totalBytes += item.size;
      });

      res.json({
        success: true,
        photos: { used: photoCount, max: MAX_PHOTOS, remaining: MAX_PHOTOS - photoCount },
        videos: { used: videoCount, max: MAX_VIDEOS, remaining: MAX_VIDEOS - videoCount },
        storage: { totalBytes, totalMB: Math.round(totalBytes / (1024 * 1024) * 10) / 10 },
      });
    } catch (e) {
      next(e);
    }
  }
);

// Public: single creator (NO email exposed)
// MUST be AFTER /profile, /:id/public, /:id/availability to avoid catching those paths
router.get("/:id", async (req, res, next) => {
  try {
    const creator = await Creator.findById(req.params.id)
      .populate("user", "name avatar")
      .select("-__v");
    if (!creator || creator.status !== "approved") {
      return res.status(404).json({ success: false, message: "Creator not found" });
    }
    res.json({ success: true, creator });
  } catch (e) {
    next(e);
  }
});

// Upload avatar
router.post(
  "/upload/avatar",
  protect,
  authorize("creator", "user", "admin"),
  upload.single("avatar"),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: "No file" });
      
      const { uploadBuffer, deleteFile, isConfigured } = require("../services/cloudinaryService");
      let url, publicId = "";
      
      if (isConfigured()) {
        const result = await uploadBuffer(req.file.buffer, {
          folder: "bookmyshot/avatars",
          resourceType: "image",
        });
        url = result.url;
        publicId = result.publicId;
        
        // Delete old avatar from Cloudinary if exists
        const existingUser = await User.findById(req.user._id).select("avatarPublicId");
        if (existingUser && existingUser.avatarPublicId) {
          await deleteFile(existingUser.avatarPublicId, "image");
        }
      } else {
        // Fallback: save locally (dev environment)
        const fs = require("fs");
        const path = require("path");
        const uploadDir = path.join(__dirname, "../../public/uploads/avatars");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(req.file.originalname)}`;
        fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
        url = `/uploads/avatars/${filename}`;
      }
      
      await User.findByIdAndUpdate(req.user._id, { avatar: url, avatarPublicId: publicId });
      res.json({ success: true, url });
    } catch (e) {
      next(e);
    }
  }
);

// Upload cover image
router.post(
  "/upload/cover",
  protect,
  authorize("creator"),
  upload.single("cover"),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: "No file" });

      const { uploadBuffer, deleteFile, isConfigured } = require("../services/cloudinaryService");
      let url, publicId = "";

      if (isConfigured()) {
        const result = await uploadBuffer(req.file.buffer, {
          folder: "bookmyshot/covers",
          resourceType: "image",
          transformation: { width: 1200, height: 400, crop: "fill", gravity: "auto" },
        });
        url = result.url;
        publicId = result.publicId;

        // Delete old cover from Cloudinary if exists
        const creator = await Creator.findOne({ user: req.user._id }).select("coverImagePublicId");
        if (creator && creator.coverImagePublicId) {
          await deleteFile(creator.coverImagePublicId, "image");
        }
      } else {
        const fs = require("fs");
        const path = require("path");
        const uploadDir = path.join(__dirname, "../../public/uploads/covers");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(req.file.originalname)}`;
        fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
        url = `/uploads/covers/${filename}`;
      }

      await Creator.findOneAndUpdate({ user: req.user._id }, { coverImage: url, coverImagePublicId: publicId });
      res.json({ success: true, url });
    } catch (e) {
      next(e);
    }
  }
);

// Remove cover image
router.delete("/cover", protect, authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id }).select("coverImagePublicId");
    if (creator && creator.coverImagePublicId) {
      const { deleteFile, isConfigured } = require("../services/cloudinaryService");
      if (isConfigured()) await deleteFile(creator.coverImagePublicId, "image");
    }
    await Creator.findOneAndUpdate({ user: req.user._id }, { coverImage: "", coverImagePublicId: "" });
    res.json({ success: true, message: "Cover image removed" });
  } catch (e) { next(e); }
});

// Upload portfolio
router.post(
  "/upload/portfolio",
  protect,
  authorize("creator"),
  uploadPhotos.array("photos", 10),
  async (req, res, next) => {
    try {
      if (!req.files || !req.files.length) return res.status(400).json({ success: false, message: "No files" });
      
      const creator = await Creator.findOne({ user: req.user._id });
      const currentCount = (creator.portfolio || []).length;
      const availableSlots = MAX_PHOTOS - currentCount;
      
      if (availableSlots <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: `Maximum ${MAX_PHOTOS} portfolio photos allowed. Delete an existing photo to upload a new one.`,
          currentCount,
          maxAllowed: MAX_PHOTOS,
        });
      }
      
      // Limit files to available slots
      const filesToUpload = req.files.slice(0, availableSlots);
      if (filesToUpload.length < req.files.length) {
        // Some files won't be uploaded due to slot limits
      }
      
      const { uploadBuffer, isConfigured } = require("../services/cloudinaryService");
      let items;
      
      if (isConfigured()) {
        const uploads = await Promise.all(
          filesToUpload.map((f) => uploadBuffer(f.buffer, {
            folder: "bookmyshot/portfolio",
            resourceType: "image",
          }))
        );
        items = uploads.map((u, i) => ({ url: u.url, publicId: u.publicId, size: filesToUpload[i].size, uploadedAt: new Date() }));
      } else {
        const fs = require("fs");
        const path = require("path");
        const uploadDir = path.join(__dirname, "../../public/uploads/portfolio");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        items = filesToUpload.map((f) => {
          const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(f.originalname)}`;
          fs.writeFileSync(path.join(uploadDir, filename), f.buffer);
          return { url: `/uploads/portfolio/${filename}`, publicId: "", size: f.size, uploadedAt: new Date() };
        });
      }
      
      creator.portfolio.push(...items);
      await creator.save();
      
      const newCount = creator.portfolio.length;
      res.json({ 
        success: true, 
        portfolio: creator.portfolio,
        uploaded: items.length,
        skipped: req.files.length - filesToUpload.length,
        slots: { used: newCount, max: MAX_PHOTOS, remaining: MAX_PHOTOS - newCount },
      });
    } catch (e) {
      if (e.message && e.message.includes("File too large")) {
        return res.status(400).json({ success: false, message: "Photo size exceeds 10 MB limit." });
      }
      next(e);
    }
  }
);

// Upload videos
router.post(
  "/upload/videos",
  protect,
  authorize("creator"),
  uploadVideos.array("videos", 4),
  async (req, res, next) => {
    try {
      if (!req.files || !req.files.length) return res.status(400).json({ success: false, message: "No files" });
      
      const creator = await Creator.findOne({ user: req.user._id });
      const currentCount = (creator.videos || []).length;
      const availableSlots = MAX_VIDEOS - currentCount;
      
      if (availableSlots <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: `Maximum ${MAX_VIDEOS} portfolio videos allowed. Delete an existing video to upload a new one.`,
          currentCount,
          maxAllowed: MAX_VIDEOS,
        });
      }
      
      // Limit files to available slots
      const filesToUpload = req.files.slice(0, availableSlots);
      
      const { uploadBuffer, isConfigured } = require("../services/cloudinaryService");
      let items;
      
      if (isConfigured()) {
        const uploads = await Promise.all(
          filesToUpload.map((f) => uploadBuffer(f.buffer, {
            folder: "bookmyshot/videos",
            resourceType: "video",
          }))
        );
        items = uploads.map((u, i) => ({ url: u.url, publicId: u.publicId, size: filesToUpload[i].size, uploadedAt: new Date() }));
      } else {
        const fs = require("fs");
        const path = require("path");
        const uploadDir = path.join(__dirname, "../../public/uploads/videos");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        items = filesToUpload.map((f) => {
          const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(f.originalname)}`;
          fs.writeFileSync(path.join(uploadDir, filename), f.buffer);
          return { url: `/uploads/videos/${filename}`, publicId: "", size: f.size, uploadedAt: new Date() };
        });
      }
      
      creator.videos.push(...items);
      await creator.save();
      
      const newCount = creator.videos.length;
      res.json({ 
        success: true, 
        videos: creator.videos,
        uploaded: items.length,
        skipped: req.files.length - filesToUpload.length,
        slots: { used: newCount, max: MAX_VIDEOS, remaining: MAX_VIDEOS - newCount },
      });
    } catch (e) {
      if (e.message && e.message.includes("File too large")) {
        return res.status(400).json({ success: false, message: "Video size exceeds 50 MB limit." });
      }
      next(e);
    }
  }
);

// Delete portfolio image
router.delete(
  "/portfolio",
  protect,
  authorize("creator"),
  async (req, res, next) => {
    try {
      const { url, publicId } = req.body;
      if (!url && !publicId) return res.status(400).json({ success: false, message: "URL or publicId required" });

      const creator = await Creator.findOne({ user: req.user._id });
      if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

      const idx = creator.portfolio.findIndex((item) => {
        if (typeof item === "string") return item === url;
        return item.url === url || item.publicId === publicId;
      });

      if (idx === -1) return res.status(404).json({ success: false, message: "Image not found in portfolio" });

      const removed = creator.portfolio[idx];
      creator.portfolio.splice(idx, 1);
      await creator.save();

      // Delete from Cloudinary
      const { deleteFile, isConfigured } = require("../services/cloudinaryService");
      if (isConfigured()) {
        const pid = typeof removed === "string" ? "" : (removed.publicId || "");
        if (pid) {
          await deleteFile(pid, "image");
        }
      }

      const newCount = creator.portfolio.length;
      res.json({ 
        success: true, 
        portfolio: creator.portfolio,
        slots: { used: newCount, max: MAX_PHOTOS, remaining: MAX_PHOTOS - newCount },
      });
    } catch (e) {
      next(e);
    }
  }
);

// Delete video
router.delete(
  "/videos",
  protect,
  authorize("creator"),
  async (req, res, next) => {
    try {
      const { url, publicId } = req.body;
      if (!url && !publicId) return res.status(400).json({ success: false, message: "URL or publicId required" });

      const creator = await Creator.findOne({ user: req.user._id });
      if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

      const idx = creator.videos.findIndex((item) => {
        if (typeof item === "string") return item === url;
        return item.url === url || item.publicId === publicId;
      });

      if (idx === -1) return res.status(404).json({ success: false, message: "Video not found" });

      const removed = creator.videos[idx];
      creator.videos.splice(idx, 1);
      await creator.save();

      // Delete from Cloudinary
      const { deleteFile, isConfigured } = require("../services/cloudinaryService");
      if (isConfigured()) {
        const pid = typeof removed === "string" ? "" : (removed.publicId || "");
        if (pid) {
          await deleteFile(pid, "video");
        }
      }

      const newCount = creator.videos.length;
      res.json({ 
        success: true, 
        videos: creator.videos,
        slots: { used: newCount, max: MAX_VIDEOS, remaining: MAX_VIDEOS - newCount },
      });
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;