/**
 * The header's country scopes the Export module — v2.9.
 *
 * THE INSTRUCTION
 * ---------------
 * 9 September 2026: *"Export should connect to the country in the header. If country is
 * Tanzania, the user should view only Tanzania contracts; when they switch country the
 * contract list should update. This should apply to any screen affected by country."*
 *
 * THE DEFECT IT REMOVES
 * ---------------------
 * `CountrySync` made Core and the Shared modules agree about the active country in v1.4.
 * Export was left out, and it showed: the header could be switched to Tanzania while the
 * Contracts list still held every country's contracts and a Sudan contract still opened
 * with a Sudan-only price field on its review dialog. Three statements about the country
 * on one screen, two of them about a country the session was not in — which is exactly the
 * failure `CountrySync` was written to demonstrate the absence of, one module along.
 *
 * HOW IT WORKS
 * ------------
 * The Export module's service layer holds one country scope and filters every `list*`
 * accessor through it (`setCountryScope` in `@export/services/store`, with the derivation
 * table beside it). This component is a subscriber that pushes Core's `activeCountry` into
 * it — the same direction, and the same shape, as `CountrySync` and `MasterDataSync`. No
 * Export file is patched to make it work: the module scopes itself and this says which
 * country to scope to.
 *
 * The store notifies its subscribers on a scope change and Export's `useAsync` re-fetches
 * on a notification, so a switch in the header re-runs every list already on screen. That
 * is the "the contract list should update" half, and it needs no page code at all.
 *
 * WHY IT IS MOUNTED AT THE ROOT AND NOT IN THE EXPORT FRAME
 * ---------------------------------------------------------
 * Export data is read outside the Export screens. `useExportTasks` turns unanswered
 * shipment milestones into rows in the integrated Actions Inbox, and the inbox is a Core
 * route with no Export frame around it. Mounted inside `ExportPageFrame` the scope would
 * be set on an Export screen and cleared the moment the user navigated to the inbox, which
 * would show every country's tasks under a header naming one. Mounted here it holds for the
 * whole session, wherever Export data is read from.
 *
 * WHY THE COUNTRY IS MATCHED BY NAME
 * ----------------------------------
 * Core holds the active country as a display name — 'Sudan' — and Export as a two-letter
 * code. `countryUnitByName` is Export's own translation of one into the other and is used
 * rather than a second map here, so there is one place that decides what 'Sudan' means.
 *
 * A NAME EXPORT DOES NOT KNOW CLEARS THE SCOPE RATHER THAN KEEPING THE LAST ONE
 * -----------------------------------------------------------------------------
 * If Core were configured with a country the Export module has no profile for, the honest
 * answer is an unscoped Export — every record visible — and not the country the user was in
 * before they switched. A stale scope would say Tanzania in the header and show Sudan's
 * records, which is the defect itself. The Export screens then say the country is not set.
 *
 * All five of Core's countries resolve today; Chad was added to the Core configuration on
 * the same date precisely so that this cannot happen — see the note on `COUNTRY_CONTEXT`.
 */

import React from 'react';
import { useStore as useCoreStore } from '@core/store';
import { countryUnitByName } from '@export/domain/variants';
import { setCountryScope } from '@export/services/store';

export function ExportCountryScope({ children }: { children: React.ReactNode }) {
  const { activeCountry } = useCoreStore();
  const code = countryUnitByName(activeCountry) ?? null;

  React.useEffect(() => {
    setCountryScope(code);
  }, [code]);

  return <>{children}</>;
}
