const express = require("express");
const GeneralInquiry = require("../models/GeneralInquiry");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Creator = require("../models/Creator");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// PUBLIC: Submit general inquiry (no auth required)
router.post("/", async (req, res, next) => {
  try {
    const { name, phone, email, city, eventDate, category, preferredCreator, message } = req.body;
    if (!name || !phone) return res.status(400).json({ success: false, message: "Name and phone required" });

    const inquiry = await GeneralInquiry.create({ name, phone, email, city, eventDate, category, preferredCreator: preferredCreator || undefined, message });

    // Notify all admins
    const admins = await User.find({ role: "admin" }).select("_id");
    for (const admin of admins) {
      await Notification.create({ user: admin._id, type: "inquiry", title: "📩 New General Inquiry", message: `${name} from ${city || 'Unknown'} - ${category || 'General'}` });
    }

    res.status(201).json({ success: true, message: "Inquiry submitted successfully", data: inquiry });
  } catch (e) { next(e); }
});

// ADMIN: Get all inquiries
router.get("/admin", protect, authorize("admin"), async (req, res, next) => {
  try {
    const inquiries = await GeneralInquiry.find()
      .populate({ path: "preferredCreator", populate: { path: "user", select: "name" } })
      .populate({ path: "assignedCreator", populate: { path: "user", select: "name" } })
      .sort("-createdAt").lean();
    res.json({ success: true, data: inquiries });
  } catch (e) { next(e); }
});

// ADMIN: Update status
router.patch("/admin/:id/status", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { status } = req.body;
    const inquiry = await GeneralInquiry.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!inquiry) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: inquiry });
  } catch (e) { next(e); }
});

// ADMIN: Assign to creator
router.patch("/admin/:id/assign", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { creatorId } = req.body;
    if (!creatorId) return res.status(400).json({ success: false, message: "Creator ID required" });

    const inquiry = await GeneralInquiry.findByIdAndUpdate(req.params.id, {
      assignedCreator: creatorId, assignedBy: req.user._id, assignedAt: new Date(), status: "assigned",
    }, { new: true });

    // Notify creator
    const creator = await Creator.findById(creatorId);
    if (creator) {
      await Notification.create({ user: creator.user, type: "inquiry", title: "🎯 New Lead Assigned", message: `You have a new lead: ${inquiry.name} from ${inquiry.city || 'Unknown'}` });
    }

    res.json({ success: true, data: inquiry });
  } catch (e) { next(e); }
});

// CREATOR: Get assigned inquiries
router.get("/creator", protect, authorize("creator"), async (req, res, next) => {
  try {
    const creator = await Creator.findOne({ user: req.user._id });
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });
    const inquiries = await GeneralInquiry.find({ assignedCreator: creator._id }).sort("-createdAt").lean();
    res.json({ success: true, data: inquiries });
  } catch (e) { next(e); }
});

module.exports = router;
