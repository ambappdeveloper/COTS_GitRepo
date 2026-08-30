import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem,
  Radio, RadioGroup, Select, Slider, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import {
  BottomBar, BusinessConfirmation, PrototypeNote, ReadOnlyField, SectionCard, TraceNote, FieldGrid, RequiredLabel,
} from '../../components/shared';
import { useExpectedSma, useStore } from '../../state/store';
import { priceAt, useS06 } from '../../state/s06store';
import { ACTUAL_BY_MONTH, EXPECTED_PURCHASE_BY_MONTH } from '../../mockData/s06';
import { COLORS } from '../../theme';

export default function Sales() {
  const { country, say } = useStore();
  const sma = useExpectedSma();
  const {
    stock, sales, addSale, updateSale, debitNotes, addDebitNote, prices, invoiceInCots, setInvoiceInCots,
  } = useS06();

  const [saleOpen, setSaleOpen] = React.useState(false);
  const [dnOpen, setDnOpen] = React.useState(false);
  const flagged = stock.filter((s) => s.sma);
  const [draft, setDraft] = React.useState({
    lineId: flagged[0]?.id ?? '', countedMt: 0, soldMt: 0, date: '21-Aug-2026',
  });
  const [dn, setDn] = React.useState({ reason: 'Short' as const, relatedTo: sales[0]?.id ?? '', quantityMt: 0, reference: '' });

  // what-if
  const [capacityPct, setCapacityPct] = React.useState(100);
  const [whatIfPrice, setWhatIfPrice] = React.useState(640);

  const line = stock.find((s) => s.id === draft.lineId);
  const linePrice = line ? priceAt(prices, country, line.commodity)?.price ?? 0 : 0;
  const perMonthProduction = Math.round(sma.total / EXPECTED_PURCHASE_BY_MONTH.length);

  return (
    <AppShell title="SMA Sales, Invoices and Reconciliation" breadcrumb={[country, 'SMA', 'Sales']}>
      <SectionCard
        title="S06-SC-08 — SMA sales"
        right={<Button size="small" variant="outlined" onClick={() => setSaleOpen(true)}>Record a sale</Button>}
      >
        <TraceNote workflow="WF-S06-04 / Step 1 — the finished product is counted and sold to the trading company, and COTS records the actual sale" />
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Sale', 'Date', 'Counterparty', 'Commodity · batch', 'Counted (MT)', 'Sold (MT)', 'Value', 'Invoice reference', 'Invoice source', 'Debit notes'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sales.map((s) => {
              const dns = debitNotes.filter((d) => d.relatedTo === s.id);
              return (
                <TableRow key={s.id} hover>
                  <TableCell sx={{ fontWeight: 600, color: COLORS.primary }}>{s.id}</TableCell>
                  <TableCell>{s.date}</TableCell>
                  <TableCell>{s.counterparty}</TableCell>
                  <TableCell>{s.commodity} · {s.batch}</TableCell>
                  <TableCell align="right">{s.countedMt}</TableCell>
                  <TableCell align="right">{s.soldMt}</TableCell>
                  <TableCell align="right">{s.value.toLocaleString()}</TableCell>
                  <TableCell>
                    <TextField
                      variant="standard" value={s.invoiceRef}
                      onChange={(e) => updateSale(s.id, { invoiceRef: e.target.value })}
                      sx={{ width: 120 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{invoiceInCots ? 'COTS' : s.invoiceSource}</Typography>
                  </TableCell>
                  <TableCell>
                    {dns.length
                      ? dns.map((d) => <Chip key={d.id} size="small" label={`${d.reference} · ${d.reason}`} sx={{ height: 18, mr: 0.5, fontSize: '0.65rem' }} />)
                      : <Typography variant="caption" color="text.secondary">—</Typography>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: COLORS.textSecondary }}>
          Only stock carrying the SMA attribute can be selected for a sale — enforced by the picker.
        </Typography>
      </SectionCard>

      {/* S06-SC-09 */}
      <SectionCard title="S06-SC-09 — Invoice tracking">
        <TraceNote workflow="WF-S06-04 / Step 2 — the invoices issued for the sale are tracked against the recorded sale" />
        <BusinessConfirmation>
          Confirm whether the SMA invoice is created in COTS, or created in the enterprise system with COTS holding the
          reference.
          <PrototypeNote>
            the default is reference-only, because the workflow says invoices are <b>tracked</b>. The toggle shows what
            a create-in-COTS shape would add; the prototype does not claim COTS issues invoices.
          </PrototypeNote>
        </BusinessConfirmation>
        <FormControlLabel
          control={<Switch size="small" checked={invoiceInCots} onChange={(e) => setInvoiceInCots(e.target.checked)} />}
          label={
            <Typography variant="body2">
              {invoiceInCots
                ? 'Assumption: invoices created in COTS — an issue action and invoice document would appear'
                : 'Assumption: invoices created in the enterprise system — COTS holds the reference only'}
            </Typography>
          }
        />
        {invoiceInCots && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            Under this assumption COTS would need an invoice number series, an issue action and a document output.
            None of that is built, because the source leaves the question open.
          </Alert>
        )}
        <Table size="small" sx={{ mt: 1.5 }}>
          <TableHead>
            <TableRow>
              {['Sale', 'Invoice reference', 'Invoice date', 'Invoice value', 'Source', 'Status'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sales.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.id}</TableCell>
                <TableCell>{s.invoiceRef}</TableCell>
                <TableCell>{s.invoiceDate}</TableCell>
                <TableCell align="right">{s.invoiceValue.toLocaleString()}</TableCell>
                <TableCell>{invoiceInCots ? 'COTS' : s.invoiceSource}</TableCell>
                <TableCell><Chip size="small" label="Tracked against the sale" sx={{ height: 18, fontSize: '0.65rem' }} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      {/* S06-SC-10 */}
      <SectionCard
        title="S06-SC-10 — Shortages, damages and debit notes"
        right={<Button size="small" variant="outlined" onClick={() => setDnOpen(true)}>Raise a debit note</Button>}
      >
        <TraceNote workflow="WF-S06-04 / Step 3 — short quantities and damages are recorded, with debit notes captured against the relevant transaction" />
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Debit note', 'Reason', 'Related transaction', 'Quantity (MT)', 'Value', 'Documents'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {debitNotes.map((d) => (
              <TableRow key={d.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{d.reference}</TableCell>
                <TableCell>{d.reason}</TableCell>
                <TableCell>{d.relatedTo}</TableCell>
                <TableCell align="right">{d.quantityMt}</TableCell>
                <TableCell align="right">{d.value.toLocaleString()}</TableCell>
                <TableCell>{d.documents.join(', ') || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: COLORS.textSecondary }}>
          Whether debit notes require approval is a configuration point (S6.5).
        </Typography>
      </SectionCard>

      {/* S06-SC-11 */}
      <SectionCard title="S06-SC-11 — Plan against actual">
        <TraceNote workflow="WF-S06-04 / Steps 4, 7 — actual SMA sales and invoices compared against the expected position, showing where the position is ahead of or behind the expected volume" />
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Month', 'Expected SMA stock (MT)', 'Actual sold (MT)', 'Invoiced value', 'Debit notes (MT)', 'Position'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }} align={h === 'Month' ? 'left' : 'right'}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {EXPECTED_PURCHASE_BY_MONTH.map((m) => {
              const actual = ACTUAL_BY_MONTH[m.month];
              const expected = perMonthProduction + m.allocatedAddedMt;
              const diff = (actual?.soldMt ?? 0) - expected;
              return (
                <TableRow key={m.month} hover>
                  <TableCell>{m.month}</TableCell>
                  <TableCell align="right">{expected.toLocaleString()}</TableCell>
                  <TableCell align="right">{actual ? actual.soldMt.toLocaleString() : '—'}</TableCell>
                  <TableCell align="right">{actual ? actual.invoicedValue.toLocaleString() : '—'}</TableCell>
                  <TableCell align="right">
                    {debitNotes.reduce((a, d) => a + (m.month === 'Aug' ? d.quantityMt : 0), 0) || '—'}
                  </TableCell>
                  <TableCell align="right">
                    {!actual
                      ? <Typography variant="caption" color="text.secondary">No actual yet</Typography>
                      : (
                        <Chip
                          size="small"
                          label={`${diff >= 0 ? 'Ahead' : 'Behind'} ${Math.abs(diff)} MT`}
                          sx={{ height: 20, color: '#fff', bgcolor: diff >= 0 ? COLORS.good : COLORS.attention }}
                        />
                      )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </SectionCard>

      {/* S06-SC-12 */}
      <SectionCard title="S06-SC-12 — What-if scenario">
        <TraceNote workflow="WF-S06-04 / Step 6 — modelling SMA sales against different production capacities and prices, identified by the business as an AI-supported scenario capability" />
        <FieldGrid columns={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">Production capacity ({capacityPct} % of plan)</Typography>
            <Slider size="small" value={capacityPct} min={50} max={150} step={5} onChange={(_, v) => setCapacityPct(v as number)} />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Price (USD/MT)</Typography>
            <TextField variant="standard" value={whatIfPrice} onChange={(e) => setWhatIfPrice(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)} sx={{ width: 100 }} />
          </Box>
        </FieldGrid>
        <Table size="small" sx={{ mt: 1.5 }}>
          <TableHead>
            <TableRow>
              {['', 'Volume (MT)', 'Price (USD/MT)', 'Value (USD)'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }} align={h === '' ? 'left' : 'right'}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Current expected position</TableCell>
              <TableCell align="right">{sma.total.toLocaleString()}</TableCell>
              <TableCell align="right">640</TableCell>
              <TableCell align="right">{(sma.total * 640).toLocaleString()}</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: '#EAF4FB' }}>
              <TableCell sx={{ fontWeight: 700 }}>Scenario</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{Math.round(sma.total * capacityPct / 100).toLocaleString()}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{whatIfPrice}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{Math.round(sma.total * capacityPct / 100 * whatIfPrice).toLocaleString()}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Difference</TableCell>
              <TableCell align="right">{(Math.round(sma.total * capacityPct / 100) - sma.total).toLocaleString()}</TableCell>
              <TableCell align="right">{whatIfPrice - 640}</TableCell>
              <TableCell align="right">{(Math.round(sma.total * capacityPct / 100 * whatIfPrice) - sma.total * 640).toLocaleString()}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Alert severity="info" icon={false} sx={{ mt: 1.5, fontSize: '0.8rem' }}>
          The business identified this as an <b>AI-supported scenario capability</b>. The prototype computes the
          arithmetic locally — no AI service is called.
        </Alert>
      </SectionCard>

      <BottomBar>
        <Button component={Link} to="/s06" variant="outlined">Back to the expected position</Button>
        <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
          Actual sales and invoices against plan, shortages and damages, and the scenario comparison are published
          through C11 Reporting.
        </Typography>
      </BottomBar>

      {/* record a sale */}
      <Dialog open={saleOpen} onClose={() => setSaleOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.primary, color: '#fff', py: 1.25 }}>
          Record an SMA sale
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.85 }}>WF-S06-04 / Step 1</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box>
            <RequiredLabel label="Stock line (SMA-flagged only)" required />
            <Select fullWidth variant="standard" value={draft.lineId} onChange={(e) => setDraft({ ...draft, lineId: e.target.value })}>
              {flagged.map((f) => (
                <MenuItem key={f.id} value={f.id}>{f.commodity} · {f.batch} · {f.quantityMt} MT · {f.warehouse}</MenuItem>
              ))}
            </Select>
            {flagged.length === 0 && (
              <Typography variant="caption" sx={{ color: COLORS.attention }}>
                No stock currently carries the SMA attribute — transfer stock first.
              </Typography>
            )}
          </Box>
          <FieldGrid columns={2}>
            <Box sx={{ mt: 2 }}>
              <RequiredLabel label="Quantity counted (MT)" required />
              <TextField fullWidth variant="standard" value={draft.countedMt || ''} onChange={(e) => setDraft({ ...draft, countedMt: Number(e.target.value.replace(/[^0-9.]/g, '')) })} />
            </Box>
            <Box sx={{ mt: 2 }}>
              <RequiredLabel label="Quantity sold (MT)" required />
              <TextField fullWidth variant="standard" value={draft.soldMt || ''} onChange={(e) => setDraft({ ...draft, soldMt: Number(e.target.value.replace(/[^0-9.]/g, '')) })} />
            </Box>
          </FieldGrid>
          <ReadOnlyField label="Counterparty" value="Trading company" />
          <ReadOnlyField label="Price applied" value={`${linePrice} USD/MT`} />
          <ReadOnlyField label="Value" value={`${(draft.soldMt * linePrice).toLocaleString()} USD`} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaleOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!line || !draft.soldMt}
            onClick={() => {
              const id = `SMA-S-00${89 + sales.length}`;
              addSale({
                id, date: draft.date, counterparty: 'Trading company',
                commodity: line!.commodity, batch: line!.batch,
                countedMt: draft.countedMt, soldMt: draft.soldMt, value: draft.soldMt * linePrice,
                invoiceRef: '', invoiceDate: '', invoiceValue: draft.soldMt * linePrice,
                invoiceSource: invoiceInCots ? 'COTS' : 'Enterprise system (reference)',
              });
              setSaleOpen(false);
              say(`${id} recorded — the invoice reference is tracked against the sale`);
            }}
          >
            Record sale
          </Button>
        </DialogActions>
      </Dialog>

      {/* debit note */}
      <Dialog open={dnOpen} onClose={() => setDnOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Raise a debit note</DialogTitle>
        <DialogContent>
          <TraceNote workflow="WF-S06-04 / Step 3" />
          <RadioGroup row value={dn.reason} onChange={(e) => setDn({ ...dn, reason: e.target.value as any })}>
            <FormControlLabel value="Short" control={<Radio size="small" />} label="Short quantity" />
            <FormControlLabel value="Damage" control={<Radio size="small" />} label="Damage" />
          </RadioGroup>
          <Box sx={{ mt: 1 }}>
            <RequiredLabel label="Related transaction" required />
            <Select fullWidth variant="standard" value={dn.relatedTo} onChange={(e) => setDn({ ...dn, relatedTo: e.target.value })}>
              {sales.map((s) => <MenuItem key={s.id} value={s.id}>{s.id} · {s.commodity} · {s.batch}</MenuItem>)}
            </Select>
          </Box>
          <FieldGrid columns={2}>
            <Box sx={{ mt: 2 }}>
              <RequiredLabel label="Quantity (MT)" required />
              <TextField fullWidth variant="standard" value={dn.quantityMt || ''} onChange={(e) => setDn({ ...dn, quantityMt: Number(e.target.value.replace(/[^0-9.]/g, '')) })} />
            </Box>
            <Box sx={{ mt: 2 }}>
              <RequiredLabel label="Reference" required />
              <TextField fullWidth variant="standard" value={dn.reference} onChange={(e) => setDn({ ...dn, reference: e.target.value })} placeholder="DN-0032" />
            </Box>
          </FieldGrid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDnOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!dn.quantityMt || !dn.reference.trim() || !dn.relatedTo}
            onClick={() => {
              addDebitNote({
                id: `DN-${debitNotes.length + 1}`, reason: dn.reason, relatedTo: dn.relatedTo,
                quantityMt: dn.quantityMt, value: Math.round(dn.quantityMt * 640), reference: dn.reference, documents: [],
              });
              setDnOpen(false);
              say(`${dn.reference} captured against ${dn.relatedTo}`);
            }}
          >
            Raise
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
