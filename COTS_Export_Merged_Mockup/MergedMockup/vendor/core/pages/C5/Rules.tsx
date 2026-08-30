import React from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControl, FormControlLabel, Grid, InputLabel, List, ListItem, ListItemText, MenuItem,
  OutlinedInput, Paper, Select, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  EmptyState, FieldGrid, FormSectionCard, HandOffBanner, PageBanner, PlaceholderNote,
  SectionBand, StatusChip, WhiteButton
} from '../../components/shared';
import { DataTable, Column } from '../../components/DataTable';
import {
  CHANNELS, Channel, EVENT_TYPES, EXTERNAL_CONTACTS, NotificationRule, PriorityClass,
  SALES_CONTRACT, policyFor
} from '../../mockData/c5';
import { APPROVER_REGISTER } from '../../mockData/c4';
import { COUNTRIES } from '../../mockData';
import { ShellFooterNote } from '../../layouts/AppShell';

const ROLES = [...new Set(APPROVER_REGISTER.map((e) => e.role))];
const SCOPES = ['Sesame — Hulled White', 'Sesame — Natural Brown', 'Gedaref buying area', 'Kassala buying area', 'Port Sudan corridor'];
const PRIORITIES: PriorityClass[] = ['Informational', 'Operational', 'Approval', 'Urgent'];
const roleLabel = (r: string) => r.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());

const recipientSummary = (r: NotificationRule) => {
  const bits: string[] = [];
  if (r.roles.length) bits.push(`${r.roles.length} role(s)`);
  if (r.namedUsers.length) bits.push(`${r.namedUsers.length} named user(s)`);
  if (r.includeSubscribers) bits.push('subscribers');
  if (r.externalContacts.length) bits.push(`${r.externalContacts.length} external contact(s)`);
  return bits.join(' · ') || 'none configured';
};

const blank = (id: string): NotificationRule => ({
  id, event: EVENT_TYPES[0], countries: [], scope: [], roles: [], namedUsers: [],
  includeSubscribers: false, externalContacts: [], channels: ['In-app', 'Email'],
  templateEvent: EVENT_TYPES[0], priority: 'Operational', requiresAcknowledgement: false,
  raisesTask: false, active: true
});

