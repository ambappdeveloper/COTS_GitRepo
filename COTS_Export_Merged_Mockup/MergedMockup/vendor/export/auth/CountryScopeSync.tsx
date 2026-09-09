/**
 * The session's country becomes the scope every list is filtered to.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Instruction of 9 September 2026: *"Export should connect to the country in the header.
 * If country is Tanzania, the user should view only Tanzania contracts; when they switch
 * country the contract list should update. This should apply to any screen affected by
 * country."*
 *
 * Two halves were already built and were not joined up. The session has carried an
 * operating country since 3 September — `AppUser.country`, set from Core's `activeCountry`
 * by the integration layer, and resolved either way by `activeCountryOf`. And the service
 * layer now filters every list to one country. This component is the wire between them,
 * and it is the only place the two meet.
 *
 * WHY IT IS ONE COMPONENT AND NOT TWO
 * -----------------------------------
 * This module runs two ways. Standalone, `useAuth` is this folder's own `AuthContext` and
 * the country comes from the demo account. Inside the merged application, `vite.config.ts`
 * substitutes `ExportAuthBridge`, and the country comes from the header — the same header
 * the reviewer switches. Both give a `user`, both go through `activeCountryOf`, so one
 * component mounted in each host does for both, and neither host holds a copy of the rule.
 *
 * WHY AN UNRESOLVED COUNTRY CLEARS THE SCOPE RATHER THAN DEFAULTING
 * -----------------------------------------------------------------
 * `activeCountryOf` returns `resolved: false` where neither the session nor the account
 * named a country, and falls back to the first configured one. Scoping to a fallback would
 * hide four countries' records behind a country nobody chose, and an empty screen would be
 * indistinguishable from there being nothing to show. Unscoped is the honest state: every
 * record is visible and the screens say the country is not set.
 *
 * The scope is also cleared on unmount, so a signed-out session does not leave the last
 * user's country filtering the next one's screens.
 */

import { useEffect, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { activeCountryOf } from "../domain/variants";
import { setCountryScope } from "../services/store";

export function CountryScopeSync({ children }: { children?: ReactNode }) {
  const { user, ready } = useAuth();
  const active = activeCountryOf(user);
  /* Only a country the session actually names. See the note above on the fallback. */
  const code = ready && active.resolved ? active.code : null;

  useEffect(() => {
    setCountryScope(code);
    return () => setCountryScope(null);
  }, [code]);

  return <>{children}</>;
}
