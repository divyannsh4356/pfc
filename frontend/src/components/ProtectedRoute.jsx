import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { isTokenExpired } from "../auth/jwt";

export default function ProtectedRoute({ adminOnly = false, children }) {
  const location = useLocation();
  const { token, user, clearAuth, loading } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace state={{ message: "Please log in" }} />;
  }

  if (isTokenExpired(token)) {
    clearAuth("Session expired");
    return <Navigate to="/login" replace state={{ message: "Session expired" }} />;
  }

  // After login, `user` is set immediately; `/api/auth/me` may still be in flight.
  // Do not block the whole app on that — only block when we have a token but no profile yet.
  if (loading && !user) {
    return <p>Checking session...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ message: "Please log in" }} />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/dashboard" replace state={{ from: location.pathname }} />;
  }

  return children;
}