/** 1.2 Notification Rule List + 1.3 Rule Form + 1.4 Recipient Resolution Preview + 1.6 Readiness */
export const NotificationRules: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [edit, setEdit] = React.useState<NotificationRule | null>(null);
  const [preview, setPreview] = React.useState<NotificationRule | null>(null);
  const [previewCountry, setPreviewCountry] = React.useState('Sudan');
  const [previewRecord, setPreviewRecord] = React.useState('AR-000141 Omar Bashir');
  const [readinessFor, setReadinessFor] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<'Ready' | 'Ready with conditions' | 'Not ready'>('Ready');
  const [comment, setComment] = React.useState('');

  const raisedCount = (event: string) => s.deliveries.filter((d) => d.event === event).length;

  const columns: Column<NotificationRule>[] = [
    { key: 'id', label: 'Rule', render: (r) => <Typography sx={{ fontSize: 13, color: tokens.primary, fontWeight: 500 }}>{r.id}</Typography> },
    { key: 'event', label: 'Event type' },
    { key: 'countries', label: 'Country scope', value: (r) => (r.countries.length ? r.countries.join(', ') : 'Every country') },
    { key: 'scope', label: 'Commodity or operational scope', value: (r) => (r.scope.length ? r.scope.join(', ') : 'Any') },
    { key: 'recipients', label: 'Recipients', value: recipientSummary },
    { key: 'channels', label: 'Channels', value: (r) => r.channels.join(', ') },
    { key: 'template', label: 'Template', value: (r) => r.templateEvent },
    { key: 'priority', label: 'Priority class', render: (r) => <Chip size="small" variant="outlined" label={r.priority} sx={{ height: 19, fontSize: 10.5 }} /> },
    { key: 'ack', label: 'Requires acknowledgement', value: (r) => (r.requiresAcknowledgement ? 'Yes' : 'No'), optional: true },
    { key: 'task', label: 'Raises an inbox task', value: (r) => (r.raisesTask ? 'Yes' : 'No'), optional: true },
    { key: 'active', label: 'Active', render: (r) => <StatusChip status={r.active ? 'Active' : 'Inactive'} /> },
    { key: 'raised', label: 'Deliveries raised', value: (r) => String(raisedCount(r.event)) },
    {
      key: 'actions', label: '',
      render: (r) => (
        <Stack direction="row" spacing={0.5}>
          <Button size="small" onClick={(e) => { e.stopPropagation(); setEdit({ ...r }); }}>Open</Button>
          <Button size="small" onClick={(e) => { e.stopPropagation(); setPreview(r); }}>Preview recipients</Button>
          <Button size="small" color={r.active ? 'error' : 'primary'} onClick={(e) => { e.stopPropagation(); s.toggleRule(r.id); }}>
            {r.active ? 'Deactivate' : 'Activate'}
          </Button>
        </Stack>
      )
    }
  ];

  const resolved = preview ? s.resolveRecipients(preview, previewCountry, previewRecord) : [];
  const salesRule = s.rules.find((r) => r.event === 'Sales contract created');
  const answered = s.readiness.filter((r) => r.feedback).length;

  return (
    <>
      <PageBanner
        title="Notification rules"
        breadcrumb={['Global', 'C5 Notifications and Alerts', 'Notification rules']}
        subtitle="WF-C5-01 / Steps 1–4 — a notification exists because a rule matched the event, the country and the scope"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => setEdit(blank(`NR-${String(s.rules.length + 1).padStart(2, '0')}`))}>New rule</WhiteButton>
            <WhiteButton onClick={() => navigate('/c5/deliveries')}>Delivery log</WhiteButton>
            <WhiteButton onClick={() => navigate('/c5/templates')}>Templates</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <DataTable
          columns={columns} rows={s.rules} groupable
          onRowClick={(r) => setEdit({ ...r })}
          emptyMessage="No notification rules are configured"
          searchPlaceholder="Search rules"
        />

        {/* WF-C5-01 / Step 1 — the second branch: no rule matched */}
        <Paper variant="outlined" sx={{ mt: 2 }}>
          <SectionBand>Events raised where no rule matched — WF-C5-01 / Step 1</SectionBand>
          {s.unmatchedEvents.length === 0 ? (
            <EmptyState message="Every event raised so far matched a rule" />
          ) : (
            <List dense disablePadding>
              {s.unmatchedEvents.map((u) => (
                <ListItem key={u.id} divider>
                  <ListItemText
                    primaryTypographyProps={{ fontSize: 13.5 }}
                    secondaryTypographyProps={{ fontSize: 12 }}
                    primary={`${u.event} — ${u.record}`}
                    secondary={`${u.country} · ${u.at} · ${u.why}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mb: 1 }}>
              Silence is a configured outcome, not a defect. This panel is what tells an administrator why an
              expected message never arrived.
            </Typography>
            <Stack spacing={1}>
              <HandOffBanner target="C8 / WF-C8-01 Capturing an Audit Entry" passed="The business event, which remains recorded even where no notification is issued" />
              <HandOffBanner target="C9 / WF-C9-01 Logging and Error Handling" passed="The technical event, which remains in the system log" />
            </Stack>
          </Box>
        </Paper>

        {/* WF-C5-01 / Step 9 — sales contract readiness */}
        <Paper variant="outlined" sx={{ mt: 2 }}>
          <SectionBand>Sales contract readiness alerts — WF-C5-01 / Step 9</SectionBand>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 13, mb: 1.5 }}>
              On creation of a sales contract, alerts are issued to <b>quality, execution, processing and financial
              planning</b>. Each reviews the contract terms, confirms readiness to fulfil them, and records feedback
              against the task raised for it. Readiness is complete only when all four have answered
              — {answered} of {s.readiness.length} recorded.
            </Typography>
            <FieldGrid items={[
              ['Contract', SALES_CONTRACT.reference],
              ['Description', SALES_CONTRACT.name],
              ['Country', SALES_CONTRACT.country],
              ...SALES_CONTRACT.detail
            ]} />
            <Divider sx={{ my: 2 }} />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Function alerted</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Recipient</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Task raised</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Readiness</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Comment</TableCell>
                  <TableCell sx={{ fontSize: 12 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {s.readiness.map((r) => (
                  <TableRow key={r.role}>
                    <TableCell sx={{ fontSize: 12.5 }}>{roleLabel(r.role)}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{r.recipient}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{r.taskRaised}</TableCell>
                    <TableCell>{r.feedback ? <StatusChip status={r.feedback} /> : <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>Awaiting</Typography>}</TableCell>
                    <TableCell sx={{ fontSize: 12.5, maxWidth: 320 }}>{r.comment ?? '—'}{r.at ? ` (${r.at})` : ''}</TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => { setReadinessFor(r.role); setFeedback(r.feedback ?? 'Ready'); setComment(r.comment ?? ''); }}>
                        {r.feedback ? 'Amend' : 'Record readiness'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button variant="outlined" size="small" onClick={() => s.raiseSalesContractEvent()}>
                Raise the sales contract event again
              </Button>
              {salesRule && (
                <Button variant="text" size="small" onClick={() => setPreview(salesRule)}>
                  Preview the four recipients
                </Button>
              )}
            </Stack>
            <PlaceholderNote>
              The sales contract itself belongs to a module outside the core layer, so the contract shown here is a
              seeded demonstration record. The four alerted functions, the tasks and the feedback capture come from
              WF-C5-01 / Step 9.
            </PlaceholderNote>
            <HandOffBanner target="C2 / WF-C2-03 Actions Inbox and Task Management" passed="One readiness task per alerted function" returned="Recorded readiness feedback, which closes that function's task" />
          </Box>
        </Paper>

        <ShellFooterNote />
      </Box>

      {/* 1.3 Rule form */}
      <Dialog open={!!edit} onClose={() => setEdit(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>{edit?.id} — notification rule</DialogTitle>
        <DialogContent>
          {edit && (
            <>
              <FormSectionCard title="1 — Event and scope (Step 1)">
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Event type</InputLabel>
                      <Select label="Event type" value={edit.event} onChange={(e) => setEdit({ ...edit, event: e.target.value })}>
                        {EVENT_TYPES.map((ev) => <MenuItem key={ev} value={ev}>{ev}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Country scope</InputLabel>
                      <Select
                        multiple label="Country scope" value={edit.countries} input={<OutlinedInput label="Country scope" />}
                        onChange={(e) => setEdit({ ...edit, countries: typeof e.target.value === 'string' ? [e.target.value] : e.target.value })}
                        renderValue={(v) => (v.length ? v.join(', ') : 'Every country')}
                      >
                        {COUNTRIES.map((c) => <MenuItem key={c} value={c}><Checkbox size="small" checked={edit.countries.includes(c)} />{c}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Commodity or operational scope</InputLabel>
                      <Select
                        multiple label="Commodity or operational scope" value={edit.scope} input={<OutlinedInput label="Commodity or operational scope" />}
                        onChange={(e) => setEdit({ ...edit, scope: typeof e.target.value === 'string' ? [e.target.value] : e.target.value })}
                        renderValue={(v) => (v.length ? v.join(', ') : 'Any')}
                      >
                        {SCOPES.map((c) => <MenuItem key={c} value={c}><Checkbox size="small" checked={edit.scope.includes(c)} />{c}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={<Switch size="small" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />}
                      label={<Typography sx={{ fontSize: 13 }}>Active</Typography>}
                    />
                  </Grid>
                </Grid>
              </FormSectionCard>

              <FormSectionCard
                title="2 — Recipients (Step 2)"
                note="Four sources, deliberately shown as four different things: roles resolve through C1 within the country scope, named users are specific people, subscribers chose to follow the record, and external contacts are held as governed master data in C3."
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Roles</InputLabel>
                      <Select
                        multiple label="Roles" value={edit.roles} input={<OutlinedInput label="Roles" />}
                        onChange={(e) => setEdit({ ...edit, roles: typeof e.target.value === 'string' ? [e.target.value] : e.target.value })}
                        renderValue={(v) => v.map(roleLabel).join(', ')}
                      >
                        {ROLES.map((r) => <MenuItem key={r} value={r}><Checkbox size="small" checked={edit.roles.includes(r)} />{roleLabel(r)}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Named users</InputLabel>
                      <Select
                        multiple label="Named users" value={edit.namedUsers} input={<OutlinedInput label="Named users" />}
                        onChange={(e) => setEdit({ ...edit, namedUsers: typeof e.target.value === 'string' ? [e.target.value] : e.target.value })}
                        renderValue={(v) => v.join(', ')}
                      >
                        {s.users.map((u) => <MenuItem key={u.id} value={u.name}><Checkbox size="small" checked={edit.namedUsers.includes(u.name)} />{u.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={<Switch size="small" checked={edit.includeSubscribers} onChange={(e) => setEdit({ ...edit, includeSubscribers: e.target.checked })} />}
                      label={<Typography sx={{ fontSize: 13 }}>Include subscribers who follow the record</Typography>}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>External contacts</InputLabel>
                      <Select
                        multiple label="External contacts" value={edit.externalContacts} input={<OutlinedInput label="External contacts" />}
                        onChange={(e) => setEdit({ ...edit, externalContacts: typeof e.target.value === 'string' ? [e.target.value] : e.target.value })}
                        renderValue={(v) => v.join(', ')}
                      >
                        {EXTERNAL_CONTACTS.map((c) => (
                          <MenuItem key={c.name} value={c.name}>
                            <Checkbox size="small" checked={edit.externalContacts.includes(c.name)} />{c.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                <PlaceholderNote>
                  Business confirmation required: whether external parties receive operational notifications directly
                  or only through their portal (WF-C5-01 / Step 4).
                </PlaceholderNote>
              </FormSectionCard>

              <FormSectionCard title="3 — Message and channels (Steps 3–4)">
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Template</InputLabel>
                      <Select label="Template" value={edit.templateEvent} onChange={(e) => setEdit({ ...edit, templateEvent: e.target.value })}>
                        {[...new Set(s.templates.map((t) => t.event))].map((ev) => <MenuItem key={ev} value={ev}>{ev}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Priority class</InputLabel>
                      <Select label="Priority class" value={edit.priority} onChange={(e) => setEdit({ ...edit, priority: e.target.value as PriorityClass })}>
                        {PRIORITIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.5 }}>Channels</Typography>
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                      {CHANNELS.map((c) => {
                        const policy = policyFor(s.channelPolicy, edit.priority);
                        const reserved = policy.urgentOnly.includes(c);
                        return (
                          <FormControlLabel
                            key={c}
                            control={
                              <Checkbox
                                size="small" disabled={reserved}
                                checked={edit.channels.includes(c)}
                                onChange={(e) => setEdit({
                                  ...edit,
                                  channels: e.target.checked ? [...edit.channels, c] : edit.channels.filter((x) => x !== c)
                                })}
                              />
                            }
                            label={
                              <Typography sx={{ fontSize: 13, color: reserved ? tokens.textSecondary : tokens.textPrimary }}>
                                {c}{reserved ? ' — reserved for urgent items' : ''}
                              </Typography>
                            }
                          />
                        );
                      })}
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={<Switch size="small" checked={edit.requiresAcknowledgement} onChange={(e) => setEdit({ ...edit, requiresAcknowledgement: e.target.checked })} />}
                      label={<Typography sx={{ fontSize: 13 }}>Requires acknowledgement of receipt (Step 8)</Typography>}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={<Switch size="small" checked={edit.raisesTask} onChange={(e) => setEdit({ ...edit, raisesTask: e.target.checked })} />}
                      label={<Typography sx={{ fontSize: 13 }}>Raises an inbox task (Step 7)</Typography>}
                    />
                  </Grid>
                </Grid>
              </FormSectionCard>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdit(null)}>Cancel</Button>
          {edit && <Button onClick={() => setPreview(edit)}>Preview recipients</Button>}
          <Button variant="contained" onClick={() => { if (edit) s.saveRule(edit); setEdit(null); }}>Save rule</Button>
        </DialogActions>
      </Dialog>

      {/* 1.4 Recipient resolution preview */}
      <Dialog open={!!preview} onClose={() => setPreview(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Recipient resolution — {preview?.id} {preview?.event}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, mb: 2 }}>
            Every recipient this rule would reach, with the source that produced them, the language the message
            would be composed in, and the channels that would be used — including the ones dropped and why. C05's
            counterpart to C04's route simulation.
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={5}>
              <FormControl fullWidth size="small">
                <InputLabel>Country</InputLabel>
                <Select label="Country" value={previewCountry} onChange={(e) => setPreviewCountry(e.target.value)}>
                  {COUNTRIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={7}>
              <TextField fullWidth size="small" label="Record reference" value={previewRecord} onChange={(e) => setPreviewRecord(e.target.value)} />
            </Grid>
          </Grid>

          {resolved.length === 0 ? (
            <Alert severity="warning" sx={{ fontSize: 13 }}>
              This rule resolves to no recipient in {previewCountry}. An event would match the rule and reach nobody —
              the recipient sources need review before the rule is relied on.
            </Alert>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Recipient</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Source</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Internal / external</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Language</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Channels used</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Dropped</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resolved.map((r) => (
                  <TableRow key={`${r.name}-${r.source}`}>
                    <TableCell sx={{ fontSize: 12.5 }}>
                      {r.name}<br />
                      <Typography component="span" sx={{ fontSize: 11, color: tokens.textSecondary }}>{r.address}{r.via ? ` · ${r.via}` : ''}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{r.source}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{r.external ? 'External' : 'Internal'}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>
                      {r.language}
                      {r.templateMissing && (
                        <Typography sx={{ fontSize: 11, color: tokens.amber }}>{r.templateMissing}</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{r.channels.join(', ') || '—'}</TableCell>
                    <TableCell sx={{ fontSize: 11.5, color: tokens.textSecondary, maxWidth: 300 }}>
                      {r.dropped.length ? r.dropped.map((d) => `${d.channel}: ${d.why}`).join(' ') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Stack spacing={1} sx={{ mt: 2 }}>
            <HandOffBanner label="DEPENDENCY" target="C1 / WF-C1-03 Role, Permission and Access Scope Management" passed="The role and the country scope" returned="The named users who hold it" />
            <HandOffBanner label="DEPENDENCY" target="C3 / WF-C3-01 Create and Approve Master Data" passed="The external contact reference" returned="The contact address held as governed master data" />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setPreview(null)}>Close</Button></DialogActions>
      </Dialog>

      {/* Step 9 readiness capture */}
      <Dialog open={!!readinessFor} onClose={() => setReadinessFor(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Record readiness — {readinessFor ? roleLabel(readinessFor) : ''}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, mb: 2 }}>
            {SALES_CONTRACT.reference} — {SALES_CONTRACT.name}. Review the contract terms and confirm readiness to
            fulfil them. The feedback is recorded against the task raised for this function.
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Readiness</InputLabel>
            <Select label="Readiness" value={feedback} onChange={(e) => setFeedback(e.target.value as typeof feedback)}>
              <MenuItem value="Ready">Ready</MenuItem>
              <MenuItem value="Ready with conditions">Ready with conditions</MenuItem>
              <MenuItem value="Not ready">Not ready</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth size="small" multiline minRows={3} required label="Comment"
            value={comment} onChange={(e) => setComment(e.target.value)}
            helperText="Recorded against the task and visible to the contract owner."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReadinessFor(null)}>Cancel</Button>
          <Button variant="contained" disabled={!comment.trim()}
                  onClick={() => { if (readinessFor) s.recordReadiness(readinessFor, feedback, comment.trim()); setReadinessFor(null); setComment(''); }}>
            Record readiness
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
