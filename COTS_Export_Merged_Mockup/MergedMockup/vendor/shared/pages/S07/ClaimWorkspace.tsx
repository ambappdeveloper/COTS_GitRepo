import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { CaseTabs, LinkedRecordsPanel, RequirementChecklist, StepStrip } from '../../components/CaseWorkspace';
import {
  BottomBar, BusinessConfirmation, HandOffBanner, PrototypeNote, ReadOnlyField, RequiredLabel, SectionCard,
  TraceNote,
} from '../../components/shared';
import { useStore } from '../../state/store';
import { outstandingClosure, outstandingRequirements, useS07 } from '../../state/s07store';
import { APPROVAL_BANDS, CONTRACTS, SUBMISSION_REQUIREMENTS } from '../../mockData/s07';
import { COLORS } from '../../theme';
import { stateColour } from './Register';

const money = (n: number, cur = 'USD') => (n ? `${cur} ${n.toLocaleString()}` : '—');

export default function ClaimWorkspace() {
  const { id } = useParams();
  const { country, say } = useStore();
  const { claims, updateClaim, submit, decide, close } = useS07();
  const nav = useNavigate();

  const claim = claims.find((c) => c.id === id);
  const [tab, setTab] = React.useState(0);
  const [decideOpen, setDecideOpen] = React.useState<'Approved' | 'Rejected' | null>(null);
  const [justification, setJustification] = React.useState('');
  const [approvedAmount, setApprovedAmount] = React.useState(0);

  if (!claim) {
    return (
      <AppShell title="Claim" breadcrumb={[country, 'Shared Modules', 'Claims']} showSeason={false}>
        <Alert severity="warning">No claim with that reference exists in the prototype data.</Alert>
        <Button component={Link} to="/s07" sx={{ mt: 2 }} variant="outlined">Back to the claim register</Button>
      </AppShell>
    );
  }

  const contract = CONTRACTS.find((c) => c.id === claim.contract);
  const locked = claim.state !== 'Registered' && claim.state !== 'Valued';
  const closed = claim.state === 'Closed' || claim.state === 'Closed without settlement';
  const outstanding = outstandingRequirements(claim);
  const closureOutstanding = outstandingClosure(claim);
  const band = APPROVAL_BANDS[claim.recommended <= 5000 ? 0 : claim.recommended <= 25000 ? 1 : 2];

  const steps = [
    { label: 'Registered', done: true },
    { label: 'Valued', done: !!claim.conclusion && claim.claimValue > 0 },
    { label: 'Approved / Rejected', done: !!claim.approval },
    { label: 'Settled and closed', done: !!claim.closureDate },
  ];

  return (
    <AppShell
      title={`Claim ${claim.id}`}
      breadcrumb={[country, 'Shared Modules', 'Claims', claim.id]}
      showSeason={false}
    >
      {/* ------------------------------------------------- S07-SC-06 header */}
      <Box sx={{ bgcolor: COLORS.primary, color: '#fff', px: 2, py: 1.2, borderRadius: 1, mb: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{claim.id}</Typography>
          <Chip size="small" label={claim.state} sx={{ height: 20, bgcolor: stateColour(claim.state), color: '#fff', fontWeight: 700 }} />
          {closed && <Chip size="small" icon={<LockOutlinedIcon sx={{ fontSize: 14 }} />} label="Closed — read-only" sx={{ height: 20, bgcolor: '#fff', color: COLORS.primaryDark, fontWeight: 700 }} />}
        </Stack>
        <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.92)' }}>
          {claim.buyer} · Contract {claim.contract} · {claim.cause} · {claim.type} · Raised {claim.dateRaised} ·{' '}
          {money(claim.claimValue, claim.currency)}
        </Typography>
      </Box>

      <StepStrip steps={steps} value={Math.min(tab, 3)} onChange={() => {}} />

      <PrototypeNote>
        Four states, and no investigation workflow. There is no task list, no assignment or chase control and no
        evidence-request tracking on this claim — <b>the operation team investigates offline; COTS records the
        conclusion, not the investigation.</b> That is the business's stated requirement, and building the workflow
        would be over-engineering against it.
      </PrototypeNote>

      <CaseTabs
        tabs={['Claim', 'Valuation and approval', 'Settlement', 'Documents (C7)', 'History (C8)']}
        value={tab}
        onChange={setTab}
      />

      {/* ------------------------------------------------------------ claim tab */}
      {tab === 0 && (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 520px', minWidth: 420 }}>
            <SectionCard title="Claim">
              <TraceNote workflow="WF-S07-01 / Steps 1–3 — buyer, cause, contract, shipments, description and correspondence" />
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
                <ReadOnlyField label="Buyer" value={claim.buyer} />
                <ReadOnlyField label="Date raised" value={claim.dateRaised} />
                <ReadOnlyField label="Cause category" value={claim.cause} />
                <ReadOnlyField label="Claim type" value={claim.type} />
                <ReadOnlyField label="Contract" value={claim.contract} />
                <ReadOnlyField
                  label="Shipment(s)"
                  value={claim.shipments.length ? claim.shipments.join(', ') : (
                    <Chip size="small" label="No shipment linked" sx={{ height: 18, bgcolor: '#FDECEA', color: COLORS.bad }} />
                  )}
                />
                <ReadOnlyField label="Commodity · destination" value={contract ? `${contract.commodity} · ${contract.destination}` : '—'} />
                <ReadOnlyField label="Registered by · on" value={`${claim.registeredBy} · ${claim.registeredOn}`} />
              </Box>
              <Box sx={{ mt: 1.5 }}>
                <ReadOnlyField label="Description of the issue" value={claim.description} />
              </Box>
              {claim.shipments.length === 0 && (
                <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                  This claim carries no linked shipment, so it is <b>excluded from the claim-rate denominator</b> and
                  the report states how many claims are excluded. Link a shipment when the buyer identifies it.
                </Alert>
              )}
            </SectionCard>

            <SectionCard title="What is not on this screen, and why">
              <Table size="small">
                <TableBody>
                  {[
                    ['Investigation task list', 'The operation team investigates offline. COTS records the conclusion.'],
                    ['Assignment and chase controls', 'Not required — the investigation is not tracked in the system.'],
                    ['Evidence-request tracking', 'Correspondence is attached through C7; requests are not workflowed.'],
                    ['Root-cause form', 'Root cause is discussed from the claims-by-cause report with quality and operations.'],
                  ].map((r) => (
                    <TableRow key={r[0]}>
                      <TableCell sx={{ fontWeight: 600, width: 260 }}>{r[0]}</TableCell>
                      <TableCell sx={{ color: COLORS.textSecondary }}>{r[1]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SectionCard>
          </Box>

          <Box sx={{ flex: '1 1 380px', minWidth: 340 }}>
            <SectionCard title="Linked records">
              <TraceNote workflow="WF-S07-01 / Steps 2, 4, 6 — the contract, the shipments, the quality record and any related insurance case, as separate linked records" />
              <LinkedRecordsPanel
                rows={[
                  { label: 'Contract', value: claim.contract, note: 'The claim is recorded against the contract' },
                  ...(claim.shipments.length
                    ? [{ label: 'Shipment(s)', value: claim.shipments.join(', '), note: 'Delivered consignment(s) concerned' }]
                    : []),
                  ...(claim.qualityRecord
                    ? [{
                        label: 'S03 quality record', value: claim.qualityRecord, to: claim.qualityRoute,
                        note: 'The quality evidence. The investigation stays in S03',
                      }]
                    : []),
                  ...(claim.originatingFeedback
                    ? [{
                        label: 'S09 feedback', value: claim.originatingFeedback, to: '/s09',
                        note: 'The complaint that carried the financial demand — linked but distinct',
                      }]
                    : []),
                  ...(claim.relatedInsuranceCase
                    ? [{
                        label: 'S04 insurance case', value: claim.relatedInsuranceCase, to: claim.relatedInsuranceRoute,
                        note: 'Same consignment, different counterparty — linked, never merged',
                      }]
                    : []),
                ]}
              />
              {claim.originatingFeedback && (
                <HandOffBanner
                  to="S09 CRM and Customer Feedback"
                  passes="the feedback reference this claim arose from"
                  returns="the claim reference, held against the feedback record"
                  resumes="The feedback, any quality non-conformity and this claim remain three linked but separate records"
                  linkLabel="Open the feedback record (stub)"
                  linkTo="/s09"
                />
              )}
            </SectionCard>

            <SectionCard title="Documents and correspondence (C7)">
              {claim.documents.map((d) => (
                <Typography key={d} variant="body2" sx={{ color: COLORS.primary }}>· {d}</Typography>
              ))}
            </SectionCard>
          </Box>
        </Box>
      )}

      {/* ------------------------------------------- valuation and approval tab */}
      {tab === 1 && (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* S07-SC-07 */}
          <Box sx={{ flex: '1 1 520px', minWidth: 420 }}>
            <SectionCard title="S07-SC-07 · Valuation and conclusion">
              <TraceNote workflow="WF-S07-02 / Steps 1–2 — the claim value and currency, and the conclusion the operation team reached offline" />

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 1 }}>
                <Box>
                  <RequiredLabel label="Claim value" required />
                  <TextField
                    size="small" fullWidth type="number" sx={{ mt: 0.5 }}
                    value={claim.claimValue || ''}
                    disabled={locked}
                    onChange={(e) => updateClaim(claim.id, { claimValue: Number(e.target.value) })}
                  />
                </Box>
                <ReadOnlyField label="Currency" value={claim.currency} />
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Value basis, where the buyer states one</Typography>
                <TextField
                  size="small" fullWidth sx={{ mt: 0.5 }}
                  value={claim.valueBasis} disabled={locked}
                  onChange={(e) => updateClaim(claim.id, { valueBasis: e.target.value })}
                />
              </Box>

              <Box sx={{ mt: 2 }}>
                <RequiredLabel label="Investigation conclusion" required />
                <TextField
                  size="small" fullWidth multiline minRows={3} sx={{ mt: 0.5 }}
                  value={claim.conclusion} disabled={locked}
                  onChange={(e) => updateClaim(claim.id, {
                    conclusion: e.target.value,
                    concludedBy: 'Execution — M. Yousif',
                    concludedOn: '19-Aug-2026',
                  })}
                  placeholder="The conclusion the operation team reached."
                />
                <Alert severity="info" sx={{ mt: 1, fontSize: '0.8rem' }}>
                  <b>One field, on purpose.</b> The operation team investigates and tracks the claim offline. COTS
                  records the conclusion reached, not the investigation. Attach the supporting correspondence and
                  reports to the documents tab.
                </Alert>
                {claim.concludedBy && (
                  <ReadOnlyField label="Concluded by · on" value={`${claim.concludedBy} · ${claim.concludedOn}`} />
                )}
              </Box>

              <Box sx={{ mt: 2, maxWidth: 260 }}>
                <RequiredLabel label="Amount recommended for acceptance" required />
                <TextField
                  size="small" fullWidth type="number" sx={{ mt: 0.5 }}
                  value={claim.recommended || ''} disabled={locked}
                  onChange={(e) => updateClaim(claim.id, { recommended: Number(e.target.value) })}
                />
              </Box>

              {locked && (
                <Alert severity="info" sx={{ mt: 2, fontSize: '0.8rem' }}>
                  The valuation is <b>read-only once the claim has been submitted</b>, so the amount approved is
                  demonstrably the amount that was put in front of the approver.
                </Alert>
              )}
            </SectionCard>
          </Box>

          {/* S07-SC-08 */}
          <Box sx={{ flex: '1 1 400px', minWidth: 360 }}>
            <SectionCard title="S07-SC-08 · Approval">
              <TraceNote workflow="WF-S07-02 / Steps 3–5 — routed through C4 on the configured claims route, with the justification recorded as part of the approval" />

              {!claim.approval && (
                <>
                  <RequirementChecklist rows={SUBMISSION_REQUIREMENTS(claim)} />

                  <Box sx={{ mt: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>
                      CONFIGURED CLAIMS ROUTE
                    </Typography>
                    <Table size="small">
                      <TableBody>
                        {APPROVAL_BANDS.map((b) => (
                          <TableRow key={b.band} selected={b.band === band.band}>
                            <TableCell>{b.band}</TableCell>
                            <TableCell sx={{ fontWeight: b.band === band.band ? 700 : 400 }}>{b.role}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mt: 0.5 }}>
                      On the recommended amount of {money(claim.recommended, claim.currency)}, this claim routes to{' '}
                      <b>{band.role}</b>.
                    </Typography>
                  </Box>

                  <BusinessConfirmation>
                    Confirm the approval thresholds for claims and who holds final authority to accept a claim value.
                    <PrototypeNote>
                      the bands above are placeholders and the top band reads "to be confirmed" rather than naming a
                      role the business has not named.
                    </PrototypeNote>
                  </BusinessConfirmation>

                  {claim.state === 'Submitted for approval' ? (
                    <>
                      <Alert severity="warning" sx={{ mt: 1, fontSize: '0.8rem' }}>
                        Submitted for approval on 19-Aug-2026. Awaiting <b>{band.role}</b>.
                      </Alert>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Button
                          size="small" variant="contained"
                          onClick={() => { setApprovedAmount(claim.recommended); setJustification(''); setDecideOpen('Approved'); }}
                        >
                          PROTOTYPE — approve as {band.role}
                        </Button>
                        <Button
                          size="small" variant="outlined" color="error"
                          onClick={() => { setJustification(''); setDecideOpen('Rejected'); }}
                        >
                          PROTOTYPE — reject
                        </Button>
                      </Stack>
                      <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mt: 0.5 }}>
                        C4 approval is simulated here so the decision and its justification can be seen. Not
                        production functionality.
                      </Typography>
                    </>
                  ) : (
                    <>
                      <Tooltip title={outstanding.length ? outstanding.map((o) => o.item).join(' · ') : ''}>
                        <span>
                          <Button
                            variant="contained" sx={{ mt: 1.5 }}
                            disabled={outstanding.length > 0}
                            onClick={() => { submit(claim.id); say(`Claim ${claim.id} submitted for approval to ${band.role}.`); }}
                          >
                            Submit for approval
                          </Button>
                        </span>
                      </Tooltip>
                      {outstanding.length > 0 && (
                        <Alert severity="warning" sx={{ mt: 1, fontSize: '0.8rem' }}>
                          <b>Submission is blocked. Outstanding:</b>
                          <Box component="ul" sx={{ pl: 2, m: 0.5 }}>
                            {outstanding.map((o) => <li key={o.item}>{o.item} — {o.note}</li>)}
                          </Box>
                        </Alert>
                      )}
                    </>
                  )}
                </>
              )}

              {claim.approval && (
                <>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, width: 150 }}>Decision</TableCell>
                        <TableCell>
                          <Chip
                            size="small" label={claim.approval.decision}
                            sx={{ height: 20, color: '#fff', fontWeight: 700, bgcolor: claim.approval.decision === 'Approved' ? COLORS.good : COLORS.bad }}
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow><TableCell sx={{ fontWeight: 600 }}>Approver</TableCell><TableCell>{claim.approval.approver}</TableCell></TableRow>
                      <TableRow><TableCell sx={{ fontWeight: 600 }}>Date</TableCell><TableCell>{claim.approval.date}</TableCell></TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Amount claimed · recommended · approved</TableCell>
                        <TableCell>
                          {money(claim.claimValue, claim.currency)} · {money(claim.recommended, claim.currency)} ·{' '}
                          <b>{money(claim.approval.approvedAmount, claim.currency)}</b>
                          {claim.approval.decision === 'Approved' && claim.approval.approvedAmount !== claim.recommended && (
                            <Typography variant="caption" sx={{ display: 'block', color: COLORS.attention }}>
                              The approved amount differs from the recommendation by{' '}
                              {money(Math.abs(claim.recommended - claim.approval.approvedAmount), claim.currency)}.
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Justification</TableCell>
                        <TableCell>{claim.approval.justification}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                    The justification is captured <b>as part of the approval</b>, not held as free correspondence, and
                    the approver, decision, amount and date are audited through Core C8.
                  </Alert>
                  {claim.approval.decision === 'Rejected' && (
                    <Alert severity="warning" sx={{ mt: 1, fontSize: '0.8rem' }}>
                      Rejected claims proceed to closure <b>without settlement</b> — a distinct state from settled.
                      The claim is retained and is <b>still counted in the claim rate</b>, because the buyer still
                      raised it.
                    </Alert>
                  )}
                </>
              )}
            </SectionCard>
          </Box>
        </Box>
      )}

      {/* ------------------------------------------------------ settlement tab */}
      {tab === 2 && (
        <Box sx={{ maxWidth: 780 }}>
          <SectionCard title="S07-SC-09 · Settlement and closure">
            <TraceNote workflow="WF-S07-03 / Steps 1–2 — the settlement outcome, the settled amount and the credit note reference; closure with the record retained" />

            {!claim.approval ? (
              <Alert severity="info" sx={{ fontSize: '0.85rem' }}>
                Settlement is recorded after the claim has been approved. This claim is <b>{claim.state}</b>.
              </Alert>
            ) : (
              <>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 1 }}>
                  <Box>
                    <RequiredLabel label="Settlement outcome" required />
                    <Select
                      size="small" fullWidth displayEmpty sx={{ mt: 0.5 }}
                      value={claim.settlementOutcome ?? ''} disabled={closed}
                      onChange={(e) => updateClaim(claim.id, { settlementOutcome: e.target.value as any })}
                    >
                      <MenuItem value=""><em>Not recorded</em></MenuItem>
                      <MenuItem value="Settled in full">Settled in full</MenuItem>
                      <MenuItem value="Settled in part">Settled in part</MenuItem>
                      <MenuItem value="Closed without settlement">Closed without settlement</MenuItem>
                    </Select>
                  </Box>
                  <Box>
                    <RequiredLabel
                      label="Settled amount"
                      required={claim.settlementOutcome !== 'Closed without settlement'}
                    />
                    <TextField
                      size="small" fullWidth type="number" sx={{ mt: 0.5 }}
                      value={claim.settledAmount ?? ''} disabled={closed || claim.settlementOutcome === 'Closed without settlement'}
                      onChange={(e) => updateClaim(claim.id, { settledAmount: Number(e.target.value) })}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Credit note reference, where one is issued</Typography>
                    <TextField
                      size="small" fullWidth sx={{ mt: 0.5 }}
                      value={claim.creditNote ?? ''} disabled={closed}
                      onChange={(e) => updateClaim(claim.id, { creditNote: e.target.value })}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Settlement date</Typography>
                    <TextField
                      size="small" fullWidth sx={{ mt: 0.5 }}
                      value={claim.settlementDate ?? ''} disabled={closed}
                      onChange={(e) => updateClaim(claim.id, { settlementDate: e.target.value })}
                    />
                  </Box>
                  <Box>
                    <RequiredLabel label="Closure date" required />
                    <TextField
                      size="small" fullWidth sx={{ mt: 0.5 }}
                      value={claim.closureDate ?? ''} disabled={closed}
                      onChange={(e) => updateClaim(claim.id, { closureDate: e.target.value })}
                    />
                  </Box>
                </Box>

                <Box sx={{ mt: 2 }}>
                  <ReadOnlyField
                    label="Approved against settled"
                    value={
                      <>
                        Approved {money(claim.approval.approvedAmount, claim.currency)} · Settled{' '}
                        {money(claim.settledAmount ?? 0, claim.currency)} ·{' '}
                        {(claim.settledAmount ?? 0) === claim.approval.approvedAmount
                          ? 'No difference'
                          : `Difference ${money(Math.abs(claim.approval.approvedAmount - (claim.settledAmount ?? 0)), claim.currency)}`}
                      </>
                    }
                  />
                </Box>

                <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                  <b>Settlement is a record, not a payment.</b> COTS records the settlement and the credit note
                  reference; the credit note itself and the accounting entry are raised in the finance system — the
                  same treatment as the S06 sales invoice, where COTS holds the reference and not the document.
                </Alert>

                {!closed ? (
                  <>
                    <Tooltip title={closureOutstanding.length ? closureOutstanding.join(' ') : ''}>
                      <span>
                        <Button
                          variant="contained" sx={{ mt: 1.5 }}
                          disabled={closureOutstanding.length > 0}
                          onClick={() => {
                            close(claim.id, {});
                            say(`Claim ${claim.id} closed. Documents, approval history and the settlement record are retained.`);
                          }}
                        >
                          Close the claim
                        </Button>
                      </span>
                    </Tooltip>
                    {closureOutstanding.length > 0 && (
                      <Alert severity="warning" sx={{ mt: 1, fontSize: '0.8rem' }}>
                        <b>Closure is blocked:</b>
                        <Box component="ul" sx={{ pl: 2, m: 0.5 }}>
                          {closureOutstanding.map((o) => <li key={o}>{o}</li>)}
                        </Box>
                      </Alert>
                    )}
                  </>
                ) : (
                  <Alert severity="success" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                    Closed on {claim.closureDate}. The claim is <b>read-only</b>. {claim.documents.length} documents,
                    the full approval history and the settlement record are retained through C7 and C8. The claim
                    remains visible on the contract and in the reporting — nothing is archived out of sight.
                  </Alert>
                )}
              </>
            )}
          </SectionCard>
        </Box>
      )}

      {/* ----------------------------------------------------- documents tab */}
      {tab === 3 && (
        <SectionCard title="Documents and correspondence (Core C7)">
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Document', 'Type', 'Attached by', 'On'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {claim.documents.map((d) => (
                <TableRow key={d}>
                  <TableCell sx={{ color: COLORS.primary }}>{d}</TableCell>
                  <TableCell>Claim correspondence</TableCell>
                  <TableCell>{claim.registeredBy}</TableCell>
                  <TableCell>{claim.registeredOn}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PrototypeNote>Document storage is Core C7. No file is actually stored in the prototype.</PrototypeNote>
        </SectionCard>
      )}

      {/* ------------------------------------------------------- history tab */}
      {tab === 4 && (
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
                [claim.registeredOn, claim.registeredBy, `Claim registered against contract ${claim.contract}`],
                ...(claim.concludedOn ? [[claim.concludedOn, claim.concludedBy, 'Investigation conclusion recorded']] : []),
                ...(claim.approval ? [[claim.approval.date, claim.approval.approver, `${claim.approval.decision} — ${money(claim.approval.approvedAmount, claim.currency)}`]] : []),
                ...(claim.settlementDate ? [[claim.settlementDate, 'Commercial — H. Osman', `Settlement recorded${claim.creditNote ? ` · credit note ${claim.creditNote}` : ''}`]] : []),
                ...(claim.closureDate ? [[claim.closureDate, 'Commercial — H. Osman', 'Claim closed']] : []),
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
        <Button variant="outlined" onClick={() => nav('/s07')}>Back to the claim register</Button>
        <Button variant="outlined" component={Link} to="/s07/exposure">Contract exposure</Button>
      </BottomBar>

      {/* approval decision dialog */}
      <Dialog open={!!decideOpen} onClose={() => setDecideOpen(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{decideOpen === 'Approved' ? 'Approve the claim' : 'Reject the claim'}</DialogTitle>
        <DialogContent>
          <TraceNote workflow="WF-S07-02 / Step 4 — the justification for the decision is recorded as part of the approval rather than held as free correspondence" />
          {decideOpen === 'Approved' && (
            <Box sx={{ mt: 1, maxWidth: 260 }}>
              <RequiredLabel label="Approved amount" required />
              <TextField
                size="small" fullWidth type="number" sx={{ mt: 0.5 }}
                value={approvedAmount || ''} onChange={(e) => setApprovedAmount(Number(e.target.value))}
              />
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                May differ from the recommended {money(claim.recommended, claim.currency)}; the difference is shown on
                the record.
              </Typography>
            </Box>
          )}
          <Box sx={{ mt: 2 }}>
            <RequiredLabel label="Justification" required />
            <TextField
              size="small" fullWidth multiline minRows={3} sx={{ mt: 0.5 }}
              value={justification} onChange={(e) => setJustification(e.target.value)}
              placeholder="Why this decision was reached."
            />
            <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
              Mandatory on both approval and rejection.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDecideOpen(null)}>Cancel</Button>
          <Tooltip title={!justification ? 'The justification is mandatory on both decisions.' : ''}>
            <span>
              <Button
                variant="contained" disabled={!justification || (decideOpen === 'Approved' && !approvedAmount)}
                onClick={() => {
                  decide(claim.id, decideOpen!, justification, approvedAmount);
                  say(
                    decideOpen === 'Approved'
                      ? `Claim ${claim.id} approved at ${money(approvedAmount, claim.currency)}.`
                      : `Claim ${claim.id} rejected. Closed without settlement, and still counted in the claim rate.`,
                  );
                  setDecideOpen(null);
                }}
              >
                Record the decision
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
