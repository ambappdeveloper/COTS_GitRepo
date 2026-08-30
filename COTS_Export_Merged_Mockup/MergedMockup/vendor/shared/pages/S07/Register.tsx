import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem,
  Radio, RadioGroup, Select, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField,
  Tooltip, Typography,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { DataTable, type Column } from '../../components/DataTable';
import {
  BottomBar, BusinessConfirmation, EmptyState, PrototypeNote, ReadOnlyField, RequiredLabel,
  SectionCard, TraceNote,
} from '../../components/shared';
import { useStore } from '../../state/store';
import { useS07 } from '../../state/s07store';
import { CONTRACTS, INCIDENT_CAUSES, type CauseCategory, type Claim, type ClaimType } from '../../mockData/s07';
import { COLORS } from '../../theme';

const money = (n: number, cur = 'USD') => (n ? `${cur} ${n.toLocaleString()}` : '—');

const days = (from: string, today = '19-Aug-2026') => {
  const d = (s: string) => new Date(s.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1, $3')).getTime();
  return Math.round((d(today) - d(from)) / 864e5);
};

export const stateColour = (s: string) =>
  s === 'Closed' || s === 'Settled'
    ? COLORS.good
    : s === 'Closed without settlement'
      ? COLORS.neutral
      : s === 'Approved'
        ? COLORS.progress
        : s === 'Submitted for approval'
          ? COLORS.attention
          : COLORS.draft;

/* ======================================================= S07-SC-01 register */

export default function ClaimRegister() {
  const { country } = useStore();
  const { claims, shipmentsDelivered } = useS07();
  const nav = useNavigate();

  const open = claims.filter((c) => !['Closed', 'Closed without settlement'].includes(c.state));
  const totalClaimed = claims.reduce((s, c) => s + c.claimValue, 0);
  const totalApproved = claims.reduce((s, c) => s + (c.approval?.approvedAmount ?? 0), 0);
  const totalSettled = claims.reduce((s, c) => s + (c.settledAmount ?? 0), 0);
  const withShipment = claims.filter((c) => c.shipments.length > 0).length;
  const rate = ((withShipment / shipmentsDelivered) * 100).toFixed(1);

  const columns: Column<Claim>[] = [
    {
      key: 'id', label: 'Claim', filterable: true,
      render: (r) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box
            component="span"
            onClick={() => nav(`/s07/claim/${r.id}`)}
            sx={{ color: COLORS.primary, fontWeight: 600, cursor: 'pointer' }}
          >
            {r.id}
          </Box>
          {r.shipments.length === 0 && (
            <Tooltip title="No shipment linked — this claim is excluded from the claim-rate denominator">
              <Chip size="small" label="No shipment" sx={{ height: 17, fontSize: '0.65rem', bgcolor: '#FDECEA', color: COLORS.bad }} />
            </Tooltip>
          )}
        </Stack>
      ),
      value: (r) => r.id,
    },
    { key: 'buyer', label: 'Buyer', filterable: true, value: (r) => r.buyer },
    { key: 'contract', label: 'Contract', filterable: true, value: (r) => r.contract },
    { key: 'shipments', label: 'Shipment(s)', render: (r) => (r.shipments.length ? r.shipments.join(', ') : '—'), value: (r) => r.shipments.join(', ') },
    { key: 'cause', label: 'Cause category', filterable: true, value: (r) => r.cause },
    { key: 'type', label: 'Claim type', filterable: true, value: (r) => r.type },
    { key: 'dateRaised', label: 'Date raised', value: (r) => r.dateRaised },
    { key: 'claimValue', label: 'Claim value', align: 'right', render: (r) => money(r.claimValue, r.currency), value: (r) => r.claimValue },
    { key: 'approved', label: 'Approved', align: 'right', render: (r) => money(r.approval?.approvedAmount ?? 0, r.currency), value: (r) => r.approval?.approvedAmount ?? 0 },
    { key: 'settled', label: 'Settled', align: 'right', render: (r) => money(r.settledAmount ?? 0, r.currency), value: (r) => r.settledAmount ?? 0 },
    {
      key: 'quality', label: 'Quality link',
      render: (r) => (r.qualityRecord ? <Link to={r.qualityRoute ?? '/s03/ncs'} style={{ color: COLORS.primary }}>{r.qualityRecord}</Link> : '—'),
      value: (r) => r.qualityRecord ?? '',
    },
    {
      key: 'state', label: 'State', filterable: true,
      render: (r) => (
        <Chip size="small" label={r.state} sx={{ height: 20, color: '#fff', bgcolor: stateColour(r.state), fontWeight: 600 }} />
      ),
      value: (r) => r.state,
    },
    { key: 'age', label: 'Age', align: 'right', render: (r) => `${days(r.dateRaised)} days`, value: (r) => days(r.dateRaised) },
  ];

  return (
    <AppShell title="Claims" breadcrumb={[country, 'Shared Modules', 'Claims']} showSeason={false}>
      <PrototypeNote>
        S7 is the <b>lightest module in the Shared layer, by design</b>. The business has stated that claims are
        investigated and tracked offline by the operation team and that the investigation need not be tracked in the
        system — so there is no investigation workflow here, and its absence is a decision rather than a gap.
      </PrototypeNote>

      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>
          CLAIM EXPOSURE — THE MODULE'S MANAGEMENT VALUE IN FIVE FIGURES
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
          {[
            { k: 'Claims open', v: String(open.length), n: 'Not yet settled or closed' },
            { k: 'Total claimed', v: money(totalClaimed), n: `${claims.length} claims registered` },
            { k: 'Total approved', v: money(totalApproved), n: 'Accepted at approval' },
            { k: 'Total settled', v: money(totalSettled), n: 'Actually settled' },
            { k: 'Claim rate', v: `${rate} %`, n: `${withShipment} claims with a shipment / ${shipmentsDelivered} shipments delivered` },
          ].map((c) => (
            <Box
              key={c.k}
              sx={{ border: `1px solid ${COLORS.border}`, bgcolor: '#fff', borderRadius: 1, px: 1.5, py: 1, minWidth: 190, flex: '1 1 190px' }}
            >
              <Typography variant="caption" sx={{ color: COLORS.textSecondary, fontWeight: 700 }}>{c.k}</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.primary, lineHeight: 1.2 }}>{c.v}</Typography>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>{c.n}</Typography>
            </Box>
          ))}
        </Stack>
      </Box>

      <SectionCard title="S07-SC-01 · Claim register">
        <TraceNote workflow="WF-S07-01 / Step 1 and WF-S07-03 / Step 3 — every commercial claim with its cause, value and state" />
        <DataTable
          columns={columns}
          rows={claims}
          onNew={() => nav('/s07/register')}
          newLabel="Register a claim"
          toolbarNote="Group by buyer, contract or cause. Claims closed without settlement are retained and still counted in the claim rate."
        />
      </SectionCard>

      <BottomBar>
        <Button variant="contained" component={Link} to="/s07/register">Register a claim</Button>
        <Button variant="outlined" component={Link} to="/s07/exposure">Contract exposure</Button>
        <Button variant="outlined" component={Link} to="/s07/reports">Claims reporting</Button>
      </BottomBar>
    </AppShell>
  );
}

