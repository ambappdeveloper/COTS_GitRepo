/**
 * Springboard home (v1.1) — replaces the v1.0 "land on the dashboard" behaviour.
 *
 * Left: who is signed in, the period selector and the workload counters.
 * Right: icon tiles grouped by process band. A tile with sub-views carries a "More" control
 * that expands a cluster of sub-tiles in place, pushing the following tiles down, which is
 * the interaction the reference application uses.
 *
 * Accessibility notes, since a tile grid is easy to get wrong:
 *  - the grid is a list of links, so screen readers announce "list, 11 items", and each tile
 *    is a single link with a visible text label — never an icon alone;
 *  - the expand control is a separate button with aria-expanded / aria-controls, so the tile
 *    itself stays a plain link and Enter still navigates;
 *  - one cluster is open at a time; Escape closes it and returns focus to its button;
 *  - band names are real headings (h2), so heading navigation works.
 */

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { EmptyState, ErrorState, SkeletonRows } from "../components/feedback";
import { TODAY, formatDate } from "../domain/calc";
import { ROLE_LABEL } from "../domain/types";
import { Icon } from "../nav/Icon";
import { BANDS, MODULES, type ModuleTile } from "../nav/modules";
import { availableYears, homeCounters, monthName, periodFromIso, type Period } from "../nav/home-counters";
import { api } from "../services/store";
import { useAsync } from "./hooks";
import "./home.css";

export function HomePage() {
  const { user } = useAuth();
  const shipments = useAsync(() => api.listShipments());
  const risks = useAsync(() => api.listRisks());
  const [period, setPeriod] = useState<Period>(() => periodFromIso(TODAY));
  const [openCluster, setOpenCluster] = useState<string | null>(null);

  // Memoised on the fetched array itself: a fresh `?? []` each render would re-run every
  // counter calculation on any state change, including opening a tile cluster.
  const ships = useMemo(() => shipments.data ?? [], [shipments.data]);
  const counters = useMemo(() => homeCounters(ships, risks.data ?? [], period), [ships, risks.data, period]);
  const years = useMemo(() => availableYears(ships), [ships]);

  const initials = (user?.displayName ?? "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="home">
      <aside className="home__panel" aria-labelledby="home-panel-title">
        <div className="home__user">
          <div className="home__avatar" aria-hidden="true">
            {initials || "—"}
          </div>
          <h2 className="home__name" id="home-panel-title">
            {user?.displayName ?? "Not signed in"}
          </h2>
          <p className="home__role">{user ? `${ROLE_LABEL[user.role]} · ${user.unit}` : ""}</p>
        </div>

        <div className="home__period">
          <label className="home__periodfield">
            <span className="sr-only">Year</span>
            <select
              value={period.year}
              onChange={(e) => setPeriod((p) => ({ ...p, year: Number(e.target.value) }))}
              aria-label="Year"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="home__periodfield">
            <span className="sr-only">Month</span>
            <select
              value={period.month}
              onChange={(e) => setPeriod((p) => ({ ...p, month: Number(e.target.value) }))}
              aria-label="Month"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {monthName(m)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {shipments.error ? (
          <div className="home__counterserror">
            <ErrorState detail={shipments.error} onRetry={shipments.reload} />
          </div>
        ) : shipments.loading ? (
          <div className="home__counters">
            <SkeletonRows rows={5} cols={2} />
          </div>
        ) : (
          <ul className="home__counters">
            {counters.map((c) => (
              <li key={c.key}>
                <Link className="home__counter" to={c.to} title={c.hint}>
                  <span className="home__count">{c.count}</span>
                  <span className="home__counterlabel">{c.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="home__asat">
          Demo data as at <strong>{formatDate(TODAY)}</strong>. Late, today and seven days are measured
          against that date; <em>Due in {monthName(period.month)}</em> follows the selector above.
        </p>
      </aside>

      <div className="home__board">
        <div className="home__boardhead">
          <h1 className="home__title">Export operations</h1>
          <p className="home__sub">
            Choose a module. Tiles marked{" "}
            <span className="home__moredot" aria-hidden="true">
              •••
            </span>{" "}
            <span className="nowrap">open sub-views in place.</span>
          </p>
        </div>

        {/* One grid for every tile, with band headings spanning the row, so rows fill up
            instead of each band starting a short row of its own. */}
        <div className="sb__grid">
          {BANDS.map((band) => {
            const tiles = MODULES.filter((m) => m.band === band);
            if (!tiles.length) return null;
            return (
              <Fragment key={band}>
                <h2 className="sb__band" id={`band-${slug(band)}`}>
                  {band}
                </h2>
                {tiles.map((tile) => (
                  <Tile
                    key={tile.id}
                    tile={tile}
                    open={openCluster === tile.id}
                    onToggle={() => setOpenCluster((cur) => (cur === tile.id ? null : tile.id))}
                    onClose={() => setOpenCluster(null)}
                  />
                ))}
              </Fragment>
            );
          })}
        </div>

        {MODULES.length === 0 ? <EmptyState title="No modules are configured" /> : null}
      </div>
    </div>
  );
}

function Tile({
  tile,
  open,
  onToggle,
  onClose,
}: {
  tile: ModuleTile;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const clusterRef = useRef<HTMLDivElement>(null);
  const hasChildren = !!tile.children?.length;
  const clusterId = `cluster-${tile.id}`;

  // Escape closes the cluster and puts focus back where it came from.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        btnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div className={`sb__cell ${open ? "sb__cell--open" : ""}`}>
        <Link className="sb__tile" to={tile.to} title={tile.hint}>
          <span className="sb__icon">
            <Icon name={tile.icon} />
          </span>
          <span className="sb__label">{tile.label}</span>
        </Link>
        {hasChildren ? (
          <button
            type="button"
            ref={btnRef}
            className="sb__more"
            aria-expanded={open}
            aria-controls={clusterId}
            onClick={onToggle}
          >
            <span aria-hidden="true">•••</span>
            <span className="sr-only">
              {open ? "Hide" : "Show"} {tile.label} sub-views
            </span>
          </button>
        ) : null}
      </div>

      {hasChildren && open ? (
        <div className="sb__cluster" id={clusterId} ref={clusterRef}>
          <p className="sb__clustertitle">{tile.label} — sub-views</p>
          <ul className="sb__clustergrid" aria-label={`${tile.label} sub-views`}>
            {tile.children!.map((c) => (
              <li key={c.to + c.label}>
                <Link className="sb__subtile" to={c.to} title={c.hint}>
                  <span className="sb__subicon">
                    <Icon name={c.icon} size={20} />
                  </span>
                  <span className="sb__sublabel">{c.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
