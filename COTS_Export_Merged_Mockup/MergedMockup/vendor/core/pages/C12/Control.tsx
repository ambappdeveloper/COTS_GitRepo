import React from 'react';
import {
  Alert, Box, Button, Chip, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, Typography
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  EmptyState, FieldGrid, HandOffBanner, PageBanner, PlaceholderNote, RecordHeader, SectionBand,
  StatusChip, WhiteButton
} from '../../components/shared';
import { ChartFrame, DataTableView, HBar, KpiTile } from '../../components/Charts';
import { ShellFooterNote } from '../../layouts/AppShell';

const stateColour = (st: string) =>
  st === 'Healthy' ? tokens.green
    : st === 'Over queue threshold' ? tokens.red
      : st === 'Not active' ? tokens.grey
        : tokens.amber;

/** 3.1 Reconciliation Report — WF-C12-03 / Steps 1–2 */
export const Reconciliation: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const reconcilable = s.interfaces.filter((i) => i.reconcilable);
  const notReconcilable = s.interfaces.filter((i) => !i.reconcilable);
  const [iface, setIface] = React.useState(reconcilable[0]?.id ?? '');
  const [period, setPeriod] = React.useState('August 2026');
  const runs = s.reconFor(iface);

  return (
    <>
      <PageBanner
        title="Reconciliation"
        breadcrumb={['Global', 'C12 Integration Layer', 'Reconciliation']}
        subtitle="WF-C12-03 / Steps 1–2 — COTS against the source system for the period: matched, unmatched and differing"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c12/health')}>Interface health</WhiteButton>
            <WhiteButton onClick={() => navigate('/c11/reports')}>C11 report catalogue</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
          Step 1 applies to <b>each interface carrying quantities or values</b>, so this screen names which those are and
          which are out of its scope — rather than offering reconciliation for an interface that has nothing to reconcile.
          Out of scope: {notReconcilable.map((i) => i.name).join(', ')}.
        </Alert>

        <Paper variant="outlined" sx={{ mb: 2, p: 2 }}>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 340 }}>
              <InputLabel>Interface</InputLabel>
              <Select label="Interface" value={iface} inputProps={{ 'aria-label': 'Interface' }}
                      onChange={(e) => setIface(e.target.value)}>
                {reconcilable.map((i) => <MenuItem key={i.id} value={i.id} sx={{ fontSize: 13 }}>{i.id} {i.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Period</InputLabel>
              <Select label="Period" value={period} inputProps={{ 'aria-label': 'Period' }}
                      onChange={(e) => setPeriod(e.target.value)}>
                {['August 2026', 'July 2026', 'June 2026'].map((x) => <MenuItem key={x} value={x} sx={{ fontSize: 13 }}>{x}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="contained" onClick={() => s.runReconciliation(iface, period)}>
              Run the reconciliation
            </Button>
          </Stack>
        </Paper>

        {runs.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <EmptyState message={`No reconciliation has been run for ${s.interfaceById(iface)?.name}.`}
                        hint="Run one for a period to compare COTS against the source system." />
          </Paper>
        ) : runs.map((r) => (
          <Paper variant="outlined" sx={{ mb: 2 }} key={r.id}>
            <SectionBand>{`${r.id} · ${r.period} · run ${r.ranAt}`}</SectionBand>
            <Box sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2, mb: 2 }}>
                <KpiTile value={r.matched.length} label="Matched" tone="good" />
                <KpiTile value={r.cotsOnly.length} label="In COTS only" tone={r.cotsOnly.length ? 'attention' : 'primary'} />
                <KpiTile value={r.sourceOnly.length} label="In the source only" tone={r.sourceOnly.length ? 'attention' : 'primary'} />
                <KpiTile value={r.differing.length} label="Differing" tone={r.differing.length ? 'attention' : 'primary'} />
              </Stack>
              <Alert severity={r.outcome === 'Clean for the period' ? 'success' : 'warning'} sx={{ fontSize: 12.5, mb: 2 }}>
                <b>{r.outcome}.</b>{' '}
                {r.outcome === 'Clean for the period'
                  ? 'Recorded as clean, which matters as much as recording a difference — it is the evidence that the control ran.'
                  : `Referred to the business owner ${r.referredTo} at ${r.referredAt}, for investigation using the correlation reference.`}
              </Alert>

              {[
                ['In the source only — usually a failed exchange', r.sourceOnly],
                ['Differing', r.differing],
                ['In COTS only', r.cotsOnly]
              ].map(([title, lines]) => {
                const rows = lines as typeof r.differing;
                if (rows.length === 0) return null;
                return (
                  <Box key={title as string} sx={{ mb: 2 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 500, mb: 0.5 }}>{title as string}</Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontSize: 12 }}>Reference</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>Record</TableCell>
                          <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>COTS</TableCell>
                          <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>Source</TableCell>
                          <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>Difference</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>Investigate</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((l) => (
                          <TableRow key={l.ref} hover>
                            <TableCell sx={{ fontSize: 12.5, fontFamily: 'monospace' }}>{l.ref}</TableCell>
                            <TableCell sx={{ fontSize: 12 }}>{l.record}</TableCell>
                            <TableCell sx={{ fontSize: 12.5, textAlign: 'right' }}>{l.cotsValue} {l.unit}</TableCell>
                            <TableCell sx={{ fontSize: 12.5, textAlign: 'right' }}>
                              {l.sourceValue === null ? '—' : `${l.sourceValue} ${l.unit}`}
                            </TableCell>
                            <TableCell sx={{ fontSize: 12.5, textAlign: 'right', color: tokens.orange }}>
                              {l.sourceValue === null ? '—' : `${(l.cotsValue - l.sourceValue).toFixed(0)} ${l.unit}`}
                            </TableCell>
                            <TableCell>
                              <Button size="small" onClick={() => navigate(`/c12/reconciliation/${r.id}?line=${l.ref}`)}>
                                Open the difference
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        ))}

        <HandOffBanner
          label="HAND-OFF"
          target="C11 / WF-C11-01 Running a Report"
          passed="The reconciliation report is produced through the reporting engine, with its parameter panel, row-level security and export — this screen is the working view"
          to="/c11/reports"
          goLabel="Open the report catalogue"
        />
        <ShellFooterNote />
      </Box>
    </>
  );
};

/** 3.2 Difference Investigation — WF-C12-03 / Steps 3–4 */
export const DifferenceInvestigation: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const run = s.reconById(id);
  const lineRef = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('line');

  if (!run) {
    return (
      <>
        <PageBanner title="Difference" breadcrumb={['Global', 'C12 Integration Layer', 'Difference']} />
        <Box sx={{ p: 3 }}><EmptyState message="That reconciliation could not be found." /></Box>
      </>
    );
  }

  const all = [...run.differing, ...run.sourceOnly, ...run.cotsOnly];
  const line = all.find((l) => l.ref === lineRef) ?? all[0];
  const i = s.interfaceById(run.interfaceId);
  const ex = line?.correlation ? s.exchangeByCorrelation(line.correlation) : undefined;
  const stages = line?.correlation ? s.stagesFor(line.correlation) : undefined;
  const logs = line?.correlation ? s.logEntries.filter((l) => l.correlation === line.correlation) : [];
  const queued = line?.correlation ? s.queuedErrors.filter((q) => q.correlation === line.correlation) : [];

  if (!line) {
    return (
      <>
        <PageBanner title="Difference" breadcrumb={['Global', 'C12 Integration Layer', 'Difference']} />
        <Box sx={{ p: 3 }}>
          <EmptyState message="This reconciliation has no differences to investigate." hint="It was recorded as clean for the period." />
        </Box>
      </>
    );
  }

  return (
    <>
      <PageBanner
        title={`Difference ${line.ref}`}
        breadcrumb={['Global', 'C12 Integration Layer', 'Reconciliation', run.id, line.ref]}
        subtitle="WF-C12-03 / Steps 3–4 — investigated using the correlation reference, which gives the full trail of the exchange"
        actions={<WhiteButton onClick={() => navigate('/c12/reconciliation')}>Back to reconciliation</WhiteButton>}
      />
      <RecordHeader
        name={line.record}
        status={run.outcome === 'Clean for the period' ? 'Active' : 'Pending Approval'}
        reference={line.ref}
        date={run.ranAt}
        meta={[
          ['Interface', i?.name ?? run.interfaceId],
          ['Period', run.period],
          ['Business owner', run.referredTo ?? i?.businessOwner ?? '—']
        ]}
      />
      <Box sx={{ p: 3 }}>
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>The difference</SectionBand>
          <FieldGrid items={[
            ['Record', line.record],
            ['COTS holds', `${line.cotsValue} ${line.unit}`],
            ['The source holds', line.sourceValue === null ? 'nothing — the record does not exist there' : `${line.sourceValue} ${line.unit}`],
            ['Difference', line.sourceValue === null ? '—' : `${(line.cotsValue - line.sourceValue).toFixed(0)} ${line.unit}`],
            ['What the trail shows', line.introducedAt ?? 'No exchange is associated with this record, which is itself the finding'],
            ['Note', line.note ?? '—']
          ]} columns={2} />
        </Paper>

        <Paper variant="outlined" sx={{ mb: 2, borderLeft: `4px solid ${tokens.primary}` }}>
          <SectionBand>The full trail, from one correlation reference — WF-C12-03 / Step 3</SectionBand>
          <Box sx={{ p: 2 }}>
            {!line.correlation ? (
              <Alert severity="info" sx={{ fontSize: 12.5 }}>
                This record has no correlation reference because it was not created by an exchange — it was keyed manually
                under the interface's documented fallback and marked as locally entered. That is the explanation, and it is
                a legitimate one.
              </Alert>
            ) : (
              <>
                <Typography sx={{ fontSize: 12.5, mb: 1.5 }}>
                  Every module since C03 has carried the correlation reference. This is the screen where it earns its
                  place: <b>{line.correlation}</b> leads from a difference in a reconciliation to the exact exchange, the
                  exact stage and the exact mapping that caused it.
                </Typography>
                <FieldGrid items={[
                  ['Exchange', ex
                    ? <Button size="small" sx={{ fontFamily: 'monospace', fontSize: 12 }} onClick={() => navigate(`/c12/exchanges/${line.correlation}`)}>{ex.correlation} — {ex.outcome}</Button>
                    : line.correlation],
                  ['Stage where it was introduced', line.introducedAt ?? '—'],
                  ['Records held from that exchange', queued.length
                    ? <Button size="small" onClick={() => navigate('/c12/error-queue')}>{queued.length} in the error queue</Button>
                    : 'None'],
                  ['Log entries carrying the reference', `${logs.length}`]
                ]} columns={2} />
                {stages && (
                  <Table size="small" sx={{ mt: 1 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: 12 }}>Stage</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>Result</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>What it produced</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stages.map((st) => (
                        <TableRow key={st.key}>
                          <TableCell sx={{ fontSize: 12.5 }}>{st.key}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{st.state}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{st.detail}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </>
            )}
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Correction and re-run — WF-C12-03 / Step 4</SectionBand>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12.5, mb: 1.5 }}>
              Corrections are made at source or through the error queue and reprocessing, and the reconciliation is then
              re-run for the period.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              <Button size="small" variant="outlined" onClick={() => navigate('/c12/error-queue')}>
                Correct through the error queue
              </Button>
              <Button size="small" variant="outlined" onClick={() => navigate('/c3/mapping')}>
                Create the missing mapping in C03
              </Button>
              <Button size="small" variant="contained"
                      onClick={() => { s.runReconciliation(run.interfaceId, run.period); navigate('/c12/reconciliation'); }}>
                Re-run the reconciliation for {run.period}
              </Button>
            </Stack>
          </Box>
        </Paper>

        <HandOffBanner
          label="DEPENDENCY"
          target="C9 / WF-C9-02 Integration and Job Logging"
          passed="The correlation reference gives the full trail of the exchange"
          to={line.correlation ? `/c9/exchanges/${line.correlation}` : '/c9/exchanges'}
          goLabel="Open the C09 trail"
        />
        <ShellFooterNote />
      </Box>
    </>
  );
};

/** 3.3 Interface Health — WF-C12-03 / Step 5 */
export const InterfaceHealth: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const rows = s.interfaceHealth();
  const [showTable, setShowTable] = React.useState(false);

  const byQueue = rows.filter((r) => r.queueDepth > 0)
    .map((r) => ({ label: r.name, value: r.queueDepth, attention: true }));

  return (
    <>
      <PageBanner
        title="Interface health"
        breadcrumb={['Global', 'C12 Integration Layer', 'Interface health']}
        subtitle="WF-C12-03 / Step 5 — last successful run, failure count, queue depth and average duration"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c11/reports/R-12')}>The same four measures as a C11 report</WhiteButton>
            <WhiteButton onClick={() => navigate('/c9')}>C09 system health</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
          Step 5 says interface health is presented on the administration dashboard (C11). C11 built its administration
          reporting on the principle that a placement is taken over without being duplicated, and C12 follows it: these
          four measures are <b>one computation with two presentations</b>, and both screens say so.
        </Alert>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Health per interface</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Interface</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Last successful run</TableCell>
                <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>Failures</TableCell>
                <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>Queue depth</TableCell>
                <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>Average duration</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Technical owner</TableCell>
                <TableCell sx={{ fontSize: 12 }}>State</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.interfaceId} hover sx={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/c12/interfaces/${r.interfaceId}`)}>
                  <TableCell sx={{ fontSize: 12.5 }}>{r.interfaceId} {r.name}</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>{r.lastSuccess ?? 'No successful run recorded'}</TableCell>
                  <TableCell sx={{ fontSize: 12.5, textAlign: 'right' }}>{r.failures}</TableCell>
                  <TableCell sx={{ fontSize: 12.5, textAlign: 'right' }}>{r.queueDepth}</TableCell>
                  <TableCell sx={{ fontSize: 12.5, textAlign: 'right' }}>{r.avgMs ? `${r.avgMs} ms` : '—'}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{r.owner}</TableCell>
                  <TableCell>
                    <Chip size="small" label={r.state}
                          sx={{ fontSize: 10.5, bgcolor: `${stateColour(r.state)}1A`, color: stateColour(r.state) }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        {byQueue.length > 0 && (
          <ChartFrame
            title="Records held per interface"
            note="Horizontal bars, because the interface names are phrases. Anything held is shown in the attention colour, because a held record is a record the business does not have."
            tableToggle={<Button size="small" sx={{ mt: 1 }} onClick={() => setShowTable((v) => !v)}>{showTable ? 'Hide table' : 'Show as table'}</Button>}
          >
            <HBar rows={byQueue} attentionNote="Held in the error queue" />
            {showTable && <Box sx={{ mt: 2 }}><DataTableView head={['Interface', 'Records held']} rows={byQueue.map((r) => [r.label, r.value])} /></Box>}
          </ChartFrame>
        )}

        <HandOffBanner
          label="HAND-OFF"
          target="C11 / WF-C11-02 Dashboards and Scheduled Distribution"
          passed="Interface health on the administration dashboard — the same four measures, one computation, two presentations"
          to="/c11/reports/R-12"
          goLabel="Open the C11 report"
        />
        <ShellFooterNote />
      </Box>
    </>
  );
};

/** 3.4 Credential Rotation Register — WF-C12-03 / Steps 6–7 */
export const Credentials: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();

  return (
    <>
      <PageBanner
        title="Credential rotation"
        breadcrumb={['Global', 'C12 Integration Layer', 'Credentials']}
        subtitle="WF-C12-03 / Steps 6–7 — rotations recorded on the defined cycle, and the data exchanged limited to what the process requires"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c8/search')}>C08 audit trail</WhiteButton>
            <WhiteButton onClick={() => navigate('/c9/levels')}>C09 masking rules</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <PlaceholderNote>{s.integrationNotes.credential}</PlaceholderNote>

        <Paper variant="outlined" sx={{ mb: 2, mt: 2 }}>
          <SectionBand>Credentials and their rotation cycle — Step 6</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Credential reference</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Interface</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Cycle</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Last rotated</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Next due</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Rotate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {s.interfaces.map((i) => {
                const rot = s.rotationStateOf(i.id);
                return (
                  <TableRow key={i.id} hover>
                    <TableCell sx={{ fontSize: 12.5, fontFamily: 'monospace' }}>{i.credentialRef}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{i.id} {i.name}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Every {i.rotationDays} days</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{i.lastRotated}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {rot.nextDue}
                      {rot.overdue && (
                        <Chip size="small" label={`overdue by ${rot.daysOver} days`}
                              sx={{ ml: 0.5, height: 18, fontSize: 10, bgcolor: `${tokens.red}1A`, color: tokens.red }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Button size="small" variant="outlined" onClick={() => s.rotateCredential(i.id)}>
                        Record a rotation
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
              This screen never asks for the new secret. Rotation is performed in the credential store; the register records
              that it happened, which is exactly what Step 6 asks for, and the record is written to the C08 audit trail as a
              sensitive action.
            </Typography>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Rotations recorded</SectionBand>
          {s.rotations.length === 0 ? <EmptyState message="No rotation is recorded." /> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Rotation</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Credential</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Interface</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>At</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {s.rotations.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{r.id}</TableCell>
                    <TableCell sx={{ fontSize: 12.5, fontFamily: 'monospace' }}>{r.credentialRef}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{s.interfaceById(r.interfaceId)?.name ?? r.interfaceId}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{r.at}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{r.by}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        {/* Step 7 — data minimisation, stated rather than assumed */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>What each interface exchanges, and what it deliberately does not — Step 7</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Interface</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Data scope</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Deliberately not exchanged</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Masked in the logs</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {s.interfaces.map((i) => (
                <TableRow key={i.id}>
                  <TableCell sx={{ fontSize: 12.5 }}>{i.id} {i.name}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{i.dataScope}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    {i.notExchanged.length ? i.notExchanged.join('; ') : '—'}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    {i.maskedFields.length ? i.maskedFields.join(', ') : 'Nothing sensitive is carried'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
              Data exchanged is limited to what the business process requires, in line with the data protection
              requirements, and sensitive fields are masked in the logs. The masking is enforced by the C09 rules rather
              than a second mechanism invented here.
            </Typography>
            <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/c9/levels')}>Open the C09 masking rules</Button>
          </Box>
        </Paper>

        <HandOffBanner
          label="HAND-OFF"
          target="C8 / WF-C8-01 Capturing an Audit Entry"
          passed="Each credential rotation is recorded as a sensitive action"
          to="/c8/search"
          goLabel="Open the audit search"
        />
        <ShellFooterNote />
      </Box>
    </>
  );
};
