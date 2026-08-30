import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem,
  Radio, RadioGroup, Select, Stack, Step, StepLabel, Stepper, Switch, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { DataTable, type Column } from '../../components/DataTable';
import {
  BottomBar, BusinessConfirmation, HandOffBanner, PrototypeNote, ReadOnlyField, RecordHeader, SectionCard,
  SimulationButton, StatusChip, TraceNote, FieldGrid, RequiredLabel,
} from '../../components/shared';
import { CaseTabs, LinkedRecordsPanel, RequirementChecklist } from '../../components/CaseWorkspace';
import { useStore } from '../../state/store';
import { routeFor, useS04 } from '../../state/s04store';
import { ADJUSTMENT_TYPES, TRIGGER_POINTS, type VarianceCase } from '../../mockData/s04';
import { KnowledgePanel } from '../../components/KnowledgePanel';
import { COLORS } from '../../theme';

const caseChip = (s: string) =>
  s === 'Closed' ? 'Closed' : s === 'Rejected' ? 'Rejected' : s === 'Evidence incomplete' || s === 'Created' ? 'Draft' : 'Open';

/* ------------------------------------------------- S04-SC-02 variance case list */

export function VarianceCaseList() {
  const { country } = useStore();
  const { cases, thresholdEnabled, threshold } = useS04();

  const cols: Column<VarianceCase & { id: string }>[] = [
    {
      key: 'id', label: 'Case',
      render: (r) => <Link to={`/s04/case/${r.id}`} style={{ color: COLORS.primary, fontWeight: 600 }}>{r.id}</Link>,
      value: (r) => r.id,
    },
    {
      key: 'trigger', label: 'Trigger source',
      render: (r) => (
        <Stack>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>{r.triggerPoint}</Typography>
          <Typography variant="caption" color="text.secondary">{r.triggerRecord.slice(0, 46)}…</Typography>
        </Stack>
      ),
      value: (r) => r.triggerPoint,
    },
    {
      key: 'created', label: 'Created',
      render: (r) => (r.createdAutomatically ? 'Automatic' : 'Manual'),
      value: (r) => (r.createdAutomatically ? 'Automatic' : 'Manual'),
    },
    {
      key: 'type', label: 'Adjustment type',
      render: (r) => r.confirmedType || <Chip size="small" label={`${r.suggestedType} (suggested)`} sx={{ height: 20, bgcolor: '#EEF1F4' }} />,
      value: (r) => r.confirmedType || r.suggestedType,
    },
    { key: 'qty', label: 'Quantity · value', render: (r) => `${r.quantityMt} MT · ${r.value.toLocaleString()} ${r.currency}`, value: (r) => r.quantityMt },
    { key: 'location', label: 'Location', value: (r) => r.location },
    { key: 'status', label: 'Status', render: (r) => <StatusChip status={caseChip(r.status)} />, value: (r) => r.status },
    {
      key: 'step', label: 'Approval step',
      render: (r) => {
        const steps = routeFor(r.value, thresholdEnabled, threshold);
        return r.approvals.length ? `${r.approvals.length} of ${steps.length}` : `0 of ${steps.length}`;
      },
      value: (r) => String(r.approvals.length),
    },
    { key: 'erp', label: 'ERP reference', render: (r) => r.erpReference || '—', value: (r) => r.erpReference },
  ];

  return (
    <AppShell title="Variance Case List" breadcrumb={[country, 'Compliance', 'Variance cases']}>
      <SectionCard title="S04-SC-02 — Variance case list" dense>
        <div style={{ padding: '8px 16px' }}>
          <TraceNote workflow="WF-S04-01 / Step 9 — cases by type, location, period, value and status" />
        </div>
        <DataTable columns={cols as any} rows={cases as any} toolbarNote="Variance and adjustment cases" />
      </SectionCard>
      <Button size="small" component={Link} to="/s04">Back to the compliance dashboard</Button>
    </AppShell>
  );
}

/* -------------------------------------------- S04-SC-03..07 case workspace */

