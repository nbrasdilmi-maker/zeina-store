/**
 * Real-time WebSocket Service for زينة Store
 * Handles: Notifications, Chat, Order Updates, Cart Sync
 */

import { Server as SocketServer, Socket } from "socket.io";
import { createServer } from "http";

const PORT = 3030;

interface UserSocket {
  userId: string;
  role: string;
  socketId: string;
}

// Store connected users
const connectedUsers = new Map<string, UserSocket>();

const httpServer = createServer();
const io = new SocketServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Authentication middleware
io.use((socket, next) => {
  const userId = socket.handshake.auth.userId;
  const role = socket.handshake.auth.role;

  if (!userId) {
    return next(new Error("Authentication required"));
  }

  // Store user info
  connectedUsers.set(userId, {
    userId,
    role: role || "CUSTOMER",
    socketId: socket.id,
  });

  next();
});

io.on("connection", (socket: Socket) => {
  const userId = socket.handshake.auth.userId;
  const role = socket.handshake.auth.role;

  console.log(`✅ User connected: ${userId} (${role})`);

  // Join user to their personal room
  socket.join(`user:${userId}`);

  // Join role-based rooms
  if (role === "ADMIN") {
    socket.join("admins");
  } else if (role === "AGENT") {
    socket.join("agents");
  }

  // ========== NOTIFICATIONS ==========
  
  // Send notification to specific user
  socket.on("send-notification", (data: { to: string; notification: any }) => {
    io.to(`user:${data.to}`).emit("notification", data.notification);
  });

  // Broadcast to all admins
  socket.on("admin-notification", (data: any) => {
    io.to("admins").emit("admin-notification", data);
  });

  // ========== CHAT SYSTEM ==========
  
  // Join conversation room
  socket.on("join-conversation", (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
  });

  // Leave conversation room
  socket.on("leave-conversation", (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`);
  });

  // Send message
  socket.on("send-message", (data: { conversationId: string; message: any }) => {
    io.to(`conversation:${data.conversationId}`).emit("new-message", data.message);
    
    // Notify conversation participants
    if (data.message.recipientId) {
      io.to(`user:${data.message.recipientId}`).emit("message-received", data.message);
    }
  });

  // Typing indicator
  socket.on("typing", (data: { conversationId: string; isTyping: boolean }) => {
    socket.to(`conversation:${data.conversationId}`).emit("user-typing", {
      userId,
      isTyping: data.isTyping,
    });
  });

  // ========== ORDER UPDATES ==========
  
  // Order created notification
  socket.on("order-created", (data: { order: any; customerId: string }) => {
    // Notify admins
    io.to("admins").emit("new-order", data.order);
    
    // Notify customer
    io.to(`user:${data.customerId}`).emit("order-update", {
      type: "created",
      order: data.order,
    });
  });

  // Order status update
  socket.on("order-status-update", (data: { orderId: string; status: string; customerId: string }) => {
    // Notify customer
    io.to(`user:${data.customerId}`).emit("order-update", {
      type: "status",
      orderId: data.orderId,
      status: data.status,
    });
  });

  // ========== CART SYNC ==========
  
  // Cart updated (for multi-device sync)
  socket.on("cart-updated", (data: { cart: any }) => {
    socket.to(`user:${userId}`).emit("cart-sync", data.cart);
  });

  // ========== DISCONNECT ==========
  
  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${userId}`);
    connectedUsers.delete(userId);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Real-time service running on port ${PORT}`);
});

export { io, connectedUsers };
