import React from 'react';
import {
  Alert, Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select,
  Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { CaseTabs, RequirementChecklist } from '../../components/CaseWorkspace';
import {
  BottomBar, BusinessConfirmation, EmptyState, HandOffBanner, PrototypeNote, ReadOnlyField, RequiredLabel,
  SectionCard, TraceNote,
} from '../../components/shared';
import { useStore } from '../../state/store';
import { outstandingForCompletion, useS08 } from '../../state/s08store';
import { useS10 } from '../../state/s10store';
import {
  DELIVERABLE_STATUSES, NOT_BUILT, TASK_STATUSES, TODAY, daysBetween, isOverdue, openItems, overdueBy,
  progressOf, timelinePosition,
} from '../../mockData/s08';
import { countryOf, nodeById } from '../../mockData/s10';
import { COLORS } from '../../theme';
import { ProposalBanner, statusColour } from './Portfolio';

export default function ProjectWorkspace() {
  const { id } = useParams();
  const { country, say } = useStore();
  const {
    projects, updateProject, addTask, updateTask, addDeliverable, updateDeliverable, addTeamMember,
    budgetCaptured, inbox,
  } = useS08();
  const { people } = useS10();
  const nav = useNavigate();

  const p = projects.find((x) => x.id === id);
  const [tab, setTab] = React.useState(0);
  const [taskOpen, setTaskOpen] = React.useState(false);
  const [memberOpen, setMemberOpen] = React.useState(false);
  const [delOpen, setDelOpen] = React.useState(false);

  const [tDesc, setTDesc] = React.useState('');
  const [tAssignee, setTAssignee] = React.useState('');
  const [tPhase, setTPhase] = React.useState('');
  const [tDeliverable, setTDeliverable] = React.useState('');
  const [tStart, setTStart] = React.useState('19-Aug-2026');
  const [tEnd, setTEnd] = React.useState('05-Sep-2026');
  const [mPerson, setMPerson] = React.useState('');
  const [mRole, setMRole] = React.useState('');
  const [dDesc, setDDesc] = React.useState('');
  const [dTarget, setDTarget] = React.useState('30-Sep-2026');

  if (!p) {
    return (
      <AppShell title="Project" breadcrumb={[country, 'Shared Modules', 'Projects']} showSeason={false}>
        <ProposalBanner />
        <Alert severity="warning">No project with that reference exists in the prototype data.</Alert>
        <Button component={Link} to="/s08" variant="outlined" sx={{ mt: 2 }}>Back to the portfolio</Button>
      </AppShell>
    );
  }

  const person = (pid: string) => people.find((x) => x.id === pid);
  const g = progressOf(p);
  const t = timelinePosition(p);
  const o = openItems(p);
  const completed = p.status === 'Completed';
  const pendingApproval = p.status === 'Pending approval';
  const outstanding = outstandingForCompletion(p);

  // team members without a system account cannot be a task assignee — there is no inbox without one
  const assignable = p.team.map((m) => person(m.personId)).filter(Boolean);

  const phaseProgress = (phaseId: string) => {
    const ts = p.tasks.filter((x) => x.phaseId === phaseId);
    const done = ts.filter((x) => x.status === 'Complete').length;
    return { done, total: ts.length, percent: ts.length ? Math.round((done / ts.length) * 100) : 0 };
  };

  const projStart = new Date(p.start.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1, $3')).getTime();
  const projEnd = new Date(p.plannedEnd.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1, $3')).getTime();
  const pos = (dateStr: string) => {
    const d = new Date(dateStr.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1, $3')).getTime();
    return Math.max(0, Math.min(100, ((d - projStart) / (projEnd - projStart)) * 100));
  };

  return (
    <AppShell title={p.name} breadcrumb={[country, 'Shared Modules', 'Projects', p.id]} showSeason={false}>
      <ProposalBanner />

      <Box sx={{ bgcolor: COLORS.primary, color: '#fff', px: 2, py: 1.2, borderRadius: 1, mb: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{p.id} · {p.name}</Typography>
          <Chip size="small" label={p.status} sx={{ height: 20, bgcolor: statusColour(p.status), color: '#fff', fontWeight: 700 }} />
          {completed && <Chip size="small" icon={<LockOutlinedIcon sx={{ fontSize: 14 }} />} label="Completed — read-only" sx={{ height: 20, bgcolor: '#fff', color: COLORS.primaryDark, fontWeight: 700 }} />}
          <Chip size="small" label={`${g.percent} % · ${g.complete} of ${g.total} items`} sx={{ height: 20, bgcolor: '#fff', color: COLORS.primaryDark, fontWeight: 700 }} />
        </Stack>
        <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.92)' }}>
          {p.type} · {p.country} · Owner {person(p.ownerId)?.name ?? '—'} · {p.start} to {p.plannedEnd}
          {p.actualEnd ? ` · actual end ${p.actualEnd}` : ''}
        </Typography>
      </Box>

      {pendingApproval && (
        <Alert severity="warning" sx={{ mb: 2, fontSize: '0.82rem' }}>
          <b>Pending approval.</b> With the approval-at-initiation assumption on, this project cannot take
          deliverables, phases or tasks until it is approved. This is the unresolved variant, shown so the client can
          see what it changes.
        </Alert>
      )}

      <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary, letterSpacing: 0.4, display: 'block', mb: 0.5 }}>
        S08-SC-05 · PROJECT WORKSPACE
      </Typography>
      <CaseTabs
        tabs={['Overview and progress', 'Deliverables', 'Phases', 'Team', 'Tasks', 'Documents (C7)', 'Completion']}
        value={tab}
        onChange={setTab}
      />

      {/* ------------------------------------------------ overview / progress */}
      {tab === 0 && (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 480px', minWidth: 420 }}>
            <SectionCard title="S08-SC-11 · Derived progress">
              <TraceNote workflow="WF-S08-03 / Step 5 — COTS derives project progress from task and deliverable completion, and does not accept a manually entered subjective completion percentage" />

              <Stack direction="row" spacing={3} alignItems="baseline" sx={{ mt: 1 }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: COLORS.primary, lineHeight: 1 }}>{g.percent} %</Typography>
                  <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Derived progress</Typography>
                </Box>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: t.percent > g.percent ? COLORS.attention : COLORS.good, lineHeight: 1 }}>
                    {t.percent} %
                  </Typography>
                  <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Time elapsed</Typography>
                </Box>
              </Stack>

              <Box sx={{ mt: 1.5, border: `1px solid ${COLORS.border}`, borderRadius: 1, p: 1.5, bgcolor: '#FAFAFA' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary, display: 'block' }}>
                  THE ARITHMETIC, PRINTED
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  ({g.tasksComplete} of {g.tasksTotal} tasks + {g.delsComplete} of {g.delsTotal} deliverables) ={' '}
                  {g.complete} of {g.total} items = {g.percent} %
                </Typography>
                <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                  {t.elapsed} of {t.planned} planned days elapsed.
                </Typography>
              </Box>

              {t.percent > g.percent + 10 && (
                <Alert severity="warning" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                  Progress is behind time elapsed. <b>Progress and time are shown together</b> because {g.percent} % at
                  half-time is a different conversation from {g.percent} % at {t.percent} % elapsed — and management
                  should not have to do that arithmetic themselves.
                </Alert>
              )}

              <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                <b>There is no percent-complete field in this module.</b> Not a disabled one, not a hidden one, not an
                owner override. The number above is computed from countable things, which is the only way to
                demonstrate the rule rather than assert it.
              </Alert>
            </SectionCard>

            <SectionCard title="Scope and objective">
              <ReadOnlyField label="Scope" value={p.scope} />
              <Box sx={{ mt: 1.5 }}><ReadOnlyField label="Objective" value={p.objective} /></Box>
            </SectionCard>
          </Box>

          <Box sx={{ flex: '1 1 400px', minWidth: 360 }}>
            <SectionCard title="What this module deliberately does not have">
              <Table size="small">
                <TableBody>
                  {NOT_BUILT.map((r) => (
                    <TableRow key={r[0]}>
                      <TableCell sx={{ fontWeight: 600, width: 220 }}>{r[0]}</TableCell>
                      <TableCell sx={{ color: COLORS.textSecondary }}>{r[1]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mt: 1 }}>
                This table is the scope guard made visible. A reviewer who wants one of these rows should say so — but
                knowingly, because each one changes what this module is.
              </Typography>
            </SectionCard>

            {budgetCaptured(p.country) ? (
              <SectionCard title="S08-SC-03 · Budget">
                <ReadOnlyField
                  label="Budget"
                  value={p.budget ? `${p.currency} ${p.budget.toLocaleString()}` : 'No budget recorded — budget is optional'}
                />
                {p.budgetNote && <Box sx={{ mt: 1 }}><ReadOnlyField label="Basis" value={p.budgetNote} /></Box>}
                <BusinessConfirmation>
                  Confirm whether budget tracking extends to actual spend.
                  <PrototypeNote>no actual-spend, commitment or variance field exists anywhere in the module.</PrototypeNote>
                </BusinessConfirmation>
              </SectionCard>
            ) : (
              <SectionCard title="Budget">
                <Alert severity="info" sx={{ fontSize: '0.82rem' }}>
                  <b>Budget is not captured for {p.country}</b> — configured per country, so the panel is absent rather
                  than empty.
                </Alert>
              </SectionCard>
            )}

            <SectionCard title="Open items">
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <Chip size="small" label={`${o.tasks.length} open tasks`} sx={{ bgcolor: '#EEF4FA', color: COLORS.primaryDark, fontWeight: 600 }} />
                <Chip size="small" label={`${o.deliverables.length} open deliverables`} sx={{ bgcolor: '#EEF4FA', color: COLORS.primaryDark, fontWeight: 600 }} />
                {o.overdueTasks.length + o.overdueDeliverables.length > 0 && (
                  <Chip
                    size="small" label={`${o.overdueTasks.length + o.overdueDeliverables.length} overdue`}
                    sx={{ bgcolor: '#FDECEA', color: COLORS.bad, fontWeight: 700 }}
                  />
                )}
              </Stack>
            </SectionCard>
          </Box>
        </Box>
      )}

      {/* ------------------------------------------------ S08-SC-06 deliverables */}
      {tab === 1 && (
        <SectionCard
          title="S08-SC-06 · Deliverables"
          right={!completed && !pendingApproval ? <Button size="small" variant="contained" onClick={() => setDelOpen(true)}>Add a deliverable</Button> : undefined}
        >
          <TraceNote workflow="WF-S08-02 / Step 1 — the deliverables listed, each with a description and a target date" />
          {p.deliverables.length === 0 ? (
            <EmptyState text="No deliverable has been listed yet." />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Description', 'Target date', 'Status', 'Linked tasks', 'Overdue'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {p.deliverables.map((dv) => {
                  const ts = p.tasks.filter((x) => x.deliverableId === dv.id);
                  const done = ts.filter((x) => x.status === 'Complete').length;
                  return (
                    <TableRow key={dv.id}>
                      <TableCell>{dv.description}</TableCell>
                      <TableCell>{dv.targetDate}</TableCell>
                      <TableCell>
                        <Select
                          size="small" value={dv.status} disabled={completed}
                          onChange={(e) => updateDeliverable(p.id, dv.id, { status: e.target.value })}
                          sx={{ minWidth: 150 }}
                        >
                          {DELIVERABLE_STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </Select>
                      </TableCell>
                      <TableCell>{ts.length} tasks · {done} complete</TableCell>
                      <TableCell>
                        {isOverdue(dv.targetDate, dv.status) && (
                          <Chip size="small" label={`Overdue by ${overdueBy(dv.targetDate)} days`} sx={{ height: 19, bgcolor: '#FDECEA', color: COLORS.bad, fontWeight: 700 }} />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mt: 1 }}>
            Deliverable status feeds the derived progress figure — the progress panel shows deliverables and tasks
            separately so the percentage is legible.
          </Typography>
        </SectionCard>
      )}

      {/* ------------------------------------------------ S08-SC-07 phases */}
      {tab === 2 && (
        <SectionCard title="S08-SC-07 · Phases and timeline">
          <TraceNote workflow="WF-S08-02 / Steps 2, 4 — phases with start and end dates, giving a timeline that can be shown against actual progress" />

          {p.phases.length === 0 ? (
            <EmptyState text="No phase has been defined yet." />
          ) : (
            <Box sx={{ mt: 1 }}>
              {p.phases.map((ph) => {
                const pr = phaseProgress(ph.id);
                const left = pos(ph.start);
                const width = Math.max(2, pos(ph.end) - left);
                const over = isOverdue(ph.end, pr.percent === 100 ? 'Complete' : 'In progress');
                return (
                  <Box key={ph.id} sx={{ mb: 1.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 220 }}>{ph.name}</Typography>
                      <Typography variant="caption" sx={{ color: COLORS.textSecondary, minWidth: 200 }}>
                        {ph.start} → {ph.end}
                      </Typography>
                      <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                        {pr.done} of {pr.total} tasks complete
                      </Typography>
                      {over && (
                        <Chip size="small" label={`Overrun by ${overdueBy(ph.end)} days`} sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#FDECEA', color: COLORS.bad, fontWeight: 700 }} />
                      )}
                    </Stack>
                    <Box sx={{ position: 'relative', height: 18, bgcolor: '#F0F0F0', borderRadius: 0.5, mt: 0.5 }}>
                      <Box sx={{ position: 'absolute', left: `${left}%`, width: `${width}%`, top: 0, bottom: 0, bgcolor: '#CFE3F2', borderRadius: 0.5 }}>
                        <Box sx={{ width: `${pr.percent}%`, height: '100%', bgcolor: COLORS.primary, borderRadius: 0.5 }} />
                      </Box>
                      <Box sx={{ position: 'absolute', left: `${pos(TODAY)}%`, top: -3, bottom: -3, width: 2, bgcolor: COLORS.attention }} />
                    </Box>
                  </Box>
                );
              })}
              <Typography variant="caption" sx={{ color: COLORS.attention, fontWeight: 700 }}>
                | Today ({TODAY})
              </Typography>
            </Box>
          )}

          <Alert severity="info" sx={{ mt: 2, fontSize: '0.8rem' }}>
            <b>No dependencies, no critical path, no drag-to-reschedule.</b> The bars are read from dates the user
            typed and filled from task completion. This is the timeline the source asks for and nothing more — a
            timeline chart is exactly where a full project management system starts to grow by itself.
          </Alert>
        </SectionCard>
      )}

      {/* ------------------------------------------------ S08-SC-08 team */}
      {tab === 3 && (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 560px', minWidth: 440 }}>
            <SectionCard
              title="S08-SC-08 · Project team"
              right={!completed && !pendingApproval ? <Button size="small" variant="contained" onClick={() => setMemberOpen(true)}>Add a member</Button> : undefined}
            >
              <TraceNote workflow="WF-S08-02 / Step 3 — the project team recorded, drawing the members from the team directory rather than entering them as free text" />
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Name', 'Position', 'Area · country', 'Contact', 'System user', 'Role on the project'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {p.team.map((m) => {
                    const x = person(m.personId);
                    return (
                      <TableRow key={m.personId}>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: COLORS.primary }}>{x?.initials}</Avatar>
                            <Link to={`/s10/person/${m.personId}`} style={{ color: COLORS.primary, fontWeight: 600 }}>{x?.name}</Link>
                          </Stack>
                        </TableCell>
                        <TableCell>{x?.position}</TableCell>
                        <TableCell>{x?.areaId ? `${nodeById(x.areaId)?.name} · ${countryOf(x.areaId)}` : '—'}</TableCell>
                        <TableCell>{x?.telephone}</TableCell>
                        <TableCell>
                          {x?.userAccount
                            ? x.userAccount
                            : <Chip size="small" label="No system user" sx={{ height: 19, bgcolor: '#FFF4E5', color: COLORS.attention, fontWeight: 700 }} />}
                        </TableCell>
                        <TableCell>{m.projectRole}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                <b>There is no free-text name field on this screen.</b> Members are drawn from the S10 team directory,
                so the project team resolves to the same people as approvals and notifications. The role on the project
                is project data, so that <i>is</i> editable here.
              </Alert>

              {p.team.some((m) => !person(m.personId)?.userAccount) && (
                <Alert severity="warning" sx={{ mt: 1, fontSize: '0.8rem' }}>
                  A member without a system account can be on the team, but <b>cannot be a task assignee</b> — task
                  assignment creates an Actions Inbox item and there is no inbox without an account. The assignee
                  picker shows them as unavailable with that reason rather than silently omitting them.
                </Alert>
              )}
            </SectionCard>
          </Box>

          <Box sx={{ flex: '1 1 360px', minWidth: 320 }}>
            <SectionCard title="Someone not in the directory?">
              <TraceNote workflow="WF-S08-02 / Step 3 branch — where a required person is not held in the team directory, the directory entry is created in S10 first, so that the project team remains resolvable" />
              <Alert severity="info" sx={{ fontSize: '0.82rem' }}>
                The panel does not offer to type their name. A person who exists only as text in one module cannot be
                resolved for notification, cannot carry a role, and cannot be found by anyone else.
              </Alert>
              <Button size="small" variant="contained" component={Link} to="/s10/directory" sx={{ mt: 1 }}>
                Create the directory entry in S10 first
              </Button>
              <HandOffBanner
                to="S10 Team Directory"
                passes="the requirement for a directory entry"
                returns="the person record, selectable here"
                resumes="The project team resolves to the same people as approvals and notifications"
                linkLabel="Open the team directory"
                linkTo="/s10/directory"
              />
            </SectionCard>
          </Box>
        </Box>
      )}

      {/* ------------------------------------------------ S08-SC-09 tasks */}
      {tab === 4 && (
        <SectionCard
          title="S08-SC-09 · Tasks"
          right={!completed && !pendingApproval ? <Button size="small" variant="contained" onClick={() => { setTDesc(''); setTAssignee(''); setTaskOpen(true); }}>Assign a task</Button> : undefined}
        >
          <TraceNote workflow="WF-S08-03 / Steps 1, 3–4 — tasks with description, status, dates and an assignee; overdue tasks highlighted and the assignee prompted" />

          <Table size="small">
            <TableHead>
              <TableRow>
                {['Description', 'Assignee', 'Phase · deliverable', 'Start · end', 'Status', 'Overdue', 'Actions Inbox'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {p.tasks.map((tk) => {
                const ph = p.phases.find((x) => x.id === tk.phaseId);
                const dv = p.deliverables.find((x) => x.id === tk.deliverableId);
                return (
                  <TableRow key={tk.id} sx={{ bgcolor: isOverdue(tk.end, tk.status) ? '#FFF7ED' : undefined }}>
                    <TableCell>{tk.description}</TableCell>
                    <TableCell>{person(tk.assigneeId)?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ display: 'block' }}>{ph?.name ?? '—'}</Typography>
                      <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>{dv?.description ?? 'No deliverable'}</Typography>
                    </TableCell>
                    <TableCell>{tk.start} · {tk.end}</TableCell>
                    <TableCell>
                      <Select
                        size="small" value={tk.status} disabled={completed}
                        onChange={(e) => updateTask(p.id, tk.id, { status: e.target.value })}
                        sx={{ minWidth: 140 }}
                      >
                        {TASK_STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell>
                      {isOverdue(tk.end, tk.status) && (
                        <Chip size="small" label={`Overdue by ${overdueBy(tk.end)} days`} sx={{ height: 19, bgcolor: '#FDECEA', color: COLORS.bad, fontWeight: 700 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      {tk.inboxRaised
                        ? <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Raised {tk.inboxRaised}</Typography>
                        : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
            <b>Overdue is calculated, never typed.</b> A task is overdue because its end date has passed and its status
            is not complete. There is no <i>is overdue</i> flag for anyone to set or clear, so the overdue counts on the
            portfolio and the report cannot be massaged. The status values are <b>configuration</b>:{' '}
            {TASK_STATUSES.join(' · ')}.
          </Alert>

          {inbox.length > 0 && (
            <Alert severity="success" sx={{ mt: 1, fontSize: '0.8rem' }}>
              <b>{inbox.length} Actions Inbox item{inbox.length === 1 ? '' : 's'} raised this session</b> —{' '}
              {inbox.map((i) => `${i.description} → ${person(i.assigneeId)?.name}`).join('; ')}. Simulated C2; not
              production functionality.
            </Alert>
          )}
        </SectionCard>
      )}

      {/* ------------------------------------------------ documents */}
      {tab === 5 && (
        <SectionCard title="S08-SC-04 · Project documents (Core C7)">
          {p.documents.length === 0 ? <EmptyState text="No document attached." /> : (
            <Table size="small">
              <TableHead>
                <TableRow>{['Document', 'Attached by'].map((h) => <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>)}</TableRow>
              </TableHead>
              <TableBody>
                {p.documents.map((d) => (
                  <TableRow key={d}>
                    <TableCell sx={{ color: COLORS.primary }}>{d}</TableCell>
                    <TableCell>{person(p.ownerId)?.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <PrototypeNote>document storage is Core C7. No file is actually stored in the prototype.</PrototypeNote>
        </SectionCard>
      )}

      {/* ------------------------------------------------ S08-SC-12 completion */}
      {tab === 6 && (
        <Box sx={{ maxWidth: 820 }}>
          <SectionCard title="S08-SC-12 · Project completion">
            <TraceNote workflow="WF-S08-04 / Steps 1–2 — when the deliverables and tasks are complete the status is maintained as completed and the actual end date recorded; the record is retained" />

            {!completed ? (
              <>
                <RequirementChecklist
                  rows={[
                    { item: 'All deliverables complete', provided: o.deliverables.length === 0, note: `${p.deliverables.length - o.deliverables.length} of ${p.deliverables.length}` },
                    { item: 'All tasks complete', provided: o.tasks.length === 0, note: `${p.tasks.length - o.tasks.length} of ${p.tasks.length}` },
                  ]}
                />
                <Box sx={{ mt: 2, maxWidth: 260 }}>
                  <RequiredLabel label="Actual end date" required />
                  <TextField
                    size="small" fullWidth sx={{ mt: 0.5 }} value={p.actualEnd ?? ''}
                    onChange={(e) => updateProject(p.id, { actualEnd: e.target.value })}
                    placeholder="e.g. 19-Aug-2026"
                  />
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Closing note (optional)</Typography>
                  <TextField
                    size="small" fullWidth multiline minRows={2} sx={{ mt: 0.5 }} value={p.closingNote ?? ''}
                    onChange={(e) => updateProject(p.id, { closingNote: e.target.value })}
                  />
                </Box>

                <Tooltip title={outstanding.length ? `${outstanding.length} open items` : ''}>
                  <span>
                    <Button
                      variant="contained" sx={{ mt: 2 }}
                      disabled={outstanding.length > 0 || !p.actualEnd}
                      onClick={() => { updateProject(p.id, { status: 'Completed' }); say(`Project ${p.id} completed. The record is retained.`); }}
                    >
                      Complete the project
                    </Button>
                  </span>
                </Tooltip>

                {(outstanding.length > 0 || !p.actualEnd) && (
                  <Alert severity="warning" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                    <b>Completion is blocked:</b>
                    <Box component="ul" sx={{ pl: 2, m: 0.5 }}>
                      {!p.actualEnd && <li>The actual end date has not been recorded.</li>}
                      {outstanding.map((x) => <li key={x}>{x}</li>)}
                    </Box>
                  </Alert>
                )}
              </>
            ) : (
              <>
                <Alert severity="success" sx={{ fontSize: '0.82rem' }}>
                  Completed on <b>{p.actualEnd}</b>. Planned {daysBetween(p.start, p.plannedEnd)} days, actual{' '}
                  {daysBetween(p.start, p.actualEnd!)} days —{' '}
                  <b>{daysBetween(p.plannedEnd, p.actualEnd!) > 0
                    ? `${daysBetween(p.plannedEnd, p.actualEnd!)} days over plan`
                    : `${Math.abs(daysBetween(p.plannedEnd, p.actualEnd!))} days inside plan`}</b>.
                </Alert>
                {p.closingNote && <Box sx={{ mt: 1.5 }}><ReadOnlyField label="Closing note" value={p.closingNote} /></Box>}
                <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                  The project is <b>read-only</b>. {p.documents.length} documents, {p.deliverables.length} deliverable
                  records and {p.tasks.length} task histories are retained (C7, C8). The project stays in the portfolio
                  under a completed filter — nothing is archived out of sight.
                </Alert>
              </>
            )}
          </SectionCard>
        </Box>
      )}

      <BottomBar>
        <Button variant="outlined" onClick={() => nav('/s08')}>Back to the portfolio</Button>
        <Button variant="outlined" component={Link} to="/s08/reports">Portfolio reporting</Button>
      </BottomBar>

      {/* ------------------------------------------ S08-SC-10 task assignment */}
      <Dialog open={taskOpen} onClose={() => setTaskOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>S08-SC-10 · Assign a task</DialogTitle>
        <DialogContent>
          <TraceNote workflow="WF-S08-03 / Steps 1–2 — the task and its assignee; assignment creates an item in the assignee's Actions Inbox, which is what makes the follow-up real rather than nominal" />
          <Box sx={{ mt: 1 }}>
            <RequiredLabel label="Description" required />
            <TextField size="small" fullWidth sx={{ mt: 0.5 }} value={tDesc} onChange={(e) => setTDesc(e.target.value)} />
          </Box>
          <Box sx={{ mt: 2 }}>
            <RequiredLabel label="Assignee — project team members only" required />
            <Select size="small" fullWidth displayEmpty value={tAssignee} onChange={(e) => setTAssignee(e.target.value)} sx={{ mt: 0.5 }}>
              <MenuItem value=""><em>Select</em></MenuItem>
              {assignable.map((x) => (
                <MenuItem key={x!.id} value={x!.id} disabled={!x!.userAccount}>
                  {x!.name} · {x!.position}
                  {!x!.userAccount ? ' — unavailable: no system account, so no Actions Inbox' : ''}
                </MenuItem>
              ))}
            </Select>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Phase</Typography>
              <Select size="small" fullWidth displayEmpty value={tPhase} onChange={(e) => setTPhase(e.target.value)} sx={{ mt: 0.5 }}>
                <MenuItem value=""><em>None</em></MenuItem>
                {p.phases.map((ph) => <MenuItem key={ph.id} value={ph.id}>{ph.name}</MenuItem>)}
              </Select>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Deliverable</Typography>
              <Select size="small" fullWidth displayEmpty value={tDeliverable} onChange={(e) => setTDeliverable(e.target.value)} sx={{ mt: 0.5 }}>
                <MenuItem value=""><em>None</em></MenuItem>
                {p.deliverables.map((dv) => <MenuItem key={dv.id} value={dv.id}>{dv.description}</MenuItem>)}
              </Select>
            </Box>
            <Box>
              <RequiredLabel label="Start date" required />
              <TextField size="small" fullWidth sx={{ mt: 0.5 }} value={tStart} onChange={(e) => setTStart(e.target.value)} />
            </Box>
            <Box>
              <RequiredLabel label="End date" required />
              <TextField size="small" fullWidth sx={{ mt: 0.5 }} value={tEnd} onChange={(e) => setTEnd(e.target.value)} />
            </Box>
          </Box>

          {tAssignee && (
            <Alert severity="info" sx={{ mt: 2, fontSize: '0.82rem' }}>
              Assigning this task will place an item in <b>{person(tAssignee)?.name}</b>'s Actions Inbox. That is what
              makes the follow-up real rather than nominal.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskOpen(false)}>Cancel</Button>
          <Tooltip title={!tDesc || !tAssignee ? 'A description and an assignee are required.' : ''}>
            <span>
              <Button
                variant="contained" disabled={!tDesc || !tAssignee}
                onClick={() => {
                  const tid = `T-${100 + p.tasks.length}`;
                  addTask(p.id, {
                    id: tid, description: tDesc, assigneeId: tAssignee,
                    phaseId: tPhase || undefined, deliverableId: tDeliverable || undefined,
                    start: tStart, end: tEnd, status: 'Not started', inboxRaised: '19-Aug-2026',
                  });
                  say(`Task assigned to ${person(tAssignee)?.name}. An Actions Inbox item has been raised.`);
                  setTaskOpen(false);
                }}
              >
                Assign and raise the inbox item
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>

      {/* add team member */}
      <Dialog open={memberOpen} onClose={() => setMemberOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add a team member</DialogTitle>
        <DialogContent>
          <TraceNote workflow="WF-S08-02 / Step 3 — members drawn from the team directory rather than entered as free text" />
          <Box sx={{ mt: 1 }}>
            <RequiredLabel label="Person — from the S10 team directory" required />
            <Select size="small" fullWidth displayEmpty value={mPerson} onChange={(e) => setMPerson(e.target.value)} sx={{ mt: 0.5 }}>
              <MenuItem value=""><em>Select from the directory</em></MenuItem>
              {people.filter((x) => x.active && !p.team.some((m) => m.personId === x.id)).map((x) => (
                <MenuItem key={x.id} value={x.id}>
                  {x.name} · {x.position}{!x.userAccount ? ' · no system user' : ''}
                </MenuItem>
              ))}
            </Select>
            <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
              There is no free-text alternative. Someone not held in the directory is created in S10 first.
            </Typography>
          </Box>
          <Box sx={{ mt: 2 }}>
            <RequiredLabel label="Role on the project" required />
            <TextField size="small" fullWidth sx={{ mt: 0.5 }} value={mRole} onChange={(e) => setMRole(e.target.value)} placeholder="e.g. Site supervision" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberOpen(false)}>Cancel</Button>
          <Button component={Link} to="/s10/directory">Not in the directory — open S10</Button>
          <Tooltip title={!mPerson || !mRole ? 'Select a person and give their project role.' : ''}>
            <span>
              <Button
                variant="contained" disabled={!mPerson || !mRole}
                onClick={() => { addTeamMember(p.id, mPerson, mRole); setMemberOpen(false); setMPerson(''); setMRole(''); }}
              >
                Add to the team
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>

      {/* add deliverable */}
      <Dialog open={delOpen} onClose={() => setDelOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add a deliverable</DialogTitle>
        <DialogContent>
          <TraceNote workflow="WF-S08-02 / Step 1 — each deliverable with a description and a target date" />
          <Box sx={{ mt: 1 }}>
            <RequiredLabel label="Description" required />
            <TextField size="small" fullWidth sx={{ mt: 0.5 }} value={dDesc} onChange={(e) => setDDesc(e.target.value)} />
          </Box>
          <Box sx={{ mt: 2, maxWidth: 240 }}>
            <RequiredLabel label="Target date" required />
            <TextField size="small" fullWidth sx={{ mt: 0.5 }} value={dTarget} onChange={(e) => setDTarget(e.target.value)} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelOpen(false)}>Cancel</Button>
          <Tooltip title={!dDesc ? 'A description is required.' : ''}>
            <span>
              <Button
                variant="contained" disabled={!dDesc}
                onClick={() => {
                  addDeliverable(p.id, { id: `D-${100 + p.deliverables.length}`, description: dDesc, targetDate: dTarget, status: 'Not started' });
                  setDelOpen(false); setDDesc('');
                }}
              >
                Add the deliverable
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
