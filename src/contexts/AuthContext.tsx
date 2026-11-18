"use client";

/**
 * Contexte d'authentification Firebase.
 * Bascule en mode démonstration (compte local) si Firebase n'est pas configuré.
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  getFirebaseAuth,
  firebaseConfigured,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onIdTokenChanged,
  updateProfile,
  googleProvider,
  type User,
} from "@/lib/firebase";
import { invalidateTokenCache } from "@/lib/apiClient";

interface AuthState {
  user: User | null;
  loading: boolean;
  demoMode: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAdmin: () => Promise<boolean>;
  setAdminFlag: (v: boolean) => void;
}

const AuthContext = createContext<AuthState | null>(null);

// Compte de démonstration persistant (localStorage) si Firebase absent
const DEMO_KEY = "soul-demo-user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [demoUser, setDemoUser] = useState<{ email: string; name: string } | null>(null);
  const tokenRef = useRef<User | null>(null);

  useEffect(() => {
    if (!firebaseConfigured) {
      void (async () => {
        await Promise.resolve();
        try {
          const raw = localStorage.getItem(DEMO_KEY);
          if (raw) setDemoUser(JSON.parse(raw));
        } catch {
          // ignore
        }
        setLoading(false);
      })();
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onIdTokenChanged(auth, (u) => {
      tokenRef.current = u;
      setUser(u);
      invalidateTokenCache();
      if (u) {
        u.getIdTokenResult()
          .then((r) => setIsAdmin(!!r.claims.admin))
          .catch(() => setIsAdmin(false));
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!firebaseConfigured) {
      const u = { email, name: email.split("@")[0] };
      localStorage.setItem(DEMO_KEY, JSON.stringify(u));
      setDemoUser(u);
      return;
    }
    await signInWithEmailAndPassword(getFirebaseAuth()!, email.trim(), password);
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    if (!firebaseConfigured) {
      const u = { email, name: name || email.split("@")[0] };
      localStorage.setItem(DEMO_KEY, JSON.stringify(u));
      setDemoUser(u);
      return;
    }
    const cred = await createUserWithEmailAndPassword(getFirebaseAuth()!, email.trim(), password);
    if (name) await updateProfile(cred.user, { displayName: name });
  }, []);

  const signInGoogle = useCallback(async () => {
    if (!firebaseConfigured) throw new Error("demo");
    await signInWithPopup(getFirebaseAuth()!, googleProvider());
  }, []);

  const logout = useCallback(async () => {
    if (!firebaseConfigured) {
      localStorage.removeItem(DEMO_KEY);
      setDemoUser(null);
      return;
    }
    await signOut(getFirebaseAuth()!);
  }, []);

  const refreshAdmin = useCallback(async () => {
    if (!firebaseConfigured) return false;
    const u = getFirebaseAuth()?.currentUser;
    if (!u) return false;
    await u.getIdToken(true);
    const r = await u.getIdTokenResult();
    const admin = !!r.claims.admin;
    setIsAdmin(admin);
    return admin;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: firebaseConfigured ? user : demoUser ? ({ email: demoUser.email, displayName: demoUser.name } as unknown as User) : null,
        loading,
        demoMode: !firebaseConfigured,
        isAdmin,
        signIn,
        signUp,
        signInGoogle,
        logout,
        refreshAdmin,
        setAdminFlag: setIsAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth hors AuthProvider");
  return ctx;
}
