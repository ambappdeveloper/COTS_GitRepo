import React from 'react';
import {
  Box, Button, Paper, Typography, Tabs, Tab, TextField, Select, MenuItem, FormControl, InputLabel,
  RadioGroup, Radio, FormControlLabel, OutlinedInput, Chip, Stack, Autocomplete, Alert, Table,
  TableHead, TableRow, TableCell, TableBody
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  ActionBar, ConfirmDialog, EmptyState, FieldGrid, FormSectionCard, HandOffBanner, PageBanner,
  PlaceholderNote, RecordHeader, SideBySideCompare, StatusChip, WhiteButton
} from '../../components/shared';
import { DataTable, Column } from '../../components/DataTable';
import { ApprovalPanel } from '../../components/RecordPanels';
import { HistoryPanel8 } from '../../components/HistoryPanel8';
import { DocumentsPanel7 } from '../../components/DocumentsPanel7';
import { RouteProgress } from '../../components/RouteProgress';
import { CommentThread } from '../../components/CommentThread';
import { ActivityTimeline } from '../../components/ActivityTimeline';
import { AccessRequest, COUNTRIES, LANGUAGES, MODULES, PARTY_TYPES, UserType } from '../../mockData';
import { ShellFooterNote } from '../../layouts/AppShell';

/* ------------------------- 2.1 Access Request List ------------------------- */

export const AccessRequestList: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();

  const columns: Column<AccessRequest>[] = [
    { key: 'id', label: 'Request no.', render: (r) => <Typography sx={{ fontSize: 13, color: tokens.primary, fontWeight: 500 }}>{r.id}</Typography> },
    { key: 'requestedForName', label: 'Requested for' },
    { key: 'userType', label: 'User type' },
    { key: 'origin', label: 'Origin' },
    { key: 'roles', label: 'Roles requested', value: (r) => r.roles.join(', '), render: (r) => <>{r.roles.map((x) => <Chip key={x} size="small" label={x} sx={{ mr: 0.5, height: 19, fontSize: 10.5 }} />)}</> },
    { key: 'countryScope', label: 'Country scope', value: (r) => r.countryScope.join(', ') },
    { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
    { key: 'raised', label: 'Raised' },
    { key: 'requestedBy', label: 'Requested by' },
    { key: 'step', label: 'Current approval step', value: (r) => (r.status === 'Pending Approval' ? `${r.currentStep + 1} of ${r.steps.length} — ${r.steps[r.currentStep]?.role ?? ''}` : '—') },
    { key: 'mode', label: 'Mode', optional: true }
  ];

  return (
    <>
      <PageBanner
        title="Access Requests"
        breadcrumb={[s.activeCountry, 'C1 Identity and Access', 'Access Requests']}
        subtitle="WF-C1-02 User Provisioning and Lifecycle"
        actions={<WhiteButton onClick={() => navigate('/c1/access-requests/new')}>New Request</WhiteButton>}
      />
      <Box sx={{ p: 3 }}>
        <DataTable columns={columns} rows={s.requests} selectable onRowClick={(r) => navigate(`/c1/access-requests/${r.id}`)} />
        <ShellFooterNote />
      </Box>
    </>
  );
};

/* ------------------------- 2.2 Access Request Form ------------------------- */

const emptyRequest = (id: string, country: string, requestedBy: string): AccessRequest => ({
  id,
  origin: 'Line manager',
  requestedBy,
  requestedForName: '',
  email: '',
  orgUnit: '',
  language: 'English',
  userType: 'Team Member',
  roles: [],
  countryScope: [country],
  moduleScope: [],
  defaultCountry: country,
  effectiveFrom: '2026-09-01',
  status: 'Draft',
  raised: '2026-08-18',
  mode: 'New account',
  currentStep: 0,
  steps: [
    { seq: 1, role: 'COUNTRY_MANAGER', type: 'Sequential', approver: 'Grace Mensah', sla: '2 working days' },
    { seq: 2, role: 'SYSTEM_ADMINISTRATOR', type: 'Sequential', approver: 'Nasreen Sayed', sla: '1 working day' }
  ],
  comments: [],
  documents: [],
  audit: [],
  mandatoryDocs: []
});

