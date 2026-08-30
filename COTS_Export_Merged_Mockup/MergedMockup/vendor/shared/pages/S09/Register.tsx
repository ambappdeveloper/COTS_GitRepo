import React from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, FormControlLabel, MenuItem, Radio, RadioGroup, Select, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { DataTable, type Column } from '../../components/DataTable';
import {
  BottomBar, BusinessConfirmation, EmptyState, PrototypeNote, ReadOnlyField, RequiredLabel, SectionCard,
  TraceNote,
} from '../../components/shared';
import { useStore } from '../../state/store';
import { routeFor, useS09 } from '../../state/s09store';
import {
  CHANNELS, FEEDBACK_CONTRACTS, QUESTION_SET, indicatorScores, scoreOf, type Feedback,
} from '../../mockData/s09';
import { COLORS } from '../../theme';

/** Every screen in a proposal-stage module carries the marker, not just the landing page. */
export function ProposalBanner() {
  return (
    <Box
      sx={{
        border: `1px dashed ${COLORS.attention}`, bgcolor: '#FFF7ED', borderRadius: 1,
        px: 1.5, py: 1, mb: 2,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Chip size="small" label="PROPOSAL" sx={{ height: 20, bgcolor: COLORS.attention, color: '#fff', fontWeight: 700 }} />
        <Typography variant="caption" sx={{ color: COLORS.textPrimary, fontWeight: 600 }}>
          S9 is at proposal stage. The business asked IT to provide the questions and indicators and to prepare a
          proposal for discussion — so this module is a proposal to be adopted or changed, not a process being
          reproduced.
        </Typography>
      </Stack>
    </Box>
  );
}

export const stateColour = (s: string) =>
  s === 'Resolved' ? COLORS.good : s === 'Response recorded' ? COLORS.progress : s === 'Routed' ? COLORS.attention : COLORS.draft;

const daysBetween = (from: string, to: string) => {
  const d = (s: string) => new Date(s.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1, $3')).getTime();
  return Math.round((d(to) - d(from)) / 864e5);
};

/* ==================================================== S09-SC-01 register */

export default function FeedbackRegister() {
  const { country } = useStore();
  const { feedback, contracts, coverageBasis } = useS09();
  const nav = useNavigate();

  const complaints = feedback.filter((f) => f.satisfaction === 'Complaint');
  const openComplaints = complaints.filter((f) => f.state !== 'Resolved');
  const resolved = complaints.filter((f) => f.resolutionDate);
  const avgResolution = resolved.length
    ? (resolved.reduce((s, f) => s + daysBetween(f.dateObtained, f.resolutionDate!), 0) / resolved.length).toFixed(1)
    : '—';
  const avgScore = feedback.length ? (feedback.reduce((s, f) => s + scoreOf(f), 0) / feedback.length).toFixed(2) : '—';
  const withFeedback = new Set(feedback.map((f) => f.contract)).size;

  const columns: Column<Feedback>[] = [
    {
      key: 'id', label: 'Feedback', filterable: true,
      render: (r) => (
        <Box component="span" onClick={() => nav(`/s09/feedback/${r.id}`)} sx={{ color: COLORS.primary, fontWeight: 600, cursor: 'pointer' }}>
          {r.id}
        </Box>
      ),
      value: (r) => r.id,
    },
    { key: 'customer', label: 'Customer', filterable: true, value: (r) => r.customer },
    { key: 'contract', label: 'Contract', filterable: true, value: (r) => r.contract },
    {
      key: 'commodity', label: 'Commodity · destination',
      render: (r) => {
        const c = FEEDBACK_CONTRACTS.find((x) => x.id === r.contract);
        return c ? `${c.commodity} · ${c.destination}` : '—';
      },
      value: (r) => FEEDBACK_CONTRACTS.find((x) => x.id === r.contract)?.commodity ?? '',
    },
    { key: 'dateObtained', label: 'Date obtained', value: (r) => r.dateObtained },
    { key: 'obtainedBy', label: 'Obtained by', filterable: true, value: (r) => r.obtainedBy },
    { key: 'channel', label: 'Channel', filterable: true, value: (r) => r.channel },
    {
      key: 'satisfaction', label: 'Satisfaction / complaint', filterable: true,
      render: (r) => (
        <Chip
          size="small" label={r.satisfaction}
          sx={{ height: 20, color: '#fff', fontWeight: 600, bgcolor: r.satisfaction === 'Complaint' ? COLORS.bad : COLORS.good }}
        />
      ),
      value: (r) => r.satisfaction,
    },
    { key: 'subject', label: 'Service / commodity', filterable: true, value: (r) => r.subject },
    { key: 'score', label: 'Score', align: 'right', render: (r) => `${scoreOf(r).toFixed(1)} / 5`, value: (r) => scoreOf(r) },
    { key: 'assignedArea', label: 'Assigned area', render: (r) => r.assignedArea ?? '—', value: (r) => r.assignedArea ?? '' },
    {
      key: 'linked', label: 'Linked records',
      render: (r) => (
        <Stack direction="row" spacing={0.5}>
          {r.nonConformity && <Link to={r.nonConformityRoute ?? '/s03/ncs'} style={{ color: COLORS.primary }}>{r.nonConformity}</Link>}
          {r.claim && <Link to={r.claimRoute ?? '/s07'} style={{ color: COLORS.primary }}>{r.claim}</Link>}
          {!r.nonConformity && !r.claim && <span>—</span>}
        </Stack>
      ),
      value: (r) => [r.nonConformity, r.claim].filter(Boolean).join(' '),
    },
    {
      key: 'state', label: 'State', filterable: true,
      render: (r) => <Chip size="small" label={r.state} sx={{ height: 20, color: '#fff', bgcolor: stateColour(r.state), fontWeight: 600 }} />,
      value: (r) => r.state,
    },
    {
      key: 'resolution', label: 'Resolution time', align: 'right',
      render: (r) => (r.resolutionDate ? `${daysBetween(r.dateObtained, r.resolutionDate)} days` : '—'),
      value: (r) => (r.resolutionDate ? daysBetween(r.dateObtained, r.resolutionDate) : 0),
    },
  ];

  return (
    <AppShell title="CRM and Customer Feedback" breadcrumb={[country, 'Shared Modules', 'CRM and Customer Feedback']} showSeason={false}>
      <ProposalBanner />

      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>
          FEEDBACK POSITION FOR THE PERIOD
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
          {[
            { k: 'Feedback recorded', v: String(feedback.length), n: `${feedback.length} records` },
            { k: 'Satisfaction average', v: `${avgScore} / 5`, n: `From ${feedback.length} responses — a small sample` },
            { k: 'Complaints open', v: String(openComplaints.length), n: `${complaints.length} complaints in total` },
            { k: 'Average resolution', v: `${avgResolution} days`, n: `${resolved.length} resolved complaints` },
            {
              k: 'Coverage',
              v: `${withFeedback} / ${contracts.length}`,
              n: `Contracts with feedback. Meaning depends on the unresolved basis — currently read as "${coverageBasis}"`,
            },
          ].map((c) => (
            <Box key={c.k} sx={{ border: `1px solid ${COLORS.border}`, bgcolor: '#fff', borderRadius: 1, px: 1.5, py: 1, minWidth: 190, flex: '1 1 190px' }}>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary, fontWeight: 700 }}>{c.k}</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.primary, lineHeight: 1.2 }}>{c.v}</Typography>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>{c.n}</Typography>
            </Box>
          ))}
        </Stack>
      </Box>

      <SectionCard title="S09-SC-01 · Feedback register">
        <TraceNote workflow="WF-S09-01 / Step 1 — feedback obtained from the final customer and recorded by the trader" />
        <DataTable
          columns={columns}
          rows={feedback}
          onNew={() => nav('/s09/capture')}
          newLabel="Log feedback"
          toolbarNote="Group by customer, commodity or classification. Both classification dimensions are shown, because the corrective route differs."
        />
      </SectionCard>

      <BottomBar>
        <Button variant="contained" component={Link} to="/s09/capture">Log feedback</Button>
        <Button variant="outlined" component={Link} to="/s09/satisfaction">Satisfaction dashboard</Button>
        <Button variant="outlined" component={Link} to="/s09/coverage">Feedback coverage</Button>
        <Button variant="outlined" component={Link} to="/s09/reports">Reporting</Button>
      </BottomBar>
    </AppShell>
  );
}

