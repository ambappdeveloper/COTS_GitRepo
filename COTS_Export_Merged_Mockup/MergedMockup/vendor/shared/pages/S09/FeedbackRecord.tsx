import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { CaseTabs, LinkedRecordsPanel, StepStrip } from '../../components/CaseWorkspace';
import {
  BottomBar, BusinessConfirmation, HandOffBanner, PrototypeNote, ReadOnlyField, RequiredLabel, SectionCard,
  TraceNote,
} from '../../components/shared';
import { useStore } from '../../state/store';
import { outstandingResolution, useS09 } from '../../state/s09store';
import {
  AREAS, ESCALATION_RULES, FEEDBACK_CONTRACTS, QUESTION_SET, indicatorScores, scoreOf,
} from '../../mockData/s09';
import { COLORS } from '../../theme';
import { ProposalBanner, stateColour } from './Register';

export default function FeedbackRecord() {
  const { id } = useParams();
  const { country, say } = useStore();
  const { feedback, updateFeedback, resolve } = useS09();
  const nav = useNavigate();

  const f = feedback.find((x) => x.id === id);
  const [tab, setTab] = React.useState(0);
  const [reroute, setReroute] = React.useState(false);
  const [newArea, setNewArea] = React.useState('');
  const [reason, setReason] = React.useState('');

  if (!f) {
    return (
      <AppShell title="Feedback" breadcrumb={[country, 'Shared Modules', 'CRM and Customer Feedback']} showSeason={false}>
        <Alert severity="warning">No feedback with that reference exists in the prototype data.</Alert>
        <Button component={Link} to="/s09" variant="outlined" sx={{ mt: 2 }}>Back to the feedback register</Button>
      </AppShell>
    );
  }

  const contract = FEEDBACK_CONTRACTS.find((c) => c.id === f.contract);
  const isComplaint = f.satisfaction === 'Complaint';
  const resolved = f.state === 'Resolved';
  const outstanding = outstandingResolution(f);

  const steps = [
    { label: 'Recorded', done: true },
    { label: 'Classified', done: !!f.satisfaction && !!f.subject },
    { label: 'Routed', done: !!f.assignedArea, disabled: !isComplaint, disabledReason: 'Routing applies to complaints only' },
    { label: 'Response recorded', done: !!f.response, disabled: !isComplaint, disabledReason: 'Routing applies to complaints only' },
    { label: 'Resolved', done: resolved, disabled: !isComplaint, disabledReason: 'Routing applies to complaints only' },
  ];

  return (
    <AppShell
      title={`Feedback ${f.id}`}
      breadcrumb={[country, 'Shared Modules', 'CRM and Customer Feedback', f.id]}
      showSeason={false}
    >
      <ProposalBanner />

      <Box sx={{ bgcolor: COLORS.primary, color: '#fff', px: 2, py: 1.2, borderRadius: 1, mb: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{f.id}</Typography>
          <Chip size="small" label={f.state} sx={{ height: 20, bgcolor: stateColour(f.state), color: '#fff', fontWeight: 700 }} />
          <Chip
            size="small" label={`${f.satisfaction} · ${f.subject}`}
            sx={{ height: 20, bgcolor: '#fff', color: COLORS.primaryDark, fontWeight: 700 }}
          />
        </Stack>
        <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.92)' }}>
          {f.customer} · Contract {f.contract} · Obtained {f.dateObtained} by {f.obtainedBy} · {f.channel} · Score{' '}
          {scoreOf(f).toFixed(1)} / 5
        </Typography>
      </Box>

      <StepStrip steps={steps} value={0} onChange={() => {}} />

      <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary, letterSpacing: 0.4, display: 'block', mb: 0.5 }}>
        S09-SC-06 · FEEDBACK RECORD
      </Typography>
      <CaseTabs
        tabs={['Feedback and responses', 'Routing and response', 'Linked records', 'History (C8)']}
        value={tab}
        onChange={setTab}
      />

      {/* ------------------------------------------------ responses tab */}
      {tab === 0 && (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 520px', minWidth: 420 }}>
            <SectionCard title="Question responses">
              <TraceNote workflow="WF-S09-01 / Step 2 — the defined question set, so responses are comparable over time" />
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['#', 'Question', 'Response', 'Indicator · weight'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {QUESTION_SET.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell>{q.id}</TableCell>
                      <TableCell>{q.text}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{f.responses[q.id] ?? '—'}</TableCell>
                      <TableCell>{q.indicator} · {q.weight} %</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <BusinessConfirmation>
                Provide and approve the CRM feedback questions and satisfaction indicators.
                <PrototypeNote>the question set above is a labelled draft proposal held as configuration.</PrototypeNote>
              </BusinessConfirmation>
            </SectionCard>

            <SectionCard title="Narrative comments">
              <Typography variant="body2">{f.narrative || '— none recorded —'}</Typography>
              <Alert severity="info" sx={{ mt: 1, fontSize: '0.8rem' }}>
                Narrative is captured <b>in addition to</b> the defined responses, never instead of them.
              </Alert>
            </SectionCard>
          </Box>

          <Box sx={{ flex: '1 1 380px', minWidth: 340 }}>
            <SectionCard title="Indicators from these responses">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Indicator', 'Questions', 'Score'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {indicatorScores(f).map((i) => (
                    <TableRow key={i.indicator}>
                      <TableCell>{i.indicator}</TableCell>
                      <TableCell>{i.questions}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{i.score.toFixed(2)} / 5</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SectionCard>

            <SectionCard title="Contract">
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
                <ReadOnlyField label="Contract" value={f.contract} />
                <ReadOnlyField label="Customer" value={f.customer} />
                <ReadOnlyField label="Commodity" value={contract?.commodity ?? '—'} />
                <ReadOnlyField label="Destination · country" value={contract ? `${contract.destination} · ${contract.country}` : '—'} />
                <ReadOnlyField label="Delivered" value={contract?.delivered ?? '—'} />
              </Box>
            </SectionCard>
          </Box>
        </Box>
      )}

      {/* ------------------------------------------------ routing tab */}
      {tab === 1 && (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {!isComplaint ? (
            <Box sx={{ flex: '1 1 100%' }}>
              <SectionCard title="No routing">
                <Alert severity="success" sx={{ fontSize: '0.85rem' }}>
                  This record is classified <b>Satisfaction</b>, so there is nothing to route. It goes straight to the
                  satisfaction measures and contributes to the score by customer, commodity, destination and country.
                </Alert>
                <Button size="small" variant="outlined" component={Link} to="/s09/satisfaction" sx={{ mt: 1.5 }}>
                  Open the satisfaction dashboard
                </Button>
              </SectionCard>
            </Box>
          ) : (
            <>
              {/* S09-SC-07 */}
              <Box sx={{ flex: '1 1 420px', minWidth: 380 }}>
                <SectionCard title="S09-SC-07 · Complaint routing">
                  <TraceNote workflow="WF-S09-02 / Steps 1, 5 — routed according to its classification and the configured escalation rules; the assigned area held on the record" />

                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
                    <ReadOnlyField label="Classification" value={`${f.satisfaction} · ${f.subject}`} />
                    <ReadOnlyField label="Routed to" value={f.assignedArea ?? '—'} />
                    <ReadOnlyField label="Routed on" value={f.routedOn ?? '—'} />
                    <ReadOnlyField label="Financial demand" value={f.financialDemand ? 'Yes' : 'No'} />
                  </Box>
                  {f.financialDemandNote && (
                    <Box sx={{ mt: 1 }}>
                      <ReadOnlyField label="What is being demanded" value={f.financialDemandNote} />
                    </Box>
                  )}

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>
                      CONFIGURED ESCALATION RULES — SHOWN, NOT HIDDEN
                    </Typography>
                    <Table size="small">
                      <TableBody>
                        {ESCALATION_RULES.map((r) => (
                          <TableRow key={r.when} selected={r.route === f.assignedArea}>
                            <TableCell>{r.when}</TableCell>
                            <TableCell sx={{ fontWeight: r.route === f.assignedArea ? 700 : 400 }}>{r.route}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mt: 0.5 }}>
                      The routing is explicable rather than magical — the rule that fired is highlighted.
                    </Typography>
                  </Box>

                  <BusinessConfirmation>
                    Confirm the classification categories and the escalation rules from complaint to non-conformity and
                    to claim.
                    <PrototypeNote>the rule set above is configuration and is itself part of the proposal.</PrototypeNote>
                  </BusinessConfirmation>

                  {f.rerouteReason && (
                    <Alert severity="info" sx={{ mt: 1, fontSize: '0.8rem' }}>
                      <b>Rerouted.</b> {f.rerouteReason}
                    </Alert>
                  )}

                  {!resolved && (
                    <>
                      <Button size="small" variant="outlined" onClick={() => setReroute(true)} sx={{ mt: 1 }}>
                        Reroute to another area
                      </Button>
                      <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary }}>
                        Rules will not cover every case, so rerouting is allowed — but <b>only with a recorded
                        reason</b>, because an unexplained reroute destroys the resolution-time measure.
                      </Typography>
                    </>
                  )}
                </SectionCard>
              </Box>

              {/* S09-SC-08 */}
              <Box sx={{ flex: '1 1 420px', minWidth: 380 }}>
                <SectionCard title="S09-SC-08 · Response from the assigned area">
                  <TraceNote workflow="WF-S09-02 / Steps 2, 5 — the response recorded against the feedback with its resolution date" />

                  <ReadOnlyField label="Assigned area — owns this response" value={f.assignedArea ?? '—'} />

                  <Box sx={{ mt: 1.5 }}>
                    <RequiredLabel label="Response" required />
                    <TextField
                      size="small" fullWidth multiline minRows={3} sx={{ mt: 0.5 }}
                      value={f.response ?? ''} disabled={resolved}
                      onChange={(e) => updateFeedback(f.id, { response: e.target.value, state: 'Response recorded' })}
                      placeholder="What was done, or what the position is."
                    />
                  </Box>

                  <Box sx={{ mt: 1.5 }}>
                    <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                      Corrective action taken, where something was changed
                    </Typography>
                    <TextField
                      size="small" fullWidth sx={{ mt: 0.5 }}
                      value={f.correctiveAction ?? ''} disabled={resolved}
                      onChange={(e) => updateFeedback(f.id, { correctiveAction: e.target.value })}
                    />
                  </Box>

                  <Box sx={{ mt: 1.5, maxWidth: 240 }}>
                    <RequiredLabel label="Resolution date" required />
                    <TextField
                      size="small" fullWidth sx={{ mt: 0.5 }}
                      value={f.resolutionDate ?? ''} disabled={resolved}
                      onChange={(e) => updateFeedback(f.id, { resolutionDate: e.target.value })}
                      placeholder="e.g. 21-Aug-2026"
                    />
                  </Box>

                  {!resolved ? (
                    <>
                      <Tooltip title={outstanding.length ? outstanding.join(' ') : ''}>
                        <span>
                          <Button
                            variant="contained" sx={{ mt: 1.5 }} disabled={outstanding.length > 0}
                            onClick={() => { resolve(f.id); say(`Complaint ${f.id} resolved.`); }}
                          >
                            Mark the complaint resolved
                          </Button>
                        </span>
                      </Tooltip>
                      {outstanding.length > 0 && (
                        <Alert severity="warning" sx={{ mt: 1, fontSize: '0.8rem' }}>
                          <b>Resolution is blocked:</b>
                          <Box component="ul" sx={{ pl: 2, m: 0.5 }}>
                            {outstanding.map((o) => <li key={o}>{o}</li>)}
                          </Box>
                          Resolution time is the only complaint metric the module produces, so a resolution date with
                          no response would corrupt it.
                        </Alert>
                      )}
                    </>
                  ) : (
                    <Alert severity="success" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                      Resolved on {f.resolutionDate}. Resolution time is reported in complaints by category.
                    </Alert>
                  )}
                </SectionCard>
              </Box>
            </>
          )}
        </Box>
      )}

      {/* ------------------------------------------------ linked records tab */}
      {tab === 2 && (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 520px', minWidth: 420 }}>
            <SectionCard title="Three linked but separate records">
              <TraceNote workflow="WF-S09-02 / Steps 3–5 — the feedback, any related quality non-conformity and the commercial claim remain three linked but separate records" />
              <LinkedRecordsPanel
                rows={[
                  { label: 'Contract', value: f.contract, note: 'The contract the feedback relates to' },
                  ...(f.nonConformity
                    ? [{ label: 'S03 non-conformity', value: f.nonConformity, to: f.nonConformityRoute, note: 'The quality consequence. The non-conformity process runs in S03' }]
                    : []),
                  ...(f.claim
                    ? [{ label: 'S07 commercial claim', value: f.claim, to: f.claimRoute, note: 'The financial consequence. Valuation, approval and settlement are S07' }]
                    : []),
                ]}
              />
              <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                Each record has its own reference, its own state and its own owner, and each opens in its own module.
                There is <b>nowhere in this interface to merge them or to edit one from another</b>.
              </Alert>
            </SectionCard>
          </Box>

          <Box sx={{ flex: '1 1 380px', minWidth: 340 }}>
            {/* S09-SC-09 */}
            {f.subject === 'Commodity' && isComplaint && (
              <SectionCard title="S09-SC-09 · Commodity complaint → S3 Quality">
                <TraceNote workflow="WF-S09-02 / Step 3 — linked to the relevant quality records and may raise a non-conformity handled under WF-S03-03" />
                {f.nonConformity ? (
                  <>
                    <ReadOnlyField label="Linked non-conformity" value={f.nonConformity} />
                    <Button size="small" variant="outlined" component={Link} to={f.nonConformityRoute ?? '/s03/ncs'} sx={{ mt: 1 }}>
                      Open in S03 Quality
                    </Button>
                  </>
                ) : (
                  <>
                    <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                      A commodity complaint <b>may</b> raise a non-conformity — the source says <i>may</i>, not
                      <i> does</i>. This complaint has none, and that is a legitimate outcome: where the quality
                      records show the consignment was within specification, the complaint is answered by explanation
                      rather than by correction.
                    </Alert>
                    <Button
                      size="small" variant="outlined" component={Link} to="/s03/ncs" sx={{ mt: 1 }}
                      onClick={() => updateFeedback(f.id, { nonConformity: 'NC-0088', nonConformityRoute: '/s03/ncs' })}
                    >
                      Raise a non-conformity in S03
                    </Button>
                  </>
                )}
                <HandOffBanner
                  to="S03 Quality Assurance"
                  passes="the commodity complaint and the contract's quality records"
                  returns="the non-conformity reference, held on this feedback record"
                  resumes="The non-conformity process runs under WF-S03-03 and is not repeated here"
                  linkLabel="Open S03 non-conformities"
                  linkTo="/s03/ncs"
                />
              </SectionCard>
            )}

            {/* S09-SC-10 */}
            {isComplaint && f.financialDemand && (
              <SectionCard title="S09-SC-10 · Financial demand → S7 Claims">
                <TraceNote workflow="WF-S09-02 / Step 4 — a complaint carrying a financial demand is registered as a commercial claim in S7; feedback and claim remain linked but distinct" />
                <ReadOnlyField label="What is being demanded" value={f.financialDemandNote ?? '—'} />
                {f.claim ? (
                  <>
                    <Box sx={{ mt: 1 }}>
                      <ReadOnlyField label="Linked commercial claim" value={f.claim} />
                    </Box>
                    <Button size="small" variant="outlined" component={Link} to={f.claimRoute ?? '/s07'} sx={{ mt: 1 }}>
                      Open the claim in S07
                    </Button>
                    <Alert severity="info" sx={{ mt: 1, fontSize: '0.78rem' }}>
                      The S07 claim workspace shows this feedback reference as its <b>originating feedback</b>. The two
                      records then live their own lives — the claim goes through valuation and approval, the feedback
                      goes to resolution, and neither drives the other's state.
                    </Alert>
                  </>
                ) : (
                  <Button
                    size="small" variant="contained" component={Link} to="/s07/register" sx={{ mt: 1 }}
                    onClick={() => updateFeedback(f.id, { claim: 'CL-0188', claimRoute: '/s07' })}
                  >
                    Register a commercial claim in S07
                  </Button>
                )}
                <HandOffBanner
                  to="S07 Claims"
                  passes="the contract, the customer as buyer, the description and this feedback reference as the origin"
                  returns="the claim reference, held on this feedback record"
                  resumes="Valuation, approval and settlement are handled in S07"
                  linkLabel="Open S07 Claims"
                  linkTo="/s07"
                />
              </SectionCard>
            )}
          </Box>
        </Box>
      )}

      {/* ------------------------------------------------ history tab */}
      {tab === 3 && (
        <SectionCard title="Record history (Core C8)">
          <Table size="small">
            <TableHead>
              <TableRow>
                {['When', 'Who', 'What'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                [f.dateObtained, f.obtainedBy, `Feedback obtained by ${f.channel.toLowerCase()} and recorded against contract ${f.contract}`],
                [f.dateObtained, f.obtainedBy, `Classified ${f.satisfaction} · ${f.subject}`],
                ...(f.routedOn ? [[f.routedOn, 'COTS — escalation rules', `Routed to ${f.assignedArea}`]] : []),
                ...(f.claim ? [[f.routedOn ?? f.dateObtained, 'Commercial', `Commercial claim ${f.claim} registered in S07`]] : []),
                ...(f.nonConformity ? [[f.routedOn ?? f.dateObtained, 'Quality', `Non-conformity ${f.nonConformity} raised in S03`]] : []),
                ...(f.response ? [[f.resolutionDate ?? '—', f.assignedArea ?? '—', 'Response recorded']] : []),
                ...(f.state === 'Resolved' ? [[f.resolutionDate ?? '—', f.assignedArea ?? '—', 'Complaint resolved']] : []),
              ].map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r[0]}</TableCell>
                  <TableCell>{r[1]}</TableCell>
                  <TableCell>{r[2]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      )}

      <BottomBar>
        <Button variant="outlined" onClick={() => nav('/s09')}>Back to the feedback register</Button>
        <Button variant="outlined" component={Link} to="/s09/satisfaction">Satisfaction dashboard</Button>
      </BottomBar>

      <Dialog open={reroute} onClose={() => setReroute(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reroute the complaint</DialogTitle>
        <DialogContent>
          <TraceNote workflow="WF-S09-02 / Step 1 — the configured rules decide the route; a change must be explicable" />
          <Box sx={{ mt: 1 }}>
            <RequiredLabel label="Route to" required />
            <Select size="small" fullWidth displayEmpty value={newArea} onChange={(e) => setNewArea(e.target.value)} sx={{ mt: 0.5 }}>
              <MenuItem value=""><em>Select the area</em></MenuItem>
              {AREAS.filter((a) => a !== f.assignedArea).map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </Box>
          <Box sx={{ mt: 2 }}>
            <RequiredLabel label="Reason for the reroute" required />
            <TextField
              size="small" fullWidth multiline minRows={2} sx={{ mt: 0.5 }}
              value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Why the configured route is not the right one for this complaint."
            />
            <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
              Mandatory. Held on the record, because resolution time depends on knowing who actually held it.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReroute(false)}>Cancel</Button>
          <Tooltip title={!newArea || !reason ? 'Both the area and the reason are required.' : ''}>
            <span>
              <Button
                variant="contained" disabled={!newArea || !reason}
                onClick={() => {
                  updateFeedback(f.id, {
                    assignedArea: newArea,
                    rerouteReason: `Rerouted from ${f.assignedArea} to ${newArea} on 19-Aug-2026 — ${reason}`,
                  });
                  say(`Complaint ${f.id} rerouted to ${newArea}, with the reason recorded.`);
                  setReroute(false);
                }}
              >
                Reroute with the reason
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
