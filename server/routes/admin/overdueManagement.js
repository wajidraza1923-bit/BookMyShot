/**
 * Overdue Management — Financial monitoring for admin
 * 
 * GET / — Full overdue dashboard with all creators, amounts, filters
 * GET /:creatorId — Individual creator financial detail
 * POST /:creatorId/remind — Send reminder email/notification
 * POST /:creatorId/suspend — Suspend creator
 * POST /:creatorId/reactivate — Reactivate creator
 * PATCH /:commissionId/mark-paid — Mark commission as paid
 * PATCH /:commissionId/waive — Waive commission
 */
const express = require("express");
const router = express.Router();
const Creator = require("../../models/Creator");
const Commission = require("../../models/Commission");
const Booking = require("../../models/Booking");
const Notification = require("../../models/Notification");
const PaymentProof = require("../../models/PaymentProof");
const emailService = require("../../services/emailService");
const auditService = require("../../services/auditService");
const configService = require("../../services/configService");

// GET / — Full overdue dashboard
router.get("/", async (req, res, next) => {
  try {
    const now = new Date();
    const subSettings = await configService.getSubscriptionSettings();
    const monthlyPrice = subSettings.monthlyPlanPrice || 299;

    // Get all creators with user info
    const creators = await Creator.find({ status: { $ne: "deleted" } })
      .populate("user", "name email phone")
      .lean();

    // Get all pending/overdue commissions grouped by creator
    const commissions = await Commission.find({ status: { $in: ["pending", "overdue"] } }).lean();
    const commByCreator = {};
    commissions.forEach(c => {
      const cid = c.creator.toString();
      if (!commByCreator[cid]) commByCreator[cid] = { total: 0, oldest: null, count: 0 };
      commByCreator[cid].total += c.commissionAmount || 0;
      commByCreator[cid].count++;
      if (!commByCreator[cid].oldest || (c.dueDate && new Date(c.dueDate) < commByCreator[cid].oldest)) {
        commByCreator[cid].oldest = c.dueDate ? new Date(c.dueDate) : c.createdAt;
      }
    });

    // Build creator records with all financial data
    const records = creators.map(c => {
      const comm = commByCreator[c._id.toString()] || { total: 0, oldest: null, count: 0 };
      const subExpired = !c.subscriptionEndDate || new Date(c.subscriptionEndDate) < now;
      const subDue = (c.subscriptionStatus === "expired" || c.subscriptionStatus === "suspended" || subExpired) ? monthlyPrice : 0;
      const commDue = comm.total;
      const totalDue = subDue + commDue;
      const daysOverdue = comm.oldest ? Math.max(0, Math.floor((now - new Date(comm.oldest)) / 86400000)) : 0;
      const subDaysOverdue = (subExpired && c.subscriptionEndDate) ? Math.max(0, Math.floor((now - new Date(c.subscriptionEndDate)) / 86400000)) : 0;
      const maxDaysOverdue = Math.max(daysOverdue, subDaysOverdue);

      let accountStatus = "active";
      if (c.status === "suspended") accountStatus = "suspended";
      else if (maxDaysOverdue > 0 || totalDue > 0) accountStatus = "warning";

      return {
        _id: c._id,
        creatorId: c.creatorId || "—",
        name: c.user?.name || "—",
        email: c.user?.email || "—",
        phone: c.user?.phone || "—",
        subscriptionStatus: c.subscriptionStatus || "inactive",
        subscriptionEndDate: c.subscriptionEndDate,
        subscriptionDue: subDue,
        commissionDue: commDue,
        commissionCount: comm.count,
        totalDue,
        daysOverdue: maxDaysOverdue,
        oldestDueDate: comm.oldest || c.subscriptionEndDate,
        lastPaymentDate: c.lastPaymentDate,
        accountStatus,
        status: c.status,
      };
    }).filter(r => r.totalDue > 0 || r.accountStatus !== "active");

    // Sort by days overdue (worst first)
    records.sort((a, b) => b.daysOverdue - a.daysOverdue);

    // Summary stats
    const totalCommPending = records.reduce((s, r) => s + r.commissionDue, 0);
    const totalSubPending = records.reduce((s, r) => s + r.subscriptionDue, 0);
    const suspended = records.filter(r => r.accountStatus === "suspended").length;
    const overdue7 = records.filter(r => r.daysOverdue >= 7).length;
    const overdue30 = records.filter(r => r.daysOverdue >= 30).length;
    const overdue60 = records.filter(r => r.daysOverdue >= 60).length;
    const overdue90 = records.filter(r => r.daysOverdue >= 90).length;

    res.json({
      success: true,
      summary: {
        totalCommissionPending: totalCommPending,
        totalSubscriptionPending: totalSubPending,
        totalPendingAmount: totalCommPending + totalSubPending,
        activeCreators: creators.filter(c => c.status === "approved").length,
        suspendedCreators: suspended,
        overdue7, overdue30, overdue60, overdue90,
        totalRecords: records.length,
      },
      data: records,
    });
  } catch (e) { next(e); }
});

