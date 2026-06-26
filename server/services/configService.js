const PlatformSettings = require("../models/PlatformSettings");
const SubscriptionSettings = require("../models/SubscriptionSettings");
const CommissionSettings = require("../models/CommissionSettings");

// In-memory cache with 60-second TTL
const CACHE_TTL_MS = 60 * 1000;

const cache = {
  platform: { data: null, timestamp: 0 },
  subscription: { data: null, timestamp: 0 },
  commission: { data: null, timestamp: 0 },
};

// Hardcoded fallback defaults used when DB is unavailable
const DEFAULTS = {
  platform: {
    siteName: "BookMyShot",
    siteDescription: "Premium Photography Booking Platform",
    supportEmail: "support@bookmyshot.in",
    supportPhone: "8492922173",
    currency: "INR",
    maintenanceMode: false,
    platformStatus: "active",
  },
  subscription: {
    monthlyPlanPrice: 299,
    yearlyPlanPrice: 2999,
    trialDays: 30,
    autoRenewDefault: true,
    featuredPortfolioPrice: 999,
    searchBoostPrice: 499,
    homepageFeaturedPrice: 1499,
  },
  commission: {
    bmsLeadCommissionPercent: 5,
    creatorLeadCommissionPercent: 3,
    inquiryCommissionPercent: 3,
    latePaymentFeePercent: 2,
    manualAdjustmentPercent: 0,
  },
};

/**
 * Check if a cached entry is still valid (less than 60 seconds old)
 */
function isCacheValid(key) {
  const entry = cache[key];
  return entry.data !== null && Date.now() - entry.timestamp < CACHE_TTL_MS;
}

/**
 * Get platform settings with caching and fallback to defaults
 */
async function getPlatformSettings() {
  if (isCacheValid("platform")) {
    return cache.platform.data;
  }

  try {
    const settings = await PlatformSettings.findOne();
    if (settings) {
      cache.platform = { data: settings, timestamp: Date.now() };
      return settings;
    }
    // Collection empty — return defaults
    console.warn("[ConfigService] PlatformSettings collection is empty, using defaults");
    return DEFAULTS.platform;
  } catch (err) {
    console.warn("[ConfigService] Failed to read PlatformSettings, using defaults:", err.message);
    return DEFAULTS.platform;
  }
}

/**
 * Get subscription settings with caching and fallback to defaults
 */
async function getSubscriptionSettings() {
  if (isCacheValid("subscription")) {
    return cache.subscription.data;
  }

  try {
    const settings = await SubscriptionSettings.findOne();
    if (settings) {
      cache.subscription = { data: settings, timestamp: Date.now() };
      return settings;
    }
    console.warn("[ConfigService] SubscriptionSettings collection is empty, using defaults");
    return DEFAULTS.subscription;
  } catch (err) {
    console.warn("[ConfigService] Failed to read SubscriptionSettings, using defaults:", err.message);
    return DEFAULTS.subscription;
  }
}

/**
 * Get commission settings with caching and fallback to defaults
 */
async function getCommissionSettings() {
  if (isCacheValid("commission")) {
    return cache.commission.data;
  }

  try {
    const settings = await CommissionSettings.findOne();
    if (settings) {
      cache.commission = { data: settings, timestamp: Date.now() };
      return settings;
    }
    console.warn("[ConfigService] CommissionSettings collection is empty, using defaults");
    return DEFAULTS.commission;
  } catch (err) {
    console.warn("[ConfigService] Failed to read CommissionSettings, using defaults:", err.message);
    return DEFAULTS.commission;
  }
}

/**
 * Invalidate the cached value for a specific collection
 * @param {string} collection - One of "platform", "subscription", "commission"
 */
function invalidateCache(collection) {
  if (cache[collection]) {
    cache[collection] = { data: null, timestamp: 0 };
  }
}

/**
 * Seed default documents into configuration collections if they are empty.
 * Idempotent — if a collection already has a document, it is left unchanged.
 */
async function seedDefaults() {
  try {
    const platformCount = await PlatformSettings.countDocuments();
    if (platformCount === 0) {
      await PlatformSettings.create(DEFAULTS.platform);
      console.log("[ConfigService] Seeded default PlatformSettings");
    }
  } catch (err) {
    console.error("[ConfigService] Failed to seed PlatformSettings:", err.message);
  }

  try {
    const subscriptionCount = await SubscriptionSettings.countDocuments();
    if (subscriptionCount === 0) {
      await SubscriptionSettings.create(DEFAULTS.subscription);
      console.log("[ConfigService] Seeded default SubscriptionSettings");
    }
  } catch (err) {
    console.error("[ConfigService] Failed to seed SubscriptionSettings:", err.message);
  }

  try {
    const commissionCount = await CommissionSettings.countDocuments();
    if (commissionCount === 0) {
      await CommissionSettings.create(DEFAULTS.commission);
      console.log("[ConfigService] Seeded default CommissionSettings");
    }
  } catch (err) {
    console.error("[ConfigService] Failed to seed CommissionSettings:", err.message);
  }
}

module.exports = {
  getPlatformSettings,
  getSubscriptionSettings,
  getCommissionSettings,
  invalidateCache,
  seedDefaults,
  // Exposed for testing purposes
  _cache: cache,
  _DEFAULTS: DEFAULTS,
  _CACHE_TTL_MS: CACHE_TTL_MS,
};
