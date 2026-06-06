/**
 * DEBUG SCRIPT: Run this to check payment data state
 * Usage: node debug-payments.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./server/config/db");
const PaymentProof = require("./server/models/PaymentProof");
const PaymentRecord = require("./server/models/PaymentRecord");
const Booking = require("./server/models/Booking");

async function debug() {
  await connectDB();
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  PAYMENT DEBUG REPORT");
  console.log("═══════════════════════════════════════════════════════\n");

  // 1. Find all payment proofs
  const proofs = await PaymentProof.find({}).sort("-createdAt").lean();
  console.log("──── ALL PAYMENT PROOFS (" + proofs.length + ") ────");
  proofs.forEach((p, i) => {
    console.log(`  [${i + 1}] ID: ${p._id}`);
    console.log(`      Status: ${p.status} | Amount: ₹${p.amount}`);
    console.log(`      Booking: ${p.booking || "NONE"}`);
    console.log(`      User: ${p.user}`);
    console.log(`      Creator: ${p.creator}`);
    console.log(`      Screenshot: ${p.screenshot ? "(exists, " + p.screenshot.length + " chars)" : "NONE"}`);
    console.log(`      Created: ${p.createdAt}`);
    console.log("");
  });

  // 2. Find all payment records
  const records = await PaymentRecord.find({}).sort("-createdAt").lean();
  console.log("──── ALL PAYMENT RECORDS (" + records.length + ") ────");
  records.forEach((r, i) => {
    console.log(`  [${i + 1}] ID: ${r._id}`);
    console.log(`      Status: ${r.status} | Amount: ₹${r.amount} | Type: ${r.paymentType}`);
    console.log(`      Booking: ${r.booking}`);
    console.log(`      User: ${r.user} | AddedBy: ${r.addedBy}`);
    console.log(`      Creator: ${r.creator}`);
    console.log(`      Notes: ${r.notes || "(empty)"}`);
    console.log(`      Proof: ${r.proof ? "(exists, " + r.proof.length + " chars)" : "NONE"}`);
    console.log(`      Created: ${r.createdAt}`);
    console.log("");
  });

  // 3. For each verified proof, check if a matching PaymentRecord exists
  const verifiedProofs = proofs.filter(p => p.status === "verified");
  console.log("──── VERIFIED PROOFS vs PAYMENT RECORDS ────");
  for (const vp of verifiedProofs) {
    const matchingRecord = records.find(r =>
      r.booking && vp.booking &&
      r.booking.toString() === vp.booking.toString() &&
      r.addedBy === "user" &&
      r.amount === vp.amount
    );
    console.log(`  Proof ${vp._id} (₹${vp.amount}, booking: ${vp.booking})`);
    if (matchingRecord) {
      console.log(`    ✅ Matching PaymentRecord FOUND: ${matchingRecord._id}`);
    } else {
      console.log(`    ❌ NO matching PaymentRecord! THIS IS THE BUG.`);
    }
    console.log("");
  }

  // 4. Show what GET /payment-records/booking/:id would return for each booking
  const bookingIds = [...new Set(proofs.map(p => p.booking?.toString()).filter(Boolean))];
  console.log("──── SIMULATED API RESPONSE: GET /payment-records/booking/:id ────");
  for (const bid of bookingIds) {
    const booking = await Booking.findById(bid).lean();
    const bookingRecords = await PaymentRecord.find({ booking: bid }).sort("-createdAt").lean();
    const approvedRecords = bookingRecords.filter(r => r.status === "approved");
    const totalAmount = booking ? (booking.amount || booking.budget || 0) : 0;
    const totalPaid = approvedRecords.reduce((s, r) => s + r.amount, 0);
    const remaining = Math.max(0, totalAmount - totalPaid);
    const progress = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;

    console.log(`  Booking: ${bid}`);
    console.log(`    Total Amount: ₹${totalAmount}`);
    console.log(`    Records: ${bookingRecords.length} total, ${approvedRecords.length} approved`);
    console.log(`    Summary: { totalPaid: ${totalPaid}, remaining: ${remaining}, progress: ${progress}% }`);
    console.log(`    Booking.advancePaid: ${booking?.advancePaid || 0}`);
    console.log(`    Booking.remaining: ${booking?.remaining || 0}`);
    console.log(`    Booking.paymentStatus: ${booking?.paymentStatus || "unknown"}`);
    console.log("");
  }

  console.log("═══════════════════════════════════════════════════════");
  console.log("  DIAGNOSIS:");
  console.log("═══════════════════════════════════════════════════════");
  
  const missingRecords = verifiedProofs.filter(vp => {
    return !records.find(r =>
      r.booking && vp.booking &&
      r.booking.toString() === vp.booking.toString() &&
      r.addedBy === "user" &&
      r.amount === vp.amount
    );
  });

  if (missingRecords.length > 0) {
    console.log("\n  ❌ PROBLEM: " + missingRecords.length + " verified proof(s) have NO PaymentRecord.");
    console.log("  This means the approval route did NOT create a PaymentRecord.");
    console.log("  Most likely cause: Server was NOT restarted after code changes.");
    console.log("\n  FIX: Restart the server with: npm run dev");
    console.log("  Then re-approve the proof, or run: node fix-missing-records.js\n");
  } else if (verifiedProofs.length === 0) {
    console.log("\n  ⚠️  No verified proofs found. Approve a proof and run this again.\n");
  } else {
    console.log("\n  ✅ All verified proofs have matching PaymentRecords.\n");
  }

  await mongoose.disconnect();
}

debug().catch(e => { console.error(e); process.exit(1); });
