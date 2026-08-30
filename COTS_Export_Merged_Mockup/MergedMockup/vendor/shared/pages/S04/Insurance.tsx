import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem,
  Radio, RadioGroup, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import {
  BottomBar, BusinessConfirmation, HandOffBanner, ReadOnlyField, RecordHeader, SectionCard, SimulationButton,
  StatusChip, TraceNote, FieldGrid, RequiredLabel,
} from '../../components/shared';
import { CaseTabs, LinkedRecordsPanel, RequirementChecklist } from '../../components/CaseWorkspace';
import { useStore } from '../../state/store';
import { useS04 } from '../../state/s04store';
import { INSURER_REQUIREMENTS } from '../../mockData/s04';
import { validityState } from '../../state/s05store';
import { WAREHOUSES, FACILITIES, COMMODITIES } from '../../mockData/master';
import { COLORS } from '../../theme';

const incidentChip = (s: string) =>
  s.startsWith('Closed and') ? 'Approved' : s.startsWith('Closed with') ? 'Rejected' : 'Open';

/* ---------------------------------------- S04-SC-14 / 15 / 17 list, form, register */

export function InsuranceList() {
  const { country, say } = useStore();
  const { incidents, policies, addIncident, updatePolicy } = useS04();
  const [report, setReport] = React.useState(false);
  const [pol, setPol] = React.useState(false);
  const [draft, setDraft] = React.useState({
    type: 'Damage' as const, date: '21-Aug-2026', location: WAREHOUSES[0].name, commodity: 'Sesame',
    quantityMt: 0, description: '', isImportedDischarge: false,
    blQuantity: 0, actualReceived: 0, shortLanded: 0, damaged: 0, movementRef: '',
  });

  return (
    <AppShell title="Insurance Incidents" breadcrumb={[country, 'Compliance', 'Insurance']}>
      <SectionCard
        title="S04-SC-14 — Insurance incident list"
        right={
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" onClick={() => setPol(true)}>Policy register</Button>
            <Button size="small" variant="contained" onClick={() => setReport(true)}>Report an incident</Button>
          </Stack>
        }
      >
        <TraceNote workflow="WF-S04-03 / Step 10 — incidents by type, location, policy and status" />
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Incident', 'Type', 'Date', 'Location', 'Material · quantity', 'Policy', 'Contact', 'Claim value', 'Compensation', 'Variance case', 'Status'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {incidents.map((i) => {
              const p = policies.find((x) => x.id === i.policyId);
              return (
                <TableRow key={i.id} hover>
                  <TableCell>
                    <Link to={`/s04/incident/${i.id}`} style={{ color: COLORS.primary, fontWeight: 600 }}>{i.id}</Link>
                  </TableCell>
                  <TableCell>{i.type}</TableCell>
                  <TableCell>{i.date}</TableCell>
                  <TableCell>{i.location}</TableCell>
                  <TableCell>{i.commodity} · {i.quantityMt} MT</TableCell>
                  <TableCell>{p ? `${p.id} (${p.type})` : '—'}</TableCell>
                  <TableCell>{p?.contact ?? '—'}</TableCell>
                  <TableCell align="right">{i.productValue + i.additionalExpenses ? (i.productValue + i.additionalExpenses).toLocaleString() : '—'}</TableCell>
                  <TableCell align="right">{i.compensation ? i.compensation.toLocaleString() : '—'}</TableCell>
                  <TableCell>
                    {i.varianceCase ? <Link to={`/s04/case/${i.varianceCase}`}>{i.varianceCase}</Link> : '—'}
                  </TableCell>
                  <TableCell><StatusChip status={incidentChip(i.status)} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: COLORS.textSecondary }}>
          Insurance cases follow-up and imported shipment cases follow-up are published through C11 Reporting.
        </Typography>
      </SectionCard>

      <Alert severity="info" icon={false} sx={{ mb: 2 }}>
        <b>Boundary.</b> Insurance claims arising from incidents are handled here. Commercial claims raised by buyers
        are registered in S07 and the two are not merged — different owners, evidence and counterparties.
      </Alert>

      <Button size="small" component={Link} to="/s04">Back to the compliance dashboard</Button>

      {/* S04-SC-15 */}
      <Dialog open={report} onClose={() => setReport(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.primary, color: '#fff', py: 1.25 }}>
          Report an incident
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.85 }}>
            WF-S04-03 / Step 1 — site, transportation and execution personnel report the incident and the material affected
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <FieldGrid columns={3}>
            <ReadOnlyField label="Reported by" value="Warehouse — Gedaref" />
            <Box>
              <RequiredLabel label="Incident type" required />
              <Select fullWidth variant="standard" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as any })}>
                {['Theft', 'Fire', 'Accident', 'Damage', 'Short landing'].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </Box>
            <Box>
              <RequiredLabel label="Date" required />
              <TextField fullWidth variant="standard" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            </Box>
            <Box sx={{ mt: 1 }}>
              <RequiredLabel label="Location" required />
              <Select fullWidth variant="standard" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })}>
                {[...WAREHOUSES.map((w) => w.name), ...FACILITIES.map((f) => f.name), 'Port Sudan Yard', 'In transportation'].map((l) => (
                  <MenuItem key={l} value={l}>{l}</MenuItem>
                ))}
              </Select>
            </Box>
            <Box sx={{ mt: 1 }}>
              <RequiredLabel label="Material affected" required />
              <Select fullWidth variant="standard" value={draft.commodity} onChange={(e) => setDraft({ ...draft, commodity: e.target.value })}>
                {COMMODITIES.map((c) => <MenuItem key={c.name} value={c.name}>{c.name}</MenuItem>)}
              </Select>
            </Box>
            <Box sx={{ mt: 1 }}>
              <RequiredLabel label="Quantity affected (MT)" required />
              <TextField fullWidth variant="standard" value={draft.quantityMt || ''} onChange={(e) => setDraft({ ...draft, quantityMt: Number(e.target.value.replace(/[^0-9.]/g, '')) })} />
            </Box>
          </FieldGrid>

          <Box sx={{ mt: 2 }}>
            <RequiredLabel label="Description" required />
            <TextField fullWidth variant="standard" multiline minRows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </Box>

          <Box sx={{ mt: 2 }}>
            <RequiredLabel label="Photographs and video" required />
            <Button size="small" variant="outlined" sx={{ ml: 1 }} onClick={() => say('Core C7 upload dialog would open here')}>Attach evidence</Button>
          </Box>

          <FormControlLabel
            sx={{ mt: 2 }}
            control={
              <Radio
                size="small" checked={draft.isImportedDischarge}
                onClick={() => setDraft({ ...draft, isImportedDischarge: !draft.isImportedDischarge })}
              />
            }
            label={<Typography variant="body2">This is damage or short landing observed during imported shipment discharge</Typography>}
          />

          {draft.isImportedDischarge && (
            <Box sx={{ mt: 1, p: 1.5, bgcolor: '#F7F8F9', border: `1px solid ${COLORS.border}`, borderRadius: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary, display: 'block', mb: 1 }}>
                SURVEYOR DISCHARGE REPORT — actual received against bill of lading
              </Typography>
              <FieldGrid columns={4}>
                {([['blQuantity', 'Bill of lading quantity'], ['actualReceived', 'Actual received'], ['shortLanded', 'Short landed'], ['damaged', 'Damaged']] as const).map(([k, label]) => (
                  <Box key={k}>
                    <RequiredLabel label={`${label} (MT)`} required />
                    <TextField
                      fullWidth variant="standard" value={(draft as any)[k] || ''}
                      onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value.replace(/[^0-9.]/g, '')) } as any)}
                    />
                  </Box>
                ))}
              </FieldGrid>
              <Button size="small" sx={{ mt: 1 }} onClick={() => say('Final surveyor discharge report attached (C7)')}>
                Attach the surveyor discharge report
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReport(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!draft.description.trim() || !draft.quantityMt}
            onClick={() => {
              const id = `INC-00${35 + incidents.length}`;
              addIncident({
                id, type: draft.type, date: draft.date, reportedBy: 'Warehouse — Gedaref',
                location: draft.location, commodity: draft.commodity, quantityMt: draft.quantityMt,
                description: draft.description, media: ['evidence-1.jpg'],
                isImportedDischarge: draft.isImportedDischarge,
                blQuantity: draft.blQuantity, actualReceived: draft.actualReceived,
                shortLanded: draft.shortLanded, damaged: draft.damaged,
                policyId: '', notified: '',
                requirements: INSURER_REQUIREMENTS.map((i) => ({ item: i, provided: false, documentType: '', coordinatedWith: '' })),
                results: '', correctiveAction: '', finalDamageMt: 0, finalLossMt: 0,
                productValue: 0, additionalExpenses: 0, compensation: 0, creditNotes: [],
                status: 'Reported',
              });
              setReport(false);
              say(`${id} reported — compliance must now determine the related policy`);
            }}
          >
            Report incident
          </Button>
        </DialogActions>
      </Dialog>

      {/* S04-SC-17 */}
      <Dialog open={pol} onClose={() => setPol(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.primary, color: '#fff', py: 1.25 }}>
          S04-SC-17 — Insurance policy register
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.85 }}>
            WF-S04-03 / Step 2 — policies for all areas with coverage terms, validity, covered locations and the contact person for claim notification
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Policy', 'Type', 'Insurer', 'Coverage', 'Validity', 'State', 'Covered warehouses and areas', 'Contact for claim notification'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {policies.map((p) => {
                const v = validityState(p.validFrom, p.validTo);
                return (
                  <TableRow key={p.id} hover sx={{ bgcolor: v === 'Expired' ? '#FDF3F2' : v === 'Approaching expiry' ? '#FFF7E6' : undefined }}>
                    <TableCell sx={{ fontWeight: 600 }}>{p.id}</TableCell>
                    <TableCell>{p.type}</TableCell>
                    <TableCell>{p.insurer}</TableCell>
                    <TableCell sx={{ maxWidth: 240 }}>{p.coverage}</TableCell>
                    <TableCell>{p.validFrom} → {p.validTo}</TableCell>
                    <TableCell>
                      <Chip
                        size="small" label={v}
                        sx={{ height: 20, color: '#fff', bgcolor: v === 'Expired' ? COLORS.bad : v === 'Approaching expiry' ? COLORS.attention : COLORS.good }}
                      />
                    </TableCell>
                    <TableCell>{p.covered.join(' · ')}</TableCell>
                    <TableCell>{p.contact}<br /><Typography variant="caption" color="text.secondary">{p.contactEmail}</Typography></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: COLORS.textSecondary }}>
            A policy approaching or past its validity changes what an incident can claim against, so the shared
            validity chip is used here as well.
          </Typography>
        </DialogContent>
        <DialogActions><Button onClick={() => setPol(false)}>Close</Button></DialogActions>
      </Dialog>
    </AppShell>
  );
}

