import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper,
  Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import { EmptyState, HandOffBanner, PageBanner, PlaceholderNote, SectionBand, StatusChip, WhiteButton } from '../../components/shared';
import { ChartFrame, DataTableView, KpiTile } from '../../components/Charts';
import { FAILURE_CASES, MEASURES, Measure, MONITORING_TOOLING_NOTE, SUPPORT_MODEL_NOTE } from '../../mockData/c9';
import { ShellFooterNote } from '../../layouts/AppShell';

const stateColour = (s: string) =>
  s === 'Within threshold' || s === 'Healthy' ? tokens.green
    : s === 'Breached' || s === 'In outage' ? tokens.red
      : tokens.amber;

/**
 * 3.2 Administration Health Dashboard — WF-C9-03 / Step 3.
 * The five bands are the five things the workflow names, in that order. Everything
 * on the screen is a live read of the stores the rest of the module writes.
 */
export const HealthDashboard: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [showTiles, setShowTiles] = React.useState(false);
  const bands = s.healthBands();

  return (
    <>
      <PageBanner
        title="System health"
        breadcrumb={['Global', 'C9 Logging and Monitoring', 'System health']}
        subtitle="WF-C9-03 / Step 3 — system health, failed logins, integration status, job status and open incidents"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c9/incidents')}>Incidents</WhiteButton>
            <WhiteButton onClick={() => navigate('/c9/exchanges')}>Exchange log</WhiteButton>
            <WhiteButton onClick={() => navigate('/c9/jobs')}>Job log</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
          C8 records business activity and is evidential: an audit entry cannot be edited or deleted by any role.
          C9 records technical activity — errors, exchanges, jobs, health and performance — and is diagnostic: a log
          entry is masked as it is written, rotated, and recycled under policy. The two stores are deliberately separate.
        </Alert>

        {/* Band 1 — system health */}
        <ChartFrame
          title="System health — WF-C9-03 / Steps 1–2"
          note="Each measure is evaluated against the threshold defined for it. A value in warning is recorded without alerting; a critical breach alerts the support team."
          tableToggle={
            <Button size="small" sx={{ mt: 1 }} onClick={() => setShowTiles((v) => !v)}>
              {showTiles ? 'Hide table' : 'Show as table'}
            </Button>
          }
        >
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
            {bands.tiles.map((t) => (
              <Box key={t.measure} sx={{ cursor: 'pointer' }} onClick={() => navigate('/c9/thresholds')}>
                <KpiTile
                  value={`${t.value} ${t.unit.split(' ')[0]}`}
                  label={t.measure}
                  sub={`Threshold ${t.threshold} — ${t.state}`}
                  tone={t.state === 'Within threshold' ? 'good' : t.state === 'Breached' ? 'attention' : 'primary'}
                />
              </Box>
            ))}
          </Stack>
          {showTiles && (
            <Box sx={{ mt: 2 }}>
              <DataTableView
                head={['Measure', 'Current value', 'Unit', 'Critical threshold', 'State']}
                rows={bands.tiles.map((t) => [t.measure, t.value, t.unit, t.threshold, t.state])}
              />
            </Box>
          )}
        </ChartFrame>
        <PlaceholderNote>{MONITORING_TOOLING_NOTE}</PlaceholderNote>

        {/* Band 2 — failed logins */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Failed sign-in attempts, last 24 hours — WF-C9-03 / Step 3</SectionBand>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={3} alignItems="baseline" sx={{ mb: 1.5, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 30, fontWeight: 500 }}>{bands.failedLoginTotal}</Typography>
              <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
                attempts across all countries. The <b>at scale</b> definition behind the
                {' '}<i>Authentication failure at scale</i> classification is {bands.atScale.attempts} attempts
                within {bands.atScale.windowMinutes} minutes — the one C01 signal that is a technical measure.
              </Typography>
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Country</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Failed attempts</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bands.failedLogins.map((f) => (
                  <TableRow key={f.country}>
                    <TableCell sx={{ fontSize: 12.5 }}>{f.country}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{f.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>

        {/* Band 3 — integration status */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Integration status — WF-C9-02 / Step 6</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Interface</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Last exchange</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Outcome</TableCell>
                <TableCell sx={{ fontSize: 12 }}>In error queue</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Average response</TableCell>
                <TableCell sx={{ fontSize: 12 }}>State</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bands.interfaces.map((i) => (
                <TableRow key={i.interfaceName} hover sx={{ cursor: 'pointer' }} onClick={() => navigate('/c9/exchanges')}>
                  <TableCell sx={{ fontSize: 12.5 }}>{i.interfaceName}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{i.last ?? '—'}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{i.outcome ?? '—'}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{i.queued}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{i.avgMs} ms</TableCell>
                  <TableCell>
                    <Chip size="small" label={i.state}
                          sx={{ fontSize: 11, bgcolor: `${stateColour(i.state)}1A`, color: stateColour(i.state) }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        {/* Band 4 — job status */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Job status — WF-C9-02 / Steps 5–6</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Job</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Last run</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Outcome</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Schedule</TableCell>
                <TableCell sx={{ fontSize: 12 }}>State</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* A job that should have run and has not is the silent failure Step 6 refers to, so it is shown first. */}
              {[...bands.jobs].sort((a, b) => Number(b.overdue) - Number(a.overdue)).map((j) => (
                <TableRow key={j.job} hover sx={{ cursor: 'pointer' }} onClick={() => navigate('/c9/jobs')}>
                  <TableCell sx={{ fontSize: 12.5 }}>{j.job}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{j.last?.started ?? 'No run recorded'}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{j.last?.outcome ?? '—'}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{j.nextExpected}</TableCell>
                  <TableCell>
                    {j.overdue
                      ? <Chip size="small" label="Did not start — overdue" sx={{ fontSize: 11, bgcolor: `${tokens.red}1A`, color: tokens.red }} />
                      : <Chip size="small" label="On schedule" sx={{ fontSize: 11, bgcolor: `${tokens.green}1A`, color: tokens.green }} />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        {/* Band 5 — open incidents */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Open incidents — WF-C9-01 / Steps 3, 6–7</SectionBand>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
              <KpiTile value={bands.incidents.open} label="Open incidents" tone="primary" />
              <KpiTile value={bands.incidents.critical} label="Critical" tone="attention" />
              <KpiTile value={bands.incidents.recurring} label="Recurring" tone="attention" />
              <KpiTile value={bands.incidents.unassigned} label="Unassigned" tone="primary" />
            </Stack>
            <Typography sx={{ fontSize: 12.5, mt: 2, color: tokens.textSecondary }}>
              {bands.incidents.oldest
                ? <>Oldest open incident: <b>{bands.incidents.oldest.errorRef}</b> — {bands.incidents.oldest.classification},
                  first seen {bands.incidents.oldest.firstSeen}.</>
                : 'No incident is open.'}
            </Typography>
            <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/c9/incidents')}>Open the incident register</Button>
          </Box>
        </Paper>

        <HandOffBanner
          label="HAND-OFF"
          target="C11 / WF-C11-02 Dashboards and Scheduled Distribution"
          passed="System health, failed logins, integration status, job status and open incidents belong on the C11 administration dashboard. C11 now registers them as report R-09, computed from these same stores rather than re-derived — this screen stays because support wants it where they work."
          to="/c11/reports/R-09"
          goLabel="Open R-09 in the reporting area"
        />

        <PrototypeControls />
        <ShellFooterNote />
      </Box>
      <FriendlyErrorDialog />
    </>
  );
};

/**
 * A prototype cannot fail on demand, and a monitoring screen with no movement
 * demonstrates nothing. These controls drive real state: a log entry, an incident,
 * the friendly dialog, the classification and — where critical — the C05 alert.
 */
export const PrototypeControls: React.FC = () => {
  const s = useStore();
  const [failure, setFailure] = React.useState(FAILURE_CASES[1].key);
  const [measure, setMeasure] = React.useState<Measure>('Queue depth');

  return (
    <Paper variant="outlined" sx={{ mt: 2, borderStyle: 'dashed', borderWidth: 2, borderColor: tokens.orange }}>
      <Box sx={{ px: 2, py: 1, bgcolor: `${tokens.orange}12` }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: tokens.orange }}>
          Prototype control — not a product feature
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
          A prototype does not fail on its own, so these controls raise real failures and real breaches. Each one runs the
          whole chain described in the workflow rather than staging a screenshot.
        </Typography>
      </Box>
      <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Select size="small" value={failure} inputProps={{ 'aria-label': 'Failure case' }}
                onChange={(e) => setFailure(e.target.value)} sx={{ minWidth: 320 }}>
          {FAILURE_CASES.map((f) => <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>)}
        </Select>
        <Button variant="outlined" color="warning" onClick={() => s.simulateFailure(failure)}>Simulate a failure</Button>
        <Select size="small" value={measure} inputProps={{ 'aria-label': 'Measure to breach' }}
                onChange={(e) => setMeasure(e.target.value as Measure)} sx={{ minWidth: 180 }}>
          {MEASURES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
        </Select>
        <Button variant="outlined" color="warning" onClick={() => s.simulateBreach(measure)}>Simulate a breach</Button>
      </Box>
    </Paper>
  );
};

/**
 * 1.2 Friendly Error with Reference — WF-C9-01 / Step 4.
 * The message carries the reference so a support call can be tied to the logged
 * event; it deliberately carries nothing else. The technical detail is one screen
 * away, for one audience.
 */
export const FriendlyErrorDialog: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const e = s.lastError;
  const isSupport = !!s.currentUser
    && s.currentUser.assignments.some((a) => a.status === 'Active'
      && ['SYSTEM_ADMINISTRATOR', 'COMPLIANCE_OFFICER'].includes(a.role));

  if (!e) return null;
  return (
    <Dialog open onClose={s.clearLastError} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 18 }}>Something went wrong</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 14 }}>{e.friendly}</Typography>
        <Box sx={{ mt: 2, p: 1.5, border: `1px solid ${tokens.border}`, bgcolor: '#FAFBFC' }}>
          <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>Error reference</Typography>
          <Typography sx={{ fontFamily: 'monospace', fontSize: 16 }}>{e.errorRef}</Typography>
        </Box>
        <Typography sx={{ fontSize: 12.5, mt: 1.5, color: tokens.textSecondary }}>
          Quote this reference when you contact support.
        </Typography>
        {isSupport && (
          <Alert severity="info" sx={{ mt: 2, fontSize: 12 }}>
            Visible because you hold the support role — the technical detail, stack trace and classification are on the
            incident. No other role sees this line, and the dialog itself never carries technical internals.
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={() => navigator.clipboard?.writeText(e.errorRef)}>Copy reference</Button>
        {isSupport && (
          <Button variant="outlined" onClick={() => { s.clearLastError(); navigate(`/c9/incidents/${e.incidentId}`); }}>
            Open the incident
          </Button>
        )}
        <Button variant="contained" onClick={s.clearLastError}>Return to dashboard</Button>
      </DialogActions>
    </Dialog>
  );
};

export const HealthEmpty: React.FC = () => <EmptyState message="Nothing to show." />;
export const StateChip: React.FC<{ state: string }> = ({ state }) => <StatusChip status={state} />;
