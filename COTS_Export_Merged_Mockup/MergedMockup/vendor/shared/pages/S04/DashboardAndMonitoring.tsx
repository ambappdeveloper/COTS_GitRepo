import React from 'react';
import {
  Alert, Box, Button, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { BottomBar, HandOffBanner, SectionCard, StatusChip, TraceNote } from '../../components/shared';
import { useStore } from '../../state/store';
import { useS04 } from '../../state/s04store';
import { useS05 } from '../../state/s05store';
import { useS03 } from '../../state/s03store';
import { DUTIES, WEIGHT_VARIANCE_TREND } from '../../mockData/s04';
import { COLORS } from '../../theme';

/* ------------------------------------------------- S04-SC-01 dashboard */

export function ComplianceDashboard() {
  const { country } = useStore();
  const { cases, cycles, incidents } = useS04();

  const byStatus = (s: string) => cases.filter((c) => c.status === s).length;
  const openCases = cases.filter((c) => c.status !== 'Closed').length;
  const cyc = cycles[0];
  const overdueActions = cyc ? cyc.actions.filter((a) => a.status !== 'Done').length : 0;
  const openIncidents = incidents.filter((i) => !i.status.startsWith('Closed')).length;
  const reqOutstanding = incidents.reduce((a, i) => a + i.requirements.filter((r) => !r.provided).length, 0);
  const overdueDuties = DUTIES.filter((d) => d.state !== 'On cycle').length;
  const trend = WEIGHT_VARIANCE_TREND[WEIGHT_VARIANCE_TREND.length - 1];

  const cards = [
    {
      title: 'Open variance cases',
      to: '/s04/cases',
      lines: [
        ['Total open', String(openCases)],
        ['Evidence incomplete / created', String(byStatus('Created') + byStatus('Evidence incomplete'))],
        ['Pending Compliance Manager', String(byStatus('Pending Compliance Manager'))],
        ['Pending Head of Department', String(byStatus('Pending Head of Department'))],
        ['Pending Finance Manager', String(byStatus('Pending Finance Manager'))],
        ['Awaiting ERP confirmation', String(byStatus('Awaiting ERP confirmation'))],
      ] as [string, string][],
    },
    {
      title: 'Reconciliation',
      to: '/s04/reconciliation',
      lines: [
        ['Current cycle', cyc ? `${cyc.week} · ${cyc.status}` : '—'],
        ['Open action items', String(overdueActions)],
        ['Reports downloaded', cyc ? `${cyc.downloaded.length} of 4` : '—'],
      ] as [string, string][],
    },
    {
      title: 'Insurance',
      to: '/s04/insurance',
      lines: [
        ['Open incidents', String(openIncidents)],
        ['Requirements outstanding', String(reqOutstanding)],
        ['Awaiting compensation', String(incidents.filter((i) => i.status === 'Follow-up submitted').length)],
      ] as [string, string][],
    },
    {
      title: 'Monitoring duties',
      to: '/s04/monitoring',
      lines: [
        ['Duties tracked', String(DUTIES.length)],
        ['Due or overdue', String(overdueDuties)],
      ] as [string, string][],
    },
    {
      title: 'Trend',
      to: '/s04/reconciliation',
      lines: [
        ['Receiving variance', `${trend.receiving.toFixed(2)} %`],
        ['Loading variance', `${trend.loading.toFixed(2)} %`],
        ['Direction', 'Rising'],
      ] as [string, string][],
    },
  ];

  return (
    <AppShell title="Compliance" breadcrumb={[country, 'Shared Modules', 'Compliance']}>
      <SectionCard title="S04-SC-01 — Compliance dashboard">
        <TraceNote workflow="WF-S04-04 / Step 9 — open cases, overdue action items, monitoring duties and the variance trend" />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 2 }}>
          {cards.map((c) => (
            <Paper key={c.title} variant="outlined" sx={{ borderColor: COLORS.border }}>
              <Box sx={{ px: 1.5, py: 0.75, bgcolor: '#F7F8F9', borderBottom: `1px solid ${COLORS.border}` }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>
                  {c.title.toUpperCase()}
                </Typography>
              </Box>
              <Box sx={{ px: 1.5, py: 1 }}>
                {c.lines.map(([k, v]) => (
                  <Stack key={k} direction="row" justifyContent="space-between" sx={{ py: 0.3 }}>
                    <Typography variant="caption" color="text.secondary">{k}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{v}</Typography>
                  </Stack>
                ))}
                <Button size="small" component={Link} to={c.to} sx={{ mt: 1 }} fullWidth variant="outlined">Open</Button>
              </Box>
            </Paper>
          ))}
        </Box>
        <Alert severity="info" icon={false} sx={{ mt: 2, fontSize: '0.82rem' }}>
          Every difference is a <b>case</b> — with an owner, an evidence set, an approval route and a confirmed ERP
          transaction. Not a report line.
        </Alert>
      </SectionCard>

      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" component={Link} to="/s04/cases">Variance cases</Button>
        <Button size="small" variant="outlined" component={Link} to="/s04/reconciliation">Reconciliation</Button>
        <Button size="small" variant="outlined" component={Link} to="/s04/insurance">Insurance</Button>
        <Button size="small" variant="outlined" component={Link} to="/s04/monitoring">Monitoring duties</Button>
      </Stack>
    </AppShell>
  );
}

