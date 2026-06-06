const express = require("express");
const crypto = require("crypto");
const User = require("../models/User");
const Creator = require("../models/Creator");
const Planning = require("../models/Planning");
const generateToken = require("../utils/generateToken");
const { protect } = require("../middleware/auth");

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
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + (subSettings.trialDays || 30));
      await Creator.create({
        user: user._id,
        status: "pending",
        subscriptionPlan: "basic",
        subscriptionAmount: subSettings.monthlyPlanPrice || 299,
        subscriptionStartDate: new Date(),
        subscriptionEndDate: trialEnd,
        subscriptionStatus: "trial",
        autoRenew: subSettings.autoRenewDefault !== false,
      });
      await Planning.create({ creator: (await Creator.findOne({ user: user._id }))._id });
    }

    res.status(201).json({
      success: true,
      message: user.role === "creator" ? "Registration pending admin approval" : "Account created successfully",
      verificationToken: process.env.NODE_ENV === "development" && email ? undefined : undefined,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });
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
          },
          message: `Your account is ${creator.status}. Please wait for admin approval.`,
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

// Forgot password
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email, phone } = req.body;
    let user;
    if (email) user = await User.findOne({ email });
    else if (phone) user = await User.findOne({ phone });
    
    if (!user) return res.json({ success: true, message: "If account exists, reset link sent" });
    
    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpire = Date.now() + 3600000;
    await user.save();
    res.json({
      success: true,
      message: "Reset token generated. Contact support if you need help.",
      resetToken: process.env.NODE_ENV === "development" ? resetToken : undefined,
    });
  } catch (e) {
    next(e);
  }
});

// Reset password
router.post("/reset-password/:token", async (req, res, next) => {
  try {
    const hashed = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpire: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ success: false, message: "Invalid or expired token" });
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    res.json({ success: true, message: "Password updated" });
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

module.exports = router;