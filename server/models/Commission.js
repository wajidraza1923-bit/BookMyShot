const mongoose = require("mongoose");

const commissionSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "Creator", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    totalAmount: { type: Number, required: true },
    leadSource: { type: String, enum: ["bookmyshot", "creator"], default: "bookmyshot" },
    commissionPercent: { type: Number, default: 5 },
    commissionAmount: { type: Number, required: true },
    creatorEarning: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },
    paidAt: { type: Date },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

commissionSchema.index({ creator: 1, status: 1 });
commissionSchema.index({ booking: 1 });

module.exports = mongoose.model("Commission", commissionSchema);
