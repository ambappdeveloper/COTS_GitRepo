import React from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, FormControlLabel, Paper, Stack, Switch, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import {
  BottomBar, BusinessConfirmation, HandOffBanner, PrototypeNote, ReadOnlyField, SectionCard, StatusChip,
  TraceNote, FieldGrid, RequiredLabel,
} from '../../components/shared';
import { NumberCell } from '../../components/PlanningGrid';
import { useStore } from '../../state/store';
import { useS05 } from '../../state/s05store';
import { priceAt, useS06 } from '../../state/s06store';
import { ALLOCATED_TRANSFER_ALLOWED, ALLOCATED_TRANSFER_CONDITION } from '../../mockData/s06';
import { COLORS } from '../../theme';

/** The SMA attribute chip — deliberately not a StatusChip. */
export function SmaChip({ on }: { on: boolean }) {
  return on
    ? <Chip size="small" label="SMA" sx={{ height: 18, bgcolor: COLORS.primary, color: '#fff', fontSize: '0.65rem', fontWeight: 700, borderRadius: '3px' }} />
    : <Typography variant="caption" color="text.secondary">—</Typography>;
}

export default function Transfer() {
  const { country, say } = useStore();
  const { shunting } = useS05();
  const {
    stock, flagStock, snapshotBefore, transfers, addTransfer, approveTransfer, prices,
    transferNeedsApproval, setTransferNeedsApproval,
  } = useS06();

  const [sel, setSel] = React.useState<Record<string, number>>({});
  const [invoiceRef, setInvoiceRef] = React.useState('');
  const [date, setDate] = React.useState('21-Aug-2026');
  const [lastFlagged, setLastFlagged] = React.useState<string | null>(null);

  const candidates = stock.filter((s) => !s.sma);
  const selectedIds = Object.keys(sel).filter((k) => sel[k] > 0);
  const selectedLines = candidates.filter((c) => selectedIds.includes(c.id));
  const priceFor = (commodity: string) => priceAt(prices, country, commodity, date);
  const totalValue = selectedLines.reduce((a, l) => a + sel[l.id] * (priceFor(l.commodity)?.price ?? 0), 0);

  const blocked = (line: (typeof stock)[number]) =>
    !!line.allocation && !ALLOCATED_TRANSFER_ALLOWED;

  const commit = () => {
    const id = `TRF-00${22 + transfers.length}`;
    selectedLines.forEach((l, idx) => {
      const p = priceFor(l.commodity);
      addTransfer({
        id: idx === 0 ? id : `${id}-${idx + 1}`,
        date,
        warehouse: l.warehouse,
        commodity: l.commodity,
        batch: l.batch,
        quantityMt: sel[l.id],
        price: p?.price ?? 0,
        value: sel[l.id] * (p?.price ?? 0),
        invoiceRef,
        performedBy: 'SMA operator',
        approval: transferNeedsApproval ? 'Pending approval' : 'Not required',
      });
      if (!transferNeedsApproval) flagStock(l.id, id);
    });
    setLastFlagged(selectedLines[0]?.id ?? null);
    setSel({});
    setInvoiceRef('');
    say(transferNeedsApproval
      ? 'Transfer submitted through C4 Approval — the SMA attribute is applied on approval'
      : 'Stock flagged as SMA — batch, allocation, warehouse and status unchanged');
  };

  const before = lastFlagged ? snapshotBefore[lastFlagged] : undefined;
  const after = lastFlagged ? stock.find((s) => s.id === lastFlagged) : undefined;
  const smaTrips = shunting.filter((s) => s.sma);

  return (
    <AppShell title="Transfer to SMA" breadcrumb={[country, 'SMA', 'Transfer']}>
      <Alert severity="info" icon={false} sx={{ mb: 2, fontSize: '0.82rem' }}>
        <b>Design rule.</b> The SMA indicator is an additional dimension on existing stock, not a separate stock
        record. You are selecting stock that already exists — its batch, allocation, warehouse and status stay as they
        are.
      </Alert>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 330px', gap: 2 }}>
        <SectionCard title="S06-SC-02 — Stock selection">
          <TraceNote workflow="WF-S06-02 / Steps 1, 4 — the user selects the warehouse and the quantity; where the stock is already allocated, the configured rule applies" />
          <Table size="small">
            <TableHead>
              <TableRow>
                {['', 'Warehouse', 'Commodity', 'Batch', 'Available (MT)', 'To transfer (MT)', 'Allocation', 'Grade', 'Status', 'SMA'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {candidates.map((l) => {
                const isBlocked = blocked(l);
                return (
                  <TableRow key={l.id} hover sx={{ bgcolor: isBlocked ? '#FAFAFA' : undefined }}>
                    <TableCell padding="checkbox">
                      <Tooltip title={isBlocked ? 'Configuration does not permit transferring allocated stock' : ''}>
                        <span>
                          <Checkbox
                            size="small" disabled={isBlocked}
                            checked={!!sel[l.id]}
                            onChange={(e) => setSel({ ...sel, [l.id]: e.target.checked ? l.quantityMt : 0 })}
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{l.warehouse}</TableCell>
                    <TableCell>{l.commodity}</TableCell>
                    <TableCell>{l.batch}</TableCell>
                    <TableCell align="right">{l.quantityMt}</TableCell>
                    <TableCell align="right">
                      <NumberCell
                        value={sel[l.id] || undefined}
                        disabled={isBlocked}
                        error={(sel[l.id] ?? 0) > l.quantityMt}
                        onChange={(v) => setSel({ ...sel, [l.id]: Math.min(v, l.quantityMt) })}
                      />
                    </TableCell>
                    <TableCell>
                      {l.allocation
                        ? <Chip size="small" label={l.allocation} sx={{ height: 18, fontSize: '0.65rem' }} />
                        : <Typography variant="caption" color="text.secondary">Unallocated</Typography>}
                    </TableCell>
                    <TableCell><Chip size="small" label={l.grade} sx={{ height: 18, fontSize: '0.65rem' }} /></TableCell>
                    <TableCell>
                      <StatusChip status={l.status === 'Blocked' ? 'Insufficient' : 'Approved'} />
                      {l.statusNote && (
                        <Typography variant="caption" sx={{ display: 'block', color: COLORS.attention }}>
                          {l.statusNote}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell><SmaChip on={l.sma} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Alert severity="info" icon={false} sx={{ mt: 1.5, fontSize: '0.8rem' }}>
            <b>Allocated stock.</b> {ALLOCATED_TRANSFER_ALLOWED
              ? `Permitted under the configured condition — ${ALLOCATED_TRANSFER_CONDITION}`
              : 'Not permitted by the configuration in force, so allocated rows cannot be selected.'}
          </Alert>
        </SectionCard>

        <Box>
          <SectionCard title="Value assignment">
            <TraceNote workflow="WF-S06-02 / Step 2 — the user assigns value by entering the prices and the invoices" />
            {selectedLines.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Select stock to assign value.</Typography>
            ) : (
              <>
                {selectedLines.map((l) => {
                  const p = priceFor(l.commodity);
                  return (
                    <Box key={l.id} sx={{ mb: 1.5, pb: 1.5, borderBottom: `1px solid ${COLORS.border}` }}>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{l.commodity} · {l.batch}</Typography>
                      <ReadOnlyField label="Quantity" value={`${sel[l.id]} MT`} />
                      <ReadOnlyField label="Price" value={p ? `${p.price} ${p.currency}/MT` : 'No effective price'} />
                      <ReadOnlyField label="Price basis" value={p ? `Effective ${p.effectiveFrom} → ${p.effectiveTo}` : '—'} />
                      <ReadOnlyField label="Value" value={`${(sel[l.id] * (p?.price ?? 0)).toLocaleString()} ${p?.currency ?? ''}`} />
                    </Box>
                  );
                })}
                <Box sx={{ mt: 1 }}>
                  <RequiredLabel label="Invoice reference" required />
                  <TextField fullWidth variant="standard" value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} placeholder="INV-SMA-0412" />
                </Box>
                <Box sx={{ mt: 1.5 }}>
                  <RequiredLabel label="Transfer date" required />
                  <TextField fullWidth variant="standard" value={date} onChange={(e) => setDate(e.target.value)} />
                </Box>
                <ReadOnlyField label="Total value" value={`${totalValue.toLocaleString()} USD`} />
                <ReadOnlyField label="Performed by" value="SMA operator" />
              </>
            )}
          </SectionCard>

          <SectionCard title="Approval assumption">
            <BusinessConfirmation>
              Confirm whether transfer to the agreement requires approval, and at what level.
              <PrototypeNote>the toggle below shows both shapes; neither is presented as decided.</PrototypeNote>
            </BusinessConfirmation>
            <FormControlLabel
              control={<Switch size="small" checked={transferNeedsApproval} onChange={(e) => setTransferNeedsApproval(e.target.checked)} />}
              label={
                <Typography variant="body2">
                  {transferNeedsApproval
                    ? 'Approval required — submitted through C4, flag applied on approval'
                    : 'No approval — the flag is applied directly'}
                </Typography>
              }
            />
          </SectionCard>

          <Button
            variant="contained" fullWidth
            disabled={selectedLines.length === 0 || !invoiceRef.trim()}
            onClick={commit}
          >
            {transferNeedsApproval ? 'Submit transfer for approval' : 'Transfer to SMA'}
          </Button>
        </Box>
      </Box>

      {/* S06-SC-03 */}
      {before && after && (
        <SectionCard title="S06-SC-03 — Stock record with the SMA flag · before and after">
          <TraceNote workflow="WF-S06-02 / Step 3 — the stock retains all of its existing statuses; the flag is an additional dimension, not a separate stock record" />
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Attribute', 'Before the transfer', 'After the transfer', ''].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {([
                ['Batch', before.batch, after.batch],
                ['Warehouse · location', before.warehouse, after.warehouse],
                ['Quantity', `${before.quantityMt} MT`, `${after.quantityMt} MT`],
                ['Stock status', before.status, after.status],
                ['Grade', before.grade, after.grade],
                ['Allocation', before.allocation || 'Unallocated', after.allocation || 'Unallocated'],
                ['SMA attribute', before.sma ? 'SMA' : '—', after.sma ? 'SMA' : '—'],
              ] as [string, string, string][]).map(([k, b, a]) => {
                const changed = b !== a;
                return (
                  <TableRow key={k} sx={{ bgcolor: changed ? '#EAF4FB' : undefined }}>
                    <TableCell sx={{ fontWeight: 600 }}>{k}</TableCell>
                    <TableCell>{b}</TableCell>
                    <TableCell sx={{ fontWeight: changed ? 700 : 400 }}>{a}</TableCell>
                    <TableCell>
                      {changed
                        ? <Chip size="small" label="changed" sx={{ height: 18, bgcolor: COLORS.primary, color: '#fff', fontSize: '0.65rem' }} />
                        : <Typography variant="caption" color="text.secondary">unchanged</Typography>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Alert severity="success" sx={{ mt: 1.5, fontSize: '0.82rem' }}>
            Only the SMA attribute changed. No parallel SMA inventory record was created, and the line keeps its own
            status, batch, allocation and warehouse.
          </Alert>
        </SectionCard>
      )}

      {/* S06-SC-04 */}
      <SectionCard title="S06-SC-04 — SMA transfer log">
        <TraceNote workflow="WF-S06-02 / Step 5 — the transfer is recorded with warehouse, commodity, quantity, batch, price, value, invoice reference, date and the user who performed it (C8 Audit)" />
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Transfer', 'Date', 'Warehouse', 'Commodity', 'Batch', 'Quantity (MT)', 'Price', 'Value', 'Invoice reference', 'Performed by', 'Approval'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {transfers.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell sx={{ fontWeight: 600, color: COLORS.primary }}>{t.id}</TableCell>
                <TableCell>{t.date}</TableCell>
                <TableCell>{t.warehouse}</TableCell>
                <TableCell>{t.commodity}</TableCell>
                <TableCell>{t.batch}</TableCell>
                <TableCell align="right">{t.quantityMt}</TableCell>
                <TableCell align="right">{t.price}</TableCell>
                <TableCell align="right">{t.value.toLocaleString()}</TableCell>
                <TableCell>{t.invoiceRef}</TableCell>
                <TableCell>{t.performedBy}</TableCell>
                <TableCell>
                  {t.approval === 'Pending approval' ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <StatusChip status="Pending Approval" />
                      <Button
                        size="small"
                        onClick={() => {
                          approveTransfer(t.id);
                          const line = stock.find((s) => s.batch === t.batch && !s.sma);
                          if (line) flagStock(line.id, t.id);
                          setLastFlagged(line?.id ?? null);
                          say('Transfer approved — the SMA attribute is now applied to the stock line');
                        }}
                      >
                        Approve
                      </Button>
                    </Stack>
                  ) : (
                    <Typography variant="caption" color="text.secondary">{t.approval}</Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <SectionCard title="Local shunting received from S05 — monthly transportation cost allocation">
          <TraceNote workflow="WF-S06-02 / Step 7 — local shunting movements relating to the agreement are recorded in S05 because they are not covered in the enterprise system, and are required for the monthly transportation cost allocation" />
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Date', 'Route', 'Trips', 'Commodity', 'Quantity (MT)'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {smaTrips.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.date}</TableCell>
                  <TableCell>{s.origin} → {s.destination}</TableCell>
                  <TableCell align="right">{s.trips}</TableCell>
                  <TableCell>{s.commodity}</TableCell>
                  <TableCell align="right">{s.quantityMt}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={2} sx={{ fontWeight: 700 }}>Total SMA-related trips</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{smaTrips.reduce((a, s) => a + s.trips, 0)}</TableCell>
                <TableCell />
                <TableCell align="right" sx={{ fontWeight: 700 }}>{smaTrips.reduce((a, s) => a + s.quantityMt, 0)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <HandOffBanner
            to="S05 Logistics / WF-S05-03 Local Shunting (inbound)"
            passes="nothing — S06 receives"
            returns="trip count, route and quantities for the period"
            resumes="the monthly transportation cost allocation under the agreement"
            linkLabel="Open the shunting log"
            linkTo="/s05/shunting"
          />
        </SectionCard>
      </SectionCard>

      <BottomBar>
        <Button component={Link} to="/s06" variant="outlined">Back to the expected position</Button>
        <Button variant="contained" component={Link} to="/s06/stock">Warehouse stock (SMA / non-SMA)</Button>
      </BottomBar>
    </AppShell>
  );
}
