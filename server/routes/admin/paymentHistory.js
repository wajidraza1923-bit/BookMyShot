const express = require("express");
const Invoice = require("../../models/Invoice");
const Creator = require("../../models/Creator");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// GET /api/admin/payment-history
// Returns all Razorpay payments from Invoice collection with creator details
// Supports filters: period (today/7d/30d), status, page, limit
// ═══════════════════════════════════════════════════════════════
router.get("/", async (req, res) => {
  try {
    const { period, status, page = 1, limit = 50 } = req.query;
    const filter = {};

    // Date filter
    if (period) {
      const now = new Date();
      let startDate;
      if (period === "today") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === "7d") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (period === "30d") {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      if (startDate) filter.createdAt = { $gte: startDate };
    }

    // Status filter
    if (status && status !== "all") {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Invoice.countDocuments(filter);

    const invoices = await Invoice.find(filter)
      .populate({
        path: "creator",
        select: "user subscriptionStatus razorpaySubscriptionId subscriptionEndDate",
        populate: { path: "user", select: "name email" },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Format for frontend
    const payments = invoices.map((inv) => ({
      _id: inv._id,
      creatorName: inv.creator?.user?.name || "Unknown",
      creatorEmail: inv.creator?.user?.email || "",
      creatorId: inv.creator?._id || "",
      planName: inv.type === "subscription" ? "Monthly Subscription" : inv.description || inv.type,
      amount: inv.amount,
      razorpayPaymentId: inv.notes || "",
      razorpaySubscriptionId: inv.creator?.razorpaySubscriptionId || "",
      paymentDate: inv.paidAt || inv.createdAt,
      status: inv.status,
      nextBillingDate: inv.creator?.subscriptionEndDate || null,
      invoiceNumber: inv.invoiceNumber,
      type: inv.type,
    }));

    // Compute stats
    const allInvoices = await Invoice.find({}).lean();
    const paidInvoices = allInvoices.filter((i) => i.status === "paid");
    const totalRevenue = paidInvoices.reduce((s, i) => s + (i.amount || 0), 0);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRevenue = paidInvoices
      .filter((i) => new Date(i.paidAt || i.createdAt) >= monthStart)
      .reduce((s, i) => s + (i.amount || 0), 0);

    const activeSubscriptions = await Creator.countDocuments({ subscriptionStatus: "active" });
    const failedPayments = allInvoices.filter((i) => i.status === "cancelled").length;
    const expiredSubscriptions = await Creator.countDocuments({ subscriptionStatus: "expired" });

    res.json({
      success: true,
      payments,
      stats: {
        totalRevenue,
        monthlyRevenue,
        activeSubscriptions,
        failedPayments,
        expiredSubscriptions,
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("[Admin Payment History] Error:", err.message);
    res.status(500).json({ success: false, message: err.message || "Failed to load payment history" });
  }
});

module.exports = router;
