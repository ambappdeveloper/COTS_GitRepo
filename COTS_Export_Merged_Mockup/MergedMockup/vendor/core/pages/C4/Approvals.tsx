import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControl, InputLabel, MenuItem, Paper, Select, Stack, Tab, Tabs, TextField, Typography,
  List, ListItem, ListItemText, FormControlLabel, Switch
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  ActionBar, ConfirmDialog, EmptyState, FieldGrid, FormSectionCard, HandOffBanner, PageBanner,
  PlaceholderNote, RecordHeader, SectionBand, StatusChip, WhiteButton
} from '../../components/shared';
import { DataTable, Column } from '../../components/DataTable';
import { RouteProgress } from '../../components/RouteProgress';
import { ApprovalView, APPROVER_REGISTER, slaLabel, slaState, slaWorkingHours } from '../../mockData/c4';
import { DOMAINS } from '../../mockData/c3';
import { ShellFooterNote, useShell } from '../../layouts/AppShell';

const roleLabel = (r: string) => r.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());

const stepLabel = (v: ApprovalView) => {
  const g = v.groups[v.currentGroup];
  if (!g) return '—';
  const names = g.members.map((m) => roleLabel(m.role)).join(' + ');
  return `${v.currentGroup + 1} of ${v.groups.length} — ${names}`;
};

const activeSla = (v: ApprovalView) => {
  const g = v.groups[v.currentGroup];
  return g ? slaWorkingHours(g.members[0]) : 0;
};

const remaining = (v: ApprovalView) => {
  const left = activeSla(v) - v.elapsedWorking;
  if (left >= 0) return `${left.toFixed(1)} working hours left`;
  return `${Math.abs(left).toFixed(1)} working hours past`;
};

/* ------------------------------------------------------------------ *
 * 1.1 My Approvals — WF-C4-01
 * ------------------------------------------------------------------ */

