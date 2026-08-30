import React from 'react';
import {
  Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid,
  List, ListItem, ListItemText, MenuItem, Paper, Select, Stack, TextField, Typography, FormControl, InputLabel
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  EmptyState, HandOffBanner, PageBanner, PlaceholderNote, SectionBand, StatusChip, WhiteButton
} from '../../components/shared';
import { DataTable, Column } from '../../components/DataTable';
import { ChartFrame, DataTableView, HBar, KpiTile } from '../../components/Charts';
import {
  APPROVER_REGISTER, ApprovalView, BREACHES_BY_STEP, REMINDER_AT_PERCENT, WORKING_CALENDAR,
  slaLabel, slaState, slaWorkingHours
} from '../../mockData/c4';
import { ShellFooterNote } from '../../layouts/AppShell';

const roleLabel = (r: string) => r.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());

const ESCALATIONS = ['Notified manager', 'Reassigned to manager', "Manager's authority widened"];

/** 2.1 SLA and Escalation Monitor + 2.2 Reassign Approver — WF-C4-02 / Steps 1–5 */
export const SlaMonitor: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [reassign, setReassign] = React.useState<ApprovalView | null>(null);
  const [to, setTo] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState('');
  const [escalate, setEscalate] = React.useState<ApprovalView | null>(null);
  const [action, setAction] = React.useState(ESCALATIONS[0]);
  const [showTable, setShowTable] = React.useState(false);

  const sla = (v: ApprovalView) => (v.groups[v.currentGroup] ? slaWorkingHours(v.groups[v.currentGroup].members[0]) : 0);
  const state = (v: ApprovalView) => slaState(v.elapsedWorking, sla(v));

  const queue = s.approvalQueue;
  const breached = queue.filter((v) => state(v) === 'Breached');
  const approaching = queue.filter((v) => state(v) === 'Reminder sent');
  const avgAge = queue.length ? (queue.reduce((a, v) => a + v.elapsedWorking, 0) / queue.length) : 0;

  const columns: Column<ApprovalView>[] = [
    { key: 'objectType', label: 'Object type' },
    { key: 'record', label: 'Record', render: (v) => <Typography sx={{ fontSize: 13, color: tokens.primary }}>{v.record}</Typography> },
    { key: 'country', label: 'Country' },
    {
      key: 'step', label: 'Step',
      value: (v) => (v.groups[v.currentGroup]?.members.map((m) => roleLabel(m.role)).join(' + ') ?? '—')
    },
    {
      key: 'approver', label: 'Approver',
      value: (v) => v.assignedApprover ?? (v.groups[v.currentGroup]?.members
        .map((m) => s.resolveApprover(m.role, v.country).approver ?? 'Unresolved').join(', ') ?? '—')
    },
    { key: 'sla', label: 'Service level', value: (v) => (v.groups[v.currentGroup] ? slaLabel(v.groups[v.currentGroup].members[0]) : '—') },
    { key: 'elapsed', label: 'Elapsed working time', value: (v) => `${v.elapsedWorking.toFixed(1)} working hours` },
    {
      key: 'state', label: 'State', value: state,
      render: (v) => <StatusChip status={state(v)} />
    },
    { key: 'escalation', label: 'Escalation', value: (v) => v.escalation ?? '—' },
    { key: 'calendar', label: 'Working calendar', value: (v) => WORKING_CALENDAR[v.country] ?? '—', optional: true },
    {
      key: 'actions', label: '',
      render: (v) => (
        <Stack direction="row" spacing={0.5}>
          <Button size="small" onClick={(e) => { e.stopPropagation(); setReassign(v); setTo(null); setReason(''); }}>Reassign</Button>
          {state(v) === 'Breached' && (
            <Button size="small" color="warning" onClick={(e) => { e.stopPropagation(); setEscalate(v); setAction(ESCALATIONS[0]); }}>Escalate</Button>
          )}
        </Stack>
      )
    }
  ];

  const chartRows = BREACHES_BY_STEP.map((b) => ({
    label: b.step,
    value: b.breaches,
    attention: b.breaches >= 4,
    sub: `${b.decisions} decisions taken · ${b.slaLabel}`
  }));

  const currentReassignRole = reassign?.groups[reassign.currentGroup]?.members[0]?.role;
  const candidates = [...new Set(
    APPROVER_REGISTER.filter((e) => e.role === currentReassignRole).map((e) => e.user)
  )];
  const holdersElsewhere = candidates.length
    ? candidates
    : [...new Set(APPROVER_REGISTER.map((e) => e.user))];
  const delegationExists = !!(reassign && currentReassignRole
    && s.resolveApprover(currentReassignRole, reassign.country).delegateOf);

  return (
    <>
      <PageBanner
        title="Service levels and escalation"
        breadcrumb={[s.activeCountry, 'C4 Approval Workflow', 'Service levels and escalation']}
        subtitle="WF-C4-02 / Steps 1–5 — service levels measured on the country working calendar, reminded, then escalated"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c4/approvals')}>My approvals</WhiteButton>
            <WhiteButton onClick={() => navigate('/c4/routes')}>Approval routes</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={queue.length} label="Pending decisions" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={approaching.length} label={`Approaching service level (reminder at ${REMINDER_AT_PERCENT}%)`} /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={breached.length} label="Breached" tone="attention" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={`${avgAge.toFixed(1)} h`} label="Average age of a pending decision" sub="working hours" /></Grid>
        </Grid>

        <ChartFrame
          title="Repeated service-level breaches by route step"
          note="Working hours are counted on each country's calendar — Sudan runs Sunday to Thursday, so a Friday adds nothing to elapsed time. Steps at or above four breaches are drawn in the attention colour."
          tableToggle={
            <Button size="small" sx={{ mt: 0.5 }} onClick={() => setShowTable((x) => !x)}>
              {showTable ? 'Show the chart' : 'Show the figures as a table'}
            </Button>
          }
        >
          {showTable
            ? <DataTableView
                head={['Route step', 'Breaches', 'Decisions taken', 'Service level']}
                rows={BREACHES_BY_STEP.map((b) => [b.step, b.breaches, b.decisions, b.slaLabel])}
              />
            : <HBar rows={chartRows} unit=" breaches" attentionNote="Four or more breaches on the same step — a bottleneck rather than an incident" />}
        </ChartFrame>

        <Paper variant="outlined" sx={{ mt: 2 }}>
          <SectionBand>Pending decisions</SectionBand>
          {queue.length === 0
            ? <EmptyState message="No decisions are pending" />
            : <DataTable columns={columns} rows={queue} groupable emptyMessage="No decisions are pending" searchPlaceholder="Search pending decisions" />}
        </Paper>

        <Paper variant="outlined" sx={{ mt: 2 }}>
          <SectionBand>Reassignment log — WF-C4-02 / Step 5</SectionBand>
          <List dense disablePadding>
            {s.reassignments.map((r) => (
              <ListItem key={r.id} divider>
                <ListItemText
                  primaryTypographyProps={{ fontSize: 13 }}
                  secondaryTypographyProps={{ fontSize: 12 }}
                  primary={`${r.objectType} ${r.instance} — ${r.from} → ${r.to}`}
                  secondary={`${r.at} by ${r.by} · ${r.reason}`}
                />
              </ListItem>
            ))}
          </List>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
              Every reassignment is recorded with its reason, so a pattern of reassignment around one person is not
              invisible.
            </Typography>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ mt: 2 }}>
          <SectionBand>How escalation behaves</SectionBand>
          <Box sx={{ p: 2 }}>
            <List dense disablePadding>
              {[
                `Each step carries a service level in working hours or days, taken from the route.`,
                `Elapsed time is calculated on the working calendar of the relevant country, not in calendar days.`,
                `A reminder is issued to the approver at ${REMINDER_AT_PERCENT}% of the service level — HAND-OFF → C5 / WF-C5-02.`,
                `On breach the approver's manager is notified, then per configuration the task is reassigned to the manager or the manager's authority is widened to decide alongside the original approver.`,
                `Repeated breaches are reported through the shared reporting area — HAND-OFF → C11 / WF-C11-01.`
              ].map((t) => (
                <ListItem key={t} disableGutters><ListItemText primaryTypographyProps={{ fontSize: 13 }} primary={t} /></ListItem>
              ))}
            </List>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <HandOffBanner target="C5 / WF-C5-02 Reminders and Escalation" passed="The approaching or breached service level and the approver" />
              <HandOffBanner target="C11 / WF-C11-01 Reporting" passed="Repeated breaches by route step" />
            </Stack>
            <PlaceholderNote>
              Business confirmation required: the point before expiry at which a reminder is issued is configurable; the
              prototype uses {REMINDER_AT_PERCENT}% of the service level as a demonstration value.
            </PlaceholderNote>
          </Box>
        </Paper>

        <ShellFooterNote />
      </Box>

      {/* 2.2 Reassign Approver */}
      <Dialog open={!!reassign} onClose={() => setReassign(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Reassign the approver</DialogTitle>
        <DialogContent>
          {delegationExists ? (
            <Alert severity="info" sx={{ fontSize: 13, mb: 2 }}>
              A delegation is already in force for this approver, so the task is being presented to the delegate.
              Delegation is the ordinary route; reassignment is for unplanned unavailability.
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ fontSize: 13, mb: 2 }}>
              No delegation exists for this approver. Reassignment is available because the approver is unavailable and
              no delegation is in force — WF-C4-02 / Step 5.
            </Alert>
          )}
          <Stack spacing={2}>
            <TextField
              label="Current approver" size="small" fullWidth
              InputProps={{ readOnly: true }}
              value={reassign?.assignedApprover
                ?? (currentReassignRole && reassign ? s.resolveApprover(currentReassignRole, reassign.country).approver ?? 'Unresolved' : '—')}
            />
            <Autocomplete
              options={holdersElsewhere}
              value={to}
              onChange={(_, v) => setTo(v)}
              renderInput={(p) => <TextField {...p} size="small" label={`Reassign to — holders of ${currentReassignRole ? roleLabel(currentReassignRole) : 'the step role'}`} />}
            />
            <TextField
              label="Reason" size="small" fullWidth multiline minRows={3} required
              value={reason} onChange={(e) => setReason(e.target.value)}
              helperText="Mandatory. The reassignment is recorded with its reason and fully audited."
            />
          </Stack>
          <HandOffBanner label="DEPENDENCY" target="C1 / WF-C1-04 Delegation and Absence Cover"
                         passed="The unavailable approver and the cover period"
                         to="/c1/delegations" goLabel="Set up a delegation instead" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReassign(null)}>Cancel</Button>
          <Button variant="contained" disabled={!to || !reason.trim()}
                  onClick={() => { if (reassign && to) s.reassignApprover(reassign.id, to, reason.trim()); setReassign(null); }}>
            Reassign
          </Button>
        </DialogActions>
      </Dialog>

      {/* escalation action */}
      <Dialog open={!!escalate} onClose={() => setEscalate(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Escalate a breached service level</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ fontSize: 13, mb: 2 }}>
            {escalate?.record} is {escalate ? (escalate.elapsedWorking - sla(escalate)).toFixed(1) : 0} working hours past
            its service level. The manager is notified first; the action taken then follows configuration.
          </Alert>
          <FormControl fullWidth size="small">
            <InputLabel>Escalation action</InputLabel>
            <Select label="Escalation action" value={action} onChange={(e) => setAction(e.target.value)}>
              {ESCALATIONS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEscalate(null)}>Cancel</Button>
          <Button variant="contained" color="warning"
                  onClick={() => { if (escalate) s.escalateApproval(escalate.id, action); setEscalate(null); }}>
            Apply escalation
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
