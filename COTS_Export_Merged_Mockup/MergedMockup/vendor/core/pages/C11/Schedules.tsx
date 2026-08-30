import React from 'react';
import {
  Alert, Box, Button, Chip, FormControl, InputLabel, MenuItem, OutlinedInput, Paper, Select, Stack, Table,
  TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  EmptyState, FieldGrid, HandOffBanner, PageBanner, PlaceholderNote, RecordHeader, SectionBand, StatusChip,
  WhiteButton
} from '../../components/shared';
import { BUSINESS_EVENTS, EXPORT_LAYOUTS, ExportLayout, REPORTS, ScheduleTrigger, reportDef } from '../../mockData/c11';
import { ShellFooterNote } from '../../layouts/AppShell';

const TRIGGERS: ScheduleTrigger[] = ['Daily', 'Weekly', 'Monthly', 'Business event'];
const ROLES = ['SYSTEM_ADMINISTRATOR', 'COUNTRY_MANAGER', 'COMPLIANCE_OFFICER', 'SOURCING_OFFICER'];

/** 2.3 Schedule List — WF-C11-02 / Step 5 */
export const ScheduleList: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();

  return (
    <>
      <PageBanner
        title="Schedules"
        breadcrumb={['Global', 'C11 Reporting and Dashboards', 'Schedules']}
        subtitle="WF-C11-02 / Step 5 — daily, weekly, monthly or on a business event, to named recipients and roles"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c11/distribution')}>Distribution log</WhiteButton>
            <WhiteButton onClick={() => navigate('/c5/deliveries')}>C05 delivery log</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
          <b>Internal Stakeholder users are the reason this screen exists.</b> Step 5 states that scheduled distribution
          is the primary mechanism serving them — people who need information and occasional action rather than
          day-to-day system use. A delivery mechanism designed for people who do not log in is easy to build as an
          afterthought and hard to justify afterwards, so the recipient type is on the list.
        </Alert>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>{`Schedules — ${s.schedules.length}`}</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Schedule</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Report</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Trigger</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Recipients</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Format</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Owner</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Last run</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Next run</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {s.schedules.map((sc) => {
                const recips = s.recipientsOf(sc.id);
                const stakeholder = recips.some((r) => r.type === 'Internal Stakeholder');
                const external = recips.some((r) => r.external);
                return (
                  <TableRow key={sc.id} hover>
                    <TableCell>
                      <Button size="small" sx={{ fontFamily: 'monospace', fontSize: 12 }}
                              onClick={() => navigate(`/c11/schedules/${sc.id}`)}>
                        {sc.id}
                      </Button>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{sc.report} {reportDef(sc.report)?.name}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {sc.trigger === 'Business event'
                        ? <>
                          <Chip size="small" label="Business event" sx={{ fontSize: 10.5, bgcolor: `${tokens.primary}1A`, color: tokens.primary }} />
                          <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>{sc.timeOrEvent}</Typography>
                        </>
                        : <>{sc.trigger} · {sc.timeOrEvent}</>}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {recips.length} recipient{recips.length === 1 ? '' : 's'}
                      {stakeholder && (
                        <Chip size="small" label="Internal Stakeholder" variant="outlined" sx={{ ml: 0.5, height: 17, fontSize: 10 }} />
                      )}
                      {external && (
                        <Chip size="small" label="External" variant="outlined" sx={{ ml: 0.5, height: 17, fontSize: 10, color: tokens.amber, borderColor: tokens.amber }} />
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{sc.format}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{sc.owner}</TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>
                      {sc.lastRun ?? '—'}
                      {sc.lastOutcome && (
                        <Typography sx={{ fontSize: 11, color: sc.lastOutcome.startsWith('Failed') ? tokens.red : tokens.textSecondary }}>
                          {sc.lastOutcome}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>{sc.nextRun}</TableCell>
                    <TableCell><StatusChip status={sc.status === 'Failing' ? 'Permanently failed' : sc.status} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>

        {/* the prototype control C09 established */}
        <Paper variant="outlined" sx={{ mb: 2, borderStyle: 'dashed', borderWidth: 2, borderColor: tokens.orange }}>
          <Box sx={{ px: 2, py: 1, bgcolor: `${tokens.orange}12` }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: tokens.orange }}>
              Prototype control — not a product feature
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
              A schedule that only fires on a real clock cannot be reviewed in a walkthrough. Running one here produces
              real deliveries with real per-recipient row counts, a real C05 delivery row, and on the failing schedule a
              real C09 log entry reported to the owner.
            </Typography>
          </Box>
          <Box sx={{ p: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {s.schedules.map((sc) => (
              <Button key={sc.id} size="small" variant="outlined"
                      color={sc.status === 'Failing' ? 'warning' : 'primary'}
                      onClick={() => s.runSchedule(sc.id)}>
                Run {sc.id} now
              </Button>
            ))}
          </Box>
        </Paper>

        <ShellFooterNote />
      </Box>
    </>
  );
};

/** 2.4 Schedule Form — WF-C11-02 / Steps 5–6 */
export const ScheduleForm: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const sc = s.schedules.find((x) => x.id === id);

  if (!sc) {
    return (
      <>
        <PageBanner title="Schedule" breadcrumb={['Global', 'C11 Reporting and Dashboards', 'Schedule']} />
        <Box sx={{ p: 3 }}><EmptyState message="That schedule could not be found." /></Box>
      </>
    );
  }

  const recips = s.recipientsOf(sc.id);
  const distinct = Array.from(new Set(recips.map((r) => r.rows)));

  return (
    <>
      <PageBanner
        title={`Schedule ${sc.id}`}
        breadcrumb={['Global', 'C11 Reporting and Dashboards', 'Schedules', sc.id]}
        subtitle="WF-C11-02 / Steps 5–6 — the trigger, the recipients, and the security context each report is generated in"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => s.runSchedule(sc.id)}>Run it now</WhiteButton>
            <WhiteButton onClick={() => navigate('/c11/schedules')}>All schedules</WhiteButton>
          </Stack>
        }
      />
      <RecordHeader
        name={reportDef(sc.report)?.name ?? sc.report}
        status={sc.status === 'Failing' ? 'Permanently failed' : sc.status}
        reference={sc.id}
        date={sc.lastRun}
        meta={[['Trigger', sc.trigger], ['Owner', sc.owner], ['Format', sc.format], ['Recipients', recips.length]]}
      />
      <Box sx={{ p: 3 }}>
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>The schedule</SectionBand>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 320 }}>
                <InputLabel>Report</InputLabel>
                <Select label="Report" value={sc.report} inputProps={{ 'aria-label': 'Report' }}
                        onChange={(e) => s.saveSchedule(sc.id, { report: e.target.value })}>
                  {REPORTS.map((r) => <MenuItem key={r.id} value={r.id} sx={{ fontSize: 13 }}>{r.id} {r.name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Trigger</InputLabel>
                <Select label="Trigger" value={sc.trigger} inputProps={{ 'aria-label': 'Trigger' }}
                        onChange={(e) => s.saveSchedule(sc.id, { trigger: e.target.value as ScheduleTrigger })}>
                  {TRIGGERS.map((t) => <MenuItem key={t} value={t} sx={{ fontSize: 13 }}>{t}</MenuItem>)}
                </Select>
              </FormControl>
              {sc.trigger === 'Business event' ? (
                <FormControl size="small" sx={{ minWidth: 320 }}>
                  <InputLabel>Business event</InputLabel>
                  <Select label="Business event" value={sc.timeOrEvent}
                          inputProps={{ 'aria-label': 'Business event' }}
                          onChange={(e) => s.saveSchedule(sc.id, { timeOrEvent: e.target.value })}>
                    {BUSINESS_EVENTS.map((b) => <MenuItem key={b} value={b} sx={{ fontSize: 13 }}>{b}</MenuItem>)}
                  </Select>
                </FormControl>
              ) : (
                <TextField size="small" label="Time" value={sc.timeOrEvent} sx={{ minWidth: 240 }}
                           onChange={(e) => s.saveSchedule(sc.id, { timeOrEvent: e.target.value })} />
              )}
              <FormControl size="small" sx={{ minWidth: 260 }}>
                <InputLabel>Recipient roles</InputLabel>
                <Select
                  multiple label="Recipient roles" value={sc.roleRecipients} input={<OutlinedInput label="Recipient roles" />}
                  inputProps={{ 'aria-label': 'Recipient roles' }}
                  renderValue={(v) => (v as string[]).map((r) => r.replace(/_/g, ' ').toLowerCase()).join(', ') || 'None'}
                  onChange={(e) => s.saveSchedule(sc.id, { roleRecipients: typeof e.target.value === 'string' ? [e.target.value] : e.target.value })}
                >
                  {ROLES.map((r) => <MenuItem key={r} value={r} sx={{ fontSize: 13 }}>{r.replace(/_/g, ' ').toLowerCase()}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Format</InputLabel>
                <Select label="Format" value={sc.format} inputProps={{ 'aria-label': 'Format' }}
                        onChange={(e) => s.saveSchedule(sc.id, { format: e.target.value as ExportLayout })}>
                  {EXPORT_LAYOUTS.map((x) => <MenuItem key={x} value={x} sx={{ fontSize: 13 }}>{x}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <FieldGrid items={[
              ['Named recipients', sc.namedRecipients.join(', ') || 'None'],
              ['Parameters', Object.entries(sc.params).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'defaults'],
              ['Channels', 'From the C05 channel policy for the priority class'],
              ['Country parameter', 'Resolved per recipient — not fixed on the schedule']
            ]} columns={2} />
          </Box>
        </Paper>

        {/* Step 6 — the per-recipient security context, previewed before saving */}
        <Paper variant="outlined" sx={{ mb: 2, borderColor: tokens.primary }}>
          <SectionBand>Security context per recipient — WF-C11-02 / Step 6</SectionBand>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 13, mb: 1.5 }}>
              <b>Each scheduled report is generated in the security context of the recipient, not of the scheduler, so it
              can never deliver data the recipient may not see.</b> The preview below runs the report once per recipient,
              so a difference is visible before the schedule is saved rather than after it delivers.
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Recipient</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Type</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Security context applied</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Rows they will receive</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recips.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell sx={{ fontSize: 12.5 }}>{r.name}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{r.type}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{r.context}</TableCell>
                    <TableCell sx={{ fontSize: 12.5, fontWeight: 500 }}>{r.rows}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {distinct.length > 1 && (
              <Alert severity="warning" sx={{ mt: 2, fontSize: 12.5 }}>
                <b>The recipients will receive different row counts</b> — {distinct.join(', ')} — because their scopes
                differ. The schedule owner sees this before saving; the alternative is discovering it when someone asks
                why their copy is shorter.
              </Alert>
            )}
            {recips.some((r) => r.external) && (
              <Alert severity="info" sx={{ mt: 2, fontSize: 12.5 }}>
                An external recipient has the party restriction applied — the same Step 4 filter reaching the scheduled
                path, not a separate rule.
              </Alert>
            )}
          </Box>
        </Paper>

        <HandOffBanner
          label="HAND-OFF"
          target="C5 / WF-C5-01 Event-Driven Notifications"
          passed="Scheduled distribution through the configured channels — the delivery appears in the C05 delivery log like any other"
          to="/c5/deliveries"
          goLabel="Open the delivery log"
        />
        <ShellFooterNote />
      </Box>
    </>
  );
};

/** 2.5 Distribution Log — WF-C11-02 / Step 7 */
export const DistributionLog: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const failures = s.distribution.filter((d) => d.outcome === 'Failed');

  return (
    <>
      <PageBanner
        title="Distribution log"
        breadcrumb={['Global', 'C11 Reporting and Dashboards', 'Distribution log']}
        subtitle="WF-C11-02 / Step 7 — delivered closes the run; failed is logged (C9) and reported to the schedule owner"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c11/schedules')}>Schedules</WhiteButton>
            <WhiteButton onClick={() => navigate('/c9/levels')}>C09 technical log</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        {failures.length > 0 && (
          <Alert severity="error" sx={{ mb: 2, fontSize: 12.5 }}>
            <b>{failures.length} distribution{failures.length === 1 ? '' : 's'} failed.</b> Each is logged in C09 and
            reported to the schedule owner — not to the recipient, who did not ask for it, and not silently.
          </Alert>
        )}

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>{`Distribution runs — ${s.distribution.length}`}</SectionBand>
          {s.distribution.length === 0 ? <EmptyState message="No schedule has run." /> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Run</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>At</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Schedule</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Report</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Recipient</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Security context</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>Rows</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Channel</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Outcome</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Reported to</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {s.distribution.map((d) => (
                  <TableRow key={d.id} hover>
                    <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{d.id}</TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>{d.at}</TableCell>
                    <TableCell>
                      <Button size="small" sx={{ fontFamily: 'monospace', fontSize: 12 }}
                              onClick={() => navigate(`/c11/schedules/${d.schedule}`)}>{d.schedule}</Button>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{d.report}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {d.recipient}
                      <Typography sx={{ fontSize: 11, color: tokens.textSecondary }}>{d.recipientType}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>{d.context}</TableCell>
                    <TableCell sx={{ fontSize: 12.5, textAlign: 'right' }}>{d.rows}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{d.channel}</TableCell>
                    <TableCell>
                      <Chip size="small" label={d.outcome}
                            sx={{
                              fontSize: 11,
                              bgcolor: d.outcome === 'Delivered' ? `${tokens.green}1A` : `${tokens.red}1A`,
                              color: d.outcome === 'Delivered' ? tokens.green : tokens.red
                            }} />
                      {d.failureDetail && (
                        <Typography sx={{ fontSize: 11, color: tokens.textSecondary }}>{d.failureDetail}</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {d.reportedTo ?? '—'}
                      {d.logRef && (
                        <Button size="small" onClick={() => navigate('/c9/levels')}>{d.logRef}</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
              The row count is recorded per recipient, so a differing count is visible in the record rather than only in
              the preview. The same failure can be read from three sides: here, in the C05 delivery log, and in the C09
              technical log.
            </Typography>
          </Box>
        </Paper>

        <HandOffBanner
          label="HAND-OFF"
          target="C9 / WF-C9-02 Integration and Job Logging"
          passed="Delivery failures are logged and reported to the schedule owner"
          to="/c9/levels"
          goLabel="Open the technical log"
        />
        <ShellFooterNote />
      </Box>
    </>
  );
};
