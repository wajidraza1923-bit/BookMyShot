const Notification = require("../models/Notification");

/**
 * Create notification for a user
 */
const createNotification = async (userId, title, message, type = "info", link = "", meta = {}) => {
  await Notification.create({ user: userId, title, message, type, link, meta });
};

module.exports = { createNotification };
