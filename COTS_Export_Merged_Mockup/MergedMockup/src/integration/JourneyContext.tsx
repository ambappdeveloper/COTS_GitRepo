/**
 * The one piece of state the integrated layer owns: which business record the reviewer is working
 * on, and how far along the demonstration journey they are.
 *
 * It deliberately holds no business data. The Core store, the eleven Shared stores and the Export
 * application each keep their own state exactly as before; this context only carries the context
 * that has to survive a move from one module to another.
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { SPINE, type Owner } from './recordMap';
import { SPINE_ROUTE } from './journey';

interface JourneyApi {
  /** the record the reviewer is following */
  record: typeof SPINE;
  /** which module the current screen belongs to */
  area: Owner;
  /** index into SPINE_ROUTE of the furthest step reached */
  reached: number;
  markReached: (index: number) => void;
}

const Ctx = React.createContext<JourneyApi | null>(null);

export function areaForPath(pathname: string): Owner {
  if (pathname.startsWith('/export')) return 'export';
  if (/^\/s(0[1-9]|1[01])(\/|$)/.test(pathname)) return 'shared';
  if (pathname.startsWith('/stub')) return 'shared';
  if (
    /^\/c(1[0-2]|[1-9])(\/|$)/.test(pathname) ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/first-login') ||
    pathname.startsWith('/select-country') ||
    pathname.startsWith('/home')
  ) {
    return 'core';
  }
  return 'integration';
}

export function JourneyProvider({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const [reached, setReached] = React.useState(0);
  const area = areaForPath(loc.pathname);

  // Reaching a spine screen by any route — a link, the journey map, the address bar — advances the
  // journey, so the "next step" button is never out of step with where the reviewer actually is.
  React.useEffect(() => {
    const i = SPINE_ROUTE.findIndex((s) => s.to === loc.pathname);
    if (i >= 0) setReached((prev) => (i > prev ? i : prev));
  }, [loc.pathname]);

  const value = React.useMemo<JourneyApi>(
    () => ({ record: SPINE, area, reached, markReached: (i) => setReached((p) => (i > p ? i : p)) }),
    [area, reached],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useJourney(): JourneyApi {
  const c = React.useContext(Ctx);
  if (!c) throw new Error('JourneyProvider missing');
  return c;
}
