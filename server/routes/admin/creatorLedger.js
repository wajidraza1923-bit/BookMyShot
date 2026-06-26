/**
 * Creator Financial Ledger & Audit API
 * Complete financial history for any creator — bookings, commissions, subscriptions, promotions, transactions
 * Used by Admin Panel to verify and audit creator finances
 */
const express = require("express");
const router = express.Router();
const Creator = require("../../models/Creator");
const Booking = require("../../models/Booking");
const Commission = require("../../models/Commission");
const Invoice = require("../../models/Invoice");
const PromotionRequest = require("../../models/PromotionRequest");

// GET /:creatorId — Full financial ledger for a creator
router.get("/:creatorId", async (req, res, next) => {
  try {
    const creator = await Creator.findById(req.params.creatorId).populate("user", "name email phone avatar createdAt");
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    const now = new Date();

    // ═══ BOOKINGS ═══
    const bookings = await Booking.find({ creator: creator._id })
      .select("clientName eventType eventDate amount commissionPercent commissionAmount creatorReceivable paymentStatus status advancePaid remaining createdAt invoiceNumber leadSource")
      .sort("-createdAt")
      .lean();

    const completedBookings = bookings.filter(b => /complete/i.test(b.status));
    const cancelledBookings = bookings.filter(b => /cancel|reject/i.test(b.status));
    const activeBookings = bookings.filter(b => !(/complete|cancel|reject/i.test(b.status)));

    const totalBookingValue = bookings.reduce((s, b) => s + (b.amount || 0), 0);
    const totalCompletedValue = completedBookings.reduce((s, b) => s + (b.amount || 0), 0);

    // ═══ COMMISSIONS ═══
    const commissions = await Commission.find({ creator: creator._id })
      .select("booking totalAmount commissionPercent commissionAmount creatorEarning status paidAt dueDate leadSource createdAt")
      .sort("-createdAt")
      .lean();

    const totalCommissionDeducted = commissions.reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const totalCreatorEarnings = commissions.reduce((s, c) => s + (c.creatorEarning || 0), 0);
    const pendingCommission = commissions.filter(c => c.status === "pending" || c.status === "overdue").reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const paidCommission = commissions.filter(c => c.status === "paid").reduce((s, c) => s + (c.commissionAmount || 0), 0);

    // ═══ SUBSCRIPTIONS (from invoices) ═══
    let subscriptionPayments = [];
    try {
      subscriptionPayments = await Invoice.find({ creator: creator._id, type: "subscription" }).sort("-createdAt").lean();
    } catch {}
    const totalSubscriptionPaid = subscriptionPayments.reduce((s, i) => s + (i.amount || 0), 0);

    // ═══ PROMOTIONS ═══
    const promotions = await PromotionRequest.find({ creator: creator._id }).sort("-createdAt").lean();
    const totalPromotionPaid = promotions.filter(p => p.status === "approved" || p.status === "expired").reduce((s, p) => s + (p.price || 0), 0);

    // ═══ FINANCIAL SUMMARY ═══
    const lifetimeEarnings = totalCreatorEarnings;
    const totalPayments = totalSubscriptionPaid + totalPromotionPaid;

    // ═══ TRANSACTION LEDGER (chronological) ═══
    const ledger = [];

    // Booking incomes
    for (const b of bookings) {
      if (b.amount > 0) {
        ledger.push({
          type: "credit",
          category: "booking",
          description: `Booking: ${b.clientName} (${b.eventType})`,
          amount: b.creatorReceivable || (b.amount - (b.commissionAmount || 0)),
          grossAmount: b.amount,
          commission: b.commissionAmount || 0,
          date: b.createdAt,
          ref: b.invoiceNumber || b._id,
          status: b.status,
        });
      }
    }

    // Commission deductions
    for (const c of commissions) {
      ledger.push({
        type: "debit",
        category: "commission",
        description: `Platform Commission (${c.commissionPercent}% of ₹${c.totalAmount})`,
        amount: c.commissionAmount,
        date: c.createdAt,
        ref: c._id,
        status: c.status,
      });
    }

    // Subscription payments
    for (const s of subscriptionPayments) {
      ledger.push({
        type: "debit",
        category: "subscription",
        description: s.description || "Monthly Subscription",
        amount: s.amount,
        date: s.paidAt || s.createdAt,
        ref: s.invoiceNumber || s._id,
        status: s.status,
      });
    }

    // Promotion payments
    for (const p of promotions) {
      if (p.price > 0 && (p.status === "approved" || p.status === "expired")) {
        ledger.push({
          type: "debit",
          category: "promotion",
          description: `Promotion: ${p.planType}`,
          amount: p.price,
          date: p.startDate || p.createdAt,
          ref: p._id,
          status: p.status,
        });
      }
    }

    // Sort ledger by date descending
    ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // ═══ MONTHLY SUMMARY (last 6 months) ═══
    const monthlySummary = [];
    for (let i = 0; i < 6; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthLabel = monthStart.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

      const monthBookings = bookings.filter(b => new Date(b.createdAt) >= monthStart && new Date(b.createdAt) <= monthEnd);
      const monthCommissions = commissions.filter(c => new Date(c.createdAt) >= monthStart && new Date(c.createdAt) <= monthEnd);

      monthlySummary.push({
        month: monthLabel,
        bookings: monthBookings.length,
        bookingValue: monthBookings.reduce((s, b) => s + (b.amount || 0), 0),
        commission: monthCommissions.reduce((s, c) => s + (c.commissionAmount || 0), 0),
        earnings: monthCommissions.reduce((s, c) => s + (c.creatorEarning || 0), 0),
      });
    }

    // ═══ RESPONSE ═══
    res.json({
      success: true,
      data: {
        profile: {
          name: creator.user?.name || "",
          email: creator.user?.email || "",
          phone: creator.user?.phone || "",
          avatar: creator.user?.avatar || "",
          creatorId: creator.creatorId || creator._id,
          joinDate: creator.user?.createdAt || creator.createdAt,
          status: creator.status,
          subscriptionStatus: creator.subscriptionStatus,
          subscriptionPlan: creator.subscriptionPlan,
          subscriptionStartDate: creator.subscriptionStartDate,
          subscriptionEndDate: creator.subscriptionEndDate,
          autoRenew: creator.autoRenew,
          featured: creator.featured,
          featuredEndDate: creator.featuredEndDate,
          rank: creator.rank,
        },
        summary: {
          totalBookingValue,
          totalBookings: bookings.length,
          completedBookings: completedBookings.length,
          cancelledBookings: cancelledBookings.length,
          activeBookings: activeBookings.length,
          totalCommissionDeducted,
          paidCommission,
          pendingCommission,
          totalCreatorEarnings,
          lifetimeEarnings,
          totalSubscriptionPaid,
          totalPromotionPaid,
          totalPayments,
        },
        bookings: bookings.map(b => ({
          _id: b._id,
          invoiceNumber: b.invoiceNumber,
          clientName: b.clientName,
          eventType: b.eventType,
          eventDate: b.eventDate,
          amount: b.amount,
          commissionPercent: b.commissionPercent,
          commissionAmount: b.commissionAmount,
          creatorReceived: b.creatorReceivable || (b.amount - (b.commissionAmount || 0)),
          paymentStatus: b.paymentStatus,
          status: b.status,
          leadSource: b.leadSource,
          date: b.createdAt,
        })),
        commissions,
        subscriptions: subscriptionPayments,
        promotions,
        ledger,
        monthlySummary,
      },
    });
  } catch (e) {
    console.error("[CreatorLedger] Error:", e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
