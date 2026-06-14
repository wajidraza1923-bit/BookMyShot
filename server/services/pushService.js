/**
 * BookMyShot Push Notification Service
 * Sends push notifications via Expo Push API (free, no Firebase Admin SDK needed)
 * Works with expo-notifications tokens (ExponentPushToken[...])
 * 
 * Cost: FREE (Expo Push API has no usage limits for push delivery)
 */
const https = require("https");
const User = require("../models/User");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Send push notification to a single user by their MongoDB _id
 */
async function sendToUser(userId, title, body, data = {}) {
  try {
    const user = await User.findById(userId).select("pushToken");
    if (!user || !user.pushToken) return false;
    return await sendPush(user.pushToken, title, body, data);
  } catch (e) {
    console.error("[Push] sendToUser error:", e.message);
    return false;
  }
}

/**
 * Send push notification to multiple users
 */
async function sendToUsers(userIds, title, body, data = {}) {
  try {
    const users = await User.find({ _id: { $in: userIds }, pushToken: { $exists: true, $ne: "" } }).select("pushToken");
    const tokens = users.map(u => u.pushToken).filter(Boolean);
    if (tokens.length === 0) return false;
    return await sendPushBatch(tokens, title, body, data);
  } catch (e) {
    console.error("[Push] sendToUsers error:", e.message);
    return false;
  }
}

/**
 * Send push to all users with a specific role
 */
async function sendToRole(role, title, body, data = {}) {
  try {
    const users = await User.find({ role, pushToken: { $exists: true, $ne: "" } }).select("pushToken");
    const tokens = users.map(u => u.pushToken).filter(Boolean);
    if (tokens.length === 0) return false;
    console.log(`[Push] Broadcasting to ${tokens.length} ${role}s`);
    return await sendPushBatch(tokens, title, body, data);
  } catch (e) {
    console.error("[Push] sendToRole error:", e.message);
    return false;
  }
}

/**
 * Send push to ALL users (broadcast)
 */
async function broadcast(title, body, data = {}) {
  try {
    const users = await User.find({ pushToken: { $exists: true, $ne: "" } }).select("pushToken");
    const tokens = users.map(u => u.pushToken).filter(Boolean);
    if (tokens.length === 0) return false;
    console.log(`[Push] Broadcasting to ${tokens.length} devices`);
    return await sendPushBatch(tokens, title, body, data);
  } catch (e) {
    console.error("[Push] broadcast error:", e.message);
    return false;
  }
}

/**
 * Send single push via Expo Push API
 */
function sendPush(token, title, body, data = {}) {
  return new Promise((resolve) => {
    const message = JSON.stringify({
      to: token,
      title,
      body,
      sound: "default",
      badge: 1,
      data,
    });

    const req = https.request(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(message) },
    }, (res) => {
      let d = "";
      res.on("data", (c) => d += c);
      res.on("end", () => {
        if (res.statusCode === 200) resolve(true);
        else { console.error("[Push] Expo API error:", d); resolve(false); }
      });
    });
    req.on("error", () => resolve(false));
    req.write(message);
    req.end();
  });
}

/**
 * Send batch push (up to 100 at a time)
 */
async function sendPushBatch(tokens, title, body, data = {}) {
  const messages = tokens.map(token => ({ to: token, title, body, sound: "default", badge: 1, data }));
  // Expo accepts up to 100 per request
  const chunks = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    await new Promise((resolve) => {
      const payload = JSON.stringify(chunk);
      const req = https.request(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
      }, (res) => {
        let d = "";
        res.on("data", (c) => d += c);
        res.on("end", () => resolve(true));
      });
      req.on("error", () => resolve(false));
      req.write(payload);
      req.end();
    });
  }
  return true;
}

module.exports = { sendToUser, sendToUsers, sendToRole, broadcast };
