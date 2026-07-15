require("dotenv").config();

// ═══ STARTUP VALIDATION ═══
// Warn about missing environment variables (do NOT exit — let the server start for diagnosis)
const REQUIRED_ENV = ['JWT_SECRET', 'MONGODB_URI'];
const missing = REQUIRED_ENV.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error('═══════════════════════════════════════════════════════');
  console.error('WARNING: Missing environment variables:');
  missing.forEach(key => console.error(`  ⚠ ${key} — NOT SET`));
  console.error('Auth and database operations will fail until these are configured.');
  console.error('═══════════════════════════════════════════════════════');
} else {
  console.log('[STARTUP] ✓ All required environment variables present');
}

const express = require("express");
const path = require("path");
const cors = require("cors");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

const maintenanceMode = require("./middleware/maintenance");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const adminFinanceRoutes = require("./routes/admin/financeControl");
const adminAuditLogRoutes = require("./routes/admin/auditLogs");
const adminCreatorAccountsRoutes = require("./routes/admin/creatorAccounts");
const adminPlatformSettingsRoutes = require("./routes/admin/platformSettings");
const adminSubscriptionSettingsRoutes = require("./routes/admin/subscriptionSettings");
const adminCommissionSettingsRoutes = require("./routes/admin/commissionSettings");
const adminFeaturedPortfoliosRoutes = require("./routes/admin/featuredPortfolios");
const adminSearchBoostsRoutes = require("./routes/admin/searchBoosts");
const adminRevenueCenterRoutes = require("./routes/admin/revenueCenter");
const adminAnnouncementsRoutes = require("./routes/admin/announcements");
const adminDashboardRoutes = require("./routes/admin/dashboard");
const adminSocialLinksRoutes = require("./routes/admin/socialLinks");
const adminPaymentHistoryRoutes = require("./routes/admin/paymentHistory");
const adminHomepageEnquiriesRoutes = require("./routes/admin/homepageEnquiries");
const homepageEnquiryRoutes = require("./routes/homepageEnquiries");
const creatorRoutes = require("./routes/creator");
const creatorsRoutes = require("./routes/creators");
const userRoutes = require("./routes/user");
const bookingRoutes = require("./routes/bookings");
const messageRoutes = require("./routes/messages");
const notificationRoutes = require("./routes/notifications");
const homepageRoutes = require("./routes/homepage");
const paymentRoutes = require("./routes/payments");
const queryRoutes = require("./routes/queries");
const reviewRoutes = require("./routes/reviews");
const inquiryRoutes = require("./routes/inquiries");
const commissionRoutes = require("./routes/commissions");
const paymentProofRoutes = require("./routes/paymentproofs");
const paymentRecordRoutes = require("./routes/paymentrecords");
const bookingEventRoutes = require("./routes/bookingevents");
const revenueRoutes = require("./routes/revenue");
const promotionRoutes = require("./routes/promotionRequests");
const razorpayRoutes = require("./routes/razorpay");
const featuredMomentsRoutes = require("./routes/featuredMoments");
const testimonialRoutes = require("./routes/testimonials");
const generalInquiryRoutes = require("./routes/generalInquiries");
const discoverRoutes = require("./routes/discover");

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");

const app = express();

// Security headers
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// CORS — restrict to production domains
const allowedOrigins = [
  "https://bookmyshot.in",
  "https://www.bookmyshot.in",
  "https://site--bookmyshot--ykz2mr8mzlrv.code.run",
  "http://localhost:5000",
  "http://localhost:3000",
];
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(null, true); // Allow for now but log
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// MongoDB injection prevention
app.use(mongoSanitize());

// Rate limiting — global
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, message: { success: false, message: "Too many requests" } });
app.use("/api/", globalLimiter);

// Rate limiting — auth routes (strict)
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: "Too many login attempts. Try again later." } });
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/admin-login-otp", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/send-otp", authLimiter);

const PORT = process.env.PORT || 5000;
let server;

