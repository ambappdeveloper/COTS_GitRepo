/**
 * Layout primitives: page header (C1), action bar (C2), record tabs (C3),
 * summary cards (C6), route visual (C7), collapsible sections (C9),
 * field grid (C10) and the total banner (C11).
 */

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import type { FieldBehaviour, StatusTone } from "../domain/types";
import "./layout.css";

/* ------------------------------------------------------------------ *
 * Breadcrumbs
 * ------------------------------------------------------------------ */

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="crumbs">
      <ol>
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`}>
              {c.to && !last ? (
                <Link to={c.to}>{c.label}</Link>
              ) : (
                <span aria-current={last ? "page" : undefined}>{c.label}</span>
              )}
              {!last ? (
                <span className="crumbs__sep" aria-hidden="true">
                  ›
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ------------------------------------------------------------------ *
 * C1 — blue operational page header
 * ------------------------------------------------------------------ */

export function PageHeader({
  moduleLabel,
  crumbs,
  title,
  meta,
  recordKey,
  recordDate,
  statusChip,
  actions,
  tabs,
}: {
  moduleLabel: string;
  crumbs: Crumb[];
  title: string;
  meta?: ReactNode;
  recordKey?: string;
  recordDate?: string;
  statusChip?: ReactNode;
  actions?: ReactNode;
  tabs?: ReactNode;
}) {
  return (
    <header className="phead on-brand">
      <div className="phead__inner">
        <div className="phead__main">
          <p className="phead__module">{moduleLabel}</p>
          <Breadcrumbs items={crumbs} />
          <div className="phead__titleline">
            <h1 className="phead__title">{title}</h1>
            {statusChip}
          </div>
          {meta ? <p className="phead__meta">{meta}</p> : null}
        </div>
        <div className="phead__side">
          {recordKey ? <p className="phead__key">{recordKey}</p> : null}
          {recordDate ? <p className="phead__date">{recordDate}</p> : null}
          {actions ? <div className="phead__actions">{actions}</div> : null}
        </div>
      </div>
      {tabs}
    </header>
  );
}

/* ------------------------------------------------------------------ *
 * C2 — action bar with labelled actions and a "More actions" menu
 * (CTRM anti-pattern A1: never icon-only, never unlabelled)
 * ------------------------------------------------------------------ */

export interface Action {
  label: string;
  onClick?: () => void;
  to?: string;
  disabled?: boolean;
  disabledReason?: string;
  tone?: "primary" | "default" | "danger";
}

export function ActionBar({ primary = [], more = [] }: { primary?: Action[]; more?: Action[] }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="actionbar" ref={wrapRef}>
      {primary.map((a) =>
        a.to ? (
          <Link key={a.label} to={a.to} className="btn btn--on-brand">
            {a.label}
          </Link>
        ) : (
          <button
            key={a.label}
            type="button"
            className={`btn ${a.tone === "primary" ? "btn--primary" : "btn--on-brand"}`}
            onClick={a.onClick}
            disabled={a.disabled}
            title={a.disabled ? a.disabledReason : undefined}
          >
            {a.label}
          </button>
        ),
      )}
      {more.length > 0 ? (
        <div className="actionbar__menu">
          <button
            type="button"
            className="btn btn--on-brand"
            aria-expanded={open}
            aria-haspopup="true"
            onClick={() => setOpen((o) => !o)}
          >
            More actions ▾
          </button>
          {open ? (
            <ul className="menu" role="menu">
              {more.map((a) => (
                <li key={a.label} role="none">
                  {a.to ? (
                    <Link role="menuitem" to={a.to} onClick={() => setOpen(false)}>
                      {a.label}
                    </Link>
                  ) : (
                    <button
                      role="menuitem"
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        a.onClick?.();
                      }}
                      disabled={a.disabled}
                      title={a.disabled ? a.disabledReason : undefined}
                    >
                      {a.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * C3 — record tabs (each tab is its own route, so it is deep-linkable)
 * ------------------------------------------------------------------ */

export interface TabDef {
  key: string;
  label: string;
  to: string;
  badge?: ReactNode;
}

export function RecordTabs({ tabs }: { tabs: TabDef[] }) {
  return (
    <nav className="rtabs" aria-label="Record sections">
      <ul>
        {tabs.map((t) => (
          <li key={t.key}>
            <NavLink to={t.to} end className={({ isActive }) => (isActive ? "rtab rtab--active" : "rtab")}>
              <span>{t.label}</span>
              {t.badge ? <span className="rtab__badge">{t.badge}</span> : null}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ------------------------------------------------------------------ *
 * C6 — summary card
 * ------------------------------------------------------------------ */

export function SummaryCard({
  title,
  children,
  footer,
  tone,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  tone?: StatusTone;
}) {
  return (
    <section className={`scard ${tone ? `scard--${tone}` : ""}`}>
      <h3 className="scard__title">{title}</h3>
      <div className="scard__body">{children}</div>
      {footer ? <div className="scard__foot">{footer}</div> : null}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * C6 — quantity donut. The number is always in text as well.
 * ------------------------------------------------------------------ */

export function QuantityDonut({
  fraction,
  valueLabel,
  ofLabel,
  caption,
  tone = "accent",
}: {
  fraction: number;
  valueLabel: string;
  ofLabel: string;
  caption: string;
  tone?: "accent" | "ok" | "warn";
}) {
  const pct = Math.max(0, Math.min(1, fraction));
  const size = 108;
  const stroke = 11;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const colour =
    tone === "ok" ? "var(--c-ok-700)" : tone === "warn" ? "var(--c-warn-700)" : "var(--c-accent-600)";
  return (
    <div className="donut">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${caption}: ${valueLabel} of ${ofLabel}, ${Math.round(pct * 100)} per cent`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--c-ink-100)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colour}
          strokeWidth={stroke}
          strokeDasharray={`${circ * pct} ${circ}`}
          strokeLinecap="butt"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="47%" textAnchor="middle" className="donut__pct">
          {Math.round(pct * 100)}%
        </text>
        <text x="50%" y="64%" textAnchor="middle" className="donut__sub">
          {valueLabel}
        </text>
      </svg>
      <p className="donut__caption">
        <strong>{valueLabel}</strong> of {ofLabel}
        <br />
        <span className="muted small">{caption}</span>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * C7 — route visual, with every icon labelled in text
 * ------------------------------------------------------------------ */

