import React from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, Drawer, FormControl, FormControlLabel, InputLabel, MenuItem,
  Paper, Select, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  ConfirmDialog, EmptyState, FieldGrid, HandOffBanner, PageBanner, PlaceholderNote, RecordHeader,
  SectionBand, StatusChip, WhiteButton
} from '../../components/shared';
import { ChartFrame, DataTableView, HBar } from '../../components/Charts';
import { AUDIT_ISSUE, INTERFACES, OWNERSHIP_ISSUE, QueuedError } from '../../mockData/c9';
import { ShellFooterNote } from '../../layouts/AppShell';
import { FriendlyErrorDialog } from './Health';

const outcomeColour = (o: string) =>
  o === 'Success' ? tokens.green
    : o === 'Failed after retries' ? tokens.red
      : o === 'Partial — records in exception' ? tokens.orange
        : tokens.amber;

/** 2.1 Integration Exchange Log — WF-C9-02 / Steps 1–2 */
export const ExchangeLog: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [iface, setIface] = React.useState('All');
  const [direction, setDirection] = React.useState('All');
  const [outcome, setOutcome] = React.useState('All');
  const [correlation, setCorrelation] = React.useState('');
  const [failuresOnly, setFailuresOnly] = React.useState(false);
  const [showOutcome, setShowOutcome] = React.useState(false);
  const [showResponse, setShowResponse] = React.useState(false);
  const [showPolicy, setShowPolicy] = React.useState(false);

  const rows = s.exchanges.filter((e) => (
    (iface === 'All' || e.interfaceName === iface)
    && (direction === 'All' || e.direction === direction)
    && (outcome === 'All' || e.outcome === outcome)
    && (correlation.trim() === '' || e.correlation.toLowerCase().includes(correlation.trim().toLowerCase()))
    && (!failuresOnly || e.outcome !== 'Success')
  ));

  const outcomes = Array.from(new Set(s.exchanges.map((e) => e.outcome)));
  const byOutcome = outcomes.map((o) => ({
    label: o, value: s.exchanges.filter((e) => e.outcome === o).length, attention: o !== 'Success'
  }));
  const names = Array.from(new Set(s.exchanges.map((e) => e.interfaceName)));
  const byResponse = names.map((n) => {
    const rs = s.exchanges.filter((e) => e.interfaceName === n);
    return { label: n, value: Math.round(rs.reduce((a, b) => a + b.responseMs, 0) / rs.length) };
  });

  return (
    <>
      <PageBanner
        title="Exchange log"
        breadcrumb={['Global', 'C9 Logging and Monitoring', 'Exchange log']}
        subtitle="WF-C9-02 / Steps 1–2 — direction, endpoint, correlation reference, payload reference, response time and outcome"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c9/error-queue')}>Error queue</WhiteButton>
            <WhiteButton onClick={() => navigate('/c9')}>System health</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Paper variant="outlined" sx={{ mb: 2, p: 2 }}>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel>Interface</InputLabel>
              <Select label="Interface" value={iface} onChange={(e) => setIface(e.target.value)}>
                {['All', ...INTERFACES].map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Direction</InputLabel>
              <Select label="Direction" value={direction} onChange={(e) => setDirection(e.target.value)}>
                {['All', 'Inbound', 'Outbound'].map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel>Outcome</InputLabel>
              <Select label="Outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                {['All', ...outcomes].map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" label="Correlation reference" value={correlation}
                       onChange={(e) => setCorrelation(e.target.value)} sx={{ minWidth: 200 }} />
            <FormControlLabel
              control={<Switch size="small" checked={failuresOnly} onChange={(e) => setFailuresOnly(e.target.checked)} />}
              label={<Typography sx={{ fontSize: 12.5 }}>Failures only</Typography>}
            />
            <Button size="small" onClick={() => setShowPolicy((v) => !v)}>
              {showPolicy ? 'Hide retry policy' : 'Retry policy per interface'}
            </Button>
          </Stack>
        </Paper>

        {showPolicy && (
          <Paper variant="outlined" sx={{ mb: 2 }}>
            <SectionBand>Retry policy per interface — read-only in C09</SectionBand>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Interface</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Attempts</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Interval</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Backoff</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>On exhaustion</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {s.retryPolicies.map((p) => (
                  <TableRow key={p.interfaceName}>
                    <TableCell sx={{ fontSize: 12.5 }}>{p.interfaceName}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{p.attempts}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{p.intervalSeconds} s</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{p.backoff}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{p.onExhaustion}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Box sx={{ px: 2, pb: 1 }}>
              <PlaceholderNote kind="consistency">
                {OWNERSHIP_ISSUE.replace('Integration consistency issue: ', '')} The policy is shown read-only here; C09
                does not claim to own it.
              </PlaceholderNote>
            </Box>
          </Paper>
        )}

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>{`Exchanges — ${rows.length} of ${s.exchanges.length}`}</SectionBand>
          {rows.length === 0 ? <EmptyState message="No exchange matches these filters." /> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Correlation</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Interface</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Direction</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Endpoint</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Started</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>Response</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Outcome</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>Processed</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>Failed</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Retry</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Payload</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell>
                      <Button size="small" sx={{ fontFamily: 'monospace', fontSize: 12 }}
                              onClick={() => navigate(`/c9/exchanges/${e.correlation}`)}>
                        {e.correlation}
                      </Button>
                      {/* Step 3 — reprocessing is logged in the same way as the original exchange:
                          an ordinary row, distinguished only by a link back to what it reprocessed. */}
                      {e.reprocessOf && (
                        <Typography sx={{ fontSize: 11, color: tokens.textSecondary }}>
                          reprocess of {e.reprocessOf}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{e.interfaceName}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{e.direction}</TableCell>
                    <TableCell sx={{ fontSize: 11.5, fontFamily: 'monospace' }}>{e.endpoint}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{e.started}</TableCell>
                    <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>{e.responseMs} ms</TableCell>
                    <TableCell>
                      <Chip size="small" label={e.outcome}
                            sx={{ fontSize: 11, bgcolor: `${outcomeColour(e.outcome)}1A`, color: outcomeColour(e.outcome) }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>{e.processed ?? '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>{e.failed ?? 0}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {e.attempts.length > 1 ? `${e.attempts.length} of ${s.retryPolicies.find((p) => p.interfaceName === e.interfaceName)?.attempts ?? '—'}` : '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11.5, fontFamily: 'monospace' }}>{e.payloadRef}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
              The payload reference is a reference, not the payload: the body itself is held outside the log under the
              masking rules. <b>CORR-8f2a41</b> and <b>CORR-71c0be</b> are the correlation references the C03 unmapped-code
              exceptions carry — open either exchange to trace from the reference to the exception to the mapping.
            </Typography>
          </Box>
        </Paper>

        <ChartFrame
          title="Exchanges by outcome"
          tableToggle={<Button size="small" sx={{ mt: 1 }} onClick={() => setShowOutcome((v) => !v)}>{showOutcome ? 'Hide table' : 'Show as table'}</Button>}
        >
          <HBar rows={byOutcome} attentionNote="Anything other than success" />
          {showOutcome && <Box sx={{ mt: 2 }}><DataTableView head={['Outcome', 'Exchanges']} rows={byOutcome.map((r) => [r.label, r.value])} /></Box>}
        </ChartFrame>

        <ChartFrame
          title="Average response time by interface"
          note="One measure per axis — milliseconds. Horizontal bars, because the interface names are phrases."
          tableToggle={<Button size="small" sx={{ mt: 1 }} onClick={() => setShowResponse((v) => !v)}>{showResponse ? 'Hide table' : 'Show as table'}</Button>}
        >
          <HBar rows={byResponse} unit=" ms" />
          {showResponse && <Box sx={{ mt: 2 }}><DataTableView head={['Interface', 'Average response (ms)']} rows={byResponse.map((r) => [r.label, r.value])} /></Box>}
        </ChartFrame>

        <HandOffBanner
          label="RETURN"
          target="C12 / WF-C12-01 / Step 7"
          passed="C12 owns the exchange itself; C09 owns its record. Every exchange outcome, duration and record count is logged here."
          returned="C12 is now built. Its exchange log reads this same store and adds the stage each exchange reached, because C12 owns the six stages. One store, read twice — not a second log."
          to="/c12/exchanges"
          goLabel="C12 exchange log"
        />
        <ShellFooterNote />
      </Box>
      <FriendlyErrorDialog />
    </>
  );
};

/** 2.2 Exchange Detail — the full trail against the correlation reference */
export const ExchangeDetail: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const ex = s.exchangeByCorrelation(id);

  if (!ex) {
    return (
      <>
        <PageBanner title="Exchange" breadcrumb={['Global', 'C9 Logging and Monitoring', 'Exchange']} />
        <Box sx={{ p: 3 }}><EmptyState message="That exchange could not be found." /></Box>
      </>
    );
  }

  const exceptions = s.unmapped.filter((u) => u.correlation === ex.correlation);
  const queued = s.queuedErrors.filter((q) => q.correlation === ex.correlation);
  const incident = s.incidents.find((i) => i.id === ex.incident || i.correlation === ex.correlation);
  const logs = s.logEntries.filter((l) => l.correlation === ex.correlation);
  const reprocessed = s.exchanges.filter((e) => e.reprocessOf === ex.correlation);

  return (
    <>
      <PageBanner
        title={`Exchange ${ex.correlation}`}
        breadcrumb={['Global', 'C9 Logging and Monitoring', 'Exchange log', ex.correlation]}
        subtitle="WF-C9-02 / Steps 1–2 — the full trail against the correlation reference"
        actions={<WhiteButton onClick={() => navigate('/c9/exchanges')}>Back to the exchange log</WhiteButton>}
      />
      <RecordHeader
        name={ex.interfaceName}
        status={ex.outcome}
        reference={ex.correlation}
        date={ex.started}
        meta={[['Direction', ex.direction], ['Response time', `${ex.responseMs} ms`], ['Triggered by', ex.triggeredBy]]}
      />
      <Box sx={{ p: 3 }}>
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Exchange</SectionBand>
          <FieldGrid items={[
            ['Interface', ex.interfaceName],
            ['Direction', ex.direction],
            ['Endpoint', <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{ex.endpoint}</span>],
            ['Started', ex.started],
            ['Ended', ex.ended],
            ['Response time', `${ex.responseMs} ms`],
            ['Outcome', ex.outcome],
            ['Payload reference', <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{ex.payloadRef}</span>],
            ['Triggered by', ex.triggeredBy],
            ['Reprocess of', ex.reprocessOf
              ? <Button size="small" sx={{ fontFamily: 'monospace', fontSize: 12 }} onClick={() => navigate(`/c9/exchanges/${ex.reprocessOf}`)}>{ex.reprocessOf}</Button>
              : '—']
          ]} columns={2} />
        </Paper>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Attempts — the retry policy applied, attempt by attempt</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Attempt</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Started</TableCell>
                <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>Response</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Outcome</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Error returned</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Retry decision</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ex.attempts.map((a) => (
                <TableRow key={a.attempt}>
                  <TableCell sx={{ fontSize: 12.5 }}>{a.attempt}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{a.started}</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>{a.responseMs} ms</TableCell>
                  <TableCell><StatusChip status={a.outcome === 'Success' ? 'Delivered' : 'Permanently failed'} /></TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{a.error ?? '—'}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{a.retryDecision}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Counts</SectionBand>
          <FieldGrid items={[
            ['Records received', ex.received ?? '—'],
            ['Processed', ex.processed ?? '—'],
            ['Skipped', ex.skipped ?? 0],
            ['In exception', ex.inException ?? 0],
            ['Failed', ex.failed ?? 0]
          ]} columns={3} />
        </Paper>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Related</SectionBand>
          <Box sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Box>
                <Typography sx={{ fontSize: 12.5, fontWeight: 500 }}>C03 unmapped-code exceptions</Typography>
                {exceptions.length === 0
                  ? <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>None from this exchange.</Typography>
                  : exceptions.map((u) => (
                    <Stack key={u.id} direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                      <Typography sx={{ fontSize: 12.5 }}>
                        {u.externalSystem} {u.externalCode} — {u.domain}, {u.affected} record{u.affected === 1 ? '' : 's'} affected
                      </Typography>
                      <Button size="small" onClick={() => navigate('/c3/mapping')}>Open the exception queue</Button>
                    </Stack>
                  ))}
              </Box>
              <Box>
                <Typography sx={{ fontSize: 12.5, fontWeight: 500 }}>Error queue records held from this exchange</Typography>
                {queued.length === 0
                  ? <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>None.</Typography>
                  : (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                      <Typography sx={{ fontSize: 12.5 }}>{queued.length} record{queued.length === 1 ? '' : 's'}</Typography>
                      <Button size="small" onClick={() => navigate('/c9/error-queue')}>Open the error queue</Button>
                    </Stack>
                  )}
              </Box>
              <Box>
                <Typography sx={{ fontSize: 12.5, fontWeight: 500 }}>Incident</Typography>
                {incident
                  ? <Button size="small" sx={{ fontFamily: 'monospace', fontSize: 12 }} onClick={() => navigate(`/c9/incidents/${incident.id}`)}>{incident.errorRef}</Button>
                  : <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>No incident was created from this exchange.</Typography>}
              </Box>
              <Box>
                <Typography sx={{ fontSize: 12.5, fontWeight: 500 }}>Job run</Typography>
                <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
                  {ex.run ? `${ex.run} — ${s.jobRunsC9.find((r) => r.id === ex.run)?.job ?? 'unknown job'}` : '—'}
                </Typography>
              </Box>
              {reprocessed.length > 0 && (
                <Box>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 500 }}>Reprocessed as</Typography>
                  {reprocessed.map((r) => (
                    <Button key={r.id} size="small" sx={{ fontFamily: 'monospace', fontSize: 12 }}
                            onClick={() => navigate(`/c9/exchanges/${r.correlation}`)}>
                      {r.correlation}
                    </Button>
                  ))}
                </Box>
              )}
            </Stack>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Log entries written for this exchange — masked as written</SectionBand>
          {logs.length === 0 ? <EmptyState message="No log entry carries this correlation reference." /> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>At</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Severity</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Component</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Message</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell sx={{ fontSize: 12 }}>{l.at}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{l.severity}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{l.component}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{l.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        <HandOffBanner
          label="RETURN"
          target="C12 / WF-C12-03 Reconciliation"
          passed="This screen is where a business owner arrives when investigating a reconciliation difference: the correlation reference gives the full trail of the exchange through the logs."
          returned="C12 is now built. Its reconciliation run links each difference straight back to this detail. The C12 error queue reads this same store and groups the same held records by cause class."
          to="/c12/reconciliation"
          goLabel="C12 reconciliation"
        />
        <ShellFooterNote />
      </Box>
      <FriendlyErrorDialog />
    </>
  );
};

/** 2.3 Error Queue — WF-C9-02 / Steps 2–3 */
export const ErrorQueue: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [drawer, setDrawer] = React.useState<QueuedError | null>(null);
  const [corrected, setCorrected] = React.useState('');
  const [selected, setSelected] = React.useState<string[]>([]);
  const [confirm, setConfirm] = React.useState(false);
  const [alsoAudit, setAlsoAudit] = React.useState(false);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const rows = s.queuedErrors;
  const selectedRows = rows.filter((r) => selected.includes(r.id));

  return (
    <>
      <PageBanner
        title="Error queue"
        breadcrumb={['Global', 'C9 Logging and Monitoring', 'Error queue']}
        subtitle="WF-C9-02 / Steps 2–3 — failed records are held for correction rather than discarded"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c9/exchanges')}>Exchange log</WhiteButton>
            <WhiteButton onClick={() => navigate('/c3/mapping')}>C03 exception queue</WhiteButton>
            <WhiteButton onClick={() => navigate('/c12/error-queue')}>C12 view of this queue</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2, fontSize: 13 }}>
          <b>Failed after retries → the affected records are placed in an error queue rather than discarded.</b> Nothing in
          this queue was lost; each record is held with the reason it failed and the field the administrator is expected to
          correct — WF-C9-02 / Step 2.
        </Alert>

        <PlaceholderNote kind="consistency">
          {OWNERSHIP_ISSUE.replace('Integration consistency issue: ', '')} The queue is built in C09 because C09 is the
          module being built; this is a provisional placement and not a claim of ownership.
        </PlaceholderNote>

        <Paper variant="outlined" sx={{ mb: 2, mt: 2 }}>
          <SectionBand>{`Held and reprocessed records — ${rows.length}`}</SectionBand>
          {rows.length === 0 ? <EmptyState message="The error queue is empty." /> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell sx={{ fontSize: 12 }}>Queue reference</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Correlation</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Interface</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Record</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Failure reason</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Retries</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Held since</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Correctable field</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Status</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Business audit entry</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((q) => (
                  <TableRow key={q.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox size="small" checked={selected.includes(q.id)}
                                disabled={q.status.startsWith('Reprocessed')}
                                onChange={() => toggle(q.id)}
                                inputProps={{ 'aria-label': `Select ${q.id}` }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12.5, fontFamily: 'monospace' }}>{q.id}</TableCell>
                    <TableCell>
                      <Button size="small" sx={{ fontFamily: 'monospace', fontSize: 12 }}
                              onClick={() => navigate(`/c9/exchanges/${q.correlation}`)}>{q.correlation}</Button>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{q.interfaceName}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{q.record}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{q.reason}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{q.retriesUsed} of {q.retriesAllowed}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{q.heldSince}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {q.correctableField ?? '—'}
                      {q.correctedValue && <> — corrected to <b>{q.correctedValue}</b></>}
                    </TableCell>
                    <TableCell><StatusChip status={q.status} /></TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {q.status.startsWith('Reprocessed') ? (q.auditRaised ? 'Written' : 'Not written') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Box sx={{ p: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined"
                    disabled={selected.length !== 1}
                    onClick={() => {
                      const q = rows.find((r) => r.id === selected[0]);
                      if (q) { setCorrected(q.correctedValue ?? q.currentValue ?? ''); setDrawer(q); }
                    }}>
              Correct the selected record
            </Button>
            <Button variant="contained" disabled={selected.length === 0} onClick={() => setConfirm(true)}>
              Reprocess selected
            </Button>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Two queues, one exchange — why both exist</SectionBand>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12.5 }}>
              An <b>unmapped code</b> is a mapping gap: it is held in the C03 exception queue and resolved by creating a
              mapping. A <b>queued error</b> is a record failure: it is held here and resolved by correcting the record.
              Both can arise from the same exchange — <span style={{ fontFamily: 'monospace' }}>CORR-8f2a41</span> produced
              six C03 exceptions, and <span style={{ fontFamily: 'monospace' }}>CORR-9d3e18</span> produced twelve queued
              errors — which is why two queues fed by one exchange is not a duplication.
            </Typography>
            <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/c3/mapping')}>Open the C03 exception queue</Button>
          </Box>
        </Paper>

        <ShellFooterNote />
      </Box>

      <Drawer anchor="right" open={!!drawer} onClose={() => setDrawer(null)} PaperProps={{ sx: { width: 560 } }}>
        {drawer && (
          <Box>
            <Box sx={{ bgcolor: tokens.primaryDark, color: '#fff', px: 2.5, py: 2 }}>
              <Typography sx={{ fontSize: 12, opacity: 0.85 }}>Correct the failed record — WF-C9-02 / Step 3</Typography>
              <Typography variant="h6">{drawer.record}</Typography>
              <Typography sx={{ fontSize: 12, opacity: 0.85 }}>{drawer.id} · {drawer.interfaceName}</Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Alert severity="warning" sx={{ mb: 2, fontSize: 12.5 }}>{drawer.reason}</Alert>
              <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mb: 0.5 }}>Failed payload</Typography>
              <Table size="small">
                <TableBody>
                  {drawer.payload.map((p) => (
                    <TableRow key={p.field}>
                      <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{p.field}</TableCell>
                      <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{p.value}</TableCell>
                      <TableCell sx={{ fontSize: 11.5, color: tokens.textSecondary }}>{p.masked ? `masked — ${p.masked}` : ''}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TextField
                label={drawer.correctableField ?? 'Correction'}
                value={corrected}
                onChange={(e) => setCorrected(e.target.value)}
                size="small" fullWidth sx={{ mt: 2 }}
                helperText={`Current value: ${drawer.currentValue ?? '—'}`}
              />
              <Button variant="contained" sx={{ mt: 2 }}
                      disabled={!corrected.trim() || corrected === drawer.currentValue}
                      onClick={() => { s.correctQueued(drawer.id, corrected.trim()); setDrawer(null); }}>
                Save the correction
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirm}
        title={`Reprocess ${selected.length} record${selected.length === 1 ? '' : 's'}`}
        confirmLabel="Reprocess"
        confirmColor="warning"
        commentLabel="Reason for reprocessing"
        commentRequired
        onClose={() => setConfirm(false)}
        onConfirm={(reason) => { s.reprocessQueued(selected, reason, alsoAudit); setSelected([]); setAlsoAudit(false); }}
        body={
          <Box>
            <Typography sx={{ fontSize: 13.5 }}>
              The reprocessing is logged in the same way as the original exchange, so it appears in the exchange log as an
              ordinary exchange carrying a reprocess-of link — WF-C9-02 / Step 3.
            </Typography>
            <Table size="small" sx={{ mt: 1.5 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Record</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Correction</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell sx={{ fontSize: 12 }}>{r.record}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {r.correctedValue
                        ? `${r.correctableField}: ${r.currentValue} → ${r.correctedValue}`
                        : 'Not corrected — reprocessing without a correction sends the same input and will fail again'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <FormControlLabel
              sx={{ mt: 1.5 }}
              control={<Switch size="small" checked={alsoAudit} onChange={(e) => setAlsoAudit(e.target.checked)} />}
              label={<Typography sx={{ fontSize: 12.5 }}>Also raise a business audit entry (C08)</Typography>}
            />
            <PlaceholderNote kind="consistency">
              {AUDIT_ISSUE.replace('Integration consistency issue: ', '')} The switch is off by default and shows both
              readings: with it off the reprocess appears only in the C09 log; with it on it also appears in the C08
              History panel of the affected record. The prototype does not choose.
            </PlaceholderNote>
          </Box>
        }
      />
      <FriendlyErrorDialog />
    </>
  );
};
