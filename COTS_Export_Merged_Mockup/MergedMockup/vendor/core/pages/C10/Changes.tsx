import React from 'react';
import {
  Alert, Box, Button, Chip, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Switch, Table,
  TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  ActionBar, ConfirmDialog, EmptyState, FieldGrid, HandOffBanner, PageBanner, PlaceholderNote,
  RecordHeader, SectionBand, SideBySideCompare, StatusChip, WhiteButton
} from '../../components/shared';
import { ChartFrame, DataTableView, HBar } from '../../components/Charts';
import { PARAMETER_CLASSES, affectsAuthority } from '../../mockData/c10';
import { ShellFooterNote } from '../../layouts/AppShell';

/** 3.1 Configuration Change Request List — WF-C10-03 / Steps 1–2 */
export const ChangeRequests: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [cls, setCls] = React.useState('All');
  const [status, setStatus] = React.useState('All');
  const [country, setCountry] = React.useState('All');
  const [authorityOnly, setAuthorityOnly] = React.useState(false);
  const [showByClass, setShowByClass] = React.useState(false);
  const [showByStatus, setShowByStatus] = React.useState(false);

  const rows = s.changeRequests.filter((r) => (
    (cls === 'All' || r.cls === cls)
    && (status === 'All' || r.status === status)
    && (country === 'All' || r.country === country)
    && (!authorityOnly || affectsAuthority(r.cls))
  ));

  const byClass = Array.from(new Set(s.changeRequests.map((r) => r.cls))).map((c) => ({
    label: c, value: s.changeRequests.filter((r) => r.cls === c).length, attention: affectsAuthority(c)
  }));
  const statuses = Array.from(new Set(s.changeRequests.map((r) => r.status)));
  const byStatus = statuses.map((st) => ({
    label: st, value: s.changeRequests.filter((r) => r.status === st).length, attention: st === 'Rejected'
  }));

  return (
    <>
      <PageBanner
        title="Configuration changes"
        breadcrumb={['Global', 'C10 Configuration', 'Configuration changes']}
        subtitle="WF-C10-03 / Steps 1–2 — current and proposed values with a business reason, routed for approval and effective-dated"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c10/versions')}>Version history</WhiteButton>
            <WhiteButton onClick={() => navigate('/c10/countries')}>Countries</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
          <b>The register is not only C10's own changes.</b> An audit level changed on the C08 screen and a log level
          changed on the C09 screen appear here, because both of those screens carry a
          <i> DEPENDENCY → C10 / WF-C10-03</i> banner and this is the module that honours it.
        </Alert>

        <Paper variant="outlined" sx={{ mb: 2, p: 2 }}>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Parameter class</InputLabel>
              <Select label="Parameter class" value={cls} onChange={(e) => setCls(e.target.value)}>
                {['All', ...PARAMETER_CLASSES].map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
                {['All', ...statuses].map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Country</InputLabel>
              <Select label="Country" value={country} onChange={(e) => setCountry(e.target.value)}>
                {['All', 'All countries', ...s.countryConfigs.map((c) => c.country)].map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1} alignItems="center">
              <Switch size="small" checked={authorityOnly}
                      inputProps={{ 'aria-label': 'Affects authority only' }}
                      onChange={(e) => setAuthorityOnly(e.target.checked)} />
              <Typography sx={{ fontSize: 12.5 }}>Affects authority only</Typography>
            </Stack>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>{`Change requests — ${rows.length} of ${s.changeRequests.length}`}</SectionBand>
          {rows.length === 0 ? <EmptyState message="No change request matches these filters." /> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Request</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Parameter class</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Parameter</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Country</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Current → Proposed</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Affects authority</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Approval level</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Status</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Effective from</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Origin</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Button size="small" sx={{ fontFamily: 'monospace', fontSize: 12 }}
                              onClick={() => navigate(`/c10/changes/${r.id}`)}>
                        {r.id}
                      </Button>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{r.cls}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{r.parameter}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{r.country}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      <span style={{ color: tokens.textSecondary }}>{r.currentValue}</span>
                      {' → '}
                      <b>{r.proposedValue}</b>
                    </TableCell>
                    <TableCell>
                      {affectsAuthority(r.cls)
                        ? <Chip size="small" label="Yes" sx={{ fontSize: 11, bgcolor: `${tokens.orange}1A`, color: tokens.orange }} />
                        : <Typography sx={{ fontSize: 12 }}>No</Typography>}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {affectsAuthority(r.cls) ? 'Higher level' : 'Standard configuration route'}
                    </TableCell>
                    <TableCell><StatusChip status={r.status} /></TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{r.effectiveFrom}</TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>
                      {r.originRoute
                        ? <Button size="small" onClick={() => navigate(r.originRoute!)}>{r.originScreen}</Button>
                        : <span style={{ color: tokens.textSecondary }}>C10</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        <PlaceholderNote>{s.configNotes.authority}</PlaceholderNote>

        <ChartFrame
          title="Change requests by parameter class"
          note="Horizontal bars, because the class labels are phrases. The attention colour marks the classes that affect authority."
          tableToggle={<Button size="small" sx={{ mt: 1 }} onClick={() => setShowByClass((v) => !v)}>{showByClass ? 'Hide table' : 'Show as table'}</Button>}
        >
          <HBar rows={byClass} attentionNote="Affects authority" />
          {showByClass && <Box sx={{ mt: 2 }}><DataTableView head={['Parameter class', 'Requests']} rows={byClass.map((r) => [r.label, r.value])} /></Box>}
        </ChartFrame>

        <ChartFrame
          title="Requests by status"
          tableToggle={<Button size="small" sx={{ mt: 1 }} onClick={() => setShowByStatus((v) => !v)}>{showByStatus ? 'Hide table' : 'Show as table'}</Button>}
        >
          <HBar rows={byStatus} attentionNote="Rejected" />
          {showByStatus && <Box sx={{ mt: 2 }}><DataTableView head={['Status', 'Requests']} rows={byStatus.map((r) => [r.label, r.value])} /></Box>}
        </ChartFrame>

        <ShellFooterNote />
      </Box>
    </>
  );
};

/** 3.2 Configuration Change Request Form — WF-C10-03 / Steps 1–3 */
export const ChangeRequestForm: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const r = s.changeRequests.find((x) => x.id === id);
  const [reason, setReason] = React.useState('');
  const [proposed, setProposed] = React.useState('');
  const [effectiveFrom, setEffectiveFrom] = React.useState('');
  const [blocked, setBlocked] = React.useState<string | null>(null);
  const [decide, setDecide] = React.useState<'approve' | 'reject' | null>(null);

  React.useEffect(() => {
    if (r) { setReason(r.reason); setProposed(r.proposedValue); setEffectiveFrom(r.effectiveFrom); }
  }, [r?.id]);

  if (!r) {
    return (
      <>
        <PageBanner title="Change request" breadcrumb={['Global', 'C10 Configuration', 'Change request']} />
        <Box sx={{ p: 3 }}><EmptyState message="That change request could not be found." /></Box>
      </>
    );
  }

  const sim = s.simulateChange(r.id);
  const higher = affectsAuthority(r.cls);
  const editable = r.status === 'Draft';

  return (
    <>
      <PageBanner
        title={`Change request ${r.id}`}
        breadcrumb={['Global', 'C10 Configuration', 'Configuration changes', r.id]}
        subtitle="WF-C10-03 / Steps 1–3 — current and proposed values, a business reason, the approval level and the simulation"
        actions={<WhiteButton onClick={() => navigate('/c10/changes')}>Back to the register</WhiteButton>}
      />
      <RecordHeader
        name={r.parameter}
        status={r.status}
        reference={r.id}
        date={r.requestedAt}
        meta={[
          ['Parameter class', r.cls],
          ['Country', r.country],
          ['Affects authority', higher ? 'Yes' : 'No'],
          ['Effective from', r.effectiveFrom]
        ]}
      />
      <Box sx={{ p: 3 }}>
        {/* Step 1 — current and proposed with a reason */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>The change — WF-C10-03 / Step 1</SectionBand>
          <SideBySideCompare rows={[{ label: r.parameter, current: r.currentValue, proposed: r.proposedValue }]} />
          <Box sx={{ p: 2 }}>
            <Stack spacing={2}>
              {editable && (
                <TextField size="small" label="Proposed value" value={proposed}
                           onChange={(e) => { setProposed(e.target.value); s.saveChangeRequest(r.id, { proposedValue: e.target.value }); }} />
              )}
              <TextField
                size="small" label="Business reason" value={reason} multiline minRows={3}
                InputProps={{ readOnly: !editable }}
                onChange={(e) => { setReason(e.target.value); s.saveChangeRequest(r.id, { reason: e.target.value }); }}
                helperText="A configuration change carries a business reason — WF-C10-03 / Step 1."
              />
              {editable && (
                <TextField size="small" label="Effective from" type="date" value={effectiveFrom}
                           InputLabelProps={{ shrink: true }} sx={{ width: 200 }}
                           onChange={(e) => { setEffectiveFrom(e.target.value); s.saveChangeRequest(r.id, { effectiveFrom: e.target.value }); }} />
              )}
            </Stack>
          </Box>
        </Paper>

        {/* Step 2 — approval level */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Approval level — WF-C10-03 / Step 2</SectionBand>
          <FieldGrid items={[
            ['Parameter class', r.cls],
            ['Affects authority', higher ? 'Yes — approval routes and role definitions affect authority' : 'No'],
            ['Approval level', higher ? 'A higher level of approval is required' : 'The standard configuration approval route applies'],
            ['Requested by', `${r.requestedBy} at ${r.requestedAt}`],
            ['Decided by', r.decidedBy ? `${r.decidedBy} at ${r.decidedAt}` : '—'],
            ['Decision comment', r.decisionComment ?? '—']
          ]} columns={2} />
          <Box sx={{ px: 2, pb: 2 }}>
            <PlaceholderNote>{s.configNotes.authority}</PlaceholderNote>
            <HandOffBanner
              label="HAND-OFF"
              target="C4 / WF-C4-01 Standard Approval Cycle"
              passed="Parameter class, current and proposed values, business reason, and whether the change affects authority"
              returned="Approved / Rejected — rejected leaves the change unapplied and the previous configuration version in force"
            />
          </Box>
        </Paper>

        {/* Step 3 — test environment and simulation */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Test-environment validation — WF-C10-03 / Step 3</SectionBand>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12.5, mb: 1 }}>
              Two models are described in the workflow and neither is selected:
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 1.5 }}>
              <Paper variant="outlined" sx={{ flex: 1, p: 1.5 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>Controlled transport</Typography>
                <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>
                  Configuration is maintained in a test environment, validated there, and promoted to production through a
                  controlled transport.
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ flex: 1, p: 1.5, borderColor: tokens.primary }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>Maintained in production under approval</Typography>
                <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>
                  Configuration is changed directly in production, controlled by the approval and effective dating rather
                  than by a transport. <b>The prototype has one environment and behaves as this model.</b>
                </Typography>
              </Paper>
            </Stack>
            <PlaceholderNote>{s.configNotes.environment}</PlaceholderNote>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Simulation of the affected process — WF-C10-03 / Step 3</SectionBand>
          <Box sx={{ p: 2 }}>
            {sim.kind === 'none' && <Alert severity="info" sx={{ fontSize: 12.5 }}>{sim.why}</Alert>}
            {sim.kind === 'route' && (
              <>
                <Typography sx={{ fontSize: 12.5, mb: 1 }}>{sim.why}</Typography>
                <SideBySideCompare rows={[{ label: 'Route that resolves', current: sim.before ?? '—', proposed: sim.after ?? '—' }]} />
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
                  <Paper variant="outlined" sx={{ flex: 1, p: 1.5 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}>Before — resolution reasons</Typography>
                    {(sim.beforeReasons ?? []).map((x, n) => (
                      <Typography key={n} sx={{ fontSize: 12, color: tokens.textSecondary }}>· {x}</Typography>
                    ))}
                  </Paper>
                  <Paper variant="outlined" sx={{ flex: 1, p: 1.5, borderColor: tokens.primary }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}>After — resolution reasons</Typography>
                    {(sim.afterReasons ?? []).map((x, n) => (
                      <Typography key={n} sx={{ fontSize: 12, color: tokens.textSecondary }}>· {x}</Typography>
                    ))}
                  </Paper>
                </Stack>
              </>
            )}
            {sim.kind === 'mandatoryStep' && (
              <>
                <SideBySideCompare rows={[{ label: 'The process in this country', current: sim.before ?? '—', proposed: sim.after ?? '—' }]} />
                <Typography sx={{ fontSize: 12.5, mt: 2, mb: 1 }}>{sim.why}</Typography>
                {(sim.affected ?? []).length === 0
                  ? <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>No open record was created under the current version.</Typography>
                  : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontSize: 12 }}>Open record</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>Created</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>Continues under</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(sim.affected ?? []).map((a) => (
                          <TableRow key={a.reference}>
                            <TableCell sx={{ fontSize: 12.5 }}>{a.reference}</TableCell>
                            <TableCell sx={{ fontSize: 12 }}>{a.created}</TableCell>
                            <TableCell sx={{ fontSize: 12 }}>Configuration version {a.version}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
              </>
            )}
          </Box>
        </Paper>

        <ActionBar
          left={<Button variant="outlined" onClick={() => navigate('/c10/changes')}>Back to the register</Button>}
          right={
            <Stack direction="row" spacing={1}>
              {r.status === 'Draft' && (
                <Button variant="contained" onClick={() => {
                  const res = s.submitChangeRequest(r.id);
                  setBlocked(res.ok ? null : (res.why ?? null));
                }}>
                  Submit for approval
                </Button>
              )}
              {r.status === 'Pending approval' && (
                <>
                  <Button variant="outlined" color="error" onClick={() => setDecide('reject')}>Reject</Button>
                  <Button variant="contained" onClick={() => setDecide('approve')}>Approve</Button>
                </>
              )}
              {r.status === 'Approved — awaiting effective date' && (
                <Button variant="outlined" onClick={() => s.applyEffective(r.id)}>
                  Bring forward to today (prototype control)
                </Button>
              )}
            </Stack>
          }
        />
        {blocked && <Alert severity="error" sx={{ mt: 2, fontSize: 12.5 }}>{blocked}</Alert>}
        <ShellFooterNote />
      </Box>

      <ConfirmDialog
        open={decide !== null}
        title={decide === 'approve' ? `Approve ${r.id}` : `Reject ${r.id}`}
        confirmLabel={decide === 'approve' ? 'Approve' : 'Reject'}
        confirmColor={decide === 'approve' ? 'primary' : 'error'}
        commentLabel="Decision comment"
        commentRequired
        onClose={() => setDecide(null)}
        body={
          <Typography sx={{ fontSize: 13.5 }}>
            {decide === 'approve'
              ? `Approved changes are versioned and effective-dated. New transactions are created under the new version from ${r.effectiveFrom}; transactions already in progress continue under the version in force when they were created — WF-C10-03 / Step 4.`
              : 'Rejected, the change is not applied and the previous configuration version remains in force — WF-C10-01 / Step 7 and WF-C10-03 / Step 4.'}
          </Typography>
        }
        onConfirm={(comment) => s.decideChangeRequest(r.id, decide === 'approve', comment)}
      />
    </>
  );
};
