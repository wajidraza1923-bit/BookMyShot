const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    phone: { type: String, default: "" },
    role: { type: String, enum: ["admin", "creator", "user"], default: "user" },
    avatar: { type: String, default: "" },
    avatarPublicId: { type: String, default: "" },
    emailVerified: { type: Boolean, default: false },
    verificationToken: String,
    emailVerificationOtp: String,
    emailVerificationOtpExpiry: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    resetPasswordOtp: String,
    resetPasswordOtpExpiry: Date,
    otpAttempts: { type: Number, default: 0 },
    otpLastSent: Date,
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Creator" }],
    accountDeleteRequested: { type: Boolean, default: false },
    accountDeletedAt: { type: Date },
    pushToken: { type: String, default: "" },
    pushPlatform: { type: String, enum: ["android", "ios", "web", ""], default: "" },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model("User", userSchema);
