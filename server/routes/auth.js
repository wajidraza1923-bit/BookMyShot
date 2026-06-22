const express = require("express");
const crypto = require("crypto");
const User = require("../models/User");
const Creator = require("../models/Creator");
const Planning = require("../models/Planning");
const generateToken = require("../utils/generateToken");
const { protect } = require("../middleware/auth");
const { sendVerificationOTP, sendPasswordResetOTP, generateOTP } = require("../services/emailService");

const router = express.Router();

// Register user
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !password) {
      return res.status(400).json({
        success: false,
        message: "Name and password are required",
      });
    }

    // Support registration with phone only (no email)
    let user;
    if (email) {
      if (await User.findOne({ email })) {
        return res.status(400).json({ success: false, message: "Email already registered" });
      }
      const verificationToken = crypto.randomBytes(20).toString("hex");
      user = await User.create({
        name, email, password,
        phone: phone || "",
        role: role === "creator" ? "creator" : "user",
        verificationToken,
        emailVerified: false,
      });
    } else if (phone) {
      if (await User.findOne({ phone })) {
        return res.status(400).json({ success: false, message: "Phone already registered" });
      }
      user = await User.create({
        name, email: `user_${phone}@bookmyshot.app`,
        password, phone,
        role: "user",
        emailVerified: true,
      });
    } else {
      return res.status(400).json({ success: false, message: "Email or phone required" });
    }

    if (user.role === "creator") {
      // Load subscription settings from database
      const configService = require("../services/configService");
      const subSettings = await configService.getSubscriptionSettings();
      await Creator.create({
        user: user._id,
        status: "pending",
        subscriptionPlan: "basic",
        subscriptionAmount: subSettings.monthlyPlanPrice || 0,
        subscriptionStatus: "pending_payment",
        autoRenew: subSettings.autoRenewDefault !== false,
      });
      await Planning.create({ creator: (await Creator.findOne({ user: user._id }))._id });
    }

    res.status(201).json({
      success: true,
      message: user.role === "creator" ? "Registration pending admin approval. Please verify your email." : "Account created. Please verify your email.",
      token: user.emailVerified ? generateToken(user._id) : undefined,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      requiresVerification: !user.emailVerified,
    });

    // Send verification OTP in background (don't block response)
    if (email && !user.emailVerified) {
      const otp = generateOTP();
      user.emailVerificationOtp = otp;
      user.emailVerificationOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      user.otpLastSent = new Date();
      await user.save();
      sendVerificationOTP(email, otp, user.name).catch(() => {});
    }
  } catch (e) {
    next(e);
  }
});

// Login (supports email or phone)
router.post("/login", async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;
    let user;

    if (email) {
      user = await User.findOne({ email }).select("+password");
    } else if (phone) {
      user = await User.findOne({ phone }).select("+password");
    } else {
      return res.status(400).json({ success: false, message: "Email or phone required" });
    }

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Check email verification (skip for phone-only accounts and admin)
    if (!user.emailVerified && user.role !== "admin" && !user.email.endsWith("@bookmyshot.app")) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in.",
        requiresVerification: true,
        email: user.email,
      });
    }

    if (user.role === "creator") {
      const creator = await Creator.findOne({ user: user._id });
      if (!creator) {
        return res.status(403).json({
          success: false,
          message: "Creator account not found",
          status: "pending",
        });
      }
      if (creator.status !== "approved") {
        return res.json({
          success: true,
          token: generateToken(user._id),
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            avatar: user.avatar,
            emailVerified: user.emailVerified,
            creatorStatus: creator.status,
            subscriptionStatus: creator.subscriptionStatus,
          },
          message: creator.subscriptionStatus === 'pending_payment'
            ? 'Please complete your subscription payment to continue.'
            : `Your account is ${creator.status}. Please wait for admin approval.`,
        });
      }
    }

    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        emailVerified: user.emailVerified,
      },
    });
  } catch (e) {
    next(e);
  }
});

// Verify email
router.post("/verify-email", async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(400).json({ success: false, message: "Invalid token" });
    user.emailVerified = true;
    user.verificationToken = undefined;
    await user.save();
    res.json({ success: true, message: "Email verified" });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// OTP-BASED EMAIL VERIFICATION
// ═══════════════════════════════════════════════════════════════

// Verify OTP (email verification)
router.post("/verify-otp", async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.emailVerified) return res.json({ success: true, message: "Email already verified" });

    if (!user.emailVerificationOtp || !user.emailVerificationOtpExpiry) {
      return res.status(400).json({ success: false, message: "No OTP found. Please request a new one." });
    }

    if (new Date() > user.emailVerificationOtpExpiry) {
      return res.status(400).json({ success: false, message: "OTP expired. Please request a new one." });
    }

    if (user.emailVerificationOtp !== otp.trim()) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();
      if (user.otpAttempts >= 5) {
        return res.status(429).json({ success: false, message: "Too many failed attempts. Request a new OTP." });
      }
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    user.emailVerified = true;
    user.emailVerificationOtp = undefined;
    user.emailVerificationOtpExpiry = undefined;
    user.otpAttempts = 0;
    await user.save();

    res.json({ success: true, message: "Email verified successfully", role: user.role });
  } catch (e) {
    next(e);
  }
});

