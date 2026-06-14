const express = require("express");
const Creator = require("../../models/Creator");
const Notification = require("../../models/Notification");
const auditService = require("../../services/auditService");

const router = express.Router();

// GET / - List all creators with search and pagination
router.get("/", async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    let filter = {};

    if (search) {
      const regex = new RegExp(search, "i");
      // We need to find creators whose populated user name/email matches
      // First find matching user IDs, then filter creators
      const User = require("../../models/User");
      const matchingUsers = await User.find({
        $or: [{ name: regex }, { email: regex }],
      }).select("_id");
      const userIds = matchingUsers.map((u) => u._id);
      filter = { user: { $in: userIds } };
    }

    const [creators, total] = await Promise.all([
      Creator.find(filter)
        .populate("user", "name email avatar phone")
        .select(
          "user status subscriptionStatus subscriptionStartDate subscriptionEndDate subscriptionPlanPrice lastPaymentDate autoRenew nextBillingDate razorpaySubscriptionId featured verified specialty location city category badge rank"
        )
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Creator.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { creators, total, page: pageNum, limit: limitNum },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/activate - Set creator status to "approved", notify creator
router.patch("/:id/activate", async (req, res, next) => {
  try {
    const creator = await Creator.findById(req.params.id);
    if (!creator) {
      return res
        .status(404)
        .json({ success: false, message: "Creator not found" });
    }

    const previousValues = { status: creator.status };

    creator.status = "approved";
    await creator.save();

    // Notify creator
    await Notification.create({
      user: creator.user,
      type: "info",
      title: "Account Activated",
      message: "Your creator account has been activated. You can now accept bookings.",
    });

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "activate_creator",
      target: "creator",
      targetId: creator._id.toString(),
      previousValues,
      newValues: { status: "approved" },
      ip: req.ip,
    });

    res.json({ success: true, data: creator });
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/deactivate - Set creator status to "rejected", hide from search
router.patch("/:id/deactivate", async (req, res, next) => {
  try {
    const creator = await Creator.findById(req.params.id);
    if (!creator) {
      return res
        .status(404)
        .json({ success: false, message: "Creator not found" });
    }

    const previousValues = { status: creator.status };

    creator.status = "rejected";
    await creator.save();

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "deactivate_creator",
      target: "creator",
      targetId: creator._id.toString(),
      previousValues,
      newValues: { status: "rejected" },
      ip: req.ip,
    });

    res.json({ success: true, data: creator });
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/suspend - Set subscriptionStatus to "suspended", notify with reason
router.patch("/:id/suspend", async (req, res, next) => {
  try {
    const { reason } = req.body;

    const creator = await Creator.findById(req.params.id);
    if (!creator) {
      return res
        .status(404)
        .json({ success: false, message: "Creator not found" });
    }

    const previousValues = { subscriptionStatus: creator.subscriptionStatus };

    creator.subscriptionStatus = "suspended";
    await creator.save();

    // Notify creator with suspension reason
    await Notification.create({
      user: creator.user,
      type: "warning",
      title: "Account Suspended",
      message: reason || "Your account has been suspended. Please contact support.",
    });

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "suspend_creator",
      target: "creator",
      targetId: creator._id.toString(),
      previousValues,
      newValues: { subscriptionStatus: "suspended" },
      ip: req.ip,
    });

    res.json({ success: true, data: creator });
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/verify - Set verified=true, verifiedAt=new Date()
router.patch("/:id/verify", async (req, res, next) => {
  try {
    const creator = await Creator.findById(req.params.id);
    if (!creator) {
      return res
        .status(404)
        .json({ success: false, message: "Creator not found" });
    }

    const previousValues = {
      verified: creator.verified,
      verifiedAt: creator.verifiedAt,
    };

    creator.verified = true;
    creator.verifiedAt = new Date();
    await creator.save();

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "verify_creator",
      target: "creator",
      targetId: creator._id.toString(),
      previousValues,
      newValues: { verified: true, verifiedAt: creator.verifiedAt },
      ip: req.ip,
    });

    res.json({ success: true, data: creator });
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/feature - Set featured=true, featuredEndDate from req.body.endDate
router.patch("/:id/feature", async (req, res, next) => {
  try {
    const { endDate } = req.body;

    const creator = await Creator.findById(req.params.id);
    if (!creator) {
      return res
        .status(404)
        .json({ success: false, message: "Creator not found" });
    }

    const previousValues = {
      featured: creator.featured,
      featuredEndDate: creator.featuredEndDate,
    };

    creator.featured = true;
    creator.featuredEndDate = endDate ? new Date(endDate) : undefined;
    await creator.save();

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "feature_creator_account",
      target: "creator",
      targetId: creator._id.toString(),
      previousValues,
      newValues: { featured: true, featuredEndDate: creator.featuredEndDate },
      ip: req.ip,
    });

    res.json({ success: true, data: creator });
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/extend-subscription - Add extensionDays to subscriptionEndDate, notify
router.patch("/:id/extend-subscription", async (req, res, next) => {
  try {
    const { extensionDays, days } = req.body;
    const daysToExtend = parseInt(extensionDays || days, 10) || 0;

    const creator = await Creator.findById(req.params.id);
    if (!creator) {
      return res
        .status(404)
        .json({ success: false, message: "Creator not found" });
    }

    const previousValues = {
      subscriptionEndDate: creator.subscriptionEndDate,
    };

    // Extend from current end date or from now if no end date exists
    const baseDate = creator.subscriptionEndDate
      ? new Date(creator.subscriptionEndDate)
      : new Date();
    baseDate.setDate(baseDate.getDate() + daysToExtend);
    creator.subscriptionEndDate = baseDate;
    await creator.save();

    // Notify creator
    await Notification.create({
      user: creator.user,
      type: "info",
      title: "Subscription Extended",
      message: `Your subscription has been extended by ${daysToExtend} days.`,
    });

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "extend_subscription",
      target: "creator",
      targetId: creator._id.toString(),
      previousValues,
      newValues: { subscriptionEndDate: creator.subscriptionEndDate },
      ip: req.ip,
    });

    res.json({ success: true, data: creator });
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/reset - Reset profile preferences to defaults
router.patch("/:id/reset", async (req, res, next) => {
  try {
    const creator = await Creator.findById(req.params.id);
    if (!creator) {
      return res
        .status(404)
        .json({ success: false, message: "Creator not found" });
    }

    const previousValues = {
      specialty: creator.specialty,
      bio: creator.bio,
      packages: creator.packages,
      social: creator.social,
    };

    // Reset profile preferences to defaults
    creator.specialty = "";
    creator.bio = "";
    creator.packages = [];
    creator.social = {};
    await creator.save();

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "reset_creator_profile",
      target: "creator",
      targetId: creator._id.toString(),
      previousValues,
      newValues: {
        specialty: "",
        bio: "",
        packages: [],
        social: {},
      },
      ip: req.ip,
    });

    res.json({ success: true, data: creator });
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/rank - Set or remove creator rank (0 = no rank)
router.patch("/:id/rank", async (req, res, next) => {
  try {
    const { rank } = req.body;
    const rankNum = parseInt(rank, 10) || 0;

    const creator = await Creator.findById(req.params.id);
    if (!creator) {
      return res.status(404).json({ success: false, message: "Creator not found" });
    }

    const previousValues = { rank: creator.rank };

    creator.rank = rankNum >= 0 ? rankNum : 0;
    await creator.save();

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "update_creator_rank",
      target: "creator",
      targetId: creator._id.toString(),
      previousValues,
      newValues: { rank: creator.rank },
      ip: req.ip,
    });

    res.json({ success: true, data: creator });
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/badge - Set or remove creator badge
router.patch("/:id/badge", async (req, res, next) => {
  try {
    const { badge } = req.body;
    const validBadges = ["", "rank_1", "rank_2", "rank_3", "rank_4", "best_creator", "most_trusted", "premium_creator", "top_rated", "editors_choice"];

    if (badge !== undefined && !validBadges.includes(badge)) {
      return res.status(400).json({ success: false, message: "Invalid badge value" });
    }

    const creator = await Creator.findById(req.params.id);
    if (!creator) {
      return res.status(404).json({ success: false, message: "Creator not found" });
    }

    const previousValues = { badge: creator.badge };

    creator.badge = badge || "";
    await creator.save();

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "update_creator_badge",
      target: "creator",
      targetId: creator._id.toString(),
      previousValues,
      newValues: { badge: creator.badge },
      ip: req.ip,
    });

    res.json({ success: true, data: creator });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
