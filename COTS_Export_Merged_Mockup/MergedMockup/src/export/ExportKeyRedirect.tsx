/**
 * `/export/<key>` — kept alive as a redirect, v1.4.
 *
 * From v1.1 to v1.3 every Export screen was reached through a key in a bridge address:
 * `/export/contract`, `/export/documents`, `/export/seasonal-plan`. v1.4 imports Export in place, so
 * its screens are at Export's own addresses — `/contracts/ct-1`, `/documents`, `/sourcing/plans` —
 * and the bridge is gone.
 *
 * Those keys are in three years of walkthroughs, review notes, bookmarks and the journey model, and
 * a link that has worked since v1.1 should not start failing because the plumbing changed. So the
 * address survives as a redirect: it resolves the key against the process model exactly as the
 * bridge did, then replaces itself with the real screen.
 *
 * `destination()` is total — an unknown key resolves to the springboard rather than throwing — so
 * this can never leave a reviewer on a dead address. `replace` is deliberate: the redirect should not
 * sit in the history and trap the back button.
 */

import { Navigate, useParams } from 'react-router-dom';
import { destination } from '../integration/exportTarget';

export function ExportKeyRedirect() {
  const { key } = useParams();
  const dest = destination(key ?? 'home');
  return <Navigate to={dest.path} replace />;
}

export default ExportKeyRedirect;
