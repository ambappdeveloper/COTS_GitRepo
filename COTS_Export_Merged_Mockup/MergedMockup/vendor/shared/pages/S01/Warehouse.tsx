import React from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography, Chip,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import {
  BottomBar, HandOffBanner, ReadOnlyField, RequiredLabel, SectionCard, SimulationButton, StatusChip, TraceNote,
} from '../../components/shared';
import { useStore } from '../../state/store';
import { COLORS } from '../../theme';

export default function Warehouse() {
  const {
    country, warehouses, confirmedStorage, confirmStorage, warehouseRequests, raiseWarehouseRequest,
    resolveWarehouseRequest, say,
  } = useStore();
  const [unit, setUnit] = React.useState<'MT' | 'm2'>('MT');
  const [reqFor, setReqFor] = React.useState<string | null>(null);
  const [capacity, setCapacity] = React.useState('');
  const [from, setFrom] = React.useState('01-Feb-2026');
  const [justification, setJustification] = React.useState('');

  const rows = warehouses.filter((w) => ['Gedaref', 'El Obeid', 'Port Sudan'].includes(w.city) || country !== 'Sudan');
  const conv = (v: number, factor: number) => (unit === 'MT' ? v : Math.round(v * factor));
  const util = (w: (typeof rows)[number]) => Math.round((w.expectedMt / w.capacityMt) * 100);
  const cities = Array.from(new Set(rows.map((r) => r.city)));

  const requestFor = (code: string) => warehouseRequests.find((r) => r.code === code);

  return (
    <AppShell title="Warehousing Plan and Capacity" breadcrumb={[country, 'Planning', 'Warehouse Capacity']}>
      <SectionCard title="City summary">
        <Stack direction="row" spacing={2} flexWrap="wrap">
          {cities.map((c) => {
            const cw = rows.filter((r) => r.city === c);
            const cap = cw.reduce((a, b) => a + b.capacityMt, 0);
            const exp = cw.reduce((a, b) => a + b.expectedMt, 0);
            const pct = Math.round((exp / cap) * 100);
            return (
              <Paper key={c} variant="outlined" sx={{ p: 1.5, minWidth: 190, borderColor: COLORS.border }}>
                <Typography variant="subtitle2">{c}</Typography>
                <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary }}>
                  Capacity {cap.toLocaleString()} MT · Expected {exp.toLocaleString()} MT
                </Typography>
                <Box sx={{ mt: 0.75 }}>
                  <StatusChip status={pct > 100 ? 'Insufficient' : 'Sufficient'} />
                  <Typography component="span" variant="caption" sx={{ ml: 1, fontWeight: 700 }}>{pct}%</Typography>
                </Box>
              </Paper>
            );
          })}
        </Stack>
      </SectionCard>

      <SectionCard
        title="S01-SC-16 — Warehouse capacity view"
        right={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Unit</Typography>
            <ToggleButtonGroup size="small" exclusive value={unit} onChange={(_, v) => v && setUnit(v)}>
              <ToggleButton value="MT">MT</ToggleButton>
              <ToggleButton value="m2">m²</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        }
      >
        <TraceNote workflow="WF-S01-04 / Steps 1–4 — utilisation per city and per warehouse, with COTS handling the tonne to square metre conversion" />
        <Table size="small">
          <TableHead>
            <TableRow>
              {['City', 'Warehouse', `Capacity (${unit})`, `Current stock (${unit})`, `Expected stock (${unit})`,
                'Utilisation', 'Position', 'Conversion factor', ''].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((w) => {
              const pct = util(w);
              const insufficient = pct > 100;
              const req = requestFor(w.code);
              return (
                <TableRow key={w.code} hover sx={{ bgcolor: insufficient ? '#FFF7E6' : undefined }}>
                  <TableCell>{w.city}</TableCell>
                  <TableCell>
                    <Box component="span" sx={{ color: COLORS.primary, fontWeight: 600 }}>{w.code}</Box> · {w.name}
                  </TableCell>
                  <TableCell align="right">{conv(w.capacityMt, w.conversion).toLocaleString()}</TableCell>
                  <TableCell align="right">{conv(w.currentMt, w.conversion).toLocaleString()}</TableCell>
                  <TableCell align="right">{conv(w.expectedMt, w.conversion).toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{pct}%</TableCell>
                  <TableCell><StatusChip status={insufficient ? 'Insufficient' : 'Sufficient'} /></TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                      1 MT = {w.conversion} m²
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {insufficient ? (
                      req ? (
                        <Chip
                          size="small"
                          label={`Request ${req.outcome.toLowerCase()}`}
                          sx={{
                            bgcolor: req.outcome === 'Approved' ? COLORS.good : req.outcome === 'Not approved' ? COLORS.bad : COLORS.progress,
                            color: '#fff',
                          }}
                        />
                      ) : (
                        <Button size="small" variant="outlined" onClick={() => { setReqFor(w.code); setCapacity(String(w.expectedMt - w.capacityMt)); }}>
                          Raise warehouse request
                        </Button>
                      )
                    ) : confirmedStorage.includes(w.code) ? (
                      <Chip size="small" label="Storage confirmed" sx={{ bgcolor: COLORS.good, color: '#fff' }} />
                    ) : (
                      <Button size="small" onClick={() => { confirmStorage(w.code); say(`Storage position confirmed for ${w.code}`); }}>
                        Confirm storage position
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: COLORS.textSecondary }}>
          Capacity information is available at the point of planning, not only as a report. The conversion factor in
          use is stated on every row so the planner is not doing arithmetic outside the system.
        </Typography>
      </SectionCard>

      {warehouseRequests.some((r) => r.outcome === 'Pending') && (
        <SectionCard title="Open warehouse requests">
          {warehouseRequests.filter((r) => r.outcome === 'Pending').map((r) => (
            <Box key={r.code} sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                {r.code} — {r.capacity.toLocaleString()} MT requested · <StatusChip status="Pending Approval" />
              </Typography>
              <HandOffBanner
                to="Export and Logistics multi-department approval route (C4)"
                passes="country, city, capacity required, required-from date, justification"
                returns="Approved / Not approved"
                resumes="S01 resumes at WF-S01-04 / Step 5"
              />
              <Stack direction="row" spacing={2}>
                <SimulationButton
                  label="Simulate approval — approved"
                  note="Adds the requested capacity and recalculates utilisation."
                  onClick={() => { resolveWarehouseRequest(r.code, 'Approved'); say(`${r.code} request approved — capacity added, utilisation recalculated`); }}
                />
                <SimulationButton
                  label="Simulate approval — not approved"
                  note="Leaves the shortfall visible as a forecast shortfall."
                  onClick={() => { resolveWarehouseRequest(r.code, 'Not approved'); say(`${r.code} request not approved — forecast shortfall stands`); }}
                />
              </Stack>
            </Box>
          ))}
        </SectionCard>
      )}

      <BottomBar>
        <Button component={Link} to="/s01" variant="outlined">Back to Planning</Button>
        <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
          Warehouse capacity utilisation and forecast shortfall are published through C11 Reporting.
        </Typography>
      </BottomBar>

      {/* S01-SC-17 */}
      <Dialog open={!!reqFor} onClose={() => setReqFor(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.primary, color: '#fff', py: 1.25 }}>
          New warehouse request
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.85 }}>
            WF-S01-04 / Step 5
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <ReadOnlyField label="Warehouse / city" value={`${reqFor} · ${rows.find((w) => w.code === reqFor)?.city}`} />
          <ReadOnlyField
            label="Shortfall"
            value={`${((rows.find((w) => w.code === reqFor)?.expectedMt ?? 0) - (rows.find((w) => w.code === reqFor)?.capacityMt ?? 0)).toLocaleString()} MT`}
          />
          <Box sx={{ mt: 2 }}>
            <RequiredLabel label="Capacity required (MT)" required />
            <TextField fullWidth variant="standard" value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/[^0-9]/g, ''))} />
          </Box>
          <Box sx={{ mt: 2 }}>
            <RequiredLabel label="Required from" required />
            <TextField fullWidth variant="standard" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Box>
          <Box sx={{ mt: 2 }}>
            <RequiredLabel label="Justification" required />
            <TextField
              fullWidth variant="standard" multiline minRows={2} placeholder="Peak arrivals weeks 6–10"
              value={justification} onChange={(e) => setJustification(e.target.value)}
            />
          </Box>
          <Alert severity="info" sx={{ mt: 2, fontSize: '0.78rem' }}>
            On submit the request follows the multi-department approval route described in the Export and Logistics
            processes. S01 records the shortfall and the request reference and stops there.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReqFor(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!capacity || !justification.trim()}
            onClick={() => {
              raiseWarehouseRequest(reqFor!, Number(capacity));
              setReqFor(null);
              setJustification('');
              say('Warehouse request raised and handed to the multi-department approval route');
            }}
          >
            Submit request
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
