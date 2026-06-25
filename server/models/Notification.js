const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, default: "info" }, // info, booking, payment, subscription, commission, inquiry, message, promotion, warning
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: "" },
    read: { type: Boolean, default: false },
    targetScreen: { type: String, default: "" }, // Screen to navigate to: BookingDetail, InquiryDetail, PaymentDetail, Subscription, Chat, CommissionDetail
    targetId: { type: String, default: "" }, // ID of the related entity (bookingId, inquiryId, etc.)
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Auto-send push notification when in-app notification is created
notificationSchema.post("save", async function (doc) {
  if (doc.isNew !== false) {
    // Push notification (FCM via Expo)
    try {
      const pushService = require("../services/pushService");
      await pushService.sendToUser(doc.user, doc.title, doc.message, {
        type: doc.type || "info",
        notificationId: doc._id.toString(),
        targetScreen: doc.targetScreen || "",
        targetId: doc.targetId || "",
        link: doc.link || "",
      });
    } catch (e) {
      console.log("[Push] Auto-send failed (non-fatal):", e.message);
    }

    // Real-time Socket.IO event
    try {
      const socketService = require("../services/socketService");
      socketService.notifyNewNotification(doc.user, {
        _id: doc._id,
        title: doc.title,
        message: doc.message,
        type: doc.type,
        targetScreen: doc.targetScreen,
        createdAt: doc.createdAt || new Date(),
      });
    } catch (e) {
      // Socket not initialized yet during startup — ignore
    }
  }
});

module.exports = mongoose.model("Notification", notificationSchema);
