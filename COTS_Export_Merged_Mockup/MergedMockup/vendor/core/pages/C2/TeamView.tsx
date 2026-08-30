import React from 'react';
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Stack, Button, Chip, Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import { HandOffBanner, PageBanner, SectionBand, StatusChip, EmptyState, WhiteButton } from '../../components/shared';
import { DataTable, Column } from '../../components/DataTable';
import { ShareBar, HBar, ChartFrame } from '../../components/Charts';
import { AGEING_BUCKETS, REPORTS_TO } from '../../mockData/c2';
import { Task } from '../../mockData';
import { ShellFooterNote } from '../../layouts/AppShell';

const TODAY = new Date('2026-08-18').getTime();
const ageDays = (raised: string) => Math.max(0, Math.round((TODAY - new Date(raised).getTime()) / 86400000));

/** WF-C2-03 / Step 7 — Manager team view: open tasks of reports, ageing, workload distribution. */
export const TeamView: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const me = s.currentUser!;

  const reports = s.users.filter((u) => REPORTS_TO[u.id] === me.id);
  const reportIds = reports.map((r) => r.id);
  const teamTasks = s.tasks.filter((t) => reportIds.includes(t.assigneeId) && t.status !== 'Closed');
  const totalOpen = teamTasks.length;

  const perPerson = reports.map((r) => {
    const mine = teamTasks.filter((t) => t.assigneeId === r.id);
    const oldest = mine.length ? Math.max(...mine.map((t) => ageDays(t.raised))) : 0;
    return {
      user: r,
      open: mine.length,
      overdue: mine.filter((t) => t.status === 'Overdue').length,
      urgent: mine.filter((t) => t.priority === 'Urgent').length,
      oldest
    };
  });

  const buckets = AGEING_BUCKETS.map((b) => ({
    label: b.label,
    value: teamTasks.filter((t) => { const a = ageDays(t.raised); return a >= b.min && a <= b.max; }).length,
    attention: b.min >= 6
  }));

  const columns: Column<Task>[] = [
    { key: 'assigneeId', label: 'Assignee', value: (t) => s.users.find((u) => u.id === t.assigneeId)?.name ?? t.assigneeId },
    { key: 'type', label: 'Task type' },
    { key: 'sourceModule', label: 'Source module' },
    { key: 'relatedRecord', label: 'Related record', render: (t) => <Typography sx={{ fontSize: 13, color: tokens.primary }}>{t.relatedRecord}</Typography> },
    { key: 'raised', label: 'Raised' },
    { key: 'age', label: 'Age (days)', value: (t) => String(ageDays(t.raised)) },
    { key: 'due', label: 'Due' },
    { key: 'priority', label: 'Priority', render: (t) => (t.priority === 'Urgent' ? <StatusChip status="Urgent" /> : <Typography sx={{ fontSize: 13 }}>Normal</Typography>) },
    { key: 'status', label: 'Status', render: (t) => <StatusChip status={t.status} /> }
  ];

  return (
    <>
      <PageBanner
        title="Team View"
        breadcrumb={[s.activeCountry, 'C2 Shell, Navigation and Inbox', 'Actions Inbox', 'Team View']}
        subtitle={`WF-C2-03 / Step 7 — ${reports.length} direct report${reports.length === 1 ? '' : 's'} · ${totalOpen} open task${totalOpen === 1 ? '' : 's'}`}
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/inbox')}>My inbox</WhiteButton>
            <WhiteButton onClick={() => navigate('/c2/analytics')}>Task analytics</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        {reports.length === 0 ? (
          <EmptyState message="You have no direct reports" hint="The team view is available to line managers. Sign in as Nasreen Sayed to see it populated." />
        ) : (
          <>
            <Paper variant="outlined" sx={{ mb: 2 }}>
              <SectionBand>Workload distribution across my reports</SectionBand>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Report</TableCell><TableCell>Role</TableCell>
                    <TableCell align="right">Open</TableCell><TableCell align="right">Overdue</TableCell>
                    <TableCell align="right">Urgent</TableCell><TableCell align="right">Oldest task</TableCell>
                    <TableCell>Share of team load</TableCell><TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {perPerson.map((p) => (
                    <TableRow key={p.user.id} hover>
                      <TableCell>
                        <Typography sx={{ fontSize: 13, color: tokens.primary, cursor: 'pointer' }} onClick={() => navigate(`/c1/users/${p.user.id}`)}>
                          {p.user.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{p.user.assignments.filter((a) => a.status === 'Active').map((a) => a.role).join(', ') || '—'}</TableCell>
                      <TableCell align="right">{p.open}</TableCell>
                      <TableCell align="right">{p.overdue > 0 ? <Chip size="small" label={p.overdue} sx={{ height: 19, fontSize: 11, bgcolor: '#D9660B', color: '#fff' }} /> : 0}</TableCell>
                      <TableCell align="right">{p.urgent > 0 ? <Chip size="small" label={p.urgent} sx={{ height: 19, fontSize: 11, bgcolor: '#B3261E', color: '#fff' }} /> : 0}</TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontSize: 13, color: p.oldest > 10 ? '#D9660B' : tokens.textPrimary, fontWeight: p.oldest > 10 ? 600 : 400 }}>
                          {p.open ? `${p.oldest} d` : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell><ShareBar value={p.open} total={totalOpen} /></TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={() => navigate('/c1/delegations')}>Delegate</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box sx={{ p: 2 }}>
                <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>
                  The share bar carries the count and percentage beside it, so the comparison never depends on bar length alone.
                </Typography>
              </Box>
            </Paper>

            <ChartFrame
              title="Ageing of the team's open tasks"
              note="Buckets beyond five days are coloured as attention. Escalation itself is owned by C4 / WF-C4-02, not by this view."
            >
              <HBar
                rows={buckets}
                format={(v) => `${v}`}
                attentionNote="Six days or more — beyond the service level for most task types"
                width={820}
              />
            </ChartFrame>

            <Paper variant="outlined" sx={{ mb: 2 }}>
              <SectionBand>Open tasks of my reports</SectionBand>
              <Box sx={{ p: 0 }}>
                <DataTable columns={columns} rows={teamTasks} onRowClick={(t) => navigate(t.route)} emptyMessage="No open tasks across the team" />
              </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Alert severity="info" sx={{ fontSize: 12.5, mb: 1 }}>
                This view reports; it does not decide. Reassignment of an approval task is owned by C4 and is
                recorded with a reason, and delegation is owned by C1.
              </Alert>
              <HandOffBanner target="C4 / WF-C4-02 Escalation and Exception Handling" passed="Task reference, assignee, ageing, service level breached" returned="Reminder, reassignment to the manager, or widened manager authority" resumes="C2 / WF-C2-03 / Step 8" />
              <HandOffBanner label="DEPENDENCY" target="C1 / WF-C1-04 Delegation and Absence Cover" passed="Absence period and delegate" returned="Task routing to the delegate for the period" to="/c1/delegations" goLabel="Open delegations" />
            </Paper>
          </>
        )}
        <ShellFooterNote />
      </Box>
    </>
  );
};
