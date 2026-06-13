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
      enum: ["pending", "paid", "overdue", "cancelled"],
      default: "pending",
    },
    dueDate: { type: Date },
    paidAt: { type: Date },
    lastReminderSent: { type: Date },
    reminderCount: { type: Number, default: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

commissionSchema.index({ creator: 1, status: 1 });
commissionSchema.index({ booking: 1 });
commissionSchema.index({ dueDate: 1, status: 1 });

// Auto-set due date 30 days from creation
commissionSchema.pre("save", function (next) {
  if (this.isNew && !this.dueDate) {
    const due = new Date(this.createdAt || Date.now());
    due.setDate(due.getDate() + 30);
    this.dueDate = due;
  }
  next();
});

module.exports = mongoose.model("Commission", commissionSchema);
