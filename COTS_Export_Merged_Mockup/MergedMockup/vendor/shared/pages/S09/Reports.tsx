import React from 'react';
import {
  Alert, Box, Button, Chip, FormControlLabel, Radio, RadioGroup, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, Typography,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { BottomBar, BusinessConfirmation, PrototypeNote, SectionCard, TraceNote } from '../../components/shared';
import { useStore } from '../../state/store';
import { useS09 } from '../../state/s09store';
import {
  FEEDBACK_CONTRACTS, SAMPLE_TARGET_PERCENT, SATISFACTION_TREND, scoreOf, type Feedback,
} from '../../mockData/s09';
import { COLORS } from '../../theme';
import { ProposalBanner } from './Register';

const avg = (rows: Feedback[]) => (rows.length ? rows.reduce((s, f) => s + scoreOf(f), 0) / rows.length : 0);

const daysBetween = (from: string, to: string) => {
  const d = (s: string) => new Date(s.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1, $3')).getTime();
  return Math.round((d(to) - d(from)) / 864e5);
};

const SmallSample = ({ n }: { n: number }) =>
  n < 4 ? (
    <Chip
      size="small" label={`${n} response${n === 1 ? '' : 's'} — small sample`}
      sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#FFF4E5', color: COLORS.attention, fontWeight: 700 }}
    />
  ) : null;

/* ================================================ S09-SC-11 dashboard */

export function SatisfactionDashboard() {
  const { country } = useStore();
  const { feedback, questions } = useS09();

  const dimension = (key: 'customer' | 'commodity' | 'destination' | 'country') => {
    const val = (f: Feedback) => {
      if (key === 'customer') return f.customer;
      const c = FEEDBACK_CONTRACTS.find((x) => x.id === f.contract);
      return (c ? (c as any)[key] : '—') as string;
    };
    const keys = Array.from(new Set(feedback.map(val)));
    return keys.map((k) => {
      const rows = feedback.filter((f) => val(f) === k);
      return { key: k, score: avg(rows), responses: rows.length, complaints: rows.filter((f) => f.satisfaction === 'Complaint').length };
    }).sort((a, b) => b.score - a.score);
  };

  const overall = avg(feedback);
  const prev = SATISFACTION_TREND[SATISFACTION_TREND.length - 2];
  const last = SATISFACTION_TREND[SATISFACTION_TREND.length - 1];

  const table = (title: string, rows: { key: string; score: number; responses: number; complaints: number }[], head: string) => (
    <SectionCard title={title}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {[head, 'Responses', 'Complaints', 'Score'].map((h) => (
              <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.key}>
              <TableCell>
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>{r.key}</span>
                  <SmallSample n={r.responses} />
                </Stack>
              </TableCell>
              <TableCell align="right">{r.responses}</TableCell>
              <TableCell align="right">{r.complaints}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: r.score >= 3.5 ? COLORS.good : COLORS.attention }}>
                {r.score.toFixed(2)} / 5
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SectionCard>
  );

  return (
    <AppShell
      title="Satisfaction dashboard"
      breadcrumb={[country, 'Shared Modules', 'CRM and Customer Feedback', 'Satisfaction']}
      showSeason={false}
    >
      <ProposalBanner />

      <TraceNote workflow="WF-S09-03 / Steps 1–2 — responses aggregated by customer, commodity, destination and country, with trends over time on the shared dashboard" />

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap', mb: 1 }}>
        <Box sx={{ border: `1px solid ${COLORS.border}`, bgcolor: '#fff', borderRadius: 1, px: 2, py: 1.5, minWidth: 240 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>OVERALL SATISFACTION</Typography>
          <Stack direction="row" spacing={1} alignItems="baseline">
            <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.primary }}>{overall.toFixed(2)}</Typography>
            <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>/ 5</Typography>
            {last.score >= prev.score
              ? <ArrowUpwardIcon sx={{ fontSize: 18, color: COLORS.good }} />
              : <ArrowDownwardIcon sx={{ fontSize: 18, color: COLORS.bad }} />}
          </Stack>
          <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
            From {feedback.length} responses
          </Typography>
          <Box><SmallSample n={feedback.length} /></Box>
        </Box>

        <Box sx={{ flex: '1 1 420px', border: `1px solid ${COLORS.border}`, bgcolor: '#fff', borderRadius: 1, px: 2, py: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>
            TREND OVER TIME — MOVEMENT, NOT ONLY THE CURRENT POSITION
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 1, alignItems: 'flex-end' }}>
            {SATISFACTION_TREND.map((t) => (
              <Box key={t.month} sx={{ textAlign: 'center', flex: 1 }}>
                <Box
                  sx={{
                    height: t.score * 22, bgcolor: COLORS.primary, borderRadius: '2px 2px 0 0',
                    opacity: t.responses < 4 ? 0.55 : 1,
                  }}
                />
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>{t.score.toFixed(1)}</Typography>
                <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, fontSize: '0.65rem' }}>
                  {t.month}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, fontSize: '0.6rem' }}>
                  n={t.responses}
                </Typography>
              </Box>
            ))}
          </Stack>
          <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
            Faded bars are months with fewer than four responses. The response count travels with the score
            everywhere, because a satisfaction figure from a handful of contracts reads as authoritative when it is
            not — and the sample-basis question is unresolved.
          </Typography>
        </Box>
      </Box>

      {table('By customer', dimension('customer'), 'Customer')}
      {table('By commodity', dimension('commodity'), 'Commodity')}
      {table('By destination', dimension('destination'), 'Destination')}
      {table('By country', dimension('country'), 'Country')}

      <SectionCard title="Indicator composition — what produced the score">
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Question', 'Response type', 'Indicator', 'Weight'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {questions.map((q) => (
              <TableRow key={q.id}>
                <TableCell>{q.id} · {q.text}</TableCell>
                <TableCell>{q.type}</TableCell>
                <TableCell>{q.indicator}</TableCell>
                <TableCell align="right">{q.weight} %</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <BusinessConfirmation>
          Provide and approve the CRM feedback questions and satisfaction indicators.
          <PrototypeNote>
            change the questions or the weights and every figure on this dashboard changes — which is why the
            question set is the decision that matters most on this module.
          </PrototypeNote>
        </BusinessConfirmation>
      </SectionCard>

      <BottomBar>
        <Button variant="outlined" component={Link} to="/s09">Back to the feedback register</Button>
        <Button variant="outlined" component={Link} to="/s09/coverage">Feedback coverage</Button>
      </BottomBar>
    </AppShell>
  );
}