export const AccessRequestForm: React.FC<{ mode?: 'new' | 'edit' | 'amend' }> = ({ mode = 'new' }) => {
  const s = useStore();
  const navigate = useNavigate();
  const { id } = useParams();
  const existing = s.requests.find((r) => r.id === id);
  const [r, setR] = React.useState<AccessRequest>(
    existing ?? emptyRequest(`AR-${100000 + Math.floor(s.requests.length * 7 + 143)}`, s.activeCountry, s.currentUser?.name ?? '—')
  );
  // C2 / WF-C2-01 / Step 8 — editing this form arms the unsaved-work warning on a country switch
  const set = <K extends keyof AccessRequest>(k: K, v: AccessRequest[K]) => {
    s.setDirty(`Access request ${r.id} — ${mode === 'new' ? 'new request' : 'amendment'} in progress`);
    setR((p) => ({ ...p, [k]: v }));
  };
  React.useEffect(() => () => { s.setDirty(null); }, []);

  const isExternal = r.userType === 'External User';
  const partyMissing = isExternal && !r.partyRecord;
  const invalid = !r.requestedForName || !r.email || r.roles.length === 0 || r.countryScope.length === 0 || r.moduleScope.length === 0 || partyMissing;

  // administrative or approval-bearing roles require higher authorisation — WF-C1-02 / Step 5
  const elevated = r.roles.some((c) => {
    const role = s.roles.find((x) => x.code === c);
    return role?.sensitivity === 'Administrative' || role?.sensitivity === 'Elevated';
  });

  const steps = elevated
    ? [
        { seq: 1, role: 'COUNTRY_MANAGER', type: 'Sequential' as const, approver: 'Grace Mensah', sla: '2 working days' },
        { seq: 2, role: 'COMPLIANCE_OFFICER', type: 'Sequential' as const, approver: 'Fatima Idris', sla: '2 working days' },
        { seq: 3, role: 'SYSTEM_ADMINISTRATOR', type: 'Sequential' as const, approver: 'Nasreen Sayed', sla: '1 working day' }
      ]
    : r.steps;

  const amendRows = existing && mode === 'amend'
    ? [
        { label: 'Roles', current: existing.roles.join(', '), proposed: r.roles.join(', ') },
        { label: 'Country scope', current: existing.countryScope.join(', '), proposed: r.countryScope.join(', ') },
        { label: 'Module scope', current: existing.moduleScope.join(', '), proposed: r.moduleScope.join(', ') },
        { label: 'Default country', current: existing.defaultCountry, proposed: r.defaultCountry }
      ]
    : [];

  return (
    <>
      <PageBanner
        title={mode === 'amend' ? `Amend Access — ${r.requestedForName || r.id}` : mode === 'edit' ? `Edit ${r.id}` : 'New Access Request'}
        breadcrumb={[s.activeCountry, 'C1 Identity and Access', 'Access Requests', mode === 'new' ? 'New' : r.id]}
        subtitle="WF-C1-02 / Steps 2–4"
      />
      <Box sx={{ p: 3 }}>
        {mode === 'amend' && (
          <Paper variant="outlined" sx={{ mb: 2 }}>
            <Box sx={{ p: 0 }}><SideBySideCompare rows={amendRows} /></Box>
          </Paper>
        )}

        <FormSectionCard title="1 — Request origin">
          <RadioGroup row value={r.origin} onChange={(e) => set('origin', e.target.value as AccessRequest['origin'])}>
            {(['Line manager', 'HR / Administration', 'Automatic from AD group'] as const).map((o) => (
              <FormControlLabel key={o} value={o} control={<Radio size="small" />} label={<Typography sx={{ fontSize: 13.5 }}>{o}</Typography>} />
            ))}
          </RadioGroup>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
            <TextField size="small" label="Requested by" value={r.requestedBy} InputProps={{ readOnly: true }} />
            {r.origin === 'Automatic from AD group' && (
              <TextField size="small" label="AD group detected" value={r.adGroup ?? 'COTS-SD-Sourcing'} InputProps={{ readOnly: true }} />
            )}
          </Box>
        </FormSectionCard>

        <FormSectionCard title="2 — Person">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <TextField size="small" required label="Requested for" value={r.requestedForName} onChange={(e) => set('requestedForName', e.target.value)} placeholder="Ahmed Osman" />
            <TextField size="small" label="Employee / party reference" value={r.employeeRef ?? ''} onChange={(e) => set('employeeRef', e.target.value)} placeholder="EMP-10871" />
            <TextField size="small" required label="Contact email" value={r.email} onChange={(e) => set('email', e.target.value)} />
            <TextField size="small" required label="Organisation unit" value={r.orgUnit} onChange={(e) => set('orgUnit', e.target.value)} placeholder="Sourcing, Khartoum" />
            <FormControl size="small">
              <InputLabel>Preferred language</InputLabel>
              <Select label="Preferred language" value={r.language} onChange={(e) => set('language', e.target.value)}>
                {LANGUAGES.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </FormSectionCard>

        <FormSectionCard title="3 — Classification and scope">
          <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mb: 0.5 }}>
            User type is an attribute of the account, set at creation, and it drives the permission template — WF-C1-02 / Step 2.
          </Typography>
          <RadioGroup row value={r.userType} onChange={(e) => set('userType', e.target.value as UserType)}>
            {(['Team Member', 'Internal Stakeholder', 'External User'] as const).map((t) => (
              <FormControlLabel key={t} value={t} control={<Radio size="small" />} label={<Typography sx={{ fontSize: 13.5 }}>{t}</Typography>} />
            ))}
          </RadioGroup>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1.5 }}>
            <FormControl size="small" error={r.roles.length === 0}>
              <InputLabel>Roles</InputLabel>
              <Select
                multiple label="Roles" value={r.roles} input={<OutlinedInput label="Roles" />}
                onChange={(e) => set('roles', e.target.value as string[])}
                renderValue={(v) => (v as string[]).join(', ')}
              >
                {s.roles.map((role) => (
                  <MenuItem key={role.code} value={role.code}>
                    {role.description}
                    <Chip size="small" label={role.sensitivity} sx={{ ml: 1, height: 18, fontSize: 10 }} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" error={r.countryScope.length === 0}>
              <InputLabel>Country scope</InputLabel>
              <Select multiple label="Country scope" value={r.countryScope} input={<OutlinedInput label="Country scope" />} onChange={(e) => set('countryScope', e.target.value as string[])} renderValue={(v) => (v as string[]).join(', ')}>
                {COUNTRIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" label="Narrower operational area, facility or warehouse" value={r.area ?? ''} onChange={(e) => set('area', e.target.value)} placeholder="Port Sudan warehouse 3" />
            <FormControl size="small" error={r.moduleScope.length === 0}>
              <InputLabel>Module scope</InputLabel>
              <Select multiple label="Module scope" value={r.moduleScope} input={<OutlinedInput label="Module scope" />} onChange={(e) => set('moduleScope', e.target.value as string[])} renderValue={(v) => (v as string[]).join(', ')}>
                {MODULES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small">
              <InputLabel>Default country</InputLabel>
              <Select label="Default country" value={r.defaultCountry} onChange={(e) => set('defaultCountry', e.target.value)}>
                {r.countryScope.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={2}>
              <TextField size="small" fullWidth type="date" label="Effective from" InputLabelProps={{ shrink: true }} value={r.effectiveFrom} onChange={(e) => set('effectiveFrom', e.target.value)} />
              <TextField size="small" fullWidth type="date" label="Effective to" InputLabelProps={{ shrink: true }} value={r.effectiveTo ?? ''} onChange={(e) => set('effectiveTo', e.target.value)} />
            </Stack>
          </Box>

          {elevated && (
            <Alert severity="info" sx={{ mt: 2, fontSize: 12.5 }}>
              An elevated or administrative role has been requested, so a higher level of authorisation applies. The resolved route now has {steps.length} steps:
              {' '}{steps.map((x) => x.role).join(' → ')} — WF-C1-02 / Step 5.
            </Alert>
          )}
        </FormSectionCard>

        {isExternal && (
          <FormSectionCard
            title="4 — External party link"
            note={<PlaceholderNote>do external users self-register subject to approval, or are they created by invitation only? (WF-C1-02 / Step 4)</PlaceholderNote>}
          >
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
              <FormControl size="small">
                <InputLabel>Party type</InputLabel>
                <Select label="Party type" value={r.partyType ?? ''} onChange={(e) => set('partyType', e.target.value)}>
                  {PARTY_TYPES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </FormControl>
              <Autocomplete
                size="small"
                options={['SUP-004821 Agrotem Trading LLC', 'TRP-000913 Beira Logistics SA', 'CUS-002210 Cofco International', 'SUR-000455 Gedaref Survey Bureau']}
                value={r.partyRecord ?? null}
                onChange={(_, v) => set('partyRecord', v ?? undefined)}
                renderInput={(p) => <TextField {...p} label="Party master record" error={partyMissing} required />}
              />
              <TextField size="small" type="date" label="Contract expiry date" InputLabelProps={{ shrink: true }} value={r.contractExpiry ?? ''} onChange={(e) => set('contractExpiry', e.target.value)} />
            </Box>
            {partyMissing && (
              <Alert severity="error" sx={{ mt: 2, fontSize: 12.5 }}>
                The account cannot be activated without a party link, because the record-level filter has nothing to bind to — WF-C1-02 / Step 4.
              </Alert>
            )}
            <HandOffBanner label="DEPENDENCY" target="C3 / WF-C3-01 Create and Approve Master Data" passed="Party type and search term" returned="Governed supplier, customer or partner master record" />
          </FormSectionCard>
        )}

        {/* C07 1.1–1.5 — documents attach to the draft record, so the checklist is live while it is drafted */}
        <FormSectionCard
          title="5 — Supporting documents"
          note="Documents attach to this request as it is drafted, so the checklist is satisfied before submission rather than after refusal."
        >
          <DocumentsPanel7
            recordKey={r.id}
            recordName={`${r.id} ${r.requestedForName || 'new request'}`}
            objectType="Access request"
            country={r.defaultCountry}
            module="C1 Identity and Access"
            route={`/c1/access-requests/${r.id}`}
          />
        </FormSectionCard>

        <ActionBar
          left={<Button variant="outlined" onClick={() => { s.setDirty(null); navigate('/c1/access-requests'); }}>Cancel</Button>}
          right={
            <>
              <Button variant="outlined" onClick={() => { s.setDirty(null); s.saveRequest({ ...r, steps }); navigate(`/c1/access-requests/${r.id}`); }}>Save Draft</Button>
              <Button
                variant="contained"
                disabled={invalid}
                onClick={() => { s.setDirty(null); s.saveAndSubmitRequest({ ...r, steps }); navigate(`/c1/access-requests/${r.id}`); }}
              >
                Submit for Approval
              </Button>
            </>
          }
        />
        {invalid && (
          <Typography sx={{ fontSize: 12, color: tokens.red, mt: 1 }}>
            Submission is blocked until the mandatory fields are complete{partyMissing ? ' and the external party link is recorded' : ''}.
          </Typography>
        )}
        <ShellFooterNote />
      </Box>
    </>
  );
};

/* ------------------------- 2.3 Access Request Detail ------------------------- */

export const AccessRequestDetail: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const { id } = useParams();
  const r = s.requests.find((x) => x.id === id);
  const c4View = s.approvalById(id ?? '');
  const following = s.subscriptions.find((b) => b.userId === (s.currentUser?.id ?? 'U-001') && b.record.startsWith(id ?? ''));
  const [tab, setTab] = React.useState(0);
  const [dialog, setDialog] = React.useState<null | 'Approved' | 'Rejected' | 'Returned for Amendment' | 'withdraw' | 'activate'>(null);

  if (!r) return <Box sx={{ p: 3 }}><EmptyState message="Request not found" /></Box>;

  const step = r.steps[r.currentStep];
  const returnedComment = r.status === 'Returned for Amendment' ? s.returnReasonFor(r.id) : undefined;

  const actions = (
    <>
      {r.status === 'Draft' && <>
        <WhiteButton onClick={() => navigate(`/c1/access-requests/${r.id}/edit`)}>Edit</WhiteButton>
        <WhiteButton onClick={() => s.submitRequest(r.id)}>Submit for Approval</WhiteButton>
      </>}
      {r.status === 'Pending Approval' && <>
        <WhiteButton onClick={() => setDialog('Approved')}>Approve</WhiteButton>
        <WhiteButton onClick={() => setDialog('Returned for Amendment')}>Return for Amendment</WhiteButton>
        <WhiteButton onClick={() => setDialog('Rejected')}>Reject</WhiteButton>
        <Button size="small" variant="outlined" sx={{ color: '#fff', borderColor: '#fff' }} onClick={() => setDialog('withdraw')}>Withdraw</Button>
      </>}
      {r.status === 'Returned for Amendment' && <>
        <WhiteButton onClick={() => navigate(`/c1/access-requests/${r.id}/edit`)}>Edit</WhiteButton>
        <WhiteButton onClick={() => s.submitRequest(r.id)}>Resubmit</WhiteButton>
      </>}
      {r.status === 'Approved' && (r.createdUserId
        ? <WhiteButton onClick={() => navigate(`/c1/users/${r.createdUserId}`)}>View created user</WhiteButton>
        : <WhiteButton onClick={() => setDialog('activate')}>Activate Account</WhiteButton>)}
      {/* C5 / WF-C5-03 / Step 5 — follow the record to receive its status changes as a subscriber */}
      {following
        ? <Button size="small" variant="outlined" sx={{ color: '#fff', borderColor: '#fff' }}
                  onClick={() => s.unsubscribe(following.id)}>Following</Button>
        : <WhiteButton onClick={() => s.subscribeToRecord(`${r.id} ${r.requestedForName}`, 'Access request', r.defaultCountry, `/c1/access-requests/${r.id}`)}>
            Follow this record
          </WhiteButton>}
    </>
  );

  return (
    <>
      <PageBanner
        title="Access Request"
        breadcrumb={[s.activeCountry, 'C1 Identity and Access', 'Access Requests', r.id]}
      />
      <RecordHeader
        name={r.requestedForName}
        status={r.status}
        reference={r.id}
        date={r.raised}
        meta={[
          ['User type', r.userType],
          ['Origin', r.origin],
          ['Mode', r.mode],
          ['Current step', r.status === 'Pending Approval' ? `${r.currentStep + 1} of ${r.steps.length} — ${step?.role}` : '—']
        ]}
        actions={actions}
      />
      <Box sx={{ px: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: `1px solid ${tokens.border}` }}>
          <Tab label="Summary" /><Tab label="Documents" /><Tab label="Comments" /><Tab label="Approval" /><Tab label="Activity" /><Tab label="History" />
        </Tabs>
      </Box>
      <Box sx={{ p: 3 }}>
        {tab === 0 && (
          <Paper variant="outlined">
            <Box sx={{ bgcolor: '#EEF1F4', px: 2, py: 0.75 }}><Typography variant="subtitle2" color="text.secondary">Request origin</Typography></Box>
            <FieldGrid items={[['Origin', r.origin], ['Requested by', r.requestedBy], ['AD group detected', r.adGroup]]} />
            <Box sx={{ bgcolor: '#EEF1F4', px: 2, py: 0.75 }}><Typography variant="subtitle2" color="text.secondary">Person</Typography></Box>
            <FieldGrid items={[['Requested for', r.requestedForName], ['Employee / party reference', r.employeeRef], ['Contact email', r.email], ['Organisation unit', r.orgUnit], ['Preferred language', r.language]]} />
            <Box sx={{ bgcolor: '#EEF1F4', px: 2, py: 0.75 }}><Typography variant="subtitle2" color="text.secondary">Classification and scope</Typography></Box>
            <FieldGrid items={[
              ['User type', r.userType],
              ['Roles', r.roles.join(', ')],
              ['Country scope', r.countryScope.join(', ')],
              ['Narrower area', r.area],
              ['Module scope', r.moduleScope.join(', ')],
              ['Default country', r.defaultCountry],
              ['Effective from', r.effectiveFrom],
              ['Effective to', r.effectiveTo]
            ]} />
            {r.userType === 'External User' && (
              <>
                <Box sx={{ bgcolor: '#EEF1F4', px: 2, py: 0.75 }}><Typography variant="subtitle2" color="text.secondary">External party link</Typography></Box>
                <FieldGrid items={[['Party type', r.partyType], ['Party master record', r.partyRecord], ['Contract expiry', r.contractExpiry]]} />
              </>
            )}
          </Paper>
        )}

        {/* C07 1.1–1.5 — the real document panel, in the same position on every record */}
        {tab === 1 && (
          <DocumentsPanel7
            recordKey={r.id}
            recordName={`${r.id} ${r.requestedForName}`}
            objectType="Access request"
            country={r.defaultCountry}
            module="C1 Identity and Access"
            route={`/c1/access-requests/${r.id}`}
          />
        )}

        {/* C06 1.1 — the real comment panel, in the same position on every record */}
        {tab === 2 && (
          <CommentThread
            recordKey={r.id}
            recordName={`${r.id} ${r.requestedForName}`}
            objectType="Access request"
            country={r.defaultCountry}
            module="C1 Identity and Access"
            route={`/c1/access-requests/${r.id}`}
          />
        )}

        {tab === 3 && (
          <>
            {/* C04 1.4 — the route progress panel is a view of C4, on the subject record */}
            {c4View && (
              <>
                <RouteProgress view={c4View} compact />
                <Box sx={{ mb: 2 }}>
                  <Button size="small" variant="outlined" onClick={() => navigate(`/c4/approvals/${r.id}`)}>
                    Open the approval task in C4
                  </Button>
                </Box>
              </>
            )}
            <ApprovalPanel request={r} />
          </>
        )}

        {/* C06 2.4 — the merged activity timeline over C6, C7 and C8 */}
        {tab === 4 && <ActivityTimeline recordKey={r.id} recordName={`${r.id} ${r.requestedForName}`} />}

        {/* C08 2.1 — the record history, in business language */}
        {tab === 5 && <HistoryPanel8 recordKey={r.id} recordName={`${r.id} ${r.requestedForName}`} />}

        <ShellFooterNote />
      </Box>

      <ConfirmDialog
        open={dialog === 'Approved'}
        title="Approve this access request"
        body={<>
          Step {r.currentStep + 1} of {r.steps.length} — {step?.role}. On the final approval the account is activated and a welcome
          notification is issued: access instructions for an internal user, an activation link for an external user.
        </>}
        commentLabel="Comment"
        confirmLabel="Approve"
        onClose={() => setDialog(null)}
        onConfirm={(c) => s.decideRequest(r.id, 'Approved', c)}
      />
      <ConfirmDialog
        open={dialog === 'Rejected'}
        title="Reject this access request"
        body="The request is terminated and returns to the requester with the reason. A comment is mandatory."
        commentLabel="Reason for rejection" commentRequired
        confirmLabel="Reject" confirmColor="error"
        onClose={() => setDialog(null)}
        onConfirm={(c) => s.decideRequest(r.id, 'Rejected', c)}
      />
      <ConfirmDialog
        open={dialog === 'Returned for Amendment'}
        title="Return this access request for amendment"
        body="The record becomes editable again for the requester and, on resubmission, restarts from the step defined in configuration. A comment is mandatory and is shown prominently to the requester."
        commentLabel="Reason for return" commentRequired
        confirmLabel="Return for Amendment" confirmColor="warning"
        onClose={() => setDialog(null)}
        onConfirm={(c) => s.decideRequest(r.id, 'Returned for Amendment', c)}
      />
      <ConfirmDialog
        open={dialog === 'withdraw'}
        title="Withdraw this request"
        body="Withdrawal is permitted while the request is pending. The record returns to Draft and all open approval tasks are cancelled with notification — C4 / WF-C4-02 / Step 6."
        confirmLabel="Withdraw"
        onClose={() => setDialog(null)}
        onConfirm={() => s.withdrawRequest(r.id)}
      />
      <ConfirmDialog
        open={dialog === 'activate'}
        title="Activate the account"
        body={<>
          {r.userType === 'External User'
            ? 'An activation link will be issued rather than a transmitted password.'
            : 'Access instructions will be issued to the user.'}
          {' '}The account is created in Active status with the approved roles and scope, and the event is written to the audit trail.
        </>}
        confirmLabel="Activate Account"
        onClose={() => setDialog(null)}
        onConfirm={() => { const uid = s.activateAccount(r.id); if (uid) navigate(`/c1/users/${uid}`); }}
      />
    </>
  );
};