export const MyApprovals: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = React.useState(0);
  const [mineOnly, setMineOnly] = React.useState(false);
  const [correcting, setCorrecting] = React.useState<{ record: string; kind: string; route?: string } | null>(null);
  const [quick, setQuick] = React.useState<{ view: ApprovalView; decision: 'Approved' | 'Rejected' | 'Returned for Amendment' } | null>(null);

  const isMine = (v: ApprovalView) => {
    const g = v.groups[v.currentGroup];
    if (!g) return false;
    if (v.assignedApprover) return v.assignedApprover === s.currentUser?.name;
    return g.members.some((m) => s.resolveApprover(m.role, v.country).approver === s.currentUser?.name);
  };

  const pending = s.approvalQueue.filter((v) => (mineOnly ? isMine(v) : true));

  const decided = [
    ...s.approvalInstances.filter((i) => i.closed).map((i) => ({
      id: i.id, objectType: i.objectType, record: i.record, outcome: i.closed!,
      decidedBy: i.decisions[i.decisions.length - 1]?.approver ?? '—',
      at: i.decisions[i.decisions.length - 1]?.at ?? '—',
      comment: i.decisions[i.decisions.length - 1]?.comment ?? '—',
      route: undefined as string | undefined
    })),
    ...s.requests.filter((r) => ['Approved', 'Rejected', 'Returned for Amendment'].includes(r.status)).map((r) => ({
      id: r.id, objectType: 'Access request', record: `${r.id} ${r.requestedForName}`, outcome: r.status,
      decidedBy: r.steps.find((st) => st.decision)?.approver ?? '—',
      at: r.steps.find((st) => st.decision)?.at ?? '—',
      comment: r.steps.find((st) => st.decision)?.comment ?? '—',
      route: `/c1/access-requests/${r.id}`
    })),
    ...s.masterRecords.filter((r) => r.status === 'Active' && r.steps.some((st) => st.decision)).map((r) => ({
      id: r.id, objectType: 'Master data change', record: `${r.code} ${r.name}`, outcome: 'Approved',
      decidedBy: r.steps.find((st) => st.decision)?.approver ?? '—',
      at: r.steps.find((st) => st.decision)?.at ?? '—',
      comment: r.steps.find((st) => st.decision)?.comment ?? '—',
      route: `/c3/records/${r.id}`
    }))
  ];

  const columns: Column<ApprovalView>[] = [
    { key: 'objectType', label: 'Object type' },
    {
      key: 'record', label: 'Record',
      render: (v) => <Typography sx={{ fontSize: 13, color: tokens.primary, fontWeight: 500 }}>{v.record}</Typography>
    },
    { key: 'sourceModule', label: 'Source module' },
    { key: 'requester', label: 'Requester' },
    { key: 'country', label: 'Country' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'step', label: 'Step', value: stepLabel },
    {
      key: 'type', label: 'Step type',
      value: (v) => v.groups[v.currentGroup]?.type ?? '—',
      render: (v) => {
        const g = v.groups[v.currentGroup];
        return g?.type === 'Parallel'
          ? <Chip size="small" variant="outlined" label={`Parallel — ${g.rule?.toLowerCase()}`} sx={{ height: 19, fontSize: 10.5 }} />
          : <Typography sx={{ fontSize: 12.5 }}>Sequential</Typography>;
      }
    },
    { key: 'sla', label: 'Service level', value: (v) => (v.groups[v.currentGroup] ? slaLabel(v.groups[v.currentGroup].members[0]) : '—') },
    {
      key: 'remaining', label: 'Time remaining', value: remaining,
      render: (v) => {
        const st = slaState(v.elapsedWorking, activeSla(v));
        return (
          <Typography sx={{ fontSize: 12.5, color: st === 'Breached' ? '#D9660B' : tokens.textPrimary, fontWeight: st === 'Breached' ? 600 : 400 }}>
            {remaining(v)}
          </Typography>
        );
      }
    },
    {
      key: 'flags', label: 'Flags',
      value: (v) => [v.urgent ? 'Urgent' : '', slaState(v.elapsedWorking, activeSla(v)) === 'Breached' ? 'Escalated' : '', v.unresolved ? 'Held' : ''].filter(Boolean).join(' '),
      render: (v) => (
        <Stack direction="row" spacing={0.5}>
          {v.urgent && <Chip size="small" label="Urgent" sx={{ height: 19, fontSize: 10.5, bgcolor: '#FBEBDF', color: '#8A4208' }} />}
          {slaState(v.elapsedWorking, activeSla(v)) === 'Breached' && <StatusChip status="Escalated" />}
          {v.unresolved && <StatusChip status="Held" />}
        </Stack>
      )
    },
    { key: 'acting', label: 'Acting for', value: (v) => v.delegatedFrom ?? '—', optional: true },
    {
      key: 'actions', label: '',
      render: (v) => (
        <Stack direction="row" spacing={0.5}>
          <Button size="small" onClick={(e) => { e.stopPropagation(); navigate(`/c4/approvals/${v.id}`); }}>Open</Button>
          {!v.unresolved && (
            <Button size="small" onClick={(e) => { e.stopPropagation(); setQuick({ view: v, decision: 'Approved' }); }}>Approve</Button>
          )}
        </Stack>
      )
    }
  ];

  const commentMandatory = quick
    ? quick.decision !== 'Approved' || !!quick.view.groups[quick.view.currentGroup]?.members[0]?.commentOnApprove
    : false;

  return (
    <>
      <PageBanner
        title="My approvals"
        breadcrumb={[s.activeCountry, 'C4 Approval Workflow', 'My approvals']}
        subtitle="WF-C4-01 Standard Approval Cycle — every decision awaiting a user, across every module"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c4/submission-check')}>Submission check</WhiteButton>
            <WhiteButton onClick={() => navigate('/c4/sla')}>Service levels</WhiteButton>
            <WhiteButton onClick={() => navigate('/c4/routes')}>Approval routes</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, minHeight: 38 }}>
          <Tab label={`Pending decisions (${s.approvalQueue.length})`} sx={{ minHeight: 38, fontSize: 13 }} />
          <Tab label={`Approval history (${decided.length})`} sx={{ minHeight: 38, fontSize: 13 }} />
        </Tabs>

        {tab === 0 && (
          <>
            <DataTable
              columns={columns}
              rows={pending}
              onRowClick={(v) => navigate(`/c4/approvals/${v.id}`)}
              emptyMessage="No decisions are awaiting this filter"
              searchPlaceholder="Search pending approvals"
              toolbarExtra={
                <FormControlLabel
                  control={<Switch size="small" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />}
                  label={<Typography sx={{ fontSize: 12.5 }}>Awaiting me only</Typography>}
                />
              }
            />
            <Paper variant="outlined" sx={{ mt: 2 }}>
              <SectionBand>How this list is built</SectionBand>
              <Box sx={{ p: 2 }}>
                <Typography sx={{ fontSize: 13 }}>
                  The Actions Inbox (C2 / WF-C2-03) shows <i>all</i> open tasks. This list shows only approval decisions,
                  with the fields an approver needs to triage them: the step and its type, the service level, how much
                  working time is left, whether the request is urgent, and whose authority is being exercised where a
                  delegation applies. Access requests and master data changes appear here from C01 and C03; the remaining
                  object types are seeded because their owning modules are not built in this phase.
                </Typography>
                <PlaceholderNote>
                  Business confirmation required: whether any approval must be exercisable from a mobile device without
                  full system access (WF-C4-02).
                </PlaceholderNote>
              </Box>
            </Paper>
          </>
        )}

        {tab === 1 && (
          <>
            {decided.length === 0 ? (
              <EmptyState message="No decisions have been recorded yet" hint="Approve or reject a pending request to populate the approval history." />
            ) : (
              <Paper variant="outlined">
                <SectionBand>Approval history — the record of who decided what, and why</SectionBand>
                <List dense disablePadding>
                  {decided.map((d) => (
                    <ListItem key={d.id} divider secondaryAction={
                      <Button size="small" onClick={() => setCorrecting({ record: d.record, kind: d.objectType, route: d.route })}>
                        Alter this record
                      </Button>
                    }>
                      <ListItemText
                        primaryTypographyProps={{ fontSize: 13.5 }}
                        secondaryTypographyProps={{ fontSize: 12 }}
                        primary={<>{d.record} <StatusChip status={d.outcome} /></>}
                        secondary={`${d.objectType} · decided by ${d.decidedBy} at ${d.at} · “${d.comment}”`}
                      />
                    </ListItem>
                  ))}
                </List>
                <Box sx={{ p: 2 }}>
                  <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
                    The decision comment is written to the record and locked — HAND-OFF → C6 / WF-C6-02. The complete
                    decision history is recorded — HAND-OFF → C8 / WF-C8-01.
                  </Typography>
                </Box>
              </Paper>
            )}
          </>
        )}

        <ShellFooterNote />
      </Box>

      {/* 2.4 Correcting Transaction Notice — WF-C4-02 / Step 7 */}
      <Dialog open={!!correcting} onClose={() => setCorrecting(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Recall of an approved record is not permitted</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ fontSize: 13, mb: 2 }}>
            {correcting?.record} has completed its approval cycle. It cannot be recalled or edited in place, because the
            approval history must remain truthful — WF-C4-02 / Step 7.
          </Alert>
          <Typography sx={{ fontSize: 13, mb: 1 }}>Two legitimate routes remain:</Typography>
          <List dense>
            <ListItem><ListItemText primaryTypographyProps={{ fontSize: 13 }}
              primary="Raise a correcting transaction, which is itself approved and audited." /></ListItem>
            <ListItem><ListItemText primaryTypographyProps={{ fontSize: 13 }}
              primary="Create a new version through the owning module's amendment path, under the same approval control." /></ListItem>
          </List>
          {correcting?.kind === 'Master data change' && correcting.route && (
            <HandOffBanner label="CONTINUE" target="C3 / WF-C3-02 Master Data Amendment"
                           passed="The record and the attribute to be changed"
                           to={correcting.route} goLabel="Open the amendment path" />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCorrecting(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* row-level decision */}
      <ConfirmDialog
        open={!!quick}
        title={quick ? `${quick.decision === 'Approved' ? 'Approve' : quick.decision} — ${quick.view.record}` : ''}
        body={quick ? (
          <Typography sx={{ fontSize: 13 }}>
            Step {quick.view.groups[quick.view.currentGroup]?.seq} · {stepLabel(quick.view)}.
            {commentMandatory
              ? ' This route step requires a comment.'
              : ' A comment is optional on approval for this route step.'}
          </Typography>
        ) : ''}
        commentLabel="Decision comment"
        commentRequired={commentMandatory}
        confirmLabel={quick?.decision === 'Approved' ? 'Approve' : 'Confirm'}
        onClose={() => setQuick(null)}
        onConfirm={(comment) => { if (quick) s.decideApproval(quick.view.id, quick.decision, comment); setQuick(null); }}
      />
    </>
  );
};

