/**
 * Application shell (v2.0).
 *
 * v1.0 kept an always-visible left rail. v1.1 follows the reference application: the top bar
 * carries a hamburger that opens the full module tree as an off-canvas drawer at every width,
 * and the springboard at "/" is the primary way in. The bar also holds a home control, the
 * theme switch and the account menu.
 *
 * The drawer is a real dialog when it is open: focus moves into it, Tab is trapped, Escape
 * closes it and focus returns to the hamburger. It closes on navigation.
 */

import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { CountryScopeLine } from "./CountryScopeNotice";
import { useAuth } from "../auth/AuthContext";
import { ROLE_LABEL } from "../domain/types";
import { Icon } from "../nav/Icon";
import { BANDS, MODULES, moduleForPath } from "../nav/modules";
import { resetStore } from "../services/store";
import { ThemeChoice, ThemeToggle } from "../theme/ThemeControl";
import { Dialog, useToast } from "./feedback";
import "./shell.css";

export function Shell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const current = moduleForPath(location.pathname);

  // Close transient surfaces on navigation.
  useEffect(() => {
    setDrawerOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!accountOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [accountOpen]);

  // Drawer: focus in, Tab trapped, Escape out.
  useEffect(() => {
    if (!drawerOpen) return;
    const node = drawerRef.current;
    const first = node?.querySelector<HTMLElement>("a, button");
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        hamburgerRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const items = [...node.querySelectorAll<HTMLElement>("a, button, select")].filter(
        (el) => !el.hasAttribute("disabled"),
      );
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      } else if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      <div className="shell__bar on-brand">
        <button
          type="button"
          ref={hamburgerRef}
          className="shell__hamburger"
          aria-expanded={drawerOpen}
          aria-controls="global-nav"
          onClick={() => setDrawerOpen((o) => !o)}
        >
          <span className="shell__bars" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="sr-only">{drawerOpen ? "Close navigation menu" : "Open navigation menu"}</span>
        </button>

        <NavLink to="/" className="shell__brand" title="Springboard — all modules">
          <strong>COTS</strong> <span>Export Operations</span>
          <span className="shell__proto">prototype v2.0</span>
        </NavLink>

        {current ? (
          <p className="shell__where" aria-live="polite">
            <span aria-hidden="true">›</span> {current.label}
          </p>
        ) : null}

        <div className="shell__baractions">
          <NavLink to="/" end className="btn btn--on-brand btn--sm" title="Back to the springboard">
            Home
          </NavLink>
          <ThemeToggle onBrand />
          <div className="shell__account" ref={accountRef}>
            <button
              type="button"
              className="btn btn--on-brand btn--sm"
              aria-expanded={accountOpen}
              aria-haspopup="true"
              onClick={() => setAccountOpen((o) => !o)}
            >
              {user?.displayName ?? "Account"} ▾
            </button>
            {accountOpen ? (
              <ul className="menu" role="menu">
                <li role="none" className="menu__meta">
                  <span className="small">
                    <strong>{user?.displayName}</strong>
                    <br />
                    {user ? ROLE_LABEL[user.role] : ""} · {user?.unit}
                  </span>
                </li>
                <li role="none" className="menu__section">
                  <span className="menu__sectiontitle">Theme</span>
                  <ThemeChoice />
                </li>
                <li role="none">
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      setResetOpen(true);
                    }}
                  >
                    Reset demo data…
                  </button>
                </li>
                <li role="none">
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      signOut();
                      navigate("/login", { replace: true });
                    }}
                  >
                    Sign out
                  </button>
                </li>
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      <div className="shell__body">
        {drawerOpen ? (
          <div
            className="shell__scrim"
            onClick={() => {
              setDrawerOpen(false);
              hamburgerRef.current?.focus();
            }}
            aria-hidden="true"
          />
        ) : null}

        <nav
          id="global-nav"
          ref={drawerRef}
          className={`shell__nav ${drawerOpen ? "shell__nav--open" : ""}`}
          aria-label="Modules"
          aria-hidden={!drawerOpen}
          {...(drawerOpen ? { role: "dialog", "aria-modal": true } : {})}
          inert={!drawerOpen}
        >
          <div className="shell__navhead">
            <p className="shell__navtitle">All modules</p>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => {
                setDrawerOpen(false);
                hamburgerRef.current?.focus();
              }}
            >
              Close
            </button>
          </div>

          {BANDS.map((band) => {
            const items = MODULES.filter((m) => m.band === band);
            if (!items.length) return null;
            return (
              <div className="shell__navgroup" key={band}>
                <p className="shell__navband">{band}</p>
                <ul>
                  {items.map((m) => (
                    <li key={m.id}>
                      <NavLink
                        to={m.to}
                        end={m.to === "/"}
                        className={({ isActive }) =>
                          isActive ? "shell__navlink shell__navlink--active" : "shell__navlink"
                        }
                        title={m.hint}
                      >
                        <span className="shell__navicon">
                          <Icon name={m.icon} size={18} />
                        </span>
                        {m.label}
                      </NavLink>
                      {m.children?.length ? (
                        <ul className="shell__navsub">
                          {m.children.map((c) => (
                            <li key={c.to + c.label}>
                              <NavLink
                                to={c.to}
                                className={({ isActive }) =>
                                  isActive ? "shell__sublink shell__sublink--active" : "shell__sublink"
                                }
                                title={c.hint}
                              >
                                {c.label}
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          <p className="shell__navfoot">
            Mock-up with synthetic data. Local mock authentication only — no production security.
          </p>
        </nav>

        <main id="main" className="shell__main" tabIndex={-1}>
          {/*
            9 September 2026 — every Export list is filtered to the session's country, so
            every Export screen says which one. Here rather than on each list: see the note
            on `CountryScopeLine`.
          */}
          <CountryScopeLine />
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <Dialog
        open={resetOpen}
        title="Reset demo data?"
        tone="warn"
        onClose={() => setResetOpen(false)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setResetOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                resetStore();
                setResetOpen(false);
                toast.push("ok", "Demo data reset to its seeded state.");
                navigate("/");
              }}
            >
              Reset demo data
            </button>
          </>
        }
      >
        <p>
          This discards every change you have made in this session and restores the seeded synthetic records.
          Your sign-in and your theme choice are not affected.
        </p>
        <p className="muted small" style={{ marginTop: "0.75rem" }}>
          To clear the session as well, sign out — or close the browser tab, since the demo session is held in{" "}
          <code>sessionStorage</code>. The theme lives in <code>localStorage</code>, so it survives both.
        </p>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Error boundary
 * ------------------------------------------------------------------ */

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In a prototype this is the useful place for it; a real app would report it.
    console.error("Unhandled error in a page component", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="shell__error" role="alert">
          <h1>This screen could not be displayed</h1>
          <p className="muted">{this.state.error.message}</p>
          <div className="row" style={{ marginTop: "1rem" }}>
            <button type="button" className="btn btn--primary" onClick={() => this.setState({ error: null })}>
              Try again
            </button>
            <a className="btn" href="/">
              Back to the springboard
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
