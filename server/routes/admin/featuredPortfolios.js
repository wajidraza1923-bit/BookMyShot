const express = require("express");
const Creator = require("../../models/Creator");
const Notification = require("../../models/Notification");
const auditService = require("../../services/auditService");

const router = express.Router();

// GET / - List all creators with their featured status
router.get("/", async (req, res, next) => {
  try {
    const creators = await Creator.find()
      .populate("user", "name email")
      .select(
        "user featured featuredStartDate featuredEndDate featuredPaymentStatus"
      )
      .lean();

    res.json({ success: true, data: creators });
  } catch (err) {
    next(err);
  }
});

// POST /:creatorId - Feature a creator
router.post("/:creatorId", async (req, res, next) => {
  try {
    const { endDate } = req.body;

    if (!endDate) {
      return res
        .status(400)
        .json({ success: false, message: "endDate is required" });
    }

    const creator = await Creator.findById(req.params.creatorId);
    if (!creator) {
      return res
        .status(404)
        .json({ success: false, message: "Creator not found" });
    }

    const previousValues = {
      featured: creator.featured,
      featuredStartDate: creator.featuredStartDate,
      featuredEndDate: creator.featuredEndDate,
      featuredPaymentStatus: creator.featuredPaymentStatus,
    };

    creator.featured = true;
    creator.featuredStartDate = new Date();
    creator.featuredEndDate = endDate;
    creator.featuredPaymentStatus = "pending";
    await creator.save();

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "feature_creator",
      target: "creator",
      targetId: creator._id.toString(),
      previousValues,
      newValues: {
        featured: true,
        featuredStartDate: creator.featuredStartDate,
        featuredEndDate: creator.featuredEndDate,
        featuredPaymentStatus: "pending",
      },
      ip: req.ip,
    });

    res.json({ success: true, data: creator });
  } catch (err) {
    next(err);
  }
});

// DELETE /:creatorId - Remove a creator from featured
router.delete("/:creatorId", async (req, res, next) => {
  try {
    const creator = await Creator.findById(req.params.creatorId);
    if (!creator) {
      return res
        .status(404)
        .json({ success: false, message: "Creator not found" });
    }

    const previousValues = {
      featured: creator.featured,
      featuredStartDate: creator.featuredStartDate,
      featuredEndDate: creator.featuredEndDate,
      featuredPaymentStatus: creator.featuredPaymentStatus,
    };

    creator.featured = false;
    creator.featuredEndDate = new Date();
    await creator.save();

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "unfeature_creator",
      target: "creator",
      targetId: creator._id.toString(),
      previousValues,
      newValues: {
        featured: false,
        featuredEndDate: creator.featuredEndDate,
      },
      ip: req.ip,
    });

    res.json({ success: true, data: creator });
  } catch (err) {
    next(err);
  }
});

// PATCH /:creatorId/payment - Approve or reject featured payment
router.patch("/:creatorId/payment", async (req, res, next) => {
  try {
    const { action, reason } = req.body;

    if (!action || !["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "action is required and must be 'approve' or 'reject'",
      });
    }

    if (action === "reject" && !reason) {
      return res.status(400).json({
        success: false,
        message: "reason is required when rejecting",
      });
    }

    const creator = await Creator.findById(req.params.creatorId);
    if (!creator) {
      return res
        .status(404)
        .json({ success: false, message: "Creator not found" });
    }

    const previousValues = {
      featuredPaymentStatus: creator.featuredPaymentStatus,
    };

    if (action === "approve") {
      creator.featuredPaymentStatus = "paid";
    } else {
      creator.featuredPaymentStatus = "rejected";

      // Create a notification for the creator's user about the rejection
      await Notification.create({
        user: creator.user,
        type: "warning",
        title: "Featured Payment Rejected",
        message: reason,
      });
    }

    await creator.save();

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: `featured_payment_${action}`,
      target: "creator",
      targetId: creator._id.toString(),
      previousValues,
      newValues: {
        featuredPaymentStatus: creator.featuredPaymentStatus,
      },
      ip: req.ip,
    });

    res.json({ success: true, data: creator });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
