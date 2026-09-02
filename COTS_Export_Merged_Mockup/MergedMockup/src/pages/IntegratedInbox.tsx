/**
 * One Actions Inbox across the modules — Core, Shared and Export.
 *
 * WHAT CHANGED, AND WHY
 * ---------------------
 * Until now this screen read the Core and Shared task stores and *linked out* to Export's own two
 * queues, with an alert saying that merging them was a business decision rather than plumbing. The
 * business answer is in: Export's tasks are rows in this list. The screen no longer contradicts its
 * own first sentence, and no module operates a task list of its own.
 *
 * Export contributes through `../integration/exportTasks`, which derives its rows from the execution
 * flow — see that file for the rule that separates a task from a risk, and for the phases that
 * deliberately raise nothing because the workflow defines no approval gate for them.
 *
 * The Export **exceptions and risks queue** is still a separate screen and still linked from here.
 * That is not a leftover: a risk is a rule breaching against a record, owned by a standing team and
 * answered by acknowledgement rather than completion. It has a severity scale and an evidence
 * paragraph that a task row cannot carry, and no single person can complete it. One task list and
 * one risk register is the design; two task lists was the defect.
 *
 * THREE THINGS THIS SCREEN NOW HAS THAT IT DID NOT
 * -----------------------------------------------
 *   1. **An owner column.** Export work is owned by a function — Logistics, Dubai Execution,
 *      Trade Finance — not by whoever happens to be looking at the screen. The Core and Shared
 *      stores assume the viewer is the assignee, so their rows show the signed-in user. Until the
 *      Core task contract carries `owner` as user-or-team in its own right, this column derives it.
 *   2. **One date format and one urgency vocabulary.** The Shared store's row carried
 *      `19-Aug-2026` against the Core rows' `2026-08-14`, and a lower-case `job` beside
 *      Urgent / Open / Overdue. Both are normalised at render rather than in the mock data, so no
 *      module's seed file had to be rewritten.
 *   3. **Filters and counts.** Twelve rows needed neither. Export's execution flow across open
 *      shipments does.
 */

import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useStore as useCoreStore } from '@core/store';
import { useStore as useSharedStore } from '@shared/state/store';
import { OWNER_COLOUR, OWNER_LABEL, type Owner } from '../integration/recordMap';
import { carriedSession } from '../integration/session';
import { useIdentity } from '../integration/useIdentity';
import { useExportTasks, type TaskKind } from '../integration/exportTasks';

type ModuleKey = Extract<Owner, 'core' | 'shared' | 'export'>;

interface Row {
  id: string;
  module: ModuleKey;
  title: string;
  source: string;
  workflow: string;
  /** ISO 8601 after normalisation */
  raised: string;
  kind: TaskKind;
  ownerLabel: string;
  /** true where the row is owned by the signed-in user or their function */
  mine: boolean;
  to: string;
  evidence?: string;
}

/* ------------------------------------------------------------------ *
 * Normalisers
 *
 * One application, one format. Both of these exist because the three prototypes were built
 * separately; neither changes any seed file.
 * ------------------------------------------------------------------ */

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', sept: '09', oct: '10', nov: '11', dec: '12',
};

/** `19-Aug-2026`, `15 Sept 2026` and `2026-08-14` all become `2026-08-14`. */
function toIso(raw: string | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const m = trimmed.match(/^(\d{1,2})[-\s]([A-Za-z]{3,4})[-\s](\d{4})$/);
  if (m) {
    const month = MONTHS[m[2].toLowerCase()];
    if (month) return `${m[3]}-${month}-${m[1].padStart(2, '0')}`;
  }
  return trimmed;
}

/** Urgency only. A category that arrived in this column is moved out of it. */
function toKind(raw: string | undefined): TaskKind {
  const v = (raw ?? '').toLowerCase();
  if (v === 'overdue') return 'Overdue';
  if (v === 'urgent') return 'Urgent';
  if (v === 'job' || v === 'automated job') return 'Job';
  return 'Open';
}

const KIND_ORDER: Record<TaskKind, number> = { Overdue: 0, Urgent: 1, Open: 2, Job: 3 };

const KIND_COLOUR: Record<TaskKind, string> = {
  Overdue: '#8E2B20',
  Urgent: '#A35A08',
  Open: '#4A5A63',
  Job: '#4A4A6A',
};

