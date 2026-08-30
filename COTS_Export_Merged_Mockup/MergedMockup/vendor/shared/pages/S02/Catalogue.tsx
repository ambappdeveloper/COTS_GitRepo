import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem,
  Radio, RadioGroup, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, ToggleButton,
  ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import {
  BottomBar, BusinessConfirmation, HandOffBanner, PrototypeNote, ReadOnlyField, SectionCard, TraceNote,
  FieldGrid, RequiredLabel,
} from '../../components/shared';
import { useStore } from '../../state/store';
import { useS05, validityState } from '../../state/s05store';
import { elementState, useS02 } from '../../state/s02store';
import { DESTINATION_LANE, type Basis, type CostElement } from '../../mockData/s02';
import { COLORS } from '../../theme';

export const stateColour = (s: string) =>
  s === 'Expired' ? COLORS.bad : s === 'Approaching expiry' ? COLORS.attention : s === 'Not yet effective' ? COLORS.neutral : COLORS.good;

/** Freight element value, live from the S05 rate grid for a lane. */
export function useFreightFromS05(lane: string) {
  const { rates } = useS05();
  const row = rates.find((r) => `${r.loadingPort} → ${r.destinationPort}` === lane);
  if (!row) return null;
  const values = Object.values(row.rates).filter((v) => v > 0);
  if (values.length === 0) return null;
  // rate is per container; expressed per MT at a nominal 24 MT per 40 ft / 12 MT per 20 ft equivalent
  const perMt = values.map((v) => v / 24);
  return {
    lane,
    min: Math.min(...perMt),
    max: Math.max(...perMt),
    validFrom: row.validFrom,
    validTo: row.validTo,
    state: validityState(row.validFrom, row.validTo),
    lines: Object.keys(row.rates).length,
  };
}

