import React from 'react';
import {
  Alert, Box, Button, Chip, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  EmptyState, HandOffBanner, PageBanner, PlaceholderNote, SectionBand, StatusChip, WhiteButton
} from '../../components/shared';
import { JOB_NAMES, JobName, SUPPORT_MODEL_NOTE } from '../../mockData/c9';
import { APPROVER_REGISTER } from '../../mockData/c4';
import { ShellFooterNote } from '../../layouts/AppShell';
import { FriendlyErrorDialog } from './Health';

const OWNERS = Array.from(new Set(APPROVER_REGISTER.map((a) => a.user)));

const outcomeColour = (o: string) =>
  o === 'Completed' ? tokens.green
    : o === 'Failed' || o === 'Did not start' ? tokens.red
      : tokens.amber;

/** 2.4 Job Log — WF-C9-02 / Steps 4, 5, 6 */
export const JobLog: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [selected, setSelected] = React.useState<JobName>('Notification evaluation');
  const cfg = s.jobConfigs.find((c) => c.job === selected);
  const [window, setWindow] = React.useState(String(cfg?.windowSeconds ?? 10));
  const [threshold, setThreshold] = React.useState(String(cfg?.repeatedFailureThreshold ?? 2));
  const [owner, setOwner] = React.useState(cfg?.owner ?? OWNERS[0]);

  React.useEffect(() => {
    const c = s.jobConfigs.find((x) => x.job === selected);
    if (c) { setWindow(String(c.windowSeconds)); setThreshold(String(c.repeatedFailureThreshold)); setOwner(c.owner); }
  }, [selected, s.jobConfigs]);

  const missed = s.missedJobsToday();

  return (
    <>
      <PageBanner
        title="Job log"
        breadcrumb={['Global', 'C9 Logging and Monitoring', 'Job log']}
        subtitle="WF-C9-02 / Steps 4–6 — start, end, duration, items processed, skipped and failures, evaluated against the expected behaviour"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c5/jobs')}>C05 automated jobs</WhiteButton>
            <WhiteButton onClick={() => navigate('/c9')}>System health</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        {missed.length > 0 && (
          <Alert severity="error" sx={{ mb: 2, fontSize: 13 }}>
            <b>{missed.map((m) => m.job).join(', ')}</b> should have started at{' '}
            {missed.map((m) => m.expectedStart).join(', ')} and no run is recorded.
            A job that does not start is the silent failure Step 6 refers to — the mode that is easiest to miss, so it is
            shown first here and on the health dashboard.
          </Alert>
        )}

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>{`Runs — ${s.jobRunsC9.length}`}</SectionBand>
          {s.jobRunsC9.length === 0 ? <EmptyState message="No run has been recorded." /> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Run</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Job</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Started</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Ended</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Duration / window</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>Processed</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>Skipped</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>Failures</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Outcome</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Alert</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Triggered by</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {s.jobRunsC9.map((r) => {
                  const c = s.jobConfigs.find((x) => x.job === r.job);
                  return (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ fontSize: 12.5, fontFamily: 'monospace' }}>{r.id}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{r.job}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{r.started}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{r.ended ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {r.durationSeconds ?? '—'} s <span style={{ color: tokens.textSecondary }}>/ {c?.windowSeconds ?? '—'} s</span>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>{r.processed}</TableCell>
                      <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>{r.skipped}</TableCell>
                      <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>{r.failures}</TableCell>
                      <TableCell>
                        <Chip size="small" label={r.outcome}
                              sx={{ fontSize: 11, bgcolor: `${outcomeColour(r.outcome)}1A`, color: outcomeColour(r.outcome) }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {r.alertRaised
                          ? <Button size="small" onClick={() => navigate('/c5/deliveries')}>Raised</Button>
                          : '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{r.triggeredBy}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
              The outcome is derived by comparing each run against the expected window and the expected start time, not
              asserted on the row. Notes on individual runs explain what the counts mean.
            </Typography>
            {s.jobRunsC9.filter((r) => r.note).map((r) => (
              <Typography key={r.id} sx={{ fontSize: 11.5, color: tokens.textSecondary, mt: 0.5 }}>
                <b>{r.id}</b> — {r.note}
              </Typography>
            ))}
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Job configuration — the expected behaviour a run is measured against</SectionBand>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 240 }}>
                <InputLabel>Job</InputLabel>
                <Select label="Job" value={selected} onChange={(e) => setSelected(e.target.value as JobName)}>
                  {JOB_NAMES.map((j) => <MenuItem key={j} value={j}>{j}</MenuItem>)}
                </Select>
              </FormControl>
              <Typography sx={{ fontSize: 12.5 }}>
                Schedule: <b>{cfg?.schedule}</b> · module <b>{cfg?.module}</b>
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 2, alignItems: 'center' }}>
              <TextField size="small" label="Expected duration window (seconds)" value={window}
                         onChange={(e) => setWindow(e.target.value)} sx={{ width: 240 }} />
              <TextField size="small" label="Repeated-failure threshold" value={threshold}
                         onChange={(e) => setThreshold(e.target.value)} sx={{ width: 220 }} />
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Owner</InputLabel>
                <Select label="Owner" value={owner} onChange={(e) => setOwner(e.target.value)}>
                  {OWNERS.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </Select>
              </FormControl>
              <Button variant="outlined" onClick={() => s.saveJobConfig(selected, {
                windowSeconds: Number(window) || 0,
                repeatedFailureThreshold: Number(threshold) || 1,
                owner
              })}>
                Save configuration
              </Button>
            </Stack>
            <Typography sx={{ fontSize: 12.5, mt: 2 }}>
              Alerts on: {cfg?.alertOn.join(', ')}. The owner is accountable for the job and is distinct from the recipient
              of the alert.
            </Typography>
            <PlaceholderNote>{SUPPORT_MODEL_NOTE}</PlaceholderNote>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Run a job now</SectionBand>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12.5, mb: 1.5 }}>
              Where the job belongs to another module, this runs <i>that module's</i> job: running the notification
              evaluation runs the C05 scheduler, and running the expiry check runs the C07 expiry check. The job log is a
              view of what those modules do, not a simulation of it.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              {JOB_NAMES.map((j) => (
                <Button key={j} variant="outlined" size="small" onClick={() => s.runJobNow(j)}>{j}</Button>
              ))}
            </Stack>
          </Box>
        </Paper>

        <HandOffBanner
          label="HAND-OFF"
          target="C5 / WF-C5-01 Event-Driven Notifications"
          passed="Job failure, non-start and overrun alerts are raised to the support team through C05 rule NR-13."
        />
        <HandOffBanner
          label="HAND-OFF"
          target="C11 / WF-C11-02 Dashboards and Scheduled Distribution"
          passed="Integration and job health belongs on the C11 administration dashboard so that a silent failure is visible before the business discovers it. C11 registers it as report R-09, reading these same stores."
          to="/c11/reports/R-09"
          goLabel="Open R-09"
        />
        <ShellFooterNote />
      </Box>
      <FriendlyErrorDialog />
    </>
  );
};
