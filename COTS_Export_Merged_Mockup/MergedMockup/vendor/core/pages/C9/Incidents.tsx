import React from 'react';
import {
  Alert, Box, Button, Chip, Drawer, FormControl, FormControlLabel, InputLabel, MenuItem, Paper,
  Select, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  ActionBar, EmptyState, FieldGrid, HandOffBanner, PageBanner, PlaceholderNote, RecordHeader,
  SectionBand, StatusChip, WhiteButton
} from '../../components/shared';
import { ChartFrame, DataTableView, HBar, StackedHBar } from '../../components/Charts';
import {
  CLASSIFICATIONS, Classification, Incident, NON_CRITICAL_CLASS, SEVERITY_COLOUR, SUPPORT_MODEL_NOTE,
  isCritical
} from '../../mockData/c9';
import { APPROVER_REGISTER } from '../../mockData/c4';
import { ShellFooterNote } from '../../layouts/AppShell';
import { FriendlyErrorDialog } from './Health';

const SUPPORT_USERS = Array.from(new Set(APPROVER_REGISTER.map((a) => a.user)));

/** 1.3 Incident List — WF-C9-01 / Steps 3, 5, 6 */
export const IncidentList: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [grouped, setGrouped] = React.useState(true);
  const [severity, setSeverity] = React.useState('All');
  const [classification, setClassification] = React.useState('All');
  const [status, setStatus] = React.useState('All');
  const [country, setCountry] = React.useState('All');
  const [recurringOnly, setRecurringOnly] = React.useState(false);
  const [drawer, setDrawer] = React.useState<Incident | null>(null);
  const [showByClass, setShowByClass] = React.useState(false);
  const [showByDay, setShowByDay] = React.useState(false);

  const rows = s.incidents.filter((i) => (
    (severity === 'All' || i.severity === severity)
    && (classification === 'All' || i.classification === classification)
    && (status === 'All' || i.status === status)
    && (country === 'All' || i.country === country)
    && (!recurringOnly || i.occurrences.length > 1)
  ));

  const countries = Array.from(new Set(s.incidents.map((i) => i.country)));

  // Step 6 — grouping is the substance, not a display convenience
  const flat = rows.flatMap((i) => i.occurrences.map((o) => ({ inc: i, occ: o })));

  const byClass = CLASSIFICATIONS.map((c) => ({
    label: c,
    value: s.incidents.filter((i) => i.status !== 'Closed' && i.classification === c).length,
    attention: isCritical(c)
  })).filter((r) => r.value > 0);

  const days = Array.from(new Set(s.incidents.flatMap((i) => i.occurrences.map((o) => o.at.slice(0, 10)))))
    .sort().slice(-7);
  const byDay = days.map((d) => {
    const occ = s.incidents.flatMap((i) => i.occurrences.filter((o) => o.at.startsWith(d)).map(() => i));
    return {
      label: d,
      segments: [
        { key: 'Critical', value: occ.filter((i) => i.severity === 'Critical').length, colour: tokens.red },
        { key: 'Non-critical', value: occ.filter((i) => i.severity !== 'Critical').length, colour: tokens.primary }
      ]
    };
  });

  return (
    <>
      <PageBanner
        title="Incidents"
        breadcrumb={['Global', 'C9 Logging and Monitoring', 'Incidents']}
        subtitle="WF-C9-01 / Steps 3, 5–7 — every failure becomes a referenced, owned incident tracked to closure"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c9')}>System health</WhiteButton>
            <WhiteButton onClick={() => navigate('/c9/levels')}>Log levels</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Paper variant="outlined" sx={{ mb: 2, p: 2 }}>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Severity</InputLabel>
              <Select label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                {['All', 'Critical', 'Error'].map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 250 }}>
              <InputLabel>Classification</InputLabel>
              <Select label="Classification" value={classification} onChange={(e) => setClassification(e.target.value)}>
                {['All', ...CLASSIFICATIONS].map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
                {['All', 'Open', 'Investigating', 'Resolved', 'Closed', 'Recurring'].map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Country</InputLabel>
              <Select label="Country" value={country} onChange={(e) => setCountry(e.target.value)}>
                {['All', ...countries].map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch size="small" checked={recurringOnly} onChange={(e) => setRecurringOnly(e.target.checked)} />}
              label={<Typography sx={{ fontSize: 12.5 }}>Recurring only</Typography>}
            />
            <FormControlLabel
              control={<Switch size="small" checked={grouped} onChange={(e) => setGrouped(e.target.checked)} />}
              label={<Typography sx={{ fontSize: 12.5 }}>{grouped ? 'Grouped' : 'Every occurrence'}</Typography>}
            />
          </Stack>
          <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary, mt: 1.5 }}>
            Errors are grouped on the fingerprint — component, operation and error type — so that fifty occurrences of one
            timeout are one row rather than fifty rows burying everything else (WF-C9-01 / Step 6).
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>
            {grouped
              ? `Grouped incidents — ${rows.length} of ${s.incidents.length}`
              : `Every occurrence — ${flat.length} event${flat.length === 1 ? '' : 's'}`}
          </SectionBand>
          {rows.length === 0
            ? <EmptyState message="No incident matches these filters." hint="Widen the filters, or raise one from the prototype control on the health dashboard." />
            : grouped ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 12 }}>Error reference</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>First seen</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Last seen</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Occurrences</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Severity</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Classification</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Users</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Screen or service</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Country</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Status</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Owner</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((i) => (
                    <TableRow key={i.id} hover>
                      <TableCell sx={{ fontSize: 12.5, fontFamily: 'monospace' }}>
                        <Button size="small" sx={{ fontFamily: 'monospace', fontSize: 12 }} onClick={() => navigate(`/c9/incidents/${i.id}`)}>
                          {i.errorRef}
                        </Button>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{i.firstSeen}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{i.lastSeen}</TableCell>
                      <TableCell>
                        {i.occurrences.length > 1
                          ? <Chip size="small" label={`${i.occurrences.length} occurrences`} onClick={() => setDrawer(i)}
                                  sx={{ fontSize: 11, bgcolor: `${tokens.orange}1A`, color: tokens.orange, cursor: 'pointer' }} />
                          : <Typography sx={{ fontSize: 12.5 }}>1</Typography>}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={i.severity}
                              sx={{ fontSize: 11, bgcolor: `${SEVERITY_COLOUR[i.severity]}1A`, color: SEVERITY_COLOUR[i.severity] }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{i.classification}</TableCell>
                      <TableCell sx={{ fontSize: 12 }} title={Array.from(new Set(i.occurrences.map((o) => o.user))).join(', ')}>
                        {new Set(i.occurrences.map((o) => o.user)).size}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{i.screenOrService}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{i.country}</TableCell>
                      <TableCell><StatusChip status={i.status} /></TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{i.owner ?? 'Unassigned'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 12 }}>At</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Error reference</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>User affected</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Country</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Screen or service</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {flat.sort((a, b) => b.occ.at.localeCompare(a.occ.at)).map((r, n) => (
                    <TableRow key={n} hover>
                      <TableCell sx={{ fontSize: 12 }}>{r.occ.at}</TableCell>
                      <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{r.inc.errorRef}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{r.occ.user}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{r.occ.country}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{r.occ.screen}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </Paper>

        <ChartFrame
          title="Open incidents by classification"
          note="Horizontal bars, because the classification labels are phrases. Critical classifications carry the attention colour."
          tableToggle={<Button size="small" sx={{ mt: 1 }} onClick={() => setShowByClass((v) => !v)}>{showByClass ? 'Hide table' : 'Show as table'}</Button>}
        >
          {byClass.length === 0 ? <EmptyState message="No incident is open." /> : <HBar rows={byClass} attentionNote="Critical classification" />}
          {showByClass && <Box sx={{ mt: 2 }}><DataTableView head={['Classification', 'Open incidents']} rows={byClass.map((r) => [r.label, r.value])} /></Box>}
        </ChartFrame>

        <ChartFrame
          title="Occurrences by day"
          legend={[{ key: 'Critical', colour: tokens.red }, { key: 'Non-critical', colour: tokens.primary }]}
          note="One measure per axis: the count of occurrences, split by severity."
          tableToggle={<Button size="small" sx={{ mt: 1 }} onClick={() => setShowByDay((v) => !v)}>{showByDay ? 'Hide table' : 'Show as table'}</Button>}
        >
          <StackedHBar rows={byDay} />
          {showByDay && (
            <Box sx={{ mt: 2 }}>
              <DataTableView head={['Day', 'Critical', 'Non-critical']}
                             rows={byDay.map((r) => [r.label, r.segments[0].value, r.segments[1].value])} />
            </Box>
          )}
        </ChartFrame>

        <ShellFooterNote />
      </Box>

      <Drawer anchor="right" open={!!drawer} onClose={() => setDrawer(null)} PaperProps={{ sx: { width: 620 } }}>
        {drawer && (
          <Box>
            <Box sx={{ bgcolor: tokens.primaryDark, color: '#fff', px: 2.5, py: 2 }}>
              <Typography sx={{ fontSize: 12, opacity: 0.85 }}>Occurrences — WF-C9-01 / Step 6</Typography>
              <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>{drawer.errorRef}</Typography>
              <Typography sx={{ fontSize: 12, opacity: 0.85 }}>{drawer.fingerprint}</Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mb: 1.5 }}>
                Which users were affected is the question support is asked, so each occurrence is listed with its user,
                time and country even though the list shows one grouped row.
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 12 }}>At</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>User</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Country</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {drawer.occurrences.map((o, n) => (
                    <TableRow key={n}>
                      <TableCell sx={{ fontSize: 12 }}>{o.at}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{o.user}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{o.country}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button sx={{ mt: 2 }} onClick={() => { setDrawer(null); navigate(`/c9/incidents/${drawer.id}`); }}>
                Open the incident
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>
      <FriendlyErrorDialog />
    </>
  );
};

/** 1.4 Incident Detail — WF-C9-01 / Steps 3, 5, 7 */
export const IncidentDetail: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const inc = s.incidentByRef(id);
  const [owner, setOwner] = React.useState('');
  const [cls, setCls] = React.useState<Classification>(NON_CRITICAL_CLASS);
  const [cause, setCause] = React.useState('');
  const [resolution, setResolution] = React.useState('');
  const [preventive, setPreventive] = React.useState('');
  const [blocked, setBlocked] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (inc) {
      setOwner(inc.owner ?? '');
      setCls(inc.classification);
      setCause(inc.cause ?? '');
      setResolution(inc.resolution ?? '');
      setPreventive(inc.preventive ?? '');
    }
  }, [inc?.id]);

  if (!inc) {
    return (
      <>
        <PageBanner title="Incident" breadcrumb={['Global', 'C9 Logging and Monitoring', 'Incident']} />
        <Box sx={{ p: 3 }}><EmptyState message="That incident could not be found." /></Box>
      </>
    );
  }

  const exchange = inc.correlation ? s.exchangeByCorrelation(inc.correlation) : undefined;
  const delivery = s.deliveries.find((d) => d.subject.includes(inc.errorRef));

  return (
    <>
      <PageBanner
        title={`Incident ${inc.errorRef}`}
        breadcrumb={['Global', 'C9 Logging and Monitoring', 'Incidents', inc.errorRef]}
        subtitle="WF-C9-01 / Steps 3, 5, 7 — what happened, the technical detail, the classification and closure"
        actions={<WhiteButton onClick={() => navigate('/c9/incidents')}>Back to incidents</WhiteButton>}
      />
      <RecordHeader
        name={inc.operation}
        status={inc.status}
        reference={inc.errorRef}
        date={inc.firstSeen}
        meta={[
          ['Severity', inc.severity],
          ['Classification', inc.classification],
          ['Occurrences', inc.occurrences.length],
          ['Owner', inc.owner ?? 'Unassigned']
        ]}
      />
      <Box sx={{ p: 3 }}>
        {/* What happened */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>What happened — WF-C9-01 / Step 3</SectionBand>
          <FieldGrid items={[
            ['Error reference', <span style={{ fontFamily: 'monospace' }}>{inc.errorRef}</span>],
            ['First seen', inc.firstSeen],
            ['Last seen', inc.lastSeen],
            ['Component', inc.component],
            ['Operation', inc.operation],
            ['Screen or service', inc.screenOrService],
            ['Users affected', Array.from(new Set(inc.occurrences.map((o) => o.user))).join(', ')],
            ['Country context', inc.country],
            ['Fingerprint', inc.fingerprint],
            ['Correlation reference', exchange
              ? <Button size="small" sx={{ fontFamily: 'monospace', fontSize: 12 }} onClick={() => navigate(`/c9/exchanges/${exchange.correlation}`)}>{exchange.correlation}</Button>
              : (inc.correlation ?? '—')],
            ['Job run', inc.run ?? '—'],
            ['Message shown to the user', inc.friendly]
          ]} columns={2} />
        </Paper>

        {/* Technical detail — support only */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Technical detail — support only</SectionBand>
          <Box sx={{ p: 2 }}>
            <Alert severity="info" sx={{ mb: 2, fontSize: 12 }}>
              The user was shown a friendly message carrying the reference and nothing else. Everything below is visible to
              support and to no other role — WF-C9-01 / Step 4.
            </Alert>
            <FieldGrid items={[
              ['Exception type', <span style={{ fontFamily: 'monospace' }}>{inc.exceptionType}</span>],
              ['Message', inc.exceptionMessage]
            ]} columns={1} />
            <Box sx={{ px: 2, pb: 2 }}>
              <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mb: 0.5 }}>Stack trace</Typography>
              <Box sx={{ fontFamily: 'monospace', fontSize: 11.5, bgcolor: '#1B2733', color: '#DCE5EC', p: 1.5, overflowX: 'auto' }}>
                {inc.stackTrace.map((l, n) => <div key={n}>{l}</div>)}
              </Box>
              <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mt: 2, mb: 0.5 }}>Inbound parameters</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 12 }}>Field</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Value</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Masking rule applied</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inc.parameters.map((p) => (
                    <TableRow key={p.field}>
                      <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{p.field}</TableCell>
                      <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{p.value}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{p.masked ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary, mt: 1 }}>
                Masked values are shown as masked because that is what was written. Masking is applied as the entry is
                written and not on display, so there is nothing to unmask here — WF-C9-01 / Step 2.
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Classification */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Classification — WF-C9-01 / Step 5</SectionBand>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 280 }}>
                <InputLabel>Classification</InputLabel>
                <Select label="Classification" value={cls} inputProps={{ 'aria-label': 'Incident classification' }}
                        onChange={(e) => setCls(e.target.value as Classification)}>
                  {CLASSIFICATIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <Typography sx={{ fontSize: 12.5 }}>
                Critical: <b>{isCritical(cls) ? 'Yes' : 'No'}</b> — derived from the classification, not chosen separately.
              </Typography>
              <Button variant="outlined" disabled={cls === inc.classification}
                      onClick={() => s.reclassifyIncident(inc.id, cls)}>
                Reclassify
              </Button>
            </Stack>
            {isCritical(cls) && !inc.alertRaised && (
              <Alert severity="warning" sx={{ mt: 2, fontSize: 12.5 }}>
                This incident did not alert when it was raised. Reclassifying it as a critical class will raise the alert
                that was not raised at the time, to {s.supportGroup}.
              </Alert>
            )}
            <FieldGrid items={[
              ['Alert raised', inc.alertRaised
                ? `Yes — at ${inc.alertAt} to ${(inc.alertRecipients ?? []).join(', ')}, through the C05 notification engine`
                : 'No — the incident is queued for normal handling without alerting'],
              ['Delivery', delivery
                ? <Button size="small" onClick={() => navigate('/c5/deliveries')}>Open the delivery log</Button>
                : (inc.alertRaised ? <Button size="small" onClick={() => navigate('/c5/deliveries')}>Open the delivery log</Button> : '—')]
            ]} columns={1} />
            <Box sx={{ px: 2, pb: 2 }}>
              <PlaceholderNote>{SUPPORT_MODEL_NOTE}</PlaceholderNote>
              <HandOffBanner
                label="HAND-OFF"
                target="C5 / WF-C5-01 Event-Driven Notifications"
                passed="The immediate critical-error alert is raised through C05 rule NR-12 and is subject to the same channel policy as every other notification — except that a critical technical alert overrides quiet hours, since a system outage does not wait for office hours."
              />
            </Box>
          </Box>
        </Paper>

        {/* Closure */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Closure — WF-C9-01 / Step 7</SectionBand>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 2, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 240 }}>
                <InputLabel>Owner</InputLabel>
                <Select label="Owner" value={owner} inputProps={{ 'aria-label': 'Incident owner' }}
                        onChange={(e) => setOwner(e.target.value)}>
                  {SUPPORT_USERS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                </Select>
              </FormControl>
              <Button variant="outlined" disabled={!owner || owner === inc.owner}
                      onClick={() => s.assignIncident(inc.id, owner)}>
                Assign
              </Button>
            </Stack>
            <Stack spacing={2}>
              <TextField label="Cause" value={cause} onChange={(e) => setCause(e.target.value)}
                         multiline minRows={2} fullWidth size="small"
                         helperText="The cause, not the symptom." />
              <TextField label="Resolution" value={resolution} onChange={(e) => setResolution(e.target.value)}
                         multiline minRows={2} fullWidth size="small" />
              <TextField label="Preventive action (optional)" value={preventive} onChange={(e) => setPreventive(e.target.value)}
                         multiline minRows={2} fullWidth size="small"
                         helperText="Builds the history that informs preventive work — WF-C9-01 / Step 7." />
            </Stack>
            {inc.reopenedFrom && (
              <Alert severity="warning" sx={{ mt: 2, fontSize: 12.5 }}>
                This incident recurred after it was closed on {inc.reopenedFrom} and was reopened as Recurring.
              </Alert>
            )}
            {blocked && <Alert severity="error" sx={{ mt: 2, fontSize: 12.5 }}>{blocked}</Alert>}
          </Box>
        </Paper>

        {/* Technical trail */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Trail — a technical trail, not a business audit trail</SectionBand>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mb: 1.5 }}>
              Assignment, reclassification and closure are technical events and are recorded here. They are not written to
              the C08 business audit trail — that store holds business activity, and this one holds technical activity.
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>At</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>By</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>What</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inc.trail.map((t, n) => (
                  <TableRow key={n}>
                    <TableCell sx={{ fontSize: 12 }}>{t.at}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{t.by}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{t.what}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>

        <ActionBar
          left={<Button variant="outlined" onClick={() => navigate('/c9/incidents')}>Back to incidents</Button>}
          right={
            <Button
              variant="contained"
              disabled={inc.status === 'Closed'}
              onClick={() => {
                const r = s.closeIncident(inc.id, cause, resolution, preventive || undefined);
                setBlocked(r.ok ? null : (r.why ?? null));
              }}
            >
              Close incident
            </Button>
          }
        />
        <ShellFooterNote />
      </Box>
      <FriendlyErrorDialog />
    </>
  );
};
