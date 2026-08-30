import React from 'react';
import {
  Box, Button, Paper, Typography, Tabs, Tab, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl,
  InputLabel, OutlinedInput, Chip, Stack, Alert, Stepper, Step, StepLabel
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  ActionBar, EmptyState, FieldGrid, HandOffBanner, PageBanner, PlaceholderNote, RecordHeader,
  SectionBand, StatusChip, WhiteButton
} from '../../components/shared';
import { DataTable, Column } from '../../components/DataTable';
import { HistoryPanel8 } from '../../components/HistoryPanel8';
import { CommentThread } from '../../components/CommentThread';
import { COUNTRIES, MODULES, User } from '../../mockData';
import { ShellFooterNote } from '../../layouts/AppShell';

/* ------------------------- 2.4 User Register ------------------------- */

export const UserRegister: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();

  const columns: Column<User>[] = [
    { key: 'name', label: 'User', render: (u) => <Typography sx={{ fontSize: 13, color: tokens.primary, fontWeight: 500 }}>{u.name}</Typography> },
    { key: 'id', label: 'Identifier' },
    { key: 'userType', label: 'User type' },
    { key: 'status', label: 'Status', render: (u) => <StatusChip status={u.status} /> },
    { key: 'roles', label: 'Roles', value: (u) => u.assignments.filter((a) => a.status === 'Active').map((a) => a.role).join(', ') },
    { key: 'countryScope', label: 'Country scope', value: (u) => u.countryScope.join(', ') },
    { key: 'moduleScope', label: 'Module scope', value: (u) => u.moduleScope.join(', '), optional: true },
    { key: 'partyRecord', label: 'Linked party', value: (u) => u.partyRecord ?? '' },
    { key: 'lastLogin', label: 'Last login', value: (u) => u.lastLogin ?? 'Never' },
    { key: 'orgUnit', label: 'Organisation unit', optional: true }
  ];

  return (
    <>
      <PageBanner
        title="User Register"
        breadcrumb={[s.activeCountry, 'C1 Identity and Access', 'User Register']}
        subtitle="WF-C1-02 — accounts are never deleted, only deactivated, so historical audit references remain intact"
        actions={<WhiteButton onClick={() => navigate('/c1/access-requests/new')}>New Request</WhiteButton>}
      />
      <Box sx={{ p: 3 }}>
        <DataTable columns={columns} rows={s.users} selectable onRowClick={(u) => navigate(`/c1/users/${u.id}`)} />
        <ShellFooterNote />
      </Box>
    </>
  );
};

/* ------------------------- 2.5 User Detail ------------------------- */

