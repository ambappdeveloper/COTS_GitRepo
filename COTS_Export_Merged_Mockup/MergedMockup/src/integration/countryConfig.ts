/**
 * The country configuration, read from the module that owns it — v1.5.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Three prototypes each know something about countries, and they know different amounts:
 *
 *   · **Core** holds `COUNTRY_CONTEXT` (C10 / WF-C10-01 Step 3) — for each country its currency,
 *     calendar, language, season window and, the part that matters here, `stepsNotApplicable`: the
 *     process steps that are configured off in that country. Four countries.
 *   · **Shared** holds a three-row `COUNTRY_MODELS` table inside S05, describing how transport is
 *     arranged and whether the logistics service request is used. Three countries, one of which
 *     (Chad) Core does not have.
 *   · **Export** reads country from the session and does not hold a table of its own.
 *
 * Standalone, each prototype's country selector offers exactly the countries its own table covers, so
 * none of them can be asked a question it cannot answer. Integrated, the country comes from the Core
 * session and is put to all three — and a module whose table is shorter than Core's is asked about a
 * country it has never heard of.
 *
 * The integrated mockup's answer is not to widen every table by hand. It is that **C10 owns country
 * configuration**, so a module that lacks a fact about a country should get it from C10 rather than
 * from a second copy. That is what this file does, and it is the same principle as the one behind
 * `CountrySync`: one country, held in one place, read by everyone.
 *
 * WHAT THIS FILE DOES NOT DO
 * --------------------------
 * It states no rule that is not already stated in Core's configuration. Where Core is silent this
 * returns `undefined` and the caller has to say so rather than choose — see `SharedCountryModels.ts`
 * for what that looks like on a screen. Nothing here decides whether a country is in scope, and
 * nothing here writes: the Core configuration screens remain the only place a country is configured.
 */

import { COUNTRY_CONTEXT } from '@core/mockData/c2';

/** Where the applicability answers come from, for a trace note on a screen. */
export const COUNTRY_CONFIG_SOURCE = 'C10 / WF-C10-01 Step 3 — process step applicability, per country';

/** Every country the Core configuration knows, in its own order. */
export function configuredCountries(): string[] {
  return Object.keys(COUNTRY_CONTEXT);
}

/** True when the Core configuration holds a country at all. */
export function isConfiguredCountry(country: string): boolean {
  return Object.prototype.hasOwnProperty.call(COUNTRY_CONTEXT, country);
}

/**
 * Whether a named process step applies in a country, according to the Core configuration.
 *
 * `undefined` means the configuration does not cover the country — not that the step applies. A
 * caller must not read the absence of a prohibition as a permission; it has to report that the
 * question is unanswered.
 *
 * The step name is the one C10 uses (`'Logistics service request'`, `'Ex-form'`, `'Ex-contract'`).
 * Matching is case-insensitive and trims, because these are configuration labels typed by hand in
 * two prototypes rather than a shared enumeration — which is itself worth confirming.
 */
export function stepApplies(country: string, step: string): boolean | undefined {
  const ctx = COUNTRY_CONTEXT[country];
  if (!ctx) return undefined;
  const wanted = step.trim().toLowerCase();
  return !ctx.stepsNotApplicable.some((s) => s.trim().toLowerCase() === wanted);
}

/** The steps configured off in a country, for stating a derivation on screen. Empty where unknown. */
export function stepsNotApplicable(country: string): string[] {
  return COUNTRY_CONTEXT[country]?.stepsNotApplicable ?? [];
}
