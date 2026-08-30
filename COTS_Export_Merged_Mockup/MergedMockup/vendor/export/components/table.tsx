/**
 * C8 — dense operational list with search, filters, saved views, a column chooser
 * and a responsive stacked-card fallback below the tablet breakpoint.
 *
 * Real <table> semantics: <th scope="col">, sortable headers as buttons with
 * aria-sort, and a caption. Row actions are keyboard reachable (never hover-only).
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { EmptyState, SkeletonRows } from "./feedback";
import "./table.css";

export interface Column<T> {
  key: string;
  header: string;
  /** Rendered cell content. */
  cell: (row: T) => ReactNode;
  /** Plain value used for sorting, filtering and the stacked card view. */
  sortValue?: (row: T) => string | number;
  /** Optional filter options; when present a select filter is rendered. */
  filterOptions?: { value: string; label: string }[];
  filterMatch?: (row: T, value: string) => boolean;
  /** Columns marked optional can be switched off in the column chooser. */
  optional?: boolean;
  align?: "left" | "right";
  width?: string;
}

export interface SavedView<T> {
  key: string;
  label: string;
  description?: string;
  columns?: string[];
  predicate?: (row: T) => boolean;
}

export function DataTable<T extends { id: string }>({
  caption,
  rows,
  columns,
  loading,
  searchPlaceholder = "Search…",
  searchValue: searchValueOf,
  rowHref,
  savedViews = [],
  emptyTitle = "Nothing to show",
  emptyBody,
  emptyAction,
  toolbarExtra,
}: {
  caption: string;
  rows: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchPlaceholder?: string;
  searchValue: (row: T) => string;
  rowHref?: (row: T) => string;
  savedViews?: SavedView<T>[];
  emptyTitle?: string;
  emptyBody?: ReactNode;
  emptyAction?: ReactNode;
  toolbarExtra?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [view, setView] = useState<string>(savedViews[0]?.key ?? "all");
  const [hidden, setHidden] = useState<string[]>([]);
  const [chooserOpen, setChooserOpen] = useState(false);

  const activeView = savedViews.find((v) => v.key === view);

  // A saved view may prescribe a column set.
  useEffect(() => {
    if (activeView?.columns) {
      setHidden(columns.filter((c) => !activeView.columns!.includes(c.key)).map((c) => c.key));
    }
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleColumns = columns.filter((c) => !hidden.includes(c.key));

  const processed = useMemo(() => {
    let out = rows;
    if (activeView?.predicate) out = out.filter(activeView.predicate);
    const q = query.trim().toLowerCase();
    if (q) out = out.filter((r) => searchValueOf(r).toLowerCase().includes(q));
    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue;
      const col = columns.find((c) => c.key === key);
      if (!col) continue;
      out = out.filter((r) =>
        col.filterMatch ? col.filterMatch(r, value) : String(col.sortValue?.(r) ?? "") === value,
      );
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        out = [...out].sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          const cmp =
            typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, query, filters, sort, columns, searchValueOf, activeView]);

  const filterable = columns.filter((c) => c.filterOptions && !hidden.includes(c.key));
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="dtable">
      <div className="dtable__toolbar">
        <div className="dtable__search">
          <label className="sr-only" htmlFor={`q-${caption}`}>
            {searchPlaceholder}
          </label>
          <input
            id={`q-${caption}`}
            type="search"
            className="input"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {savedViews.length > 0 ? (
          <div className="dtable__views">
            <label className="sr-only" htmlFor={`v-${caption}`}>
              Saved view
            </label>
            <select
              id={`v-${caption}`}
              className="input"
              value={view}
              onChange={(e) => setView(e.target.value)}
            >
              {savedViews.map((v) => (
                <option key={v.key} value={v.key}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {filterable.map((c) => (
          <div className="dtable__filter" key={c.key}>
            <label className="sr-only" htmlFor={`f-${caption}-${c.key}`}>
              Filter by {c.header}
            </label>
            <select
              id={`f-${caption}-${c.key}`}
              className="input"
              value={filters[c.key] ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))}
            >
              <option value="">All {c.header.toLowerCase()}</option>
              {c.filterOptions!.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {toolbarExtra}

        <div className="dtable__spacer" />

        {columns.some((c) => c.optional) ? (
          <div className="dtable__chooserwrap">
            <button
              type="button"
              className="btn btn--sm"
              aria-expanded={chooserOpen}
              onClick={() => setChooserOpen((o) => !o)}
            >
              Columns ({visibleColumns.length}/{columns.length})
            </button>
            {chooserOpen ? (
              <fieldset className="dtable__chooser">
                <legend>Show columns</legend>
                {columns.map((c) => (
                  <label key={c.key}>
                    <input
                      type="checkbox"
                      checked={!hidden.includes(c.key)}
                      disabled={!c.optional}
                      onChange={(e) =>
                        setHidden((h) => (e.target.checked ? h.filter((k) => k !== c.key) : [...h, c.key]))
                      }
                    />
                    {c.header}
                    {!c.optional ? <span className="muted xsmall"> (always shown)</span> : null}
                  </label>
                ))}
              </fieldset>
            ) : null}
          </div>
        ) : null}
      </div>

      {activeView?.description ? (
        <p className="dtable__viewdesc muted small">{activeView.description}</p>
      ) : null}

      <p className="dtable__count small muted" aria-live="polite">
        {loading
          ? "Loading…"
          : `${processed.length} of ${rows.length} record${rows.length === 1 ? "" : "s"}${
              activeFilterCount > 0 || query ? " after filtering" : ""
            }`}
      </p>

      {loading ? (
        <SkeletonRows rows={6} cols={Math.min(6, visibleColumns.length)} />
      ) : processed.length === 0 ? (
        <EmptyState title={emptyTitle} action={emptyAction}>
          {emptyBody ??
            (query || activeFilterCount > 0
              ? "No record matches the current search or filters. Clear them to see everything."
              : "There is nothing here yet.")}
        </EmptyState>
      ) : (
        <>
          {/* Desktop / tablet: real table semantics */}
          <div className="dtable__scroll">
            <table className="dtable__table">
              <caption className="sr-only">{caption}</caption>
              <thead>
                <tr>
                  {visibleColumns.map((c) => {
                    const sorted = sort?.key === c.key;
                    return (
                      <th
                        key={c.key}
                        scope="col"
                        style={{ width: c.width, textAlign: c.align ?? "left" }}
                        aria-sort={sorted ? (sort!.dir === "asc" ? "ascending" : "descending") : "none"}
                      >
                        {c.sortValue ? (
                          <button
                            type="button"
                            className="dtable__sort"
                            onClick={() =>
                              setSort((s) =>
                                s?.key === c.key
                                  ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" }
                                  : { key: c.key, dir: "asc" },
                              )
                            }
                          >
                            {c.header}
                            <span aria-hidden="true" className="dtable__sortglyph">
                              {sorted ? (sort!.dir === "asc" ? "▲" : "▼") : "⇅"}
                            </span>
                          </button>
                        ) : (
                          c.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {processed.map((r) => (
                  <tr key={r.id}>
                    {visibleColumns.map((c) => (
                      <td key={c.key} style={{ textAlign: c.align ?? "left" }}>
                        {c.cell(r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards with label/value pairs (CTRM anti-pattern A6) */}
          <ul className="dtable__cards">
            {processed.map((r) => {
              const href = rowHref?.(r);
              return (
                <li key={r.id} className="dtable__card">
                  {visibleColumns.map((c, i) => (
                    <div className="dtable__cardrow" key={c.key}>
                      <span className="dtable__cardlabel">{c.header}</span>
                      <span className="dtable__cardvalue">
                        {i === 0 && href ? <Link to={href}>{c.cell(r)}</Link> : c.cell(r)}
                      </span>
                    </div>
                  ))}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
