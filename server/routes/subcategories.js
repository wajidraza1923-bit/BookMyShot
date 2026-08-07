const express = require("express");
const Category = require("../models/Category");
const Subcategory = require("../models/Subcategory");
const Creator = require("../models/Creator");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// ═══ PUBLIC: Get subcategories for a category ═══
router.get("/:categorySlug", async (req, res, next) => {
  try {
    const { categorySlug } = req.params;

    // Verify category exists
    const category = await Category.findOne({ slug: categorySlug }).lean();
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    // Get active subcategories sorted by sortOrder
    let subcategories = await Subcategory.find({
      parentCategorySlug: categorySlug,
      isActive: true,
    }).sort("sortOrder").lean();

    // Auto-seed subcategories if none exist for this category
    if (subcategories.length === 0) {
      const seedMap = {
        "photography-videography": [
          { name: "Wedding Photography", slug: "wedding-photography", icon: "camera-outline" },
          { name: "Pre-Wedding Shoot", slug: "pre-wedding-shoot", icon: "heart-outline" },
          { name: "Maternity Shoot", slug: "maternity-shoot", icon: "flower-outline" },
          { name: "Baby Shoot", slug: "baby-shoot", icon: "happy-outline" },
          { name: "Candid Photography", slug: "candid-photography", icon: "aperture-outline" },
          { name: "Wedding Films", slug: "wedding-films", icon: "film-outline" },
          { name: "Cinematic Video", slug: "cinematic-video", icon: "videocam-outline" },
          { name: "Drone Videography", slug: "drone-videography", icon: "airplane-outline" },
        ],
        "makeup-artists": [
          { name: "Bridal Makeup", slug: "bridal-makeup", icon: "color-palette-outline" },
          { name: "Party Makeup", slug: "party-makeup", icon: "sparkles-outline" },
          { name: "Engagement Makeup", slug: "engagement-makeup", icon: "diamond-outline" },
          { name: "Hair Styling", slug: "hair-styling", icon: "cut-outline" },
          { name: "Mehndi Artist", slug: "mehndi-artist", icon: "hand-left-outline" },
        ],
        "decoration-floral": [
          { name: "Mandap Decoration", slug: "mandap-decoration", icon: "home-outline" },
          { name: "Stage Decoration", slug: "stage-decoration", icon: "easel-outline" },
          { name: "Floral Arrangement", slug: "floral-arrangement", icon: "flower-outline" },
          { name: "Lighting & LED", slug: "lighting-led", icon: "bulb-outline" },
          { name: "Car Decoration", slug: "car-decoration", icon: "car-outline" },
        ],
        "wedding-planners": [
          { name: "Full Wedding Planning", slug: "full-wedding-planning", icon: "clipboard-outline" },
          { name: "Day-of Coordination", slug: "day-of-coordination", icon: "today-outline" },
          { name: "Destination Wedding", slug: "destination-wedding-planning", icon: "navigate-outline" },
          { name: "Budget Planning", slug: "budget-planning", icon: "wallet-outline" },
        ],
        "catering-services": [
          { name: "Veg Catering", slug: "veg-catering", icon: "leaf-outline" },
          { name: "Non-Veg Catering", slug: "non-veg-catering", icon: "restaurant-outline" },
          { name: "Multi-Cuisine", slug: "multi-cuisine", icon: "globe-outline" },
          { name: "Live Food Counter", slug: "live-food-counter", icon: "flame-outline" },
          { name: "Bakery & Cakes", slug: "bakery-cakes", icon: "cafe-outline" },
        ],
        "venues": [
          { name: "Banquet Halls", slug: "banquet-halls", icon: "business-outline" },
          { name: "Hotels & Resorts", slug: "hotels-resorts", icon: "bed-outline" },
          { name: "Farm Houses", slug: "farm-houses", icon: "leaf-outline" },
          { name: "Open Lawns", slug: "open-lawns", icon: "sunny-outline" },
          { name: "Heritage Properties", slug: "heritage-properties", icon: "castle-outline" },
        ],
        "djs-entertainment": [
          { name: "Wedding DJ", slug: "wedding-dj", icon: "musical-notes-outline" },
          { name: "Live Band", slug: "live-band", icon: "mic-outline" },
          { name: "Singer / Performer", slug: "singer-performer", icon: "person-outline" },
          { name: "Anchor / Emcee", slug: "anchor-emcee", icon: "megaphone-outline" },
          { name: "Dhol / Brass Band", slug: "dhol-brass-band", icon: "volume-high-outline" },
        ],
      };

      const seeds = seedMap[categorySlug];
      if (seeds && seeds.length > 0) {
        const toInsert = seeds.map((s, idx) => ({
          ...s,
          parentCategory: category._id,
          parentCategorySlug: categorySlug,
          sortOrder: idx + 1,
          isActive: true,
        }));
        try {
          await Subcategory.insertMany(toInsert, { ordered: false });
          subcategories = await Subcategory.find({
            parentCategorySlug: categorySlug,
            isActive: true,
          }).sort("sortOrder").lean();
        } catch (seedErr) {
          // If duplicate key errors, just re-fetch
          subcategories = await Subcategory.find({
            parentCategorySlug: categorySlug,
            isActive: true,
          }).sort("sortOrder").lean();
        }
      }
    }

    // Add creator counts to each subcategory
    const withCounts = await Promise.all(
      subcategories.map(async (sub) => {
        let count = 0;
        try {
          // Build location filter from query params
          const locationFilter = {};
          const userDistrict = (req.query.district || '').trim();
          const userCity = (req.query.city || '').trim();
          const userState = (req.query.state || '').trim();
          if (userDistrict || userCity || userState) {
            const locConditions = [];
            if (userDistrict) {
              locConditions.push({ serviceAreas: { $elemMatch: { $regex: new RegExp(`^${userDistrict}$`, 'i') } } });
              locConditions.push({ district: new RegExp(`^${userDistrict}$`, 'i') });
              // Legacy: city field contains district name
              locConditions.push({ city: new RegExp(`^${userDistrict}$`, 'i') });
              locConditions.push({ baseCity: new RegExp(`^${userDistrict}$`, 'i') });
            }
            if (userCity) {
              locConditions.push({ serviceAreas: { $elemMatch: { $regex: new RegExp(`^${userCity}$`, 'i') } } });
              locConditions.push({ city: new RegExp(`^${userCity}$`, 'i') });
              locConditions.push({ baseCity: new RegExp(`^${userCity}$`, 'i') });
            }
            // No state in locConditions — state is too broad for subcategory counts
            if (locConditions.length > 0) locationFilter.$or = locConditions;
          }

          // Match creators who have this subcategory via subcategorySlug, categorySlug, specialty, or category (text)
          const subNameSafe = sub.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape for regex
          const catConditions = [
            { subcategorySlug: sub.slug },
            { categorySlug: sub.slug },
            { specialty: new RegExp(subNameSafe, 'i') },
            { category: new RegExp(subNameSafe, 'i') },
          ];

          const query = {
            status: "approved",
            $or: catConditions,
            $and: [
              { $or: [
                { subscriptionStatus: { $in: ["free", "active", "trial"] } },
                { subscriptionStatus: { $exists: false } },
                { subscriptionStatus: null },
              ]},
            ],
          };
          if (Object.keys(locationFilter).length > 0) {
            query.$and.push(locationFilter);
          }

          count = await Creator.countDocuments(query);
        } catch {}
        return { ...sub, creatorCount: count };
      })
    );

    res.json({
      success: true,
      data: withCounts,
      category: { name: category.name, slug: category.slug, icon: category.icon },
    });
  } catch (e) {
    next(e);
  }
});