export default function Catalogue() {
  const { country, say } = useStore();
  const { elements, addElement, updateElement, requestUpdate, updateRequests } = useS02();
  const [structure, setStructure] = React.useState<'Owned' | 'Rented'>('Owned');
  const [expiry, setExpiry] = React.useState<CostElement | null>(null);
  const [history, setHistory] = React.useState<CostElement | null>(null);
  const [form, setForm] = React.useState(false);
  const [draft, setDraft] = React.useState<Partial<CostElement>>({
    code: '', description: '', category: 'Processing', country, commodity: 'Sesame', location: 'Gedaref',
    structure: 'Both', basis: undefined, valueType: 'Fixed', currency: 'USD', validityDays: 30, ownerRole: 'Processing', notes: '',
  });

  const freight = useFreightFromS05(DESTINATION_LANE['Nhava Sheva']);
  const visible = elements.filter((e) => e.structure === 'Both' || e.structure === structure);

  const valueOf = (e: CostElement) => {
    if (e.s05Lane && freight) return `${freight.min.toFixed(2)} – ${freight.max.toFixed(2)}`;
    return e.valueType === 'Range' ? `${e.min} – ${e.max}` : String(e.value);
  };
  const stateOf = (e: CostElement) => (e.s05Lane && freight ? freight.state : elementState(e));

  const canSave = !!draft.code && !!draft.description && !!draft.basis &&
    (draft.valueType === 'Fixed' ? !!draft.value : !!draft.min && !!draft.max) &&
    (draft.valueType === 'Fixed' || !!draft.notes);

  return (
    <AppShell title="Costing" breadcrumb={[country, 'Shared Modules', 'Costing']} showSeason={false}>
      <BusinessConfirmation>
        Provide the costing calculation sheet and the country cost element definitions.
        <PrototypeNote>the element set below is a placeholder built from what the source names.</PrototypeNote>
      </BusinessConfirmation>

      <SectionCard
        title="S02-SC-01 — Cost element catalogue"
        right={
          <Stack direction="row" spacing={2} alignItems="center">
            <Box>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary, mr: 1 }}>
                S02-SC-03 · Facility structure
              </Typography>
              <ToggleButtonGroup size="small" exclusive value={structure} onChange={(_, v) => v && setStructure(v)}>
                <ToggleButton value="Owned">Owned</ToggleButton>
                <ToggleButton value="Rented">Rented</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Button size="small" variant="outlined" onClick={() => setForm(true)}>New element</Button>
          </Stack>
        }
      >
        <TraceNote workflow="WF-S02-01 / Steps 1–7, 12 — elements defined per country covering raw material, processing and execution operation costs, each with an explicit basis of application" />
        <Typography variant="caption" sx={{ display: 'block', mb: 1, color: COLORS.textSecondary }}>
          Showing the <b>{structure.toLowerCase()}</b> facility structure — each structure has its own element set,
          so the calculator presents only the relevant elements.
        </Typography>

        {(['Raw material', 'Processing', 'Execution operation'] as const).map((cat) => (
          <Box key={cat} sx={{ mb: 2 }}>
            <Box sx={{ bgcolor: '#EEF1F4', px: 1.5, py: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>
                {cat.toUpperCase()} COSTS
              </Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Code · description', 'Commodity · location', 'Basis', 'Value', 'Currency', 'Validity', 'State', 'Owner', 'Source', ''].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.filter((e) => e.category === cat).map((e) => {
                  const st = stateOf(e);
                  return (
                    <TableRow key={e.id} hover sx={{ bgcolor: st === 'Expired' ? '#FDF3F2' : st === 'Approaching expiry' ? '#FFF7E6' : undefined }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: COLORS.primary }}>{e.code}</Typography>
                        <Typography variant="caption" color="text.secondary">{e.description}</Typography>
                      </TableCell>
                      <TableCell>{e.commodity} · {e.location}</TableCell>
                      <TableCell><Chip size="small" label={e.basis} sx={{ height: 18, fontSize: '0.65rem' }} /></TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {valueOf(e)}
                        {(e.valueType === 'Range' || e.s05Lane) && (
                          <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary }}>range</Typography>
                        )}
                      </TableCell>
                      <TableCell>{e.currency}</TableCell>
                      <TableCell>
                        {e.s05Lane && freight ? `${freight.validFrom} → ${freight.validTo}` : `${e.validityDays} d → ${e.validTo}`}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={st} sx={{ height: 20, color: '#fff', bgcolor: stateColour(st), fontSize: '0.68rem' }} />
                      </TableCell>
                      <TableCell>{e.ownerRole}</TableCell>
                      <TableCell>
                        {e.s05Lane
                          ? <Link to="/s05/rates" style={{ color: COLORS.primary }}>S05 rate</Link>
                          : <Typography variant="caption" color="text.secondary">Maintained here</Typography>}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          {st === 'Expired' && (
                            <Button size="small" onClick={() => setExpiry(e)}>Expired</Button>
                          )}
                          <Button size="small" onClick={() => setHistory(e)}>History</Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        ))}

        <Alert severity="info" icon={false} sx={{ fontSize: '0.8rem' }}>
          The <b>basis of application</b> is stated on every element — per metric tonne, per day or per bag. It
          determines how the element is multiplied in the calculation and must be explicit, not implied.
        </Alert>

        <HandOffBanner
          to="S05 Logistics / WF-S05-04 Freight rates (inbound)"
          passes="nothing — S02 receives"
          returns="rate by lane, container size and shipping line, with its validity period"
          resumes="the freight element follows the S05 rate; a stale rate makes the element expired"
          linkLabel="Open the freight rate grid"
          linkTo="/s05/rates"
        />
        {freight && (
          <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
            EXE-FRT is currently derived from {freight.lane} across {freight.lines} rate cells, giving a range —
            freight is the common range case.
          </Typography>
        )}
      </SectionCard>

      <Stack direction="row" spacing={1}>
        <Button size="small" variant="contained" component={Link} to="/s02/calculator">Cost estimate calculator</Button>
        <Button size="small" variant="outlined" component={Link} to="/s02/deal">Deal agreement cost panel</Button>
        <Button size="small" variant="outlined" component={Link} to="/s02/performance">Estimated against actual</Button>
      </Stack>

      {/* S02-SC-04 */}
      <Dialog open={!!expiry} onClose={() => setExpiry(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.bad, color: '#fff', py: 1.25 }}>
          Expired cost element
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>WF-S02-01 / Step 10</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {expiry && (
            <>
              <FieldGrid columns={2}>
                <ReadOnlyField label="Element" value={`${expiry.code} · ${expiry.description}`} />
                <ReadOnlyField label="Value" value={`${valueOf(expiry)} ${expiry.currency} ${expiry.basis.toLowerCase()}`} />
                <ReadOnlyField label="Valid to" value={expiry.validTo} />
                <ReadOnlyField label="Owner role" value={expiry.ownerRole} />
              </FieldGrid>
              <Alert severity="error" sx={{ mt: 2 }}>
                <b>Expired costing values cannot be used.</b> COTS alerts on expiry and presents a request-update
                action so the user who needs the value can prompt the owner directly rather than working around the
                control.
              </Alert>
              {updateRequests.includes(expiry.code) && (
                <Alert severity="success" sx={{ mt: 1 }}>
                  Update requested — an Actions Inbox item has been raised for the {expiry.ownerRole} role.
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExpiry(null)}>Close</Button>
          <Button
            variant="contained"
            disabled={!expiry || updateRequests.includes(expiry.code)}
            onClick={() => { if (expiry) { requestUpdate(expiry.code); say(`Update requested from the ${expiry.ownerRole} role`); } }}
          >
            Request update
          </Button>
        </DialogActions>
      </Dialog>

      {/* S02-SC-05 */}
      <Dialog open={!!history} onClose={() => setHistory(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.primary, color: '#fff', py: 1.25 }}>
          Element version history
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.85 }}>
            WF-S02-01 / Step 11 — changes are versioned and effective-dated so a historical estimate can always be reproduced
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {history && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Value', 'Currency', 'Effective from', 'Effective to', 'Changed by', 'Reason'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>{valueOf(history)}</TableCell>
                  <TableCell>{history.currency}</TableCell>
                  <TableCell>{history.validFrom}</TableCell>
                  <TableCell>{history.validTo}</TableCell>
                  <TableCell>{history.ownerRole}</TableCell>
                  <TableCell>Current version</TableCell>
                </TableRow>
                <TableRow sx={{ opacity: 0.6 }}>
                  <TableCell>{history.valueType === 'Range' ? `${(history.min ?? 0) * 0.95} – ${(history.max ?? 0) * 0.95}` : String(Math.round((history.value ?? 0) * 0.95 * 100) / 100)}</TableCell>
                  <TableCell>{history.currency}</TableCell>
                  <TableCell>01-Jul-2026</TableCell>
                  <TableCell>31-Jul-2026</TableCell>
                  <TableCell>{history.ownerRole}</TableCell>
                  <TableCell>Superseded by the August update</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
          <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: COLORS.textSecondary }}>
            A snapshot stores the element values it used, so an estimate stays reproducible after the catalogue moves
            on.
          </Typography>
        </DialogContent>
        <DialogActions><Button onClick={() => setHistory(null)}>Close</Button></DialogActions>
      </Dialog>

      {/* S02-SC-02 */}
      <Dialog open={form} onClose={() => setForm(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.primary, color: '#fff', py: 1.25 }}>
          Cost element
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.85 }}>WF-S02-01 / Steps 2–7</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <FieldGrid columns={3}>
            <Box>
              <RequiredLabel label="Code" required />
              <TextField fullWidth variant="standard" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
            </Box>
            <Box>
              <RequiredLabel label="Description" required />
              <TextField fullWidth variant="standard" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </Box>
            <Box>
              <RequiredLabel label="Category" required />
              <Select fullWidth variant="standard" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as any })}>
                {['Raw material', 'Processing', 'Execution operation'].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </Box>
          </FieldGrid>

          <SectionCard title="Assignment">
            <FieldGrid columns={4}>
              <ReadOnlyField label="Country (confirmed)" value={country} />
              <Box>
                <RequiredLabel label="Commodity (confirmed)" required />
                <Select fullWidth variant="standard" value={draft.commodity} onChange={(e) => setDraft({ ...draft, commodity: e.target.value })}>
                  {['Sesame', 'Groundnut', 'Gum Arabic', 'Chickpea'].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Location (to be decided)</Typography>
                <Select fullWidth variant="standard" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })}>
                  {['Gedaref', 'El Obeid', 'Port Sudan'].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Facility structure (to be decided)</Typography>
                <Select fullWidth variant="standard" value={draft.structure} onChange={(e) => setDraft({ ...draft, structure: e.target.value as any })}>
                  {['Both', 'Owned', 'Rented'].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </Box>
            </FieldGrid>
            <BusinessConfirmation>
              Confirm the full assignment dimensions for cost elements — commodity and country are confirmed, but
              location, facility, supplier and season remain to be decided.
              <PrototypeNote>
                supplier and season are deliberately <b>not</b> shown as fields, because adding them would presume the
                answer.
              </PrototypeNote>
            </BusinessConfirmation>
          </SectionCard>

          <SectionCard title="Basis and value">
            <Box>
              <RequiredLabel label="Basis of application — no default; the basis must be explicit" required />
              <RadioGroup row value={draft.basis ?? ''} onChange={(e) => setDraft({ ...draft, basis: e.target.value as Basis })}>
                {(['Per MT', 'Per day', 'Per bag'] as Basis[]).map((b) => (
                  <FormControlLabel key={b} value={b} control={<Radio size="small" />} label={b} />
                ))}
              </RadioGroup>
            </Box>
            <Box sx={{ mt: 1 }}>
              <RequiredLabel label="Value type" required />
              <RadioGroup row value={draft.valueType} onChange={(e) => setDraft({ ...draft, valueType: e.target.value as any })}>
                <FormControlLabel value="Fixed" control={<Radio size="small" />} label="Fixed amount" />
                <FormControlLabel value="Range" control={<Radio size="small" />} label="Range" />
              </RadioGroup>
            </Box>
            {draft.valueType === 'Fixed' ? (
              <Box sx={{ maxWidth: 180 }}>
                <RequiredLabel label="Value" required />
                <TextField fullWidth variant="standard" value={draft.value ?? ''} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value.replace(/[^0-9.]/g, '')) })} />
              </Box>
            ) : (
              <>
                <FieldGrid columns={2}>
                  <Box>
                    <RequiredLabel label="Minimum" required />
                    <TextField fullWidth variant="standard" value={draft.min ?? ''} onChange={(e) => setDraft({ ...draft, min: Number(e.target.value.replace(/[^0-9.]/g, '')) })} />
                  </Box>
                  <Box>
                    <RequiredLabel label="Maximum" required />
                    <TextField fullWidth variant="standard" value={draft.max ?? ''} onChange={(e) => setDraft({ ...draft, max: Number(e.target.value.replace(/[^0-9.]/g, '')) })} />
                  </Box>
                </FieldGrid>
                <Alert severity="info" sx={{ mt: 1, fontSize: '0.78rem' }}>
                  Where a range is held, the calculator produces a <b>minimum and maximum estimate</b> rather than a
                  single figure.
                </Alert>
              </>
            )}
            <FieldGrid columns={3}>
              <Box sx={{ mt: 1 }}>
                <RequiredLabel label="Validity (days)" required />
                <TextField fullWidth variant="standard" value={draft.validityDays} onChange={(e) => setDraft({ ...draft, validityDays: Number(e.target.value.replace(/[^0-9]/g, '')) || 0 })} />
              </Box>
              <Box sx={{ mt: 1 }}>
                <RequiredLabel label="Owner role" required />
                <Select fullWidth variant="standard" value={draft.ownerRole} onChange={(e) => setDraft({ ...draft, ownerRole: e.target.value as any })}>
                  {['Sourcing', 'Processing', 'Execution'].map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </Select>
              </Box>
              <Box sx={{ mt: 1 }}>
                <RequiredLabel label="Notes" required={draft.valueType === 'Range'} />
                <TextField fullWidth variant="standard" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              </Box>
            </FieldGrid>
          </SectionCard>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(false)}>Cancel</Button>
          <Tooltip title={!draft.basis ? 'The basis of application must be stated — it determines how the element is multiplied' : ''}>
            <span>
              <Button
                variant="contained" disabled={!canSave}
                onClick={() => {
                  addElement({
                    id: `CE-${elements.length + 1}`,
                    code: draft.code!, description: draft.description!, category: draft.category as any,
                    country, commodity: draft.commodity!, location: draft.location!, structure: draft.structure as any,
                    basis: draft.basis!, valueType: draft.valueType as any, value: draft.value, min: draft.min, max: draft.max,
                    currency: 'USD', validityDays: draft.validityDays!, validFrom: '21-Aug-2026',
                    validTo: '20-Sep-2026', ownerRole: draft.ownerRole as any, notes: draft.notes ?? '',
                  });
                  setForm(false);
                  say(`${draft.code} added to the catalogue`);
                }}
              >
                Save element
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>

      <BottomBar>
        <Button component={Link} to="/s02/calculator" variant="outlined">Open the calculator</Button>
        <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
          Element currency and ageing — which elements are stale or expired — is published through C11 Reporting.
        </Typography>
      </BottomBar>
    </AppShell>
  );
}
