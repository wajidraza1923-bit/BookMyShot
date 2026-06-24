/**
 * Admin Reports — Earnings, Bookings, Creator Statements
 * GET /earnings — download earnings report (JSON)
 * GET /bookings — download bookings report (JSON)
 * GET /creator-statement/:id — individual creator financial statement
 */
const express = require("express");
const router = express.Router();
const Creator = require("../../models/Creator");
const Booking = require("../../models/Booking");
const Commission = require("../../models/Commission");

// GET /earnings — Platform earnings report
router.get("/earnings", async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    const match = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

    const commissions = await Commission.find({ ...match, status: "paid" })
      .populate({ path: "creator", populate: { path: "user", select: "name email" } })
      .populate("booking", "eventType eventDate clientName amount")
      .sort("-createdAt")
      .lean();

    const total = commissions.reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const creatorTotal = commissions.reduce((s, c) => s + (c.creatorEarning || 0), 0);

    res.json({
      success: true,
      report: {
        generatedAt: new Date().toISOString(),
        period: { from: from || "all-time", to: to || "now" },
        summary: {
          totalCommissions: commissions.length,
          platformEarnings: total,
          creatorEarnings: creatorTotal,
          totalTransactions: total + creatorTotal,
        },
        data: commissions.map(c => ({
          date: c.createdAt,
          creator: c.creator?.user?.name || "—",
          email: c.creator?.user?.email || "—",
          booking: c.booking?.eventType || "—",
          totalAmount: c.totalAmount,
          commissionPercent: c.commissionPercent,
          platformEarning: c.commissionAmount,
          creatorEarning: c.creatorEarning,
        })),
      },
    });
  } catch (e) { next(e); }
});

// GET /bookings — Bookings report
router.get("/bookings", async (req, res, next) => {
  try {
    const { from, to, status } = req.query;
    const filter = {};
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .populate({ path: "creator", populate: { path: "user", select: "name" } })
      .populate("user", "name email phone")
      .sort("-createdAt")
      .lean();

    const totalRevenue = bookings.reduce((s, b) => s + (b.amount || b.budget || 0), 0);

    res.json({
      success: true,
      report: {
        generatedAt: new Date().toISOString(),
        period: { from: from || "all-time", to: to || "now" },
        summary: {
          totalBookings: bookings.length,
          totalRevenue,
          statusBreakdown: {
            pending: bookings.filter(b => b.status === "Pending").length,
            accepted: bookings.filter(b => b.status === "Creator Accepted").length,
            completed: bookings.filter(b => b.status === "Completed").length,
            cancelled: bookings.filter(b => b.status === "Cancelled").length,
          },
        },
        data: bookings.map(b => ({
          date: b.createdAt,
          client: b.clientName,
          clientEmail: b.clientEmail,
          creator: b.creator?.user?.name || "—",
          eventType: b.eventType,
          eventDate: b.eventDate,
          amount: b.amount || b.budget,
          status: b.status,
        })),
      },
    });
  } catch (e) { next(e); }
});

// GET /creator-statement/:id — Individual creator financial statement
router.get("/creator-statement/:id", async (req, res, next) => {
  try {
    const creator = await Creator.findById(req.params.id).populate("user", "name email phone");
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    const bookings = await Booking.find({ creator: creator._id }).sort("-createdAt").lean();
    const commissions = await Commission.find({ creator: creator._id }).sort("-createdAt").lean();

    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((s, b) => s + (b.amount || b.budget || 0), 0);
    const totalCommissionPaid = commissions.filter(c => c.status === "paid").reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const totalEarnings = commissions.filter(c => c.status === "paid").reduce((s, c) => s + (c.creatorEarning || 0), 0);
    const pendingCommission = commissions.filter(c => c.status === "pending").reduce((s, c) => s + (c.commissionAmount || 0), 0);

    res.json({
      success: true,
      statement: {
        generatedAt: new Date().toISOString(),
        creator: {
          id: creator._id,
          creatorId: creator.creatorId,
          name: creator.user?.name,
          email: creator.user?.email,
          phone: creator.user?.phone,
          status: creator.status,
          subscriptionStatus: creator.subscriptionStatus,
          subscriptionEndDate: creator.subscriptionEndDate,
          joinedAt: creator.createdAt,
        },
        financials: {
          totalBookings,
          totalRevenue,
          totalCommissionPaid,
          totalEarnings,
          pendingCommission,
          netBalance: totalEarnings - totalCommissionPaid,
        },
        bookings: bookings.slice(0, 50).map(b => ({
          date: b.createdAt,
          eventType: b.eventType,
          client: b.clientName,
          amount: b.amount || b.budget,
          status: b.status,
        })),
        commissions: commissions.slice(0, 50).map(c => ({
          date: c.createdAt,
          amount: c.totalAmount,
          commission: c.commissionAmount,
          earning: c.creatorEarning,
          status: c.status,
        })),
      },
    });
  } catch (e) { next(e); }
});

// POST /send-monthly-statements — Manually trigger monthly statements
router.post("/send-monthly-statements", async (req, res, next) => {
  try {
    const { sendMonthlyStatements } = require("../../services/creatorStatements");
    const result = await sendMonthlyStatements();
    res.json({ success: true, message: "Monthly statements sent", ...result });
  } catch (e) { next(e); }
});

module.exports = router;
