/**
 * "You are looking at another country's record."
 *
 * WHY THIS EXISTS
 * ---------------
 * From 9 September 2026 every list in this module is filtered to the country the session
 * is working in, so a Tanzanian session sees Tanzanian contracts and nothing else. The
 * `get*` readers are deliberately **not** filtered: a link to a record is a link, and one
 * that answers "not found" because the reader happens to be in another country teaches
 * people that COTS links cannot be shared. So the record opens — and says so.
 *
 * That leaves exactly one way to be looking at an out-of-scope record: someone followed a
 * link, or kept a tab open and switched country in the header. Both are ordinary. What
 * would not be ordinary is the screen staying silent about it, because every other number
 * on the page — the lists it links to, the counters, the inbox — is filtered to the other
 * country, and the reader has no way to know which of the two they are reading.
 *
 * WHY IT DOES NOT OFFER TO SWITCH
 * -------------------------------
 * The country is a property of the session, set on the Core header from the countries the
 * account is scoped to (C1 / WF-C1-03). This module reads it and does not write it — a
 * screen that could quietly re-scope the whole session from a record it happened to open
 * is the defect `CountrySync` was written to remove. The notice says where to change it.
 */

import { Banner } from "./feedback";
import { countryName } from "../domain/variants";
import { activeCountryScope } from "../services/store";
import type { CountryUnit } from "../domain/types";

/**
 * The one-line statement of what the screen is scoped to.
 *
 * WHY IT IS IN THE SHELL AND NOT ON EACH LIST
 * -------------------------------------------
 * Every list in the module is filtered, so every screen needs to say so — and a sentence
 * added to one list at a time is a sentence the next list is missing, which leaves a
 * reviewer unable to tell a filtered empty screen from an empty data set. Rendering it
 * once in the frame that wraps every Export screen — `Shell` standalone, `ExportPageFrame`
 * in the merged application — covers the ones that exist and the ones added later.
 *
 * It renders nothing when there is no scope. An unscoped session is showing everything,
 * and a line saying "not filtered" on every screen is noise.
 */
export function CountryScopeLine() {
  const scope = activeCountryScope();
  if (!scope) return null;
  return (
    <p className="small muted" data-testid="country-scope-line">
      Scoped to <strong>{countryName(scope)}</strong> — every list, counter and task on the Export
      screens shows {countryName(scope)} records only. The country comes from the session; change it
      in the header.
    </p>
  );
}

export function CountryScopeNotice({
  recordCountry,
  what,
}: {
  /** The country the record on screen belongs to. */
  recordCountry: CountryUnit | undefined;
  /** How to name the record in the sentence — "contract PC-2044", "shipment PC-2041.1". */
  what: string;
}) {
  const scope = activeCountryScope();
  if (!scope || !recordCountry || recordCountry === scope) return null;

  return (
    <Banner tone="warn" title={`This is a ${countryName(recordCountry)} record and you are working in ${countryName(scope)}`}>
      <p>
        {what} belongs to {countryName(recordCountry)}. It has opened because a link to a record
        works whoever follows it, but every list, counter and task on the other screens is
        filtered to {countryName(scope)}, so this record does not appear in them.
      </p>
      <p>
        To work in {countryName(recordCountry)}, change the active country in the header. The
        countries offered there are the ones your account is scoped to; if{" "}
        {countryName(recordCountry)} is not among them, it is not in your access and an
        administrator grants it (C1 / WF-C1-03).
      </p>
    </Banner>
  );
}
