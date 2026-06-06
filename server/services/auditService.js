const AuditLog = require("../models/AuditLog");

/**
 * Log an admin action to the audit trail.
 * Best-effort: if the audit write fails, the error is logged
 * but the primary operation is not affected.
 *
 * @param {Object} params
 * @param {string|ObjectId} params.adminId - The admin user's ID
 * @param {string} params.adminName - The admin user's display name
 * @param {string} params.action - Action performed (e.g. "update_platform_settings")
 * @param {string} params.target - Target type (e.g. "settings", "creator", "payment")
 * @param {string} params.targetId - ID of the target record
 * @param {object|null} params.previousValues - State before the change
 * @param {object|null} params.newValues - State after the change
 * @param {string} params.ip - Request IP address
 */
async function logAction({
  adminId,
  adminName,
  action,
  target,
  targetId,
  previousValues,
  newValues,
  ip,
}) {
  try {
    await AuditLog.create({
      admin: adminId,
      adminName: adminName || "",
      action,
      target: target || "",
      targetId: targetId || "",
      targetType: target || "",
      previousValues: previousValues || null,
      newValues: newValues || null,
      ip: ip || "",
    });
  } catch (error) {
    console.error("Audit log write failed:", error.message);
  }
}

module.exports = { logAction };
