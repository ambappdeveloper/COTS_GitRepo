import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Where the reused prototypes are found.
 *
 * The delivered layout puts this project one level below a folder that also holds the Core, Shared
 * and Export prototypes. In practice the package is often unzipped into a folder of its own name
 * (…/MergeModule_v1.2/MergeModule_v1.2/MergedMockup), and the sibling prototypes are checked out
 * under their own repository names. Rather than fail on a hard-coded relative path, each source tree
 * is looked up against the layouts it is actually found in, and the first one that exists wins.
 *
 * To point this at a location not listed here, set COTS_CORE_SRC / COTS_SHARED_SRC /
 * COTS_EXPORT_PORTABLE in the environment before `npm run dev`.
 *
 * v1.5.1 — VENDORED SOURCES COME FIRST.
 *
 * `vendorize.ps1` copies the three prototype source trees into this project, at
 *
 *     vendor/core             the Core prototype's   CoreModules/react/src
 *     vendor/shared           the Shared prototype's react/src
 *     vendor/export           the Export prototype's export-process-mockup/src
 *     vendor/export-portable  the Export portable single-file build
 *
 * and each of those is now the first candidate in the list it belongs to. The effect is that this
 * folder stands alone: copied anywhere, with its node_modules, `npm run dev` runs and nothing
 * outside the folder is read.
 *
 * The sibling-folder candidates are kept, after the vendored ones, on purpose. Delete `vendor/`
 * and the project reuses the prototypes in place exactly as it did before — which is what you want
 * while a prototype is still being changed. Re-run `vendorize.ps1` to refresh the copy afterwards.
 *
 * An explicit COTS_*_SRC environment variable still wins over both.
 */
const VENDOR = resolve(here, 'vendor');
function firstExisting(label: string, envVar: string, candidates: string[]): string {
  const override = process.env[envVar];
  if (override) {
    if (!existsSync(override)) throw new Error(`[cots] ${envVar} is set to "${override}", which does not exist.`);
    return override;
  }
  const hit = candidates.find((p) => existsSync(p));
  if (hit) return hit;
  throw new Error(
    `[cots] Could not find ${label}.\nLooked in:\n${candidates.map((c) => `  · ${c}`).join('\n')}\n` +
      `Set ${envVar} to the correct folder, or place the prototype at one of the paths above.`,
  );
}

/** The two module prototypes this mockup reuses, in place. Neither folder is copied or modified. */
const CORE = firstExisting('the Core module sources (the folder holding theme.ts, store.tsx, layouts/, pages/)', 'COTS_CORE_SRC', [
  /* the vendored copy inside this project — see the note above */
  resolve(VENDOR, 'core'),
  /* a clone of the COTS repository, where the four folders are siblings */
  resolve(here, '../COTS_CoreModules_Mockups_Walkthroughs/CoreModules/react/src'),
  resolve(here, '../../COTS_CoreModules_Consolidated/mockups/CoreModules/react/src'),
  resolve(here, '../../../COTS_CoreModules_Consolidated/mockups/CoreModules/react/src'),
  resolve(here, '../../../COTS_CoreModules_Mockups_Walkthroughs/CoreModules/react/src'),
  resolve(here, '../../COTS_CoreModules_Mockups_Walkthroughs/CoreModules/react/src'),
]);

/**
 * v1.4 — the Export **sources**, imported in place like Core and Shared.
 *
 * Until now this project reached Export through its portable build in an iframe. It no longer does:
 * the Export pages are compiled into this application and rendered inside the one Core shell. So
 * Export needs what Core and Shared have always had — a path to its `src`, and its own bare imports
 * resolved to this project's single dependency tree.
 *
 * Unlike Core and Shared this one is fatal if missing, because the Export routes are now part of the
 * integrated route table rather than a bridge that can show a not-found state.
 */
const EXPORT_SRC = firstExisting('the Export module sources (the folder holding App.tsx, pages/, domain/, services/)', 'COTS_EXPORT_SRC', [
  /* the vendored copy inside this project — see the note above */
  resolve(VENDOR, 'export'),
  /* a clone of the COTS repository, where the four folders are siblings */
  resolve(here, '../COTS_Export_Mockup_v2.4/export-process-mockup/src'),
  resolve(here, '../../../COTS_Export_Mockup_v2.4/export-process-mockup/src'),
  resolve(here, '../../COTS_Export_Mockup_v2.4/export-process-mockup/src'),
  resolve(here, '../../../../ExportProcessMockup/COTS_Export_Mockup_v2.4/export-process-mockup/src'),
  resolve(here, '../../../COTS_Export_Mockup_v2.0/export-process-mockup/src'),
]);

