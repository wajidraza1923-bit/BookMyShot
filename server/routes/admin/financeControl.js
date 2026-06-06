const express = require("express");
const PaymentRecord = require("../../models/PaymentRecord");
const Creator = require("../../models/Creator");
const Notification = require("../../models/Notification");
const auditService = require("../../services/auditService");
const {
  validateManualPayment,
  validateRefund,
  validateAdjustment,
} = require("../../middleware/validate");

const router = express.Router();

// GET /history - Payment history with filters
router.get("/history", async (req, res, next) => {
  try {
    const {
      dateFrom,
      dateTo,
      creator,
      paymentType,
      status,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    if (creator) {
      filter.creator = creator;
    }

    if (paymentType) {
      filter.paymentType = paymentType;
    }

    if (status) {
      filter.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [records, total] = await Promise.all([
      PaymentRecord.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("creator", "user specialty")
        .populate("user", "name email")
        .lean(),
      PaymentRecord.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { records, total, page: pageNum, limit: limitNum },
    });
  } catch (err) {
    next(err);
  }
});

// POST /manual-payment - Add a manual payment
router.post("/manual-payment", validateManualPayment, async (req, res, next) => {
  try {
    const { targetCreator, amount, paymentType, reasonNote } = req.body;

    // Look up the creator to get associated user
    const creatorDoc = await Creator.findById(targetCreator).populate("user");
    if (!creatorDoc) {
      return res.status(404).json({ success: false, message: "Creator not found" });
    }

    const record = await PaymentRecord.create({
      creator: targetCreator,
      user: creatorDoc.user._id || creatorDoc.user,
      booking: creatorDoc._id, // Use creator ID as placeholder when no booking
      amount: Number(amount),
      paymentType,
      notes: reasonNote,
      addedBy: "admin",
      status: "approved",
    });

    // Notify the creator
    await Notification.create({
      user: creatorDoc.user._id || creatorDoc.user,
      type: "payment",
      title: "Manual Payment Added",
      message: `A manual payment of ₹${amount} has been added to your account. Reason: ${reasonNote}`,
    });

    // Audit log
    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "add_manual_payment",
      target: "payment",
      targetId: record._id.toString(),
      previousValues: null,
      newValues: { targetCreator, amount, paymentType, reasonNote },
      ip: req.ip,
    });

    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

// PATCH /payments/:id/approve - Approve a payment
router.patch("/payments/:id/approve", async (req, res, next) => {
  try {
    const record = await PaymentRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Payment record not found" });
    }

    const previousStatus = record.status;
    record.status = "approved";
    await record.save();

    // Look up creator to find associated user for notification
    const creatorDoc = await Creator.findById(record.creator).populate("user");
    if (creatorDoc) {
      await Notification.create({
        user: creatorDoc.user._id || creatorDoc.user,
        type: "payment",
        title: "Payment Approved",
        message: `Your payment of ₹${record.amount} has been approved.`,
      });
    }

    // Audit log
    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "approve_payment",
      target: "payment",
      targetId: record._id.toString(),
      previousValues: { status: previousStatus },
      newValues: { status: "approved" },
      ip: req.ip,
    });

    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

// PATCH /payments/:id/reject - Reject a payment
router.patch("/payments/:id/reject", async (req, res, next) => {
  try {
    const record = await PaymentRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Payment record not found" });
    }

    const previousStatus = record.status;
    const { reason } = req.body;

    record.status = "rejected";
    if (reason) {
      record.rejectionReason = reason;
    }
    await record.save();

    // Notify the affected creator's user
    const creatorDoc = await Creator.findById(record.creator).populate("user");
    if (creatorDoc) {
      await Notification.create({
        user: creatorDoc.user._id || creatorDoc.user,
        type: "payment",
        title: "Payment Rejected",
        message: `Your payment of ₹${record.amount} has been rejected.${reason ? ` Reason: ${reason}` : ""}`,
      });
    }

    // Audit log
    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "reject_payment",
      target: "payment",
      targetId: record._id.toString(),
      previousValues: { status: previousStatus },
      newValues: { status: "rejected", reason: reason || "" },
      ip: req.ip,
    });

    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

// POST /adjust - Revenue/commission adjustment
router.post("/adjust", validateAdjustment, async (req, res, next) => {
  try {
    const { target, adjustmentAmount, justificationNote } = req.body;

    // Look up creator for the target
    const creatorDoc = await Creator.findById(target).populate("user");
    if (!creatorDoc) {
      return res.status(404).json({ success: false, message: "Target creator not found" });
    }

    const record = await PaymentRecord.create({
      creator: target,
      user: creatorDoc.user._id || creatorDoc.user,
      booking: creatorDoc._id, // Use creator ID as placeholder
      amount: Number(adjustmentAmount),
      paymentType: "adjustment",
      notes: justificationNote,
      addedBy: "admin",
      status: "approved",
    });

    // Audit log
    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "revenue_adjustment",
      target: "payment",
      targetId: record._id.toString(),
      previousValues: null,
      newValues: { target, adjustmentAmount, justificationNote },
      ip: req.ip,
    });

    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

// POST /refund - Process refund
router.post("/refund", validateRefund, async (req, res, next) => {
  try {
    const { originalPaymentRef, refundAmount, reason } = req.body;

    // Find the original payment
    const originalPayment = await PaymentRecord.findById(originalPaymentRef);
    if (!originalPayment) {
      return res.status(404).json({ success: false, message: "Original payment not found" });
    }

    // Validate refund amount does not exceed original
    if (Number(refundAmount) > originalPayment.amount) {
      return res.status(400).json({
        success: false,
        message: "Refund amount cannot exceed original payment amount",
      });
    }

    // Create refund record with negative amount
    const record = await PaymentRecord.create({
      creator: originalPayment.creator,
      user: originalPayment.user,
      booking: originalPayment.booking,
      amount: -Math.abs(Number(refundAmount)),
      paymentType: "refund",
      notes: reason,
      addedBy: "admin",
      status: "approved",
    });

    // Audit log
    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "process_refund",
      target: "payment",
      targetId: record._id.toString(),
      previousValues: { originalPaymentRef, originalAmount: originalPayment.amount },
      newValues: { refundAmount: -Math.abs(Number(refundAmount)), reason },
      ip: req.ip,
    });

    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
