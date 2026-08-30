/**
 * v1.2 — one menu.
 *
 * The Core C2 shell is now the only navigation in the integrated mockup: there is no second bar
 * above it and no separate integrated home page. This file supplies what the Core shell cannot know
 * on its own, through the optional extension point exported by `@core/layouts/AppShell`:
 *
 *   · the **other module sets** — Export, Shared Modules, Import and Distribution — as a second tier
 *     of tiles on the module screen, so the cross-module switcher is not repeated anywhere else;
 *   · the **integrated entries** — the journey map, the document chain and the one Actions Inbox —
 *     in the profile menu;
 *   · **which Core tiles this account may see**, so the menu appears by privilege
 *     (WF-C2-01 / Step 5, WF-C1-03).
 *
 * Nothing here is Export or Shared code. Without this provider the Core shell renders exactly as the
 * standalone CoreModules prototype does.
 */

import React from 'react';
import { ShellExtensionsProvider, type ShellExtensions, type ShellModuleTile } from '@core/layouts/AppShell';
import { useIdentity } from '../integration/useIdentity';
import {
  MODULE_ADMIN,
  MODULE_EXPORT,
  MODULE_IMPORT,
  MODULE_REPORTS,
  MODULE_SHARED,
  hasModule,
} from '../integration/session';
import {
  CROSS_CUTTING,
  PHASE_SECTIONS,
  TOTAL_PHASES,
  phasesInSection,
  sectionRange,
} from '../integration/exportProcess';
import { EXPORT_CONTRIBUTION } from '../integration/exportTarget';

/**
 * The Export tiles: the six process sections, each expanding to its phases, then the screens that
 * serve no single phase.
 *
 * Built from `exportProcess.ts` rather than listed here, so the menu cannot drift from the process
 * model — add a phase there and it appears here, in the right section and in the right order.
 */
const EXPORT_TILES: ShellModuleTile[] = [
  ...PHASE_SECTIONS.map((section) => ({
    code: section.section,
    label: section.section,
    hint: `phases ${sectionRange(section.section)}`,
    route: '/export',
    children: phasesInSection(section.section).map((phase) => ({
      label: `${String(phase.no).padStart(2, '0')} · ${phase.name}`,
      route: `/export/${phase.key}`,
    })),
  })),
  {
    code: 'across',
    label: 'Across the process',
    hint: 'no single phase',
    route: '/export',
    children: CROSS_CUTTING.map((screen) => ({ label: screen.label, route: `/export/${screen.key}` })),
  },
  {
    code: 'all',
    label: 'The whole process',
    hint: `all ${TOTAL_PHASES} phases`,
    route: '/export',
  },
];

/**
 * The Shared tiles — S01 to S11, as the Shared prototype's own tile board names them.
 *
 * No `children`, deliberately. The Shared prototype has no sub-module tier: each module opens on a
 * landing page that links onward, and inventing a screen list here would put labels in the menu that
 * exist nowhere in that prototype. A tile with no children navigates, which is exactly right.
 */
const SHARED_TILES: ShellModuleTile[] = [
  { code: 'S01', label: 'Planning', hint: 'S01', route: '/s01' },
  { code: 'S02', label: 'Costing', hint: 'S02', route: '/s02' },
  { code: 'S03', label: 'Quality Assurance', hint: 'S03', route: '/s03' },
  { code: 'S04', label: 'Compliance', hint: 'S04', route: '/s04' },
  { code: 'S05', label: 'Logistics', hint: 'S05', route: '/s05' },
  { code: 'S06', label: 'SMA', hint: 'S06', route: '/s06' },
  { code: 'S07', label: 'Claims', hint: 'S07', route: '/s07' },
  { code: 'S08', label: 'Projects', hint: 'S08', route: '/s08' },
  { code: 'S09', label: 'CRM and Customer Feedback', hint: 'S09', route: '/s09' },
  { code: 'S10', label: 'Team Directory', hint: 'S10', route: '/s10' },
  { code: 'S11', label: 'Knowledge Portal', hint: 'S11', route: '/s11' },
];