const SHARED = firstExisting('the Shared module sources (the folder holding theme.ts, state/, layouts/, pages/)', 'COTS_SHARED_SRC', [
  /* the vendored copy inside this project — see the note above */
  resolve(VENDOR, 'shared'),
  /* a clone of the COTS repository, where the four folders are siblings */
  resolve(here, '../COTS_SharedModules_Mockups_Walkthroughs/react/src'),
  resolve(here, '../../COTS_SharedModules_mockup_src_4/src'),
  resolve(here, '../../../COTS_SharedModules_mockup_src_4/src'),
  resolve(here, '../../../COTS_SharedModules_Mockups_Walkthroughs/react/src'),
  resolve(here, '../../COTS_SharedModules_Mockups_Walkthroughs/react/src'),
]);

/**
 * v1.1 — the Export portable build, loaded through this dev server's own origin so that one
 * `sessionStorage` is shared and the Core session can be handed over (see src/integration/session.ts).
 * Vite serves any file inside `server.fs.allow` under `/@fs/`.
 *
 * Unlike Core and Shared this one is not fatal: without it every other screen still runs and only the
 * Export bridge shows its "not found" state, so a missing Export build is reported and carried on from.
 *
 * v1.3 — **the Export contribution is now v2.4**, and that is what these candidates look for first.
 *
 * Why this list changed rather than gained an entry. Until v1.3 every candidate named
 * `COTS_Export_Mockup_v1.1`, a folder that is no longer delivered: the Export contribution has moved
 * through v2.0 to v2.4, and the effect was that the integrated mockup logged "the Export portable
 * build was not found" and every Export screen showed its not-found state. The bridge was pointing at
 * a build nobody ships any more.
 *
 * The v1.1 paths are kept at the end of the list, so a machine that still has the old contribution
 * checked out alongside a newer one prefers the newer and still runs off the older. Order is
 * significance: newest first.
 */
const EXPORT_CANDIDATES = [
  /* the vendored copy inside this project — see the note at the top */
  resolve(VENDOR, 'export-portable/COTS Export Mock-up.html'),
  /* v2.4 — the current Export contribution */
  resolve(here, '../COTS_Export_Mockup_v2.4/portable/COTS Export Mock-up.html'),
  resolve(here, '../../../COTS_Export_Mockup_v2.4/portable/COTS Export Mock-up.html'),
  resolve(here, '../../COTS_Export_Mockup_v2.4/portable/COTS Export Mock-up.html'),
  resolve(here, '../../../../ExportProcessMockup/COTS_Export_Mockup_v2.4/portable/COTS Export Mock-up.html'),
  resolve(here, '../../../../ExportProcessMockup/COTS_Export_Mockup_v2.4/COTS_Export_Mockup_v2.4/portable/COTS Export Mock-up.html'),
  /* v2.0, where a machine has that contribution and not v2.4 */
  resolve(here, '../../../COTS_Export_Mockup_v2.0/portable/COTS Export Mock-up.html'),
  resolve(here, '../../COTS_Export_Mockup_v2.0/portable/COTS Export Mock-up.html'),
  /* v1.1 — kept last so an older checkout still runs, rather than failing outright */
  resolve(here, '../../COTS_Export_Mockup_v1.1/portable/COTS Export Mock-up.html'),
  resolve(here, '../../../COTS_Export_Mockup_v1.1/portable/COTS Export Mock-up.html'),
  resolve(here, '../../../../ExportProcessMockup/COTS_Export_Mockup_v1.1/portable/COTS Export Mock-up.html'),
  resolve(here, '../../../../ExportProcessMockup/COTS_Export_Mockup_v1.1/COTS_Export_Mockup_v1.1/portable/COTS Export Mock-up.html'),
];
const EXPORT_PORTABLE =
  (process.env.COTS_EXPORT_PORTABLE && resolve(process.env.COTS_EXPORT_PORTABLE)) ||
  EXPORT_CANDIDATES.find((p) => existsSync(p)) ||
  EXPORT_CANDIDATES[0];