// GET /:creatorId — Individual creator financial detail
router.get("/:creatorId", async (req, res, next) => {
  try {
    const creator = await Creator.findById(req.params.creatorId).populate("user", "name email phone avatar");
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    const bookings = await Booking.find({ creator: creator._id }).sort("-createdAt").lean();
    const commissions = await Commission.find({ creator: creator._id }).sort("-createdAt").lean();
    const payments = await PaymentProof.find({ creator: creator._id, status: "verified" }).sort("-createdAt").lean();
    const notifications = await Notification.find({ user: creator.user?._id, type: { $in: ["subscription", "payment", "warning"] } }).sort("-createdAt").limit(20).lean();

    const totalRevenue = bookings.reduce((s, b) => s + (b.amount || b.budget || 0), 0);
    const totalCollected = payments.reduce((s, p) => s + (p.amount || 0), 0) + bookings.reduce((s, b) => s + (b.advancePaid || 0), 0);
    const totalCommissionPaid = commissions.filter(c => c.status === "paid").reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const totalCommissionPending = commissions.filter(c => ["pending", "overdue"].includes(c.status)).reduce((s, c) => s + (c.commissionAmount || 0), 0);

    res.json({
      success: true,
      data: {
        creator: { _id: creator._id, creatorId: creator.creatorId, name: creator.user?.name, email: creator.user?.email, phone: creator.user?.phone, status: creator.status, subscriptionStatus: creator.subscriptionStatus, subscriptionEndDate: creator.subscriptionEndDate, lastPaymentDate: creator.lastPaymentDate, joinedAt: creator.createdAt },
        financials: { totalRevenue, totalCollected, totalCommissionPaid, totalCommissionPending, totalBookings: bookings.length, completedBookings: bookings.filter(b => b.status === "Completed").length },
        commissions: commissions.slice(0, 20).map(c => ({ _id: c._id, amount: c.commissionAmount, totalAmount: c.totalAmount, status: c.status, dueDate: c.dueDate, paidAt: c.paidAt, createdAt: c.createdAt })),
        recentPayments: payments.slice(0, 10).map(p => ({ amount: p.amount, date: p.createdAt, transactionId: p.transactionId, status: p.status })),
        remindersSent: notifications.slice(0, 10).map(n => ({ title: n.title, date: n.createdAt, type: n.type })),
      },
    });
  } catch (e) { next(e); }
});

