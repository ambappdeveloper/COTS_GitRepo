import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import {
  BottomBar, BusinessConfirmation, PrototypeNote, ReadOnlyField, SectionCard, TraceNote, FieldGrid, RequiredLabel,
} from '../../components/shared';
import { useStore } from '../../state/store';
import { elementState, useS02 } from '../../state/s02store';
import { useFreightFromS05, stateColour } from './Catalogue';
import { DESTINATION_LANE, INCOTERMS, INCOTERM_INCLUSION, type OtherCost } from '../../mockData/s02';
import { COLORS } from '../../theme';

export default function Calculator() {
  const { country, say, sourcing } = useStore();
  const { elements, snapshots, addSnapshot, requestUpdate, updateRequests } = useS02();

  const [commodity, setCommodity] = React.useState('Sesame');
  const [origin, setOrigin] = React.useState('Gedaref');
  const [destination, setDestination] = React.useState('Nhava Sheva');
  const [structure, setStructure] = React.useState<'Owned' | 'Rented'>('Owned');
  const [incoterm, setIncoterm] = React.useState<'FOB' | 'CFR' | 'CIF'>('CFR');
  const [rawPrice, setRawPrice] = React.useState(620);
  const [salesPrice, setSalesPrice] = React.useState(940);
  const [target, setTarget] = React.useState(12);
  const [qty, setQty] = React.useState(240);
  const [days, setDays] = React.useState(6);
  const [bags, setBags] = React.useState(4800);
  const [other, setOther] = React.useState<OtherCost[]>([]);
  const [otherOpen, setOtherOpen] = React.useState(false);
  const [otherDraft, setOtherDraft] = React.useState({ description: '', amount: 0 });
  const [copyOpen, setCopyOpen] = React.useState(false);
  const [saved, setSaved] = React.useState<string | null>(null);

  const freight = useFreightFromS05(DESTINATION_LANE[destination]);
  const included = INCOTERM_INCLUSION[incoterm];

  const scope = elements.filter(
    (e) => (e.structure === 'Both' || e.structure === structure) && e.commodity === commodity,
  );
  const inScope = scope.filter((e) => included.includes(e.code));
  const outOfScope = scope.filter((e) => !included.includes(e.code));

  const valueRange = (code: string) => {
    const e = inScope.find((x) => x.code === code)!;
    if (e.s05Lane) return freight ? { min: freight.min, max: freight.max } : { min: 0, max: 0 };
    if (e.valueType === 'Range') return { min: e.min ?? 0, max: e.max ?? 0 };
    if (e.code === 'RAW-PUR') return { min: rawPrice, max: rawPrice }; // trader's input drives this element
    return { min: e.value ?? 0, max: e.value ?? 0 };
  };
  const multiplierFor = (basis: string) => (basis === 'Per MT' ? qty : basis === 'Per day' ? days : bags);
  const stateOf = (code: string) => {
    const e = inScope.find((x) => x.code === code)!;
    return e.s05Lane && freight ? freight.state : elementState(e);
  };

  const expired = inScope.filter((e) => stateOf(e.code) === 'Expired');
  const approaching = inScope.filter((e) => stateOf(e.code) === 'Approaching expiry');
  const usesDays = inScope.some((e) => e.basis === 'Per day');
  const usesBags = inScope.some((e) => e.basis === 'Per bag');

  const lines = inScope.map((e) => {
    const r = valueRange(e.code);
    const m = multiplierFor(e.basis);
    return { ...e, min: r.min, max: r.max, multiplier: m, extMin: r.min * m, extMax: r.max * m, range: r.min !== r.max };
  });
  const otherTotal = other.reduce((a, o) => a + o.amount, 0);
  const costMin = lines.reduce((a, l) => a + l.extMin, 0) + otherTotal;
  const costMax = lines.reduce((a, l) => a + l.extMax, 0) + otherTotal;
  const revenue = salesPrice * qty;
  const marginMax = revenue - costMin;
  const marginMin = revenue - costMax;
  const isRange = costMin !== costMax;

  // S01 prefill
  const s01Price = sourcing.find((s) => s.commodity === commodity);

  return (
    <AppShell title="Cost Estimate Calculator" breadcrumb={[country, 'Costing', 'Calculator']} showSeason={false}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 420px) minmax(0, 1fr)', gap: 2 }}>
        <Box>
          <SectionCard title="S02-SC-06 — Inputs">
            <TraceNote workflow="WF-S02-02 / Steps 1–3 — commodity, origin and destination; the variables held at hand: raw material price, sales price, incoterms and profit margin" />
            <FieldGrid columns={2}>
              <Box>
                <RequiredLabel label="Commodity" required />
                <Select fullWidth variant="standard" value={commodity} onChange={(e) => setCommodity(e.target.value)}>
                  {['Sesame', 'Groundnut', 'Gum Arabic'].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </Box>
              <Box>
                <RequiredLabel label="Facility structure" required />
                <Select fullWidth variant="standard" value={structure} onChange={(e) => setStructure(e.target.value as any)}>
                  <MenuItem value="Owned">Owned</MenuItem>
                  <MenuItem value="Rented">Rented</MenuItem>
                </Select>
              </Box>
              <Box sx={{ mt: 1 }}>
                <RequiredLabel label="Origin location" required />
                <Select fullWidth variant="standard" value={origin} onChange={(e) => setOrigin(e.target.value)}>
                  {['Gedaref', 'El Obeid', 'Port Sudan'].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </Box>
              <Box sx={{ mt: 1 }}>
                <RequiredLabel label="Destination location" required />
                <Select fullWidth variant="standard" value={destination} onChange={(e) => setDestination(e.target.value)}>
                  {Object.keys(DESTINATION_LANE).map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </Box>
              <Box sx={{ mt: 1 }}>
                <RequiredLabel label="Incoterm" required />
                <Select fullWidth variant="standard" value={incoterm} onChange={(e) => setIncoterm(e.target.value as any)}>
                  {INCOTERMS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </Box>
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">Profit margin target (%)</Typography>
                <TextField fullWidth variant="standard" value={target} onChange={(e) => setTarget(Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)} />
              </Box>
            </FieldGrid>

            <Box sx={{ mt: 2 }}>
              <RequiredLabel label="Raw material price (USD/MT)" required />
              <TextField fullWidth variant="standard" value={rawPrice} onChange={(e) => setRawPrice(Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)} />
              {s01Price && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                    S01 sourcing expected price {s01Price.expectedPrice} USD/MT ({s01Price.agent})
                  </Typography>
                  <Button size="small" onClick={() => { setRawPrice(s01Price.expectedPrice); say('Expected price taken from the S01 sourcing plan'); }}>
                    Use
                  </Button>
                </Stack>
              )}
            </Box>
            <Box sx={{ mt: 1.5 }}>
              <RequiredLabel label="Sales price (USD/MT)" required />
              <TextField fullWidth variant="standard" value={salesPrice} onChange={(e) => setSalesPrice(Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)} />
            </Box>

            <SectionCard title="Multipliers — one per basis in scope">
              <FieldGrid columns={3}>
                <Box>
                  <RequiredLabel label="Quantity (MT)" required />
                  <TextField fullWidth variant="standard" value={qty} onChange={(e) => setQty(Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)} />
                </Box>
                {usesDays && (
                  <Box>
                    <RequiredLabel label="Days" required />
                    <TextField fullWidth variant="standard" value={days} onChange={(e) => setDays(Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)} />
                  </Box>
                )}
                {usesBags && (
                  <Box>
                    <RequiredLabel label="Bags" required />
                    <TextField fullWidth variant="standard" value={bags} onChange={(e) => setBags(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)} />
                  </Box>
                )}
              </FieldGrid>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                A per-day element cannot be multiplied without days, and a per-bag element cannot be multiplied
                without bags — so each input appears only when an element of that basis is in scope.
              </Typography>
            </SectionCard>

            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button size="small" variant="outlined" onClick={() => setOtherOpen(true)}>Other costs</Button>
              <Button size="small" variant="outlined" onClick={() => setCopyOpen(true)}>Copy last costing</Button>
            </Stack>
          </SectionCard>

          {/* S02-SC-07 */}
          <SectionCard title={`S02-SC-07 — Elements included and excluded by ${incoterm}`}>
            <TraceNote workflow="WF-S02-02 / Step 4 — the incoterm determines which elements are included; the user sees which the term brings in and which it excludes" />
            <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.good, display: 'block' }}>
              INCLUDED BY {incoterm}
            </Typography>
            {lines.map((l) => (
              <Stack key={l.code} direction="row" justifyContent="space-between" sx={{ py: 0.25 }}>
                <Typography variant="caption">{l.code} · {l.description}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>{l.basis}</Typography>
              </Stack>
            ))}
            <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary, display: 'block', mt: 1.5 }}>
              EXCLUDED BY {incoterm}
            </Typography>
            {outOfScope.length === 0 && <Typography variant="caption" color="text.secondary">None</Typography>}
            {outOfScope.map((e) => (
              <Stack key={e.code} direction="row" justifyContent="space-between" sx={{ py: 0.25, opacity: 0.6 }}>
                <Typography variant="caption">{e.code} · {e.description}</Typography>
                <Typography variant="caption">{e.basis}</Typography>
              </Stack>
            ))}
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: COLORS.textSecondary }}>
              Inclusion is configuration — which elements each incoterm brings in. Change the incoterm above and
              elements move between the two lists.
            </Typography>
          </SectionCard>
        </Box>

        {/* S02-SC-08 */}
        <Box>
          {expired.length > 0 ? (
            <SectionCard title="S02-SC-08 — Estimate blocked">
              <Alert severity="error" sx={{ mb: 2 }}>
                <b>An expired cost element is in scope, so no estimate is produced.</b> Expired costing values cannot
                be used, and COTS does not fall back to a stale figure or show a partial estimate.
              </Alert>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Element', 'Basis', 'Valid to', 'Owner role', ''].map((h) => <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expired.map((e) => (
                    <TableRow key={e.code}>
                      <TableCell sx={{ fontWeight: 600 }}>{e.code} · {e.description}</TableCell>
                      <TableCell>{e.basis}</TableCell>
                      <TableCell>{e.s05Lane && freight ? freight.validTo : e.validTo}</TableCell>
                      <TableCell>{e.ownerRole}</TableCell>
                      <TableCell align="right">
                        {updateRequests.includes(e.code)
                          ? <Chip size="small" label="Update requested" sx={{ height: 20, bgcolor: COLORS.good, color: '#fff' }} />
                          : (
                            <Button size="small" variant="outlined" onClick={() => { requestUpdate(e.code); say(`Update requested from the ${e.ownerRole} role`); }}>
                              Request update
                            </Button>
                          )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: COLORS.textSecondary }}>
                There is no override. The request-update action prompts the owner directly, which is the documented
                route rather than working around the control.
              </Typography>
              {destination === 'Shanghai' && (
                <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                  The Shanghai freight rate in S05 lapsed on 31-Jul-2026, which is what expired the freight element
                  here — the S05 → S02 link, working.
                </Alert>
              )}
            </SectionCard>
          ) : (
            <SectionCard title="S02-SC-08 — Estimate result and breakdown">
              <TraceNote workflow="WF-S02-02 / Steps 5, 7, 10 — the estimated cost, the resulting margin and the breakdown by element presented together, with a minimum and maximum where any element is a range" />
              {approaching.length > 0 && (
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  {approaching.length} element(s) approaching expiry — the estimate is produced, but the value should
                  be refreshed. Approaching expiry warns; it does not block.
                </Alert>
              )}
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Element', 'Basis', 'Multiplier', 'Value', 'Extended', 'State'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600 }} align={h === 'Element' || h === 'Basis' ? 'left' : 'right'}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.map((l) => (
                    <TableRow key={l.code} hover sx={{ bgcolor: l.range ? '#F7FBFF' : undefined }}>
                      <TableCell>
                        {l.code} · {l.description}
                        {l.range && <Chip size="small" label="range" sx={{ ml: 0.5, height: 16, fontSize: '0.6rem', bgcolor: COLORS.primary, color: '#fff' }} />}
                      </TableCell>
                      <TableCell>{l.basis}</TableCell>
                      <TableCell align="right">{l.multiplier.toLocaleString()}</TableCell>
                      <TableCell align="right">{l.range ? `${l.min.toFixed(2)} – ${l.max.toFixed(2)}` : l.min.toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {l.range ? `${Math.round(l.extMin).toLocaleString()} – ${Math.round(l.extMax).toLocaleString()}` : Math.round(l.extMin).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        <Chip size="small" label={stateOf(l.code)} sx={{ height: 18, fontSize: '0.62rem', color: '#fff', bgcolor: stateColour(stateOf(l.code)) }} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {other.map((o, i) => (
                    <TableRow key={i} sx={{ bgcolor: '#FAFAFA' }}>
                      <TableCell>Other cost · {o.description}</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell align="right">—</TableCell>
                      <TableCell align="right">{o.amount.toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{o.amount.toLocaleString()}</TableCell>
                      <TableCell />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Box sx={{ mt: 2, p: 2, bgcolor: '#F7F8F9', border: `1px solid ${COLORS.border}` }}>
                <FieldGrid columns={2}>
                  <ReadOnlyField
                    label="Total estimated cost"
                    value={<Typography component="span" sx={{ fontWeight: 700 }}>
                      {isRange ? `${Math.round(costMin).toLocaleString()} – ${Math.round(costMax).toLocaleString()} USD` : `${Math.round(costMin).toLocaleString()} USD`}
                    </Typography>}
                  />
                  <ReadOnlyField label="Revenue at sales price" value={`${revenue.toLocaleString()} USD`} />
                  <ReadOnlyField
                    label="Margin"
                    value={<Typography component="span" sx={{ fontWeight: 700, color: marginMin > 0 ? COLORS.good : COLORS.bad }}>
                      {isRange
                        ? `${Math.round(marginMin).toLocaleString()} – ${Math.round(marginMax).toLocaleString()} USD`
                        : `${Math.round(marginMax).toLocaleString()} USD`}
                    </Typography>}
                  />
                  <ReadOnlyField
                    label="Margin %"
                    value={isRange
                      ? `${((marginMin / revenue) * 100).toFixed(1)} – ${((marginMax / revenue) * 100).toFixed(1)} %`
                      : `${((marginMax / revenue) * 100).toFixed(1)} %`}
                  />
                  <ReadOnlyField
                    label={`Against target (${target} %)`}
                    value={
                      <Chip
                        size="small"
                        label={(marginMin / revenue) * 100 >= target ? 'Meets target' : 'Below target at the maximum cost'}
                        sx={{ height: 20, color: '#fff', bgcolor: (marginMin / revenue) * 100 >= target ? COLORS.good : COLORS.attention }}
                      />
                    }
                  />
                  <Box>
                    <Tooltip title="Unresolved — shown so the question is visible; the control does nothing">
                      <span>
                        <Button size="small" variant="outlined" disabled>Propose sales price from target margin</Button>
                      </span>
                    </Tooltip>
                  </Box>
                </FieldGrid>
                {isRange && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: COLORS.textSecondary }}>
                    The spread comes from {lines.filter((l) => l.range).map((l) => l.code).join(', ')} — freight is the
                    common range case.
                  </Typography>
                )}
              </Box>

              <BusinessConfirmation>
                Confirm whether COTS should also propose a sales price from a target margin, in addition to
                calculating the margin from a given price.
                <PrototypeNote>the control above is disabled and does nothing.</PrototypeNote>
              </BusinessConfirmation>

              <Button
                variant="contained" sx={{ mt: 1 }}
                onClick={() => {
                  const id = `CS-02${72 + snapshots.length}`;
                  addSnapshot({
                    id, createdBy: 'Trader — A. Bakri', createdOn: '21-Aug-2026',
                    commodity, origin, destination, incoterm, structure,
                    rawMaterialPrice: rawPrice, salesPrice, targetMargin: target,
                    quantityMt: qty, days, bags,
                    elementsUsed: lines.map((l) => ({
                      code: l.code, description: l.description, basis: l.basis, multiplier: l.multiplier,
                      min: l.min, max: l.max, validTo: l.s05Lane && freight ? freight.validTo : l.validTo,
                    })),
                    otherCosts: other,
                    costMin: Math.round(costMin), costMax: Math.round(costMax),
                    locked: false,
                  });
                  setSaved(id);
                  say(`${id} saved — the element values and validity dates used are stored on the snapshot`);
                }}
              >
                Save as costing snapshot
              </Button>
            </SectionCard>
          )}

          {/* S02-SC-11 */}
          {saved && (
            <SectionCard title={`S02-SC-11 — Costing snapshot ${saved}`}>
              <TraceNote workflow="WF-S02-02 / Steps 11–12 — the completed exercise is saved as a snapshot with its inputs, the element values used, their validity dates and the result" />
              {(() => {
                const s = snapshots.find((x) => x.id === saved);
                if (!s) return null;
                return (
                  <>
                    <FieldGrid columns={4}>
                      <ReadOnlyField label="Snapshot" value={s.id} />
                      <ReadOnlyField label="Created by · on" value={`${s.createdBy} · ${s.createdOn}`} />
                      <ReadOnlyField label="Incoterm · structure" value={`${s.incoterm} · ${s.structure}`} />
                      <ReadOnlyField label="Result" value={`${s.costMin.toLocaleString()} – ${s.costMax.toLocaleString()} USD`} />
                    </FieldGrid>
                    <Table size="small" sx={{ mt: 1 }}>
                      <TableHead>
                        <TableRow>
                          {['Element value stored on the snapshot', 'Basis', 'Multiplier', 'Value', 'Valid to (as at the snapshot)'].map((h) => (
                            <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {s.elementsUsed.map((e) => (
                          <TableRow key={e.code}>
                            <TableCell>{e.code} · {e.description}</TableCell>
                            <TableCell>{e.basis}</TableCell>
                            <TableCell align="right">{e.multiplier.toLocaleString()}</TableCell>
                            <TableCell align="right">{e.min === e.max ? e.min.toFixed(2) : `${e.min.toFixed(2)} – ${e.max.toFixed(2)}`}</TableCell>
                            <TableCell>{e.validTo}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                      The element values are stored <b>on the snapshot</b> — that is what keeps the estimate
                      reproducible after the catalogue moves on.
                    </Alert>
                    <Button size="small" variant="contained" component={Link} to="/s02/deal" sx={{ mt: 1 }}>
                      Take this snapshot to the deal agreement
                    </Button>
                  </>
                );
              })()}
            </SectionCard>
          )}
        </Box>
      </Box>

      <BottomBar>
        <Button component={Link} to="/s02" variant="outlined">Back to the catalogue</Button>
        <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
          Cost estimate history by trader, commodity and destination is published through C11 Reporting.
        </Typography>
      </BottomBar>

      {/* S02-SC-09 */}
      <Dialog open={otherOpen} onClose={() => setOtherOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Other costs</DialogTitle>
        <DialogContent>
          <TraceNote workflow="WF-S02-02 / Step 8 — externally calculated values that no configured element covers, with a mandatory description" />
          <Box sx={{ mt: 1 }}>
            <RequiredLabel label="Description" required />
            <TextField fullWidth variant="standard" value={otherDraft.description} onChange={(e) => setOtherDraft({ ...otherDraft, description: e.target.value })} />
          </Box>
          <Box sx={{ mt: 2, maxWidth: 200 }}>
            <RequiredLabel label="Amount (USD)" required />
            <TextField fullWidth variant="standard" value={otherDraft.amount || ''} onChange={(e) => setOtherDraft({ ...otherDraft, amount: Number(e.target.value.replace(/[^0-9.]/g, '')) })} />
          </Box>
          {other.length > 0 && (
            <Table size="small" sx={{ mt: 2 }}>
              <TableBody>
                {other.map((o, i) => (
                  <TableRow key={i}>
                    <TableCell>{o.description}</TableCell>
                    <TableCell align="right">{o.amount.toLocaleString()} USD</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOtherOpen(false)}>Close</Button>
          <Tooltip title={!otherDraft.description.trim() ? 'The description is mandatory' : ''}>
            <span>
              <Button
                variant="contained"
                disabled={!otherDraft.description.trim() || !otherDraft.amount}
                onClick={() => {
                  setOther([...other, { ...otherDraft, currency: 'USD' }]);
                  setOtherDraft({ description: '', amount: 0 });
                  say('Other cost added to the estimate with its description');
                }}
              >
                Add
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>

      {/* S02-SC-10 */}
      <Dialog open={copyOpen} onClose={() => setCopyOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Copy last costing values</DialogTitle>
        <DialogContent>
          <TraceNote workflow="WF-S02-02 / Step 9 — start from the previous exercise rather than re-entering every variable" />
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Snapshot', 'Commodity', 'Origin → destination', 'Incoterm', 'Created', 'Result', ''].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {snapshots.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{s.id}</TableCell>
                  <TableCell>{s.commodity}</TableCell>
                  <TableCell>{s.origin} → {s.destination}</TableCell>
                  <TableCell>{s.incoterm}</TableCell>
                  <TableCell>{s.createdOn}</TableCell>
                  <TableCell align="right">{s.costMin.toLocaleString()} – {s.costMax.toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      onClick={() => {
                        setCommodity(s.commodity); setOrigin(s.origin); setDestination(s.destination);
                        setIncoterm(s.incoterm as any); setStructure(s.structure);
                        setRawPrice(s.rawMaterialPrice); setSalesPrice(s.salesPrice); setTarget(s.targetMargin);
                        setQty(s.quantityMt); setDays(s.days); setBags(s.bags);
                        setCopyOpen(false);
                        say('Inputs copied — element values are taken fresh from the current catalogue');
                      }}
                    >
                      Copy
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
            <b>Copied:</b> the inputs — commodity, locations, incoterm, prices, margin and multipliers.{' '}
            <b>Not copied:</b> the element values, which are taken fresh from the current catalogue — an expired value
            cannot be reused.
          </Alert>
        </DialogContent>
        <DialogActions><Button onClick={() => setCopyOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </AppShell>
  );
}
