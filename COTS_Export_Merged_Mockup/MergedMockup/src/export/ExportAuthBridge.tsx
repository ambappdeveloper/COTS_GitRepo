/**
 * The Export module's identity, taken from the Core session — v1.4.
 *
 * WHAT THIS REPLACES, AND WHY IT IS THE ONLY SUBSTITUTION
 * ------------------------------------------------------
 * v1.4 stops framing the Export prototype and imports it in place, the way Core and Shared have
 * always been imported. Almost nothing had to be substituted to do that:
 *
 *   · `styles/global.css` and `components/Shell.tsx` are imported by Export's own `App.tsx` and by
 *     nothing else. This application does not use that `App.tsx` — it mounts Export's routes into the
 *     one integrated route table — so neither file is ever loaded, and neither needed replacing.
 *   · `services/store.ts` is a plain subscribe/notify store with no provider, so it works untouched.
 *
 * `auth/AuthContext.tsx` is the exception. Twelve Export page files call `useAuth()`, and the real
 * one authenticates against Export's own demo accounts in `sessionStorage` — which is what produced
 * the second sign-in that v1.1 worked around by handing a session over between two origins. Now that
 * Export runs inside this application there is no second origin and no hand-over: `vite.config.ts`
 * redirects that module here, and `useAuth()` returns the person who signed in at the Core screen.
 *
 * WHAT IS KEPT IDENTICAL
 * ----------------------
 * The exported shape — `AuthProvider`, `useAuth`, `AuthContextValue`, and a `user` of Export's own
 * `AppUser` type. No Export file is modified, and no Export page can tell the difference. Remove the
 * redirect in `vite.config.ts` and the Export prototype authenticates exactly as it does standalone.
 *
 * THE ROLE MAPPING IS STILL A BUSINESS CONFIRMATION
 * -------------------------------------------------
 * Core has seven roles and Export's model has ten; the mapping between them is the same one v1.1
 * wrote and the same one that is still unconfirmed. It lives in `integration/session.ts`, is used
 * here rather than duplicated, and the phase context strip says on screen when a mapping is
 * approximate.
 */

import React from 'react';
import type { AppUser } from '@export/domain/types';
import { carriedSession } from '../integration/session';
import { useIdentity } from '../integration/useIdentity';

export interface AuthContextValue {
  user: AppUser | null;
  ready: boolean;
  signIn: (username: string, password: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
  signOut: () => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

/**
 * Provides the Core session as Export's identity.
 *
 * `ready` is the Core store's own answer rather than a delay: there is no session to restore from
 * storage, because the session already exists — this application would not have rendered an Export
 * route for a signed-out user, since the route table puts every module screen behind the Core
 * sign-in.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const id = useIdentity();

  const value = React.useMemo<AuthContextValue>(() => {
    const carried = id.signedIn ? carriedSession(id, id.activeCountry) : null;

    return {
      ready: true,
      user: carried
        ? {
            id: carried.session.id,
            username: carried.session.username,
            // the person is the Core account holder, not the Export demo persona
            displayName: id.name,
            role: carried.session.role as AppUser['role'],
            unit: `${id.orgUnit} · ${id.activeCountry}`,
          }
        : null,

      /*
       * Export has no sign-in of its own any more, so these two exist to satisfy the interface and
       * are deliberately inert rather than plausible. Signing in and out is a Core screen — the
       * account menu in the shell above — and an Export page that called either of these would be a
       * bug worth seeing rather than one worth hiding.
       */
      signIn: async () => ({
        ok: false as const,
        reason:
          'Export does not sign anyone in inside the integrated application. The session comes from the Core sign-in — use the account menu in the header to change it.',
      }),
      signOut: () => {
        /* Core owns the session; signing out here would leave the Core session running. */
      },
    };
  }, [id]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** The same call the Export pages already make. */
export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
}