/* ==================================================== S07-SC-02 registration */

export function ClaimRegistration() {
  const { country, say } = useStore();
  const { claims, addClaim, shipmentLinkRequired, setShipmentLinkRequired } = useS07();
  const nav = useNavigate();

  const [buyer, setBuyer] = React.useState('');
  const [contract, setContract] = React.useState('');
  const [shipments, setShipments] = React.useState<string[]>([]);
  const [cause, setCause] = React.useState<CauseCategory | ''>('');
  const [type, setType] = React.useState<ClaimType>('Quality');
  const [dateRaised, setDateRaised] = React.useState('19-Aug-2026');
  const [description, setDescription] = React.useState('');
  const [docs, setDocs] = React.useState<string[]>([]);
  const [quality, setQuality] = React.useState('');
  const [boundary, setBoundary] = React.useState(false);

  const contractRec = CONTRACTS.find((c) => c.id === contract);

  // the contract carries the buyer, so selecting it fixes the buyer
  React.useEffect(() => {
    if (contractRec) setBuyer(contractRec.buyer);
  }, [contract]);

  const blocking: string[] = [];
  if (!contract) blocking.push('The claim must be recorded against a contract.');
  if (!cause) blocking.push('The cause category must be chosen — quality or service. There is no default.');
  if (!description) blocking.push('The description of the issue is required.');
  if (docs.length === 0) blocking.push('At least one supporting document or item of correspondence is required.');
  if (shipmentLinkRequired && shipments.length === 0) {
    blocking.push('The configured rule requires a linked shipment before a claim can be registered.');
  }
  if (cause === 'Quality' && !quality) {
    blocking.push('Where the cause is quality, the related S03 inspection result or non-conformity must be linked.');
  }

  const onSave = () => {
    const id = `CL-0${188 + claims.filter((c) => c.id.startsWith('CL-')).length - 6}`;
    const claim: Claim = {
      id, buyer, contract, shipments, cause: cause as CauseCategory, type, dateRaised,
      registeredBy: 'Commercial — H. Osman', registeredOn: '19-Aug-2026',
      description, documents: docs,
      claimValue: 0, currency: 'USD', valueBasis: '',
      conclusion: '', concludedBy: '', concludedOn: '', recommended: 0,
      state: 'Registered',
      qualityRecord: quality || undefined,
      qualityRoute: quality ? '/s03/ncs' : undefined,
    };
    addClaim(claim);
    say(`Claim ${id} registered against contract ${contract}.`);
    nav(`/s07/claim/${id}`);
  };

  const claimsOnContract = claims.filter((c) => c.contract === contract);

  return (
    <AppShell
      title="Register a claim"
      breadcrumb={[country, 'Shared Modules', 'Claims', 'Register']}
      showSeason={false}
    >
      <BusinessConfirmation>
        Provide the fields required on the claim form, to be taken from the existing storage claim form and any
        equivalent quality claim form.
        <PrototypeNote>
          the fields below are a <b>labelled placeholder</b> drawn from what the source's data list names — reference,
          contract, shipment, buyer, date raised, cause category, description, claim value, currency and supporting
          documents. Nothing has been invented beyond it. Appendix A7 of the process design names the storage claim
          form as the source, and until it is supplied the form cannot be finalised.
        </PrototypeNote>
      </BusinessConfirmation>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 560px', minWidth: 440 }}>
          {/* ------------------------------------------------ S07-SC-04 guard */}
          <SectionCard title="S07-SC-04 · What belongs here">
            <TraceNote workflow="WF-S07-01 / Step 6 — commercial claims raised by the buyer against us; insurance claims are handled in S4 and are not registered here" />
            <Alert severity="info" sx={{ mt: 1, fontSize: '0.82rem' }}>
              This module records <b>commercial claims raised by the buyer against us</b>. Insurance claims arising
              from incidents — {INCIDENT_CAUSES.join(', ').toLowerCase()} — are handled as insurance cases in S4
              Compliance. The two have different counterparties, different evidence requirements and different
              owners, and are not merged.
            </Alert>
            <Button size="small" onClick={() => setBoundary(true)} sx={{ mt: 1 }}>
              This is an incident, not a buyer claim
            </Button>
          </SectionCard>

          <SectionCard title="S07-SC-02 · Claim">
            <TraceNote workflow="WF-S07-01 / Steps 1, 3 — buyer, date raised, cause category, description and supporting correspondence" />

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 1 }}>
              <Box>
                <RequiredLabel label="Contract" required />
                <Select
                  size="small" fullWidth displayEmpty value={contract}
                  onChange={(e) => { setContract(e.target.value); setShipments([]); }}
                  sx={{ mt: 0.5 }}
                >
                  <MenuItem value=""><em>Select the contract</em></MenuItem>
                  {CONTRACTS.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.id} · {c.buyer}</MenuItem>
                  ))}
                </Select>
              </Box>
              <ReadOnlyField label="Buyer (from the contract)" value={buyer || '—'} />
              <Box>
                <RequiredLabel label="Date raised by the buyer" required />
                <TextField size="small" fullWidth value={dateRaised} onChange={(e) => setDateRaised(e.target.value)} sx={{ mt: 0.5 }} />
              </Box>
              <ReadOnlyField label="Registered by · on" value="Commercial — H. Osman · 19-Aug-2026" />
            </Box>

            <Box sx={{ mt: 2 }}>
              <RequiredLabel label="Cause category" required />
              <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary }}>
                No default — the reporting by cause depends on this being chosen honestly at registration rather than
                defaulted and left. Only quality and service are offered.
              </Typography>
              <RadioGroup row value={cause} onChange={(e) => setCause(e.target.value as CauseCategory)}>
                <FormControlLabel value="Quality" control={<Radio size="small" />} label="Quality" />
                <FormControlLabel value="Service" control={<Radio size="small" />} label="Service" />
              </RadioGroup>
            </Box>

            <Box sx={{ mt: 1 }}>
              <RequiredLabel label="Claim type" required />
              <Select size="small" value={type} onChange={(e) => setType(e.target.value as ClaimType)} sx={{ mt: 0.5, minWidth: 220 }}>
                {(['Quality', 'Service', 'Demurrage', 'Storage'] as ClaimType[]).map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
              {(type === 'Demurrage' || type === 'Storage') && (
                <Alert severity="info" sx={{ mt: 1, fontSize: '0.8rem' }}>
                  Demurrage and storage claims are registered through this same pattern, using the fields taken from
                  the existing storage claim form.
                </Alert>
              )}
              {type === 'Demurrage' && (
                <BusinessConfirmation>
                  Confirm whether demurrage claims are handled here in S7 or within logistics.
                  <PrototypeNote>
                    demurrage is offered as a type so the consequence of the decision is visible. It is not presented
                    as settled — if the answer is logistics, the type is removed and the claim is raised in S5.
                  </PrototypeNote>
                </BusinessConfirmation>
              )}
            </Box>

            <Box sx={{ mt: 2 }}>
              <RequiredLabel label="Description of the issue" required />
              <TextField
                size="small" fullWidth multiline minRows={3} sx={{ mt: 0.5 }}
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="What the buyer is claiming and why."
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <RequiredLabel label="Supporting correspondence and documents" required />
              <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary }}>
                Held through Core C7. In the prototype, attaching is simulated.
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <Button
                  size="small" variant="outlined"
                  onClick={() => setDocs((d) => [...d, `buyer-correspondence-${d.length + 1}.pdf`])}
                >
                  Attach a document
                </Button>
                <Typography variant="body2">{docs.length} attached</Typography>
              </Stack>
              {docs.map((d) => (
                <Typography key={d} variant="caption" sx={{ display: 'block', color: COLORS.textSecondary }}>· {d}</Typography>
              ))}
            </Box>
          </SectionCard>

          {/* ------------------------------------------------ S07-SC-05 quality */}
          <SectionCard title="S07-SC-05 · Quality record link">
            <TraceNote workflow="WF-S07-01 / Step 4 — the related inspection result or non-conformity in S3, giving the commercial and the quality view of the same event" />
            {cause === 'Quality' ? (
              <>
                <RequiredLabel label="S03 inspection result or non-conformity" required />
                <Select size="small" displayEmpty value={quality} onChange={(e) => setQuality(e.target.value)} sx={{ mt: 0.5, minWidth: 380 }}>
                  <MenuItem value=""><em>No quality record linked</em></MenuItem>
                  <MenuItem value="NC-0087">NC-0087 · Moisture 9.1 % against a ≤ 6 % contract term · Gedaref</MenuItem>
                  <MenuItem value="NC-0085">NC-0085 · Warehouse condition check · caking in the east stack</MenuItem>
                  <MenuItem value="INS-00412">INS-00412 · Pre-shipment inspection · Port Sudan</MenuItem>
                </Select>
                <Alert severity="info" sx={{ mt: 1, fontSize: '0.8rem' }}>
                  The quality <b>investigation itself remains in S03</b> and is not repeated in the claim. The link
                  exists so the approver can see the quality evidence.
                </Alert>
                <Button size="small" component={Link} to="/s03/ncs" sx={{ mt: 1 }}>
                  No record exists — raise a non-conformity in S03
                </Button>
              </>
            ) : (
              <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
                The quality link is offered only where the cause category is <b>quality</b>. Choose a cause category
                above.
              </Typography>
            )}
          </SectionCard>
        </Box>

        {/* ------------------------------------------ S07-SC-03 contract link */}
        <Box sx={{ flex: '1 1 400px', minWidth: 360 }}>
          <SectionCard title="S07-SC-03 · Contract and shipment link">
            <TraceNote workflow="WF-S07-01 / Step 2 — recorded against the contract and linked to the shipment(s), so exposure is visible at contract level" />

            {!contractRec ? (
              <EmptyState text="Select a contract to link shipments and see the exposure already on it." />
            ) : (
              <>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
                  <ReadOnlyField label="Commodity · destination" value={`${contractRec.commodity} · ${contractRec.destination}`} />
                  <ReadOnlyField label="Incoterm" value={contractRec.incoterm} />
                  <ReadOnlyField label="Contract value" value={money(contractRec.valueUsd)} />
                  <ReadOnlyField label="Shipments" value={String(contractRec.shipments.length)} />
                </Box>

                <Box sx={{ mt: 2 }}>
                  <RequiredLabel label="Shipment(s) concerned" required={shipmentLinkRequired} />
                  <Select
                    size="small" fullWidth multiple value={shipments}
                    onChange={(e) => setShipments(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
                    sx={{ mt: 0.5 }}
                    renderValue={(v) => (v as string[]).join(', ') || 'None linked'}
                  >
                    {contractRec.shipments.map((s) => (
                      <MenuItem key={s.id} value={s.id}>{s.id} · {s.qtyMt} MT · delivered {s.delivered}</MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mt: 0.5 }}>
                    Restricted to shipments under the selected contract.
                  </Typography>
                </Box>

                <Alert severity={shipmentLinkRequired ? 'warning' : 'info'} sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                  <b>Shipment link required: {shipmentLinkRequired ? 'Yes' : 'No'} (configured).</b>{' '}
                  {shipmentLinkRequired
                    ? 'Registration is blocked until a shipment is linked.'
                    : 'A claim may be registered without a shipment; it is chipped "No shipment" on the register and excluded from the claim-rate denominator, because a claim with no shipment cannot contribute to claims-against-shipments.'}
                </Alert>

                <BusinessConfirmation>
                  Confirm whether a claim may be registered without a linked shipment.
                </BusinessConfirmation>

                <FormControlLabel
                  control={<Switch size="small" checked={shipmentLinkRequired} onChange={(e) => setShipmentLinkRequired(e.target.checked)} />}
                  label={
                    <Typography variant="caption" sx={{ color: COLORS.attention, fontWeight: 700 }}>
                      PROTOTYPE — flip the configured rule to see both behaviours
                    </Typography>
                  }
                />

                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>
                    CLAIMS ALREADY ON THIS CONTRACT
                  </Typography>
                  {claimsOnContract.length === 0 ? (
                    <EmptyState text="No other claim is registered against this contract." />
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {['Claim', 'Cause', 'Claimed', 'State'].map((h) => (
                            <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {claimsOnContract.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>{c.id}</TableCell>
                            <TableCell>{c.cause}</TableCell>
                            <TableCell align="right">{money(c.claimValue, c.currency)}</TableCell>
                            <TableCell>{c.state}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mt: 0.5 }}>
                    Shown at the moment of registration so accumulating exposure on the contract is visible before the
                    claim is added to it.
                  </Typography>
                  <Button size="small" component={Link} to="/s07/exposure" sx={{ mt: 0.5 }}>
                    Open contract exposure
                  </Button>
                </Box>
              </>
            )}
          </SectionCard>
        </Box>
      </Box>

      <BottomBar>
        <Tooltip title={blocking.length ? blocking.join(' ') : ''}>
          <span>
            <Button variant="contained" disabled={blocking.length > 0} onClick={onSave}>
              Register the claim
            </Button>
          </span>
        </Tooltip>
        <Button variant="outlined" component={Link} to="/s07">Cancel</Button>
        {blocking.length > 0 && (
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: COLORS.bad, fontWeight: 700 }}>
              Registration is blocked:
            </Typography>
            {blocking.map((b) => (
              <Typography key={b} variant="caption" sx={{ display: 'block', color: COLORS.textSecondary }}>· {b}</Typography>
            ))}
          </Box>
        )}
      </BottomBar>

      {/* boundary dialog */}
      <Dialog open={boundary} onClose={() => setBoundary(false)} maxWidth="sm" fullWidth>
        <DialogTitle>This belongs in S4 Compliance</DialogTitle>
        <DialogContent>
          <TraceNote workflow="WF-S07-01 / Step 6 — insurance claims arising from incidents are handled in S4 Compliance and are not registered here" />
          <Alert severity="warning" sx={{ mt: 1, fontSize: '0.85rem' }}>
            An incident — {INCIDENT_CAUSES.join(', ').toLowerCase()} — is an <b>insurance case</b>, not a commercial
            claim. It has a different counterparty (the insurer, not the buyer), different evidence requirements
            (surveyor, photographs, police report, letter of protest) and a different owner. The two must not be
            merged, because a form that served both would serve neither.
          </Alert>
          <Table size="small" sx={{ mt: 1 }}>
            <TableHead>
              <TableRow>
                {['', 'Commercial claim (S7)', 'Insurance case (S4)'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                ['Counterparty', 'The end buyer, claiming against us', 'The insurer, claimed against by us'],
                ['Evidence', 'Buyer correspondence, destination survey, quality record', 'Surveyor report, photographs, police report, letter of protest'],
                ['Owner', 'Commercial or execution', 'Compliance'],
                ['Outcome', 'Approved amount, credit note', 'Compensation received'],
              ].map((r) => (
                <TableRow key={r[0]}>
                  <TableCell sx={{ fontWeight: 600 }}>{r[0]}</TableCell>
                  <TableCell>{r[1]}</TableCell>
                  <TableCell>{r[2]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: COLORS.textSecondary }}>
            Where a short-landed or damaged consignment produces <b>both</b> an insurer claim and a buyer claim, both
            records exist and reference each other — as two linked records with two owners, never as one merged case.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBoundary(false)}>Back to the claim form</Button>
          <Button variant="contained" component={Link} to="/s04/insurance">Open S4 insurance incidents</Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
