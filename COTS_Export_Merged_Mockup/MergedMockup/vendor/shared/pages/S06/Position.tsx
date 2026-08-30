import { Alert, Box, Button, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { HandOffBanner, SectionCard, TraceNote, ReadOnlyField, FieldGrid } from '../../components/shared';
import { useExpectedSma, useStore } from '../../state/store';
import { useS06 } from '../../state/s06store';
import { EXPECTED_PURCHASE_BY_MONTH, SMA_COUNTRIES } from '../../mockData/s06';
import { COLORS } from '../../theme';

export default function Position() {
  const { country, plan } = useStore();
  const sma = useExpectedSma();
  const { stock, transfers } = useS06();

  if (!SMA_COUNTRIES.includes(country)) {
    return (
      <AppShell title="SMA — Stock Management Agreement" breadcrumb={[country, 'Shared Modules', 'SMA']}>
        <SectionCard title="Country and commodity gate">
          <TraceNote workflow="Configuration (S6.5) — which countries and commodities operate under the agreement" />
          <Alert severity="info">
            <b>Not applicable for {country}.</b> The Stock Management Agreement operates in{' '}
            {SMA_COUNTRIES.join(', ')} in this prototype. Switch the country in the header to see the module.
          </Alert>
        </SectionCard>
      </AppShell>
    );
  }

  // production side is derived live from the S01 processing plan SMA flags
  const flaggedTotal = sma.total;
  const months = EXPECTED_PURCHASE_BY_MONTH;
  const perMonthProduction = Math.round(flaggedTotal / months.length);
  const flaggedStock = stock.filter((s) => s.sma);

  return (
    <AppShell title="Expected SMA Position" breadcrumb={[country, 'Shared Modules', 'SMA']}>
      <SectionCard title="Derivation — where the position comes from">
        <TraceNote workflow="WF-S06-01 / Steps 1–5 — expected stock calculated from the purchase plan and actual purchases, together with the processing plan for each month" />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 2 }}>
          {[
            {
              title: 'Purchase side',
              lines: [['Purchase plan and actual purchases', `${months.reduce((a, m) => a + m.purchaseMt, 0).toLocaleString()} MT`]],
              note: 'S01 master and sourcing plans',
            },
            {
              title: 'Production side',
              lines: [
                ['Flagged in the processing plan', `${flaggedTotal.toLocaleString()} MT`],
                ['Rows flagged', String(sma.flaggedCount)],
              ],
              note: 'S01 WF-S01-03 / Step 6 — live from the processing plan in this session',
            },
            {
              title: 'Allocated stock added',
              lines: [['Where the configured conditions permit', `${months.reduce((a, m) => a + m.allocatedAddedMt, 0)} MT`]],
              note: 'Allocation plan',
            },
            {
              title: 'Plan version basis',
              lines: [
                ['Master plan', plan ? `${plan.ref} v${plan.activeVersion}` : '—'],
                ['Status', plan?.status ?? '—'],
              ],
              note: 'The approved version the position is derived from',
            },
          ].map((c) => (
            <Paper key={c.title} variant="outlined" sx={{ borderColor: COLORS.border }}>
              <Box sx={{ px: 1.5, py: 0.75, bgcolor: '#F7F8F9', borderBottom: `1px solid ${COLORS.border}` }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>
                  {c.title.toUpperCase()}
                </Typography>
              </Box>
              <Box sx={{ px: 1.5, py: 1 }}>
                {c.lines.map(([k, v]) => (
                  <Stack key={k} direction="row" justifyContent="space-between" sx={{ py: 0.3 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ pr: 1 }}>{k}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{v}</Typography>
                  </Stack>
                ))}
                <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: COLORS.textSecondary, fontStyle: 'italic' }}>
                  {c.note}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Box>
      </SectionCard>

      <SectionCard title="S06-SC-01 — Expected SMA stock by month">
        <TraceNote workflow="WF-S06-01 / Steps 3, 6 — a forward position by month rather than only a current one" />
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Month', 'Expected purchase (MT)', 'Production flagged (MT)', 'Allocated added (MT)', 'Expected SMA stock (MT)'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }} align={h === 'Month' ? 'left' : 'right'}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {months.map((m) => (
              <TableRow key={m.month} hover>
                <TableCell>{m.month}</TableCell>
                <TableCell align="right">{m.purchaseMt.toLocaleString()}</TableCell>
                <TableCell align="right">{perMonthProduction.toLocaleString()}</TableCell>
                <TableCell align="right">{m.allocatedAddedMt}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#F7F8F9' }}>
                  {(perMonthProduction + m.allocatedAddedMt).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{months.reduce((a, m) => a + m.purchaseMt, 0).toLocaleString()}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{(perMonthProduction * months.length).toLocaleString()}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{months.reduce((a, m) => a + m.allocatedAddedMt, 0)}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#F7F8F9' }}>
                {(perMonthProduction * months.length + months.reduce((a, m) => a + m.allocatedAddedMt, 0)).toLocaleString()}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <Alert severity="info" icon={false} sx={{ mt: 1.5, fontSize: '0.82rem' }}>
          <b>A change in the approved plan moves the expected position.</b> The production side above is derived live
          from the SMA flags on the S01 processing plan — change a flag or a weekly quantity there and this figure
          changes.
        </Alert>

        <HandOffBanner
          to="S01 Planning / WF-S01-03 Processing Plan (inbound)"
          passes="nothing — S06 receives"
          returns="country, season, commodity, facility, month, planned volume flagged for the agreement"
          resumes="the production side of the expected position"
          linkLabel="Open the processing plan"
          linkTo="/s01/processing"
        />
      </SectionCard>

      <SectionCard title="Stock currently carrying the SMA attribute">
        <FieldGrid columns={3}>
          <ReadOnlyField label="Stock lines flagged" value={`${flaggedStock.length} of ${stock.length}`} />
          <ReadOnlyField label="Quantity flagged" value={`${flaggedStock.reduce((a, s) => a + s.quantityMt, 0).toLocaleString()} MT`} />
          <ReadOnlyField label="Transfers recorded" value={String(transfers.length)} />
        </FieldGrid>
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: COLORS.textSecondary }}>
          These are existing stock lines carrying an attribute — not a separate inventory.{' '}
          <Chip size="small" label="SMA" sx={{ height: 18, bgcolor: COLORS.primary, color: '#fff', fontSize: '0.65rem' }} />{' '}
          is an attribute chip, never the line's status.
        </Typography>
      </SectionCard>

      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" component={Link} to="/s06/transfer">Transfer to SMA</Button>
        <Button size="small" variant="outlined" component={Link} to="/s06/stock">Warehouse stock (SMA / non-SMA)</Button>
        <Button size="small" variant="outlined" component={Link} to="/s06/prices">Prices and valuation</Button>
        <Button size="small" variant="outlined" component={Link} to="/s06/sales">Sales and reconciliation</Button>
      </Stack>
    </AppShell>
  );
}