/* ------------------------------------- S04-SC-16 / 18 / 19 incident workspace */

export function IncidentWorkspace() {
  const { id = '' } = useParams();
  const { country, say } = useStore();
  const { incidents, updateIncident, policies, cases, addCase } = useS04();
  const i = incidents.find((x) => x.id === id);
  const [tab, setTab] = React.useState(0);
  const [notify, setNotify] = React.useState(false);
  const [conclude, setConclude] = React.useState(false);
  const [outcome, setOutcome] = React.useState<'compensated' | 'none'>('compensated');
  const [amount, setAmount] = React.useState('');

  if (!i) {
    return (
      <AppShell title="Insurance incident" breadcrumb={[country, 'Compliance']}>
        <Alert severity="error">Incident {id} not found in the prototype data.</Alert>
      </AppShell>
    );
  }

  const policy = policies.find((p) => p.id === i.policyId);
  const outstanding = i.requirements.filter((r) => !r.provided);
  const claimValue = i.productValue + i.additionalExpenses;
  const closed = i.status.startsWith('Closed');

  const linkVarianceCase = () => {
    const newId = `VAR-00${70 + cases.length}`;
    addCase({
      id: newId,
      createdAutomatically: true,
      triggerPoint: 'Insurance case at warehouse, facility, stuffing or transportation',
      triggerRecord: `Insurance incident ${i.id} — ${i.type} at ${i.location}`,
      triggerRoute: `/s04/incident/${i.id}`,
      suggestedType: 'Transit loss',
      suggestionBasis: [{ doc: `Incident case ${i.id}`, from: 'S04 Compliance' }],
      confirmedType: '',
      quantityMt: i.finalLossMt || i.quantityMt,
      value: i.productValue || Math.round((i.finalLossMt || i.quantityMt) * 620),
      currency: 'USD',
      commodity: i.commodity,
      batch: '—',
      location: i.location,
      remarks: `Stock adjustment arising from insurance incident ${i.id}.`,
      recommendation: '',
      evidence: [
        { item: 'Movement record', provided: false },
        { item: 'Surveyor report', provided: true, retrievedFrom: `Incident ${i.id}` },
        { item: 'Police report', provided: false },
      ],
      status: 'Created',
      approvals: [],
      erpConfirmed: false,
      erpReference: '',
      raisedOn: '21-Aug-2026',
      linked: [{ label: 'S04 insurance incident', value: i.id, to: `/s04/incident/${i.id}`, note: 'Physical loss, insurance claim and book adjustment are three views of one event' }],
    });
    updateIncident(i.id, { varianceCase: newId });
    say(`${newId} raised and linked to ${i.id} — the physical loss, the insurance claim and the book adjustment stay connected`);
  };

  return (
    <AppShell
      title="Insurance Incident Case"
      breadcrumb={[country, 'Compliance', 'Insurance', i.id]}
      banner={
        <RecordHeader
          title={i.id}
          chip={<StatusChip status={incidentChip(i.status)} />}
          meta={[
            ['Incident #', i.id],
            ['Type', i.type],
            ['Date', i.date],
            ['Location', i.location],
            ['Policy', policy ? `${policy.id} (${policy.type})` : 'not determined'],
            ['Material', `${i.commodity} · ${i.quantityMt} MT`],
          ]}
        />
      }
    >
      <Alert severity="info" icon={false} sx={{ mb: 2, fontSize: '0.8rem' }}>
        Insurance claims are handled here. Commercial claims raised by buyers are registered in <b>S07</b> and the two
        are not merged.
      </Alert>

      <CaseTabs
        tabs={['Summary', 'Policy', 'Requirements', 'Follow-up', 'Linked Records', 'Activity', 'History']}
        value={tab}
        onChange={setTab}
      />

      {tab === 0 && (
        <SectionCard title="S04-SC-16 — Incident summary">
          <TraceNote workflow="WF-S04-03 / Steps 1, 4 — the incident and the material affected, with photographs and video; compliance update all incident details" />
          <FieldGrid columns={3}>
            <ReadOnlyField label="Reported by" value={i.reportedBy} />
            <ReadOnlyField label="Type" value={i.type} />
            <ReadOnlyField label="Date" value={i.date} />
            <ReadOnlyField label="Location" value={i.location} />
            <ReadOnlyField label="Material · quantity affected" value={`${i.commodity} · ${i.quantityMt} MT`} />
            <ReadOnlyField label="Evidence" value={`${i.media.length} file(s)`} />
          </FieldGrid>
          <Box sx={{ mt: 2 }}>
            <ReadOnlyField label="Description" value={i.description} />
          </Box>

          {i.isImportedDischarge && (
            <SectionCard title="Surveyor discharge report — imported shipment">
              <FieldGrid columns={4}>
                <ReadOnlyField label="Bill of lading quantity" value={`${i.blQuantity} MT`} />
                <ReadOnlyField label="Actual received" value={`${i.actualReceived} MT`} />
                <ReadOnlyField label="Short landed" value={`${i.shortLanded} MT`} />
                <ReadOnlyField label="Damaged" value={`${i.damaged} MT`} />
              </FieldGrid>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                Execution personnel share the final surveyor discharge report showing actual received against the bill
                of lading quantity, listing short-landed and damaged quantities.
              </Typography>
            </SectionCard>
          )}
        </SectionCard>
      )}

      {tab === 1 && (
        <SectionCard title="Policy">
          <TraceNote workflow="WF-S04-03 / Steps 2–3 — compliance determine the related policy, marine or land, and raise the notification from COTS to the policy contact person" />
          {!policy ? (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>The related policy has not been determined yet.</Alert>
              <Box sx={{ maxWidth: 420 }}>
                <RequiredLabel label="Determine the related policy" required />
                <Select
                  fullWidth variant="standard" value=""
                  onChange={(e) => { updateIncident(i.id, { policyId: e.target.value, status: 'Policy determined' }); say('Policy determined from the register'); }}
                >
                  {policies.map((p) => <MenuItem key={p.id} value={p.id}>{p.id} · {p.type} · {p.insurer}</MenuItem>)}
                </Select>
              </Box>
            </>
          ) : (
            <>
              <FieldGrid columns={3}>
                <ReadOnlyField label="Policy number" value={policy.id} />
                <ReadOnlyField label="Type" value={policy.type} />
                <ReadOnlyField label="Insurer" value={policy.insurer} />
                <ReadOnlyField label="Coverage terms" value={policy.coverage} />
                <ReadOnlyField label="Validity" value={`${policy.validFrom} → ${policy.validTo}`} />
                <ReadOnlyField label="Covered warehouses and areas" value={policy.covered.join(' · ')} />
                <ReadOnlyField label="Contact for claim notification" value={`${policy.contact} · ${policy.contactEmail}`} />
                <ReadOnlyField
                  label="Notification"
                  value={i.notified ? `${i.notified} on ${i.notifiedOn ?? '—'}` : <Chip size="small" label="Not yet raised" sx={{ height: 20, bgcolor: COLORS.attention, color: '#fff' }} />}
                />
              </FieldGrid>
              {!i.notified && (
                <Button variant="contained" sx={{ mt: 2 }} onClick={() => setNotify(true)}>
                  Raise incident notification
                </Button>
              )}
            </>
          )}
        </SectionCard>
      )}

      {tab === 2 && (
        <SectionCard title="S04-SC-19 — Insurance requirements checklist">
          <TraceNote workflow="WF-S04-03 / Steps 4–5 — compliance list the requirements specified by the insurance company and coordinate with the site team, uploading each document against the case with its document type" />
          <RequirementChecklist
            rows={i.requirements.map((r) => ({
              item: r.item,
              provided: r.provided,
              note: r.provided ? `${r.documentType} · ${r.coordinatedWith}` : 'Outstanding',
            }))}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
            {outstanding.map((r) => (
              <Button
                key={r.item} size="small" variant="outlined"
                onClick={() => {
                  updateIncident(i.id, {
                    requirements: i.requirements.map((x) =>
                      x.item === r.item ? { ...x, provided: true, documentType: 'Insurance evidence', coordinatedWith: 'Site team' } : x,
                    ),
                  });
                  say(`${r.item} uploaded with its document type (C7)`);
                }}
              >
                Upload {r.item}
              </Button>
            ))}
          </Stack>
          {outstanding.length > 0 && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              The detailed follow-up cannot be submitted while {outstanding.length} required document(s) are
              outstanding.
            </Alert>
          )}
        </SectionCard>
      )}

      {tab === 3 && (
        <SectionCard title="S04-SC-16 — Detailed follow-up">
          <TraceNote workflow="WF-S04-03 / Steps 6–8 — incident results, corrective action, final damage and loss quantities, and the claim value comprising product value and additional expenses" />
          <FieldGrid columns={1}>
            <Box>
              <RequiredLabel label="Incident results" required />
              <TextField
                fullWidth variant="standard" multiline value={i.results} disabled={closed}
                onChange={(e) => updateIncident(i.id, { results: e.target.value })}
              />
            </Box>
            <Box sx={{ mt: 1 }}>
              <RequiredLabel label="Corrective action implemented (for example local sales or repacking)" required />
              <TextField
                fullWidth variant="standard" multiline value={i.correctiveAction} disabled={closed}
                onChange={(e) => updateIncident(i.id, { correctiveAction: e.target.value })}
              />
            </Box>
          </FieldGrid>
          <FieldGrid columns={4}>
            {([['finalDamageMt', 'Final damage (MT)'], ['finalLossMt', 'Final loss (MT)'], ['productValue', 'Product value'], ['additionalExpenses', 'Additional expenses']] as const).map(([k, label]) => (
              <Box key={k} sx={{ mt: 1 }}>
                <RequiredLabel label={label} required={k !== 'additionalExpenses'} />
                <TextField
                  fullWidth variant="standard" value={(i as any)[k] || ''} disabled={closed}
                  onChange={(e) => updateIncident(i.id, { [k]: Number(e.target.value.replace(/[^0-9.]/g, '')) } as any)}
                />
              </Box>
            ))}
          </FieldGrid>
          <Box sx={{ mt: 2 }}>
            <ReadOnlyField
              label="Claim value (product value + additional expenses)"
              value={<Typography component="span" sx={{ fontWeight: 700 }}>{claimValue.toLocaleString()} USD</Typography>}
            />
          </Box>

          {!closed && (
            <>
              <Button
                variant="contained" sx={{ mt: 2 }}
                disabled={outstanding.length > 0 || !i.results.trim() || !i.correctiveAction.trim()}
                onClick={() => { updateIncident(i.id, { status: 'Follow-up submitted' }); say('Detailed follow-up submitted to the insurer'); }}
              >
                Submit detailed follow-up
              </Button>
              {outstanding.length > 0 && (
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: COLORS.attention }}>
                  {outstanding.length} required document(s) outstanding on the Requirements tab
                </Typography>
              )}
              <SimulationButton
                label="Simulate insurer response"
                note="Stands in for the insurance representative's reply so the conclusion can be demonstrated."
                onClick={() => setConclude(true)}
              />
            </>
          )}

          {closed && (
            <Alert severity={i.status === 'Closed and compensated' ? 'success' : 'warning'} sx={{ mt: 2 }}>
              {i.status === 'Closed and compensated'
                ? `Closed and compensated — ${i.compensation.toLocaleString()} USD, credit notes: ${i.creditNotes.join(', ') || 'attached'}.`
                : 'Closed with no compensation — the outcome and its reason are recorded.'}
            </Alert>
          )}
        </SectionCard>
      )}

      {tab === 4 && (
        <SectionCard title="Linked records (SM-05)">
          <TraceNote workflow="WF-S04-03 / Step 9 — where the incident affects stock records a variance and adjustment case is raised, so that the physical loss, the insurance claim and the book adjustment remain three linked views of one event" />
          <LinkedRecordsPanel
            rows={[
              ...(i.varianceCase
                ? [{ label: 'S04 variance and adjustment case', value: i.varianceCase, to: `/s04/case/${i.varianceCase}`, note: 'The book adjustment arising from this incident' }]
                : []),
              ...(i.movementRef ? [{ label: 'S05 movement', value: i.movementRef, to: `/s05/movement/${i.movementRef}`, note: 'Transportation incident' }] : []),
              ...(policy ? [{ label: 'Insurance policy', value: policy.id, note: 'Determined from the register' }] : []),
            ]}
          />
          {!i.varianceCase && (
            <>
              <Alert severity="info" sx={{ mt: 1.5 }}>
                This incident does not yet have a linked variance case. Where the incident affects stock records, the
                two must be linked so the physical loss, the insurance claim and the book adjustment stay connected.
              </Alert>
              <Button variant="contained" sx={{ mt: 1 }} onClick={linkVarianceCase}>
                Raise and link a variance case
              </Button>
            </>
          )}
          <HandOffBanner
            to="S04 / WF-S04-01 Stock Variance and Adjustment Case"
            passes="incident reference, final loss quantity, product value, surveyor evidence"
            returns="variance case reference, held on both records"
            resumes="the two cases carry each other; neither stands alone"
          />
        </SectionCard>
      )}

      {tab === 5 && (
        <SectionCard title="Activity — follow-up with the insurance representative">
          <Stack spacing={0.5}>
            <Typography variant="body2">{i.date} · reported by {i.reportedBy}</Typography>
            {policy && <Typography variant="body2">Policy determined · {policy.id}</Typography>}
            {i.notified && <Typography variant="body2">{i.notifiedOn} · notification {i.notified.toLowerCase()}</Typography>}
            {i.results && <Typography variant="body2">Detailed follow-up submitted</Typography>}
            {closed && <Typography variant="body2">Concluded · {i.status}</Typography>}
          </Stack>
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: COLORS.textSecondary }}>
            Compliance follow up closely with the insurance representative until the case is closed and compensation
            is obtained.
          </Typography>
        </SectionCard>
      )}

      {tab === 6 && (
        <SectionCard title="History — C8 audit trail">
          <Typography variant="body2" color="text.secondary">Business-language timeline of the case.</Typography>
        </SectionCard>
      )}

      <BottomBar>
        <Button component={Link} to="/s04/insurance" variant="outlined">Back to incidents</Button>
        <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
          Insurance and imported shipment case follow-up reports are published through C11 Reporting.
        </Typography>
      </BottomBar>

      {/* S04-SC-18 */}
      <Dialog open={notify} onClose={() => setNotify(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.primary, color: '#fff', py: 1.25 }}>
          Incident notification
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.85 }}>WF-S04-03 / Step 3</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="info" icon={false} sx={{ mb: 2, fontSize: '0.8rem' }}>
            The notification is raised <b>using COTS</b> — the system generates and sends it. Recording that a
            notification was sent elsewhere does not satisfy this step.
          </Alert>
          <ReadOnlyField label="Recipient" value={`${policy?.contact} · ${policy?.contactEmail}`} />
          <ReadOnlyField label="Resolved from" value={`Policy ${policy?.id} contact for claim notification`} />
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">Notification content (generated, editable)</Typography>
            <TextField
              fullWidth variant="standard" multiline minRows={4}
              defaultValue={`Incident ${i.id} — ${i.type} at ${i.location} on ${i.date}.\nMaterial affected: ${i.commodity}, ${i.quantityMt} MT.\n${i.description}\nPhotographic evidence attached.`}
            />
          </Box>
          <BusinessConfirmation>
            Confirm whether the insurance notification is sent from COTS by email, or generated by COTS for manual
            sending. Both outcomes are offered below so the choice is visible.
          </BusinessConfirmation>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotify(false)}>Cancel</Button>
          <Button
            onClick={() => {
              updateIncident(i.id, { notified: 'Generated for manual sending', notifiedOn: '21-Aug-2026', status: 'Notified' });
              setNotify(false);
              say('Notification generated for manual sending');
            }}
          >
            Generate for manual sending
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              updateIncident(i.id, { notified: 'Sent from COTS', notifiedOn: '21-Aug-2026', status: 'Notified' });
              setNotify(false);
              say('Notification sent from COTS to the policy contact');
            }}
          >
            Send from COTS
          </Button>
        </DialogActions>
      </Dialog>

      {/* conclusion */}
      <Dialog open={conclude} onClose={() => setConclude(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Conclude the insurance case</DialogTitle>
        <DialogContent>
          <RadioGroup value={outcome} onChange={(e) => setOutcome(e.target.value as any)}>
            <FormControlLabel value="compensated" control={<Radio size="small" />} label="Closed and compensated" />
            <FormControlLabel value="none" control={<Radio size="small" />} label="Closed with no compensation" />
          </RadioGroup>
          {outcome === 'compensated' ? (
            <Box sx={{ mt: 1 }}>
              <RequiredLabel label="Compensation amount (USD)" required />
              <TextField fullWidth variant="standard" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: COLORS.textSecondary }}>
                The credit note documents are attached to the case on closure.
              </Typography>
            </Box>
          ) : (
            <Alert severity="info" sx={{ mt: 1, fontSize: '0.8rem' }}>
              The outcome and its reason are recorded on the case.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConclude(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={outcome === 'compensated' && !amount}
            onClick={() => {
              updateIncident(i.id, outcome === 'compensated'
                ? { status: 'Closed and compensated', compensation: Number(amount), creditNotes: ['credit-note-0091.pdf'] }
                : { status: 'Closed with no compensation' });
              setConclude(false);
              say(outcome === 'compensated' ? 'Case closed and compensated' : 'Case closed with no compensation');
            }}
          >
            Record conclusion
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
