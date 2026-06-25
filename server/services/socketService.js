/**
 * BookMyShot Socket.IO Service — Real-Time Updates
 * 
 * Events emitted to clients:
 * - booking:updated     (booking data changed)
 * - inquiry:new         (new inquiry for creator)
 * - inquiry:updated     (inquiry status changed)
 * - notification:new    (new notification created)
 * - commission:new      (commission generated/updated)
 * - payment:updated     (payment status changed)
 * - dashboard:refresh   (general data refresh signal)
 * - admin:update        (admin panel changes)
 * 
 * Rooms:
 * - user:{userId}       (personal room for each user)
 * - role:admin          (all admins)
 * - role:creator        (all creators)
 */
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io = null;

/**
 * Initialize Socket.IO on the existing HTTP server
 */
function init(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ["websocket", "polling"],
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error("Authentication required"));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const User = require("../models/User");
      const user = await User.findById(decoded.id).select("_id name role email");
      if (!user) return next(new Error("User not found"));
      socket.userId = user._id.toString();
      socket.userRole = user.role;
      socket.userName = user.name;
      next();
    } catch (e) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.userName} (${socket.userRole}) — ${socket.id}`);

    // Join personal room
    socket.join(`user:${socket.userId}`);

    // Join role-based room
    if (socket.userRole) {
      socket.join(`role:${socket.userRole}`);
    }

    // Handle disconnect
    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Disconnected: ${socket.userName} — ${reason}`);
    });

    // Client can request a refresh
    socket.on("requestRefresh", (type) => {
      // Echo back to tell client to refresh a specific section
      socket.emit("dashboard:refresh", { type });
    });
  });

  console.log("[Socket] ✅ Socket.IO server initialized");
  return io;
}

/**
 * Get the Socket.IO instance
 */
function getIO() {
  return io;
}

/**
 * Emit to a specific user
 */
function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId.toString()}`).emit(event, data);
}

/**
 * Emit to all users with a specific role
 */
function emitToRole(role, event, data) {
  if (!io) return;
  io.to(`role:${role}`).emit(event, data);
}

/**
 * Emit to all connected clients
 */
function emitToAll(event, data) {
  if (!io) return;
  io.emit(event, data);
}

// ═══ Convenience emitters ═══

function notifyBookingUpdate(userId, creatorUserId, bookingData) {
  emitToUser(userId, "booking:updated", bookingData);
  if (creatorUserId) emitToUser(creatorUserId, "booking:updated", bookingData);
  emitToRole("admin", "booking:updated", bookingData);
}

function notifyNewInquiry(creatorUserId, inquiryData) {
  emitToUser(creatorUserId, "inquiry:new", inquiryData);
  emitToRole("admin", "inquiry:new", inquiryData);
}

function notifyInquiryUpdate(userId, inquiryData) {
  emitToUser(userId, "inquiry:updated", inquiryData);
  emitToRole("admin", "inquiry:updated", inquiryData);
}

function notifyNewNotification(userId, notification) {
  emitToUser(userId, "notification:new", notification);
}

function notifyCommission(creatorUserId, commissionData) {
  emitToUser(creatorUserId, "commission:new", commissionData);
  emitToRole("admin", "commission:new", commissionData);
}

function notifyPaymentUpdate(userId, creatorUserId, paymentData) {
  emitToUser(userId, "payment:updated", paymentData);
  if (creatorUserId) emitToUser(creatorUserId, "payment:updated", paymentData);
  emitToRole("admin", "payment:updated", paymentData);
}

function notifyAdminUpdate(data) {
  emitToRole("admin", "admin:update", data);
}

function notifyDashboardRefresh(userId) {
  emitToUser(userId, "dashboard:refresh", { ts: Date.now() });
}

module.exports = {
  init,
  getIO,
  emitToUser,
  emitToRole,
  emitToAll,
  notifyBookingUpdate,
  notifyNewInquiry,
  notifyInquiryUpdate,
  notifyNewNotification,
  notifyCommission,
  notifyPaymentUpdate,
  notifyAdminUpdate,
  notifyDashboardRefresh,
};
