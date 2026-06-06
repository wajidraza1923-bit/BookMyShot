const express = require("express");
const Announcement = require("../../models/Announcement");
const Creator = require("../../models/Creator");
const User = require("../../models/User");
const Notification = require("../../models/Notification");
const auditService = require("../../services/auditService");

const router = express.Router();

// GET / - List all sent announcements, sorted by newest first
router.get("/", async (req, res, next) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.json({ success: true, data: announcements });
  } catch (err) {
    next(err);
  }
});

// POST / - Create and send an announcement
router.post("/", async (req, res, next) => {
  try {
    const { title, message, type, audience, recipientIds } = req.body;

    // Validate required fields
    const errors = [];
    if (!title) errors.push({ field: "title", message: "Title is required" });
    if (!message)
      errors.push({ field: "message", message: "Message is required" });
    if (!type) errors.push({ field: "type", message: "Type is required" });
    if (!audience)
      errors.push({ field: "audience", message: "Audience is required" });

    // Validate type enum
    const validTypes = [
      "general",
      "maintenance",
      "offer",
      "subscription_reminder",
      "emergency",
    ];
    if (type && !validTypes.includes(type)) {
      errors.push({
        field: "type",
        message: `Type must be one of: ${validTypes.join(", ")}`,
      });
    }

    // Validate audience enum
    const validAudiences = [
      "all_creators",
      "all_users",
      "selected_creators",
      "selected_users",
    ];
    if (audience && !validAudiences.includes(audience)) {
      errors.push({
        field: "audience",
        message: `Audience must be one of: ${validAudiences.join(", ")}`,
      });
    }

    // If audience is selected_creators or selected_users, recipientIds is required
    if (
      (audience === "selected_creators" || audience === "selected_users") &&
      (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0)
    ) {
      errors.push({
        field: "recipientIds",
        message:
          "recipientIds is required when audience is selected_creators or selected_users",
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: "Validation error", errors });
    }

    // Determine recipients based on audience
    let resolvedRecipientIds = [];

    if (audience === "all_creators") {
      const creators = await Creator.find({ status: "approved" });
      resolvedRecipientIds = creators.map((c) => c.user);
    } else if (audience === "all_users") {
      const users = await User.find({ role: "user" });
      resolvedRecipientIds = users.map((u) => u._id);
    } else {
      // selected_creators or selected_users
      resolvedRecipientIds = recipientIds;
    }

    // Determine if popup
    const isPopup = type === "emergency" || type === "maintenance";

    // Create the announcement document
    const announcement = await Announcement.create({
      title,
      message,
      type,
      audience,
      recipientIds: resolvedRecipientIds,
      recipientCount: resolvedRecipientIds.length,
      isPopup,
      sentBy: req.user._id,
    });

    // Create a notification for each recipient
    const notifications = resolvedRecipientIds.map((userId) => {
      const notif = {
        user: userId,
        type: "announcement",
        title,
        message,
        meta: { announcementId: announcement._id },
      };
      if (isPopup) {
        notif.meta.popup = true;
      }
      return notif;
    });

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // Log to audit trail
    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "send_announcement",
      target: "announcement",
      targetId: announcement._id.toString(),
      previousValues: null,
      newValues: { title, message, type, audience, recipientCount: resolvedRecipientIds.length },
      ip: req.ip,
    });

    res.json({ success: true, data: announcement });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
