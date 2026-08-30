/**
 * The Export destinations — v1.4.
 *
 * WHAT THIS FILE USED TO BE, AND WHY MOST OF IT IS GONE
 * ----------------------------------------------------
 * From v1.1 to v1.3 this file answered one question: *where is the Export application, and how do I
 * build a URL into it?* Export was a separate build loaded in an iframe, so it needed a mode
 * (`bundled` / `separate`), a relative path to a portable HTML file, a `/@fs/` path for the dev
 * server, a hash-vs-clean-path rule, and a session handed between two origins.
 *
 * None of that exists any more. v1.4 imports the Export sources in place, exactly as Core and Shared
 * have always been imported, so an Export screen is a route in this application and its address is
 * just its address. The mode toggle, `exportUrl`, `exportBase`, `PORTABLE_RELATIVE`, `DEV_SERVER`
 * and `sameOrigin` are all deleted rather than deprecated: none of them can mean anything now.
 *
 * WHAT REMAINS
 * ------------
 * The destination list — the twenty-three phases and the screens that serve the whole process — and
 * the resolver that turns a key into one of them. That is still needed, because `/export/<key>` is
 * kept as a redirect so no link written against any earlier version dies.
 *
 * Everything below is derived from `exportProcess.ts`; nothing is restated.
 */

import {
  CROSS_CUTTING,
  EXPORT_PHASES,
  crossCuttingByKey,
  phaseByKey,
  type ExportPhase,
  type PhaseSection,
} from './exportProcess';

/** Which Export contribution this application compiles. Shown wherever the version is named. */
export const EXPORT_CONTRIBUTION = 'v2.4';

export interface ExportDestination {
  key: string;
  label: string;
  /** the route in this application — which is Export's own route, unchanged */
  path: string;
  /** the UI section, for grouping in a menu; the cross-cutting screens share one of their own */
  section: PhaseSection | 'Across the process';
  why: string;
  /** the phase this destination is, where it is one */
  phase?: ExportPhase;
}

const PHASE_DESTINATIONS: ExportDestination[] = EXPORT_PHASES.map((phase) => ({
  key: phase.key,
  label: `${String(phase.no).padStart(2, '0')} · ${phase.name}`,
  path: phase.path,
  section: phase.group,
  why: phase.why,
  phase,
}));

const CROSS_CUTTING_DESTINATIONS: ExportDestination[] = CROSS_CUTTING.map((screen) => ({
  key: screen.key,
  label: screen.label,
  path: screen.path,
  section: 'Across the process' as const,
  why: screen.why,
}));

/**
 * Every destination, in process order, then the screens that serve the whole process.
 *
 * Every `path` is a route in this application's own route table — which is the same rule as before,
 * now checkable directly rather than against another project's `App.tsx`. `walk.mjs` visits all of
 * them on every run.
 */
export const EXPORT_DESTINATIONS: ExportDestination[] = [...PHASE_DESTINATIONS, ...CROSS_CUTTING_DESTINATIONS];

/** The default destination — the Export springboard. */
const FALLBACK: ExportDestination =
  CROSS_CUTTING_DESTINATIONS.find((d) => d.key === 'home') ?? CROSS_CUTTING_DESTINATIONS[0];

/**
 * Resolve a `/export/<key>` key to a destination.
 *
 * Total by design, and it accepts three kinds of key: a phase key, a cross-cutting screen key, and
 * any of the fourteen v1.2 keys, which resolve through `legacyKey`. An unknown key gives the
 * springboard rather than an error, because a stale bookmark should land somewhere usable.
 */
export function destination(key: string): ExportDestination {
  const direct = EXPORT_DESTINATIONS.find((d) => d.key === key);
  if (direct) return direct;

  const phase = phaseByKey(key);
  if (phase) {
    const found = PHASE_DESTINATIONS.find((d) => d.key === phase.key);
    if (found) return found;
  }

  const cross = crossCuttingByKey(key);
  if (cross) {
    const found = CROSS_CUTTING_DESTINATIONS.find((d) => d.key === cross.key);
    if (found) return found;
  }

  return FALLBACK;
}

/** Whether a key resolves to something real, as against falling back to the springboard. */
export function isKnownDestination(key: string): boolean {
  return !!EXPORT_DESTINATIONS.find((d) => d.key === key) || !!phaseByKey(key) || !!crossCuttingByKey(key);
}

/**
 * The destinations grouped for a menu, in section order, with the cross-cutting screens last.
 *
 * The grouping is presentation only: within a group the phases stay in phase order, and no phase
 * moves between groups.
 */
export function groupedDestinations(): { section: string; items: ExportDestination[] }[] {
  const out: { section: string; items: ExportDestination[] }[] = [];
  for (const d of EXPORT_DESTINATIONS) {
    const last = out[out.length - 1];
    if (last && last.section === d.section) last.items.push(d);
    else out.push({ section: d.section, items: [d] });
  }
  return out;
}
