import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Drawer, FormControlLabel,
  MenuItem, Radio, RadioGroup, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField,
  Typography, Checkbox,
} from '@mui/material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import {
  BottomBar, BusinessConfirmation, HandOffBanner, PrototypeNote, ReadOnlyField, RecordHeader, SectionCard,
  SimulationButton, StatusChip, TraceNote, FieldGrid, RequiredLabel,
} from '../../components/shared';
import { StepStrip } from '../../components/CaseWorkspace';
import { useStore } from '../../state/store';
import { useS03 } from '../../state/s03store';
import { GRADES, LABORATORIES, LAB_TESTS, QUALITY_STANDARDS, type Decision } from '../../mockData/s03';
import { COLORS } from '../../theme';

export default function InspectionDetail() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const { country, say } = useStore();
  const { inspections, updateInspection, contracts, ncs, addNc } = useS03();
  const insp = inspections.find((i) => i.id === id);

  const [step, setStep] = React.useState(0);
  const [lab, setLab] = React.useState(false);
  const [raiseNc, setRaiseNc] = React.useState(false);
  const [ncText, setNcText] = React.useState('');

  if (!insp) {
    return (
      <AppShell title="Inspection" breadcrumb={[country, 'Quality Assurance']} showSeason={false}>
        <Alert severity="error">Inspection {id} not found in the prototype data.</Alert>
      </AppShell>
    );
  }

  const contract = contracts.find((c) => c.contract === insp.contractRef);
  // Standard basis: contract quality terms where the inspection is against a contract (WF-S03-04 / Step 6)
  const params = contract
    ? contract.terms.map((t) => ({
        parameter: t.parameter,
        unit: t.unit,
        acceptable: t.agreedValue,
        mandatory: t.mandatory,
        max: Number((t.agreedValue.match(/[\d.]+/) ?? ['0'])[0]),
        varied: t.agreedValue !== t.standardValue,
      }))
    : (QUALITY_STANDARDS[insp.commodity] ?? []).map((p) => ({ ...p, varied: false }));

  const within = (p: { parameter: string; max?: number; acceptable: string }) => {
    const v = Number(insp.results[p.parameter]);
    if (!insp.results[p.parameter] || !Number.isFinite(v)) return null;
    if (p.acceptable.includes('≥')) return v >= (p.max ?? 0);
    return p.max === undefined ? null : v <= p.max;
  };
  const anyOut = params.some((p) => within(p) === false);
  const mandatoryDone = params.filter((p) => p.mandatory).every((p) => !!insp.results[p.parameter]);
  const labOutstanding = insp.labRequired && insp.lab?.status !== 'Result received';
  const reportOnly = insp.relatedIsReceived;
  const linkedNc = ncs.find((n) => n.source.includes(insp.id));

  const setResult = (parameter: string, value: string) =>
    updateInspection(insp.id, { results: { ...insp.results, [parameter]: value } });

  const steps = [
    { label: 'Standard', done: params.length > 0 },
    { label: 'Sampling', done: mandatoryDone },
    {
      label: insp.labRequired ? (labOutstanding ? 'Laboratory — awaiting result' : 'Laboratory') : 'Laboratory — not required',
      done: !insp.labRequired || !labOutstanding,
      disabled: !insp.labRequired,
      disabledReason: 'The applicable standard does not require laboratory analysis for this inspection',
    },
    {
      label: 'Decision',
      done: !!insp.decision,
      disabled: labOutstanding,
      disabledReason: 'The inspection cannot reach its decision until the required laboratory result is received',
    },
  ];

  return (
    <AppShell
      title="Inspection and Quality Decision"
      breadcrumb={[country, 'Quality Assurance', 'Inspections', insp.id]}
      showSeason={false}
      banner={
        <RecordHeader
          title={insp.id}
          chip={
            <StatusChip
              status={
                insp.decision === 'Accepted' ? 'Approved'
                  : insp.decision === 'Rejected' ? 'Rejected'
                  : insp.decision ? 'Insufficient'
                  : labOutstanding ? 'Pending Approval' : 'Open'
              }
            />
          }
          meta={[
            ['Inspection #', insp.id],
            ['Control point', insp.controlPoint],
            ['Commodity', insp.commodity],
            ['Related', insp.relatedRecord],
            ['Location', insp.location],
            ['Quantity', `${insp.quantityMt} MT`],
          ]}
        />
      }
    >
      <Box sx={{ bgcolor: '#fff', border: `1px solid ${COLORS.border}`, px: 2, pt: 1.5, mb: 2 }}>
        <StepStrip steps={steps} value={step} onChange={setStep} />
      </Box>

      {step === 0 && (
        <SectionCard title="Standard — parameters and acceptable values">
          <TraceNote workflow="WF-S03-01 / Step 2 — retrieved from the commodity quality standard for that commodity and country, or from the contract quality terms" />
          <FieldGrid columns={3}>
            <ReadOnlyField
              label="Standard basis"
              value={
                contract
                  ? <>Contract quality terms · <Link to="/s03/contracts">{contract.contract}</Link></>
                  : `Commodity quality standard (C3) · ${insp.commodity} · ${country}`
              }
            />
            <ReadOnlyField label="Trade agreement" value={insp.relatedRecord} />
            <ReadOnlyField label="Inspecting team" value={insp.inspectorTeam} />
          </FieldGrid>

          <Box sx={{ mt: 2 }}>
            <BusinessConfirmation>
              Provide the quality formats and forms, and hold the working session with the quality lead to align the
              parameters and activities.
              <PrototypeNote>
                only the parameters the source names are shown — moisture content is mandatory for sesame.
              </PrototypeNote>
            </BusinessConfirmation>
          </Box>

          <Table size="small">
            <TableHead>
              <TableRow>
                {['Parameter', 'Unit', 'Acceptable range or value', 'Mandatory', 'Source'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {params.map((p) => (
                <TableRow key={p.parameter}>
                  <TableCell>{p.parameter}</TableCell>
                  <TableCell>{p.unit}</TableCell>
                  <TableCell>{p.acceptable}</TableCell>
                  <TableCell>{p.mandatory ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    {p.varied
                      ? <Chip size="small" label="Varied by buyer" sx={{ height: 18, bgcolor: COLORS.attention, color: '#fff' }} />
                      : <Typography variant="caption" color="text.secondary">Standard</Typography>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      )}

      {step === 1 && (
        <SectionCard title="Sampling and parameter results">
          <TraceNote workflow="WF-S03-01 / Steps 3–4 — the inspector is identified and recorded; sampling is performed and results recorded as the standard requires" />
          <FieldGrid columns={3}>
            <Box>
              <RequiredLabel label="Sample reference" required />
              <TextField
                fullWidth variant="standard" value={insp.sampleRef}
                onChange={(e) => updateInspection(insp.id, { sampleRef: e.target.value })}
              />
            </Box>
            <Box>
              <RequiredLabel label="Inspector" required />
              <TextField
                fullWidth variant="standard" value={insp.inspector}
                onChange={(e) => updateInspection(insp.id, { inspector: e.target.value })}
              />
            </Box>
            <Box>
              <RequiredLabel label="Inspecting team" required />
              <Select
                fullWidth variant="standard" value={insp.inspectorTeam}
                onChange={(e) => updateInspection(insp.id, { inspectorTeam: e.target.value as any })}
              >
                <MenuItem value="Commercial">Commercial (at the supplier location)</MenuItem>
                <MenuItem value="Quality">Quality (on arrival at the warehouse)</MenuItem>
              </Select>
            </Box>
          </FieldGrid>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: COLORS.textSecondary }}>
            The inspector and inspecting team are recorded data, not inferred from the signed-in user — both teams
            record against the same standard so results are comparable.
          </Typography>

          <Box sx={{ mt: 2 }}>
            <RequiredLabel label="Sample details" required />
            <TextField
              fullWidth variant="standard" value={insp.sampleDetails}
              onChange={(e) => updateInspection(insp.id, { sampleDetails: e.target.value })}
            />
          </Box>

          <Table size="small" sx={{ mt: 2 }}>
            <TableHead>
              <TableRow>
                {['Parameter', 'Acceptable', 'Result', 'Within standard'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {params.map((p) => {
                const w = within(p);
                return (
                  <TableRow key={p.parameter} sx={{ bgcolor: w === false ? '#FDF3F2' : undefined }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: p.mandatory ? COLORS.required : undefined, fontWeight: p.mandatory ? 600 : 400 }}>
                        {p.parameter}{p.mandatory ? ' *' : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>{p.acceptable} {p.unit}</TableCell>
                    <TableCell>
                      <TextField
                        variant="standard" value={insp.results[p.parameter] ?? ''}
                        onChange={(e) => setResult(p.parameter, e.target.value)}
                        sx={{ width: 90 }}
                      />
                    </TableCell>
                    <TableCell>
                      {w === null
                        ? <Typography variant="caption" color="text.secondary">Not recorded</Typography>
                        : w
                          ? <Chip size="small" label="Within standard" sx={{ height: 18, bgcolor: COLORS.good, color: '#fff' }} />
                          : <Chip size="small" label="Out of range" sx={{ height: 18, bgcolor: COLORS.bad, color: '#fff' }} />}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <SectionCard title="Photographs and supporting documents — C7 shared pattern">
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {insp.documents.map((d) => <Chip key={d} label={d} size="small" />)}
              {insp.documents.length === 0 && <Typography variant="body2" color="text.secondary">No documents attached</Typography>}
            </Stack>
            <Button size="small" sx={{ mt: 1 }} onClick={() => say('Core C7 upload dialog (S-15) would open here')}>
              Attach document
            </Button>
          </SectionCard>
        </SectionCard>
      )}

      {step === 2 && (
        <SectionCard title="Laboratory analysis">
          <TraceNote workflow="WF-S03-01 / Step 5 — a lab request capturing requestor, laboratory, test type and certificate required, followed through to the result" />
          {!insp.labRequired ? (
            <Alert severity="info">
              The applicable standard does not require laboratory analysis for this inspection.
            </Alert>
          ) : (
            <>
              <FieldGrid columns={3}>
                <ReadOnlyField label="Requestor" value={insp.inspector} />
                <ReadOnlyField label="Laboratory" value={insp.lab?.laboratory ?? '—'} />
                <ReadOnlyField label="Lab test type" value={insp.lab?.testType ?? '—'} />
                <ReadOnlyField label="Certificate required" value={insp.lab?.certificateRequired ? 'Yes' : 'No'} />
                <ReadOnlyField label="Status" value={<StatusChip status={insp.lab?.status === 'Result received' ? 'Closed' : 'Open'} />} />
                <ReadOnlyField label="Result" value={insp.lab?.result ?? '—'} />
              </FieldGrid>

              <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={() => setLab(true)}>
                Open lab request
              </Button>

              {labOutstanding && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  The inspection cannot reach its decision until the required laboratory result is received.
                </Alert>
              )}

              <BusinessConfirmation>
                Confirm whether laboratory results are entered manually in COTS or received electronically from the
                laboratory. Both routes are shown so neither is presented as decided.
              </BusinessConfirmation>

              <SimulationButton
                label="Simulate laboratory result received"
                note="Records a result and certificate as if received electronically, so the decision step can be demonstrated."
                onClick={() => {
                  updateInspection(insp.id, {
                    lab: { ...(insp.lab as any), status: 'Result received', result: '3.1 ppb', certificate: 'aflatoxin-cert.pdf' },
                  });
                  say('Laboratory result received — the decision step is now available');
                  setStep(3);
                }}
              />
            </>
          )}
        </SectionCard>
      )}

      {step === 3 && (
        <SectionCard title="S03-SC-02 · Inspection detail and quality decision">
          <TraceNote workflow="WF-S03-01 / Steps 6–8 — decision, grade and quality report; the grade is written to the stock record" />

          {labOutstanding && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Decision unavailable — awaiting the laboratory result.
            </Alert>
          )}

          {reportOnly ? (
            <>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#666', letterSpacing: 0.4, display: 'block', mb: 0.5 }}>
                S03-SC-03 · REPORT-ONLY OUTCOME
              </Typography>
              <Alert severity="warning" icon={false} sx={{ mb: 2 }}>
                <b>Critical business rule.</b> Goods have already been purchased and received against{' '}
                {insp.relatedRecord}. Quality records a <b>report with recommendations</b> for management awareness.
                <b> Accept and Reject are not available</b> at this control point for received material — the system
                does not force a decision that does not reflect reality.
              </Alert>
              <FieldGrid columns={1}>
                <Box>
                  <RequiredLabel label="Findings" required />
                  <TextField
                    fullWidth variant="standard" multiline minRows={2} value={insp.report}
                    onChange={(e) => updateInspection(insp.id, { report: e.target.value })}
                  />
                </Box>
                <Box sx={{ mt: 1 }}>
                  <RequiredLabel label="Recommendations" required />
                  <TextField
                    fullWidth variant="standard" multiline minRows={2} value={insp.recommendations ?? ''}
                    onChange={(e) => updateInspection(insp.id, { recommendations: e.target.value })}
                  />
                </Box>
                <Box sx={{ mt: 1 }}>
                  <RequiredLabel label="Reported to (management awareness — C5)" required />
                  <Select
                    fullWidth variant="standard" multiple value={insp.reportedTo ?? []}
                    onChange={(e) => updateInspection(insp.id, { reportedTo: e.target.value as string[] })}
                    renderValue={(v) => (v as string[]).join(', ')}
                  >
                    {['Country Manager', 'Head of Operations', 'Sourcing Manager', 'Compliance Manager'].map((r) => (
                      <MenuItem key={r} value={r}>{r}</MenuItem>
                    ))}
                  </Select>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <RequiredLabel label="Grade" required />
                  <Select
                    fullWidth variant="standard" value={insp.grade}
                    onChange={(e) => updateInspection(insp.id, { grade: e.target.value })}
                  >
                    {GRADES.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                  </Select>
                </Box>
              </FieldGrid>

              <Box sx={{ mt: 2 }}>
                <ReadOnlyField
                  label="Management acknowledgement"
                  value={<Chip size="small" label="Unresolved — not built" sx={{ height: 20 }} />}
                />
                <BusinessConfirmation>
                  Confirm whether the report-only outcome after supplier receipt requires a formal management
                  acknowledgement recorded in COTS. The field is shown as a state; no acknowledgement workflow is built.
                </BusinessConfirmation>
              </Box>

              <Button
                variant="contained"
                sx={{ mt: 1 }}
                disabled={!insp.report || !insp.recommendations || !insp.grade}
                onClick={() => {
                  updateInspection(insp.id, { decision: 'Report with recommendations' });
                  say('Report with recommendations recorded and reported to management for awareness');
                }}
              >
                Record report with recommendations
              </Button>
            </>
          ) : (
            <>
              <RadioGroup
                value={insp.decision}
                onChange={(e) => updateInspection(insp.id, { decision: e.target.value as Decision })}
              >
                <FormControlLabel value="Accepted" disabled={labOutstanding} control={<Radio size="small" />} label="Accepted — the material proceeds in the operational process" />
                <FormControlLabel value="Rejected" disabled={labOutstanding} control={<Radio size="small" />} label="Rejected — a non-conformity is raised" />
              </RadioGroup>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                The decisions offered are those configured for this control point (C10).
              </Typography>

              <FieldGrid columns={2}>
                <Box sx={{ mt: 1 }}>
                  <RequiredLabel label="Grade" required />
                  <Select
                    fullWidth variant="standard" value={insp.grade}
                    onChange={(e) => updateInspection(insp.id, { grade: e.target.value })}
                  >
                    {GRADES.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                  </Select>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <RequiredLabel label="Quality report" required />
                  <TextField
                    fullWidth variant="standard" multiline value={insp.report}
                    onChange={(e) => updateInspection(insp.id, { report: e.target.value })}
                  />
                </Box>
              </FieldGrid>

              {anyOut && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  One or more parameters are out of range. A rejection or adverse finding raises a non-conformity.
                </Alert>
              )}
            </>
          )}

          {insp.decision && (
            <>
              <SectionCard title="S03-SC-05 — Grade on the stock record">
                <TraceNote workflow="WF-S03-01 / Step 8 — the quality grade forms part of stock status tracking and is the reference used in purchase contract stock allocation" />
                <FieldGrid columns={3}>
                  <ReadOnlyField label="Stock / batch" value={insp.batch} />
                  <ReadOnlyField label="Warehouse · location" value={insp.location} />
                  <ReadOnlyField label="Quantity graded" value={`${insp.quantityMt} MT`} />
                  <ReadOnlyField label="Grade written to stock status" value={<Chip size="small" label={insp.grade || '—'} sx={{ height: 20, bgcolor: COLORS.primary, color: '#fff' }} />} />
                  <ReadOnlyField label="Allocation reference" value={insp.contractRef ? `${insp.contractRef} allocation` : 'Not allocated'} />
                  <ReadOnlyField label="Presented as" value="Part of stock status — not a report-only value" />
                </FieldGrid>
                <HandOffBanner
                  to="Stock record and purchase contract allocation (Export)"
                  passes="commodity, batch, quantity, grade"
                  returns="nothing"
                  resumes="the grade is the reference used in allocation"
                  linkLabel="Open stock record stub"
                  linkTo="/stub/stock"
                />
              </SectionCard>

              {(insp.decision === 'Rejected' || anyOut || insp.decision === 'Report with recommendations') && (
                <SectionCard title="Non-conformity">
                  <TraceNote workflow="WF-S03-01 / Step 9 — a rejection or other adverse finding raises a non-conformity" />
                  {linkedNc ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2">Non-conformity raised from this inspection:</Typography>
                      <Button size="small" variant="outlined" component={Link} to={`/s03/nc/${linkedNc.id}`}>
                        {linkedNc.id}
                      </Button>
                    </Stack>
                  ) : (
                    <Button variant="contained" onClick={() => { setNcText(`${insp.commodity} out of standard at ${insp.location}.`); setRaiseNc(true); }}>
                      Raise non-conformity
                    </Button>
                  )}
                  <HandOffBanner
                    to="S04 Compliance / WF-S04-01 Stock Variance and Adjustment Case"
                    passes="non-conformity reference, affected stock and quantity, adverse finding"
                    returns="variance case reference"
                    resumes="where the finding results in reprocessing, repacking or loss; the S04 case steps remain in S04"
                    linkLabel="Open S04 Compliance"
                    linkTo="/s04/cases"
                  />
                </SectionCard>
              )}
            </>
          )}
        </SectionCard>
      )}

      <BottomBar>
        <Button component={Link} to="/s03/inspections" variant="outlined">Back to inspections</Button>
        <Stack direction="row" spacing={1}>
          <Button onClick={() => say('Inspection saved (front-end state only)')}>Save</Button>
          {step < 3 && <Button variant="contained" onClick={() => setStep(Math.min(3, step + 1))}>Next step</Button>}
        </Stack>
      </BottomBar>

      {/* S03-SC-04 laboratory request drawer */}
      <Drawer anchor="right" open={lab} onClose={() => setLab(false)}>
        <Box sx={{ width: 400 }}>
          <Box sx={{ bgcolor: COLORS.primary, color: '#fff', px: 2, py: 1.25 }}>
            <Typography variant="subtitle2">Laboratory request</Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>WF-S03-01 / Step 5</Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <ReadOnlyField label="Requestor" value={insp.inspector} />
            <Box sx={{ mt: 2 }}>
              <RequiredLabel label="Laboratory" required />
              <Select
                fullWidth variant="standard" value={insp.lab?.laboratory ?? LABORATORIES[0]}
                onChange={(e) => updateInspection(insp.id, { lab: { ...(insp.lab as any), laboratory: e.target.value } })}
              >
                {LABORATORIES.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </Select>
            </Box>
            <Box sx={{ mt: 2 }}>
              <RequiredLabel label="Lab test type" required />
              <Select
                fullWidth variant="standard" value={insp.lab?.testType ?? LAB_TESTS[0]}
                onChange={(e) => updateInspection(insp.id, { lab: { ...(insp.lab as any), testType: e.target.value } })}
              >
                {LAB_TESTS.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </Select>
            </Box>
            <FormControlLabel
              sx={{ mt: 1 }}
              control={
                <Checkbox
                  size="small" checked={!!insp.lab?.certificateRequired}
                  onChange={(e) => updateInspection(insp.id, { lab: { ...(insp.lab as any), certificateRequired: e.target.checked } })}
                />
              }
              label={<Typography variant="body2">Certificate required</Typography>}
            />
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Result (manual entry route)</Typography>
              <TextField
                fullWidth variant="standard" value={insp.lab?.result ?? ''}
                onChange={(e) => updateInspection(insp.id, { lab: { ...(insp.lab as any), result: e.target.value, status: e.target.value ? 'Result received' : 'Requested' } })}
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, p: 2, borderTop: `1px solid ${COLORS.border}` }}>
            <Button fullWidth onClick={() => setLab(false)}>Close</Button>
            <Button fullWidth variant="contained" onClick={() => { setLab(false); say('Lab request updated'); }}>Save</Button>
          </Box>
        </Box>
      </Drawer>

      {/* raise non-conformity */}
      <Dialog open={raiseNc} onClose={() => setRaiseNc(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Raise non-conformity</DialogTitle>
        <DialogContent>
          <TraceNote workflow="WF-S03-03 / Step 1 — raised through the request form, describing the finding, the material affected, the location and the quantity" />
          <FieldGrid columns={2}>
            <ReadOnlyField label="Source" value={`Inspection ${insp.id}`} />
            <ReadOnlyField label="Material · quantity" value={`${insp.commodity} · ${insp.quantityMt} MT`} />
            <ReadOnlyField label="Location" value={insp.location} />
            <ReadOnlyField label="Raised by" value={`${insp.inspector} (Quality)`} />
          </FieldGrid>
          <Box sx={{ mt: 2 }}>
            <RequiredLabel label="Description of the finding" required />
            <TextField fullWidth variant="standard" multiline minRows={2} value={ncText} onChange={(e) => setNcText(e.target.value)} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRaiseNc(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!ncText.trim()}
            onClick={() => {
              const id2 = `NC-01${Math.floor(Math.random() * 0 + 0) + 0}${(ncs.length + 1).toString().padStart(2, '0')}`;
              addNc({
                id: id2,
                source: `Inspection ${insp.id}`,
                sourceRoute: `/s03/inspection/${insp.id}`,
                raisedBy: `${insp.inspector} (Quality)`,
                raisedOn: '19-Aug-2026',
                description: ncText,
                commodity: insp.commodity,
                quantityMt: insp.quantityMt,
                location: insp.location,
                linked: [
                  { label: 'Batch', value: insp.batch },
                  { label: 'Related record', value: insp.relatedRecord },
                  ...(insp.contractRef ? [{ label: 'Contract', value: insp.contractRef }] : []),
                ],
                actions: [],
                blockScope: 'Allocation and dispatch',
                status: 'Open',
                resolution: '',
              });
              setRaiseNc(false);
              say(`${id2} raised and linked to inspection ${insp.id}`);
              nav(`/s03/nc/${id2}`);
            }}
          >
            Raise
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
