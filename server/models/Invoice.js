const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
    invoiceNumber: { type: String, required: true, unique: true },
    type: { type: String, enum: ["subscription", "commission"], required: true },
    description: { type: String, default: "" },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "paid", "cancelled"], default: "pending" },
    paidAt: { type: Date },
    dueDate: { type: Date },
    // Reference to related record
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    commission: { type: mongoose.Schema.Types.ObjectId, ref: "Commission" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

invoiceSchema.index({ creator: 1, status: 1 });
invoiceSchema.index({ invoiceNumber: 1 });

module.exports = mongoose.model("Invoice", invoiceSchema);
