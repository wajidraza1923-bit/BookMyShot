/**
 * BookMyShot — Booking Chat API
 * 
 * Chat is ONLY available within the context of a booking.
 * A conversation is created automatically when a creator accepts a booking.
 * Only the user and the assigned creator can access that conversation.
 * When a booking is completed/cancelled, the chat becomes read-only.
 */
const express = require("express");
const Message = require("../models/Message");
const Booking = require("../models/Booking");
const Creator = require("../models/Creator");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

// ═══════════════════════════════════════════════════════════════
// Helper: verify user has access to this booking's chat
// ═══════════════════════════════════════════════════════════════
async function verifyBookingAccess(req, bookingId) {
  // Validate ObjectId format
  const mongoose = require("mongoose");
  if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
    return { error: "Invalid booking ID", status: 400 };
  }

  const booking = await Booking.findById(bookingId)
    .populate({ path: "creator", select: "user" })
    .populate("user", "_id name avatar");
  if (!booking) return { error: "Booking not found", status: 404 };

  const userId = req.user._id.toString();
  const bookingUserId = (booking.user?._id || booking.user || "").toString();
  const creatorUserId = (booking.creator?.user || "").toString();

  // Only the booking user or the assigned creator can access
  if (userId !== bookingUserId && userId !== creatorUserId) {
    return { error: "Access denied — you are not part of this booking", status: 403 };
  }

  // Chat only available after creator accepts
  const chatEligible = ["Creator Accepted", "Payment Submitted", "Payment Approved", "Event Scheduled", "Completed", "completed"].includes(booking.status);
  if (!chatEligible) {
    return { error: "Chat is not available for this booking status", status: 403 };
  }

  return { booking, bookingUserId, creatorUserId };
}

