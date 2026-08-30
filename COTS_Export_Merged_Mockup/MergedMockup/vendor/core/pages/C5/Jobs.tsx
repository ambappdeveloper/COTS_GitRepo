import React from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, Grid, InputLabel, MenuItem, OutlinedInput, Paper, Select, Stack, Switch,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, FormControlLabel
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  ConfirmDialog, EmptyState, HandOffBanner, PageBanner, PlaceholderNote, SectionBand, StatusChip, WhiteButton
} from '../../components/shared';
import { DataTable, Column } from '../../components/DataTable';
import { KpiTile } from '../../components/Charts';
import { DATA_ELEMENTS, JobRule, OverdueItem, periodHours } from '../../mockData/c5';
import { APPROVER_REGISTER } from '../../mockData/c4';
import { COUNTRIES } from '../../mockData';
import { ShellFooterNote } from '../../layouts/AppShell';

const ROLES = [...new Set(APPROVER_REGISTER.map((e) => e.role))];
const COMMODITIES = ['Sesame — Hulled White', 'Sesame — Natural Brown', 'Groundnut', 'Gum Arabic'];
const AREAS = ['Gedaref buying area', 'Kassala buying area', 'Port Sudan corridor', 'Humera buying area', 'Beira corridor'];
const roleLabel = (r: string) => r.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());

const blank = (id: string): JobRule => ({
  id, element: DATA_ELEMENTS[0], periodValue: 3, periodUnit: 'days',
  responsibleRole: ROLES[0], escalationValue: 2, escalationUnit: 'days', escalationRole: 'COUNTRY_MANAGER',
  countries: [], commodities: [], areas: [], active: true, lastRun: '—'
});

