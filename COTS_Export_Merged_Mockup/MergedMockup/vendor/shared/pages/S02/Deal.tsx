import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem,
  Radio, RadioGroup, Select, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField,
  Tooltip, Typography,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import {
  BottomBar, BusinessConfirmation, EmptyState, HandOffBanner, PrototypeNote, ReadOnlyField, RequiredLabel,
  SectionCard, TraceNote,
} from '../../components/shared';
import { useStore } from '../../state/store';
import { useS02 } from '../../state/s02store';
import { CONTRACT_PERFORMANCE } from '../../mockData/s02';
import { COLORS } from '../../theme';

const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/* ============================================================ S02-SC-12 */

export default function Deal() {
  const { country, say } = useStore();
  const {
    snapshots, position, setPosition, expectedRawPrice, setExpectedRawPrice,
    attachedSnapshot, setAttachedSnapshot, dealCreated, createDeal, reviseDeal,
    longMandatory, setLongMandatory, addSnapshot,
  } = useS02();

  const [reviseOpen, setReviseOpen] = React.useState(false);

  // Only the trader's own snapshots for the commodity and destination in question are offered.
  const selectable = snapshots.filter((s) => !s.superseded && (!s.locked || s.id === attachedSnapshot));
  const attached = snapshots.find((s) => s.id === attachedSnapshot);
  const dealSnapshots = snapshots.filter((s) => s.dealRef === 'DEAL-0461' || s.dealRef === 'DEAL-0461 (revised)');

  const costingMandatory = position === 'Short' || longMandatory;
  const priceRequired = position === 'Short';

  const blockingReasons: string[] = [];
  if (costingMandatory && !attachedSnapshot) {
    blockingReasons.push('A costing snapshot must be attached before the deal agreement can be created.');
  }
  if (priceRequired && !expectedRawPrice) {
    blockingReasons.push('The expected raw material purchase price must be entered on a short position.');
  }
  const canCreate = blockingReasons.length === 0 && !dealCreated;

  const doRevise = () => {
    // A revision takes a NEW snapshot. The previous one is retained and marked superseded.
    const src = attached;
    const maxNo = snapshots.reduce((m, s2) => Math.max(m, Number(s2.id.replace('CS-', '')) || 0), 271);
    const newId = `CS-0${maxNo + 1}`;
    if (src) {
      addSnapshot({
        ...JSON.parse(JSON.stringify(src)),
        id: newId,
        createdOn: '19-Aug-2026',
        createdBy: 'Trader — A. Bakri',
        locked: false,
        superseded: false,
        dealRef: undefined,
      });
    }
    reviseDeal(newId);
    setReviseOpen(false);
    say(`Deal revised. Snapshot ${newId} taken and locked; the previous snapshot is retained as superseded.`);
  };

  return (
    <AppShell
      title="Deal agreement — cost panel"
      breadcrumb={[country, 'Shared Modules', 'Costing', 'Deal agreement']}
      showSeason={false}
    >
      <PrototypeNote>
        This screen is the <b>cost control on the deal agreement only</b>. The Export deal agreement workflow itself
        is not reproduced — the surrounding contract, counterparty and shipment fields belong to Export and are
        shown as a labelled stub.
      </PrototypeNote>

      <HandOffBanner
        to="Export — deal agreement"
        passes="the locked costing snapshot and the expected raw material purchase price"
        returns="the deal reference the snapshot is attached to"
        resumes="Costing resumes at the estimated-against-actual comparison"
      />

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 520px', minWidth: 420 }}>
          {/* ---------------------------------------------------- position */}
          <SectionCard title="S02-SC-12 · Stock allocation position">
            <TraceNote workflow="WF-S02-03 / Step 1 — the deal agreement step asks whether the position is short or long" />

            <RadioGroup
              row
              value={position}
              onChange={(e) => setPosition(e.target.value as 'Short' | 'Long')}
              sx={{ mt: 1 }}
            >
              <FormControlLabel value="Short" control={<Radio size="small" />} label="Short position" disabled={dealCreated} />
              <FormControlLabel value="Long" control={<Radio size="small" />} label="Long position" disabled={dealCreated} />
            </RadioGroup>

            <Alert severity="info" sx={{ mt: 1, fontSize: '0.8rem' }}>
              {position === 'Short' ? (
                <>
                  On a <b>short position</b> the source is firm: the cost calculation is mandatory and the expected raw
                  material purchase price must be entered before the agreement can proceed.
                </>
              ) : (
                <>
                  On a <b>long position</b> the material is already held, so the expected purchase price does not apply.
                  Whether the cost calculation is still mandatory is <b>not resolved</b> — the toggle below shows both
                  behaviours.
                </>
              )}
            </Alert>

            <BusinessConfirmation>
              Confirm whether the cost calculation is also mandatory for long positions.
            </BusinessConfirmation>

            <Box sx={{ mt: 0.5 }}>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={longMandatory}
                    onChange={(e) => setLongMandatory(e.target.checked)}
                    disabled={dealCreated}
                  />
                }
                label={
                  <Typography variant="caption" sx={{ color: COLORS.attention, fontWeight: 700 }}>
                    PROTOTYPE ASSUMPTION — make the cost calculation mandatory on long positions too
                  </Typography>
                }
              />
              <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary }}>
                Off by default, which follows the source. The toggle exists so the client can see the alternative
                behaviour before deciding. Not production functionality.
              </Typography>
            </Box>
          </SectionCard>

          {/* ------------------------------------------------ mandatory inputs */}
          <SectionCard title="Cost inputs required by the agreement">
            <TraceNote workflow="WF-S02-03 / Steps 2–3 — expected raw material purchase price, and the costing snapshot as a mandatory input" />

            <Stack spacing={2} sx={{ mt: 1 }}>
              {priceRequired ? (
                <Box>
                  <RequiredLabel label="Expected raw material purchase price" required />
                  <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={expectedRawPrice}
                      onChange={(e) => setExpectedRawPrice(e.target.value)}
                      disabled={dealCreated}
                      sx={{ width: 200 }}
                      placeholder="e.g. 620"
                    />
                    <ReadOnlyField label="Currency · basis" value="USD · per MT" />
                  </Stack>
                </Box>
              ) : (
                <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                  The expected raw material purchase price is <b>not shown on a long position</b> — the material is
                  already owned, so there is no expected purchase to record.
                </Alert>
              )}

              <Box>
                <RequiredLabel label="Costing snapshot" required={costingMandatory} />
                <Select
                  size="small"
                  displayEmpty
                  value={attachedSnapshot}
                  onChange={(e) => setAttachedSnapshot(e.target.value)}
                  disabled={dealCreated}
                  sx={{ mt: 0.5, minWidth: 380 }}
                >
                  <MenuItem value="">
                    <em>No snapshot attached</em>
                  </MenuItem>
                  {selectable.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.id} · {s.commodity} · {s.destination} · {s.incoterm} · {s.createdOn}
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mt: 0.5 }}>
                  The picker lists the trader's own snapshots for the commodity and destination. A snapshot already
                  locked to another deal is not offered.
                </Typography>
                {selectable.length === 0 && (
                  <Alert severity="warning" sx={{ mt: 1, fontSize: '0.8rem' }}>
                    No unattached snapshot exists. Produce one in the calculator first.{' '}
                    <Link to="/s02/calculator" style={{ color: COLORS.primary }}>Open the cost estimate calculator</Link>
                  </Alert>
                )}
              </Box>

              {attached && (
                <Box sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 1, p: 1.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2">{attached.id}</Typography>
                    {attached.locked ? (
                      <Chip
                        size="small"
                        icon={<LockOutlinedIcon sx={{ fontSize: 14 }} />}
                        label="Locked"
                        sx={{ bgcolor: '#FDECEA', color: COLORS.bad, fontWeight: 700 }}
                      />
                    ) : (
                      <Chip size="small" label="Not yet locked" sx={{ bgcolor: '#EEEEEE', color: COLORS.draft }} />
                    )}
                  </Stack>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
                    <ReadOnlyField label="Commodity · destination" value={`${attached.commodity} · ${attached.destination}`} />
                    <ReadOnlyField label="Incoterm · structure" value={`${attached.incoterm} · ${attached.structure}`} />
                    <ReadOnlyField label="Quantity" value={`${attached.quantityMt.toLocaleString()} MT`} />
                    <ReadOnlyField
                      label="Estimated cost"
                      value={
                        attached.costMin === attached.costMax
                          ? `USD ${money(attached.costMin)}`
                          : `USD ${money(attached.costMin)} – ${money(attached.costMax)}`
                      }
                    />
                    <ReadOnlyField label="Sales price" value={`USD ${attached.salesPrice} / MT`} />
                    <ReadOnlyField label="Taken by · on" value={`${attached.createdBy} · ${attached.createdOn}`} />
                  </Box>
                  <Button size="small" component={Link} to="/s02/calculator" sx={{ mt: 1 }}>
                    Open the snapshot detail
                  </Button>
                </Box>
              )}
            </Stack>
          </SectionCard>
        </Box>

        {/* ------------------------------------------------------- right column */}
        <Box sx={{ flex: '1 1 380px', minWidth: 340 }}>
          <SectionCard title="Agreement action">
            <TraceNote workflow="WF-S02-03 / Steps 3–4 — the agreement cannot be created without the cost calculation; once created the snapshot is locked" />

            {!dealCreated ? (
              <>
                {blockingReasons.length > 0 && (
                  <Alert severity="warning" sx={{ mt: 1, fontSize: '0.8rem' }}>
                    <b>The agreement cannot be created yet:</b>
                    <Box component="ul" sx={{ pl: 2, m: 0.5 }}>
                      {blockingReasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </Box>
                  </Alert>
                )}
                <Tooltip title={blockingReasons.length > 0 ? blockingReasons.join(' ') : ''}>
                  <span>
                    <Button
                      variant="contained"
                      disabled={!canCreate}
                      onClick={() => {
                        createDeal();
                        say('Deal agreement DEAL-0461 created. The attached costing snapshot is now locked and cannot be edited.');
                      }}
                      sx={{ mt: 1.5 }}
                    >
                      Create the deal agreement
                    </Button>
                  </span>
                </Tooltip>
                {!costingMandatory && (
                  <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mt: 1 }}>
                    On a long position with the assumption toggle off, the agreement is not blocked by the absence of
                    a snapshot — attaching one is still permitted.
                  </Typography>
                )}
              </>
            ) : (
              <>
                <Alert severity="success" sx={{ mt: 1, fontSize: '0.8rem' }}>
                  Deal agreement <b>DEAL-0461</b> created on a <b>{position.toLowerCase()}</b> position. The attached
                  costing snapshot is <b>locked and cannot be edited</b>, and remains available on the contract for
                  reference.
                </Alert>
                <Button variant="outlined" onClick={() => setReviseOpen(true)} sx={{ mt: 1.5 }}>
                  Revise the deal
                </Button>
                <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mt: 0.5 }}>
                  A revision takes a <b>new</b> snapshot. The earlier snapshot is retained, not replaced.
                </Typography>
              </>
            )}
          </SectionCard>

          <SectionCard title="Snapshots on this deal">
            <TraceNote workflow="WF-S02-03 / Steps 5–6 — the snapshot remains available on the contract; a revision produces a second snapshot and both are retained" />
            {dealSnapshots.length === 0 ? (
              <EmptyState text="No snapshot is attached to a deal agreement yet." />
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Snapshot', 'Taken on', 'Cost (USD)', 'Deal reference', 'State'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dealSnapshots.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.id}</TableCell>
                      <TableCell>{s.createdOn}</TableCell>
                      <TableCell align="right">
                        {s.costMin === s.costMax ? money(s.costMin) : `${money(s.costMin)} – ${money(s.costMax)}`}
                      </TableCell>
                      <TableCell>{s.dealRef ?? '—'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={s.superseded ? 'Superseded — retained' : 'Locked'}
                          sx={
                            s.superseded
                              ? { bgcolor: '#F0F0F0', color: COLORS.neutral }
                              : { bgcolor: '#FDECEA', color: COLORS.bad, fontWeight: 700 }
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
              An earlier deal on this commodity, <b>DEAL-0455</b>, carries snapshot <b>CS-0271</b> — shown here as an
              already-locked snapshot that the picker will not offer for a new agreement.
            </Alert>
          </SectionCard>

          <SectionCard title="Costing performance">
            <Button variant="outlined" component={Link} to="/s02/performance" size="small">
              Estimated against actual
            </Button>
          </SectionCard>
        </Box>
      </Box>

      <BottomBar>
        <Button component={Link} to="/s02" variant="outlined">Back to the catalogue</Button>
        <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
          Approval of the deal agreement itself is Core C4; the audit of the locked snapshot is Core C8.
        </Typography>
      </BottomBar>

      <Dialog open={reviseOpen} onClose={() => setReviseOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Revise the deal</DialogTitle>
        <DialogContent>
          <TraceNote workflow="WF-S02-03 / Step 6 — where the deal is revised, a new costing snapshot is taken" />
          <Alert severity="warning" sx={{ mt: 1, fontSize: '0.85rem' }}>
            The locked snapshot <b>{attachedSnapshot}</b> will <b>not</b> be edited. A new snapshot is taken from the
            current element values and attached to the revised agreement. Both snapshots are retained and listed, so
            the basis of the original agreement stays reproducible.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviseOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={doRevise}>Take a new snapshot and revise</Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}

/* ============================================================ S02-SC-13 */

export function Performance() {
  const { country } = useStore();
  const { snapshots } = useS02();

  const rows = CONTRACT_PERFORMANCE.map((c) => {
    const snap = snapshots.find((s) => s.id === c.snapshot);
    return { ...c, snapshotExists: !!snap };
  });

  return (
    <AppShell
      title="Estimated against actual"
      breadcrumb={[country, 'Shared Modules', 'Costing', 'Estimated against actual']}
      showSeason={false}
    >
      <TraceNote workflow="WF-S02-03 / Step 7 — costing performance: estimated against actual, and margin analysis by commodity, destination and incoterm" />

      <BusinessConfirmation>
        Confirm how the estimate is compared to actual cost, given that COTS does not track inventory value.
      </BusinessConfirmation>

      <Alert severity="warning" sx={{ mb: 2, fontSize: '0.82rem' }}>
        The <b>actual cost</b> column below is deliberately left <b>unpopulated</b>. COTS does not hold inventory
        value, so where the actual figure would come from is an open question. Rather than showing an invented number,
        the prototype names the question — the column is present so the shape of the report is visible, and the
        derivation is decided by the business.
      </Alert>

      <SectionCard title="S02-SC-13 · Estimated against actual by contract">
        <Table size="small">
          <TableHead>
            <TableRow>
              {[
                'Contract', 'Commodity', 'Destination', 'Incoterm', 'Snapshot',
                'Estimated cost (USD)', 'Actual cost (USD)', 'Difference', 'Margin estimated (USD)', 'Margin actual',
              ].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.contract}>
                <TableCell>{r.contract}</TableCell>
                <TableCell>{r.commodity}</TableCell>
                <TableCell>{r.destination}</TableCell>
                <TableCell>{r.incoterm}</TableCell>
                <TableCell>
                  {r.snapshotExists ? (
                    <Link to="/s02/calculator" style={{ color: COLORS.primary }}>{r.snapshot}</Link>
                  ) : (
                    r.snapshot
                  )}
                </TableCell>
                <TableCell align="right" style={{ whiteSpace: 'nowrap' }}>
                  {money(r.estMin)} – {money(r.estMax)}
                </TableCell>
                <TableCell align="right" sx={{ color: COLORS.textSecondary }}>
                  Not available
                </TableCell>
                <TableCell align="right" sx={{ color: COLORS.textSecondary }}>
                  Not available
                </TableCell>
                <TableCell align="right">{money(r.marginEst)}</TableCell>
                <TableCell align="right" sx={{ color: COLORS.textSecondary }}>
                  Not available
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mt: 1 }}>
          The estimate is shown as a minimum and a maximum because range-based elements were in scope on both
          contracts. The snapshot reference is what makes each estimate reproducible.
        </Typography>
      </SectionCard>

      <SectionCard title="Margin analysis — commodity, destination and incoterm">
        <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mb: 1 }}>
          This analysis needs no actual cost, so it is populated. Margin is the estimated margin held on the snapshot.
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Commodity', 'Destination', 'Incoterm', 'Contracts', 'Estimated margin (USD)', 'Margin per MT'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {CONTRACT_PERFORMANCE.map((c) => (
              <TableRow key={c.contract}>
                <TableCell>{c.commodity}</TableCell>
                <TableCell>{c.destination}</TableCell>
                <TableCell>{c.incoterm}</TableCell>
                <TableCell align="right">1</TableCell>
                <TableCell align="right">{money(c.marginEst)}</TableCell>
                <TableCell align="right">{(c.marginEst / 240).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      <PrototypeNote>
        Both reports are Core C11 report definitions in the built system; here they are rendered directly from the
        prototype's mock data.
      </PrototypeNote>

      <BottomBar>
        <Button component={Link} to="/s02/deal" variant="outlined">Back to the deal agreement</Button>
      </BottomBar>
    </AppShell>
  );
}
