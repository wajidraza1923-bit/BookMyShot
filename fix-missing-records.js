/**
 * FIX SCRIPT: Creates PaymentRecords for verified proofs that are missing them
 * Usage: node fix-missing-records.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./server/config/db");
const PaymentProof = require("./server/models/PaymentProof");
const PaymentRecord = require("./server/models/PaymentRecord");
const Booking = require("./server/models/Booking");

async function fix() {
  await connectDB();
  console.log("\n[Fix] Connected to database.");

  // Find all verified payment proofs
  const verifiedProofs = await PaymentProof.find({ status: "verified" }).lean();
  console.log("[Fix] Found " + verifiedProofs.length + " verified payment proofs.");

  let created = 0;
  let skipped = 0;

  for (const proof of verifiedProofs) {
    if (!proof.booking) {
      console.log("[Fix] Skipping proof " + proof._id + " — no booking linked.");
      skipped++;
      continue;
    }

    // Check if a PaymentRecord already exists for this proof
    const existing = await PaymentRecord.findOne({
      booking: proof.booking,
      addedBy: "user",
      amount: proof.amount,
      notes: { $regex: proof._id.toString() },
    });

    if (existing) {
      console.log("[Fix] Proof " + proof._id + " — PaymentRecord already exists, skipping.");
      skipped++;
      continue;
    }

    // Also check without the notes regex (older records might not have it)
    const existingByAmount = await PaymentRecord.findOne({
      booking: proof.booking,
      addedBy: "user",
      amount: proof.amount,
      status: "approved",
      createdAt: { $gte: new Date(proof.createdAt.getTime() - 60000), $lte: new Date(proof.createdAt.getTime() + 86400000) },
    });

    if (existingByAmount) {
      console.log("[Fix] Proof " + proof._id + " — similar PaymentRecord found by amount+date, skipping.");
      skipped++;
      continue;
    }

    // Create the missing PaymentRecord
    const newRecord = await PaymentRecord.create({
      booking: proof.booking,
      user: proof.user,
      creator: proof.creator,
      amount: proof.amount,
      paymentType: "partial",
      notes: "Payment proof #" + proof._id.toString() + (proof.note ? " - " + proof.note : " (retroactive fix)"),
      proof: proof.screenshot || "",
      addedBy: "user",
      status: "approved",
    });
    console.log("[Fix] CREATED PaymentRecord " + newRecord._id + " for proof " + proof._id + " (₹" + proof.amount + ")");
    created++;

    // Recalculate booking totals
    const records = await PaymentRecord.find({ booking: proof.booking, status: "approved" });
    const totalPaid = records.reduce((s, r) => s + r.amount, 0);
    const booking = await Booking.findById(proof.booking);
    if (booking) {
      const totalAmount = booking.amount || booking.budget || 0;
      booking.advancePaid = totalPaid;
      booking.remaining = Math.max(0, totalAmount - totalPaid);
      booking.paymentStatus = booking.remaining === 0 && totalPaid > 0 ? "paid" : totalPaid > 0 ? "partial" : "unpaid";
      await booking.save();
      console.log("[Fix] Booking " + booking._id + " updated: advancePaid=" + totalPaid + ", remaining=" + booking.remaining + ", status=" + booking.paymentStatus);
    }
  }

  console.log("\n[Fix] Done. Created: " + created + ", Skipped: " + skipped);
  console.log("[Fix] Restart the server and refresh the dashboard to see updated values.\n");

  await mongoose.disconnect();
}

fix().catch(e => { console.error(e); process.exit(1); });