/* ===================================================== S09-SC-02 capture */

export function FeedbackCapture() {
  const { country, say } = useStore();
  const { feedback, addFeedback } = useS09();
  const nav = useNavigate();

  const [contract, setContract] = React.useState('');
  const [dateObtained, setDateObtained] = React.useState('19-Aug-2026');
  const [channel, setChannel] = React.useState('');
  const [responses, setResponses] = React.useState<Record<string, string>>({});
  const [satisfaction, setSatisfaction] = React.useState<'Satisfaction' | 'Complaint' | ''>('');
  const [subject, setSubject] = React.useState<'Service' | 'Commodity' | ''>('');
  const [narrative, setNarrative] = React.useState('');
  const [demand, setDemand] = React.useState(false);
  const [demandNote, setDemandNote] = React.useState('');
  const [showConfig, setShowConfig] = React.useState(false);

  const contractRec = FEEDBACK_CONTRACTS.find((c) => c.id === contract);
  const answered = QUESTION_SET.filter((q) => responses[q.id]).length;
  const draft: Feedback = {
    id: 'draft', contract, customer: contractRec?.customer ?? '', dateObtained,
    obtainedBy: 'Trader — A. Bakri', channel, responses, satisfaction, subject, narrative,
    financialDemand: demand, state: 'Recorded',
  };
  const score = scoreOf(draft);

  const blocking: string[] = [];
  if (!contract) blocking.push('The feedback must be linked to a contract — that is what makes it actionable rather than anecdotal.');
  if (!channel) blocking.push('The channel the feedback was obtained through is required.');
  if (answered < QUESTION_SET.length) {
    blocking.push(
      `All ${QUESTION_SET.length} defined questions must be answered (${answered} answered). Narrative comments are captured in addition to the defined responses, never instead of them — comparability over time is the point of the question set.`,
    );
  }
  if (!satisfaction) blocking.push('Dimension one — satisfaction or complaint — must be chosen. There is no default, because the corrective route differs.');
  if (!subject) blocking.push('Dimension two — service or commodity — must be chosen. There is no default, because the corrective route differs.');
  if (satisfaction === 'Complaint' && demand && !demandNote) blocking.push('Describe the financial demand the customer is making.');

  const previewRoute = routeFor(satisfaction, subject, narrative);

  const onSave = () => {
    const id = `FB-0${234 + feedback.length}`;
    const area = previewRoute || undefined;
    addFeedback({
      ...draft,
      id,
      financialDemandNote: demand ? demandNote : undefined,
      assignedArea: area,
      routedOn: area ? '19-Aug-2026' : undefined,
      state: area ? 'Routed' : 'Recorded',
    });
    say(
      satisfaction === 'Complaint'
        ? `Feedback ${id} recorded and routed to ${area}.`
        : `Feedback ${id} recorded against contract ${contract}.`,
    );
    nav(`/s09/feedback/${id}`);
  };

  const earlier = feedback.filter((f) => f.contract === contract);

  return (
    <AppShell title="Log customer feedback" breadcrumb={[country, 'Shared Modules', 'CRM and Customer Feedback', 'Log feedback']} showSeason={false}>
      <ProposalBanner />

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 560px', minWidth: 440 }}>
          <SectionCard title="S09-SC-02 · Feedback">
            <TraceNote workflow="WF-S09-01 / Step 1 — the customer, the date, the person who obtained it and the channel" />

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 1 }}>
              <Box>
                <RequiredLabel label="Contract" required />
                <Select size="small" fullWidth displayEmpty value={contract} onChange={(e) => setContract(e.target.value)} sx={{ mt: 0.5 }}>
                  <MenuItem value=""><em>Select the delivered contract</em></MenuItem>
                  {FEEDBACK_CONTRACTS.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.id} · {c.customer} · delivered {c.delivered}</MenuItem>
                  ))}
                </Select>
              </Box>
              <ReadOnlyField label="Customer (from the contract)" value={contractRec?.customer ?? '—'} />
              <Box>
                <RequiredLabel label="Date obtained" required />
                <TextField size="small" fullWidth sx={{ mt: 0.5 }} value={dateObtained} onChange={(e) => setDateObtained(e.target.value)} />
              </Box>
              <Box>
                <RequiredLabel label="Channel" required />
                <Select size="small" fullWidth displayEmpty value={channel} onChange={(e) => setChannel(e.target.value)} sx={{ mt: 0.5 }}>
                  <MenuItem value=""><em>Select</em></MenuItem>
                  {CHANNELS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </Box>
            </Box>

            <Box sx={{ mt: 2 }}>
              <ReadOnlyField label="Obtained by" value="Trader — A. Bakri" />
              <Alert severity="info" sx={{ mt: 1, fontSize: '0.8rem' }}>
                Feedback is obtained from the final customer and recorded <b>by the trader</b> — that is the only route
                built. If customers were ever to enter feedback themselves, this would need an external access route,
                an identity model for customer users and a channel value of <i>customer portal</i>.
              </Alert>
              <BusinessConfirmation>
                Confirm that the proposed CRM and Customer Feedback workflow and scope are approved by the business,
                and whether the customer ever enters feedback directly through external access rather than always
                through the trader.
              </BusinessConfirmation>
            </Box>
          </SectionCard>

          {/* ------------------------------------------ S09-SC-03 question set */}
          <SectionCard
            title="S09-SC-03 · Question set and indicators"
            right={
              <Button size="small" onClick={() => setShowConfig(!showConfig)}>
                {showConfig ? 'Hide the configuration view' : 'Show the configuration view'}
              </Button>
            }
          >
            <TraceNote workflow="WF-S09-01 / Step 2 — captured against the defined question set so responses are comparable over time; narrative in addition, not instead" />

            <BusinessConfirmation>
              Provide and approve the CRM feedback questions and satisfaction indicators.
              <PrototypeNote>
                the {QUESTION_SET.length} questions below are a <b>labelled draft proposal</b> and are rendered from
                configuration, not hard-wired. Replacing the set replaces the form without touching the screens.
              </PrototypeNote>
            </BusinessConfirmation>

            {showConfig && (
              <Box sx={{ border: `1px dashed ${COLORS.attention}`, borderRadius: 1, p: 1.5, mb: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.attention }}>
                  PROTOTYPE — QUESTIONS ARE DATA, NOT A FIXED FORM
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['#', 'Question', 'Response type', 'Indicator', 'Weight'].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {QUESTION_SET.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell>{q.id}</TableCell>
                        <TableCell>{q.text}</TableCell>
                        <TableCell>{q.type}</TableCell>
                        <TableCell>{q.indicator}</TableCell>
                        <TableCell align="right">{q.weight} %</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                  The indicator mapping is shown so the aggregation on the satisfaction dashboard is traceable back to
                  the questions that produced it. Not production functionality.
                </Typography>
              </Box>
            )}

            {QUESTION_SET.map((q) => (
              <Box key={q.id} sx={{ mb: 1.5 }}>
                <RequiredLabel label={`${q.id} · ${q.text}`} required />
                {q.type === 'Yes / No' ? (
                  <RadioGroup row value={responses[q.id] ?? ''} onChange={(e) => setResponses({ ...responses, [q.id]: e.target.value })}>
                    <FormControlLabel value="Yes" control={<Radio size="small" />} label="Yes" />
                    <FormControlLabel value="No" control={<Radio size="small" />} label="No" />
                  </RadioGroup>
                ) : (
                  <RadioGroup row value={responses[q.id] ?? ''} onChange={(e) => setResponses({ ...responses, [q.id]: e.target.value })}>
                    {['1', '2', '3', '4', '5'].map((n) => (
                      <FormControlLabel key={n} value={n} control={<Radio size="small" />} label={n} />
                    ))}
                  </RadioGroup>
                )}
                <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                  {q.type} · feeds the {q.indicator} indicator at {q.weight} %
                </Typography>
              </Box>
            ))}

            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                Narrative comments — <b>in addition to</b> the defined responses
              </Typography>
              <TextField
                size="small" fullWidth multiline minRows={2} sx={{ mt: 0.5 }}
                value={narrative} onChange={(e) => setNarrative(e.target.value)}
                placeholder="What the customer said in their own words."
              />
            </Box>

            <Alert severity={answered === QUESTION_SET.length ? 'success' : 'warning'} sx={{ mt: 1.5, fontSize: '0.8rem' }}>
              {answered} of {QUESTION_SET.length} questions answered.{' '}
              {answered === QUESTION_SET.length
                ? `Overall score ${score.toFixed(2)} / 5.`
                : 'Saving with narrative but incomplete responses is blocked — comparability over time is the point of the question set.'}
            </Alert>
          </SectionCard>
        </Box>

        <Box sx={{ flex: '1 1 400px', minWidth: 360 }}>
          {/* ------------------------------------- S09-SC-04 classification */}
          <SectionCard title="S09-SC-04 · Classification">
            <TraceNote workflow="WF-S09-01 / Step 3 — classified on two dimensions, because the corrective route differs" />

            <Box sx={{ mt: 1 }}>
              <RequiredLabel label="Dimension one — satisfaction or complaint" required />
              <RadioGroup row value={satisfaction} onChange={(e) => setSatisfaction(e.target.value as any)}>
                <FormControlLabel value="Satisfaction" control={<Radio size="small" />} label="Satisfaction" />
                <FormControlLabel value="Complaint" control={<Radio size="small" />} label="Complaint" />
              </RadioGroup>
            </Box>

            <Box sx={{ mt: 1 }}>
              <RequiredLabel label="Dimension two — service or commodity" required />
              <RadioGroup row value={subject} onChange={(e) => setSubject(e.target.value as any)}>
                <FormControlLabel value="Service" control={<Radio size="small" />} label="Service" />
                <FormControlLabel value="Commodity" control={<Radio size="small" />} label="Commodity" />
              </RadioGroup>
            </Box>

            <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary }}>
              Neither dimension is defaulted. A defaulted classification would silently choose someone else's
              corrective route.
            </Typography>

            {satisfaction === 'Complaint' && (
              <Box sx={{ mt: 1.5 }}>
                <FormControlLabel
                  control={<Checkbox size="small" checked={demand} onChange={(e) => setDemand(e.target.checked)} />}
                  label={<Typography variant="body2">The customer is making a financial demand</Typography>}
                />
                {demand && (
                  <Box>
                    <RequiredLabel label="What is being demanded" required />
                    <TextField
                      size="small" fullWidth sx={{ mt: 0.5 }}
                      value={demandNote} onChange={(e) => setDemandNote(e.target.value)}
                      placeholder="e.g. reconditioning cost plus handling, approximately USD 15,500"
                    />
                  </Box>
                )}
                <Alert severity="info" sx={{ mt: 1, fontSize: '0.78rem' }}>
                  <b>A complaint is not a claim.</b> Recording a complaint does not create one — only a financial
                  demand does. Collapsing the two would fill the claim register with every dissatisfied remark.
                </Alert>
              </Box>
            )}

            {satisfaction && subject && (
              <Box sx={{ mt: 1.5, border: `1px solid ${COLORS.primary}`, bgcolor: '#F0F8FD', borderRadius: 1, p: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.primaryDark, display: 'block' }}>
                  WHERE THIS CLASSIFICATION WILL SEND THE RECORD
                </Typography>
                {satisfaction === 'Satisfaction' ? (
                  <Typography variant="body2">
                    Satisfaction · {subject} → no routing. The record goes straight to the satisfaction measures.
                  </Typography>
                ) : (
                  <>
                    <Typography variant="body2">
                      Complaint · {subject} → routes to <b>{previewRoute}</b>.
                      {subject === 'Commodity' && ' The relevant S03 quality records are linked, and a non-conformity may be raised there.'}
                    </Typography>
                    {demand && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        The financial demand is registered as a <b>commercial claim in S7</b>. The feedback, any quality
                        non-conformity and the claim remain three linked but separate records.
                      </Typography>
                    )}
                  </>
                )}
                <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                  Shown before saving, so the trader sees the consequence of their classification while they can still
                  change it.
                </Typography>
              </Box>
            )}
          </SectionCard>

          {/* --------------------------------------- S09-SC-05 contract link */}
          <SectionCard title="S09-SC-05 · Contract link">
            <TraceNote workflow="WF-S09-01 / Step 4 — the contract link is the explicit requirement and is what makes the feedback actionable rather than anecdotal" />
            {!contractRec ? (
              <EmptyState text="Select a contract. The link is mandatory — there is no toggle on this rule." />
            ) : (
              <>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
                  <ReadOnlyField label="Customer" value={contractRec.customer} />
                  <ReadOnlyField label="Commodity" value={contractRec.commodity} />
                  <ReadOnlyField label="Destination · country" value={`${contractRec.destination} · ${contractRec.country}`} />
                  <ReadOnlyField label="Incoterm · quantity" value={`${contractRec.incoterm} · ${contractRec.quantityMt.toLocaleString()} MT`} />
                  <ReadOnlyField label="Delivered" value={contractRec.delivered} />
                </Box>
                <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                  This is the one firm rule in a proposal-stage module — the source states the contract link as a
                  requirement, so it is implemented as a hard rule with <b>no configuration toggle</b>.
                </Alert>
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>
                    FEEDBACK ALREADY ON THIS CONTRACT
                  </Typography>
                  {earlier.length === 0 ? (
                    <EmptyState text="No earlier feedback on this contract." />
                  ) : (
                    <Table size="small">
                      <TableBody>
                        {earlier.map((f) => (
                          <TableRow key={f.id}>
                            <TableCell>{f.id}</TableCell>
                            <TableCell>{f.dateObtained}</TableCell>
                            <TableCell>{f.satisfaction} · {f.subject}</TableCell>
                            <TableCell align="right">{scoreOf(f).toFixed(1)} / 5</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary }}>
                    Shown at capture so repeat complaints on one contract are visible rather than discovered later.
                  </Typography>
                </Box>
              </>
            )}
          </SectionCard>

          {answered === QUESTION_SET.length && (
            <SectionCard title="Indicator preview">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Indicator', 'From questions', 'Score'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {indicatorScores(draft).map((i) => (
                    <TableRow key={i.indicator}>
                      <TableCell>{i.indicator}</TableCell>
                      <TableCell>{i.questions}</TableCell>
                      <TableCell align="right">{i.score.toFixed(2)} / 5</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SectionCard>
          )}
        </Box>
      </Box>

      <BottomBar>
        <Tooltip title={blocking.length ? blocking.join(' ') : ''}>
          <span>
            <Button variant="contained" disabled={blocking.length > 0} onClick={onSave}>Save the feedback</Button>
          </span>
        </Tooltip>
        <Button variant="outlined" component={Link} to="/s09">Cancel</Button>
        {blocking.length > 0 && (
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: COLORS.bad, fontWeight: 700 }}>Saving is blocked:</Typography>
            {blocking.map((b) => (
              <Typography key={b} variant="caption" sx={{ display: 'block', color: COLORS.textSecondary }}>· {b}</Typography>
            ))}
          </Box>
        )}
      </BottomBar>
    </AppShell>
  );
}
