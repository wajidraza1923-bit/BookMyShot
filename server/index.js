require("dotenv").config();
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

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;
let server;

const startServer = async () => {
  try {
    await connectDB();

    // Seed default configuration documents on first run
    const configService = require("./services/configService");
    await configService.seedDefaults();

    // Ensure admin account exists in production
    const User = require("./models/User");
    const existingAdmin = await User.findOne({ role: "admin" });
    if (!existingAdmin) {
      const adminEmail = process.env.ADMIN_EMAIL || "bookmyshott@gmail.com";
      const adminPassword = process.env.ADMIN_PASSWORD || "REDACTED_PASSWORD";
      await User.create({
        name: "Admin",
        email: adminEmail,
        password: adminPassword,
        role: "admin",
        emailVerified: true,
      });
      console.log(`[STARTUP] Admin account created: ${adminEmail}`);
    } else {
      console.log(`[STARTUP] Admin account exists: ${existingAdmin.email}`);
    }

    server = app.listen(PORT, () => console.log(`BookMyShot server running on port ${PORT}`));
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
app.use(express.static(path.join(__dirname, "../public")));

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

// Maintenance mode check — applied after auth/admin routes.
// Internally bypasses admin users and /api/auth paths.
app.use(maintenanceMode);

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
        trialDays: subSettings.trialDays,
        freeTrialEnabled: subSettings.freeTrialEnabled !== false,
        gracePeriodDays: subSettings.gracePeriodDays || 7,
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
app.use("/api/homepage-enquiries", homepageEnquiryRoutes);

// Clean URL routes for static pages (legal, info)
const staticPages = ['about', 'contact', 'terms', 'privacy', 'refund-policy', 'booking-cancellation', 'cookie-policy', 'creator-guidelines', 'how-bookmyshot-works', 'pricing'];
staticPages.forEach(page => {
  app.get(`/${page}`, (req, res) => res.sendFile(path.join(__dirname, `../public/${page}.html`)));
});

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