// Send/Resend verification OTP
router.post("/send-otp", async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.emailVerified) return res.json({ success: true, message: "Email already verified" });

    // Rate limiting: 60 seconds between OTP sends
    if (user.otpLastSent && (Date.now() - new Date(user.otpLastSent).getTime()) < 60000) {
      const wait = Math.ceil((60000 - (Date.now() - new Date(user.otpLastSent).getTime())) / 1000);
      return res.status(429).json({ success: false, message: `Please wait ${wait} seconds before requesting again` });
    }

    const otp = generateOTP();
    user.emailVerificationOtp = otp;
    user.emailVerificationOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    user.otpLastSent = new Date();
    user.otpAttempts = 0;
    await user.save();

    const result = await sendVerificationOTP(email, otp, user.name);
    if (!result.success) {
      return res.status(500).json({ success: false, message: "Failed to send OTP. Please try again." });
    }

    res.json({ success: true, message: "Verification OTP sent to your email" });
  } catch (e) {
    next(e);
  }
});

// Resend OTP (alias for send-otp)
router.post("/resend-otp", async (req, res, next) => {
  req.url = "/send-otp";
  router.handle(req, res, next);
});

// ═══════════════════════════════════════════════════════════════
// OTP-BASED PASSWORD RESET
// ═══════════════════════════════════════════════════════════════

// Forgot password - send OTP
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email, phone } = req.body;
    console.log(`[AUTH] ═══ FORGOT PASSWORD REQUEST ═══`);
    console.log(`[AUTH] Email provided: ${email || 'NONE'}`);
    console.log(`[AUTH] Phone provided: ${phone || 'NONE'}`);
    
    let user;
    if (email) user = await User.findOne({ email });
    else if (phone) user = await User.findOne({ phone });
    
    if (!user) {
      console.log(`[AUTH] ❌ No user found for: ${email || phone}`);
      return res.json({ success: true, message: "If account exists, reset code sent" });
    }

    console.log(`[AUTH] ✅ User found: { id: ${user._id}, email: ${user.email}, role: ${user.role}, name: ${user.name} }`);

    // Rate limiting
    if (user.otpLastSent && (Date.now() - new Date(user.otpLastSent).getTime()) < 60000) {
      console.log(`[AUTH] ⚠️ Rate limited. Last OTP sent: ${user.otpLastSent}`);
      return res.status(429).json({ success: false, message: "Please wait before requesting again" });
    }

    const otp = generateOTP();
    console.log(`[AUTH] 🔑 OTP generated: ${otp}`);
    
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    user.otpLastSent = new Date();
    await user.save();
    console.log(`[AUTH] 💾 OTP saved to database. Expiry: ${user.resetPasswordOtpExpiry}`);

    // Send OTP to user's registered email (same for all roles)
    console.log(`[AUTH] 📧 Calling sendPasswordResetOTP(${user.email}, ${otp}, ${user.name})`);
    const result = await sendPasswordResetOTP(user.email, otp, user.name);
    console.log(`[AUTH] 📧 Email send result:`, JSON.stringify(result));
    console.log(`[AUTH] ═══ FORGOT PASSWORD ${result.success ? 'SUCCESS' : 'FAILED'} ═══`);

    res.json({
      success: true,
      message: "Password reset code sent to your email",
      emailSent: result.success,
    });
  } catch (e) {
    console.error(`[AUTH] ❌ FORGOT PASSWORD EXCEPTION:`, e.message);
    next(e);
  }
});

// Verify reset OTP
router.post("/verify-reset-otp", async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (!user.resetPasswordOtp || !user.resetPasswordOtpExpiry) {
      return res.status(400).json({ success: false, message: "No reset OTP found. Request a new one." });
    }

    if (new Date() > user.resetPasswordOtpExpiry) {
      return res.status(400).json({ success: false, message: "OTP expired. Request a new one." });
    }

    if (user.resetPasswordOtp !== otp.trim()) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // Generate a temporary reset token (valid for 5 minutes)
    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 5 * 60 * 1000;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpiry = undefined;
    await user.save();

    res.json({ success: true, message: "OTP verified. You can now reset your password.", resetToken });
  } catch (e) {
    next(e);
  }
});

