import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let ioInstance = null;

/**
 * Server-initiated emits use io.to(room) so all clients in the room receive the event.
 * (Using socket.to from a handler would exclude only that socket; for global broadcasts use io.)
 */
export function getIo() {
  return ioInstance;
}

export function attachSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== "string") {
      return next(new Error("Invalid token"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded.userId || !decoded.role) {
        return next(new Error("Invalid token"));
      }
      socket.data.user = {
        userId: decoded.userId,
        teamName: decoded.teamName,
        role: decoded.role,
      };
      return next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return next(new Error("Session expired, please log in again"));
      }
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const { userId, role } = socket.data.user;
    socket.join("global");
    if (role === "admin") {
      socket.join("admin");
    }
    if (role === "team") {
      socket.join(`team:${userId}`);
    }
  });

  ioInstance = io;
  return io;
}