/* ================================================= S09-SC-12 coverage */

export function FeedbackCoverage() {
  const { country } = useStore();
  const { feedback, contracts, coverageBasis, setCoverageBasis } = useS09();

  const rows = contracts.map((c) => {
    const f = feedback.find((x) => x.contract === c.id);
    return { c, f };
  });
  const covered = rows.filter((r) => r.f).length;
  const pct = (covered / rows.length) * 100;
  const everyContract = coverageBasis === 'Every contract';

  return (
    <AppShell
      title="Feedback coverage"
      breadcrumb={[country, 'Shared Modules', 'CRM and Customer Feedback', 'Coverage']}
      showSeason={false}
    >
      <ProposalBanner />

      <TraceNote workflow="WF-S09-03 / Step 3 — feedback coverage, showing contracts with and without recorded feedback" />

      <BusinessConfirmation>
        Confirm whether feedback is collected for every contract or on a sample basis.
      </BusinessConfirmation>

      <Alert severity="warning" sx={{ mb: 2, fontSize: '0.82rem' }}>
        <b>This report does not draw a conclusion, because it cannot yet.</b> {covered} of {rows.length} delivered
        contracts carry feedback — and that same number means opposite things depending on an unanswered question:
        <Box component="ul" sx={{ pl: 2, m: 0.5 }}>
          <li><b>If every contract</b> — the {rows.length - covered} without feedback are a <b>gap</b>, and this is a chase list.</li>
          <li><b>If a sample basis</b> — they are <b>normal</b>, and coverage should be measured against a sample target instead.</li>
        </Box>
        The facts are below either way. The interpretation is the business's to choose.
      </Alert>

      <SectionCard title="S09-SC-12 · Coverage of delivered contracts">
        <Box sx={{ border: `1px dashed ${COLORS.attention}`, borderRadius: 1, p: 1.5, mb: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.attention, display: 'block' }}>
            PROTOTYPE — SEE WHAT EACH DECISION PRODUCES
          </Typography>
          <RadioGroup row value={coverageBasis} onChange={(e) => setCoverageBasis(e.target.value as any)}>
            <FormControlLabel value="Every contract" control={<Radio size="small" />} label="Feedback on every contract" />
            <FormControlLabel value="Sample basis" control={<Radio size="small" />} label="Feedback on a sample basis" />
          </RadioGroup>
          <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
            Neither is the default answer. The toggle exists so the client can see both presentations before deciding.
            Not production functionality.
          </Typography>
        </Box>

        {everyContract ? (
          <Alert severity={covered === rows.length ? 'success' : 'warning'} sx={{ mb: 1.5, fontSize: '0.85rem' }}>
            <b>Chase list presentation.</b> Coverage {pct.toFixed(0)} % — {rows.length - covered} delivered contract
            {rows.length - covered === 1 ? '' : 's'} without feedback, each one an outstanding action for the trader
            who owns it.
          </Alert>
        ) : (
          <Alert severity={pct >= SAMPLE_TARGET_PERCENT ? 'success' : 'warning'} sx={{ mb: 1.5, fontSize: '0.85rem' }}>
            <b>Sample coverage presentation.</b> Coverage {pct.toFixed(0)} % against a sample target of{' '}
            {SAMPLE_TARGET_PERCENT} % — {pct >= SAMPLE_TARGET_PERCENT ? 'target met' : 'below target'}. Contracts
            without feedback are <b>not</b> a gap; they are outside the sample. The target itself would need to be
            agreed and configured.
          </Alert>
        )}

        <Table size="small">
          <TableHead>
            <TableRow>
              {['Contract', 'Customer', 'Commodity', 'Destination', 'Delivered', 'Feedback recorded', 'Reference',
                'Days since delivery', everyContract ? 'Action' : 'In sample'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(({ c, f }) => (
              <TableRow key={c.id}>
                <TableCell sx={{ fontWeight: 600 }}>{c.id}</TableCell>
                <TableCell>{c.customer}</TableCell>
                <TableCell>{c.commodity}</TableCell>
                <TableCell>{c.destination}</TableCell>
                <TableCell>{c.delivered}</TableCell>
                <TableCell>
                  <Chip
                    size="small" label={f ? 'Yes' : 'No'}
                    sx={{ height: 19, color: '#fff', fontWeight: 600, bgcolor: f ? COLORS.good : COLORS.neutral }}
                  />
                </TableCell>
                <TableCell>
                  {f ? <Link to={`/s09/feedback/${f.id}`} style={{ color: COLORS.primary }}>{f.id}</Link> : '—'}
                </TableCell>
                <TableCell align="right">{daysBetween(c.delivered, '19-Aug-2026')}</TableCell>
                <TableCell>
                  {f
                    ? '—'
                    : everyContract
                      ? <Typography variant="caption" sx={{ color: COLORS.attention, fontWeight: 700 }}>Obtain feedback</Typography>
                      : <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Outside the sample</Typography>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      <BottomBar>
        <Button variant="outlined" component={Link} to="/s09">Back to the feedback register</Button>
        <Button variant="outlined" component={Link} to="/s09/reports">Reporting</Button>
      </BottomBar>
    </AppShell>
  );
}

/* ============================================== S09-SC-13 reporting */

export function SatisfactionReporting() {
  const { country } = useStore();
  const { feedback, contracts, coverageBasis } = useS09();

  const complaints = feedback.filter((f) => f.satisfaction === 'Complaint');
  const categories = [
    { label: 'Service', rows: complaints.filter((f) => f.subject === 'Service') },
    { label: 'Commodity', rows: complaints.filter((f) => f.subject === 'Commodity') },
  ];
  const areas = Array.from(new Set(complaints.map((f) => f.assignedArea).filter(Boolean))) as string[];
  const openComplaints = complaints.filter((f) => !f.resolutionDate);
  const covered = new Set(feedback.map((f) => f.contract)).size;

  const resTime = (rows: Feedback[]) => {
    const done = rows.filter((r) => r.resolutionDate);
    if (!done.length) return { avg: '—', max: '—', n: 0 };
    const ds = done.map((r) => daysBetween(r.dateObtained, r.resolutionDate!));
    return { avg: (ds.reduce((a, b) => a + b, 0) / ds.length).toFixed(1), max: String(Math.max(...ds)), n: done.length };
  };

  return (
    <AppShell
      title="Satisfaction and complaint reporting"
      breadcrumb={[country, 'Shared Modules', 'CRM and Customer Feedback', 'Reporting']}
      showSeason={false}
    >
      <ProposalBanner />

      <TraceNote workflow="WF-S09-03 / Step 4 and WF-S09-02 / Step 6 — satisfaction by customer, commodity, destination and period; complaints by category with resolution time; feedback coverage — published through C11" />

      <SectionCard title="Satisfaction by customer, commodity, destination and period">
        <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mb: 1 }}>
          Period: 01-Apr-2026 to 19-Aug-2026. The full breakdown, with the trend, is on the satisfaction dashboard.
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Month', 'Score', 'Responses'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {SATISFACTION_TREND.map((t) => (
              <TableRow key={t.month}>
                <TableCell>{t.month}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{t.score.toFixed(1)} / 5</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                    <span>{t.responses}</span>
                    <SmallSample n={t.responses} />
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button size="small" variant="outlined" component={Link} to="/s09/satisfaction" sx={{ mt: 1 }}>
          Open the satisfaction dashboard
        </Button>
      </SectionCard>

      <SectionCard title="Complaints by category with resolution time">
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Category', 'Complaints', 'Resolved', 'Average resolution', 'Longest resolution'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((c) => {
              const r = resTime(c.rows);
              return (
                <TableRow key={c.label}>
                  <TableCell sx={{ fontWeight: 600 }}>{c.label}</TableCell>
                  <TableCell align="right">{c.rows.length}</TableCell>
                  <TableCell align="right">{r.n}</TableCell>
                  <TableCell align="right">{r.avg === '—' ? '—' : `${r.avg} days`}</TableCell>
                  <TableCell align="right">{r.max === '—' ? '—' : `${r.max} days`}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: COLORS.textSecondary, mt: 2 }}>
          BY ASSIGNED AREA
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Assigned area', 'Complaints', 'Resolved', 'Average resolution'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {areas.map((a) => {
              const rows = complaints.filter((f) => f.assignedArea === a);
              const r = resTime(rows);
              return (
                <TableRow key={a}>
                  <TableCell>{a}</TableCell>
                  <TableCell align="right">{rows.length}</TableCell>
                  <TableCell align="right">{r.n}</TableCell>
                  <TableCell align="right">{r.avg === '—' ? '—' : `${r.avg} days`}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
          <b>The report names its own weakness.</b> Resolution time is only meaningful for complaints that have been
          resolved, so the {openComplaints.length} open complaint{openComplaints.length === 1 ? '' : 's'}{' '}
          {openComplaints.length === 1 ? 'is' : 'are'} listed separately below with their ageing, rather than averaged
          in as zero or excluded silently.
        </Alert>

        {openComplaints.length > 0 && (
          <>
            <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: COLORS.textSecondary, mt: 2 }}>
              OPEN COMPLAINTS — AGEING, NOT RESOLUTION TIME
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Feedback', 'Customer', 'Category', 'Assigned area', 'Obtained', 'Age'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {openComplaints.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell><Link to={`/s09/feedback/${f.id}`} style={{ color: COLORS.primary }}>{f.id}</Link></TableCell>
                    <TableCell>{f.customer}</TableCell>
                    <TableCell>{f.subject}</TableCell>
                    <TableCell>{f.assignedArea ?? '—'}</TableCell>
                    <TableCell>{f.dateObtained}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: COLORS.attention }}>
                      {daysBetween(f.dateObtained, '19-Aug-2026')} days
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </SectionCard>

      <SectionCard title="Feedback coverage">
        <Typography variant="body2">
          {covered} of {contracts.length} delivered contracts carry feedback ({((covered / contracts.length) * 100).toFixed(0)} %).
          Currently presented as <b>{coverageBasis.toLowerCase()}</b>.
        </Typography>
        <Alert severity="warning" sx={{ mt: 1, fontSize: '0.8rem' }}>
          This figure carries the same caveat as the coverage report — it is not interpretable until the business
          confirms whether feedback is collected for every contract or on a sample basis.
        </Alert>
        <Button size="small" variant="outlined" component={Link} to="/s09/coverage" sx={{ mt: 1 }}>
          Open the coverage report
        </Button>
      </SectionCard>

      <PrototypeNote>
        All three are Core C11 report definitions published into the shared reporting area; here they are computed from
        the prototype's mock data.
      </PrototypeNote>

      <BottomBar>
        <Button variant="outlined" component={Link} to="/s09">Back to the feedback register</Button>
      </BottomBar>
    </AppShell>
  );
}