// ═══════════════════════════════════════════════════════════════
// GET /conversations — All booking chats for current user
// ═══════════════════════════════════════════════════════════════
router.get("/conversations", async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Find all bookings where user is either the customer or the creator
    let creator = null;
    if (req.user.role === "creator") {
      creator = await Creator.findOne({ user: userId });
    }

    const query = creator
      ? { $or: [{ user: userId }, { creator: creator._id }] }
      : { user: userId };

    // Only bookings that have been accepted (chat-eligible)
    const bookings = await Booking.find({
      ...query,
      status: { $in: ["Creator Accepted", "Payment Submitted", "Payment Approved", "Event Scheduled", "Completed", "completed"] },
    })
      .populate("user", "_id name avatar")
      .populate({ path: "creator", populate: { path: "user", select: "_id name avatar" } })
      .sort("-updatedAt")
      .lean();

    // For each booking, get last message and unread count
    const conversations = await Promise.all(bookings.map(async (b) => {
      const lastMessage = await Message.findOne({ booking: b._id }).sort("-createdAt").lean();
      const unreadCount = await Message.countDocuments({ booking: b._id, receiver: userId, read: false });

      // Determine the "other" person in the conversation
      const isCreator = creator && b.creator?._id?.toString() === creator._id.toString();
      const otherUser = isCreator
        ? { _id: b.user?._id, name: b.user?.name || b.clientName || "Customer", avatar: b.user?.avatar }
        : { _id: b.creator?.user?._id, name: b.creator?.user?.name || "Creator", avatar: b.creator?.user?.avatar };

      const isReadOnly = ["Completed", "completed", "cancelled", "rejected"].includes(b.status);

      return {
        _id: b._id,
        bookingId: b._id,
        otherUser,
        eventType: b.eventType || "Booking",
        eventDate: b.eventDate,
        bookingStatus: b.status,
        clientName: b.clientName,
        lastMessage: lastMessage ? { content: lastMessage.content, createdAt: lastMessage.createdAt, sender: lastMessage.sender } : null,
        unreadCount,
        readOnly: isReadOnly,
      };
    }));

    // Sort by last message time (most recent first)
    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    res.json({ success: true, conversations });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /booking/:bookingId — Get all messages for a booking
// ═══════════════════════════════════════════════════════════════
router.get("/booking/:bookingId", async (req, res, next) => {
  try {
    const access = await verifyBookingAccess(req, req.params.bookingId);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const messages = await Message.find({ booking: req.params.bookingId })
      .populate("sender", "_id name avatar")
      .sort("createdAt")
      .lean();

    // Mark all received messages as read
    const unreadIds = messages
      .filter(m => m.receiver?.toString() === req.user._id.toString() && !m.read)
      .map(m => m._id);
    if (unreadIds.length > 0) {
      await Message.updateMany({ _id: { $in: unreadIds } }, { $set: { read: true, readAt: new Date() } });
      // Notify sender that messages were read (real-time)
      try {
        const socketService = require("../services/socketService");
        const otherUserId = req.user._id.toString() === access.bookingUserId ? access.creatorUserId : access.bookingUserId;
        socketService.emitToUser(otherUserId, "chat:read", { bookingId: req.params.bookingId, readBy: req.user._id });
      } catch (e) {}
    }

    const isReadOnly = ["Completed", "completed", "cancelled", "rejected"].includes(access.booking.status);

    res.json({
      success: true,
      messages,
      booking: {
        _id: access.booking._id,
        status: access.booking.status,
        eventType: access.booking.eventType,
        clientName: access.booking.clientName,
        readOnly: isReadOnly,
      },
    });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /booking/:bookingId — Send a message in a booking chat
// ═══════════════════════════════════════════════════════════════
router.post("/booking/:bookingId", async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ success: false, message: "Message content required" });
    if (content.length > 2000) return res.status(400).json({ success: false, message: "Message too long (max 2000 characters)" });

    const access = await verifyBookingAccess(req, req.params.bookingId);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    // Check if chat is read-only (completed/cancelled bookings)
    const isReadOnly = ["Completed", "completed", "cancelled", "rejected"].includes(access.booking.status);
    if (isReadOnly) {
      return res.status(403).json({ success: false, message: "This booking is closed. Chat is read-only." });
    }

    // Determine receiver
    const senderId = req.user._id.toString();
    const receiverId = senderId === access.bookingUserId ? access.creatorUserId : access.bookingUserId;

    // Idempotency: prevent duplicate messages within 3 seconds
    const threeSecondsAgo = new Date(Date.now() - 3000);
    const duplicate = await Message.findOne({
      booking: req.params.bookingId,
      sender: req.user._id,
      content: content.trim(),
      createdAt: { $gte: threeSecondsAgo },
    });
    if (duplicate) {
      return res.status(200).json({ success: true, message: duplicate, deduplicated: true });
    }

    const message = await Message.create({
      booking: req.params.bookingId,
      sender: req.user._id,
      receiver: receiverId,
      content: content.trim(),
    });

    const populated = await Message.findById(message._id).populate("sender", "_id name avatar").lean();

    // ═══ REAL-TIME: Send via Socket.IO ═══
    try {
      const socketService = require("../services/socketService");
      socketService.emitToUser(receiverId, "chat:message", {
        bookingId: req.params.bookingId,
        message: populated,
      });
      // Also tell sender for multi-device sync
      socketService.emitToUser(senderId, "chat:message", {
        bookingId: req.params.bookingId,
        message: populated,
      });
    } catch (e) {}

    // ═══ PUSH NOTIFICATION ═══
    await Notification.create({
      user: receiverId,
      type: "message",
      title: `💬 ${req.user.name}`,
      message: content.length > 100 ? content.substring(0, 97) + "..." : content,
      targetScreen: "BookingChat",
      targetId: req.params.bookingId,
    });

    res.status(201).json({ success: true, message: populated });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /booking/:bookingId/read — Mark all messages as read
// ═══════════════════════════════════════════════════════════════
router.post("/booking/:bookingId/read", async (req, res, next) => {
  try {
    const access = await verifyBookingAccess(req, req.params.bookingId);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const result = await Message.updateMany(
      { booking: req.params.bookingId, receiver: req.user._id, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    // Notify sender that messages were read
    try {
      const socketService = require("../services/socketService");
      const otherUserId = req.user._id.toString() === access.bookingUserId ? access.creatorUserId : access.bookingUserId;
      socketService.emitToUser(otherUserId, "chat:read", { bookingId: req.params.bookingId, readBy: req.user._id });
    } catch (e) {}

    res.json({ success: true, marked: result.modifiedCount });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /unread-total — Total unread messages across all bookings
// ═══════════════════════════════════════════════════════════════
router.get("/unread-total", async (req, res, next) => {
  try {
    const count = await Message.countDocuments({ receiver: req.user._id, read: false });
    res.json({ success: true, count });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /typing — Broadcast typing indicator
// ═══════════════════════════════════════════════════════════════
router.post("/typing", async (req, res, next) => {
  try {
    const { bookingId, isTyping } = req.body;
    if (!bookingId) return res.status(400).json({ success: false, message: "bookingId required" });

    const access = await verifyBookingAccess(req, bookingId);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const receiverId = req.user._id.toString() === access.bookingUserId ? access.creatorUserId : access.bookingUserId;

    try {
      const socketService = require("../services/socketService");
      socketService.emitToUser(receiverId, "chat:typing", {
        bookingId,
        userId: req.user._id,
        userName: req.user.name,
        isTyping: isTyping !== false,
      });
    } catch (e) {}

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
