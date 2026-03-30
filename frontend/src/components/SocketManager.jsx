import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../auth/AuthContext";
import { isTokenExpired } from "../auth/jwt";
import { getSocketOrigin } from "../api/apiUrl";

export default function SocketManager() {
  const { token, user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token || !user || isTokenExpired(token)) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return undefined;
    }

    const origin = getSocketOrigin();
    const socketOptions = {
      auth: { token },
      transports: ["websocket", "polling"],
    };
    const socket = origin ? io(origin, socketOptions) : io(socketOptions);

    socketRef.current = socket;

    socket.on("connect_error", (err) => {
      console.warn("Socket connect_error:", err.message);
    });

    return () => {
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [token, user?.userId, user?.role]);

  return null;
}