// ═══ ADMIN: Create subcategory ═══
router.post("/", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { name, slug, parentCategorySlug, icon, imageUrl, sortOrder, description } = req.body;

    if (!name || !slug || !parentCategorySlug) {
      return res.status(400).json({ success: false, message: "name, slug, and parentCategorySlug are required" });
    }

    const category = await Category.findOne({ slug: parentCategorySlug });
    if (!category) {
      return res.status(404).json({ success: false, message: "Parent category not found" });
    }

    const subcategory = await Subcategory.create({
      name,
      slug,
      parentCategory: category._id,
      parentCategorySlug,
      icon: icon || "ellipse-outline",
      imageUrl: imageUrl || "",
      sortOrder: sortOrder || 0,
      description: description || "",
    });

    res.status(201).json({ success: true, data: subcategory });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ success: false, message: "A subcategory with this slug already exists" });
    }
    next(e);
  }
});

// ═══ ADMIN: Update subcategory ═══
router.put("/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const subcategory = await Subcategory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!subcategory) {
      return res.status(404).json({ success: false, message: "Subcategory not found" });
    }
    res.json({ success: true, data: subcategory });
  } catch (e) {
    next(e);
  }
});

// ═══ ADMIN: Delete subcategory ═══
router.delete("/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const subcategory = await Subcategory.findByIdAndDelete(req.params.id);
    if (!subcategory) {
      return res.status(404).json({ success: false, message: "Subcategory not found" });
    }
    res.json({ success: true, message: "Subcategory deleted" });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
