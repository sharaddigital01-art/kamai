"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import {
  getCachedUser,
  setCachedUser,
  invalidateClientCache,
} from "@/lib/clientCache";

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  role: "USER" | "ADMIN";
  referralCode: string;
  subIdPrefix?: string;
  phone?: string | null;
}

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Synchronous 0ms initialization from client cache
  const cached = typeof window !== "undefined" ? getCachedUser() : null;

  const [user, setUser] = useState<AuthUser | null>(() => {
    return cached?.authenticated && cached.user ? (cached.user as AuthUser) : null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(cached?.authenticated);
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return Boolean(cached?.isAdmin);
  });

  const [loading, setLoading] = useState<boolean>(() => {
    return !cached;
  });

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          const authUser: AuthUser = {
            id: data.user.id,
            email: data.user.email || null,
            name: data.user.name || null,
            role: data.user.role || "USER",
            referralCode: data.user.referralCode || "",
            subIdPrefix: data.user.subIdPrefix,
            phone: data.user.phone || null,
          };
          const isAdm = Boolean(data.isAdmin || data.user.role === "ADMIN");

          setCachedUser({ authenticated: true, user: authUser, isAdmin: isAdm });
          setUser(authUser);
          setIsAuthenticated(true);
          setIsAdmin(isAdm);
          setLoading(false);
          return;
        }
      }

      // If /api/auth/me returns unauthenticated
      setCachedUser({ authenticated: false, user: null, isAdmin: false });
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
    } catch {
      // In offline / network issue, retain current cached state
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}

    // Sign out from Supabase client if configured
    if (typeof window !== "undefined") {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (url && key) {
          const supabase = createSupabaseBrowser();
          await supabase.auth.signOut();
        }
      } catch (e) {
        console.warn("Supabase browser signOut notice:", e);
      }
    }

    invalidateClientCache();
    setCachedUser({ authenticated: false, user: null, isAdmin: false });
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("kamai_auth_changed", { detail: null }));
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    // 1. Fetch latest server auth state
    refreshAuth();

    // 2. Custom Window Event listener (dispatched synchronously on login/signup)
    const handleCustomAuth = (e: any) => {
      const u = e.detail;
      if (u) {
        const authUser: AuthUser = {
          id: u.id,
          email: u.email || null,
          name: u.name || null,
          role: u.role || "USER",
          referralCode: u.referralCode || "",
          subIdPrefix: u.subIdPrefix,
          phone: u.phone || null,
        };
        const isAdm = Boolean(u.role === "ADMIN");
        setCachedUser({ authenticated: true, user: authUser, isAdmin: isAdm });
        setUser(authUser);
        setIsAuthenticated(true);
        setIsAdmin(isAdm);
        setLoading(false);
      } else {
        invalidateClientCache();
        setCachedUser({ authenticated: false, user: null, isAdmin: false });
        setUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
        setLoading(false);
      }
    };

    window.addEventListener("kamai_auth_changed", handleCustomAuth);

    // 3. Supabase Auth State Observer
    let authSubscription: { unsubscribe: () => void } | null = null;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key) {
      try {
        const supabase = createSupabaseBrowser();
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session?.user) {
            const meta = session.user.user_metadata || {};
            const authUser: AuthUser = {
              id: session.user.id,
              email: session.user.email || null,
              name:
                meta.name ||
                session.user.email?.split("@")[0] ||
                "Kamai Karo Partner",
              role: meta.role === "ADMIN" ? "ADMIN" : "USER",
              referralCode:
                meta.referralCode ||
                session.user.id.replace(/-/g, "").slice(0, 8).toUpperCase(),
            };
            const isAdm = authUser.role === "ADMIN";

            setCachedUser({ authenticated: true, user: authUser, isAdmin: isAdm });
            setUser(authUser);
            setIsAuthenticated(true);
            setIsAdmin(isAdm);
            setLoading(false);

            // Background reconcile with /api/auth/me for exact DB fields
            fetch("/api/auth/me", { cache: "no-store" })
              .then((r) => r.json())
              .then((fresh) => {
                if (fresh.authenticated && fresh.user) {
                  const reconciledUser: AuthUser = {
                    id: fresh.user.id,
                    email: fresh.user.email || null,
                    name: fresh.user.name || null,
                    role: fresh.user.role || "USER",
                    referralCode: fresh.user.referralCode || "",
                    subIdPrefix: fresh.user.subIdPrefix,
                    phone: fresh.user.phone || null,
                  };
                  const reconciledAdmin = Boolean(
                    fresh.isAdmin || fresh.user.role === "ADMIN"
                  );
                  setCachedUser({
                    authenticated: true,
                    user: reconciledUser,
                    isAdmin: reconciledAdmin,
                  });
                  setUser(reconciledUser);
                  setIsAdmin(reconciledAdmin);
                }
              })
              .catch(() => {});
          } else if (event === "SIGNED_OUT") {
            invalidateClientCache();
            setCachedUser({ authenticated: false, user: null, isAdmin: false });
            setUser(null);
            setIsAuthenticated(false);
            setIsAdmin(false);
            setLoading(false);
          }
        });

        authSubscription = subscription;
      } catch (supaErr) {
        console.warn("Supabase onAuthStateChange setup notice:", supaErr);
      }
    }

    return () => {
      window.removeEventListener("kamai_auth_changed", handleCustomAuth);
      authSubscription?.unsubscribe();
    };
  }, [refreshAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        loading,
        refreshAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
