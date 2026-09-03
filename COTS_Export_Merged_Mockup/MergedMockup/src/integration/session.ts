/**
 * v1.1 — one sign-in, and module access granted on the account.
 *
 * WHAT THIS SOLVES
 * ----------------
 * In v1.0 the reviewer signed in twice: once on the Core screen, and again inside the Export frame.
 * `WF-INT-11 / Step 8` says that is wrong — Export and Shared work runs inside the one session Core
 * establishes, and whether a module is reachable at all is decided by the module scope granted on the
 * account (`WF-C1-03`).
 *
 * HOW IT IS DONE WITHOUT CHANGING EITHER PROTOTYPE
 * ------------------------------------------------
 * The Export prototype restores its session from `sessionStorage` under one key, and accepts it when
 * the `id` matches one of its demo accounts. When the Export page is framed from **the same origin**
 * as this application, both documents share one `sessionStorage`, so this layer can hand the session
 * over by writing that key before the frame loads. The Export prototype then finds a session already
 * present, skips its own login and opens the screen that was requested.
 *
 * Nothing in `COTS_Export_Mockup_v1.1` is modified, and no Core file is modified: the module scope and
 * the roles read below are the ones the Core accounts already carry.
 *
 * The hand-over needs the same origin, which is why the Export frame loads the Export **portable
 * build** through this app's own origin. Pointed at the separate Export dev server on another port it
 * is a different origin, the session cannot be shared, and that prototype asks for its own sign-in —
 * the Export screen says so when that mode is chosen.
 */

/**
 * The key the Export prototype restores its session from.
 *
 * v1.3 — re-checked against Export **v2.4** and unchanged. `export-process-mockup/src/auth/
 * AuthContext.tsx` still reads and writes this exact key, and `src/data/master.ts` still carries the
 * same five demo accounts with the same ids, usernames and roles. So the hand-over below needed no
 * adjustment for the new Export version, and none was made: the only thing that changed about the
 * bridge at v1.3 is which portable build it loads.
 *
 * The check matters because a silent change to either the key or an account id would not break the
 * build — it would just quietly reintroduce the second sign-in that v1.1 removed. If Export ever
 * changes either, this is the file to change with it.
 */
export const EXPORT_SESSION_KEY = 'cots-export-mockup.session';

/** The five accounts the Export prototype accepts. Read from its own demo data, never written to. */
type ExportDemoAccount = { id: string; username: string; role: string; unit: string };

const EXPORT_ACCOUNTS: Record<string, ExportDemoAccount> = {
  execution: { id: 'u-1', username: 'execution', role: 'partner_execution', unit: 'Port Sudan Execution' },
  dubai: { id: 'u-2', username: 'dubai', role: 'dubai_execution', unit: 'Dubai Execution' },
  trader: { id: 'u-3', username: 'trader', role: 'trader', unit: 'Trading Desk' },
  finance: { id: 'u-4', username: 'finance', role: 'trade_finance', unit: 'Trade Finance' },
  logistics: { id: 'u-5', username: 'logistics', role: 'logistics', unit: 'Logistics & Clearance' },
};

/**
 * Core role → the Export account the session is carried as.
 *
 * *Business confirmation required: the authoritative Core role to Export role mapping. The Export
 * prototype offers five accounts and its role list has no counterpart for the Core quality,
 * processing or compliance roles, so those are carried as the closest of the five and marked below.*
 */
export const ROLE_MAP: Record<string, { account: keyof typeof EXPORT_ACCOUNTS; exact: boolean }> = {
  SYSTEM_ADMINISTRATOR: { account: 'dubai', exact: false },
  COUNTRY_MANAGER: { account: 'dubai', exact: false },
  EXECUTION_OFFICER: { account: 'execution', exact: true },
  SOURCING_OFFICER: { account: 'trader', exact: false },
  COMPLIANCE_OFFICER: { account: 'finance', exact: false },
  QUALITY_INSPECTOR: { account: 'execution', exact: false },
  PROCESSING_SUPERVISOR: { account: 'execution', exact: false },
};

const FALLBACK: { account: keyof typeof EXPORT_ACCOUNTS; exact: boolean } = { account: 'execution', exact: false };

/** The shape the Export prototype stores — matched exactly, nothing added. */
export interface ExportSession {
  id: string;
  username: string;
  displayName: string;
  role: string;
  unit: string;
  /**
   * The two-letter code of the country the Core session is working in.
   *
   * Carried explicitly as of 3 September 2026, when the instruction removed the country
   * drop-down from the Export receiving-location screen on the grounds that Core already
   * knows the country. It did know it — this layer just had not been passing it. The
   * country was in `unit` as a display string ("Port Sudan Execution · Sudan"), which the
   * Export module could parse and which it still does as a fallback; a code is what a
   * screen should read.
   */
  country?: string;
}

