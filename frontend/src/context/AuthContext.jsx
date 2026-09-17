import { createContext, useContext, useEffect, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Starts true: we don't know yet whether a valid session cookie exists.
  // ProtectedRoute waits for this before deciding to redirect to /login.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(null); // no valid session cookie — that's fine, not an error state
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data);
    return data;
  }

  async function logout() {
    await api.post("/auth/logout");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
