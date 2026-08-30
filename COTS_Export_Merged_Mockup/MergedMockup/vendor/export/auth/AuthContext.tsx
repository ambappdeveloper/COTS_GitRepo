/**
 * Local mock authentication.
 *
 * This is a PROTOTYPE mechanism only. Credentials are compared against a hard-coded
 * demo list in the bundle, the session is a plain object in sessionStorage, and there
 * is no token, no encryption and no identity provider. It provides NO production
 * security and must never be pointed at real credentials.
 *
 * Session persistence uses sessionStorage so the demo survives a page refresh but is
 * cleared when the browser tab closes. Reset instructions are in the README and in the
 * shell's account menu.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEMO_USERS } from "../data/master";
import type { AppUser } from "../domain/types";

const SESSION_KEY = "cots-export-mockup.session";

interface AuthState {
  user: AppUser | null;
  ready: boolean;
}

export interface AuthContextValue extends AuthState {
  signIn: (username: string, password: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readSession(): AppUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppUser;
    // Only trust a session that still matches a known demo user.
    return DEMO_USERS.some((u) => u.id === parsed.id) ? parsed : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, ready: false });

  useEffect(() => {
    setState({ user: readSession(), ready: true });
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    // Deliberate small delay so the submitting state is observable.
    await new Promise((r) => setTimeout(r, 350));
    const match = DEMO_USERS.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password,
    );
    if (!match) {
      return {
        ok: false as const,
        reason:
          "Those demo credentials were not recognised. Check the username and password shown below the form.",
      };
    }
    const { password: _pw, ...user } = match;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch {
      /* sessionStorage unavailable — the session simply will not survive a refresh. */
    }
    setState({ user, ready: true });
    return { ok: true as const };
  }, []);

  const signOut = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    setState({ user: null, ready: true });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ ...state, signIn, signOut }), [state, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}