export interface RouteNode {
  label: string;
  sub?: string;
  glyph: string;
  reached: boolean;
}

export function RouteVisual({
  nodes,
  ariaLabel,
  leftCaption,
  rightCaption,
}: {
  nodes: RouteNode[];
  ariaLabel: string;
  leftCaption?: { label: string; value: string };
  rightCaption?: { label: string; value: string };
}) {
  return (
    <div className="route" role="img" aria-label={ariaLabel}>
      {leftCaption || rightCaption ? (
        <div className="route__captions">
          <span>
            {leftCaption ? (
              <>
                <span className="muted xsmall">{leftCaption.label}</span>
                <br />
                <strong className="small">{leftCaption.value}</strong>
              </>
            ) : null}
          </span>
          <span className="text-right">
            {rightCaption ? (
              <>
                <span className="muted xsmall">{rightCaption.label}</span>
                <br />
                <strong className="small">{rightCaption.value}</strong>
              </>
            ) : null}
          </span>
        </div>
      ) : null}
      <ol className="route__nodes">
        {nodes.map((n, i) => (
          <li
            key={`${n.label}-${i}`}
            className={n.reached ? "route__node route__node--reached" : "route__node"}
          >
            <span className="route__glyph" aria-hidden="true">
              {n.glyph}
            </span>
            <span className="route__label">{n.label}</span>
            {n.sub ? <span className="route__sub">{n.sub}</span> : null}
            {i < nodes.length - 1 ? <span className="route__link" aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * C9 — collapsible section with a completion indicator
 * ------------------------------------------------------------------ */

export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  indicator,
  actions,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  indicator?: ReactNode;
  actions?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="csec card">
      <h3 className="csec__head">
        <button
          type="button"
          className="csec__toggle"
          aria-expanded={open}
          aria-controls={`csec-${id}`}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="csec__chev" aria-hidden="true">
            {open ? "▾" : "▸"}
          </span>
          <span className="csec__title">{title}</span>
        </button>
        <span className="csec__right">
          {indicator}
          {actions}
        </span>
      </h3>
      <div id={`csec-${id}`} className="csec__body" hidden={!open}>
        {children}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * C10 — Label : Value read layout, with the `inherited` marker preserved
 * from the legacy pale-green convention (§4.4.1)
 * ------------------------------------------------------------------ */

const BEHAVIOUR_NOTE: Partial<Record<FieldBehaviour, string>> = {
  inherited: "inherited",
  calculated: "calculated",
  readonly: "read-only",
  required: "required",
};

export interface Field {
  label: string;
  value: ReactNode;
  behaviour?: FieldBehaviour;
  hint?: string;
}

export function FieldGrid({ fields, columns = 3 }: { fields: Field[]; columns?: 1 | 2 | 3 }) {
  return (
    <dl className={`fgrid fgrid--${columns}`}>
      {fields.map((f, i) => (
        <div
          className={`fgrid__item ${f.behaviour ? `fgrid__item--${f.behaviour}` : ""}`}
          key={`${f.label}-${i}`}
        >
          <dt className="fgrid__label">
            {f.label}
            {f.behaviour && BEHAVIOUR_NOTE[f.behaviour] ? (
              <span className="fgrid__badge">{BEHAVIOUR_NOTE[f.behaviour]}</span>
            ) : null}
          </dt>
          <dd className="fgrid__value">
            {f.value === undefined || f.value === null || f.value === "" ? (
              <span className="muted">–</span>
            ) : (
              f.value
            )}
            {f.hint ? <span className="fgrid__hint">{f.hint}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------ *
 * C11 — full-width emphasis banner for a headline total
 * ------------------------------------------------------------------ */

export function TotalBanner({
  label,
  value,
  derivation,
}: {
  label: string;
  value: string;
  derivation?: string;
}) {
  return (
    <div className="totalbanner" aria-live="polite">
      <span className="totalbanner__label">
        {label}
        {derivation ? <span className="totalbanner__derivation">{derivation}</span> : null}
      </span>
      <strong className="totalbanner__value">{value}</strong>
    </div>
  );
}