const startServer = async () => {
  try {
    await connectDB();

    // Seed default configuration documents on first run
    const configService = require("./services/configService");
    await configService.seedDefaults();

    // Auto-seed CMS content collections if empty (Categories, Districts, etc.)
    try {
      const Category = require("./models/Category");
      const District = require("./models/District");
      const TrendingSearch = require("./models/TrendingSearch");
      const InspirationGallery = require("./models/InspirationGallery");
      const FeaturedMoment = require("./models/FeaturedMoment");
      const Testimonial = require("./models/Testimonial");

      const catCount = await Category.countDocuments();
      const distCount = await District.countDocuments();
      const trendCount = await TrendingSearch.countDocuments();
      const inspCount = await InspirationGallery.countDocuments();
      const momCount = await FeaturedMoment.countDocuments();
      const testCount = await Testimonial.countDocuments();

      if (catCount === 0) {
        await Category.insertMany([
          { name: "Wedding Photography", slug: "wedding-photography", icon: "camera", imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=400", sortOrder: 1 },
          { name: "Cinematography", slug: "cinematography", icon: "film", imageUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400", sortOrder: 2 },
          { name: "Wedding Films", slug: "wedding-films", icon: "videocam", imageUrl: "https://images.unsplash.com/photo-1505932794465-147d1f1b2c97?w=400", sortOrder: 3 },
          { name: "Drone Coverage", slug: "drone-coverage", icon: "airplane", imageUrl: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400", sortOrder: 4 },
          { name: "Pre Wedding", slug: "pre-wedding", icon: "heart-circle", imageUrl: "https://images.unsplash.com/photo-1606216794079-73f85bbd57d5?w=400", sortOrder: 5 },
          { name: "Bridal Shoot", slug: "bridal-shoot", icon: "diamond", imageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400", sortOrder: 6 },
          { name: "Candid Photography", slug: "candid-photography", icon: "aperture", imageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400", sortOrder: 7 },
          { name: "Makeup Artist", slug: "makeup-artist", icon: "color-palette", imageUrl: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400", sortOrder: 8 },
          { name: "Anchors & DJs", slug: "anchors-djs", icon: "mic", imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400", sortOrder: 9 },
          { name: "Destination Wedding", slug: "destination-wedding", icon: "navigate", imageUrl: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400", sortOrder: 10 },
        ]);
        console.log("[STARTUP] ✅ Categories seeded (10)");
      }
      if (distCount === 0) {
        await District.insertMany([
          { name: "Poonch", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400", sortOrder: 1 },
          { name: "Surankote", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400", sortOrder: 2 },
          { name: "Rajouri", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=400", sortOrder: 3 },
          { name: "Jammu", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=400", sortOrder: 4 },
          { name: "Srinagar", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1597074866923-dc0589150458?w=400", sortOrder: 5 },
          { name: "Kathua", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400", sortOrder: 6 },
          { name: "Udhampur", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400", sortOrder: 7 },
          { name: "Anantnag", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=400", sortOrder: 8 },
          { name: "Baramulla", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400", sortOrder: 9 },
          { name: "Doda", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400", sortOrder: 10 },
        ]);
        console.log("[STARTUP] ✅ Districts seeded (10)");
      }
      if (trendCount === 0) {
        await TrendingSearch.insertMany([
          { title: "Pre Wedding", icon: "heart-circle", sortOrder: 1 },
          { title: "Wedding Photography", icon: "camera", sortOrder: 2 },
          { title: "Cinematography", icon: "film", sortOrder: 3 },
          { title: "Drone Coverage", icon: "airplane", sortOrder: 4 },
          { title: "Bridal Shoot", icon: "diamond", sortOrder: 5 },
          { title: "Destination Wedding", icon: "navigate", sortOrder: 6 },
        ]);
        console.log("[STARTUP] ✅ Trending Searches seeded (6)");
      }
      if (inspCount === 0) {
        await InspirationGallery.insertMany([
          { title: "Royal Kashmiri Weddings", imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600", category: "Traditional", sortOrder: 1 },
          { title: "Mountain Weddings", imageUrl: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600", category: "Destination", sortOrder: 2 },
          { title: "Traditional Ceremonies", imageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600", category: "Traditional", sortOrder: 3 },
          { title: "Cinematic Wedding Films", imageUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600", category: "Cinematic", sortOrder: 4 },
        ]);
        console.log("[STARTUP] ✅ Inspiration Gallery seeded (4)");
      }
      if (momCount === 0) {
        await FeaturedMoment.insertMany([
          { title: "Royal Wedding", location: "Udaipur, India", imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600", sortOrder: 1 },
          { title: "Bride Portrait", location: "Jaipur, India", imageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600", sortOrder: 2 },
          { title: "Mehndi Ceremony", location: "Delhi, India", imageUrl: "https://images.unsplash.com/photo-1606216794079-73f85bbd57d5?w=600", sortOrder: 3 },
          { title: "Destination Wedding", location: "Goa, India", imageUrl: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600", sortOrder: 4 },
          { title: "Cinematic Couple", location: "Kerala, India", imageUrl: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600", sortOrder: 5 },
          { title: "Palace Wedding", location: "Jodhpur, India", imageUrl: "https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=600", sortOrder: 6 },
        ]);
        console.log("[STARTUP] ✅ Featured Moments seeded (6)");
      }
      if (testCount === 0) {
        await Testimonial.insertMany([
          { name: "Priya & Rahul", city: "Mumbai", eventType: "Wedding", rating: 5, review: "Found our dream photographer in minutes. The quality was beyond expectations!", verifiedBooking: true, sortOrder: 1 },
          { name: "Ankit & Meera", city: "Delhi", eventType: "Pre Wedding", rating: 5, review: "BookMyShot made our pre-wedding shoot magical. Highly recommend!", verifiedBooking: true, sortOrder: 2 },
          { name: "Sneha & Varun", city: "Bangalore", eventType: "Cinematography", rating: 5, review: "Professional, verified creators. Our wedding film is absolutely stunning.", verifiedBooking: true, sortOrder: 3 },
          { name: "Fatima & Imran", city: "Srinagar", eventType: "Wedding", rating: 5, review: "The best platform for finding wedding creators in Kashmir. Amazing experience!", verifiedBooking: true, sortOrder: 4 },
          { name: "Riya & Karan", city: "Jammu", eventType: "Pre Wedding", rating: 5, review: "Loved every moment captured. The creator understood our vision perfectly.", verifiedBooking: true, sortOrder: 5 },
        ]);
        console.log("[STARTUP] ✅ Testimonials seeded (5)");
      }
    } catch (seedErr) {
      console.log("[STARTUP] CMS seed check:", seedErr.message);
    }

    // Ensure admin account exists in production
    const User = require("./models/User");
    const existingAdmin = await User.findOne({ role: "admin" });
    if (!existingAdmin) {
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminEmail || !adminPassword) {
        console.warn("[STARTUP] ⚠️ No admin account exists and ADMIN_EMAIL/ADMIN_PASSWORD env vars not set. Admin creation skipped.");
      } else {
        await User.create({
          name: "Admin",
          email: adminEmail,
          password: adminPassword,
          role: "admin",
          emailVerified: true,
        });
        console.log(`[STARTUP] Admin account created: ${adminEmail}`);
      }
    } else {
      console.log(`[STARTUP] Admin account exists: ${existingAdmin.email}`);
    }

    // Backfill creatorId for existing creators that don't have one
    const Creator = require("./models/Creator");
    const creatorsWithoutId = await Creator.find({ $or: [{ creatorId: null }, { creatorId: "" }, { creatorId: { $exists: false } }] }).sort({ createdAt: 1 });
    if (creatorsWithoutId.length > 0) {
      const lastWithId = await Creator.findOne({ creatorId: { $exists: true, $ne: null, $ne: "" } }).sort({ creatorId: -1 }).lean();
      let nextNum = 1;
      if (lastWithId && lastWithId.creatorId) {
        const match = lastWithId.creatorId.match(/BMS-(\d+)/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
      }
      for (const c of creatorsWithoutId) {
        await Creator.updateOne({ _id: c._id }, { $set: { creatorId: "BMS-" + String(nextNum).padStart(4, "0") } });
        nextNum++;
      }
      console.log(`[STARTUP] Assigned creatorId to ${creatorsWithoutId.length} creators`);
    }

    server = app.listen(PORT, () => {
      console.log(`BookMyShot server running on port ${PORT}`);

      // Initialize Socket.IO on the http server
      const socketService = require("./services/socketService");
      socketService.init(server);

      // Start automated cron jobs
      const { initScheduler } = require("./services/scheduler");
      initScheduler();
    });
    server.on("error", (err) => {
      console.error("Server failed to start:", err.message);
      process.exit(1);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message || err);
    process.exit(1);
  }
};

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  if (server) server.close(() => process.exit(1));
  else process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

startServer();

// Static files
app.use(express.static(path.join(__dirname, "../public"), { dotfiles: 'allow' }));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// Admin sub-routers (protected by auth middleware)
const { protect, authorize } = require("./middleware/auth");
app.use("/api/admin/finance", protect, authorize("admin"), adminFinanceRoutes);
app.use("/api/admin/audit-logs", protect, authorize("admin"), adminAuditLogRoutes);
app.use("/api/admin/creator-accounts", protect, authorize("admin"), adminCreatorAccountsRoutes);
app.use("/api/admin/platform-settings", protect, authorize("admin"), adminPlatformSettingsRoutes);
app.use("/api/admin/subscription-settings", protect, authorize("admin"), adminSubscriptionSettingsRoutes);
app.use("/api/admin/commission-settings", protect, authorize("admin"), adminCommissionSettingsRoutes);
app.use("/api/admin/featured-portfolios", protect, authorize("admin"), adminFeaturedPortfoliosRoutes);
app.use("/api/admin/search-boosts", protect, authorize("admin"), adminSearchBoostsRoutes);
app.use("/api/admin/revenue-center", protect, authorize("admin"), adminRevenueCenterRoutes);
app.use("/api/admin/announcements", protect, authorize("admin"), adminAnnouncementsRoutes);
app.use("/api/admin/dashboard-overview", protect, authorize("admin"), adminDashboardRoutes);
app.use("/api/admin/social-links", protect, authorize("admin"), adminSocialLinksRoutes);
app.use("/api/admin/payment-history", protect, authorize("admin"), adminPaymentHistoryRoutes);
app.use("/api/admin/homepage-enquiries", protect, authorize("admin"), adminHomepageEnquiriesRoutes);

// Backup & Reports routes
app.use("/api/admin/backups", protect, authorize("admin"), require("./routes/admin/backups"));
app.use("/api/admin/reports", protect, authorize("admin"), require("./routes/admin/reports"));
app.use("/api/admin/report-management", protect, authorize("admin"), require("./routes/admin/reportManagement"));
app.use("/api/admin/overdue", protect, authorize("admin"), require("./routes/admin/overdueManagement"));
app.use("/api/admin/rankings", protect, authorize("admin"), require("./routes/admin/rankings"));
app.use("/api/admin/ranking-management", protect, authorize("admin"), require("./routes/admin/rankingManagement"));
app.use("/api/admin/analytics", protect, authorize("admin"), require("./routes/admin/analytics"));
app.use("/api/admin/creator-ledger", protect, authorize("admin"), require("./routes/admin/creatorLedger"));
app.use("/api/admin/categories", protect, authorize("admin"), require("./routes/admin/categories"));

// Public rankings API (used by website + app)
app.use("/api/rankings", require("./routes/rankings"));

// Admin: general-purpose image upload to Cloudinary
const { upload: adminUpload } = require("./middleware/upload");
app.post("/api/admin/upload", protect, authorize("admin"), adminUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file" });
    const { uploadBuffer, isConfigured } = require("./services/cloudinaryService");
    const folder = req.body.folder || "bookmyshot/general";
    
    if (isConfigured()) {
      const resourceType = req.file.mimetype.startsWith("video") ? "video" : "image";
      const result = await uploadBuffer(req.file.buffer, { folder, resourceType });
      return res.json({ success: true, url: result.url, publicId: result.publicId });
    } else {
      // Fallback: save locally
      const fs = require("fs");
      const pathMod = require("path");
      const uploadDir = pathMod.join(__dirname, "../public/uploads/general");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${pathMod.extname(req.file.originalname)}`;
      fs.writeFileSync(pathMod.join(uploadDir, filename), req.file.buffer);
      return res.json({ success: true, url: `/uploads/general/${filename}` });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Upload failed" });
  }
});

// Creator: upload payment proof/photos to Cloudinary
app.post("/api/creator/upload", protect, authorize("creator"), adminUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file" });
    const { uploadBuffer, isConfigured } = require("./services/cloudinaryService");
    const folder = req.body.folder || "bookmyshot/payment-proofs";
    
    if (isConfigured()) {
      const result = await uploadBuffer(req.file.buffer, { folder, resourceType: "image" });
      return res.json({ success: true, url: result.url, publicId: result.publicId });
    } else {
      const fs = require("fs");
      const pathMod = require("path");
      const uploadDir = pathMod.join(__dirname, "../public/uploads/proofs");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${pathMod.extname(req.file.originalname)}`;
      fs.writeFileSync(pathMod.join(uploadDir, filename), req.file.buffer);
      return res.json({ success: true, url: `/uploads/proofs/${filename}` });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Upload failed" });
  }
});

// User: upload payment proof to Cloudinary (any authenticated user)
app.post("/api/user/upload", protect, adminUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file" });
    const { uploadBuffer, isConfigured } = require("./services/cloudinaryService");
    const folder = "bookmyshot/payment-proofs";
    
    if (isConfigured()) {
      const result = await uploadBuffer(req.file.buffer, { folder, resourceType: "image" });
      return res.json({ success: true, url: result.url, publicId: result.publicId });
    } else {
      const fs = require("fs");
      const pathMod = require("path");
      const uploadDir = pathMod.join(__dirname, "../public/uploads/proofs");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${pathMod.extname(req.file.originalname)}`;
      fs.writeFileSync(pathMod.join(uploadDir, filename), req.file.buffer);
      return res.json({ success: true, url: `/uploads/proofs/${filename}` });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Upload failed" });
  }
});

// Maintenance mode check — applied after auth/admin routes.
// Internally bypasses admin users and /api/auth paths.
app.use(maintenanceMode);

// Invoice route (BEFORE other protected routes — handles its own auth)
app.use("/api/invoice", require("./routes/invoice"));

// Health check endpoint (for monitoring and debugging)
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "running",
    uptime: Math.floor(process.uptime()),
    env: {
      JWT_SECRET: !!process.env.JWT_SECRET ? "configured" : "MISSING",
      MONGODB_URI: !!process.env.MONGODB_URI ? "configured" : "MISSING",
      NODE_ENV: process.env.NODE_ENV || "not set",
      PORT: process.env.PORT || 5000,
    },
    timestamp: new Date().toISOString(),
  });
});

// Public platform config endpoint (no auth required) — serves pricing/commission info to frontend
app.get("/api/config/public", async (req, res) => {
  try {
    const configService = require("./services/configService");
    const [subSettings, commSettings, platformSettings] = await Promise.all([
      configService.getSubscriptionSettings(),
      configService.getCommissionSettings(),
      configService.getPlatformSettings(),
    ]);
    res.json({
      success: true,
      subscription: {
        monthlyPlanPrice: subSettings.monthlyPlanPrice,
        yearlyPlanPrice: subSettings.yearlyPlanPrice,
        yearlyPlanDuration: subSettings.yearlyPlanDuration || 365,
        yearlyPlanActive: subSettings.yearlyPlanActive !== false,
        yearlyPlanName: subSettings.yearlyPlanName || "Yearly Pro",
        yearlyPlanDescription: subSettings.yearlyPlanDescription || "12 months for the price of 10",
        yearlyShowRecommended: subSettings.yearlyShowRecommended !== false,
        yearlyShowSaveBadge: subSettings.yearlyShowSaveBadge !== false,
        yearlyButtonText: subSettings.yearlyButtonText || "Buy Yearly Plan",
        yearlyBenefits: subSettings.yearlyBenefits || "",
        yearlyReminderDays: subSettings.yearlyReminderDays || "30,15,7,3,1",
        trialDays: subSettings.trialDays,
        freeTrialEnabled: subSettings.freeTrialEnabled !== false,
        featuredPortfolioPrice: subSettings.featuredPortfolioPrice,
        searchBoostPrice: subSettings.searchBoostPrice,
        homepageFeaturedPrice: subSettings.homepageFeaturedPrice,
      },
      commission: {
        bmsLeadPercent: commSettings.bmsLeadCommissionPercent,
        creatorLeadPercent: commSettings.creatorLeadCommissionPercent,
      },
      platform: {
        currency: platformSettings.currency,
        siteName: platformSettings.siteName,
      },
    });
  } catch (err) {
    res.json({
      success: true,
      subscription: { monthlyPlanPrice: 299, yearlyPlanPrice: 2999, trialDays: 30 },
      commission: { bmsLeadPercent: 5, creatorLeadPercent: 3 },
      platform: { currency: "INR", siteName: "BookMyShot" },
    });
  }
});

// Homepage config — hero banner content + cashback % from admin panel (public, no auth)
app.get("/api/homepage-config", async (req, res) => {
  try {
    const PlatformSettings = require("./models/PlatformSettings");
    const CashbackSettings = require("./models/CashbackSettings");
    const [settings, cashback] = await Promise.all([
      PlatformSettings.findOne().lean(),
      CashbackSettings.getSettings(),
    ]);
    const now = new Date();
    const cashbackActive = cashback.enabled &&
      (!cashback.startDate || new Date(cashback.startDate) <= now) &&
      (!cashback.endDate || new Date(cashback.endDate) >= now);

    res.json({
      success: true,
      data: {
        cashbackPercentage: cashbackActive ? cashback.percentage : 0,
        cashbackEnabled: cashbackActive,
        cashbackMaxAmount: cashback.maxAmount,
        heroTitle: settings?.heroTitle || "Your Dream Wedding,",
        heroTitleAccent: settings?.heroTitleAccent || "More Rewards!",
        heroSubtitle: settings?.heroSubtitle || "Book verified wedding creators and get exciting cashback on every successful booking.",
        heroEyebrow: settings?.heroEyebrow || "CELEBRATE BEAUTIFULLY. SAVE MORE.",
        heroCta1Text: settings?.heroCta1Text || "Find Creator",
        heroCta2Text: settings?.heroCta2Text || "Get Free Quote",
      },
    });
  } catch (err) {
    res.json({ success: true, data: { cashbackPercentage: 10, cashbackEnabled: true, heroTitle: "Your Dream Wedding,", heroTitleAccent: "More Rewards!", heroSubtitle: "Book verified wedding creators and get exciting cashback on every successful booking.", heroEyebrow: "CELEBRATE BEAUTIFULLY. SAVE MORE.", heroCta1Text: "Find Creator", heroCta2Text: "Get Free Quote" } });
  }
});

// Mobile app config — dynamic categories, cities, banners from real data
app.get("/api/app-config", async (req, res) => {
  try {
    const Creator = require("./models/Creator");
    const creators = await Creator.find({ status: "approved", subscriptionStatus: { $in: ["active", "trial"] } }).select("category city").lean();

    // Derive categories from real creator data
    const catCounts = {};
    creators.forEach(c => { if (c.category) catCounts[c.category] = (catCounts[c.category] || 0) + 1; });
    const categoryIcons = { wedding: '💒', 'pre-wedding': '💑', cinematography: '🎬', makeup: '💄', mehendi: '🌿', drone: '🚁', decoration: '🎊', photography: '📸' };
    const categories = [{ id: 'all', label: 'All', icon: '✨', count: creators.length }];
    Object.entries(catCounts).sort((a, b) => b[1] - a[1]).forEach(([id, count]) => {
      categories.push({ id, label: id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' '), icon: categoryIcons[id] || '📷', count });
    });

    // Derive cities from real creator data
    const cityCounts = {};
    creators.forEach(c => { if (c.city) cityCounts[c.city] = (cityCounts[c.city] || 0) + 1; });
    const cities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ id: name.toLowerCase().replace(/\s+/g, '-'), name, count }));

    // Get announcements/banners from admin if available
    let banners = [];
    try {
      const Announcement = require("./models/Announcement");
      const active = await Announcement.find({ active: true }).sort("-createdAt").limit(5).lean();
      banners = active.map((a) => ({ id: a._id, title: a.title, subtitle: a.message || '', color: '#D4AF37' }));
    } catch {}
    if (banners.length === 0) {
      banners = [{ id: '1', title: 'Premium Creators', subtitle: 'Verified & trusted professionals', color: '#D4AF37' }];
    }

    // Commission from config
    const configService = require("./services/configService");
    const commSettings = await configService.getCommissionSettings();

    res.json({
      success: true,
      categories,
      cities,
      banners,
      commission: { bmsLeadPercent: commSettings.bmsLeadCommissionPercent || 5, creatorLeadPercent: commSettings.creatorLeadCommissionPercent || 3 },
      totalCreators: creators.length,
    });
  } catch (err) {
    res.json({ success: true, categories: [], cities: [], banners: [], commission: { bmsLeadPercent: 5, creatorLeadPercent: 3 }, totalCreators: 0 });
  }
});

// Public social links endpoint (no auth required)
app.get("/api/social-links", async (req, res) => {
  try {
    const SocialLinks = require("./models/SocialLinks");
    const links = await SocialLinks.getLinks();
    res.json({ success: true, data: links });
  } catch (err) {
    res.json({ success: true, data: {} });
  }
});

app.use("/api/creator", creatorRoutes);
app.use("/api/creators", creatorsRoutes);
app.use("/api/user", userRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/homepage", homepageRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/queries", queryRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/commissions", commissionRoutes);
app.use("/api/payment-proofs", paymentProofRoutes);
app.use("/api/payment-records", paymentRecordRoutes);
app.use("/api/booking-events", bookingEventRoutes);
app.use("/api/revenue", revenueRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/razorpay", razorpayRoutes);
app.use("/api/featured-wedding-moments", featuredMomentsRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/general-inquiries", generalInquiryRoutes);
app.use("/api/discover", discoverRoutes);
app.use("/api/subcategories", require("./routes/subcategories"));
app.use("/api/cashback", require("./routes/cashback"));
app.use("/api/footer", require("./routes/footer"));
app.use("/api/leads", require("./routes/leads"));
app.use("/api/live-stats", require("./routes/liveStats"));
app.use("/api/app-version", require("./routes/appVersion"));
app.use("/api/homepage-enquiries", homepageEnquiryRoutes);

// APK download redirect — always redirects to latest build URL
app.get("/releases/bookmyshot-latest.apk", (req, res) => {
  const appVersion = require("./routes/appVersion");
  // Redirect to the API download endpoint which handles the actual redirect
  res.redirect(302, "/api/app-version/download");
});

// Clean URL routes for static pages (legal, info)
const staticPages = ['about', 'contact', 'terms', 'privacy', 'refund-policy', 'booking-cancellation', 'cookie-policy', 'creator-guidelines', 'how-bookmyshot-works', 'pricing', 'enquiry', 'faq'];
staticPages.forEach(page => {
  app.get(`/${page}`, (req, res) => res.sendFile(path.join(__dirname, `../public/${page}.html`)));
});

// Aliases
app.get('/how-it-works', (req, res) => res.redirect('/how-bookmyshot-works'));

// SPA-style fallbacks for dashboards
// Serve exact dashboard HTML files first to avoid SPA catch-alls overriding static assets
app.get("/creator/dashboard.html", (req, res) =>
	res.sendFile(path.join(__dirname, "../public/creator/dashboard.html"))
);
app.get("/admin/dashboard.html", (req, res) =>
	res.sendFile(path.join(__dirname, "../public/admin/dashboard.html"))
);
app.get("/user/dashboard.html", (req, res) =>
	res.sendFile(path.join(__dirname, "../public/user/dashboard.html"))
);

// Public Creator Portfolio route — /creator/:username
app.get("/creator/:username", (req, res) => {
	res.sendFile(path.join(__dirname, "../public/creator-portfolio.html"));
});

// SPA-style fallbacks for dashboards (catch-all for client-side routing)
app.get("/admin*", (req, res) => res.sendFile(path.join(__dirname, "../public/admin/index.html")));
app.get("/creator*", (req, res) => {
	// If it's a direct file request (e.g. /creator/something.html), let static serve it
	if (req.path.includes('.')) return res.sendFile(path.join(__dirname, "../public", req.path));
	res.sendFile(path.join(__dirname, "../public/creator/index.html"));
});
app.get("/user*", (req, res) => res.sendFile(path.join(__dirname, "../public/user/dashboard.html")));

app.use(errorHandler);