/* ------------------------------------------- S04-SC-20 monitoring duties board */

export function MonitoringDuties() {
  const { country, say } = useStore();
  const { movements } = useS05();
  const { ncs } = useS03();
  const [expanded, setExpanded] = React.useState<string | null>('D2');

  const measurable = movements.filter((m) => m.loadedMt != null && m.receivedMt != null);
  const notMeasurable = movements.filter((m) => m.loadedMt == null || m.receivedMt == null);
  const openNcs = ncs.filter((n) => n.status !== 'Closed');

  return (
    <AppShell title="Ongoing Compliance Monitoring" breadcrumb={[country, 'Compliance', 'Monitoring duties']}>
      <SectionCard title="S04-SC-20 — Monitoring duties board">
        <TraceNote workflow="WF-S04-04 / Steps 1–8 — each monitoring duty is a tracked activity with an owner and a due cycle, prompted by automated jobs, rather than a periodic manual exercise" />
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Duty', 'Source of the numbers', 'Owner', 'Cycle', 'Last performed', 'State', 'Step', ''].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {DUTIES.map((d) => (
              <React.Fragment key={d.id}>
                <TableRow hover sx={{ bgcolor: d.state === 'Overdue' ? '#FFF7E6' : undefined }}>
                  <TableCell sx={{ fontWeight: 600 }}>{d.duty}</TableCell>
                  <TableCell><Typography variant="caption">{d.source}</Typography></TableCell>
                  <TableCell>{d.owner}</TableCell>
                  <TableCell>{d.cycle}</TableCell>
                  <TableCell>{d.lastPerformed}</TableCell>
                  <TableCell>
                    <Chip
                      size="small" label={d.state}
                      sx={{
                        height: 20, color: '#fff',
                        bgcolor: d.state === 'Overdue' ? COLORS.attention : d.state === 'Due' ? COLORS.progress : COLORS.good,
                      }}
                    />
                  </TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">{d.step}</Typography></TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      {d.panel && (
                        <Button size="small" onClick={() => setExpanded(expanded === d.id ? null : d.id)}>
                          {expanded === d.id ? 'Hide source' : 'Show source'}
                        </Button>
                      )}
                      <Button size="small" variant="outlined" component={Link} to="/s04/cases">Raise case</Button>
                    </Stack>
                  </TableCell>
                </TableRow>

                {d.panel === 'loadReceive' && expanded === d.id && (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ bgcolor: '#F7F8F9' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary, display: 'block', mb: 1 }}>
                        SOURCE — S05 MOVEMENTS. Compliance never shows a variance without the movements it came from.
                      </Typography>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {['Movement', 'Route', 'Loaded (MT)', 'Received (MT)', 'Variance', 'Trips', 'Loss per trip'].map((h) => (
                              <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {measurable.map((m) => {
                            const v = (m.receivedMt as number) - (m.loadedMt as number);
                            const trips = m.trips.length || m.days.reduce((a, x) => a + x.trips, 0) || 1;
                            return (
                              <TableRow key={m.id}>
                                <TableCell>
                                  <Link to={`/s05/movement/${m.id}`} style={{ color: COLORS.primary, fontWeight: 600 }}>{m.id}</Link>
                                </TableCell>
                                <TableCell>{m.origin} → {m.destination}</TableCell>
                                <TableCell align="right">{m.loadedMt}</TableCell>
                                <TableCell align="right">{m.receivedMt}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600, color: v < 0 ? COLORS.bad : COLORS.good }}>
                                  {v.toFixed(1)}
                                </TableCell>
                                <TableCell align="right">{trips}</TableCell>
                                <TableCell align="right">{(v / trips).toFixed(2)}</TableCell>
                              </TableRow>
                            );
                          })}
                          {notMeasurable.map((m) => (
                            <TableRow key={m.id} sx={{ opacity: 0.6 }}>
                              <TableCell>
                                <Link to={`/s05/movement/${m.id}`} style={{ color: COLORS.primary, fontWeight: 600 }}>{m.id}</Link>
                              </TableCell>
                              <TableCell>{m.origin} → {m.destination}</TableCell>
                              <TableCell align="right">{m.loadedMt ?? '—'}</TableCell>
                              <TableCell align="right">{m.receivedMt ?? '—'}</TableCell>
                              <TableCell colSpan={3}>
                                <Typography variant="caption" sx={{ color: COLORS.attention }}>
                                  Not measurable — both quantities must be captured at movement level in S05
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <HandOffBanner
                        to="S05 Logistics / WF-S05-02"
                        passes="nothing — S04 consumes"
                        returns="loaded and received quantities, trip records"
                        resumes="the variance is only measurable if both quantities are captured in S05"
                        linkLabel="Open movements"
                        linkTo="/s05"
                      />
                    </TableCell>
                  </TableRow>
                )}

                {d.panel === 'nonConformity' && expanded === d.id && (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ bgcolor: '#F7F8F9' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary, display: 'block', mb: 1 }}>
                        SOURCE — S03 NON-CONFORMITIES. Follow-up status only; S04 does not repeat the S03 investigation.
                      </Typography>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {['Non-conformity', 'Description', 'Actions done', 'Status', 'Blocked'].map((h) => (
                              <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {openNcs.map((n) => (
                            <TableRow key={n.id}>
                              <TableCell>
                                <Link to={`/s03/nc/${n.id}`} style={{ color: COLORS.primary, fontWeight: 600 }}>{n.id}</Link>
                              </TableCell>
                              <TableCell sx={{ maxWidth: 320 }}>
                                <Typography variant="caption">{n.description.slice(0, 90)}…</Typography>
                              </TableCell>
                              <TableCell>
                                {n.actions.filter((a) => a.status === 'Done').length} of {n.actions.length}
                              </TableCell>
                              <TableCell><StatusChip status="Open" /></TableCell>
                              <TableCell>
                                <Chip size="small" label={n.blockScope} sx={{ height: 18, bgcolor: COLORS.attention, color: '#fff' }} />
                              </TableCell>
                            </TableRow>
                          ))}
                          {openNcs.length === 0 && (
                            <TableRow><TableCell colSpan={5}><Typography variant="body2" color="text.secondary">No open non-conformities</Typography></TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                      <Alert severity="info" icon={false} sx={{ mt: 1, fontSize: '0.78rem' }}>
                        S04 tracks the progress of the corrective actions and chases the owner. The finding, the
                        corrective actions and their closure stay in S03.
                      </Alert>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>

        <Alert severity="info" icon={false} sx={{ mt: 2, fontSize: '0.8rem' }}>
          Where any monitoring activity identifies a variance requiring adjustment, compliance raise a case and carry
          it through the case process (WF-S04-01) with its analysis, review and required approvals.
        </Alert>
      </SectionCard>

      <BottomBar>
        <Button component={Link} to="/s04" variant="outlined">Back to the compliance dashboard</Button>
        <Button variant="contained" onClick={() => say('Monitoring duty recorded as performed for this cycle')}>
          Record duty performed
        </Button>
      </BottomBar>
    </AppShell>
  );
}