/* ------------------------------------------------------------------ *
 * 1.2 Approval Task Detail and Decision — WF-C4-01 / Steps 7–8
 * ------------------------------------------------------------------ */

export const ApprovalTask: React.FC = () => {
  const s = useStore();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const shell = useShell();
  const view = s.approvalById(id);
  const [decision, setDecision] = React.useState<'Approved' | 'Rejected' | 'Returned for Amendment' | null>(null);
  const [holdOpen, setHoldOpen] = React.useState(false);
  const [namedApprover, setNamedApprover] = React.useState('');
  const [withdraw, setWithdraw] = React.useState(false);

  if (!view) {
    return (
      <>
        <PageBanner title="Approval task" breadcrumb={[s.activeCountry, 'C4 Approval Workflow', 'Approval task']} />
        <Box sx={{ p: 3 }}>
          <EmptyState
            message="This approval is no longer pending"
            hint="The cycle has completed, been withdrawn, or the record was decided elsewhere. Approval history is on the My approvals screen."
          />
          <ActionBar left={<WhiteButton onClick={() => navigate('/c4/approvals')}>Back to my approvals</WhiteButton>} />
        </Box>
      </>
    );
  }

  const group = view.groups[view.currentGroup];
  const step = group?.members[0];
  const resolution = step ? s.resolveApprover(step.role, view.country) : undefined;
  const heldRole = view.unresolved?.role;
  const commentMandatory = decision !== 'Approved' || !!step?.commentOnApprove;
  const candidates = APPROVER_REGISTER.filter((e) => e.role === (heldRole ?? step?.role)).map((e) => e.user);
  const uniqueCandidates = [...new Set(candidates.length ? candidates : APPROVER_REGISTER.map((e) => e.user))];
  const isTradeContract = /contract/i.test(view.objectType);

  return (
    <>
      <PageBanner
        title="Approval task"
        breadcrumb={[view.country, 'C4 Approval Workflow', 'My approvals', view.record.split(' ')[0]]}
        subtitle={`${view.objectType} · raised in ${view.sourceModule} · WF-C4-01 / Steps 7–8`}
        actions={<WhiteButton onClick={() => navigate('/c4/approvals')}>Back to my approvals</WhiteButton>}
      />
      <Box sx={{ p: 3 }}>
        <RecordHeader
          name={view.record}
          status={view.unresolved ? 'Held' : 'Pending Approval'}
          reference={view.id}
          date={`Submitted ${view.submitted}`}
          meta={[
            ['Object type', view.objectType],
            ['Source module', view.sourceModule],
            ['Requester', view.requester],
            ['Country', view.country],
            ['Step', stepLabel(view)],
            ['Urgent', view.urgent ? 'Yes' : 'No']
          ]}
          actions={
            <Stack direction="row" spacing={1}>
              {view.recordRoute && <WhiteButton onClick={() => navigate(view.recordRoute!)}>Open the record</WhiteButton>}
              <WhiteButton onClick={() => setWithdraw(true)}>Withdraw</WhiteButton>
            </Stack>
          }
        />

        {/* 1.5 Unresolved Approver Hold — WF-C4-01 / Step 5 */}
        {view.unresolved && (
          <Alert severity="error" sx={{ my: 2, fontSize: 13 }}
                 action={<Button size="small" color="inherit" onClick={() => setHoldOpen(true)}>Resolve</Button>}>
            <b>Held at step {group?.seq} — no approver could be resolved for {roleLabel(view.unresolved.role)}.</b><br />
            {view.unresolved.why} The step is not skipped and the request does not fail silently; the administrator has
            been alerted — HAND-OFF → C5 / WF-C5-01.
          </Alert>
        )}

        {view.escalation && (
          <Alert severity="warning" sx={{ my: 2, fontSize: 13 }}>
            Escalation in force: <b>{view.escalation}</b> — WF-C4-02 / Steps 3–4.
          </Alert>
        )}

        <RouteProgress view={view} />

        {/* subject record in context */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>The record being decided</SectionBand>
          <Box sx={{ p: 2 }}>
            <FieldGrid items={view.recordDetail.map(([k, v]) => [k, v] as [string, React.ReactNode])} />
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
              {view.recordRoute && <Button size="small" variant="outlined" onClick={() => navigate(view.recordRoute!)}>Documents, comments and history on the record</Button>}
              <Button size="small" variant="outlined" onClick={() => shell.openInfocard('CMD-0007')}>Related record infocard</Button>
              <Button size="small" variant="outlined" onClick={() => shell.openHelp('C4')}>What this step means</Button>
            </Stack>
            <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mt: 1.5 }}>
              The approver decides with the record in front of them — related records, documents, comments and infocards —
              never on a bare decision prompt.
            </Typography>
          </Box>
        </Paper>

        {/* approver resolution */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Approver resolution — WF-C4-01 / Step 5</SectionBand>
          <Box sx={{ p: 2 }}>
            <FieldGrid items={[
              ['Step names the role', step ? roleLabel(step.role) : '—'],
              ['Resolved to', view.assignedApprover ?? resolution?.approver ?? <span style={{ color: tokens.red }}>Unresolved</span>],
              ['Delegation applied', resolution?.delegateOf ? `Yes — acting for ${resolution.delegateOf}` : view.delegatedFrom ? `Yes — acting for ${view.delegatedFrom}` : 'No'],
              ['Basis', resolution?.basis ?? '—'],
              ['Service level', step ? slaLabel(step) : '—'],
              ['Comment on approval', step?.commentOnApprove ? 'Required by this route step' : 'Optional']
            ]} columns={2} />
            <PlaceholderNote kind="consistency">
              Integration consistency issue — delegation ownership. C1 / WF-C1-04 / Step 4 has C4 resolve tasks to the
              delegate with C2 presenting them; C2 / WF-C2-03 / Step 2 has C2 resolve from role to named user with
              delegation applied; C4 / WF-C4-01 / Step 5 places approver resolution and delegation inside C4. The
              prototype implements the C4 reading because that is where the approver is resolved. This needs a decision
              before development.
            </PlaceholderNote>
          </Box>
        </Paper>

        {/* decision panel */}
        <Paper variant="outlined">
          <SectionBand>Decision — WF-C4-01 / Steps 7–8</SectionBand>
          <Box sx={{ p: 2 }}>
            {view.unresolved ? (
              <Typography sx={{ fontSize: 13, color: tokens.textSecondary }}>
                No decision can be recorded while the step is held. Name an approver for this instance, or fix the role
                assignment in C01.
              </Typography>
            ) : (
              <>
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                  <Button variant="contained" onClick={() => setDecision('Approved')}>Approve</Button>
                  <Button variant="outlined" color="error" onClick={() => setDecision('Rejected')}>Reject</Button>
                  <Button variant="outlined" onClick={() => setDecision('Returned for Amendment')}>Return for amendment</Button>
                </Stack>
                <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mt: 1.5 }}>
                  A comment is mandatory on rejection and on return for amendment. On approval it is
                  {step?.commentOnApprove ? ' also mandatory, because this route step requires it.' : ' optional for this route step.'}
                  {' '}The rule comes from the route step, not from the screen.
                </Typography>
                {isTradeContract && (
                  <PlaceholderNote>
                    Business confirmation required: whether a digital signature is required for trade contracts, as
                    indicated in the original functional requirements, and if so to which standard
                    (WF-C4-01 / Step 8). A signature block is shown as a placeholder only.
                  </PlaceholderNote>
                )}
              </>
            )}
            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
              On the final approval the record is released and the downstream business action in {view.sourceModule} is
              triggered. On rejection the route rule is
              {' '}<b>{s.routes.find((r) => r.id === view.routeId)?.onReject.toLowerCase()}</b>; on return the route
              {' '}<b>{s.routes.find((r) => r.id === view.routeId)?.onReturn.toLowerCase()}</b> — WF-C4-03 / Step 4.
            </Typography>
            <Stack spacing={1} sx={{ mt: 2 }}>
              <HandOffBanner target="C6 / WF-C6-02 Decision Comments" passed="The decision comment, written to the record and locked" />
              <HandOffBanner target="C5 / WF-C5-01 Notification Dispatch" passed="The outcome, to every party with an interest" />
              <HandOffBanner target="C8 / WF-C8-01 Audit Capture" passed="The complete decision history" />
            </Stack>
          </Box>
        </Paper>

        <ShellFooterNote />
      </Box>

      <ConfirmDialog
        open={!!decision}
        title={decision === 'Approved' ? 'Approve this request' : decision === 'Rejected' ? 'Reject this request' : 'Return for amendment'}
        body={
          <Typography sx={{ fontSize: 13 }}>
            {decision === 'Approved' && (view.currentGroup >= view.groups.length - 1
              ? 'This is the final step. The record will be released and the downstream action triggered.'
              : `Step ${group?.seq} closes and step ${view.groups[view.currentGroup + 1]?.seq} becomes active.`)}
            {decision === 'Rejected' && `The route rule on rejection is: ${s.routes.find((r) => r.id === view.routeId)?.onReject}.`}
            {decision === 'Returned for Amendment' && `The record becomes editable again. On resubmission this route will ${s.routes.find((r) => r.id === view.routeId)?.onReturn.toLowerCase()}.`}
          </Typography>
        }
        commentLabel="Decision comment"
        commentRequired={commentMandatory}
        confirmColor={decision === 'Rejected' ? 'error' : 'primary'}
        confirmLabel={decision === 'Approved' ? 'Approve' : decision === 'Rejected' ? 'Reject' : 'Return'}
        onClose={() => setDecision(null)}
        onConfirm={(comment) => { if (decision) s.decideApproval(view.id, decision, comment); setDecision(null); }}
      />

      {/* unresolved approver hold — administrator remedy */}
      <Dialog open={holdOpen} onClose={() => setHoldOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Resolve the held step</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ fontSize: 13, mb: 2 }}>
            {view.unresolved?.why}
          </Alert>
          <Typography sx={{ fontSize: 13, mb: 1.5 }}>
            Two routes are available. Naming an approver releases this instance only; fixing the role assignment in C01
            is the durable remedy.
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Name an approver for this instance</InputLabel>
            <Select label="Name an approver for this instance" value={namedApprover} onChange={(e) => setNamedApprover(e.target.value)}>
              {uniqueCandidates.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
            </Select>
          </FormControl>
          <HandOffBanner label="DEPENDENCY" target="C1 / WF-C1-03 Role Assignment"
                         passed="The role that could not be resolved, and the country"
                         to="/c1/users" goLabel="Fix the role assignment" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHoldOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!namedApprover}
                  onClick={() => { s.assignInstanceApprover(view.id, namedApprover); setHoldOpen(false); }}>
            Name approver
          </Button>
        </DialogActions>
      </Dialog>

      {/* 2.3 Withdraw Request — WF-C4-02 / Step 6 */}
      <ConfirmDialog
        open={withdraw}
        title="Withdraw this request"
        body={
          <>
            <Typography sx={{ fontSize: 13 }}>
              Withdrawal is permitted only while the request is pending. The record returns to Draft and every open
              approval task is cancelled, with notification to the approvers.
            </Typography>
            <Typography sx={{ fontSize: 13, mt: 1 }}>
              Approvers who will be notified: {group?.members.map((m) => s.resolveApprover(m.role, view.country).approver ?? roleLabel(m.role)).join(', ')}.
            </Typography>
          </>
        }
        confirmLabel="Withdraw"
        confirmColor="warning"
        onClose={() => setWithdraw(false)}
        onConfirm={() => { s.withdrawApproval(view.id); setWithdraw(false); navigate('/c4/approvals'); }}
      />
    </>
  );
};

