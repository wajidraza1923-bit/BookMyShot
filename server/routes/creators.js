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

// Public: list approved creators with filters (NO email exposed)
router.get("/", async (req, res, next) => {
  try {
    const { city, category, budget, search, featured } = req.query;
    const filter = { status: "approved", subscriptionStatus: { $in: ["active", "trial"] } };
    if (city) filter.city = new RegExp(city, "i");
    if (category) filter.category = category;
    if (featured === "true") filter.featured = true;
    if (budget) filter.budgetMax = { $gte: Number(budget) };

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
    const ALLOWED_FIELDS = ['specialty', 'bio', 'experience', 'location', 'city', 'category', 'budgetMin', 'budgetMax', 'social', 'gear', 'team', 'darkMode'];
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