if (!existsSync(EXPORT_PORTABLE)) {
  console.warn(
    `[cots] The Export portable build was not found — the Export bridge screens will not load.\n` +
      `       Expected it at COTS_Export_Mockup_v2.4/portable/COTS Export Mock-up.html, beside this package.\n` +
      `       Set COTS_EXPORT_PORTABLE to "…/COTS Export Mock-up.html" to point at it elsewhere, or rebuild it\n` +
      `       once with "npm run build:portable" in COTS_Export_Mockup_v2.4/export-process-mockup.`,
  );
}
/* Say where each tree came from, and — the useful part — whether this project is standing on its
   own or still reaching outside itself for a prototype. */
const inside = (p: string) => p.replace(/\\/g, '/').toLowerCase().startsWith(VENDOR.replace(/\\/g, '/').toLowerCase());
const mark = (p: string) => (inside(p) ? 'vendored' : 'external');
console.log(
  `[cots] Core   → ${CORE}  (${mark(CORE)})\n` +
    `[cots] Shared → ${SHARED}  (${mark(SHARED)})\n` +
    `[cots] Export → ${EXPORT_SRC}  (${mark(EXPORT_SRC)})\n` +
    `[cots] Export portable → ${EXPORT_PORTABLE}  (${mark(EXPORT_PORTABLE)})`,
);
if ([CORE, SHARED, EXPORT_SRC, EXPORT_PORTABLE].every(inside)) {
  console.log('[cots] All four are inside this folder — it can be copied anywhere and still run.');
} else {
  console.log('[cots] At least one tree is outside this folder. Run  .\\vendorize.ps1 -Go  to bring them in.');
}

/**
 * v1.2 — the Shared pages render inside the one Core shell.
 *
 * Every Shared page imports its own layout relatively (`../../layouts/AppShell`), so a plain alias
 * cannot reach it. This plugin matches the *resolved* module and substitutes the integrated frame
 * instead, which keeps the page title and breadcrumb and drops the second navigation. No Shared file
 * is modified; remove the plugin and the Shared prototype is exactly as it was.
 */
const SHARED_APPSHELL = resolve(SHARED, 'layouts/AppShell.tsx');
const SHARED_APPSHELL_REPLACEMENT = resolve(here, 'src/shell/SharedPageFrame.tsx');

/**
 * v1.4 — the one Export module that has to be replaced, and only one.
 *
 * Twelve Export page files call `useAuth()`, and Export's own implementation authenticates against
 * its demo accounts in `sessionStorage` — which is what used to produce a second sign-in. Redirected
 * here, `useAuth()` returns the person who signed in at the Core screen, and the hand-over
 * v1.1 needed between two origins is gone because there is only one origin now.
 *
 * Export's `Shell` and its `global.css` needed no substitution: both are imported by Export's own
 * `App.tsx` and by nothing else, and this application mounts Export's routes itself rather than
 * using that file. Remove this one line and the Export prototype authenticates exactly as it does
 * standalone.
 */
const EXPORT_AUTH = resolve(EXPORT_SRC, 'auth/AuthContext.tsx');
const EXPORT_AUTH_REPLACEMENT = resolve(here, 'src/export/ExportAuthBridge.tsx');

/**
 * v1.5 — the one Shared data module that has to answer for every country the session can be in.
 *
 * `pages/S05/ServiceRequestAndShunting.tsx` reads the logistics operating model for the active
 * country with `COUNTRY_MODELS.find(c => c.country === country)!` — a non-null assertion over a table
 * of three countries. Standalone that is safe, because the Shared prototype's own country selector
 * offers exactly those three. Inside the integrated mockup the country comes from the Core session,
 * which offers four, and the screen threw for any of the others.
 *
 * The replacement does not invent the missing rows. Core's `COUNTRY_CONTEXT` already states, per
 * country, which process steps do not apply — including the logistics service request — and it agrees
 * with the Shared table everywhere the two overlap. So the row is *derived from the configuration
 * that owns the question* (C10 / WF-C10-01 Step 3), which is what the integration layer is for.
 *
 * See `src/integration/SharedCountryModels.ts` for the derivation and what it deliberately leaves
 * unanswered.
 */
const SHARED_S05_DATA = resolve(SHARED, 'mockData/s05.ts');
const SHARED_S05_DATA_REPLACEMENT = resolve(here, 'src/integration/SharedCountryModels.ts');

