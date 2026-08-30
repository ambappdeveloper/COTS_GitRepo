import React from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select,
  Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import {
  BottomBar, HandOffBanner, SectionCard, SimulationButton, TraceNote, ReadOnlyField,
} from '../../components/shared';
import { NumberCell } from '../../components/PlanningGrid';
import { useStore } from '../../state/store';
import { useS05, validityState } from '../../state/s05store';
import { CONTAINER_SIZES, RETRIEVED_RATES, SHIPPING_LINES } from '../../mockData/s05';
import { COLORS } from '../../theme';

const validityColour = (s: string) =>
  s === 'Expired' ? COLORS.bad : s === 'Approaching expiry' ? COLORS.attention : s === 'Not yet effective' ? COLORS.neutral : COLORS.good;

export function FreightRates() {
  const { country, say } = useStore();
  const { rates, updateRate, setRates } = useS05();
  const [retrieve, setRetrieve] = React.useState(false);
  const [accepted, setAccepted] = React.useState<Record<string, boolean>>(
    Object.fromEntries(RETRIEVED_RATES.map((r) => [`${r.lane}|${r.size}|${r.line}`, true])),
  );
  const [bulk, setBulk] = React.useState(false);
  const [bulkPct, setBulkPct] = React.useState('5');

  const cells = CONTAINER_SIZES.flatMap((s) => SHIPPING_LINES.map((l) => ({ key: `${s}|${l}`, size: s, line: l })));

  return (
    <AppShell title="Freight Offers and Rate Maintenance" breadcrumb={[country, 'Logistics', 'Freight rates']} showSeason={false}>
      <Alert severity="info" sx={{ mb: 2 }}>
        The C5 automated job reports that one lane has rates outside their validity period. The prompt appears in the
        Core Actions Inbox and opens this screen (WF-S05-04 / Step 6).
      </Alert>

      <SectionCard
        title="S05-SC-08 — Freight rate grid"
        right={
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" onClick={() => setBulk(true)}>Bulk edit</Button>
            <Button size="small" variant="outlined" onClick={() => say('SM-03 paste dialog — the same paste-and-validate pattern as the planning grid')}>
              Paste from Excel
            </Button>
          </Stack>
        }
      >
        <TraceNote workflow="WF-S05-04 / Steps 1–2, 4 — rates for 20 ft and 40 ft containers, for each loading port, destination port and commodity, entered in one operation with validity dates" />

        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1150 }}>
            <TableHead>
              <TableRow>
                <TableCell rowSpan={2} sx={{ fontWeight: 600, minWidth: 200 }}>Lane</TableCell>
                <TableCell rowSpan={2} sx={{ fontWeight: 600 }}>Commodity</TableCell>
                {CONTAINER_SIZES.map((s) => (
                  <TableCell key={s} colSpan={SHIPPING_LINES.length} align="center" sx={{ fontWeight: 700, bgcolor: '#EEF1F4' }}>
                    {s}
                  </TableCell>
                ))}
                <TableCell rowSpan={2} sx={{ fontWeight: 600 }}>Valid from</TableCell>
                <TableCell rowSpan={2} sx={{ fontWeight: 600 }}>Valid to</TableCell>
                <TableCell rowSpan={2} sx={{ fontWeight: 600 }}>Validity</TableCell>
                <TableCell rowSpan={2} sx={{ fontWeight: 600 }}>Source</TableCell>
              </TableRow>
              <TableRow>
                {cells.map((c) => (
                  <TableCell key={c.key} align="right" sx={{ fontWeight: 600, fontSize: '0.72rem' }}>{c.line}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rates.map((r) => {
                const v = validityState(r.validFrom, r.validTo);
                return (
                  <TableRow key={r.id} hover sx={{ bgcolor: v === 'Expired' ? '#FDF3F2' : undefined }}>
                    <TableCell>{r.loadingPort} → {r.destinationPort}</TableCell>
                    <TableCell>{r.commodity}</TableCell>
                    {cells.map((c) => (
                      <TableCell key={c.key} align="right" sx={{ py: 0.25 }}>
                        <NumberCell
                          value={r.rates[c.key]}
                          onChange={(val) => updateRate(r.id, { rates: { ...r.rates, [c.key]: val } })}
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <TextField variant="standard" value={r.validFrom} sx={{ width: 105 }}
                        onChange={(e) => updateRate(r.id, { validFrom: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <TextField variant="standard" value={r.validTo} sx={{ width: 105 }}
                        onChange={(e) => updateRate(r.id, { validTo: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={v} sx={{ bgcolor: validityColour(v), color: '#fff', height: 20, fontSize: '0.68rem' }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{r.source}</Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>

        <Alert severity="info" icon={false} sx={{ mt: 1.5, fontSize: '0.8rem' }}>
          The entry form accepts all rates for the different loading points, destination points and shipping lines in
          <b> one operation</b>. Single-option-at-a-time entry, as in the existing Export Direct form, is the stated
          pain point and is not the entry pattern here.
        </Alert>

        {rates.some((r) => validityState(r.validFrom, r.validTo) === 'Expired') && (
          <Alert severity="error" sx={{ mt: 1 }}>
            One or more lanes are expired. Expired rates are not offered to costing.{' '}
            <Button
              size="small"
              onClick={() => say('Request update sent to the responsible role — the same pattern as the S02 cost element')}
            >
              Request update
            </Button>
          </Alert>
        )}

        <SimulationButton
          label="Simulate rate service retrieval"
          note="Retrieves rates from the online service for review and confirmation; nothing is written until confirmed."
          onClick={() => setRetrieve(true)}
        />

        <HandOffBanner
          to="S02 Costing / WF-S02-01 cost elements and WF-S02-02 the estimate"
          passes="rate by lane, container size and shipping line, with its validity period"
          returns="nothing"
          resumes="freight is one of the elements commonly expressed as a range"
          linkLabel="Open S02 stub"
          linkTo="/s02"
        />
      </SectionCard>

      <BottomBar>
        <Button component={Link} to="/s05" variant="outlined">Back to movements</Button>
        <Stack direction="row" spacing={1}>
          <Button component={Link} to="/s05/rate-history">Rate history</Button>
          <Button variant="contained" onClick={() => say('Freight rates saved (front-end state only)')}>Save rates</Button>
        </Stack>
      </BottomBar>

      {/* S05-SC-09 */}
      <Dialog open={retrieve} onClose={() => setRetrieve(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.primary, color: '#fff', py: 1.25 }}>
          Rate service retrieval — review and confirm
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.85 }}>
            WF-S05-04 / Step 3 — retrieval reduces manual entry to review and confirmation
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Accept', 'Lane', 'Container', 'Shipping line', 'Retrieved', 'Current', 'Difference'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {RETRIEVED_RATES.map((r) => {
                const k = `${r.lane}|${r.size}|${r.line}`;
                const diff = r.retrieved - r.current;
                return (
                  <TableRow key={k}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small" checked={!!accepted[k]}
                        onChange={(e) => setAccepted({ ...accepted, [k]: e.target.checked })}
                      />
                    </TableCell>
                    <TableCell>{r.lane}</TableCell>
                    <TableCell>{r.size}</TableCell>
                    <TableCell>{r.line}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{r.retrieved.toLocaleString()}</TableCell>
                    <TableCell align="right">{r.current.toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ color: diff > 0 ? COLORS.bad : COLORS.good, fontWeight: 600 }}>
                      {diff > 0 ? '+' : ''}{diff}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: COLORS.textSecondary }}>
            Nothing is written into the grid until confirmed — retrieval is not a silent overwrite.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRetrieve(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              const next = rates.map((r) => {
                const lane = `${r.loadingPort} → ${r.destinationPort}`;
                let rr = { ...r.rates };
                let touched = false;
                RETRIEVED_RATES.forEach((x) => {
                  if (x.lane === lane && accepted[`${x.lane}|${x.size}|${x.line}`]) {
                    rr[`${x.size}|${x.line}`] = x.retrieved;
                    touched = true;
                  }
                });
                return touched ? { ...r, rates: rr, source: 'Rate service' as const } : r;
              });
              setRates(next);
              setRetrieve(false);
              say('Retrieved rates confirmed and written into the grid');
            }}
          >
            Confirm accepted rates
          </Button>
        </DialogActions>
      </Dialog>

      {/* bulk edit */}
      <Dialog open={bulk} onClose={() => setBulk(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Bulk edit</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Apply a percentage change to every rate in the grid — one operation across all lanes, container sizes and
            shipping lines.
          </Typography>
          <ReadOnlyField label="Change (%)" value="" />
          <TextField variant="standard" value={bulkPct} onChange={(e) => setBulkPct(e.target.value)} sx={{ width: 90 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulk(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              const pct = Number(bulkPct) / 100;
              setRates(rates.map((r) => ({
                ...r,
                rates: Object.fromEntries(Object.entries(r.rates).map(([k, v]) => [k, Math.round(v * (1 + pct))])),
              })));
              setBulk(false);
              say(`All rates adjusted by ${bulkPct} %`);
            }}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}

/* ---------------------------------------------- S05-SC-10 freight rate history */

export function RateHistory() {
  const { country } = useStore();
  const { rates } = useS05();
  const [at, setAt] = React.useState('19-Aug-2026');

  const rows = rates.flatMap((r) =>
    Object.entries(r.rates).map(([k, v]) => {
      const [size, line] = k.split('|');
      return {
        lane: `${r.loadingPort} → ${r.destinationPort}`,
        commodity: r.commodity, size, line, rate: v, currency: r.currency,
        validFrom: r.validFrom, validTo: r.validTo, source: r.source,
        inForce: validityState(r.validFrom, r.validTo, at) === 'Current' || validityState(r.validFrom, r.validTo, at) === 'Approaching expiry',
      };
    }),
  );

  return (
    <AppShell title="Freight Rate History" breadcrumb={[country, 'Logistics', 'Freight rates', 'History']} showSeason={false}>
      <SectionCard title="S05-SC-10 — Freight rate history (Core C11 report viewer)">
        <TraceNote workflow="WF-S05-04 / Steps 4, 7 — rates are held with validity dates so a quotation can be reproduced against the rate in force at the time" />
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Rate in force at</Typography>
            <TextField variant="standard" value={at} onChange={(e) => setAt(e.target.value)} sx={{ width: 130 }} />
          </Box>
          <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
            Change the date to see which rates were in force then — that is the reproducibility requirement.
          </Typography>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Lane', 'Commodity', 'Container', 'Shipping line', 'Rate', 'Currency', 'Valid from', 'Valid to', 'Source', 'In force at date'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i} hover sx={{ opacity: r.inForce ? 1 : 0.55 }}>
                <TableCell>{r.lane}</TableCell>
                <TableCell>{r.commodity}</TableCell>
                <TableCell>{r.size}</TableCell>
                <TableCell>{r.line}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{r.rate.toLocaleString()}</TableCell>
                <TableCell>{r.currency}</TableCell>
                <TableCell>{r.validFrom}</TableCell>
                <TableCell>{r.validTo}</TableCell>
                <TableCell>{r.source}</TableCell>
                <TableCell>
                  {r.inForce
                    ? <Chip size="small" label="In force" sx={{ bgcolor: COLORS.good, color: '#fff', height: 18 }} />
                    : <Typography variant="caption" color="text.secondary">Not in force</Typography>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
      <Button size="small" component={Link} to="/s05/rates">Back to the rate grid</Button>
    </AppShell>
  );
}
