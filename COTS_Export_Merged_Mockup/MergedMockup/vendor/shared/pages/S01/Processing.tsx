import React from 'react';
import {
  Alert, Box, Button, Checkbox, FormControlLabel, Paper, Stack, Switch, Table, TableBody, TableCell,
  TableHead, TableRow, Typography, Chip, MenuItem, Select,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import {
  BottomBar, BusinessConfirmation, HandOffBanner, InfoCardStrip, SectionCard, TraceNote,
} from '../../components/shared';
import { NumberCell } from '../../components/PlanningGrid';
import { useExpectedSma, useStore } from '../../state/store';
import { FACILITIES, WEEKS } from '../../mockData/master';
import { OUTPUT_YIELD } from '../../mockData/s01';
import { COLORS } from '../../theme';

export default function Processing() {
  const { country, processing, updateProcessing, say, removeTask } = useStore();
  const sma = useExpectedSma();
  const [integrated, setIntegrated] = React.useState(true);
  const [facility, setFacility] = React.useState(FACILITIES[0].name);
  const [showReference, setShowReference] = React.useState(true);

  const rows = integrated ? processing : processing.filter((r) => r.facility === facility);

  const plannedTotal = (r: (typeof processing)[number]) => Object.values(r.weeks).reduce((a, b) => a + (b || 0), 0);
  const exceeds = (r: (typeof processing)[number]) => plannedTotal(r) > r.receivedMt;

  const setWeek = (id: string, w: string, v: number) =>
    updateProcessing(processing.map((r) => (r.id === id ? { ...r, weeks: { ...r.weeks, [w]: v } } : r)));

  const infoCards = [
    {
      title: 'Available stock balance and holding facilities',
      lines: processing.map((r) => [`${r.commodity} · ${r.facility}`, `${r.receivedMt.toLocaleString()} MT received`] as [string, string]),
      note: 'Material actually received — the planning basis',
    },
    {
      title: 'Production rate per day',
      lines: FACILITIES.map((f) => [f.name, `${f.ratePerDay} MT/day`] as [string, string]),
      note: 'Source: C3 master data',
    },
  ];

  return (
    <AppShell title="Processing (Production) Plan" breadcrumb={[country, 'Planning', 'Processing Plan']}>
      <Alert severity="info" sx={{ mb: 2 }}>
        Opened from the Actions Inbox item <b>“Processing plan update due — Gedaref Mill”</b> raised by the C5
        automated job (WF-S01-03 / Step 7).{' '}
        <Button size="small" onClick={() => { removeTask('T-1'); say('Plan update acknowledged — inbox item closed'); }}>
          Mark update done
        </Button>
      </Alert>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 2 }}>
        <Box>
          <SectionCard
            title="S01-SC-13 — Processing plan board"
            right={
              <Stack direction="row" spacing={2} alignItems="center">
                <FormControlLabel
                  control={<Switch size="small" checked={integrated} onChange={(e) => setIntegrated(e.target.checked)} />}
                  label={<Typography variant="caption">Integrated view — all facilities</Typography>}
                />
                {!integrated && (
                  <Select size="small" variant="standard" value={facility} onChange={(e) => setFacility(e.target.value)}>
                    {FACILITIES.map((f) => <MenuItem key={f.name} value={f.name}>{f.name}</MenuItem>)}
                  </Select>
                )}
              </Stack>
            }
          >
            <TraceNote workflow="WF-S01-03 / Steps 1–3, 5 — weekly buckets by commodity and facility" />

            <Alert severity="warning" icon={false} sx={{ mb: 1.5, fontSize: '0.78rem' }}>
              <b>Firm business rule.</b> The plan is built on raw materials <b>actually received</b> at facilities.
              Quantities planned for purchase but not yet received are deliberately excluded from production planning.
            </Alert>

            <Paper variant="outlined" sx={{ borderColor: COLORS.border, overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 980 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, minWidth: 150 }}>Facility</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Commodity</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, bgcolor: '#EAF4FB' }}>
                      Received available (MT)
                    </TableCell>
                    {showReference && (
                      <TableCell align="right" sx={{ fontWeight: 600, color: COLORS.textSecondary, bgcolor: '#F3F3F3' }}>
                        Planned, not received
                      </TableCell>
                    )}
                    {WEEKS.slice(0, 5).map((w) => (
                      <TableCell key={w} align="right" sx={{ fontWeight: 600 }}>{w}</TableCell>
                    ))}
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#F7F8F9' }}>Planned</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Expected output</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>SMA</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id} hover sx={{ bgcolor: exceeds(r) ? '#FDF3F2' : undefined }}>
                      <TableCell>{r.facility}</TableCell>
                      <TableCell>{r.commodity}</TableCell>
                      <TableCell align="right" sx={{ bgcolor: '#EAF4FB', fontWeight: 700 }}>
                        {r.receivedMt.toLocaleString()}
                      </TableCell>
                      {showReference && (
                        <TableCell align="right" sx={{ bgcolor: '#F3F3F3', color: COLORS.textSecondary }}>
                          {r.plannedForPurchaseNotReceived.toLocaleString()}
                        </TableCell>
                      )}
                      {WEEKS.slice(0, 5).map((w) => (
                        <TableCell key={w} align="right" sx={{ py: 0.25 }}>
                          <NumberCell
                            value={r.weeks[w]}
                            error={exceeds(r)}
                            onChange={(v) => setWeek(r.id, w, v)}
                          />
                        </TableCell>
                      ))}
                      <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#F7F8F9' }}>
                        {plannedTotal(r).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">{Math.round(plannedTotal(r) * OUTPUT_YIELD).toLocaleString()}</TableCell>
                      <TableCell align="center">
                        <Checkbox
                          size="small"
                          checked={r.sma}
                          onChange={(e) =>
                            updateProcessing(processing.map((x) => (x.id === r.id ? { ...x, sma: e.target.checked } : x)))
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>

            {rows.some(exceeds) && (
              <Alert severity="error" sx={{ mt: 1.5 }}>
                Planned input exceeds the material actually received at this facility. Quantities planned for purchase
                but not yet received are excluded from production planning. Reduce the weekly input, or wait for
                receipt.
              </Alert>
            )}

            <FormControlLabel
              sx={{ mt: 1 }}
              control={<Switch size="small" checked={showReference} onChange={(e) => setShowReference(e.target.checked)} />}
              label={
                <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                  Show “Planned for purchase, not yet received” as a greyed reference column — never plannable, never
                  added to the available quantity
                </Typography>
              }
            />
          </SectionCard>

          <SectionCard title="S01-SC-15 — SMA indication">
            <TraceNote workflow="WF-S01-03 / Step 6 — the planned volume indicates which stocks are intended for the Stock Management Agreement" />
            <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
              <Chip label={`${sma.flaggedCount} row(s) flagged`} size="small" />
              <Chip label={`${sma.total.toLocaleString()} MT flagged for SMA`} size="small" sx={{ bgcolor: COLORS.primary, color: '#fff' }} />
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Commodity</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Planned volume flagged (MT)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sma.rows.map((r) => (
                  <TableRow key={r.commodity}>
                    <TableCell>{r.commodity}</TableCell>
                    <TableCell align="right">{r.mt.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <HandOffBanner
              to="S06 SMA / WF-S06-01 Forecasting Expected SMA Stock"
              passes="country, season, commodity, facility, month, planned volume flagged for the agreement"
              returns="nothing"
              resumes="S06 uses it as the production side of the expected SMA position"
              linkLabel="Open expected SMA position"
              linkTo="/s06"
            />
            <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
              Changing a flag or a weekly quantity here changes the figure on the S06 screen — that is what
              demonstrates that a plan change moves the expected position.
            </Typography>
          </SectionCard>

          <HandOffBanner
            to="Export module — cargo readiness and stock allocation, and the short and long position"
            passes="weekly production plan output and expected finished goods availability"
            returns="nothing"
            resumes="WF-S01-03 / Step 8"
            linkLabel="Open Export stub"
            linkTo="/stub/export"
          />

          <BottomBar>
            <Button component={Link} to="/s01" variant="outlined">Back to Planning</Button>
            <Stack direction="row" spacing={1}>
              <Button onClick={() => say('Processing plan draft saved (front-end state only)')}>Save draft</Button>
              <Button variant="contained" disabled={rows.some(exceeds)} onClick={() => say('Processing plan updated')}>
                Update plan
              </Button>
            </Stack>
          </BottomBar>
        </Box>

        <Box>
          <InfoCardStrip
            cards={infoCards}
            heading={
              <>
                <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>
                  INDICATIVE INFORMATION (S01-SC-14)
                </Typography>
                <TraceNote workflow="WF-S01-03 / Step 4" />
              </>
            }
          />
          <BusinessConfirmation>
            Confirm the planning information cards required at each planning screen. Only the two cards named in the
            workflow are shown.
          </BusinessConfirmation>
        </Box>
      </Box>
    </AppShell>
  );
}