/**
 * The Core modules an account sees.
 *
 * Identity, audit, logging, configuration and the integration layer are administration capabilities:
 * they are shown where the account's module scope carries **Administration**. The operational Core
 * modules every journey passes through — the shell and inbox, master data, approvals, notifications,
 * comments and documents — are shown to any account with a module scope. Reporting follows its own
 * module scope.
 *
 * *Business confirmation required: this split is the demonstration rule. The authoritative list of
 * which Core module each role may open belongs with the C1 role catalogue (WF-C1-03).*
 */
const ADMIN_ONLY = ['C1', 'C8', 'C9', 'C10', 'C12'];
const REPORTS = ['C11'];

export function ShellBridge({ children }: { children: React.ReactNode }) {
  const id = useIdentity();

  const value = React.useMemo<ShellExtensions>(
    () => ({
      menuTitle: 'COTS',

      canSeeModule: (code: string) => {
        if (!id.signedIn) return true;
        if (id.moduleScope.length === 0) return code === 'C2';
        if (ADMIN_ONLY.includes(code)) return hasModule(id, MODULE_ADMIN);
        if (REPORTS.includes(code)) return hasModule(id, MODULE_REPORTS) || hasModule(id, MODULE_ADMIN);
        return true;
      },

      moduleSets: [
        {
          code: 'EXP',
          label: 'Export',
          /**
           * v1.3 — the hint states the process, and the tile lands on the module's own front door
           * rather than inside the Export springboard.
           *
           * `P1–P14 · M1–M8` described the Export prototype's internal phase and module numbering,
           * which meant nothing outside that prototype and is no longer the process anyone reviews
           * against. Workflow v2.3 runs to twenty-three phases; the tile says so.
           */
          hint: hasModule(id, MODULE_EXPORT)
            ? `${TOTAL_PHASES} phases · mock-up ${EXPORT_CONTRIBUTION}`
            : 'not in your module scope',
          route: '/export',
          enabled: hasModule(id, MODULE_EXPORT),
          /* Tiles only where the account may open them — otherwise the band would offer a grid that
             every click refuses. Without them the set falls back to a single tile, and the hint says
             why it is not open. */
          tiles: hasModule(id, MODULE_EXPORT) ? EXPORT_TILES : undefined,
        },
        {
          code: 'SHR',
          label: 'Shared Modules',
          hint: hasModule(id, MODULE_SHARED) ? 'S01–S11' : 'not in your module scope',
          route: '/s01',
          enabled: hasModule(id, MODULE_SHARED),
          tiles: hasModule(id, MODULE_SHARED) ? SHARED_TILES : undefined,
        },
        {
          code: 'IMP',
          label: 'Import and Distribution',
          hint: 'later phase',
          route: '/home',
          enabled: false,
        },
      ],

      /*
        The Export entry is gated on the same scope as the Export tile. `ShellMenuEntry` has no
        `enabled` flag — the Core shell renders every entry it is given — so the gate is applied by
        omitting the entry rather than by disabling it. An ungated entry sent an account without
        Export scope to the module-denied screen from a menu that had just offered it.
      */
      menuEntries: [
        ...(hasModule(id, MODULE_EXPORT)
          ? [{ label: `Export — the ${TOTAL_PHASES}-phase process`, route: '/export' }]
          : []),
        { label: 'Journey map — the integrated workflows', route: '/journey' },
        { label: 'Export document chain', route: '/document-chain' },
        { label: 'Actions Inbox — across the modules', route: '/inbox' },
      ],
    }),
    [id],
  );

  return <ShellExtensionsProvider value={value}>{children}</ShellExtensionsProvider>;
}

/** Import and Distribution is named in the navigation but not built — see WF-INT-11 / Step 5. */
export const UNBUILT_MODULE = MODULE_IMPORT;
