/**
 * The Export bridge — removed at v1.4. This file is a headstone; delete it.
 *
 * From v1.1 to v1.3 this screen was how the integrated mockup reached Export: it loaded the Export
 * portable build in an `<iframe>`, handed the Core session across the origin boundary through
 * `sessionStorage` so nobody was asked to sign in twice, and drew a strip above the frame carrying
 * the phase, the destination menu and the session state.
 *
 * v1.4 imports the Export sources in place, the way Core and Shared have always been imported. There
 * is no frame, no second application and no session to hand over, so there is nothing for this screen
 * to do. What it used to carry now lives in:
 *
 *   · `src/export/ExportPageFrame.tsx`   — the frame every Export screen renders inside, and the
 *                                          phase strip that used to sit above the iframe
 *   · `src/export/ExportKeyRedirect.tsx` — `/export/<key>`, kept alive so no old link dies
 *   · `src/export/ExportAuthBridge.tsx`  — the Core session as Export's identity
 *
 * WHY IT IS STILL HERE
 * --------------------
 * It was deleted from the working copy, but the tool that writes files back to a machine can only
 * write, never delete — so on any checkout updated to v1.4 in place, the old file would still be
 * sitting in `src/integration/`, importing `exportUrl`, `readMode` and `sameOrigin` from
 * `exportTarget.ts`, none of which exist any more. `tsc -b` would fail on a file nothing renders.
 *
 * Rather than leave that, the file is emptied. It compiles, it is imported by nothing, and it can be
 * deleted whenever convenient:
 *
 *     del src\\integration\\ExportScreen.tsx
 *
 * Nothing references the export below. It exists so this module has a shape rather than being an
 * empty file that a bundler might treat oddly.
 */

/** Where the Export bridge went. Nothing imports this. */
export const EXPORT_BRIDGE_REMOVED_AT = 'v1.4 — Export is imported in place; see src/export/';
