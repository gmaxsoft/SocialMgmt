import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiJson, getToken, setToken, type PanelRole } from "../lib/api";

export type AuthUser = {
  id: number;
  email: string;
  role: PanelRole;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerFirst: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

function decodeUserFromJwt(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as {
      sub: number;
      email: string;
      role: PanelRole;
    };
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setTok] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      setTok(null);
      setUser(null);
      setLoading(false);
      return;
    }
    setTok(t);
    setUser(decodeUserFromJwt(t));
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiJson<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    setTok(data.token);
    setUser(data.user);
  }, []);

  const registerFirst = useCallback(async (email: string, password: string) => {
    const data = await apiJson<{ token: string; user: AuthUser }>("/api/auth/register-first", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    setTok(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setTok(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      registerFirst,
      logout,
    }),
    [user, token, loading, login, registerFirst, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