/**
 * Redirect a *resolved* module to a replacement file.
 *
 * Matching on the resolved id rather than the import specifier is what lets this reach a module a
 * page imports relatively (`../../mockData/s05`) without changing the page.
 *
 * Two imports are deliberately left alone:
 *
 *   · an import **of** the replacement — otherwise the file would resolve to itself;
 *   · an import **from** the replacement — so a replacement can build on the module it replaces
 *     rather than restate it. `SharedCountryModels.ts` re-exports the Shared table and completes one
 *     row of it; without this exemption that import would resolve straight back to the replacement.
 */
function substituteModule(target: string, replacement: string) {
  const norm = (p: string) => p.replace(/\\/g, '/').toLowerCase();
  const same = (a: string, b: string) => norm(a).split('?')[0] === norm(b);
  return {
    name: 'cots-substitute-module',
    enforce: 'pre' as const,
    async resolveId(source: string, importer: string | undefined, options: Record<string, unknown>) {
      if (norm(source).endsWith(norm(replacement))) return null;
      if (importer && same(importer, replacement)) return null;
      const resolved = await (this as any).resolve(source, importer, { skipSelf: true, ...options });
      if (resolved && same(resolved.id, target)) return replacement;
      return null;
    },
  };
}
const EXPORT_PORTABLE_DEV_URL = `/@fs${encodeURI(EXPORT_PORTABLE.replace(/\\/g, '/').replace(/^([A-Za-z]:)/, '/$1'))}`;

/**
 * Core and Shared are imported from outside this project's root, so their own bare imports
 * ('react', '@mui/material', …) have to resolve to the single dependency tree installed here.
 * Without these aliases each source tree would need its own node_modules and React would be
 * loaded twice.
 */
const dep = (name: string) => resolve(here, 'node_modules', name);

export default defineConfig({
  plugins: [
    substituteModule(SHARED_APPSHELL, SHARED_APPSHELL_REPLACEMENT),
    substituteModule(SHARED_S05_DATA, SHARED_S05_DATA_REPLACEMENT),
    substituteModule(EXPORT_AUTH, EXPORT_AUTH_REPLACEMENT),
    react(),
  ],
  base: './',
  define: {
    __EXPORT_PORTABLE_DEV_URL__: JSON.stringify(EXPORT_PORTABLE_DEV_URL),
  },
  resolve: {
    alias: [
      { find: '@core', replacement: CORE },
      { find: '@shared', replacement: SHARED },
      { find: '@export', replacement: EXPORT_SRC },
      { find: /^react$/, replacement: dep('react') },
      { find: /^react\/(.*)/, replacement: dep('react') + '/$1' },
      { find: /^react-dom$/, replacement: dep('react-dom') },
      { find: /^react-dom\/(.*)/, replacement: dep('react-dom') + '/$1' },
      { find: /^react-router-dom$/, replacement: dep('react-router-dom') },
      { find: /^@mui\/material$/, replacement: dep('@mui/material') },
      { find: /^@mui\/material\/(.*)/, replacement: dep('@mui/material') + '/$1' },
      { find: /^@mui\/icons-material$/, replacement: dep('@mui/icons-material') },
      { find: /^@mui\/icons-material\/(.*)/, replacement: dep('@mui/icons-material') + '/$1' },
      { find: /^@emotion\/react$/, replacement: dep('@emotion/react') },
      { find: /^@emotion\/react\/(.*)/, replacement: dep('@emotion/react') + '/$1' },
      { find: /^@emotion\/styled$/, replacement: dep('@emotion/styled') },
      { find: /^@emotion\/styled\/(.*)/, replacement: dep('@emotion/styled') + '/$1' },
    ],
    dedupe: ['react', 'react-dom', '@mui/material', '@emotion/react', '@emotion/styled'],
  },
  server: {
    port: 5180,
    // the two reused source trees and the Export build sit above this project
    fs: { allow: [here, CORE, SHARED, EXPORT_SRC, dirname(EXPORT_PORTABLE), resolve(here, '../..'), resolve(here, '../../..')] },
    // the Export portable file is loaded from here, through this origin — see EXPORT_PORTABLE above
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      // one chunk, so `npm run build:portable` can inline the whole app into a single .html
      output: { format: 'iife', inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: 'app[extname]' },
    },
  },
});
