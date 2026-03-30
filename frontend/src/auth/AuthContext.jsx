import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getMe, login as loginRequest, logout as logoutRequest } from "../api/authApi";
import { isTokenExpired } from "./jwt";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionMessage, setSessionMessage] = useState("");

  const clearAuth = (message = "") => {
    setToken(null);
    setUser(null);
    setSessionMessage(message);
  };

  const login = async (teamName, password) => {
    const data = await loginRequest(teamName, password);
    setToken(data.token);
    setUser(data.user);
    setSessionMessage("");
    return data.user;
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } catch {
      // Stateless logout endpoint can fail silently on network errors.
    } finally {
      clearAuth("");
    }
  };

  const validateCurrentToken = async () => {
    if (!token) {
      return;
    }

    if (isTokenExpired(token)) {
      clearAuth("Session expired");
      return;
    }

    try {
      const data = await getMe(token);
      setUser(data.user);
      setSessionMessage("");
    } catch (error) {
      if (error.code === "TOKEN_EXPIRED") {
        clearAuth("Session expired");
        return;
      }

      clearAuth("Please log in");
    }
  };

  useEffect(() => {
    if (!token) {
      return;
    }

    setLoading(true);
    validateCurrentToken().finally(() => setLoading(false));
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      sessionMessage,
      setSessionMessage,
      login,
      logout,
      validateCurrentToken,
      clearAuth,
    }),
    [token, user, loading, sessionMessage]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
