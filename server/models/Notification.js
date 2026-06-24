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
    try {
      const pushService = require("../services/pushService");
      await pushService.sendToUser(doc.user, doc.title, doc.message, {
        type: doc.type,
        notificationId: doc._id.toString(),
        link: doc.link || "",
      });
    } catch (e) {
      // Push delivery failure should never block the main flow
      console.log("[Push] Auto-send failed (non-fatal):", e.message);
    }
  }
});

module.exports = mongoose.model("Notification", notificationSchema);
