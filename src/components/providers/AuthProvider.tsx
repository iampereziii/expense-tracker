"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import { getFirebaseAuth, HOUSEHOLD_ID } from "@/lib/firebase";
import { seedCategoriesIfEmpty } from "@/services/categories";

interface AuthState {
  user: User | null;
  /** True once we've resolved auth (signed in, or known-unconfigured). */
  ready: boolean;
  /** False when Firebase env / household id isn't set — app runs in a guard state. */
  configured: boolean;
  /** Set when anonymous sign-in failed (e.g. Anonymous Auth not enabled). */
  error: string | null;
}

const AuthContext = createContext<AuthState>({
  user: null,
  ready: false,
  configured: false,
  error: null,
});

export const useAuth = (): AuthState => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && HOUSEHOLD_ID);

  useEffect(() => {
    if (!configured) {
      setReady(true);
      return;
    }
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setError(null);
        setReady(true);
        // First-run: seed Food/Bills so the chip row isn't empty.
        try {
          await seedCategoriesIfEmpty();
        } catch {
          /* offline / rules — non-fatal; will retry next load */
        }
      } else {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          // Most commonly: Anonymous Auth isn't enabled in the Firebase console.
          setError(e instanceof Error ? e.message : "Anonymous sign-in failed");
          setReady(true);
        }
      }
    });
    return unsub;
  }, [configured]);

  return (
    <AuthContext.Provider value={{ user, ready, configured, error }}>
      {children}
    </AuthContext.Provider>
  );
}