export default function IntegratedInbox() {
  const core = useCoreStore();
  const shared = useSharedStore();
  const identity = useIdentity();
  const exportTasks = useExportTasks();

  const [moduleFilter, setModuleFilter] = React.useState<ModuleKey | 'all'>('all');
  const [scope, setScope] = React.useState<'all' | 'mine'>('all');

  /**
   * The Export function this account's Core role is carried as — the basis of "mine" for Export rows.
   *
   * Read through `carriedSession`, the same function that hands the session to the Export screens, so
   * the filter and the Export frame can never disagree about which function the signed-in person is.
   */
  const carried = React.useMemo(
    () =>
      identity.signedIn
        ? carriedSession(
            {
              name: identity.name,
              orgUnit: identity.orgUnit,
              moduleScope: identity.moduleScope,
              roles: identity.roles,
            },
            identity.activeCountry,
          )
        : null,
    [identity],
  );
  const myExportRole = carried?.session.role ?? null;

  const rows: Row[] = React.useMemo(() => {
    const me = identity.signedIn ? identity.name : '—';

    const coreRows: Row[] = core.tasks
      .filter((t) => t.status !== 'Closed')
      .map((t) => ({
        id: `core-${t.id}`,
        module: 'core' as const,
        title: t.type,
        source: t.sourceModule,
        workflow: t.relatedRecord,
        raised: toIso(t.raised),
        kind: toKind(t.priority === 'Urgent' ? 'Urgent' : t.status),
        ownerLabel: me,
        mine: true,
        to: t.route,
      }));

    const sharedRows: Row[] = shared.tasks.map((t) => ({
      id: `shared-${t.id}`,
      module: 'shared' as const,
      title: t.title,
      source: t.module,
      workflow: t.workflow,
      raised: toIso(t.raisedOn),
      kind: toKind(t.kind),
      ownerLabel: me,
      mine: true,
      to: t.route,
    }));

    const exportRows: Row[] = exportTasks.tasks.map((t) => ({
      id: t.id,
      module: 'export' as const,
      title: t.title,
      source: t.raisedIn,
      workflow: t.due ? `${t.record} · due ${t.due}` : t.record,
      raised: toIso(t.raised),
      kind: t.kind,
      ownerLabel: t.ownerLabel,
      /**
       * An Export row is "mine" when the signed-in Core role is carried as the function that owns
       * the milestone. Where the Core role has no exact Export counterpart the mapping is the
       * closest of the five demonstration accounts — that inexactness is stated in `session.ts` and
       * is a business confirmation, not a bug in this filter.
       */
      mine: myExportRole != null && t.owner === myExportRole,
      to: t.route,
      evidence: t.evidence,
    }));

    const all = [...coreRows, ...sharedRows, ...exportRows];

    return all.sort(
      (a, b) =>
        KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
        a.raised.localeCompare(b.raised) ||
        a.title.localeCompare(b.title),
    );
  }, [core.tasks, shared.tasks, exportTasks.tasks, identity, myExportRole]);

  const counts = React.useMemo(() => {
    const byModule: Record<ModuleKey, number> = { core: 0, shared: 0, export: 0 };
    let mine = 0;
    let overdue = 0;
    for (const r of rows) {
      byModule[r.module] += 1;
      if (r.mine) mine += 1;
      if (r.kind === 'Overdue') overdue += 1;
    }
    return { byModule, mine, overdue, total: rows.length };
  }, [rows]);

  const visible = rows.filter(
    (r) => (moduleFilter === 'all' || r.module === moduleFilter) && (scope === 'all' || r.mine),
  );

  const filtered = moduleFilter !== 'all' || scope !== 'all';

  return (
    <Box sx={{ p: 3, bgcolor: '#F4F6F8', minHeight: 'calc(100vh - 44px)' }}>
      <Typography sx={{ fontSize: 20, fontWeight: 500 }}>Actions Inbox — one list across the modules</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 900, mt: 0.5, mb: 2 }}>
        The C2 Actions Inbox is a Core capability, and no module builds its own task list. This screen
        is that one list: approval tasks, automated job prompts and action items raised in Core, in the
        Shared modules and in Export, each opening the module screen that owns it
        (WF-INT-12 / Step 6, WF-INT-14 / Step 6).
      </Typography>

      {/* ---------- filters and counts ---------- */}
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        useFlexGap
        flexWrap="wrap"
        sx={{ mb: 1.5 }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>
          Module
        </Typography>
        <Chip
          size="small"
          label={`All ${counts.total}`}
          onClick={() => setModuleFilter('all')}
          variant={moduleFilter === 'all' ? 'filled' : 'outlined'}
          color={moduleFilter === 'all' ? 'primary' : 'default'}
        />
        {(['core', 'shared', 'export'] as ModuleKey[]).map((m) => (
          <Chip
            key={m}
            size="small"
            label={`${OWNER_LABEL[m]} ${counts.byModule[m]}`}
            onClick={() => setModuleFilter(m)}
            variant={moduleFilter === m ? 'filled' : 'outlined'}
            sx={
              moduleFilter === m
                ? { bgcolor: OWNER_COLOUR[m], color: '#fff', '&:hover': { bgcolor: OWNER_COLOUR[m] } }
                : { borderColor: OWNER_COLOUR[m], color: OWNER_COLOUR[m] }
            }
          />
        ))}

        <Box sx={{ width: 16 }} />

        <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>
          Owner
        </Typography>
        <Chip
          size="small"
          label={`Everyone ${counts.total}`}
          onClick={() => setScope('all')}
          variant={scope === 'all' ? 'filled' : 'outlined'}
          color={scope === 'all' ? 'primary' : 'default'}
        />
        <Tooltip
          title={
            !myExportRole
              ? 'Sign in to scope this list to your own work'
              : carried?.exact === false
                ? `Tasks assigned to you in Core and Shared, plus Export tasks owned by ${myExportRole} — the closest Export function to your Core role ${carried.coreRole}, which has no exact counterpart. That mapping is a business confirmation.`
                : `Tasks assigned to you in Core and Shared, plus Export tasks owned by ${myExportRole}`
          }
        >
          <Chip
            size="small"
            label={`Mine and my function ${counts.mine}`}
            onClick={() => setScope('mine')}
            variant={scope === 'mine' ? 'filled' : 'outlined'}
            color={scope === 'mine' ? 'primary' : 'default'}
          />
        </Tooltip>

        <Box sx={{ flexGrow: 1 }} />

        {counts.overdue > 0 && (
          <Chip
            size="small"
            label={`${counts.overdue} overdue`}
            sx={{ bgcolor: KIND_COLOUR.Overdue, color: '#fff' }}
          />
        )}
        {exportTasks.loading && (
          <Stack direction="row" spacing={0.75} alignItems="center">
            <CircularProgress size={12} />
            <Typography variant="caption" color="text.secondary">
              Reading Export
            </Typography>
          </Stack>
        )}
      </Stack>

      {exportTasks.error && (
        <Alert severity="warning" sx={{ mb: 1.5, maxWidth: 1000 }}>
          {exportTasks.error}
        </Alert>
      )}

      {/*
        The table scrolls inside its own container. With the Owner column added there are eight
        columns, and on a narrow viewport the page itself was scrolling sideways — which moves the
        filters and the heading off screen while the reader is only trying to read a row.
      */}
      <Paper variant="outlined" sx={{ p: 2, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 940 }}>
          <TableHead>
            <TableRow>
              {['Module', 'Task', 'Raised in', 'Record or workflow', 'Owner', 'Raised', 'Kind', ''].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>
                  <Chip
                    size="small"
                    label={OWNER_LABEL[r.module]}
                    sx={{ bgcolor: OWNER_COLOUR[r.module], color: '#fff', height: 20, fontSize: '0.65rem' }}
                  />
                </TableCell>
                <TableCell>
                  {r.evidence ? (
                    <Tooltip title={r.evidence}>
                      <span>{r.title}</span>
                    </Tooltip>
                  ) : (
                    r.title
                  )}
                </TableCell>
                <TableCell>{r.source}</TableCell>
                <TableCell>
                  <Typography variant="caption">{r.workflow}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{r.ownerLabel}</Typography>
                </TableCell>
                <TableCell sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{r.raised}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    variant={r.kind === 'Open' || r.kind === 'Job' ? 'outlined' : 'filled'}
                    label={r.kind}
                    sx={
                      r.kind === 'Open' || r.kind === 'Job'
                        ? { height: 20 }
                        : { height: 20, bgcolor: KIND_COLOUR[r.kind], color: '#fff' }
                    }
                  />
                </TableCell>
                <TableCell align="right">
                  <Button size="small" component={Link} to={r.to}>
                    Open
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {/* Loading — skeletons that match the final row, so the list does not jump. */}
            {exportTasks.loading &&
              visible.length === 0 &&
              [0, 1, 2].map((i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell colSpan={8}>
                    <Skeleton height={22} />
                  </TableCell>
                </TableRow>
              ))}

            {/* Empty — filtered and unfiltered say different things. */}
            {!exportTasks.loading && visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  {filtered ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        No tasks match{' '}
                        {moduleFilter !== 'all' ? OWNER_LABEL[moduleFilter] : ''}
                        {moduleFilter !== 'all' && scope === 'mine' ? ' and ' : ''}
                        {scope === 'mine' ? 'your own work' : ''}. {counts.total} tasks are open in total.
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => {
                          setModuleFilter('all');
                          setScope('all');
                        }}
                      >
                        Clear filters
                      </Button>
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No open tasks. Raise one by submitting a master season plan for approval in S01, a
                      warehouse request in S01 Warehousing, or by opening a shipment in Export and dating
                      a milestone.
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Stack direction="row" spacing={1} sx={{ mt: 2 }} useFlexGap flexWrap="wrap">
        <Button size="small" variant="outlined" component={Link} to="/c2/inbox">
          The Core C2 inbox on its own
        </Button>
        <Button size="small" variant="outlined" component={Link} to="/exceptions">
          The Export exceptions and risks queue
        </Button>
      </Stack>

      <Alert severity="info" sx={{ mt: 2, maxWidth: 1000 }}>
        Export's execution-flow tasks are rows in this list, owned by the function the workflow
        assigns. Its <b>exceptions and risks</b> queue stays a separate screen and is linked above: a
        risk is a rule breaching against a record, owned by a standing team and answered by
        acknowledgement rather than completion, and it carries a severity and an evidence paragraph a
        task row cannot. One task list and one risk register.{' '}
        <i>Business confirmation required:</i> phases 01–07 — seasonal purchase plan, budget, purchase
        agreement, fund — raise no approval task here, because the Export workflow defines no approval
        step for them even though the permission catalogue holds <code>SOURCING_PLAN.APPROVE</code>.
        Charge and claim approval are open for the same reason: who approves, and to what authority
        limit (WF-INT-14 / Step 6).
      </Alert>
    </Box>
  );
}