export interface CarriedSession {
  session: ExportSession;
  /** the Core role the session was carried from */
  coreRole: string;
  /** false where the Core role has no exact Export counterpart */
  exact: boolean;
}

/** What Core knows about the signed-in user, as this layer needs it. */
export interface CoreIdentity {
  name: string;
  orgUnit: string;
  moduleScope: string[];
  roles: string[];
}

/**
 * Core's country names, as its store holds them, to the two-letter codes the Export
 * module's own `CountryUnit` uses.
 *
 * A map rather than a lookup in the Export module's tables, because this layer must not
 * import from inside a prototype it only carries a session to. The five entries are the
 * five countries both prototypes know about; an unlisted name carries nothing, and the
 * Export screen then says it is reading a default rather than showing a wrong country.
 */
const COUNTRY_CODES: Record<string, string> = {
  Sudan: 'SD',
  Ethiopia: 'ET',
  Chad: 'TD',
  Tanzania: 'TZ',
  Mozambique: 'MZ',
};

export function carriedSession(user: CoreIdentity, activeCountry: string): CarriedSession {
  const coreRole = user.roles[0] ?? '—';
  const mapped = ROLE_MAP[coreRole] ?? FALLBACK;
  const account = EXPORT_ACCOUNTS[mapped.account];
  return {
    coreRole,
    exact: mapped.exact,
    session: {
      id: account.id,
      username: account.username,
      role: account.role,
      // the person is the Core account holder, not the Export demo persona
      displayName: user.name,
      unit: `${user.orgUnit} · ${activeCountry}`,
      /*
        The country as a code, for the screens that scope by it rather than print it.

        Undefined for a country name this map does not carry, which is deliberate: the
        Export screen reports "reading the default" in that case, and a wrong country
        silently applied as a scope is worse than a stated fallback.
      */
      country: COUNTRY_CODES[activeCountry],
    },
  };
}

/** Hand the session to the Export prototype. Returns false where storage is unavailable. */
export function writeExportSession(s: ExportSession): boolean {
  try {
    sessionStorage.setItem(EXPORT_SESSION_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

/** Clear it — on Core sign-out, and whenever the Core user changes. */
export function clearExportSession() {
  try {
    sessionStorage.removeItem(EXPORT_SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function readExportSession(): ExportSession | null {
  try {
    const raw = sessionStorage.getItem(EXPORT_SESSION_KEY);
    return raw ? (JSON.parse(raw) as ExportSession) : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Module access — granted on the account, not assumed
 * ------------------------------------------------------------------ */

/** The five top-level modules of the COTS navigation (WF-INT-11 / Step 5). */
export const MODULE_EXPORT = 'Export';
export const MODULE_SHARED = 'Shared Modules';
export const MODULE_IMPORT = 'Import and Distribution';
export const MODULE_REPORTS = 'Reports and Dashboards';
export const MODULE_ADMIN = 'Administration';

export function hasModule(user: CoreIdentity | null, module: string): boolean {
  return !!user && user.moduleScope.includes(module);
}

/**
 * Which Core role grants a module, for the message shown when access is missing. WF-INT-11 / Step 6:
 * an action the user may not take names the reason and the role that grants it, rather than hiding.
 */
export const GRANTED_BY: Record<string, string> = {
  [MODULE_EXPORT]: 'Export is granted by an assignment carrying Export in its module scope — for example EXECUTION_OFFICER, SOURCING_OFFICER, COUNTRY_MANAGER or SYSTEM_ADMINISTRATOR.',
  [MODULE_SHARED]: 'Shared Modules is granted by an assignment carrying Shared Modules in its module scope — for example QUALITY_INSPECTOR, SOURCING_OFFICER, COUNTRY_MANAGER or SYSTEM_ADMINISTRATOR.',
  [MODULE_REPORTS]: 'Reports and Dashboards is granted by an assignment carrying it in its module scope — for example COMPLIANCE_OFFICER, COUNTRY_MANAGER or SYSTEM_ADMINISTRATOR.',
  [MODULE_IMPORT]: 'Import and Distribution is not built in this phase, and no source material for it exists in the project.',
  [MODULE_ADMIN]: 'Administration is granted by an assignment carrying it in its module scope — SYSTEM_ADMINISTRATOR and COUNTRY_MANAGER hold it in the demonstration data.',
};