export function VarianceCaseWorkspace() {
  const { id = '' } = useParams();
  const { country, say } = useStore();
  const {
    cases, updateCase, confirmType, advanceApproval, thresholdEnabled, setThresholdEnabled, threshold, setThreshold,
  } = useS04();
  const c = cases.find((x) => x.id === id);
  const [tab, setTab] = React.useState(0);
  const [decide, setDecide] = React.useState(false);
  const [decision, setDecision] = React.useState<'Approved' | 'Rejected' | 'Returned'>('Approved');
  const [comment, setComment] = React.useState('');
  const [erp, setErp] = React.useState(false);
  const [erpRef, setErpRef] = React.useState('');

  if (!c) {
    return (
      <AppShell title="Variance case" breadcrumb={[country, 'Compliance']}>
        <Alert severity="error">Case {id} not found in the prototype data.</Alert>
      </AppShell>
    );
  }

  const steps = routeFor(c.value, thresholdEnabled, threshold);
  const outstanding = c.evidence.filter((e) => !e.provided);
  const canSubmit = !!c.confirmedType && outstanding.length === 0 && !!c.remarks.trim() && !!c.recommendation.trim();
  const submitted = c.approvals.length > 0 || c.status.startsWith('Pending') || c.status === 'Awaiting ERP confirmation' || c.status === 'Closed';
  const submitReason = !c.confirmedType
    ? 'Confirm the adjustment type first'
    : outstanding.length
      ? `${outstanding.length} required document(s) outstanding`
      : !c.remarks.trim() || !c.recommendation.trim()
        ? 'Record the remarks and the recommendation'
        : '';

  return (
    <AppShell
      title="Variance and Adjustment Case"
      breadcrumb={[country, 'Compliance', 'Variance cases', c.id]}
      banner={
        <RecordHeader
          title={c.id}
          chip={<StatusChip status={caseChip(c.status)} />}
          meta={[
            ['Case #', c.id],
            ['Trigger', c.triggerPoint],
            ['Raised', c.raisedOn],
            ['Quantity', `${c.quantityMt} MT`],
            ['Value', `${c.value.toLocaleString()} ${c.currency}`],
            ['Location', c.location],
          ]}
        />
      }
    >
      <KnowledgePanel type="Procedure" country={country} contextLabel="Adjustment types process document" />

      <CaseTabs
        tabs={['Summary', 'Evidence', 'Linked Records', 'Approval', 'ERP', 'Activity', 'History']}
        value={tab}
        onChange={setTab}
      />

      {tab === 0 && (
        <>
          {/* S04-SC-04 */}
          <SectionCard title="S04-SC-04 — Trigger source">
            <TraceNote workflow="WF-S04-01 / Step 1 — created automatically from the configured trigger point, or manually where the variance is identified outside those triggers" />
            <FieldGrid columns={3}>
              <ReadOnlyField label="Created" value={c.createdAutomatically ? 'Automatically from a trigger point' : 'Manually by compliance'} />
              <ReadOnlyField label="Trigger point" value={c.triggerPoint} />
              <ReadOnlyField
                label="Originating record"
                value={c.triggerRoute ? <Link to={c.triggerRoute}>{c.triggerRecord}</Link> : c.triggerRecord}
              />
            </FieldGrid>
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary, display: 'block', mb: 0.5 }}>
                The documented trigger points, configured per country:
              </Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {TRIGGER_POINTS.map((t) => (
                  <Chip
                    key={t.key} size="small" label={`${t.key} · ${t.module}`}
                    sx={{
                      height: 22, fontSize: '0.68rem',
                      bgcolor: c.triggerPoint === t.key ? COLORS.primary : '#EEF1F4',
                      color: c.triggerPoint === t.key ? '#fff' : COLORS.textSecondary,
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </SectionCard>

          {/* S04-SC-05 */}
          <SectionCard title="S04-SC-05 — Suggested adjustment type">
            <TraceNote workflow="WF-S04-01 / Step 2 — COTS retrieves the documents from the linked processes and suggests the adjustment type; the suggestion is a proposal, not the decision" />
            <FieldGrid columns={2}>
              <ReadOnlyField
                label="Suggested by COTS"
                value={<Chip size="small" label={c.suggestedType} sx={{ height: 20, bgcolor: '#EEF1F4' }} />}
              />
              <ReadOnlyField
                label="Basis of the suggestion"
                value={
                  <Stack>
                    {c.suggestionBasis.map((b) => (
                      <Typography key={b.doc} variant="caption">{b.doc} · {b.from}</Typography>
                    ))}
                  </Stack>
                }
              />
            </FieldGrid>
            <Box sx={{ mt: 2, maxWidth: 420 }}>
              <RequiredLabel label="Confirmed adjustment type" required />
              <Select
                fullWidth variant="standard" value={c.confirmedType} disabled={submitted}
                onChange={(e) => { confirmType(c.id, e.target.value); say('Adjustment type confirmed — the required evidence set has been re-evaluated'); }}
              >
                {ADJUSTMENT_TYPES.map((t) => <MenuItem key={t.type} value={t.type}>{t.type}</MenuItem>)}
              </Select>
            </Box>
            {c.confirmedType && c.confirmedType !== c.suggestedType && (
              <Alert severity="info" sx={{ mt: 1.5 }}>
                Compliance replaced the suggested type. The original suggestion (<b>{c.suggestedType}</b>) is retained
                on the case — replacing a proposal is a normal action, not an override.
              </Alert>
            )}
            <BusinessConfirmation>
              Provide the Adjustments Types Process Document so that permitted adjustment types and their document
              requirements are configured as rules rather than hard-coded.
              <PrototypeNote>
                four placeholder types are listed, drawn from the trigger points the source names; changing the type
                re-evaluates the required evidence, to show that it is rule-driven.
              </PrototypeNote>
            </BusinessConfirmation>
          </SectionCard>

          <SectionCard title="Case detail">
            <FieldGrid columns={3}>
              <ReadOnlyField label="Commodity · batch" value={`${c.commodity} · ${c.batch}`} />
              <ReadOnlyField label="Quantity" value={`${c.quantityMt} MT`} />
              <ReadOnlyField label="Value" value={`${c.value.toLocaleString()} ${c.currency}`} />
            </FieldGrid>
            <Box sx={{ mt: 2 }}>
              <RequiredLabel label="Remarks on the reasons for the case" required />
              <TextField
                fullWidth variant="standard" multiline minRows={2} value={c.remarks} disabled={submitted}
                onChange={(e) => updateCase(c.id, { remarks: e.target.value })}
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <RequiredLabel label="Recommendation" required />
              <TextField
                fullWidth variant="standard" multiline minRows={2} value={c.recommendation} disabled={submitted}
                onChange={(e) => updateCase(c.id, { recommendation: e.target.value })}
              />
            </Box>

            {!submitted && (
              <Box sx={{ mt: 2 }}>
                <Tooltip title={submitReason}>
                  <span>
                    <Button
                      variant="contained"
                      disabled={!canSubmit}
                      onClick={() => {
                        updateCase(c.id, { status: `Pending ${steps[0]}` as any });
                        setTab(3);
                        say(`Case submitted through C4 Approval — pending ${steps[0]}`);
                      }}
                    >
                      Submit for approval
                    </Button>
                  </span>
                </Tooltip>
                {!canSubmit && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: COLORS.attention }}>
                    {submitReason}
                  </Typography>
                )}
              </Box>
            )}
          </SectionCard>
        </>
      )}

      {tab === 1 && (
        <SectionCard title="S04-SC-06 — Evidence checklist">
          <TraceNote workflow="WF-S04-01 / Step 3 — compliance verify that the documents required for the confirmed adjustment type have been submitted, uploading any further evidence" />
          {!c.confirmedType && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              The required evidence set is driven by the confirmed adjustment type. Confirm the type on the Summary
              tab to see what this case requires.
            </Alert>
          )}
          <RequirementChecklist
            rows={c.evidence.map((e) => ({
              item: e.item,
              provided: e.provided,
              note: e.retrievedFrom ? `Retrieved automatically from ${e.retrievedFrom}` : e.provided ? 'Uploaded' : 'Outstanding',
            }))}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            {c.evidence.filter((e) => !e.provided).map((e) => (
              <Button
                key={e.item} size="small" variant="outlined"
                onClick={() => {
                  updateCase(c.id, { evidence: c.evidence.map((x) => (x.item === e.item ? { ...x, provided: true } : x)) });
                  say(`${e.item} uploaded (Core C7)`);
                }}
              >
                Upload {e.item}
              </Button>
            ))}
          </Stack>
          {outstanding.length > 0 && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              The case cannot proceed to approval until the missing documents are provided.
            </Alert>
          )}
        </SectionCard>
      )}

      {tab === 2 && (
        <SectionCard title="Linked records (SM-05)">
          <TraceNote workflow="WF-S04-01 / Step 1 and WF-S04-03 / Step 9 — the originating record, and where an insurance case is involved, the link that keeps physical loss, insurance claim and book adjustment together" />
          <LinkedRecordsPanel rows={c.linked} />
          {c.linked.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No linked records — this case was identified outside the configured trigger points.
            </Typography>
          )}
        </SectionCard>
      )}

      {tab === 3 && (
        <SectionCard title="S04-SC-03 — Approval (C4)">
          <TraceNote workflow="WF-S04-01 / Step 5 — Compliance Manager, then Head of Department, then Finance Manager, each recorded with decision, comment and timestamp" />

          <Box sx={{ bgcolor: '#FFF7E6', border: '1px solid #F0D9A8', borderRadius: 1, p: 1.5, mb: 2 }}>
            <BusinessConfirmation>
              Confirm whether the three-step approval route applies to every case, or only above a defined value
              threshold.
            </BusinessConfirmation>
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControlLabel
                control={<Switch size="small" checked={thresholdEnabled} onChange={(e) => setThresholdEnabled(e.target.checked)} />}
                label={<Typography variant="body2">Apply a value threshold</Typography>}
              />
              {thresholdEnabled && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Threshold ({c.currency})</Typography>
                  <TextField
                    variant="standard" value={threshold} sx={{ width: 100 }}
                    onChange={(e) => setThreshold(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                  />
                </Box>
              )}
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                This case is {c.value.toLocaleString()} {c.currency} → {steps.length === 1 ? 'single-step route' : 'three-step route'}
              </Typography>
            </Stack>
          </Box>

          <Stepper activeStep={c.approvals.length} sx={{ my: 3, maxWidth: 760 }}>
            {steps.map((s) => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
            <Step><StepLabel>ERP confirmation</StepLabel></Step>
          </Stepper>

          {c.status.startsWith('Pending') && (
            <Button variant="contained" onClick={() => setDecide(true)}>
              Open approval task (as {steps[c.approvals.length] ?? steps[steps.length - 1]})
            </Button>
          )}
          {c.status === 'Awaiting ERP confirmation' && (
            <Alert severity="success">Final approval reached. The case now awaits the ERP transaction — see the ERP tab.</Alert>
          )}
          {c.status === 'Rejected' && (
            <Alert severity="error">The case was rejected or returned and goes back to compliance for further evidence or revision.</Alert>
          )}

          <SectionCard title="Approval history (C4 / C8)">
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Step', 'Decision', 'By', 'On', 'Comment'].map((h) => <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {c.approvals.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell>{a.step}</TableCell>
                    <TableCell><StatusChip status={a.decision === 'Approved' ? 'Approved' : 'Rejected'} /></TableCell>
                    <TableCell>{a.by}</TableCell>
                    <TableCell>{a.on}</TableCell>
                    <TableCell>{a.comment || '—'}</TableCell>
                  </TableRow>
                ))}
                {c.approvals.length === 0 && (
                  <TableRow><TableCell colSpan={5}><Typography variant="body2" color="text.secondary">Not yet submitted</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </SectionCard>
        </SectionCard>
      )}

      {tab === 4 && (
        <SectionCard title="S04-SC-07 — ERP adjustment confirmation">
          <TraceNote workflow="WF-S04-01 / Steps 6–8 — on final approval Inventory Finance is notified; the case remains open until the ERP transaction is confirmed for that case" />
          <FieldGrid columns={3}>
            <ReadOnlyField
              label="Notified to Inventory Finance"
              value={c.status === 'Awaiting ERP confirmation' || c.status === 'Closed' ? 'Sent on final approval (C5, C12)' : 'Not yet — pending approval'}
            />
            <ReadOnlyField
              label="ERP transaction confirmed"
              value={c.erpConfirmed ? <StatusChip status="Approved" /> : <Chip size="small" label="Not confirmed" sx={{ height: 20, bgcolor: COLORS.attention, color: '#fff' }} />}
            />
            <ReadOnlyField label="ERP reference" value={c.erpReference || '—'} />
          </FieldGrid>

          <BusinessConfirmation>
            Confirm whether the ERP adjustment is posted from COTS or confirmed back to COTS after manual posting by
            Inventory Finance.
            <PrototypeNote>
              only the confirm-back shape is built; a post-from-COTS action would presume the answer.
            </PrototypeNote>
          </BusinessConfirmation>

          {c.status === 'Awaiting ERP confirmation' && !c.erpConfirmed && (
            <SimulationButton
              label="Simulate ERP confirmation"
              note="Records the adjustment reference as confirmed by Inventory Finance so the closure step can be demonstrated."
              onClick={() => setErp(true)}
            />
          )}

          <Alert severity={c.erpConfirmed ? 'success' : 'info'} sx={{ mt: 1 }}>
            {c.erpConfirmed
              ? `ERP transaction confirmed (${c.erpReference}). The case can be closed.`
              : 'Close is unavailable until the ERP transaction is confirmed as done for this case — confirmation is a condition of closure, not an optional follow-up.'}
          </Alert>

          <Box sx={{ mt: 2 }}>
            <Tooltip title={c.erpConfirmed ? '' : 'Awaiting ERP confirmation'}>
              <span>
                <Button
                  variant="contained"
                  disabled={!c.erpConfirmed || c.status === 'Closed'}
                  onClick={() => { updateCase(c.id, { status: 'Closed' }); say(`${c.id} closed with adjustment reference ${c.erpReference} — evidence pack and approval history retained`); }}
                >
                  Close case
                </Button>
              </span>
            </Tooltip>
          </Box>

          <HandOffBanner
            to="Inventory Finance / enterprise system (C12)"
            passes="approved adjustment type, quantity, value, case reference"
            returns="the ERP transaction reference"
            resumes="the case is closed only once the transaction is confirmed"
          />
        </SectionCard>
      )}

      {tab === 5 && (
        <SectionCard title="Activity — C6 comments and case history">
          <Stack spacing={0.5}>
            <Typography variant="body2">{c.raisedOn} · case created {c.createdAutomatically ? 'automatically' : 'manually'} from {c.triggerPoint}</Typography>
            {c.confirmedType && <Typography variant="body2">Adjustment type confirmed: {c.confirmedType}</Typography>}
            {c.approvals.map((a, i) => <Typography key={i} variant="body2">{a.on} · {a.step} · {a.decision}</Typography>)}
            {c.erpConfirmed && <Typography variant="body2">ERP transaction confirmed · {c.erpReference}</Typography>}
          </Stack>
        </SectionCard>
      )}

      {tab === 6 && (
        <SectionCard title="History — C8 audit trail">
          <Typography variant="body2" color="text.secondary">
            Business-language timeline of the case, in the same position as on every other COTS record.
          </Typography>
        </SectionCard>
      )}

      <BottomBar>
        <Button component={Link} to="/s04/cases" variant="outlined">Back to variance cases</Button>
        <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
          The adjustments report by type, location, period and status is published through C11 Reporting.
        </Typography>
      </BottomBar>

      {/* C4 decision */}
      <Dialog open={decide} onClose={() => setDecide(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.primary, color: '#fff', py: 1.25 }}>
          Approval task — {c.id}
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.85 }}>
            Core C4 decision drawer · step {c.approvals.length + 1} of {steps.length}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <FieldGrid columns={2}>
            <ReadOnlyField label="Adjustment type" value={c.confirmedType} />
            <ReadOnlyField label="Quantity · value" value={`${c.quantityMt} MT · ${c.value.toLocaleString()} ${c.currency}`} />
            <ReadOnlyField label="Recommendation" value={c.recommendation} />
            <ReadOnlyField label="Evidence" value={`${c.evidence.filter((e) => e.provided).length} of ${c.evidence.length} provided`} />
          </FieldGrid>
          <RadioGroup value={decision} onChange={(e) => setDecision(e.target.value as any)} sx={{ mt: 2 }}>
            <FormControlLabel value="Approved" control={<Radio size="small" />} label="Approve" />
            <FormControlLabel value="Returned" control={<Radio size="small" />} label="Return for further evidence or revision" />
            <FormControlLabel value="Rejected" control={<Radio size="small" />} label="Reject" />
          </RadioGroup>
          <TextField label="Comment" fullWidth multiline minRows={2} value={comment} onChange={(e) => setComment(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDecide(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              advanceApproval(c.id, decision, comment);
              setDecide(false);
              setComment('');
              say(decision === 'Approved' ? 'Decision recorded' : 'Case returned to compliance');
            }}
          >
            Record decision
          </Button>
        </DialogActions>
      </Dialog>

      {/* ERP confirmation */}
      <Dialog open={erp} onClose={() => setErp(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm the ERP transaction</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, fontSize: '0.78rem' }}>
            Inventory Finance confirms the transaction back to COTS. Record the adjustment reference.
          </Alert>
          <RequiredLabel label="ERP adjustment reference" required />
          <TextField fullWidth variant="standard" value={erpRef} placeholder="e.g. ADJ-2026-0417" onChange={(e) => setErpRef(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErp(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!erpRef.trim()}
            onClick={() => {
              updateCase(c.id, { erpConfirmed: true, erpReference: erpRef });
              setErp(false);
              say('ERP transaction confirmed — the case can now be closed');
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