// POST /:creatorId/remind — Send reminder
router.post("/:creatorId/remind", async (req, res, next) => {
  try {
    const creator = await Creator.findById(req.params.creatorId).populate("user", "name email");
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });

    const message = req.body.message || "You have pending dues on BookMyShot. Please clear your balance to avoid account suspension.";

    // Send notification
    await Notification.create({ user: creator.user._id, type: "payment", title: "⚠️ Payment Reminder", message });

    // Send email
    if (creator.user?.email) {
      await emailService.sendEmail({ to: creator.user.email, subject: "⚠️ Payment Reminder — BookMyShot", html: `<div style="font-family:sans-serif;background:#111;color:#f6eee7;padding:2rem;border-radius:12px;max-width:500px;margin:0 auto"><h2 style="color:#DAAF37;margin:0 0 1rem">Payment Reminder</h2><p style="color:#b9aa98">Hi ${creator.user.name},</p><p style="color:#d4c8bc">${message}</p><a href="${process.env.SITE_URL || 'https://bookmyshot.in'}/creator/dashboard.html" style="display:inline-block;margin-top:1rem;background:#DAAF37;color:#111;font-weight:700;padding:10px 20px;border-radius:8px;text-decoration:none">Pay Now →</a></div>`, type: "payment_reminder", userId: creator.user._id, creatorId: creator._id });
    }

    await auditService.logAction({ adminId: req.user._id, adminName: req.user.name || "", action: "send_payment_reminder", target: "creator", targetId: creator._id.toString(), previousValues: {}, newValues: { message }, ip: req.ip });

    res.json({ success: true, message: "Reminder sent" });
  } catch (e) { next(e); }
});

// POST /:creatorId/suspend
router.post("/:creatorId/suspend", async (req, res, next) => {
  try {
    const creator = await Creator.findById(req.params.creatorId);
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });
    creator.status = "suspended";
    creator.subscriptionStatus = "suspended";
    await creator.save();
    await auditService.logAction({ adminId: req.user._id, adminName: req.user.name || "", action: "suspend_overdue", target: "creator", targetId: creator._id.toString(), previousValues: { status: "approved" }, newValues: { status: "suspended" }, ip: req.ip });
    res.json({ success: true, message: "Creator suspended" });
  } catch (e) { next(e); }
});

// POST /:creatorId/reactivate
router.post("/:creatorId/reactivate", async (req, res, next) => {
  try {
    const creator = await Creator.findById(req.params.creatorId);
    if (!creator) return res.status(404).json({ success: false, message: "Creator not found" });
    creator.status = "approved";
    creator.subscriptionStatus = "active";
    const end = new Date(); end.setMonth(end.getMonth() + 1);
    creator.subscriptionEndDate = end;
    await creator.save();
    await auditService.logAction({ adminId: req.user._id, adminName: req.user.name || "", action: "reactivate_overdue", target: "creator", targetId: creator._id.toString(), previousValues: { status: "suspended" }, newValues: { status: "approved" }, ip: req.ip });
    res.json({ success: true, message: "Creator reactivated" });
  } catch (e) { next(e); }
});

// PATCH /commission/:id/mark-paid
router.patch("/commission/:id/mark-paid", async (req, res, next) => {
  try {
    const comm = await Commission.findById(req.params.id);
    if (!comm) return res.status(404).json({ success: false, message: "Commission not found" });
    comm.status = "paid"; comm.paidAt = new Date();
    await comm.save();
    await auditService.logAction({ adminId: req.user._id, adminName: req.user.name || "", action: "mark_commission_paid", target: "commission", targetId: comm._id.toString(), previousValues: { status: "pending" }, newValues: { status: "paid" }, ip: req.ip });
    res.json({ success: true, message: "Marked as paid", commission: comm });
  } catch (e) { next(e); }
});

// PATCH /commission/:id/waive
router.patch("/commission/:id/waive", async (req, res, next) => {
  try {
    const comm = await Commission.findById(req.params.id);
    if (!comm) return res.status(404).json({ success: false, message: "Commission not found" });
    const prev = comm.status;
    comm.status = "waived"; comm.paidAt = new Date(); comm.adminNote = req.body.reason || "Waived by admin";
    await comm.save();
    await auditService.logAction({ adminId: req.user._id, adminName: req.user.name || "", action: "waive_commission", target: "commission", targetId: comm._id.toString(), previousValues: { status: prev }, newValues: { status: "waived", reason: req.body.reason }, ip: req.ip });
    res.json({ success: true, message: "Commission waived", commission: comm });
  } catch (e) { next(e); }
});

module.exports = router;
