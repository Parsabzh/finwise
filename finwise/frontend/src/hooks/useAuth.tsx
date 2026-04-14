/* ═══════════════════════════════════════════════════════════════════
   Auth Hook — Context provider + hook for authentication state.

   Pattern: React Context + useContext.
   The token lives here and is accessible from any component via
   useAuth(). Login sets it, logout clears it.

   We store the token in state only (not localStorage) because this
   is a single-page app and tokens are short-lived. For persistence
   across page reloads, we'd add localStorage — but that's a Phase 7
   concern when we harden security.
   ═══════════════════════════════════════════════════════════════════ */

"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface AuthContextType {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  const login = useCallback((newToken: string) => {
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ token, login, logout, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
