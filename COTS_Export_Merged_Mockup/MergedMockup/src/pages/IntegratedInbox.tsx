/**
 * One Actions Inbox across the modules.
 *
 * Both prototypes link to `/inbox`, and each has its own list: the Core C2 inbox holds Core tasks,
 * the Shared inbox holds Shared tasks. Neither can show the other, so this screen reads both stores
 * and presents one list — which is what WF-INT-12 / Step 6 and WF-INT-14 / Step 6 describe.
 *
 * Nothing is duplicated: each row opens the module screen that owns the task. The Core inbox itself
 * is preserved and still reachable at /c2/inbox.
 */

import { Box, Button, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography, Alert } from '@mui/material';
import { Link } from 'react-router-dom';
import { useStore as useCoreStore } from '@core/store';
import { useStore as useSharedStore } from '@shared/state/store';
import { OWNER_COLOUR, OWNER_LABEL } from '../integration/recordMap';

interface Row {
  id: string;
  owner: 'core' | 'shared';
  title: string;
  source: string;
  workflow: string;
  raised: string;
  kind: string;
  to: string;
}

export default function IntegratedInbox() {
  const core = useCoreStore();
  const shared = useSharedStore();

  const rows: Row[] = [
    ...core.tasks
      .filter((t) => t.status !== 'Closed')
      .map((t) => ({
        id: `core-${t.id}`,
        owner: 'core' as const,
        title: t.type,
        source: t.sourceModule,
        workflow: t.relatedRecord,
        raised: t.raised,
        kind: t.priority === 'Urgent' ? 'Urgent' : t.status,
        to: t.route,
      })),
    ...shared.tasks.map((t) => ({
      id: `shared-${t.id}`,
      owner: 'shared' as const,
      title: t.title,
      source: t.module,
      workflow: t.workflow,
      raised: t.raisedOn,
      kind: t.kind,
      to: t.route,
    })),
  ];

  return (
    <Box sx={{ p: 3, bgcolor: '#F4F6F8', minHeight: 'calc(100vh - 44px)' }}>
      <Typography sx={{ fontSize: 20, fontWeight: 500 }}>Actions Inbox — one list across the modules</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 900, mt: 0.5, mb: 2 }}>
        The C2 Actions Inbox is a Core capability, and no module builds its own worklist. This screen is that one list:
        approval tasks, automated job prompts and action items raised in Core and in the Shared modules, each opening
        the module screen that owns it (WF-INT-12 / Step 6).
      </Typography>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Module', 'Task', 'Raised in', 'Record or workflow', 'Raised', 'Kind', ''].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>
                  <Chip
                    size="small"
                    label={OWNER_LABEL[r.owner]}
                    sx={{ bgcolor: OWNER_COLOUR[r.owner], color: '#fff', height: 20, fontSize: '0.65rem' }}
                  />
                </TableCell>
                <TableCell>{r.title}</TableCell>
                <TableCell>{r.source}</TableCell>
                <TableCell><Typography variant="caption">{r.workflow}</Typography></TableCell>
                <TableCell>{r.raised}</TableCell>
                <TableCell><Chip size="small" variant="outlined" label={r.kind} sx={{ height: 20 }} /></TableCell>
                <TableCell align="right">
                  <Button size="small" component={Link} to={r.to}>Open</Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" color="text.secondary">
                    No open tasks. Raise one by submitting a master season plan for approval in S01, or a warehouse
                    request in S01 Warehousing.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button size="small" variant="outlined" component={Link} to="/c2/inbox">
          The Core C2 inbox on its own
        </Button>
        <Button size="small" variant="outlined" component={Link} to="/exceptions">
          The Export exceptions and risks queue
        </Button>
      </Stack>

      <Alert severity="info" sx={{ mt: 2, maxWidth: 1000 }}>
        The Export module keeps its own pending-actions queue on its dashboard and its own exceptions queue. Those
        are linked from here rather than merged into this list — not because Export is a separate application any
        more (since v1.4 it is compiled into this one), but because merging three task models is a business decision
        rather than a plumbing one.{' '}
        <i>Business confirmation required:</i> whether the Export queue becomes rows in this one inbox on build
        (WF-INT-14 / Step 6).
      </Alert>
    </Box>
  );
}
