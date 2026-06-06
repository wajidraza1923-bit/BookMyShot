const express = require("express");
const User = require("../models/User");
const Creator = require("../models/Creator");
const Booking = require("../models/Booking");
const PDFDocument = require("pdfkit");
const Inquiry = require("../models/Inquiry");
const PaymentProof = require("../models/PaymentProof");
const Notification = require("../models/Notification");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(protect, authorize("user"));

// Favorites
router.get("/favorites", async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: "favorites",
      populate: { path: "user", select: "name avatar" },
    });
    res.json({ success: true, favorites: user.favorites });
  } catch (e) {
    next(e);
  }
});

router.post("/favorites/:creatorId", async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const id = req.params.creatorId;
    if (!user.favorites.includes(id)) user.favorites.push(id);
    else user.favorites = user.favorites.filter((f) => f.toString() !== id);
    await user.save();
    res.json({ success: true, favorites: user.favorites });
  } catch (e) {
    next(e);
  }
});

// Invoice PDF
router.get("/bookings/:id/invoice", async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id }).populate({
      path: "creator",
      populate: { path: "user", select: "name" },
    });
    if (!booking) return res.status(404).json({ success: false, message: "Not found" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${booking.invoiceNumber}.pdf`);

    const doc = new PDFDocument();
    doc.pipe(res);
    doc.fontSize(22).text("BookMyShot Invoice", { align: "center" });
    doc.fontSize(10).text(`Invoice #: ${booking.invoiceNumber}`, { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Photographer: ${booking.creator?.user?.name || "N/A"}`);
    doc.text(`Client: ${booking.clientName}`);
    doc.text(`Event Date: ${new Date(booking.eventDate).toLocaleDateString()}`);
    doc.text(`Amount: $${booking.amount || booking.budget}`);
    doc.text(`Status: ${booking.status}`);
    doc.end();
  } catch (e) {
    next(e);
  }
});

// Get user's inquiries
router.get("/inquiries", async (req, res, next) => {
  try {
    const inquiries = await Inquiry.find({ user: req.user._id })
      .populate({ path: "creator", populate: { path: "user", select: "name avatar phone" } })
      .sort("-createdAt");
    res.json({ success: true, inquiries });
  } catch (e) {
    next(e);
  }
});

// Get user's payment proofs
router.get("/payment-proofs", async (req, res, next) => {
  try {
    const proofs = await PaymentProof.find({ user: req.user._id })
      .populate({ path: "booking", select: "eventType eventDate clientName" })
      .sort("-createdAt");
    res.json({ success: true, proofs });
  } catch (e) {
    next(e);
  }
});

// Submit payment proof (for booking or inquiry)
router.post("/payment-proofs", async (req, res, next) => {
  try {
    const { bookingId, inquiryId, screenshot, transactionId, note, amount } = req.body;
    if ((!bookingId && !inquiryId) || !screenshot || !transactionId) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    
    let creatorId;
    let eventType = "Booking";
    
    if (bookingId) {
      const booking = await Booking.findById(bookingId);
      if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
      creatorId = booking.creator;
      eventType = booking.eventType || "Booking";
      
      const proof = await PaymentProof.create({
        user: req.user._id,
        booking: bookingId,
        creator: creatorId,
        amount: amount || booking.remaining || booking.amount || 0,
        screenshot,
        transactionId,
        note,
        status: "pending",
      });
      
      // Update booking payment status AND main status
      booking.paymentStatus = "proof-submitted";
      booking.status = "Payment Submitted";
      await booking.save();
      
      // Notify creator (need the creator's user ID, not the creator document ID)
      const Creator = require("../models/Creator");
      const creatorDoc = await Creator.findById(creatorId);
      if (creatorDoc && creatorDoc.user) {
        await Notification.create({
          user: creatorDoc.user,
          title: "💳 Payment Proof Submitted",
          message: `A payment proof of ₹${proof.amount} has been submitted for ${eventType}`,
          type: "payment",
        });
      }
      
      return res.status(201).json({ success: true, proof });
    }
    
    if (inquiryId) {
      const inquiry = await Inquiry.findById(inquiryId);
      if (!inquiry) return res.status(404).json({ success: false, message: "Inquiry not found" });
      creatorId = inquiry.creator;
      eventType = inquiry.eventType || "Inquiry";
      
      const proof = await PaymentProof.create({
        user: req.user._id,
        inquiry: inquiryId,
        creator: creatorId,
        amount: amount || inquiry.budget || 0,
        screenshot,
        transactionId,
        note,
        status: "pending",
      });
      
      // Notify creator
      const Creator = require("../models/Creator");
      const creatorDoc = await Creator.findById(creatorId);
      if (creatorDoc && creatorDoc.user) {
        await Notification.create({
          user: creatorDoc.user,
          title: "💳 Payment Proof Submitted",
          message: `A payment proof of ₹${proof.amount} has been submitted for ${eventType}`,
          type: "payment",
        });
      }
      
      return res.status(201).json({ success: true, proof });
    }
  } catch (e) {
    next(e);
  }
});

// Create inquiry
router.post("/inquiries", async (req, res, next) => {
  try {
    const { creatorId, eventType, eventDate, budget, message, phone, city } = req.body;
    if (!creatorId || !eventType || !eventDate) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    const inquiry = await Inquiry.create({
      user: req.user._id,
      creator: creatorId,
      name: req.user.name,
      phone: phone || req.user.phone || "",
      city: city || "",
      eventType,
      eventDate,
      budget: budget || 0,
      message: message || "",
      status: "pending",
    });
    
    // Notify creator
    await Notification.create({
      user: creatorId,
      title: "📩 New Inquiry",
      message: `New inquiry from ${req.user.name} for ${eventType}`,
      type: "inquiry",
    });
    
    res.status(201).json({ success: true, inquiry });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
