import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Spinner } from "../components/feedback";

/**
 * Protects every route except /login.
 *
 * An unauthenticated user opening a protected deep link is sent to /login with the
 * originally requested location in router state, and returned there after signing in.
 */
export function RequireAuth() {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <Spinner label="Restoring your session…" />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

/**
 * An authenticated user opening /login is redirected away.
 *
 * It redirects to the originally requested route when one was captured by RequireAuth,
 * and to the springboard otherwise. This wrapper — not the login page — owns the redirect,
 * because it re-renders the instant the auth state changes and would otherwise race the
 * page's own `navigate` call and win, sending the user to the springboard and losing the
 * deep link they asked for.
 */
export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Spinner label="Restoring your session…" />;
  if (user) return <Navigate to={returnToFrom(location.state)} replace />;
  return <>{children}</>;
}

/** Extracts the originally requested path from router state, defaulting to the springboard. */
export function returnToFrom(state: unknown): string {
  const from = (state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from;
  if (!from?.pathname) return "/";
  return `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`;
}
