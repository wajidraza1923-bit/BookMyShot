/**
 * BookMyShot Push Notification Service — Production
 * 
 * Sends via Expo Push API → FCM relay → Android device
 * FREE, no rate limits, production-proven at scale
 * 
 * Token format: ExponentPushToken[xxx] (wraps FCM registration token)
 * Delivery: foreground (shown as alert), background (system tray), terminated (system tray)
 */
const https = require("https");
const User = require("../models/User");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Send push notification to a single user by their MongoDB _id
 * @param {string} userId - User._id
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Custom data payload (type, targetScreen, targetId)
 */
async function sendToUser(userId, title, body, data = {}) {
  try {
    const user = await User.findById(userId).select("pushToken pushPlatform");
    if (!user || !user.pushToken) {
      console.log(`[Push] No token for user ${userId}`);
      return false;
    }
    return await sendPush(user.pushToken, title, body, data, user.pushPlatform);
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
    const users = await User.find({
      _id: { $in: userIds },
      pushToken: { $exists: true, $ne: "" },
    }).select("pushToken pushPlatform");
    const tokens = users.map(u => u.pushToken).filter(Boolean);
    if (tokens.length === 0) return false;
    console.log(`[Push] Sending to ${tokens.length} users`);
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
    const users = await User.find({
      role,
      pushToken: { $exists: true, $ne: "" },
    }).select("pushToken");
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
 * Send push to ALL registered users (admin broadcast)
 */
async function broadcast(title, body, data = {}) {
  try {
    const users = await User.find({
      pushToken: { $exists: true, $ne: "" },
    }).select("pushToken");
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
function sendPush(token, title, body, data = {}, platform = "android") {
  return new Promise((resolve) => {
    const message = JSON.stringify({
      to: token,
      title,
      body,
      sound: "default",
      badge: 1,
      channelId: data.channelId || "bookmyshot",
      priority: "high",
      data: {
        ...data,
        title, // Include in data for terminated-state handling
        body,
      },
    });

    const req = https.request(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(message),
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
    }, (res) => {
      let d = "";
      res.on("data", (c) => d += c);
      res.on("end", () => {
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(d);
            if (result.data && result.data[0]?.status === "error") {
              console.log(`[Push] ⚠️ Delivery error:`, result.data[0].message);
              // Token might be invalid — could clean up
            }
          } catch {}
          resolve(true);
        } else {
          console.error("[Push] Expo API error:", res.statusCode, d.substring(0, 200));
          resolve(false);
        }
      });
    });
    req.on("error", (e) => { console.error("[Push] Network error:", e.message); resolve(false); });
    req.write(message);
    req.end();
  });
}

/**
 * Send batch push (up to 100 per request — Expo limit)
 */
async function sendPushBatch(tokens, title, body, data = {}) {
  const messages = tokens.map(token => ({
    to: token,
    title,
    body,
    sound: "default",
    badge: 1,
    channelId: data.channelId || "bookmyshot",
    priority: "high",
    data: { ...data, title, body },
  }));

  // Chunk into groups of 100
  const chunks = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  let successCount = 0;
  for (const chunk of chunks) {
    const success = await new Promise((resolve) => {
      const payload = JSON.stringify(chunk);
      const req = https.request(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          "Accept": "application/json",
        },
      }, (res) => {
        let d = "";
        res.on("data", (c) => d += c);
        res.on("end", () => resolve(res.statusCode === 200));
      });
      req.on("error", () => resolve(false));
      req.write(payload);
      req.end();
    });
    if (success) successCount += chunk.length;
  }

  console.log(`[Push] Batch sent: ${successCount}/${tokens.length} delivered`);
  return successCount > 0;
}

module.exports = { sendToUser, sendToUsers, sendToRole, broadcast };
