/**
 * Support Tickets API
 */
const express = require("express");
const SupportTicket = require("../models/SupportTicket");
const Notification = require("../models/Notification");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// POST create ticket (any authenticated user)
router.post("/", protect, async (req, res, next) => {
  try {
    const { subject, message, category } = req.body;
    if (!subject || !message) return res.status(400).json({ success: false, message: "Subject and message required" });
    const ticket = await SupportTicket.create({ user: req.user._id, subject, message, category: category || "other" });
    res.status(201).json({ success: true, data: ticket });
  } catch (e) { next(e); }
});

// GET my tickets
router.get("/my", protect, async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user._id }).sort("-createdAt").limit(50);
    res.json({ success: true, data: tickets });
  } catch (e) { next(e); }
});

// GET single ticket
router.get("/:id", protect, async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id).populate("replies.author", "name role");
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (String(ticket.user) !== String(req.user._id) && req.user.role !== "admin") return res.status(403).json({ success: false, message: "Access denied" });
    res.json({ success: true, data: ticket });
  } catch (e) { next(e); }
});

// POST reply to ticket (user or admin)
router.post("/:id/reply", protect, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: "Message required" });
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (String(ticket.user) !== String(req.user._id) && req.user.role !== "admin") return res.status(403).json({ success: false, message: "Access denied" });
    ticket.replies.push({ message, author: req.user._id, authorRole: req.user.role === "admin" ? "admin" : "user" });
    if (req.user.role === "admin") ticket.status = "in-progress";
    await ticket.save();
    // Notify the other party
    const notifyUser = req.user.role === "admin" ? ticket.user : null;
    if (notifyUser) await Notification.create({ user: notifyUser, title: "💬 Support Reply", message: `New reply on your ticket: ${ticket.subject}`, type: "support" });
    res.json({ success: true, data: ticket });
  } catch (e) { next(e); }
});

// ADMIN: Get all tickets
router.get("/admin/all", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};
    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter).sort("-createdAt").skip((page - 1) * limit).limit(Number(limit)).populate("user", "name email phone"),
      SupportTicket.countDocuments(filter),
    ]);
    res.json({ success: true, data: tickets, total });
  } catch (e) { next(e); }
});

// ADMIN: Update ticket status
router.patch("/admin/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { status, priority, assignedTo } = req.body;
    const update = {};
    if (status) { update.status = status; if (status === "resolved") update.resolvedAt = new Date(); if (status === "closed") update.closedAt = new Date(); }
    if (priority) update.priority = priority;
    if (assignedTo) update.assignedTo = assignedTo;
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    res.json({ success: true, data: ticket });
  } catch (e) { next(e); }
});

module.exports = router;
