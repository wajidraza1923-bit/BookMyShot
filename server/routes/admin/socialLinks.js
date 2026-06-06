const express = require("express");
const SocialLinks = require("../../models/SocialLinks");
const auditService = require("../../services/auditService");

const router = express.Router();

// GET / - Get social links
router.get("/", async (req, res, next) => {
  try {
    const links = await SocialLinks.getLinks();
    res.json({ success: true, data: links });
  } catch (err) {
    next(err);
  }
});

// PUT / - Update social links
router.put("/", async (req, res, next) => {
  try {
    const previous = await SocialLinks.getLinks();
    const previousValues = previous.toObject ? previous.toObject() : previous;

    const allowed = ["instagram", "facebook", "youtube", "whatsapp", "twitter", "linkedin", "telegram"];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field].trim();
      }
    });

    const links = await SocialLinks.updateLinks(updates);

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "update_social_links",
      target: "social_links",
      targetId: links._id.toString(),
      previousValues,
      newValues: updates,
      ip: req.ip,
    });

    res.json({ success: true, data: links });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