// Reset password with token
router.post("/reset-password", async (req, res, next) => {
  try {
    const { email, resetToken, password } = req.body;
    if (!email || !resetToken || !password) {
      return res.status(400).json({ success: false, message: "Email, token, and new password required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    const user = await User.findOne({
      email,
      resetPasswordToken: resetToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ success: false, message: "Invalid or expired reset token" });

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ success: true, message: "Password reset successfully. You can now login." });
  } catch (e) {
    next(e);
  }
});

// Current user
router.get("/me", protect, async (req, res, next) => {
  try {
    let creator = null;
    if (req.user.role === "creator") {
      creator = await Creator.findOne({ user: req.user._id });
    }
    res.json({ success: true, user: req.user, creator });
  } catch (e) {
    next(e);
  }
});

// Update profile
router.put("/profile", protect, async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findById(req.user._id);
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;
    await user.save();
    res.json({ success: true, user });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN OTP LOGIN
// ═══════════════════════════════════════════════════════════════

// Send OTP for admin login (passwordless)
router.post("/admin-login-otp", async (req, res, next) => {
  try {
    const { email } = req.body;
    console.log(`[AUTH] ═══ ADMIN LOGIN OTP REQUEST ═══`);
    console.log(`[AUTH] Email provided: ${email || 'NONE'}`);
    
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    // Don't reveal if email exists
    const user = await User.findOne({ email, role: "admin" });
    if (!user) {
      console.log(`[AUTH] ❌ No admin user found for: ${email}`);
      return res.json({ success: true, message: "If account exists, OTP sent" });
    }

    console.log(`[AUTH] ✅ Admin found: { id: ${user._id}, email: ${user.email}, name: ${user.name} }`);

    // Rate limiting
    if (user.otpLastSent && (Date.now() - new Date(user.otpLastSent).getTime()) < 60000) {
      console.log(`[AUTH] ⚠️ Rate limited. Last OTP sent: ${user.otpLastSent}`);
      return res.status(429).json({ success: false, message: "Please wait before requesting again" });
    }

    const otp = generateOTP();
    console.log(`[AUTH] 🔑 Admin OTP generated: ${otp}`);
    
    user.emailVerificationOtp = otp;
    user.emailVerificationOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    user.otpLastSent = new Date();
    await user.save();
    console.log(`[AUTH] 💾 Admin OTP saved to database. Expiry: ${user.emailVerificationOtpExpiry}`);

    // Send OTP directly to admin's registered email (same as user/creator flow)
    console.log(`[AUTH] 📧 Calling sendVerificationOTP(${user.email}, ${otp}, ${user.name})`);
    const otpResult = await sendVerificationOTP(user.email, otp, user.name);
    console.log(`[AUTH] 📧 Admin OTP send result:`, JSON.stringify(otpResult));
    console.log(`[AUTH] ═══ ADMIN LOGIN OTP ${otpResult.success ? 'SUCCESS' : 'FAILED'} ═══`);

    res.json({ success: true, message: "OTP sent to admin recovery email" });
  } catch (e) {
    console.error(`[AUTH] ❌ ADMIN LOGIN OTP EXCEPTION:`, e.message);
    next(e);
  }
});

// Verify OTP and login as admin
router.post("/admin-verify-otp-login", async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP required" });

    const user = await User.findOne({ email, role: "admin" });
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

    if (!user.emailVerificationOtp || !user.emailVerificationOtpExpiry) {
      return res.status(400).json({ success: false, message: "No OTP found. Request a new one." });
    }

    if (new Date() > user.emailVerificationOtpExpiry) {
      return res.status(400).json({ success: false, message: "OTP expired. Request a new one." });
    }

    if (user.emailVerificationOtp !== otp.trim()) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // Clear OTP (single-use)
    user.emailVerificationOtp = undefined;
    user.emailVerificationOtpExpiry = undefined;
    user.otpAttempts = 0;
    await user.save();

    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        emailVerified: true,
      },
    });
  } catch (e) {
    next(e);
  }
});

// Change password (authenticated user)
router.put("/change-password", protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current password and new password are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "New password must be at least 8 characters" });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Password changed successfully" });
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// ACCOUNT DELETION
// ═══════════════════════════════════════════════════════════════

// DELETE: Soft-delete user account (marks for deletion, actual deletion after 30 days)
router.delete("/account", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Soft delete: mark account as deleted but preserve data for 30 days
    user.accountDeletedAt = new Date();
    user.accountDeleteRequested = true;
    await user.save();

    // If creator, mark as suspended
    if (user.role === "creator") {
      await Creator.updateOne({ user: user._id }, { $set: { subscriptionStatus: "suspended", status: "rejected" } });
    }

    res.json({ success: true, message: "Account marked for deletion. Your data will be permanently removed after 30 days. Contact support to cancel." });
  } catch (e) {
    next(e);
  }
});

module.exports = router;