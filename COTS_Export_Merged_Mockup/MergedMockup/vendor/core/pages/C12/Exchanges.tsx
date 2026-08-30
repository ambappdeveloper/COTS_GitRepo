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
import { STAGES } from '../../mockData/c12';
import { QueuedError } from '../../mockData/c9';
import { ShellFooterNote } from '../../layouts/AppShell';

const outcomeColour = (o: string) =>
  o === 'Success' ? tokens.green
    : o === 'Failed after retries' ? tokens.red
      : o === 'Partial — records in exception' ? tokens.orange
        : tokens.amber;

/** The ownership decision, stated on both screens that read the shared stores. */
const OwnershipPanel: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  return (
    <Paper variant="outlined" sx={{ mb: 2, borderColor: tokens.red }}>
      <SectionBand>The ownership decision that comes due here</SectionBand>
      <Box sx={{ p: 2 }}>
        <PlaceholderNote kind="consistency">
          {s.integrationNotes.queueOwnership.replace('Integration consistency issue: ', '')}
        </PlaceholderNote>
        <Typography sx={{ fontSize: 12.5, mt: 1.5, mb: 1 }}>
          Three readings are possible, and each one costs something different:
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontSize: 12, width: 340 }}>Reading</TableCell>
              <TableCell sx={{ fontSize: 12 }}>Consequence</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {s.integrationNotes.readings.map((r) => (
              <TableRow key={r.reading}>
                <TableCell sx={{ fontSize: 12.5, fontWeight: 500 }}>{r.reading}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{r.consequence}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
          <Button size="small" variant="outlined" onClick={() => navigate('/c9/exchanges')}>The same log, from C09</Button>
          <Button size="small" variant="outlined" onClick={() => navigate('/c9/error-queue')}>The same queue, from C09</Button>
        </Stack>
      </Box>
    </Paper>
  );
};

/** 1.3 Exchange Log — WF-C12-01 / Step 7, read from the integration side */
export const ExchangeLogC12: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [iface, setIface] = React.useState('All');
  const [outcome, setOutcome] = React.useState('All');

  const forInterface = (name: string) => s.interfaces.find((i) => i.c9InterfaceName === name || i.name === name);
  const rows = s.exchanges.filter((e) => {
    const i = forInterface(e.interfaceName);
    return (iface === 'All' || i?.id === iface) && (outcome === 'All' || e.outcome === outcome);
  });
  const outcomes = Array.from(new Set(s.exchanges.map((e) => e.outcome)));

  return (
    <>
      <PageBanner
        title="Exchange log"
        breadcrumb={['Global', 'C12 Integration Layer', 'Exchange log']}
        subtitle="WF-C12-01 / Step 7 — the same store as the C09 exchange log, read from the integration side"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c12/error-queue')}>Error queue</WhiteButton>
            <WhiteButton onClick={() => navigate('/c9/exchanges')}>The C09 view</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
          <b>One store, read twice.</b> These are the same exchanges the C09 log shows, with the registry columns C12 owns
          added: the trigger that fired it, the owners, the retry policy applied, and the <b>stage reached</b> — the column
          the C09 view does not have, and the one a support engineer opens first, because <i>the exchange failed</i> is not
          a diagnosis.
        </Alert>

        <Paper variant="outlined" sx={{ mb: 2, p: 2 }}>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 320 }}>
              <InputLabel>Interface</InputLabel>
              <Select label="Interface" value={iface} inputProps={{ 'aria-label': 'Interface' }}
                      onChange={(e) => setIface(e.target.value)}>
                {['All', ...s.interfaces.map((i) => i.id)].map((x) => (
                  <MenuItem key={x} value={x} sx={{ fontSize: 13 }}>
                    {x === 'All' ? 'All interfaces' : `${x} ${s.interfaceById(x)?.name}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel>Outcome</InputLabel>
              <Select label="Outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                {['All', ...outcomes].map((x) => <MenuItem key={x} value={x} sx={{ fontSize: 13 }}>{x}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>{`Exchanges — ${rows.length} of ${s.exchanges.length}`}</SectionBand>
          {rows.length === 0 ? <EmptyState message="No exchange matches these filters." /> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Correlation</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Interface</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Trigger and owners</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Started</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>Duration</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Outcome</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Stage reached</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>Written</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>Held</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Retry</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((e) => {
                  const i = forInterface(e.interfaceName);
                  const stages = s.stagesFor(e.correlation);
                  const reached = stages
                    ? (stages.filter((x) => x.state === 'Passed').length)
                    : undefined;
                  const failedAt = stages?.find((x) => x.state === 'Failed');
                  return (
                    <TableRow key={e.id} hover>
                      <TableCell>
                        <Button size="small" sx={{ fontFamily: 'monospace', fontSize: 12 }}
                                onClick={() => navigate(`/c12/exchanges/${e.correlation}`)}>
                          {e.correlation}
                        </Button>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{i ? `${i.id} ${i.name}` : e.interfaceName}</TableCell>
                      <TableCell sx={{ fontSize: 11.5 }}>
                        {i ? `${i.trigger}` : '—'}
                        <Typography sx={{ fontSize: 11, color: tokens.textSecondary }}>
                          {i ? `${i.businessOwner} · ${i.technicalOwner}` : ''}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: 11.5 }}>{e.started}</TableCell>
                      <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>{e.responseMs} ms</TableCell>
                      <TableCell>
                        <Chip size="small" label={e.outcome}
                              sx={{ fontSize: 10.5, bgcolor: `${outcomeColour(e.outcome)}1A`, color: outcomeColour(e.outcome) }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 11.5 }}>
                        {failedAt
                          ? <span style={{ color: tokens.red }}>failed at {STAGES.find((x) => x.key === failedAt.key)?.seq} · {STAGES.find((x) => x.key === failedAt.key)?.name}</span>
                          : reached !== undefined ? `${reached} of 6 passed`
                            : <span style={{ color: tokens.textSecondary }}>seeded before C12 — stages not recorded</span>}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>{e.processed ?? 0}</TableCell>
                      <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>{e.inException ?? 0}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {e.attempts.length > 1 ? `${e.attempts.length} of ${i?.retryAttempts ?? '—'}` : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Paper>

        <OwnershipPanel />
        <HandOffBanner
          label="HAND-OFF"
          target="C9 / WF-C9-02 Integration and Job Logging"
          passed="Outcome, duration and record counts of the exchange"
          to="/c9/exchanges"
          goLabel="Open the C09 view"
        />
        <ShellFooterNote />
      </Box>
    </>
  );
};

/** 1.4 Exchange Detail — the six stages of WF-C12-01 / Steps 2–7 */
export const ExchangeDetailC12: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const ex = s.exchangeByCorrelation(id);
  const stages = s.stagesFor(id);

  if (!ex) {
    return (
      <>
        <PageBanner title="Exchange" breadcrumb={['Global', 'C12 Integration Layer', 'Exchange']} />
        <Box sx={{ p: 3 }}><EmptyState message="That exchange could not be found." /></Box>
      </>
    );
  }

  const i = s.interfaces.find((x) => x.c9InterfaceName === ex.interfaceName || x.name === ex.interfaceName);
  const exceptions = s.unmapped.filter((u) => u.correlation === ex.correlation);
  const queued = s.queuedErrors.filter((q) => q.correlation === ex.correlation);
  const logs = s.logEntries.filter((l) => l.correlation === ex.correlation);

  return (
    <>
      <PageBanner
        title={`Exchange ${ex.correlation}`}
        breadcrumb={['Global', 'C12 Integration Layer', 'Exchange log', ex.correlation]}
        subtitle="WF-C12-01 / Steps 2–7 — authenticate, correlate, validate, map, transform and write, log"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c12/exchanges')}>Exchange log</WhiteButton>
            <WhiteButton onClick={() => navigate(`/c9/exchanges/${ex.correlation}`)}>The C09 view</WhiteButton>
          </Stack>
        }
      />
      <RecordHeader
        name={i ? `${i.id} ${i.name}` : ex.interfaceName}
        status={ex.outcome}
        reference={ex.correlation}
        date={ex.started}
        meta={[['Direction', ex.direction], ['Duration', `${ex.responseMs} ms`], ['Triggered by', ex.triggeredBy]]}
      />
      <Box sx={{ p: 3 }}>
        {/* the six stages */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>The six stages — WF-C12-01 / Steps 2–7</SectionBand>
          {!stages ? (
            <Box sx={{ p: 2 }}>
              <Alert severity="info" sx={{ fontSize: 12.5 }}>
                This exchange was seeded before C12 was built, so its stage results were not recorded. Run an exchange from
                an interface definition to see all six stages with what each produced — <i>the exchange failed</i> is not a
                diagnosis, and a support engineer needs to know which stage failed.
              </Alert>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12, width: 60 }}>Stage</TableCell>
                  <TableCell sx={{ fontSize: 12, width: 190 }}>What it does</TableCell>
                  <TableCell sx={{ fontSize: 12, width: 110 }}>Result</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>What it produced</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {STAGES.map((st) => {
                  const r = stages.find((x) => x.key === st.key);
                  const colour = r?.state === 'Passed' ? tokens.green : r?.state === 'Failed' ? tokens.red : tokens.grey;
                  return (
                    <TableRow key={st.key}>
                      <TableCell sx={{ fontSize: 12.5 }}>{st.seq}</TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>
                        {st.name}
                        <Typography sx={{ fontSize: 11, color: tokens.textSecondary }}>Step {st.step}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={r?.state ?? 'Not recorded'}
                              sx={{ fontSize: 10.5, bgcolor: `${colour}1A`, color: colour }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{r?.detail ?? st.what}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Paper>

        {/* Stage 4's consequence — the module's strongest sentence */}
        {exceptions.length > 0 && (
          <Paper variant="outlined" sx={{ mb: 2, borderColor: tokens.orange }}>
            <SectionBand>Unmapped codes — WF-C12-01 / Step 5</SectionBand>
            <Box sx={{ p: 2 }}>
              <Alert severity="warning" sx={{ fontSize: 13, mb: 2 }}>
                <b>The system never creates a master record silently to force a record through.</b> An exception was raised
                and the affected record was queued. Nothing was created in master data.
              </Alert>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 12 }}>Domain</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>External system</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>External code</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Records affected</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Resolve</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {exceptions.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell sx={{ fontSize: 12.5 }}>{u.domain}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{u.externalSystem}</TableCell>
                      <TableCell sx={{ fontSize: 12.5, fontWeight: 500 }}>{u.externalCode}</TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{u.affected}</TableCell>
                      <TableCell>
                        <Button size="small" onClick={() => navigate('/c3/mapping')}>
                          Create the mapping in C03
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary, mt: 1 }}>
                The mapping is created in C03 under its own approval. Once it exists, the held record becomes reprocessable
                — and only then.
              </Typography>
            </Box>
          </Paper>
        )}

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Counts and related records</SectionBand>
          <FieldGrid items={[
            ['Records received', ex.received ?? '—'],
            ['Written, with the source system named', ex.processed ?? 0],
            ['Held in exception', ex.inException ?? 0],
            ['Failed', ex.failed ?? 0],
            ['Records in the error queue from this exchange', queued.length
              ? <Button size="small" onClick={() => navigate('/c12/error-queue')}>{queued.length} held — open the queue</Button>
              : 'None'],
            ['Payload reference', <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{ex.payloadRef}</span>]
          ]} columns={2} />
        </Paper>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Log entries carrying this correlation reference</SectionBand>
          {logs.length === 0 ? <EmptyState message="No log entry carries this correlation reference." /> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>At</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Severity</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Message</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell sx={{ fontSize: 11.5 }}>{l.at}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{l.severity}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{l.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        <HandOffBanner
          label="HAND-OFF"
          target="C3 / WF-C3-03 / Step 8 Bulk Load and External Mapping"
          passed="Domain, code and external system"
          returned="The mapped code, or an unmapped-code exception — no master record is created silently"
          to="/c3/mapping"
          goLabel="Open the mapping list"
        />
        <ShellFooterNote />
      </Box>
    </>
  );
};

/** 1.5 Error Queue and Reprocess — WF-C12-01 / Steps 8–10 */
export const ErrorQueueC12: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [selected, setSelected] = React.useState<string[]>([]);
  const [confirm, setConfirm] = React.useState(false);
  const [alsoAudit, setAlsoAudit] = React.useState(false);
  const [drawer, setDrawer] = React.useState<QueuedError | null>(null);
  const [corrected, setCorrected] = React.useState('');

  const over = s.overThreshold();
  const forInterface = (name: string) => s.interfaces.find((i) => i.c9InterfaceName === name || i.name === name);
  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const selectedRows = s.queuedErrors.filter((q) => selected.includes(q.id));

  return (
    <>
      <PageBanner
        title="Error queue"
        breadcrumb={['Global', 'C12 Integration Layer', 'Error queue']}
        subtitle="WF-C12-01 / Steps 8–10 — records held after retries, corrected by cause, and reprocessed"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c9/error-queue')}>The C09 view</WhiteButton>
            <WhiteButton onClick={() => navigate('/c3/mapping')}>C03 mappings</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2, fontSize: 13 }}>
          <b>Records still failing after retries are placed in the error queue with the reason</b> — WF-C12-01 / Step 8.
          This is the same queue the C09 screen shows. C12 adds the interface, its owner and the retry policy that produced
          the exhaustion; C09 keeps the technical framing.
        </Alert>

        {over.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2, fontSize: 12.5 }}>
            <b>{over.length} interface{over.length === 1 ? '' : 's'} over the queue threshold.</b>{' '}
            {over.map((o) => `${o.name}: ${o.depth} against ${o.threshold}`).join('; ')}. Step 9 says the
            <b> interface owner</b> is notified — not support.
            {over.map((o) => (
              <Button key={o.interfaceId} size="small" sx={{ ml: 1 }} onClick={() => s.notifyQueueThreshold(o.interfaceId)}>
                Alert {o.owner}
              </Button>
            ))}
          </Alert>
        )}

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>{`Held and reprocessed records — ${s.queuedErrors.length}`}</SectionBand>
          {s.queuedErrors.length === 0 ? <EmptyState message="The error queue is empty." /> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell sx={{ fontSize: 12 }}>Queue reference</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Interface and owner</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Record</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Failure reason</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Cause class</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Correction path</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Retries</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Status</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Business audit entry</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {s.queuedErrors.map((q) => {
                  const cls = s.causeClassOf(q.id);
                  const path = s.correctionPathFor(cls);
                  const i = forInterface(q.interfaceName);
                  return (
                    <TableRow key={q.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox size="small" checked={selected.includes(q.id)}
                                  disabled={q.status.startsWith('Reprocessed')}
                                  inputProps={{ 'aria-label': `Select ${q.id}` }}
                                  onChange={() => toggle(q.id)} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12.5, fontFamily: 'monospace' }}>{q.id}</TableCell>
                      <TableCell sx={{ fontSize: 11.5 }}>
                        {i ? i.id : q.interfaceName}
                        <Typography sx={{ fontSize: 11, color: tokens.textSecondary }}>
                          {i ? i.businessOwner : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{q.record}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{q.reason}</TableCell>
                      <TableCell>
                        <Chip size="small" label={cls}
                              sx={{
                                fontSize: 10.5,
                                bgcolor: cls === 'Missing mapping' ? `${tokens.orange}1A` : `${tokens.primary}1A`,
                                color: cls === 'Missing mapping' ? tokens.orange : tokens.primary
                              }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 11.5 }}>
                        <Button size="small" onClick={() => navigate(path.route)}>{path.label}</Button>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{q.retriesUsed} of {q.retriesAllowed}</TableCell>
                      <TableCell><StatusChip status={q.status} /></TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {q.status.startsWith('Reprocessed') ? (q.auditRaised ? 'Written' : 'Not written') : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <Box sx={{ p: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined" disabled={selected.length !== 1}
                    onClick={() => {
                      const q = s.queuedErrors.find((x) => x.id === selected[0]);
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
          <SectionBand>Four cause classes, four correction paths — WF-C12-01 / Step 10</SectionBand>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12.5, mb: 1.5 }}>
              Step 10 says the cause is <i>usually a missing mapping or a master data gap</i>, so the class is on the row
              and the correction differs by class. One reprocess button with four different correction paths behind it is
              the honest shape.
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12, width: 180 }}>Cause class</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Correction path</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(['Missing mapping', 'Master data gap', 'Validation failure', 'External error'] as const).map((c) => (
                  <TableRow key={c}>
                    <TableCell sx={{ fontSize: 12.5 }}>{c}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{s.correctionPathFor(c).path}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>

        <OwnershipPanel />

        <HandOffBanner
          label="HAND-OFF"
          target="C5 / WF-C5-01 Event-Driven Notifications"
          passed="Failure and queue-threshold alerts to the interface owner"
          to="/c5/deliveries"
          goLabel="Open the delivery log"
        />
        <ShellFooterNote />
      </Box>

      <Drawer anchor="right" open={!!drawer} onClose={() => setDrawer(null)} PaperProps={{ sx: { width: 560 } }}>
        {drawer && (
          <Box>
            <Box sx={{ bgcolor: tokens.primaryDark, color: '#fff', px: 2.5, py: 2 }}>
              <Typography sx={{ fontSize: 12, opacity: 0.85 }}>Correct the held record — WF-C12-01 / Step 10</Typography>
              <Typography variant="h6">{drawer.record}</Typography>
              <Typography sx={{ fontSize: 12, opacity: 0.85 }}>{drawer.id} · {drawer.interfaceName}</Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Alert severity="warning" sx={{ mb: 2, fontSize: 12.5 }}>{drawer.reason}</Alert>
              <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
                <b>{s.causeClassOf(drawer.id)}.</b> {s.correctionPathFor(s.causeClassOf(drawer.id)).path}
              </Alert>
              <Table size="small">
                <TableBody>
                  {drawer.payload.map((pl) => (
                    <TableRow key={pl.field}>
                      <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{pl.field}</TableCell>
                      <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{pl.value}</TableCell>
                      <TableCell sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
                        {pl.masked ? `masked — ${pl.masked}` : ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TextField label={drawer.correctableField ?? 'Correction'} value={corrected} size="small" fullWidth
                         sx={{ mt: 2 }} onChange={(e) => setCorrected(e.target.value)}
                         helperText={`Current value: ${drawer.currentValue ?? '—'}`} />
              <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
                <Button variant="contained" disabled={!corrected.trim() || corrected === drawer.currentValue}
                        onClick={() => { s.correctQueued(drawer.id, corrected.trim()); setDrawer(null); }}>
                  Save the correction
                </Button>
                <Button variant="outlined"
                        onClick={() => { setDrawer(null); navigate(s.correctionPathFor(s.causeClassOf(drawer.id)).route); }}>
                  {s.correctionPathFor(s.causeClassOf(drawer.id)).label}
                </Button>
              </Stack>
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
              The reprocessing is logged in the same way as the original exchange, so it appears in the log as an ordinary
              exchange carrying a reprocess-of link — WF-C12-01 / Step 10.
            </Typography>
            <Table size="small" sx={{ mt: 1.5 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Record</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Cause</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Correction</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell sx={{ fontSize: 12 }}>{r.record}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{s.causeClassOf(r.id)}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {r.correctedValue
                        ? `${r.correctableField}: ${r.currentValue} → ${r.correctedValue}`
                        : 'Not corrected — reprocessing without correcting sends the same input and will fail again'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <FormControlLabel
              sx={{ mt: 1.5 }}
              control={<Switch size="small" checked={alsoAudit} onChange={(e) => setAlsoAudit(e.target.checked)} />}
              label={
                <Typography sx={{ fontSize: 12.5 }}>
                  Also raise a business audit entry (C08), <b>against the service identity</b>
                </Typography>
              }
            />
            <PlaceholderNote kind="consistency">
              {s.integrationNotes.reprocessAudit.replace('Integration consistency issue: ', '')} The switch is off by
              default. C12's wording answers a question C09's could not — if an entry is written, the actor is the service
              identity — and the prototype still chooses neither reading.
            </PlaceholderNote>
          </Box>
        }
      />
    </>
  );
};