/** 2.1 Automated Job Rule List + 2.2 Form + 2.3 Scheduler Run and Job Log — WF-C5-02 */
export const AutomatedJobs: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [edit, setEdit] = React.useState<JobRule | null>(null);
  const [runOpen, setRunOpen] = React.useState(false);

  const itemsFor = (r: JobRule) => s.overdueItems.filter((i) => i.ruleId === r.id);

  const columns: Column<JobRule>[] = [
    { key: 'id', label: 'Rule', render: (r) => <Typography sx={{ fontSize: 13, color: tokens.primary, fontWeight: 500 }}>{r.id}</Typography> },
    { key: 'element', label: 'Data element' },
    { key: 'period', label: 'Update period', value: (r) => `${r.periodValue} ${r.periodUnit}` },
    { key: 'responsible', label: 'Responsible role', value: (r) => roleLabel(r.responsibleRole) },
    { key: 'escalationPeriod', label: 'Escalation period', value: (r) => `${r.escalationValue} ${r.escalationUnit}` },
    { key: 'escalationRole', label: 'Escalation role', value: (r) => roleLabel(r.escalationRole) },
    { key: 'countries', label: 'Country scope', value: (r) => (r.countries.length ? r.countries.join(', ') : 'Every country') },
    { key: 'commodities', label: 'Commodity scope', value: (r) => (r.commodities.length ? r.commodities.join(', ') : 'Any'), optional: true },
    { key: 'areas', label: 'Operational area scope', value: (r) => (r.areas.length ? r.areas.join(', ') : 'Any'), optional: true },
    { key: 'inScope', label: 'Items in scope', value: (r) => String(itemsFor(r).filter((i) => i.inScope).length) },
    {
      key: 'overdue', label: 'Overdue',
      value: (r) => String(itemsFor(r).filter((i) => i.state !== 'Within period').length),
      render: (r) => {
        const n = itemsFor(r).filter((i) => i.state !== 'Within period').length;
        return <Typography sx={{ fontSize: 12.5, color: n ? tokens.orange : tokens.textPrimary, fontWeight: n ? 600 : 400 }}>{n}</Typography>;
      }
    },
    { key: 'lastRun', label: 'Last run' },
    { key: 'active', label: 'Active', render: (r) => <StatusChip status={r.active ? 'Active' : 'Inactive'} /> },
    {
      key: 'actions', label: '',
      render: (r) => <Button size="small" onClick={(e) => { e.stopPropagation(); setEdit({ ...r }); }}>Open</Button>
    }
  ];

  const last = s.jobRuns[0];

  return (
    <>
      <PageBanner
        title="Automated jobs"
        breadcrumb={['Global', 'C5 Notifications and Alerts', 'Automated jobs']}
        subtitle="WF-C5-02 / Steps 1–3, 7 — time-dependent data kept current by the responsible role rather than by chance"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => setRunOpen(true)}>Run the scheduler now</WhiteButton>
            <WhiteButton onClick={() => setEdit(blank(`JR-${String(s.jobRules.length + 1).padStart(2, '0')}`))}>New job rule</WhiteButton>
            <WhiteButton onClick={() => navigate('/c5/overdue')}>Overdue updates</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <DataTable
          columns={columns} rows={s.jobRules} groupable
          onRowClick={(r) => setEdit({ ...r })}
          emptyMessage="No automated job rules are configured"
          searchPlaceholder="Search job rules"
        />

        <Paper variant="outlined" sx={{ mt: 2 }}>
          <SectionBand>Job run log — WF-C5-02 / Step 7</SectionBand>
          {last && (
            <Grid container spacing={2} sx={{ p: 2, pb: 0 }}>
              <Grid item xs={12} sm={6} md={2}><KpiTile value={last.inScope} label="Items in scope" /></Grid>
              <Grid item xs={12} sm={6} md={2}><KpiTile value={last.skipped} label="Skipped — out of scope" /></Grid>
              <Grid item xs={12} sm={6} md={2}><KpiTile value={last.withinPeriod} label="Within period" tone="good" /></Grid>
              <Grid item xs={12} sm={6} md={2}><KpiTile value={last.newlyOverdue} label="Newly overdue" tone="attention" /></Grid>
              <Grid item xs={12} sm={6} md={2}><KpiTile value={last.escalated} label="Escalated" tone="attention" /></Grid>
              <Grid item xs={12} sm={6} md={2}><KpiTile value={last.notifications} label="Notifications issued" /></Grid>
            </Grid>
          )}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Run</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Job</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Started</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Ended</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Duration</TableCell>
                <TableCell sx={{ fontSize: 12 }}>In scope</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Skipped</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Newly overdue</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Escalated</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Notifications</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Failures</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {s.jobRuns.map((r) => (
                <React.Fragment key={r.id}>
                  <TableRow>
                    <TableCell sx={{ fontSize: 12.5 }}>{r.id}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{r.job}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{r.started}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{r.ended}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{r.durationSeconds}s</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{r.inScope}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{r.skipped}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{r.newlyOverdue}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{r.escalated}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{r.notifications}</TableCell>
                    <TableCell sx={{ fontSize: 12.5, color: r.failures ? tokens.red : tokens.textPrimary }}>{r.failures}</TableCell>
                  </TableRow>
                  {r.note && (
                    <TableRow>
                      <TableCell colSpan={11} sx={{ fontSize: 11.5, color: tokens.textSecondary, pt: 0 }}>{r.note}</TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mb: 1 }}>
              Scope is restricted to active commodities and operational areas in each country, so users are prompted
              only about operations that are actually running and never about historical records. The run states what
              it skipped and why — WF-C5-02 / Step 3.
            </Typography>
            <Stack spacing={1}>
              <HandOffBanner target="C9 / WF-C9-02 Integration and Job Logging" passed="Job start, end, counts and failures — the C9 job log evaluates the run against its expected window and start time" to="/c9/jobs" goLabel="Open the C9 job log" />
              <HandOffBanner target="C11 / WF-C11-01 Running a Report" passed="Outstanding overdue updates, reported through the shared reporting area" />
              <HandOffBanner target="C2 / WF-C2-03 Actions Inbox and Task Management" passed="An overdue-update task for the responsible role, in parallel with the notification" />
            </Stack>
          </Box>
        </Paper>

        <ShellFooterNote />
      </Box>

      <ConfirmDialog
        open={runOpen}
        title="Run the scheduler now"
        body={
          <>
            <Typography sx={{ fontSize: 13 }}>
              One cycle of the time-based evaluation. For each item in scope the elapsed time since the last user
              update is recomputed against the update period, newly overdue items notify the responsible role and
              raise a task, and items still not updated after the escalation period escalate to the escalation role.
            </Typography>
            <Typography sx={{ fontSize: 13, mt: 1 }}>
              The prototype advances the clock by one daily cycle each time you run it, so the progression from
              within period to overdue to escalated can be watched rather than described.
            </Typography>
          </>
        }
        confirmLabel="Run now"
        onClose={() => setRunOpen(false)}
        onConfirm={() => { s.runScheduler(); setRunOpen(false); }}
      />

      <Dialog open={!!edit} onClose={() => setEdit(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>{edit?.id} — automated job rule</DialogTitle>
        <DialogContent>
          {edit && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Data element</InputLabel>
                  <Select label="Data element" value={edit.element} onChange={(e) => setEdit({ ...edit, element: e.target.value })}>
                    {DATA_ELEMENTS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth size="small" type="number" label="Update period" value={edit.periodValue}
                           onChange={(e) => setEdit({ ...edit, periodValue: Math.max(1, Number(e.target.value) || 1) })} />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Unit</InputLabel>
                  <Select label="Unit" value={edit.periodUnit} onChange={(e) => setEdit({ ...edit, periodUnit: e.target.value as JobRule['periodUnit'] })}>
                    <MenuItem value="hours">hours</MenuItem>
                    <MenuItem value="days">days</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Responsible role</InputLabel>
                  <Select label="Responsible role" value={edit.responsibleRole} onChange={(e) => setEdit({ ...edit, responsibleRole: e.target.value })}>
                    {ROLES.map((r) => <MenuItem key={r} value={r}>{roleLabel(r)}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth size="small" type="number" label="Escalation period" value={edit.escalationValue}
                           onChange={(e) => setEdit({ ...edit, escalationValue: Math.max(1, Number(e.target.value) || 1) })} />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Unit</InputLabel>
                  <Select label="Unit" value={edit.escalationUnit} onChange={(e) => setEdit({ ...edit, escalationUnit: e.target.value as JobRule['escalationUnit'] })}>
                    <MenuItem value="hours">hours</MenuItem>
                    <MenuItem value="days">days</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Escalation role</InputLabel>
                  <Select label="Escalation role" value={edit.escalationRole} onChange={(e) => setEdit({ ...edit, escalationRole: e.target.value })}>
                    {ROLES.map((r) => <MenuItem key={r} value={r}>{roleLabel(r)}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Country scope</InputLabel>
                  <Select multiple label="Country scope" value={edit.countries} input={<OutlinedInput label="Country scope" />}
                          onChange={(e) => setEdit({ ...edit, countries: typeof e.target.value === 'string' ? [e.target.value] : e.target.value })}
                          renderValue={(v) => (v.length ? v.join(', ') : 'Every country')}>
                    {COUNTRIES.map((c) => <MenuItem key={c} value={c}><Checkbox size="small" checked={edit.countries.includes(c)} />{c}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Commodity scope</InputLabel>
                  <Select multiple label="Commodity scope" value={edit.commodities} input={<OutlinedInput label="Commodity scope" />}
                          onChange={(e) => setEdit({ ...edit, commodities: typeof e.target.value === 'string' ? [e.target.value] : e.target.value })}
                          renderValue={(v) => (v.length ? v.join(', ') : 'Any')}>
                    {COMMODITIES.map((c) => <MenuItem key={c} value={c}><Checkbox size="small" checked={edit.commodities.includes(c)} />{c}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Operational area scope</InputLabel>
                  <Select multiple label="Operational area scope" value={edit.areas} input={<OutlinedInput label="Operational area scope" />}
                          onChange={(e) => setEdit({ ...edit, areas: typeof e.target.value === 'string' ? [e.target.value] : e.target.value })}
                          renderValue={(v) => (v.length ? v.join(', ') : 'Any')}>
                    {AREAS.map((c) => <MenuItem key={c} value={c}><Checkbox size="small" checked={edit.areas.includes(c)} />{c}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch size="small" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />}
                  label={<Typography sx={{ fontSize: 13 }}>Active</Typography>}
                />
                <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
                  For costing-related elements the responsible roles are sourcing, processing and execution — WF-C5-02 / Step 1.
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdit(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => { if (edit) s.saveJobRule(edit); setEdit(null); }}>Save rule</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

/** 2.4 Overdue Updates — WF-C5-02 / Steps 4–6 */
export const OverdueUpdates: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [confirm, setConfirm] = React.useState<OverdueItem | null>(null);

  const ruleFor = (i: OverdueItem) => s.jobRules.find((r) => r.id === i.ruleId);

  const columns: Column<OverdueItem>[] = [
    { key: 'element', label: 'Data element' },
    { key: 'item', label: 'Item', render: (i) => <Typography sx={{ fontSize: 13 }}>{i.item}</Typography> },
    { key: 'country', label: 'Country' },
    { key: 'scope', label: 'Commodity or area' },
    { key: 'lastUpdated', label: 'Last updated', value: (i) => `${i.lastUpdated} · ${i.lastUpdatedBy}` },
    { key: 'elapsed', label: 'Elapsed', value: (i) => `${i.elapsed} hours` },
    {
      key: 'period', label: 'Update period',
      value: (i) => {
        const r = ruleFor(i);
        return r ? `${r.periodValue} ${r.periodUnit}` : '—';
      }
    },
    {
      key: 'state', label: 'State',
      value: (i) => (i.inScope ? i.state : 'Out of scope'),
      render: (i) => (i.inScope
        ? <StatusChip status={i.state} />
        : <Chip size="small" variant="outlined" label="Out of scope" sx={{ height: 19, fontSize: 10.5 }} />)
    },
    { key: 'responsible', label: 'Responsible' },
    { key: 'escalatedTo', label: 'Escalated to', value: (i) => i.escalatedTo ?? '—' },
    {
      key: 'actions', label: '',
      render: (i) => (
        <Stack direction="row" spacing={0.5}>
          {i.inScope && i.state !== 'Within period' && (
            <Button size="small" onClick={(e) => { e.stopPropagation(); setConfirm(i); }}>Record the update</Button>
          )}
          {i.route && <Button size="small" onClick={(e) => { e.stopPropagation(); navigate(i.route!); }}>Open</Button>}
        </Stack>
      )
    }
  ];

  const inScope = s.overdueItems.filter((i) => i.inScope);
  const outOfScope = s.overdueItems.filter((i) => !i.inScope);
  const overdue = inScope.filter((i) => i.state === 'Overdue — notified');
  const escalated = inScope.filter((i) => i.state === 'Escalated');

  return (
    <>
      <PageBanner
        title="Overdue updates"
        breadcrumb={[s.activeCountry, 'C5 Notifications and Alerts', 'Overdue updates']}
        subtitle="WF-C5-02 / Steps 4–6 — items past their update period, with escalation state and the clock reset on update"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => s.runScheduler()}>Run the scheduler now</WhiteButton>
            <WhiteButton onClick={() => navigate('/c5/jobs')}>Automated jobs</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={inScope.length} label="Items in scope" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={overdue.length} label="Overdue — notified" tone="attention" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={escalated.length} label="Escalated" tone="attention" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={outOfScope.length} label="Out of scope — never prompted" /></Grid>
        </Grid>

        <DataTable
          columns={columns} rows={s.overdueItems} groupable
          emptyMessage="No time-dependent items are configured"
          searchPlaceholder="Search items"
        />

        {outOfScope.length > 0 && (
          <Paper variant="outlined" sx={{ mt: 2 }}>
            <SectionBand>Why some items are never prompted — WF-C5-02 / Step 3</SectionBand>
            <Box sx={{ p: 2 }}>
              {outOfScope.map((i) => (
                <Alert key={i.id} severity="info" sx={{ fontSize: 12.5, mb: 1 }}>
                  <b>{i.item} ({i.country})</b> — last updated {i.lastUpdated}, {i.elapsed} hours ago. {i.outOfScopeReason}
                </Alert>
              ))}
              <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
                An item long out of date is not a prompt if the operation is not running. Both of these would be noise
                on someone's inbox, and the engine declines to raise them.
              </Typography>
            </Box>
          </Paper>
        )}

        <Paper variant="outlined" sx={{ mt: 2 }}>
          <SectionBand>How escalation and the clock reset behave</SectionBand>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 13 }}>
              An item past its update period notifies the responsible role and raises an inbox task. If it is still not
              updated after the escalation period, it escalates to the escalation role. Recording the update resets the
              clock from the new update date and closes the task automatically — WF-C5-02 / Step 6.
            </Typography>
            <PlaceholderNote>
              The prototype advances the clock by one daily cycle on each scheduler run, so the progression can be
              watched. In the built system the scheduler runs on its configured cycle.
            </PlaceholderNote>
          </Box>
        </Paper>

        <ShellFooterNote />
      </Box>

      <ConfirmDialog
        open={!!confirm}
        title={`Record the update — ${confirm?.item ?? ''}`}
        body={
          <Typography sx={{ fontSize: 13 }}>
            Recording the update sets the last-updated date to now, resets the elapsed clock, clears the escalation and
            closes the inbox task automatically. The update period for this item is
            {' '}{confirm ? `${ruleFor(confirm)?.periodValue} ${ruleFor(confirm)?.periodUnit}` : '—'}
            {confirm ? ` (${periodHours(ruleFor(confirm)?.periodValue ?? 0, ruleFor(confirm)?.periodUnit ?? 'hours')} hours).` : '.'}
          </Typography>
        }
        confirmLabel="Record the update"
        onClose={() => setConfirm(null)}
        onConfirm={() => { if (confirm) s.recordItemUpdate(confirm.id); setConfirm(null); }}
      />
    </>
  );
};
