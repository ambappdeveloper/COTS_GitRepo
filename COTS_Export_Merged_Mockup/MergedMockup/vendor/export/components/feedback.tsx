/**
 * Feedback primitives: status chips, banners, toasts, dialogs, empty/loading/error states.
 *
 * Every status treatment pairs a GLYPH + TEXT + COLOUR. Colour is never the only
 * carrier of meaning (CTRM anti-patterns A3 and A8).
 * No `window.alert()` is used anywhere in this application.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { StatusTone } from "../domain/types";
import "./feedback.css";

/* ------------------------------------------------------------------ *
 * StatusChip
 * ------------------------------------------------------------------ */

const TONE_GLYPH: Record<StatusTone, string> = {
  ok: "✓",
  warn: "▲",
  risk: "!",
  info: "•",
  idle: "○",
  na: "–",
  accent: "◐",
};

export function StatusChip({
  tone,
  label,
  glyph,
  title,
  size = "md",
}: {
  tone: StatusTone;
  label: string;
  glyph?: string;
  title?: string;
  size?: "sm" | "md";
}) {
  return (
    <span className={`chip chip--${tone} ${size === "sm" ? "chip--sm" : ""}`} title={title}>
      <span className="chip__glyph" aria-hidden="true">
        {glyph ?? TONE_GLYPH[tone]}
      </span>
      <span className="chip__label">{label}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Banner (inline, non-modal)
 * ------------------------------------------------------------------ */

export function Banner({
  tone,
  title,
  children,
  action,
  onDismiss,
}: {
  tone: StatusTone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
}) {
  const roleAttr = tone === "risk" ? "alert" : "status";
  return (
    <div className={`banner banner--${tone}`} role={roleAttr}>
      <span className="banner__glyph" aria-hidden="true">
        {TONE_GLYPH[tone]}
      </span>
      <div className="banner__body">
        <p className="banner__title">{title}</p>
        {children ? <div className="banner__text">{children}</div> : null}
      </div>
      {action ? <div className="banner__action">{action}</div> : null}
      {onDismiss ? (
        <button type="button" className="banner__close btn btn--ghost btn--sm" onClick={onDismiss}>
          Dismiss
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Toasts
 * ------------------------------------------------------------------ */

interface Toast {
  id: number;
  tone: StatusTone;
  message: string;
}

interface ToastContextValue {
  push: (tone: StatusTone, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const push = useCallback((tone: StatusTone, message: string) => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.tone}`}>
            <span aria-hidden="true">{TONE_GLYPH[t.tone]}</span>
            <span>{t.message}</span>
            <button
              type="button"
              className="toast__close"
              onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>.");
  return ctx;
}

/* ------------------------------------------------------------------ *
 * Dialog — focus-trapped, Escape-dismissable, no window.confirm()
 * ------------------------------------------------------------------ */

export function Dialog({
  open,
  title,
  children,
  onClose,
  footer,
  tone = "info",
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  tone?: StatusTone;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  /**
   * `onClose` is read through a ref rather than depended on.
   *
   * Callers pass an inline arrow — `onClose={() => setOpen(false)}` — which is a new
   * function on every render, so a single effect depending on `onClose` re-ran on every
   * keystroke inside the dialog, moved focus back to the first control and threw away
   * everything after the first character. Splitting the two concerns fixes it: the
   * initial focus and the focus restore run only when `open` changes, and the key
   * handler is installed once and calls whatever `onClose` currently is.
   */
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Initial focus on open, and focus restored to the opener on close.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("button, [href], input, select, textarea")?.focus();
    return () => previous?.focus();
  }, [open]);

  // Escape to dismiss, Tab trapped inside the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = [
        ...panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open]);

  if (!open) return null;

  return (
    <div className="dialog__scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`dialog dialog--${tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        ref={panelRef}
      >
        <div className="dialog__head">
          <h2 id="dialog-title" className="dialog__title">
            {title}
          </h2>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="dialog__body">{children}</div>
        {footer ? <div className="dialog__foot">{footer}</div> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Loading / empty / error states
 * ------------------------------------------------------------------ */

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="spinner" role="status">
      <span className="spinner__ring" aria-hidden="true" />
      <span className="spinner__label">{label}</span>
    </div>
  );
}

export function SkeletonRows({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="skeleton" aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <div className="skeleton__row" key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <span className="skeleton__cell" key={c} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
  glyph = "○",
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  glyph?: string;
}) {
  return (
    <div className="empty">
      <span className="empty__glyph" aria-hidden="true">
        {glyph}
      </span>
      <p className="empty__title">{title}</p>
      {children ? <div className="empty__text">{children}</div> : null}
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  detail,
  onRetry,
}: {
  title?: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="empty empty--error" role="alert">
      <span className="empty__glyph" aria-hidden="true">
        !
      </span>
      <p className="empty__title">{title}</p>
      {detail ? <div className="empty__text">{detail}</div> : null}
      {onRetry ? (
        <div className="empty__action">
          <button type="button" className="btn btn--primary" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}