export const UserDetail: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const { id } = useParams();
  const u = s.users.find((x) => x.id === id);
  const [tab, setTab] = React.useState(0);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [deactivateOpen, setDeactivateOpen] = React.useState(false);

  if (!u) return <Box sx={{ p: 3 }}><EmptyState message="User not found" /></Box>;

  const delegationsGiven = s.delegations.filter((d) => d.fromUserId === u.id);
  const delegationsReceived = s.delegations.filter((d) => d.toUserId === u.id);
  const userAudit = s.audit.filter((a) => a.record === u.id || a.record.includes(u.name));

  return (
    <>
      <PageBanner title="User" breadcrumb={[s.activeCountry, 'C1 Identity and Access', 'User Register', u.name]} />
      <RecordHeader
        name={u.name}
        status={u.status}
        reference={u.id}
        date={u.lastLogin ? `Last login ${u.lastLogin}` : 'Never signed in'}
        meta={[
          ['User type', u.userType],
          ['Default country', u.defaultCountry],
          ['Country scope', u.countryScope.join(', ')],
          ['Login route', u.route]
        ]}
        actions={
          <>
            <WhiteButton onClick={() => navigate(`/c1/access-requests/new`)}>Amend (raise request)</WhiteButton>
            <WhiteButton onClick={() => setAssignOpen(true)}>Add Assignment</WhiteButton>
            <WhiteButton onClick={() => navigate('/c1/effective-permissions')}>Effective Permissions</WhiteButton>
            {u.status !== 'Deactivated' && (
              <Button size="small" variant="outlined" sx={{ color: '#fff', borderColor: '#fff' }} onClick={() => setDeactivateOpen(true)}>Deactivate Account</Button>
            )}
          </>
        }
      />
      <Box sx={{ px: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: `1px solid ${tokens.border}` }}>
          <Tab label="Profile" /><Tab label="Assignments" /><Tab label="Delegations" /><Tab label="External Link" /><Tab label="Comments" /><Tab label="History" />
        </Tabs>
      </Box>
      <Box sx={{ p: 3 }}>
        {tab === 0 && (
          <Paper variant="outlined">
            <SectionBand>Profile</SectionBand>
            <FieldGrid items={[
              ['Identifier', u.id], ['User type', u.userType], ['Status', <StatusChip status={u.status} />],
              ['Name', u.name], ['Contact email', u.email], ['Telephone', u.telephone],
              ['Organisation unit', `${u.orgUnit} (from Active Directory)`], ['Preferred language', u.language], ['Default country', u.defaultCountry],
              ['Country scope', u.countryScope.join(', ')], ['Module scope', u.moduleScope.join(', ')], ['Login route', u.route]
            ]} />
            <Box sx={{ px: 2, pb: 2 }}>
              <PlaceholderNote>which Active Directory attributes are authoritative (department, manager, country) and which are maintained in COTS? (WF-C1-02 / Step 7)</PlaceholderNote>
            </Box>
          </Paper>
        )}

        {tab === 1 && (
          <Paper variant="outlined">
            <SectionBand>Role assignments — role, scope and effective dates</SectionBand>
            {u.assignments.length === 0 ? <EmptyState message="No role assignments" hint="An External User may hold no operational role; the record-level filter governs what they see." /> : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Role</TableCell><TableCell>Country scope</TableCell><TableCell>Module scope</TableCell>
                    <TableCell>Narrower area</TableCell><TableCell>Source</TableCell><TableCell>From</TableCell><TableCell>To</TableCell>
                    <TableCell>Status</TableCell><TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {u.assignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        {a.role}
                        <Chip size="small" label={s.roles.find((r) => r.code === a.role)?.sensitivity ?? '—'} sx={{ ml: 1, height: 18, fontSize: 10 }} />
                      </TableCell>
                      <TableCell>{a.countryScope.join(', ')}</TableCell>
                      <TableCell>{a.moduleScope.join(', ')}</TableCell>
                      <TableCell>{a.area ?? '—'}</TableCell>
                      <TableCell>{a.source}</TableCell>
                      <TableCell>{a.from}</TableCell>
                      <TableCell>{a.to ?? '—'}</TableCell>
                      <TableCell><StatusChip status={a.status} /></TableCell>
                      <TableCell align="right">
                        {a.status === 'Active' && <Button size="small" color="error" onClick={() => s.endAssignment(u.id, a.id)}>End</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Box sx={{ p: 2 }}>
              <HandOffBanner
                target="C4 / WF-C4-01 Standard Approval Cycle"
                passed="Role or assignment reference, current and proposed values, sensitivity classification, country and module scope"
                returned="Approved / Rejected"
                resumes="C1 / WF-C1-03 / Step 5 on approval"
              />
              <HandOffBanner target="C8 / WF-C8-01 Capturing an Audit Entry" passed="Assignment change" returned="Immutable entry; role changes are sensitive actions" />
            </Box>
          </Paper>
        )}

        {tab === 2 && (
          <Stack spacing={2}>
            <Paper variant="outlined">
              <SectionBand>Delegations given by this user</SectionBand>
              {delegationsGiven.length === 0 ? <EmptyState message="No delegations given" /> : (
                <Table size="small">
                  <TableHead><TableRow><TableCell>Delegate</TableCell><TableCell>Scope</TableCell><TableCell>Start</TableCell><TableCell>End</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
                  <TableBody>{delegationsGiven.map((d) => (
                    <TableRow key={d.id}><TableCell>{d.toUser}</TableCell><TableCell>{d.scope.join(', ')}</TableCell><TableCell>{d.start}</TableCell><TableCell>{d.end}</TableCell><TableCell><StatusChip status={d.status} /></TableCell></TableRow>
                  ))}</TableBody>
                </Table>
              )}
            </Paper>
            <Paper variant="outlined">
              <SectionBand>Delegations received by this user</SectionBand>
              {delegationsReceived.length === 0 ? <EmptyState message="No delegations received" /> : (
                <Table size="small">
                  <TableHead><TableRow><TableCell>From</TableCell><TableCell>Scope</TableCell><TableCell>Start</TableCell><TableCell>End</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
                  <TableBody>{delegationsReceived.map((d) => (
                    <TableRow key={d.id}><TableCell>{d.fromUser}</TableCell><TableCell>{d.scope.join(', ')}</TableCell><TableCell>{d.start}</TableCell><TableCell>{d.end}</TableCell><TableCell><StatusChip status={d.status} /></TableCell></TableRow>
                  ))}</TableBody>
                </Table>
              )}
              <Box sx={{ p: 2 }}><Button size="small" onClick={() => navigate('/c1/delegations')}>Open delegation register</Button></Box>
            </Paper>
          </Stack>
        )}

        {tab === 3 && (
          <Paper variant="outlined">
            <SectionBand>External party link</SectionBand>
            {u.userType !== 'External User'
              ? <EmptyState message="Not applicable" hint="Only an External User is bound to a party master record." />
              : <>
                  <FieldGrid items={[['Party type', u.partyType], ['Party master record', u.partyRecord], ['Contract expiry', u.contractExpiry]]} />
                  <Box sx={{ px: 2, pb: 2 }}>
                    <Alert severity="info" sx={{ fontSize: 12.5 }}>
                      An automatic record-level filter restricts every query for this account to records in which the linked party is a participant — C1 / WF-C1-03 / Step 7.
                      Contract expiry triggers deactivation — WF-C1-02 / Step 8.
                    </Alert>
                    <HandOffBanner label="DEPENDENCY" target="C3 / WF-C3-01 Create and Approve Master Data" passed="Party reference" returned="Governed party master record" />
                  </Box>
                </>}
          </Paper>
        )}

        {/* C06 1.1 — the same panel, in the same position, on a user account record */}
        {tab === 4 && (
          <CommentThread
            recordKey={u.id}
            recordName={`${u.id} ${u.name}`}
            objectType="User account"
            country={u.defaultCountry}
            route={`/c1/users/${u.id}`}
          />
        )}

        {/* C08 2.1 — the record history, in business language */}
        {tab === 5 && <HistoryPanel8 recordKey={u.id} recordName={`${u.id} ${u.name}`} />}

        <ShellFooterNote />
      </Box>

      <AddAssignmentDialog open={assignOpen} onClose={() => setAssignOpen(false)} user={u} />
      <DeactivateDialog open={deactivateOpen} onClose={() => setDeactivateOpen(false)} user={u} />
    </>
  );
};

/* ------------------------- 3.4 Role Assignment dialog ------------------------- */

const AddAssignmentDialog: React.FC<{ open: boolean; onClose: () => void; user: User }> = ({ open, onClose, user }) => {
  const s = useStore();
  const [role, setRole] = React.useState('');
  const [countryScope, setCountryScope] = React.useState<string[]>(user.countryScope);
  const [moduleScope, setModuleScope] = React.useState<string[]>(user.moduleScope);
  const [area, setArea] = React.useState('');
  const [source, setSource] = React.useState<'Manual' | 'Derived from AD group'>('Manual');
  const [from, setFrom] = React.useState('2026-09-01');
  const [to, setTo] = React.useState('');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: 18 }}>Add role assignment — C1 / WF-C1-03 / Step 3</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
          <FormControl size="small">
            <InputLabel>Role</InputLabel>
            <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
              {s.roles.map((r) => (
                <MenuItem key={r.code} value={r.code}>{r.description}<Chip size="small" label={r.sensitivity} sx={{ ml: 1, height: 18, fontSize: 10 }} /></MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Country scope</InputLabel>
            <Select multiple label="Country scope" input={<OutlinedInput label="Country scope" />} value={countryScope} onChange={(e) => setCountryScope(e.target.value as string[])} renderValue={(v) => (v as string[]).join(', ')}>
              {COUNTRIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Module scope</InputLabel>
            <Select multiple label="Module scope" input={<OutlinedInput label="Module scope" />} value={moduleScope} onChange={(e) => setModuleScope(e.target.value as string[])} renderValue={(v) => (v as string[]).join(', ')}>
              {MODULES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="Narrower area, facility or warehouse" value={area} onChange={(e) => setArea(e.target.value)} />
          <FormControl size="small">
            <InputLabel>Assignment source</InputLabel>
            <Select label="Assignment source" value={source} onChange={(e) => setSource(e.target.value as any)}>
              <MenuItem value="Manual">Manual</MenuItem>
              <MenuItem value="Derived from AD group">Derived from AD group</MenuItem>
            </Select>
          </FormControl>
          <Stack direction="row" spacing={2}>
            <TextField size="small" fullWidth type="date" label="Effective from" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => setFrom(e.target.value)} />
            <TextField size="small" fullWidth type="date" label="Effective to" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => setTo(e.target.value)} />
          </Stack>
        </Box>
        <HandOffBanner target="C4 / WF-C4-01 Standard Approval Cycle" passed="Assignment, sensitivity, scope" returned="Approved / Rejected" resumes="Applied on approval, then written to C8" />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose}>Cancel</Button>
        <Button
          variant="contained" disabled={!role || countryScope.length === 0 || moduleScope.length === 0}
          onClick={() => { s.addAssignment(user.id, { role, countryScope, moduleScope, area: area || undefined, source, from, to: to || undefined }); onClose(); }}
        >Submit for Approval</Button>
      </DialogActions>
    </Dialog>
  );
};

/* ------------------------- 2.7 Deactivate and reassign ------------------------- */

const DeactivateDialog: React.FC<{ open: boolean; onClose: () => void; user: User }> = ({ open, onClose, user }) => {
  const s = useStore();
  const [step, setStep] = React.useState(0);
  const [trigger, setTrigger] = React.useState('Leaver notification');
  const [effective, setEffective] = React.useState('2026-08-31');
  const [reason, setReason] = React.useState('');
  const [assign, setAssign] = React.useState<Record<string, string>>({});

  const openWork = s.tasks.filter((t) => t.assigneeId === user.id && t.status !== 'Closed');
  const allReassigned = openWork.every((t) => assign[t.id]);

  React.useEffect(() => { if (open) { setStep(0); setReason(''); setAssign({}); } }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: 18 }}>Deactivate account — C1 / WF-C1-02 / Steps 8–10</DialogTitle>
      <DialogContent>
        <Stepper activeStep={step} sx={{ mb: 3, mt: 1 }}>
          <Step><StepLabel>Trigger and reason</StepLabel></Step>
          <Step><StepLabel>Reassign open work</StepLabel></Step>
        </Stepper>

        {step === 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <FormControl size="small">
              <InputLabel>Deactivation trigger</InputLabel>
              <Select label="Deactivation trigger" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
                <MenuItem value="Leaver notification">Leaver notification</MenuItem>
                <MenuItem value="Contract expiry">Contract expiry (external party)</MenuItem>
                <MenuItem value="Manual request">Manual request</MenuItem>
              </Select>
            </FormControl>
            <TextField size="small" type="date" label="Effective date" InputLabelProps={{ shrink: true }} value={effective} onChange={(e) => setEffective(e.target.value)} />
            <Box sx={{ gridColumn: { md: 'span 2' } }}>
              <TextField size="small" fullWidth multiline minRows={2} label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} required />
            </Box>
          </Box>
        )}

        {step === 1 && (
          <>
            {openWork.length === 0
              ? <Alert severity="success" sx={{ fontSize: 13 }}>This user holds no open tasks or pending approvals. The account can be closed.</Alert>
              : (
                <Table size="small">
                  <TableHead><TableRow><TableCell>Task</TableCell><TableCell>Related record</TableCell><TableCell>Due</TableCell><TableCell>Reassign to</TableCell></TableRow></TableHead>
                  <TableBody>
                    {openWork.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.type}</TableCell>
                        <TableCell>{t.relatedRecord}</TableCell>
                        <TableCell>{t.due}</TableCell>
                        <TableCell>
                          <FormControl size="small" sx={{ minWidth: 200 }}>
                            <Select displayEmpty value={assign[t.id] ?? ''} onChange={(e) => setAssign((p) => ({ ...p, [t.id]: e.target.value }))}>
                              <MenuItem value=""><em>Not reassigned</em></MenuItem>
                              {s.users.filter((x) => x.id !== user.id && x.status === 'Active').map((x) => <MenuItem key={x.id} value={x.id}>{x.name}</MenuItem>)}
                            </Select>
                          </FormControl>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            {!allReassigned && openWork.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2, fontSize: 12.5 }}>
                Open work must be reassigned before the account can be closed — C1 / WF-C1-02 / Step 9.
              </Alert>
            )}
            <Alert severity="info" sx={{ mt: 2, fontSize: 12.5 }}>
              Accounts are never deleted. This account will be deactivated so that historical audit references remain intact — Step 10.
            </Alert>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose}>Cancel</Button>
        {step === 0
          ? <Button variant="contained" disabled={!reason.trim()} onClick={() => setStep(1)}>Next — reassign open work</Button>
          : <Button variant="contained" color="error" disabled={!allReassigned} onClick={() => { s.deactivateUser(user.id, trigger, reason, assign); onClose(); }}>Deactivate</Button>}
      </DialogActions>
    </Dialog>
  );
};
