import React from 'react';
import {
  Alert, Box, Button, Chip, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  EmptyState, HandOffBanner, PageBanner, PlaceholderNote, SectionBand, WhiteButton
} from '../../components/shared';
import { MONITORING_TOOLING_NOTE, SUPPORT_MODEL_NOTE, SUPPORT_GROUP, thresholdState } from '../../mockData/c9';
import { ShellFooterNote } from '../../layouts/AppShell';
import { FriendlyErrorDialog, PrototypeControls } from './Health';

const WINDOWS = [5, 15, 60];
const stateColour = (s: string) => (s === 'Within threshold' ? tokens.green : s === 'Breached' ? tokens.red : tokens.amber);

/** 3.1 Monitoring Thresholds — WF-C9-03 / Steps 1–2 */
export const MonitoringThresholds: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();

  return (
    <>
      <PageBanner
        title="Monitoring thresholds"
        breadcrumb={['Global', 'C9 Logging and Monitoring', 'Monitoring thresholds']}
        subtitle="WF-C9-03 / Steps 1–2 — availability, response time, error rate and queue depth, each evaluated against its threshold"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c9')}>System health</WhiteButton>
            <WhiteButton onClick={() => navigate('/c5/deliveries')}>C05 delivery log</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <PlaceholderNote>{MONITORING_TOOLING_NOTE}</PlaceholderNote>
        <PlaceholderNote>{SUPPORT_MODEL_NOTE} This screen is where the recipient is actually chosen.</PlaceholderNote>

        <Paper variant="outlined" sx={{ mb: 2, mt: 2 }}>
          <SectionBand>Thresholds per measure — WF-C9-03 / Steps 1–2</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Measure</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Scope</TableCell>
                <TableCell sx={{ fontSize: 12, width: 130 }}>Warning</TableCell>
                <TableCell sx={{ fontSize: 12, width: 130 }}>Critical</TableCell>
                <TableCell sx={{ fontSize: 12, width: 150 }}>Evaluation window</TableCell>
                <TableCell sx={{ fontSize: 12, width: 130 }}>Breaches before alert</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Alert recipients</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Current value</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Last breach</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {s.thresholds.map((t) => {
                const state = thresholdState(t);
                const last = s.breaches.find((b) => b.measure === t.measure);
                return (
                  <TableRow key={t.measure}>
                    <TableCell sx={{ fontSize: 12.5 }}>{t.measure}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{t.scope}</TableCell>
                    <TableCell>
                      <TextField size="small" value={t.warning} sx={{ width: 100 }}
                                 inputProps={{ 'aria-label': `${t.measure} warning threshold` }}
                                 onChange={(e) => s.saveThreshold(t.measure, { warning: Number(e.target.value) || 0 })} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" value={t.critical} sx={{ width: 100 }}
                                 inputProps={{ 'aria-label': `${t.measure} critical threshold` }}
                                 onChange={(e) => s.saveThreshold(t.measure, { critical: Number(e.target.value) || 0 })} />
                    </TableCell>
                    <TableCell>
                      <Select size="small" fullWidth value={t.windowMinutes}
                              inputProps={{ 'aria-label': `${t.measure} evaluation window` }}
                              onChange={(e) => s.saveThreshold(t.measure, { windowMinutes: Number(e.target.value) })}>
                        {WINDOWS.map((w) => <MenuItem key={w} value={w} sx={{ fontSize: 13 }}>{w === 60 ? '1 hour' : `${w} minutes`}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <TextField size="small" value={t.consecutiveBeforeAlert} sx={{ width: 80 }}
                                 inputProps={{ 'aria-label': `${t.measure} consecutive breaches` }}
                                 onChange={(e) => s.saveThreshold(t.measure, { consecutiveBeforeAlert: Number(e.target.value) || 1 })} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{t.recipients.join(', ')}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography sx={{ fontSize: 12.5 }}>{t.current} {t.unit}</Typography>
                        <Chip size="small" label={state}
                              sx={{ fontSize: 11, bgcolor: `${stateColour(state)}1A`, color: stateColour(state) }} />
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>
                      {last ? `${last.started}${last.durationMinutes ? ` — ${last.durationMinutes} min` : ''}` : 'None recorded'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
              Availability breaches when the value falls below its threshold; the other three when the value rises above.
              The evaluation window exists so that a single slow response is not an incident, and the consecutive-breach
              setting suppresses flapping.
            </Typography>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Breach history — a breach is recorded whether or not it alerts</SectionBand>
          {s.breaches.length === 0 ? <EmptyState message="No breach has been recorded." /> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Breach</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Measure</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Value</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Threshold</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Level</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Started</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Ended</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Duration</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Alert</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {s.breaches.map((b) => (
                  <TableRow key={b.id} hover>
                    <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{b.id}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{b.measure}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{b.value}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{b.threshold}</TableCell>
                    <TableCell>
                      <Chip size="small" label={b.level}
                            sx={{ fontSize: 11, bgcolor: b.level === 'Critical' ? `${tokens.red}1A` : `${tokens.amber}1A`, color: b.level === 'Critical' ? tokens.red : tokens.amber }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{b.started}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{b.ended ?? 'Open'}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{b.durationMinutes ? `${b.durationMinutes} min` : '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {b.alertRaised
                        ? <Button size="small" onClick={() => navigate('/c5/deliveries')}>Raised</Button>
                        : <span title={b.suppressedReason}>Not raised</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Box sx={{ px: 2, py: 1.5 }}>
            {s.breaches.filter((b) => b.suppressedReason).map((b) => (
              <Typography key={b.id} sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
                <b>{b.id}</b> — {b.suppressedReason}
              </Typography>
            ))}
          </Box>
        </Paper>

        <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
          Two of the seeded breaches are deliberately instructive: one breached the warning threshold and correctly did not
          alert, and one breached the critical threshold twice within the evaluation window and so alerted only on the
          second — the suppression setting demonstrated rather than described.
        </Alert>

        <HandOffBanner
          label="HAND-OFF"
          target="C5 / WF-C5-01 Event-Driven Notifications"
          passed={`A threshold breach alert is raised to ${SUPPORT_GROUP} through C05 rule NR-14, and the delivery is visible in the C05 delivery log like any other notification.`}
        />
        <PrototypeControls />
        <ShellFooterNote />
      </Box>
      <FriendlyErrorDialog />
    </>
  );
};
