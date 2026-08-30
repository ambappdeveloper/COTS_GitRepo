/**
 * S05's country table, completed from the configuration that owns the question — v1.5.
 *
 * `vite.config.ts` redirects the resolved module `<shared>/mockData/s05.ts` here. Everything in that
 * file is re-exported untouched; one export is replaced.
 *
 * THE DEFECT
 * ----------
 * `pages/S05/ServiceRequestAndShunting.tsx` opens with
 *
 *     const cm = COUNTRY_MODELS.find((c) => c.country === country)!;
 *     …
 *     if (!cm.usesServiceRequest) { … }
 *
 * a non-null assertion over a three-row table. Standalone that holds, because the Shared prototype's
 * own country selector offers Sudan, Chad and Ethiopia and nothing else. Integrated, the country
 * comes from the Core session — Sudan, Ethiopia, Tanzania, Mozambique — so `find` returned undefined
 * and the screen threw `Cannot read properties of undefined (reading 'usesServiceRequest')`, taking
 * the React root down with it: a white page, and every screen visited afterwards blank until reload.
 *
 * That was the last thing standing between the country switch and "it works for any country".
 *
 * THE FIX, AND WHY IT INVENTS NOTHING
 * -----------------------------------
 * The missing rows are **not written here**. Core's `COUNTRY_CONTEXT` already answers the only
 * question this screen asks — it lists, per country, the process steps that are configured off, and
 * `'Logistics service request'` is one of the names it uses. Two independent checks say it is the
 * right source:
 *
 *   · **It agrees with the Shared table everywhere the two overlap.** Sudan: Core lists nothing as
 *     not-applicable and Shared says the service request is used. Ethiopia: Core lists it as not
 *     applicable and Shared says it is not used. Two of two.
 *   · **It agrees with the rest of Core.** `mockData/c10.ts` carries the same fact a second way, as
 *     the step-applicability row `op-logistics-request`, documented "Sudan only"; and the Core header
 *     already tells the person switching country that the logistics service request is hidden in the
 *     country they are switching to. The integrated mockup was showing that sentence in the switch
 *     dialog and then throwing on the screen it describes.
 *
 * So Shared's own three rows are kept exactly as Shared wrote them — its prose is its own — and a row
 * is derived only for a country Shared has no row for and Core does have configuration for.
 *
 * WHAT IS LEFT UNANSWERED, DELIBERATELY
 * -------------------------------------
 * A derived row answers `usesServiceRequest` and nothing else:
 *
 *   · `model` — the sentence the screen prints after "Not applicable for Tanzania." — states the
 *     derivation and says the arrangement is unrecorded. It does not describe how transport is
 *     arranged, because neither prototype says, and a plausible sentence there would be an invented
 *     country rule presented as fact.
 *   · `modes` is empty, for the same reason. It is read only on a movement record's own country, and
 *     movements exist only for seeded countries, so no screen renders an empty list from this.
 *
 * A country in neither table still throws, and `SharedPageFrame`'s error boundary reports it by name.
 * That is intended: an unanswerable question should reach the reviewer as a question.
 *
 * **Business confirmation required.** Whether Tanzania and Mozambique are in scope for S05, and
 * whether Chad — which Shared has and Core does not — should be in the Core country list, are
 * business questions. Nothing here answers either; this only stops one screen asserting a fact it
 * does not have, or crashing.
 */

import type { CountryModel } from '@shared/mockData/s05';
import { COUNTRY_MODELS as SHARED_COUNTRY_MODELS } from '@shared/mockData/s05';
import { configuredCountries, stepApplies, COUNTRY_CONFIG_SOURCE } from './countryConfig';

/* Everything else in the module is Shared's, unchanged. An explicit export below wins over this. */
export * from '@shared/mockData/s05';

/** The C10 step name for the thing this screen is gated on. Spelled as Core spells it. */
const LOGISTICS_SERVICE_REQUEST = 'Logistics service request';

/**
 * A row for a country the Shared prototype has none for, derived from the Core configuration.
 *
 * Returns null where Core cannot answer either, so the caller adds nothing rather than guessing.
 */
function derive(country: string): CountryModel | null {
  const applies = stepApplies(country, LOGISTICS_SERVICE_REQUEST);
  if (applies === undefined) return null;

  const derivation = `Derived from the country configuration (${COUNTRY_CONFIG_SOURCE}), which ${
    applies ? 'does not list' : 'lists'
  } the logistics service request among the steps configured off in ${country}.`;

  return {
    country,
    usesServiceRequest: applies,
    /* Printed on screen after "Not applicable for {country}." — a derivation and an open question. */
    model: `${derivation} How transportation is arranged in ${country} is not recorded in the Shared or Core prototypes — business confirmation required.`,
    modes: [],
  };
}

/**
 * Shared's rows first and unaltered, then a derived row for each configured country it does not
 * cover. Order matters only in that `find` takes the first match, so Shared always wins.
 */
export const COUNTRY_MODELS: CountryModel[] = [
  ...SHARED_COUNTRY_MODELS,
  ...configuredCountries()
    .filter((c) => !SHARED_COUNTRY_MODELS.some((m) => m.country === c))
    .map(derive)
    .filter((m): m is CountryModel => m !== null),
];

/** The countries whose row was derived rather than authored — for the delivery note and the walker. */
export const DERIVED_COUNTRY_MODELS: string[] = COUNTRY_MODELS.filter(
  (m) => !SHARED_COUNTRY_MODELS.some((s) => s.country === m.country),
).map((m) => m.country);
