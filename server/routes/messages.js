const express = require("express");
const Message = require("../models/Message");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

// Conversations list (MUST be before /:userId to avoid "conversations" being treated as userId)
router.get("/conversations", async (req, res, next) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
    })
      .populate("sender receiver", "name avatar role")
      .sort("-createdAt");

    const seen = new Set();
    const conversations = [];
    for (const m of messages) {
      const other =
        m.sender._id.toString() === req.user._id.toString() ? m.receiver : m.sender;
      const key = other._id.toString();
      if (!seen.has(key)) {
        seen.add(key);
        conversations.push({ user: other, lastMessage: m.content, unread: 0 });
      }
    }
    res.json({ success: true, conversations });
  } catch (e) {
    next(e);
  }
});

// Get conversation with user
router.get("/:userId", async (req, res, next) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user._id },
      ],
    })
      .populate("sender receiver", "name avatar role")
      .sort("createdAt");
    res.json({ success: true, messages });
  } catch (e) {
    next(e);
  }
});

// Send message
router.post("/", async (req, res, next) => {
  try {
    const { receiverId, content, bookingId } = req.body;
    const message = await Message.create({
      sender: req.user._id,
      receiver: receiverId,
      content,
      booking: bookingId,
    });
    const populated = await message.populate("sender receiver", "name avatar");
    res.status(201).json({ success: true, message: populated });
  } catch (e) {
    next(e);
  }
});

module.exports = router;