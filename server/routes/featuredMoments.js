const express = require("express");
const FeaturedMoment = require("../models/FeaturedMoment");
const { protect, authorize } = require("../middleware/auth");
const { uploadPhotos } = require("../middleware/upload");
const { uploadBuffer, deleteFile, isConfigured } = require("../services/cloudinaryService");
const router = express.Router();

const MAX_IMAGES = 10;

// ═══ PUBLIC: Get active featured moments (homepage) ═══
router.get("/", async (req, res, next) => {
  try {
    const moments = await FeaturedMoment.find({ status: "active", isFeatured: true })
      .sort("sortOrder -createdAt")
      .populate("creator", "user businessName")
      .limit(20);
    res.json({ success: true, data: moments });
  } catch (e) { next(e); }
});

// ═══ PUBLIC: Get single moment + increment views ═══
router.get("/:id", async (req, res, next) => {
  try {
    const moment = await FeaturedMoment.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate("creator", "user businessName");
    if (!moment) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: moment });
  } catch (e) { next(e); }
});

// ═══ PUBLIC: Like a moment ═══
router.post("/:id/like", async (req, res, next) => {
  try {
    const moment = await FeaturedMoment.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: 1 } },
      { new: true }
    );
    res.json({ success: true, data: { likes: moment.likes } });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Get all moments ═══
router.get("/admin/all", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { category, city, status } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (city) filter.city = new RegExp(city, "i");
    if (status) filter.status = status;
    const moments = await FeaturedMoment.find(filter)
      .sort("sortOrder -createdAt")
      .populate("creator", "user businessName");
    res.json({ success: true, data: moments });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Create moment ═══
router.post("/admin/create", protect, authorize("admin"), async (req, res, next) => {
  try {
    const moment = await FeaturedMoment.create(req.body);
    res.status(201).json({ success: true, data: moment });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Upload images to a moment (max 10) ═══
router.post("/admin/:id/upload-images", protect, authorize("admin"), uploadPhotos.array("images", MAX_IMAGES), async (req, res, next) => {
  try {
    const moment = await FeaturedMoment.findById(req.params.id);
    if (!moment) return res.status(404).json({ success: false, message: "Moment not found" });

    const currentCount = (moment.galleryImages || []).length;
    const files = req.files || [];

    if (currentCount + files.length > MAX_IMAGES) {
      return res.status(400).json({ success: false, message: `Maximum ${MAX_IMAGES} images allowed. Currently ${currentCount}, trying to add ${files.length}.` });
    }

    if (!isConfigured()) {
      return res.status(500).json({ success: false, message: "Cloudinary not configured" });
    }

    // Upload each file to Cloudinary
    const uploaded = [];
    for (const file of files) {
      const result = await uploadBuffer(file.buffer, {
        folder: "bookmyshot/featured-moments",
        resourceType: "image",
      });
      uploaded.push({
        url: result.url,
        publicId: result.publicId,
        sortOrder: currentCount + uploaded.length,
        status: "active",
        uploadedAt: new Date(),
      });
    }

    // Add to gallery
    moment.galleryImages = [...(moment.galleryImages || []), ...uploaded];

    // Set first image as cover if no cover exists
    if (!moment.coverImage && uploaded.length > 0) {
      moment.coverImage = uploaded[0].url;
      moment.coverImagePublicId = uploaded[0].publicId;
    }

    await moment.save();
    res.json({ success: true, data: moment, message: `${uploaded.length} image(s) uploaded` });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Upload cover image ═══
router.post("/admin/:id/upload-cover", protect, authorize("admin"), uploadPhotos.single("cover"), async (req, res, next) => {
  try {
    const moment = await FeaturedMoment.findById(req.params.id);
    if (!moment) return res.status(404).json({ success: false, message: "Moment not found" });
    if (!req.file) return res.status(400).json({ success: false, message: "No file provided" });

    // Delete old cover from Cloudinary
    if (moment.coverImagePublicId) {
      await deleteFile(moment.coverImagePublicId, "image");
    }

    const result = await uploadBuffer(req.file.buffer, {
      folder: "bookmyshot/featured-moments",
      resourceType: "image",
    });

    moment.coverImage = result.url;
    moment.coverImagePublicId = result.publicId;
    await moment.save();

    res.json({ success: true, data: moment, message: "Cover image updated" });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Delete a gallery image ═══
router.delete("/admin/:id/image/:imageId", protect, authorize("admin"), async (req, res, next) => {
  try {
    const moment = await FeaturedMoment.findById(req.params.id);
    if (!moment) return res.status(404).json({ success: false, message: "Moment not found" });

    const img = moment.galleryImages.id(req.params.imageId);
    if (!img) return res.status(404).json({ success: false, message: "Image not found" });

    // Delete from Cloudinary
    if (img.publicId) {
      await deleteFile(img.publicId, "image");
    }

    // Remove from array
    moment.galleryImages.pull(req.params.imageId);
    await moment.save();

    res.json({ success: true, data: moment, message: "Image deleted" });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Update moment ═══
router.put("/admin/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const moment = await FeaturedMoment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!moment) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: moment });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Delete moment (+ all Cloudinary images) ═══
router.delete("/admin/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const moment = await FeaturedMoment.findById(req.params.id);
    if (!moment) return res.status(404).json({ success: false, message: "Not found" });

    // Delete cover from Cloudinary
    if (moment.coverImagePublicId) {
      await deleteFile(moment.coverImagePublicId, "image");
    }

    // Delete all gallery images from Cloudinary
    for (const img of (moment.galleryImages || [])) {
      if (img.publicId) {
        await deleteFile(img.publicId, "image");
      }
    }

    await FeaturedMoment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted (images removed from Cloudinary)" });
  } catch (e) { next(e); }
});

// ═══ ADMIN: Reorder moments ═══
router.put("/admin/reorder", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { order } = req.body;
    if (!order || !Array.isArray(order)) return res.status(400).json({ success: false, message: "order array required" });
    await Promise.all(order.map(item => FeaturedMoment.findByIdAndUpdate(item.id, { sortOrder: item.sortOrder })));
    res.json({ success: true, message: "Reordered" });
  } catch (e) { next(e); }
});

module.exports = router;
