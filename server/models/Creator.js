const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  features: [String],
});

const creatorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    specialty: { type: String, default: "" },
    bio: { type: String, default: "" },
    experience: { type: String, default: "" },
    location: { type: String, default: "" },
    city: { type: String, default: "" },
    category: { type: String, default: "wedding" },
    budgetMin: { type: Number, default: 0 },
    budgetMax: { type: Number, default: 10000 },
    rating: { type: Number, default: 5 },
    weddingsCount: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    featuredStartDate: { type: Date },
    featuredEndDate: { type: Date },
    featuredPaymentStatus: { type: String, enum: ["pending", "paid", "rejected", "none"], default: "none" },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    badge: { 
      type: String, 
      enum: ["", "rank_1", "rank_2", "rank_3", "rank_4", "best_creator", "most_trusted", "premium_creator", "top_rated", "editors_choice"], 
      default: "" 
    },
    rank: { type: Number, default: 0 },
    portfolio: [{ type: mongoose.Schema.Types.Mixed }],
    videos: [{ type: mongoose.Schema.Types.Mixed }],
    packages: [packageSchema],
    gear: [{ name: String, model: String }],
    team: [{ name: String, role: String }],
    social: {
      instagram: String,
      facebook: String,
      pinterest: String,
      youtube: String,
      website: String,
    },
    earnings: { type: Number, default: 0 },
    darkMode: { type: Boolean, default: true },
    // Subscription fields
    subscriptionPlan: { type: String, enum: ["basic"], default: "basic" },
    subscriptionAmount: { type: Number, default: 0 },
    subscriptionStartDate: { type: Date },
    subscriptionEndDate: { type: Date },
    subscriptionStatus: {
      type: String,
      enum: ["pending_payment", "trial", "active", "expired", "suspended", "overdue"],
      default: "pending_payment",
    },
    autoRenew: { type: Boolean, default: true },
    lastPaymentDate: { type: Date },
    // Payment gateway fields (Razorpay ready)
    razorpaySubscriptionId: { type: String, default: "" },
    razorpayCustomerId: { type: String, default: "" },
    paymentMethod: { type: String, default: "" },
    paymentFailCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Normalize portfolio/videos to URL strings when serializing to JSON
// This ensures backward compatibility with frontend code that expects string arrays
creatorSchema.set("toJSON", {
  transform: function (doc, ret) {
    if (ret.portfolio) {
      ret.portfolio = ret.portfolio.map((item) =>
        typeof item === "string" ? item : (item && item.url) || ""
      );
    }
    if (ret.videos) {
      ret.videos = ret.videos.map((item) =>
        typeof item === "string" ? item : (item && item.url) || ""
      );
    }
    return ret;
  },
});

module.exports = mongoose.model("Creator", creatorSchema);
