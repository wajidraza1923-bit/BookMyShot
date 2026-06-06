const configService = require("../services/configService");

/**
 * Maintenance mode middleware.
 * Checks PlatformSettings.maintenanceMode (cached with 60s TTL).
 * - If maintenance mode is ON:
 *   - Admin users bypass (req.user.role === "admin")
 *   - Auth routes bypass (path starts with /api/auth)
 *   - All other requests receive 503
 * - If maintenance mode is OFF: passes through
 */
async function maintenanceMode(req, res, next) {
  try {
    const settings = await configService.getPlatformSettings();

    if (settings.maintenanceMode) {
      // Allow admin users through
      if (req.user && req.user.role === "admin") {
        return next();
      }

      // Allow auth routes through
      if (req.path.startsWith("/api/auth")) {
        return next();
      }

      return res.status(503).json({
        success: false,
        message: "Platform is under maintenance. Please try again later.",
      });
    }

    next();
  } catch (err) {
    // If we can't read settings, let the request through (fail-open)
    console.error("[MaintenanceMiddleware] Error checking maintenance mode:", err.message);
    next();
  }
}

module.exports = maintenanceMode;
