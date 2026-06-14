const express = require("express");
const Homepage = require("../models/Homepage");
const Creator = require("../models/Creator");
const Contact = require("../models/Contact");

const router = express.Router();

// Public homepage data
router.get("/", async (req, res, next) => {
  try {
    let home = await Homepage.findOne().populate("featuredCreatorIds");
    if (!home) home = await Homepage.create({});

    // Get creators with active homepage_spotlight search boosts
    const SearchBoost = require("../models/SearchBoost");
    let spotlightCreatorIds = [];
    try {
      const activeSpotlights = await SearchBoost.find({
        status: "active",
        endDate: { $gte: new Date() },
        boostType: "homepage_spotlight",
      }).select("creator").lean();
      spotlightCreatorIds = activeSpotlights.map(b => b.creator);
    } catch (e) { /* continue without spotlight boosts */ }

    // Combine featured + spotlight creators
    const featured = await Creator.find({
      status: "approved",
      subscriptionStatus: { $in: ["active", "trial"] },
      $or: [
        { featured: true },
        { _id: { $in: spotlightCreatorIds } },
      ],
    })
      .populate("user", "name avatar")
      .limit(6);

    const creators =
      featured.length > 0
        ? featured
        : await Creator.find({ status: "approved", subscriptionStatus: { $in: ["active", "trial"] } })
            .populate("user", "name avatar")
            .sort("-rating")
            .limit(6);

    res.json({ success: true, homepage: home, featuredCreators: creators });
  } catch (e) {
    next(e);
  }
});

// Contact form
router.post("/contact", async (req, res, next) => {
  try {
    const contact = await Contact.create(req.body);
    res.status(201).json({ success: true, message: "Message sent", contact });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
