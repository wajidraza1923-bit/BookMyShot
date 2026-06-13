const express = require("express");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

// Get user's notifications
router.get("/", async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort("-createdAt").limit(50);
    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
    res.json({ success: true, notifications, unreadCount });
  } catch (e) {
    next(e);
  }
});

// Get unread count only (lightweight)
router.get("/unread-count", async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ user: req.user._id, read: false });
    res.json({ success: true, count });
  } catch (e) {
    next(e);
  }
});

// Mark single notification as read
router.patch("/:id/read", async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// Mark all notifications as read
router.patch("/read-all", async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// Delete a notification
router.delete("/:id", async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// Register push notification token (Android/iOS app)
router.post("/push-token", async (req, res, next) => {
  try {
    const { token, platform } = req.body;
    if (!token) return res.status(400).json({ success: false, message: "Token required" });

    const User = require("../models/User");
    await User.findByIdAndUpdate(req.user._id, {
      $set: { pushToken: token, pushPlatform: platform || "android" },
    });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
