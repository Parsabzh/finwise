"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

interface AuthContextType {
  token: string | null;
  login: (token: string, remember?: boolean) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  // On mount, check if a token was saved (remember me)
  useEffect(() => {
    const saved = localStorage.getItem("finwise_token");
    if (saved) setToken(saved);
  }, []);

  const login = useCallback((newToken: string, remember = false) => {
    setToken(newToken);
    if (remember) {
      localStorage.setItem("finwise_token", newToken);
    } else {
      localStorage.removeItem("finwise_token");
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem("finwise_token");
  }, []);

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
