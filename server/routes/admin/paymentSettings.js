const express = require("express");
const PaymentSettings = require("../../models/PaymentSettings");
const auditService = require("../../services/auditService");

const router = express.Router();

// GET / - Return current payment settings
router.get("/", async (req, res, next) => {
  try {
    const settings = await PaymentSettings.getSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

// PUT / - Update payment settings (UPI ID, account holder name)
router.put("/", async (req, res, next) => {
  try {
    const previous = await PaymentSettings.getSettings();
    const previousValues = {
      upiId: previous.upiId,
      accountHolderName: previous.accountHolderName,
    };

    const updates = {};
    if (req.body.upiId !== undefined) updates.upiId = req.body.upiId;
    if (req.body.accountHolderName !== undefined) updates.accountHolderName = req.body.accountHolderName;

    const settings = await PaymentSettings.updateSettings(updates);

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "update_payment_settings",
      target: "settings",
      targetId: "payment_settings",
      previousValues,
      newValues: updates,
      ip: req.ip,
    });

    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

// POST /upload-qr - Upload QR code image
router.post("/upload-qr", async (req, res, next) => {
  try {
    const { qrImage } = req.body;
    if (!qrImage) return res.status(400).json({ success: false, message: "QR image required" });

    let qrUrl = qrImage;
    let qrPublicId = "";

    // Upload to Cloudinary if base64
    if (qrImage.startsWith("data:")) {
      try {
        const { uploadBase64, deleteFile, isConfigured } = require("../../services/cloudinaryService");
        if (isConfigured()) {
          // Delete old QR from Cloudinary
          const current = await PaymentSettings.getSettings();
          if (current.qrImagePublicId) {
            await deleteFile(current.qrImagePublicId, "image");
          }
          const result = await uploadBase64(qrImage, { folder: "bookmyshot/payment-settings" });
          qrUrl = result.url;
          qrPublicId = result.publicId;
        }
      } catch (e) {
        console.error("[PaymentSettings] QR upload failed:", e.message);
      }
    }

    const settings = await PaymentSettings.updateSettings({
      qrImage: qrUrl,
      qrImagePublicId: qrPublicId,
    });

    await auditService.logAction({
      adminId: req.user._id,
      adminName: req.user.name || "",
      action: "upload_payment_qr",
      target: "settings",
      targetId: "payment_settings",
      previousValues: null,
      newValues: { qrImage: qrUrl },
      ip: req.ip,
    });

    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
