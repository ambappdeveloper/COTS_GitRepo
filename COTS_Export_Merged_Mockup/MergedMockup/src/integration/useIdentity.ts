/**
 * The signed-in identity, read from the Core session.
 *
 * This is the only place the integration layer reads the Core account, and it reads it as it is —
 * no Core file was changed to expose it. The module scope and the assignment roles below are the
 * ones already carried on the Core demonstration accounts.
 *
 * Module scope is taken from the account's **active assignments** where it has any, falling back to
 * the scope on the account record. That follows `WF-C1-03`: what a user may reach comes from the
 * assignment in force, and an assignment that has lapsed grants nothing.
 */

import React from 'react';
import { useStore as useCoreStore } from '@core/store';
import { clearExportSession, type CoreIdentity } from './session';

export interface Identity extends CoreIdentity {
  signedIn: boolean;
  activeCountry: string;
  countryScope: string[];
  /** module scope came from the assignments in force, not from the account record */
  fromAssignments: boolean;
}

export function useIdentity(): Identity {
  const { currentUser, activeCountry } = useCoreStore();

  return React.useMemo<Identity>(() => {
    if (!currentUser) {
      return {
        signedIn: false,
        name: '—',
        orgUnit: '—',
        moduleScope: [],
        roles: [],
        activeCountry,
        countryScope: [],
        fromAssignments: false,
      };
    }

    const active = (currentUser.assignments ?? []).filter((a) => a.status === 'Active');
    const fromAssignments = active.some((a) => (a.moduleScope ?? []).length > 0);
    const scope = fromAssignments
      ? Array.from(new Set(active.flatMap((a) => a.moduleScope ?? [])))
      : (currentUser.moduleScope ?? []);

    return {
      signedIn: true,
      name: currentUser.name,
      orgUnit: currentUser.orgUnit,
      moduleScope: scope,
      roles: active.map((a) => a.role),
      activeCountry,
      countryScope: currentUser.countryScope ?? [],
      fromAssignments,
    };
  }, [currentUser, activeCountry]);
}

/**
 * Keeps the handed-over Export session in step with the Core one: when the Core user signs out or
 * changes, the session written for the Export frame is cleared, so the next frame load cannot show
 * the previous person's name or reach a module the new account was not granted.
 */
export function useExportSessionLifecycle() {
  const { currentUser } = useCoreStore();
  const id = currentUser?.id ?? null;
  const previous = React.useRef<string | null>(id);

  React.useEffect(() => {
    if (previous.current !== id) {
      clearExportSession();
      previous.current = id;
    }
    if (!id) clearExportSession();
  }, [id]);
}
