import React from 'react';
import {
  Alert, Box, Button, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField,
  ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import {
  BottomBar, BusinessConfirmation, PrototypeNote, ReadOnlyField, SectionCard, SectionCard as Card, StatusChip,
  TraceNote, FieldGrid,
} from '../../components/shared';
import { SmaChip } from './Transfer';
import { useStore } from '../../state/store';
import { priceAt, useS06 } from '../../state/s06store';
import { COLORS } from '../../theme';

/* ------------------------------ S06-SC-05 warehouse stock, SMA and non-SMA ---- */

export function WarehouseStock() {
  const { country } = useStore();
  const { stock, prices } = useS06();
  const [filter, setFilter] = React.useState<'all' | 'sma' | 'non'>('all');

  const rows = stock.filter((s) => (filter === 'all' ? true : filter === 'sma' ? s.sma : !s.sma));
  const warehouses = Array.from(new Set(stock.map((s) => s.warehouse)));
  const valueOf = (s: (typeof stock)[number]) =>
    s.sma ? s.quantityMt * (priceAt(prices, country, s.commodity)?.price ?? 0) : null;

  return (
    <AppShell title="Warehouse Stock — SMA and non-SMA" breadcrumb={[country, 'SMA', 'Warehouse stock']}>
      <SectionCard title="Per-warehouse summary">
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          {warehouses.map((w) => {
            const lines = stock.filter((s) => s.warehouse === w);
            const smaMt = lines.filter((l) => l.sma).reduce((a, l) => a + l.quantityMt, 0);
            const nonMt = lines.filter((l) => !l.sma).reduce((a, l) => a + l.quantityMt, 0);
            const mixed = smaMt > 0 && nonMt > 0;
            return (
              <Paper key={w} variant="outlined" sx={{ p: 1.5, minWidth: 250, borderColor: COLORS.border }}>
                <Typography variant="subtitle2">{w}</Typography>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Total</Typography><Typography variant="caption" sx={{ fontWeight: 700 }}>{(smaMt + nonMt).toLocaleString()} MT</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">of which SMA</Typography><Typography variant="caption" sx={{ fontWeight: 700 }}>{smaMt.toLocaleString()} MT</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography variant="caption">of which non-SMA</Typography><Typography variant="caption" sx={{ fontWeight: 700 }}>{nonMt.toLocaleString()} MT</Typography></Stack>
                {mixed && (
                  <Chip size="small" label="Mixed SMA and non-SMA" sx={{ mt: 0.75, height: 18, fontSize: '0.65rem', bgcolor: '#EEF1F4' }} />
                )}
              </Paper>
            );
          })}
        </Stack>
      </SectionCard>

      <SectionCard
        title="S06-SC-05 — Warehouse stock report"
        right={
          <ToggleButtonGroup size="small" exclusive value={filter} onChange={(_, v) => v && setFilter(v)}>
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="sma">SMA only</ToggleButton>
            <ToggleButton value="non">non-SMA only</ToggleButton>
          </ToggleButtonGroup>
        }
      >
        <TraceNote workflow="WF-S06-02 / Step 6 and WF-S06-04 / Step 5 — all warehouses and their stock status, distinguishing stock managed under the agreement from stock that is not" />
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Warehouse', 'Commodity', 'Batch', 'Quantity (MT)', 'Stock status', 'Grade', 'Allocation', 'SMA', 'Value (SMA only)'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell>{s.warehouse}</TableCell>
                <TableCell>{s.commodity}</TableCell>
                <TableCell>{s.batch}</TableCell>
                <TableCell align="right">{s.quantityMt.toLocaleString()}</TableCell>
                <TableCell>
                  <StatusChip status={s.status === 'Blocked' ? 'Insufficient' : 'Approved'} />
                  {s.statusNote && (
                    <Typography variant="caption" sx={{ display: 'block', color: COLORS.attention }}>{s.statusNote}</Typography>
                  )}
                </TableCell>
                <TableCell><Chip size="small" label={s.grade} sx={{ height: 18, fontSize: '0.65rem' }} /></TableCell>
                <TableCell>{s.allocation || <Typography variant="caption" color="text.secondary">Unallocated</Typography>}</TableCell>
                <TableCell><SmaChip on={s.sma} /></TableCell>
                <TableCell align="right">
                  {valueOf(s) == null
                    ? <Typography variant="caption" color="text.secondary">—</Typography>
                    : `${valueOf(s)!.toLocaleString()} USD`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Alert severity="info" icon={false} sx={{ mt: 1.5, fontSize: '0.82rem' }}>
          One grid, all warehouses. <b>The same warehouse may hold a mix of SMA and non-SMA stock</b>, and the report
          presents both without forcing a warehouse-level classification. The filter above is a view filter, not a
          separate inventory.
        </Alert>
      </SectionCard>

      {/* S06-SC-07 */}
      <SectionCard title="S06-SC-07 — SMA valuation">
        <TraceNote workflow="WF-S06-03 / Steps 4–5 — the value of SMA stock is calculated from the flagged quantity and the applicable price, and is reported alongside the quantity" />
        <FieldGrid columns={4}>
          <ReadOnlyField label="Flagged quantity" value={`${stock.filter((s) => s.sma).reduce((a, s) => a + s.quantityMt, 0).toLocaleString()} MT`} />
          <ReadOnlyField label="Valuation date" value="21-Aug-2026" />
          <ReadOnlyField
            label="Value"
            value={`${stock.filter((s) => s.sma).reduce((a, s) => a + (valueOf(s) ?? 0), 0).toLocaleString()} USD`}
          />
          <ReadOnlyField label="Basis" value={<Link to="/s06/prices">Effective SMA prices</Link>} />
        </FieldGrid>
        <BusinessConfirmation>
          Confirm how SMA value interacts with the decision that COTS does not track inventory value generally — the
          agreement appears to be a deliberate exception.
          <PrototypeNote>
            value columns appear only on SMA lines; non-SMA lines show none, which is the visible consequence of
            treating the agreement as the exception.
          </PrototypeNote>
        </BusinessConfirmation>
      </SectionCard>

      <BottomBar>
        <Button component={Link} to="/s06" variant="outlined">Back to the expected position</Button>
        <Button variant="contained" component={Link} to="/s06/sales">Sales and reconciliation</Button>
      </BottomBar>
    </AppShell>
  );
}

/* --------------------------------- S06-SC-06 prices and history --------------- */

export function Prices() {
  const { country, say } = useStore();
  const { prices, updatePrice, addPrice } = useS06();
  const [at, setAt] = React.useState('21-Aug-2026');

  const inForce = (p: (typeof prices)[number]) => {
    const d = (s: string) => new Date(s.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1, $3')).getTime();
    return d(p.effectiveFrom) <= d(at) && d(at) <= d(p.effectiveTo);
  };

  return (
    <AppShell title="SMA Prices and Valuation" breadcrumb={[country, 'SMA', 'Prices']}>
      <Alert severity="info" sx={{ mb: 2 }}>
        The C5 automated job prompts the responsible role on the configured price update period. The prompt appears in
        the Core Actions Inbox rather than as its own screen.
      </Alert>

      <SectionCard
        title="S06-SC-06 — SMA price list"
        right={
          <Button
            size="small" variant="outlined"
            onClick={() => {
              addPrice({
                id: `PR-${prices.length + 1}`, country, commodity: 'Sesame', price: 655, currency: 'USD',
                effectiveFrom: '01-Sep-2026', effectiveTo: '30-Sep-2026', updatedBy: 'Price owner · this session',
              });
              say('New effective price added — the previous price is retained');
            }}
          >
            Add price
          </Button>
        }
      >
        <TraceNote workflow="WF-S06-03 / Steps 1–3 — prices held as master data by country and commodity, updated regularly, with historical prices retained" />
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Price in force at</Typography>
            <TextField variant="standard" value={at} onChange={(e) => setAt(e.target.value)} sx={{ width: 130 }} />
          </Box>
          <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
            Change the date to see which price was effective then — that is how the value of stock transferred at any
            past date is reproduced.
          </Typography>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Country', 'Commodity', 'Price', 'Currency', 'Effective from', 'Effective to', 'State', 'In force at date', 'Updated by'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {prices.map((p) => {
              const force = inForce(p);
              return (
                <TableRow key={p.id} hover sx={{ opacity: force ? 1 : 0.6 }}>
                  <TableCell>{p.country}</TableCell>
                  <TableCell>{p.commodity}</TableCell>
                  <TableCell align="right">
                    <TextField
                      variant="standard" value={p.price} sx={{ width: 70 }}
                      onChange={(e) => updatePrice(p.id, { price: Number(e.target.value.replace(/[^0-9.]/g, '')) || 0 })}
                    />
                  </TableCell>
                  <TableCell>{p.currency}</TableCell>
                  <TableCell>{p.effectiveFrom}</TableCell>
                  <TableCell>{p.effectiveTo}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={force ? 'Current' : 'Superseded'}
                      sx={{ height: 20, color: '#fff', bgcolor: force ? COLORS.good : COLORS.neutral }}
                    />
                  </TableCell>
                  <TableCell>
                    {force
                      ? <Chip size="small" label="In force" sx={{ height: 18, bgcolor: COLORS.primary, color: '#fff' }} />
                      : <Typography variant="caption" color="text.secondary">Not in force</Typography>}
                  </TableCell>
                  <TableCell><Typography variant="caption">{p.updatedBy}</Typography></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: COLORS.textSecondary }}>
          Historical prices are retained, so the value of stock transferred at any past date can be reproduced from the
          price effective at that date.
        </Typography>
      </SectionCard>

      <BottomBar>
        <Button component={Link} to="/s06" variant="outlined">Back to the expected position</Button>
        <Button variant="contained" component={Link} to="/s06/stock">Warehouse stock and valuation</Button>
      </BottomBar>
    </AppShell>
  );
}
