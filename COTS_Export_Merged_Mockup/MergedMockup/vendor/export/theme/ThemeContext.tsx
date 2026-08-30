/**
 * Theme preference (v1.1).
 *
 * Three settings, one resolved theme:
 *
 *   "system"  follow the operating system / browser setting, and keep following it
 *             if the user changes it while the tab is open
 *   "light"   force light
 *   "dark"    force dark
 *
 * The choice is remembered in localStorage — not sessionStorage — because a display
 * preference should outlive the tab, while the mock sign-in deliberately does not.
 * Storage can throw (private mode, blocked cookies), so every access is guarded and
 * the app falls back to following the system.
 *
 * The resolved theme is written to <html data-theme> because CSS custom properties are
 * defined on :root, and to <meta name="color-scheme"> so form controls and scrollbars
 * follow too.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "cots-export-mockup.theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

interface ThemeContextValue {
  /** What the user asked for. */
  preference: ThemePreference;
  /** What is actually on screen once "system" is resolved. */
  theme: ResolvedTheme;
  /** True when the preference is "system", i.e. the OS is still in charge. */
  followsSystem: boolean;
  setPreference: (next: ThemePreference) => void;
  /** Light → dark → light. Sets an explicit preference, leaving "system" behind. */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function readStoredPreference(raw: string | null): ThemePreference {
  return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
}

function loadPreference(): ThemePreference {
  try {
    return readStoredPreference(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return "system";
  }
}

function systemTheme(): ResolvedTheme {
  return typeof window.matchMedia === "function" && window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/** The single rule that decides what is rendered. Pure, so it is unit-testable. */
export function resolveTheme(preference: ThemePreference, system: ResolvedTheme): ResolvedTheme {
  return preference === "system" ? system : preference;
}

export const THEME_LABEL: Record<ThemePreference, string> = {
  system: "Match system",
  light: "Light",
  dark: "Dark",
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(loadPreference);
  const [system, setSystem] = useState<ResolvedTheme>(systemTheme);

  // Keep following the OS while the preference is "system".
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = (e: MediaQueryListEvent) => setSystem(e.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const theme = resolveTheme(preference, system);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    let meta = document.querySelector('meta[name="color-scheme"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "color-scheme");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", theme);
  }, [theme]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      if (next === "system") window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // A blocked storage API must not break the switch — it just will not persist.
    }
  }, []);

  const toggle = useCallback(
    () => setPreference(resolveTheme(preference, system) === "dark" ? "light" : "dark"),
    [preference, system, setPreference],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, theme, followsSystem: preference === "system", setPreference, toggle }),
    [preference, theme, setPreference, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside a ThemeProvider");
  return ctx;
}
