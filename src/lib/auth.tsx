import { createContext, useContext, useState, type ReactNode } from "react";
import { demoUsers, type DemoUser } from "./mockData";

interface AuthContextValue {
  user: DemoUser | null;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  /** Update the signed-in user's own profile (everything except email). Persists
   * to the auth store and to the in-memory demo account so a re-login keeps it. */
  updateProfile: (patch: Partial<Omit<DemoUser, "id" | "email" | "role" | "password">>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "oneedu.auth.user";

function readStored(): DemoUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DemoUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(readStored);

  const login: AuthContextValue["login"] = (email, password) => {
    const found = demoUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
    );
    if (!found) return { ok: false, error: "Invalid email or password" };
    // Write storage synchronously BEFORE state update so the next navigation's
    // beforeLoad guard sees the auth cookie immediately.
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
    }
    setUser(found);
    return { ok: true };
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    setUser(null);
  };

  const updateProfile: AuthContextValue["updateProfile"] = (patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      // Keep the in-memory demo account in sync so a logout/login round-trip
      // preserves the edit for the rest of the session.
      const acct = demoUsers.find((u) => u.id === prev.id);
      if (acct) Object.assign(acct, patch);
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
