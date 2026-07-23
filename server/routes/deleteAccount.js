/**
 * Delete Account API — Permanently removes all user data
 * Supports: Self-deletion (customer/creator) + Admin deletion
 */
const express = require("express");
const mongoose = require("mongoose");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// ═══ SELF DELETE — User deletes their own account ═══
router.delete("/my-account", protect, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;
    console.log(`[DeleteAccount] Self-delete requested by ${userId} (${role})`);
    await performDeletion(userId, role);
    res.json({ success: true, message: "Account deleted permanently." });
  } catch (e) {
    console.error("[DeleteAccount] Error:", e.message);
    res.status(500).json({ success: false, message: e.message || "Deletion failed" });
  }
});

// ═══ ADMIN DELETE — Admin deletes any user ═══
router.delete("/admin/:userId", protect, authorize("admin"), async (req, res, next) => {
  try {
    const User = require("../models/User");
    const target = await User.findById(req.params.userId).select("role");
    if (!target) return res.status(404).json({ success: false, message: "User not found" });
    console.log(`[DeleteAccount] Admin delete: ${req.params.userId} (${target.role})`);
    await performDeletion(req.params.userId, target.role);
    res.json({ success: true, message: "Account deleted by admin." });
  } catch (e) {
    console.error("[DeleteAccount] Admin error:", e.message);
    res.status(500).json({ success: false, message: e.message || "Deletion failed" });
  }
});

async function performDeletion(userId, role) {
  const User = require("../models/User");
  const Creator = require("../models/Creator");
  const Booking = require("../models/Booking");
  const Inquiry = require("../models/Inquiry");
  const Notification = require("../models/Notification");
  const CashbackTransaction = require("../models/CashbackTransaction");
  const Review = require("../models/Review");
  const ProfileInteraction = require("../models/ProfileInteraction");

  // Cancel all pending bookings and notify other party
  const pendingBookings = await Booking.find({ $or: [{ user: userId }, { creator: { $exists: true } }], status: { $nin: ["Completed", "completed", "cancelled", "rejected"] } });
  for (const b of pendingBookings) {
    if (String(b.user) === String(userId) || (role === 'creator')) {
      b.status = "cancelled";
      b.bookingStatus = "cancelled";
      b.creatorNotes = (b.creatorNotes || '') + ' [Account Deleted]';
      await b.save();
      // Notify the other party
      const notifyUserId = String(b.user) === String(userId) ? null : b.user;
      if (notifyUserId) {
        try { await Notification.create({ user: notifyUserId, title: "Booking Cancelled", message: "A booking was cancelled because the other party deleted their account.", type: "booking" }); } catch {}
      }
    }
  }

  // Delete creator profile + Cloudinary files
  if (role === 'creator') {
    const creator = await Creator.findOne({ user: userId });
    if (creator) {
      // Delete Cloudinary files
      try {
        const { deleteFile, isConfigured } = require("../services/cloudinaryService");
        if (isConfigured()) {
          // Delete portfolio images
          for (const item of (creator.portfolio || [])) {
            const publicId = typeof item === 'object' ? item.publicId : null;
            if (publicId) try { await deleteFile(publicId, "image"); } catch {}
          }
          // Delete videos
          for (const item of (creator.videos || [])) {
            const publicId = typeof item === 'object' ? item.publicId : null;
            if (publicId) try { await deleteFile(publicId, "video"); } catch {}
          }
          // Delete cover image
          if (creator.coverImagePublicId) try { await deleteFile(creator.coverImagePublicId, "image"); } catch {}
        }
      } catch {}
      await Creator.deleteOne({ user: userId });
    }
  }

  // Delete all related data
  await Promise.all([
    Booking.deleteMany({ user: userId }),
    Inquiry.deleteMany({ $or: [{ user: userId }, { creator: { $in: await getCreatorIds(userId) } }] }),
    Notification.deleteMany({ user: userId }),
    CashbackTransaction.deleteMany({ user: userId }),
    Review.deleteMany({ user: userId }),
    ProfileInteraction.deleteMany({ user: userId }),
  ]);

  // Delete optional models (may not exist)
  const optionalDeletes = [
    { model: "../models/PaymentProof", filter: { user: userId } },
    { model: "../models/PaymentRecord", filter: { $or: [{ addedBy: userId }] } },
    { model: "../models/Commission", filter: { user: userId } },
    { model: "../models/WithdrawalRequest", filter: { user: userId } },
    { model: "../models/SupportTicket", filter: { user: userId } },
    { model: "../models/LeadUnlock", filter: { $or: [{ customer: userId }] } },
  ];
  for (const { model, filter } of optionalDeletes) {
    try { const M = require(model); await M.deleteMany(filter); } catch {}
  }

  // Delete user avatar from Cloudinary
  const user = await User.findById(userId).select("avatarPublicId");
  if (user?.avatarPublicId) {
    try { const { deleteFile, isConfigured } = require("../services/cloudinaryService"); if (isConfigured()) await deleteFile(user.avatarPublicId, "image"); } catch {}
  }

  // Finally delete the user document
  await User.deleteOne({ _id: userId });
  console.log(`[DeleteAccount] Complete: ${userId} removed.`);
}

async function getCreatorIds(userId) {
  const Creator = require("../models/Creator");
  const creator = await Creator.findOne({ user: userId }).select("_id");
  return creator ? [creator._id] : [];
}

module.exports = router;
