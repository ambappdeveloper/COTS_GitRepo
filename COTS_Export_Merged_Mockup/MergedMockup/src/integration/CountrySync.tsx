/**
 * One active country — v1.4.
 *
 * THE DEFECT THIS FIXES
 * ---------------------
 * Core and Shared each kept their own active country and never spoke to each other. The Core header
 * switched `activeCountry`; the Shared store's `country` stayed on the `useState('Sudan')` it was
 * initialised with. So a reviewer could switch the header to Ethiopia and find the Master Plan List
 * still headed *Sudan › Planning › Master Plan*, listing a Sudanese plan, under a panel captioned
 * "Master plans for the active country" — three statements about the country, two of them wrong.
 *
 * That is not a cosmetic mismatch. WF-INT-11 / Steps 3–4 make the Core session the thing that
 * establishes country scope for **all** module work; a module holding a second, private answer is
 * precisely the failure the integrated mockup exists to demonstrate the absence of.
 *
 * HOW IT IS FIXED, AND WHY THIS WAY
 * ---------------------------------
 * Core is the source of truth, and this component pushes its answer into the Shared store whenever
 * it changes. Shared's own `setCountry` is used, so its cascade still runs — it re-selects that
 * country's open season, which is what keeps the season chip and the plan lookup consistent.
 *
 * No Shared file is modified. This is a subscriber, not a patch.
 *
 * THE COUNTRY ALWAYS FOLLOWS THE SESSION — INCLUDING WHERE THERE IS NO DATA
 * ------------------------------------------------------------------------
 * The two prototypes were not seeded with the same countries:
 *
 *   · Core   — Sudan, Ethiopia, Tanzania, Mozambique
 *   · Shared — seeded for Sudan and Ethiopia (its own list also names Chad)
 *
 * An earlier draft of this file refused to push a country the Shared prototype had no records for,
 * on the theory that emptying every Shared screen was worse than a stale one. That was the wrong
 * call, and it made the country switch look broken: it worked between Sudan and Ethiopia and
 * silently did nothing anywhere else.
 *
 * **The country context is not conditional on there being data.** A country is the scope the session
 * is working in; whether records exist inside that scope is a different fact, and the right way to
 * say "there are none" is an empty screen, not another country's records. So the country is always
 * pushed, and `useCountryAlignment()` reports separately whether the Shared prototype holds any data
 * for it — which the page frame renders as a plain statement rather than a mismatch warning.
 *
 * A real system would answer this from configuration (C10 country parameters) and the empty screen
 * would mean "nothing recorded yet". Here it means "this prototype was seeded for two countries",
 * and the banner says so in those words rather than implying a defect.
 *
 * **Business confirmation required: the authoritative country list.** Whether Tanzania and
 * Mozambique are in scope for the Shared modules, and whether Chad is in scope for Core, is a
 * business question. Nothing here answers it — the screens simply follow the session and report what
 * they hold.
 */

import React from 'react';
import { useStore as useCoreStore } from '@core/store';
import { useStore as useSharedStore } from '@shared/state/store';
import { SEASONS } from '@shared/mockData/master';

/** The country the Shared modules are in, and whether this prototype holds anything for it. */
export interface CountryAlignment {
  /** the country the Core session is in */
  session: string;
  /** the country the Shared modules are showing — the same, always */
  shared: string;
  /** true when the two agree. False only for the instant between a switch and its effect. */
  aligned: boolean;
  /** false where the Shared prototype was never seeded with records for this country */
  seeded: boolean;
  /** what to tell the reviewer when `seeded` is false. Not a warning — a statement of fact. */
  noDataReason?: string;
}

const AlignmentContext = React.createContext<CountryAlignment | null>(null);

/**
 * Mirrors the Core session's country into the Shared store, and publishes whether it could.
 *
 * Placed inside both stores' providers, above the route table.
 */
export function CountrySync({ children }: { children: React.ReactNode }) {
  const { activeCountry } = useCoreStore();
  const shared = useSharedStore();
  const sharedCountry = shared.country;
  const setSharedCountry = shared.setCountry;
  const sharedSeasonId = shared.seasonId;
  const setSharedSeasonId = shared.setSeasonId;

  /**
   * Whether this prototype was seeded with anything for the country.
   *
   * Read from the seasons, because a season is what every Shared plan, sourcing and processing
   * screen hangs off — no season for a country means no records for it anywhere. It is a fact about
   * the demonstration data, not about whether the country is in scope.
   */
  const seeded = React.useMemo(
    () => SEASONS.some((s) => s.country === activeCountry),
    [activeCountry],
  );

  /* The country always follows the session. No condition. */
  React.useEffect(() => {
    if (sharedCountry === activeCountry) return;
    setSharedCountry(activeCountry);
  }, [activeCountry, sharedCountry, setSharedCountry]);

  /*
    v1.5 — and the season goes with it, including when there is none.

    Shared's own `setCountry` re-selects that country's open season *if it finds one*, and leaves the
    previous `seasonId` in place if it does not:

        setCountry: (c) => { setCountry(c); const s = SEASONS.find(…); if (s) setSeasonId(s.id); }

    Standalone that can never bite, because every country in Shared's own selector has a season. Here
    it meant that switching to a country with no seeded season left the session pointing at **the
    previous country's season** — and S01's landing screen reads it straight out:

        const season = SEASONS.find((s) => s.id === seasonId) ?? …
        <ReadOnlyField label="Season" value={season.label} />

    So the header said Tanzania and the season field said 01-Nov-2025 – 31-Aug-2026, which is Sudan's.
    That is the same defect this file was written to fix, one level down: two answers to one question,
    and the wrong one on screen.

    Clearing it is the honest state. A screen that cannot render without a season now says so through
    the frame's error boundary, naming the country — which is a question for the business, not a
    number quietly borrowed from the country next door.
  */
  React.useEffect(() => {
    if (seeded || sharedSeasonId === '') return;
    setSharedSeasonId('');
  }, [seeded, sharedSeasonId, setSharedSeasonId]);

  const seededCountries = React.useMemo(
    () => Array.from(new Set(SEASONS.map((s) => s.country))).sort(),
    [],
  );

  const value = React.useMemo<CountryAlignment>(
    () => ({
      session: activeCountry,
      shared: sharedCountry,
      aligned: sharedCountry === activeCountry,
      seeded,
      noDataReason: seeded
        ? undefined
        : `The Shared modules prototype was seeded for ${seededCountries.join(' and ')}, so it holds no records for ${activeCountry} — the screens below are correctly scoped to ${activeCountry} and empty, rather than showing another country's data. Business confirmation required: whether ${activeCountry} is in scope for the Shared modules.`,
    }),
    [activeCountry, sharedCountry, seeded, seededCountries],
  );

  return <AlignmentContext.Provider value={value}>{children}</AlignmentContext.Provider>;
}

/**
 * Whether the screen you are on is showing the session's country.
 *
 * Returns null outside the provider — the Core prototype standalone, for instance — so a caller can
 * render nothing rather than guess.
 */
export function useCountryAlignment(): CountryAlignment | null {
  return React.useContext(AlignmentContext);
}