/* ------------------------------------------------------------------ *
 * 1.3 Submission Validation Result — WF-C4-01 / Step 1
 * ------------------------------------------------------------------ */

interface DraftRow {
  id: string;
  objectType: string;
  record: string;
  route: string;
  missingFields: string[];
  missingDocs: string[];
  submit: () => void;
}

export const SubmissionCheck: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [refused, setRefused] = React.useState<DraftRow | null>(null);

  const rows: DraftRow[] = [
    ...s.requests.filter((r) => r.status === 'Draft' || r.status === 'Returned for Amendment').map((r) => ({
      id: r.id,
      objectType: 'Access request',
      record: `${r.id} ${r.requestedForName}`,
      route: `/c1/access-requests/${r.id}`,
      missingFields: [
        ...(r.roles.length === 0 ? ['At least one role must be requested'] : []),
        ...(!r.email ? ['Email address'] : []),
        ...(!r.orgUnit ? ['Organisational unit'] : []),
        ...(r.userType === 'External User' && !r.partyRecord ? ['Linked party record'] : [])
      ],
      // C07 / WF-C7-01 / Step 8 — the live document checklist, not a static list
      missingDocs: s.checklistFor('Access request', r.id).outstanding,
      submit: () => s.submitRequest(r.id)
    })),
    ...s.masterRecords.filter((r) => r.status === 'Draft').map((r) => ({
      id: r.id,
      objectType: 'Master data change',
      record: `${r.code} ${r.name}`,
      route: `/c3/records/${r.id}`,
      missingFields: [
        ...(!r.name ? ['Name'] : []),
        ...(!r.owner ? ['Data owner'] : [])
      ],
      missingDocs: s.checklistFor(`Master data — ${DOMAINS.find((d) => d.key === r.domain)?.name ?? r.domain}`, r.code).outstanding,
      submit: () => s.submitMaster(r)
    }))
  ];

  const columns: Column<DraftRow>[] = [
    { key: 'objectType', label: 'Object type' },
    { key: 'record', label: 'Record', render: (r) => <Typography sx={{ fontSize: 13, color: tokens.primary }}>{r.record}</Typography> },
    {
      key: 'complete', label: 'Completeness',
      value: (r) => (r.missingFields.length + r.missingDocs.length === 0 ? 'Complete' : 'Incomplete'),
      render: (r) => <StatusChip status={r.missingFields.length + r.missingDocs.length === 0 ? 'Complete' : 'Incomplete'} />
    },
    { key: 'missing', label: 'What is missing', value: (r) => [...r.missingFields, ...r.missingDocs].join('; ') || '—' },
    {
      key: 'actions', label: '',
      render: (r) => (
        <Button size="small" onClick={(e) => {
          e.stopPropagation();
          if (r.missingFields.length + r.missingDocs.length > 0) setRefused(r);
          else { r.submit(); }
        }}>Submit for approval</Button>
      )
    }
  ];

  return (
    <>
      <PageBanner
        title="Submission check"
        breadcrumb={[s.activeCountry, 'C4 Approval Workflow', 'Submission check']}
        subtitle="WF-C4-01 / Step 1 — completeness is validated before a submission is accepted"
        actions={<WhiteButton onClick={() => navigate('/c4/approvals')}>Back to my approvals</WhiteButton>}
      />
      <Box sx={{ p: 3 }}>
        <Typography sx={{ fontSize: 13, mb: 2 }}>
          Every draft record that can enter an approval route is listed here with the result of the completeness check.
          A submission that fails is refused with the reasons, and each reason links back to where it is fixed. The
          check includes the documents mandated for the object type — DEPENDENCY → C7 / WF-C7-01.
        </Typography>
        <DataTable columns={columns} rows={rows} groupable={false} emptyMessage="No draft records are waiting to be submitted" />
        <ShellFooterNote />
      </Box>

      <Dialog open={!!refused} onClose={() => setRefused(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Submission refused — the record is incomplete</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ fontSize: 13, mb: 2 }}>
            {refused?.record} cannot enter the approval route until the following are supplied. Nothing has been sent to
            an approver — WF-C4-01 / Step 1.
          </Alert>
          {!!refused?.missingFields.length && (
            <FormSectionCard title="Mandatory fields">
              <List dense disablePadding>
                {refused.missingFields.map((m) => (
                  <ListItem key={m} disableGutters><ListItemText primaryTypographyProps={{ fontSize: 13 }} primary={m} /></ListItem>
                ))}
              </List>
            </FormSectionCard>
          )}
          {!!refused?.missingDocs.length && (
            <FormSectionCard
              title="Documents mandated for this object type"
              note="DEPENDENCY → C7 / WF-C7-01 — the mandated document checklist"
            >
              <List dense disablePadding>
                {refused.missingDocs.map((m) => (
                  <ListItem key={m} disableGutters><ListItemText primaryTypographyProps={{ fontSize: 13 }} primary={m} /></ListItem>
                ))}
              </List>
            </FormSectionCard>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefused(null)}>Close</Button>
          <Button variant="contained" onClick={() => { const r = refused; setRefused(null); if (r) navigate(r.route); }}>
            Fix the record
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
