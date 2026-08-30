import { Alert, Box, Button, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { SectionCard, StatusChip, TraceNote, BusinessConfirmation } from '../../components/shared';
import { useExpectedSma, useStore } from '../../state/store';
import { COLORS } from '../../theme';

/**
 * Boundary stubs. These exist so the S01 hand-offs land somewhere the client can see.
 * They are NOT the S02/S06/Export mockups and reproduce none of those workflows.
 */
export default function Stub() {
  const { which } = useParams();
  const { country, tasks } = useStore();
  const sma = useExpectedSma();

  if (which === 's06') {
    return (
      <AppShell title="S06 SMA — Expected SMA Position (boundary stub)" breadcrumb={[country, 'Shared Modules', 'SMA', 'Expected position']}>
        <Alert severity="info" sx={{ mb: 2 }}>
          <b>Boundary stub.</b> This screen exists only so the S01 hand-off lands somewhere visible. The S06 mockup is
          built when S06 is reached in the sequence; nothing of the S06 workflow is reproduced here.
        </Alert>
        <SectionCard title="Production side of the expected SMA position">
          <TraceNote workflow="WF-S06-01 / Step 4 — the volumes flagged for the agreement in the processing plan are the production side of the expected position" />
          <Typography variant="body2" sx={{ mb: 1 }}>
            Received from <b>S01 Planning / WF-S01-03 / Step 6</b> — live from the processing plan in this session.
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Commodity</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Flagged for SMA (MT)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sma.rows.map((r) => (
                <TableRow key={r.commodity}>
                  <TableCell>{r.commodity}</TableCell>
                  <TableCell align="right">{r.mt.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{sma.total.toLocaleString()}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: COLORS.textSecondary }}>
            Change a flag or a weekly quantity on the S01 processing plan and this figure moves — the plan change
            moves the expected position.
          </Typography>
          <Button size="small" component={Link} to="/s01/processing" sx={{ mt: 1 }}>
            Back to the processing plan
          </Button>
        </SectionCard>
      </AppShell>
    );
  }

  if (which === 's02') {
    return (
      <AppShell title="S02 Costing — Cost Estimate Calculator (boundary stub)" breadcrumb={[country, 'Shared Modules', 'Costing']}>
        <Alert severity="info" sx={{ mb: 2 }}>
          <b>Boundary stub.</b> Built properly when S02 is reached. Shown here only to receive the S01 hand-off.
        </Alert>
        <SectionCard title="Expected price received from S01">
          <TraceNote workflow="WF-S01-02 / Step 8 → WF-S02-02 — expected prices are available as an input to the cost estimate" />
          <Typography variant="body2">
            The sourcing plan's expected price per agent and area is offered as an input on the calculator. Nothing
            else of S02 is modelled here.
          </Typography>
          <Button size="small" component={Link} to="/s01/sourcing" sx={{ mt: 1 }}>Back to the sourcing plan</Button>
        </SectionCard>
      </AppShell>
    );
  }

  if (which === 'export') {
    return (
      <AppShell title="Export module (boundary stub)" breadcrumb={[country, 'Export']}>
        <Alert severity="info" sx={{ mb: 2 }}>
          <b>Boundary stub.</b> Export and Import are outside the shared-module scope of this phase. This screen only
          shows that the S01 processing plan output is handed over.
        </Alert>
        <SectionCard title="Received from S01 Planning">
          <TraceNote workflow="WF-S01-03 / Step 8" />
          <Stack spacing={0.5}>
            <Typography variant="body2">· Cargo readiness — from the weekly production plan</Typography>
            <Typography variant="body2">· Stock allocation — from the weekly production plan</Typography>
            <Typography variant="body2">· Expected finished goods availability — to the short and long position</Typography>
          </Stack>
          <Button size="small" component={Link} to="/s01/processing" sx={{ mt: 1 }}>Back to the processing plan</Button>
        </SectionCard>
      </AppShell>
    );
  }

  if (which === 's04' || which === 's07' || which === 's09' || which === 'stock') {
    const map: Record<string, { title: string; trace: string; lines: string[]; back: string }> = {
      s04: {
        title: 'S04 Compliance — variance case and monitoring (boundary stub)',
        trace: 'WF-S03-01 / Step 9 and WF-S03-03 / Steps 5–6 → WF-S04-01 and WF-S04-04',
        lines: [
          '· A non-conformity involving reprocessing, repacking or loss is a documented trigger for a variance case.',
          '· S04 also follows up the resolution of open non-conformities as a monitoring duty — status only.',
          '· The variance case steps stay in S04 and are not reproduced in S03.',
        ],
        back: '/s03/ncs',
      },
      s07: {
        title: 'S07 Claims — commercial claim (boundary stub)',
        trace: 'WF-S03-03 / Step 8 → WF-S07-01',
        lines: [
          '· Where the buyer raises a quality issue, the non-conformity is the quality reference on the claim.',
          '· The claim and the non-conformity remain separate linked records.',
          '· Insurance claims are handled in S04 and are never registered here.',
        ],
        back: '/s03/ncs',
      },
      s09: {
        title: 'S09 CRM and Customer Feedback (boundary stub)',
        trace: 'WF-S09-02 / Step 3 → WF-S03-03',
        lines: [
          '· A commodity complaint is linked to the quality records and may raise a non-conformity.',
          '· The feedback record retains the link; the non-conformity process is not repeated in S09.',
        ],
        back: '/s03/ncs',
      },
      stock: {
        title: 'Stock record and allocation (boundary stub)',
        trace: 'WF-S03-01 / Step 8 and WF-S03-03 / Step 4',
        lines: [
          '· The quality grade is written to the stock record and forms part of stock status.',
          '· The grade is the reference used in purchase contract stock allocation — not a report-only value.',
          '· Open non-conforming stock is blocked from allocation, dispatch or both, per the configured rule.',
        ],
        back: '/s03',
      },
    };
    const s = map[which];
    return (
      <AppShell title={s.title} breadcrumb={[country, 'Boundary']} showSeason={false}>
        <Alert severity="info" sx={{ mb: 2 }}>
          <b>Boundary stub.</b> Built properly when that module is reached in the sequence. Shown here only so the
          documented hand-off lands somewhere visible.
        </Alert>
        <SectionCard title="Received across the module boundary">
          <TraceNote workflow={s.trace} />
          <Stack spacing={0.5}>
            {s.lines.map((l) => <Typography key={l} variant="body2">{l}</Typography>)}
          </Stack>
          <Button size="small" component={Link} to={s.back} sx={{ mt: 1 }}>Back</Button>
        </SectionCard>
      </AppShell>
    );
  }

  // generic "not yet mocked"
  return (
    <AppShell title="Not yet mocked" breadcrumb={[country, 'Shared Modules']}>
      <Alert severity="warning">
        This module has not been mocked yet. The agreed sequence is S01 → S03 → S05 → S04 → S06 → S02 → S07 → S09 →
        S10 → S08 → S11, one module at a time with a review between each.
      </Alert>
      <Box sx={{ mt: 2 }}>
        <Button component={Link} to="/s01" variant="contained">Go to S01 Planning</Button>
      </Box>
    </AppShell>
  );
}

export function Inbox() {
  const { country, tasks } = useStore();
  return (
    <AppShell title="Actions Inbox" breadcrumb={[country, 'Actions Inbox']} showSeason={false}>
      <SectionCard title="Core C2 Actions Inbox — one consolidated task list">
        <Typography variant="caption" sx={{ display: 'block', mb: 1, color: COLORS.textSecondary }}>
          Shared modules do not build their own worklists. Approval tasks, automated job prompts and action items all
          appear here.
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Task', 'Module', 'Workflow', 'Kind', 'Raised', ''].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell>{t.title}</TableCell>
                <TableCell><Chip size="small" label={t.module} /></TableCell>
                <TableCell><Typography variant="caption">{t.workflow}</Typography></TableCell>
                <TableCell>
                  <StatusChip status={t.kind === 'approval' ? 'Pending Approval' : 'Open'} />
                </TableCell>
                <TableCell>{t.raisedOn}</TableCell>
                <TableCell align="right"><Button size="small" component={Link} to={t.route}>Open</Button></TableCell>
              </TableRow>
            ))}
            {tasks.length === 0 && (
              <TableRow><TableCell colSpan={6}><Typography variant="body2" color="text.secondary">No open tasks</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </SectionCard>
      <BusinessConfirmation>
        The full role catalogue is deferred (C1 / WF-C1-03), so the demonstration roles used here are placeholders.
      </BusinessConfirmation>
    </AppShell>
  );
}
