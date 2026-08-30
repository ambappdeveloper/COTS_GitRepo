import React from 'react';
import {
  Alert, Box, Button, Chip, FormControlLabel, MenuItem, Select, Stack, Switch, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { DataTable, type Column } from '../../components/DataTable';
import {
  BottomBar, BusinessConfirmation, PrototypeNote, ReadOnlyField, RequiredLabel, SectionCard, TraceNote,
} from '../../components/shared';
import { useStore } from '../../state/store';
import { useS08 } from '../../state/s08store';
import { useS10 } from '../../state/s10store';
import {
  PROJECT_TYPES, openItems, progressOf, timelinePosition, type Project,
} from '../../mockData/s08';
import { COLORS } from '../../theme';

/** Proposal marker — on every screen of a proposal-stage module. */
export function ProposalBanner() {
  return (
    <Box sx={{ border: `1px dashed ${COLORS.attention}`, bgcolor: '#FFF7ED', borderRadius: 1, px: 1.5, py: 1, mb: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Chip size="small" label="PROPOSAL" sx={{ height: 20, bgcolor: COLORS.attention, color: '#fff', fontWeight: 700 }} />
        <Typography variant="caption" sx={{ color: COLORS.textPrimary, fontWeight: 600 }}>
          S8 is at proposal stage. Its purpose is basic planning and follow-up so management can see the active
          projects per country — <b>without attempting to be a full project management system</b>.
        </Typography>
      </Stack>
    </Box>
  );
}

export const statusColour = (s: string) =>
  s === 'Completed' ? COLORS.good : s === 'Pending approval' ? COLORS.attention : COLORS.progress;

/* ================================================ S08-SC-01 portfolio */

export default function Portfolio() {
  const { country } = useStore();
  const { projects, budgetCaptured } = useS08();
  const { people } = useS10();
  const nav = useNavigate();

  const owner = (id: string) => people.find((p) => p.id === id)?.name ?? '—';

  const active = projects.filter((p) => p.status !== 'Completed');
  const completedThisYear = projects.filter((p) => p.status === 'Completed').length;
  const withOverdue = projects.filter((p) => openItems(p).overdueTasks.length + openItems(p).overdueDeliverables.length > 0);
  const overdueItems = projects.reduce((s, p) => s + openItems(p).overdueTasks.length + openItems(p).overdueDeliverables.length, 0);
  const noBudget = projects.filter((p) => budgetCaptured(p.country) && !p.budget).length;

  const columns: Column<Project>[] = [
    {
      key: 'id', label: 'Project', filterable: true,
      render: (r) => (
        <Box component="span" onClick={() => nav(`/s08/project/${r.id}`)} sx={{ color: COLORS.primary, fontWeight: 600, cursor: 'pointer' }}>
          {r.id} · {r.name}
        </Box>
      ),
      value: (r) => `${r.id} ${r.name}`,
    },
    { key: 'type', label: 'Type', filterable: true, value: (r) => r.type },
    { key: 'country', label: 'Country', filterable: true, value: (r) => r.country },
    { key: 'owner', label: 'Owner', render: (r) => owner(r.ownerId), value: (r) => owner(r.ownerId) },
    {
      key: 'status', label: 'Status', filterable: true,
      render: (r) => <Chip size="small" label={r.status} sx={{ height: 20, color: '#fff', bgcolor: statusColour(r.status), fontWeight: 600 }} />,
      value: (r) => r.status,
    },
    { key: 'dates', label: 'Start · planned end', render: (r) => `${r.start} · ${r.plannedEnd}`, value: (r) => r.start },
    {
      key: 'timeline', label: 'Timeline position',
      render: (r) => {
        const t = timelinePosition(r);
        return r.status === 'Completed' ? `Completed ${r.actualEnd}` : `${t.elapsed} of ${t.planned} days elapsed`;
      },
      value: (r) => timelinePosition(r).percent,
    },
    {
      key: 'progress', label: 'Progress (derived)',
      render: (r) => {
        const g = progressOf(r);
        return (
          <Tooltip title={`${g.tasksComplete} of ${g.tasksTotal} tasks and ${g.delsComplete} of ${g.delsTotal} deliverables complete`}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{g.percent} %</Typography>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                {g.complete} of {g.total} items
              </Typography>
            </Box>
          </Tooltip>
        );
      },
      value: (r) => progressOf(r).percent,
    },
    {
      key: 'open', label: 'Open items',
      render: (r) => {
        const o = openItems(r);
        const od = o.overdueTasks.length + o.overdueDeliverables.length;
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>{o.tasks.length + o.deliverables.length} open</span>
            {od > 0 && <Chip size="small" label={`${od} overdue`} sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#FDECEA', color: COLORS.bad, fontWeight: 700 }} />}
          </Stack>
        );
      },
      value: (r) => openItems(r).tasks.length + openItems(r).deliverables.length,
    },
    {
      key: 'budget', label: 'Budget',
      render: (r) => {
        if (!budgetCaptured(r.country)) {
          return <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Not captured for {r.country}</Typography>;
        }
        return r.budget
          ? `${r.currency} ${r.budget.toLocaleString()}`
          : <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>No budget recorded</Typography>;
      },
      value: (r) => r.budget ?? 0,
    },
  ];

  return (
    <AppShell title="Projects" breadcrumb={[country, 'Shared Modules', 'Projects']} showSeason={false}>
      <ProposalBanner />

      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>
          PORTFOLIO POSITION
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
          {[
            { k: 'Active projects', v: String(active.length), n: 'Across all countries' },
            { k: 'Completed', v: String(completedThisYear), n: 'Retained in the portfolio, not archived' },
            { k: 'Projects with overdue items', v: String(withOverdue.length), n: 'Calculated, never flagged by hand' },
            { k: 'Overdue items', v: String(overdueItems), n: 'Tasks and deliverables past their date' },
            { k: 'No budget recorded', v: String(noBudget), n: 'A neutral fact — budget is optional' },
          ].map((c) => (
            <Box key={c.k} sx={{ border: `1px solid ${COLORS.border}`, bgcolor: '#fff', borderRadius: 1, px: 1.5, py: 1, minWidth: 190, flex: '1 1 190px' }}>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary, fontWeight: 700 }}>{c.k}</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.primary, lineHeight: 1.2 }}>{c.v}</Typography>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>{c.n}</Typography>
            </Box>
          ))}
        </Stack>
      </Box>

      <SectionCard title="S08-SC-01 · Project portfolio">
        <TraceNote workflow="WF-S08-01 / Step 1 and WF-S08-04 / Step 3 — projects registered per country, with status, timeline position and open items" />
        <DataTable
          columns={columns}
          rows={projects}
          onNew={() => nav('/s08/register')}
          newLabel="Register a project"
          toolbarNote="Every progress figure carries its basis — n of m items complete — because progress is derived from completion, not entered."
        />
      </SectionCard>

      <BottomBar>
        <Button variant="contained" component={Link} to="/s08/register">Register a project</Button>
        <Button variant="outlined" component={Link} to="/s08/reports">Portfolio reporting</Button>
      </BottomBar>
    </AppShell>
  );
}

/* ============================== S08-SC-02 / 03 / 04 registration + budget */

export function ProjectRegistration() {
  const { country, say } = useStore();
  const { projects, addProject, approvalAtInitiation, setApprovalAtInitiation, budgetCaptured } = useS08();
  const { people } = useS10();
  const nav = useNavigate();

  const [name, setName] = React.useState('');
  const [type, setType] = React.useState('');
  const [scope, setScope] = React.useState('');
  const [objective, setObjective] = React.useState('');
  const [ownerId, setOwnerId] = React.useState('');
  const [start, setStart] = React.useState('01-Sep-2026');
  const [plannedEnd, setPlannedEnd] = React.useState('15-Dec-2026');
  const [budget, setBudget] = React.useState('');
  const [currency, setCurrency] = React.useState('USD');
  const [budgetNote, setBudgetNote] = React.useState('');
  const [docs, setDocs] = React.useState<string[]>([]);

  const captures = budgetCaptured(country);

  // Budget is NEVER in this list — the business was explicit that it must not be mandatory.
  const blocking: string[] = [];
  if (!name) blocking.push('The project name is required.');
  if (!type) blocking.push('The project type is required.');
  if (!scope) blocking.push('The scope description is required.');
  if (!objective) blocking.push('The objective is required.');
  if (!ownerId) blocking.push('A named project owner is required, selected from the team directory.');
  if (budget && !currency) blocking.push('A currency is required when a budget amount is entered.');

  const onSave = () => {
    const id = `PRJ-00${46 + projects.length - 4}`;
    addProject({
      id, name, type, country, scope, objective, ownerId,
      status: approvalAtInitiation ? 'Pending approval' : 'Active',
      start, plannedEnd,
      budget: budget ? Number(budget) : undefined,
      currency: budget ? currency : undefined,
      budgetNote: budget ? budgetNote : undefined,
      team: [{ personId: ownerId, projectRole: 'Project owner' }],
      deliverables: [], phases: [], tasks: [], documents: docs,
    });
    say(approvalAtInitiation
      ? `Project ${id} registered as Pending approval. It cannot take deliverables, phases or tasks until approved.`
      : `Project ${id} registered and active.`);
    nav(`/s08/project/${id}`);
  };

  return (
    <AppShell title="Register a project" breadcrumb={[country, 'Shared Modules', 'Projects', 'Register']} showSeason={false}>
      <ProposalBanner />

      <BusinessConfirmation>
        Confirm that the proposed Projects workflow and scope are approved by the business.
      </BusinessConfirmation>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 540px', minWidth: 440 }}>
          <SectionCard title="S08-SC-02 · Project registration">
            <TraceNote workflow="WF-S08-01 / Steps 1–3 — registered in the active country with name, type, scope, objective, a named owner and the timeline" />

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 1 }}>
              <Box>
                <RequiredLabel label="Project name" required />
                <TextField size="small" fullWidth sx={{ mt: 0.5 }} value={name} onChange={(e) => setName(e.target.value)} />
              </Box>
              <Box>
                <RequiredLabel label="Project type" required />
                <Select size="small" fullWidth displayEmpty value={type} onChange={(e) => setType(e.target.value)} sx={{ mt: 0.5 }}>
                  <MenuItem value=""><em>Select</em></MenuItem>
                  {PROJECT_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
                <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                  The four types are <b>configuration</b>, not a fixed list in code.
                </Typography>
              </Box>
              <ReadOnlyField label="Country" value={`${country} — from the country selector`} />
              <Box>
                <RequiredLabel label="Project owner" required />
                <Select size="small" fullWidth displayEmpty value={ownerId} onChange={(e) => setOwnerId(e.target.value)} sx={{ mt: 0.5 }}>
                  <MenuItem value=""><em>Select from the team directory</em></MenuItem>
                  {people.filter((p) => p.active).map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name} · {p.position}</MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                  From <b>S10</b>, like the team — a free-text owner would break the same resolvability.
                </Typography>
              </Box>
              <Box>
                <RequiredLabel label="Start date" required />
                <TextField size="small" fullWidth sx={{ mt: 0.5 }} value={start} onChange={(e) => setStart(e.target.value)} />
              </Box>
              <Box>
                <RequiredLabel label="Planned end date" required />
                <TextField size="small" fullWidth sx={{ mt: 0.5 }} value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} />
              </Box>
            </Box>

            <Box sx={{ mt: 2 }}>
              <RequiredLabel label="Scope description" required />
              <TextField size="small" fullWidth multiline minRows={2} sx={{ mt: 0.5 }} value={scope} onChange={(e) => setScope(e.target.value)} />
            </Box>
            <Box sx={{ mt: 2 }}>
              <RequiredLabel label="Objective" required />
              <TextField size="small" fullWidth multiline minRows={2} sx={{ mt: 0.5 }} value={objective} onChange={(e) => setObjective(e.target.value)} />
            </Box>

            <Box sx={{ mt: 2 }}>
              <ReadOnlyField label="Status on registration" value={approvalAtInitiation ? 'Pending approval' : 'Active'} />
            </Box>

            <BusinessConfirmation>
              Confirm whether projects require approval at initiation, or are simply registered.
            </BusinessConfirmation>
            <FormControlLabel
              control={<Switch size="small" checked={approvalAtInitiation} onChange={(e) => setApprovalAtInitiation(e.target.checked)} />}
              label={
                <Typography variant="caption" sx={{ color: COLORS.attention, fontWeight: 700 }}>
                  PROTOTYPE — require approval at initiation
                </Typography>
              }
            />
            <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary }}>
              Off by default, which follows the process flow — <i>a project is registered in the active country</i>.
              With it on, the project is created as <b>Pending approval</b>, cannot take deliverables, phases or tasks
              until approved, and routes through C4 to the country approval role resolved from S10. Neither behaviour
              is presented as decided.
            </Typography>
          </SectionCard>
        </Box>

        <Box sx={{ flex: '1 1 380px', minWidth: 340 }}>
          {/* --------------------------------------------- S08-SC-03 budget */}
          {captures ? (
            <SectionCard title="S08-SC-03 · Budget">
              <TraceNote workflow="WF-S08-01 / Step 4 — a budget and its currency are recorded where one is available; budget is optional and must not be a mandatory field" />
              <ReadOnlyField label="Budget captured for this country" value={`Yes — configured for ${country}`} />

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 1.5 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Budget amount (optional)</Typography>
                  <TextField size="small" fullWidth type="number" sx={{ mt: 0.5 }} value={budget} onChange={(e) => setBudget(e.target.value)} />
                </Box>
                <Box>
                  <RequiredLabel label="Currency" required={!!budget} />
                  <Select size="small" fullWidth value={currency} onChange={(e) => setCurrency(e.target.value)} sx={{ mt: 0.5 }}>
                    {['USD', 'SDG', 'ETB'].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </Box>
              </Box>
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Budget note (optional)</Typography>
                <TextField size="small" fullWidth sx={{ mt: 0.5 }} value={budgetNote} onChange={(e) => setBudgetNote(e.target.value)} />
              </Box>

              <Alert severity="success" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                <b>No required marker, and no nag.</b> The project saves with the budget blank, produces no warning and
                no empty-state prompt. A form that technically allows a blank while badgering the user about it has not
                honoured the instruction that budget must not be mandatory.
              </Alert>

              <BusinessConfirmation>
                Confirm whether budget tracking extends to actual spend, which would significantly increase the scope
                of this module.
                <PrototypeNote>
                  there is <b>no actual-spend field, no commitment tracking and no variance figure</b> anywhere in the
                  module. If the answer is yes, it needs a spend capture point, a source for committed and incurred
                  cost, and a reconciliation to finance.
                </PrototypeNote>
              </BusinessConfirmation>
            </SectionCard>
          ) : (
            <SectionCard title="Budget">
              <Alert severity="info" sx={{ fontSize: '0.82rem' }}>
                <b>Budget is not captured for {country}.</b> Whether budget is captured at all is configured per
                country, so the panel is <b>absent rather than empty</b> — there is nothing to leave blank and nothing
                to explain away.
              </Alert>
            </SectionCard>
          )}

          {/* ----------------------------------------- S08-SC-04 documents */}
          <SectionCard title="S08-SC-04 · Project documents (Core C7)">
            <TraceNote workflow="WF-S08-01 / Step 5 — project documentation attached through the document module" />
            <Stack direction="row" spacing={1} alignItems="center">
              <Button size="small" variant="outlined" onClick={() => setDocs((d) => [...d, `project-document-${d.length + 1}.pdf`])}>
                Attach a document
              </Button>
              <Typography variant="body2">{docs.length} attached</Typography>
            </Stack>
            {docs.map((d) => (
              <Typography key={d} variant="caption" sx={{ display: 'block', color: COLORS.textSecondary }}>· {d}</Typography>
            ))}
            <PrototypeNote>
              project documentation is the <b>existing C7 capability</b>, not a new one — the estimate should say so.
            </PrototypeNote>
          </SectionCard>
        </Box>
      </Box>

      <BottomBar>
        <Tooltip title={blocking.length ? blocking.join(' ') : ''}>
          <span>
            <Button variant="contained" disabled={blocking.length > 0} onClick={onSave}>Register the project</Button>
          </span>
        </Tooltip>
        <Button variant="outlined" component={Link} to="/s08">Cancel</Button>
        {blocking.length > 0 && (
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: COLORS.bad, fontWeight: 700 }}>Registration is blocked:</Typography>
            {blocking.map((b) => (
              <Typography key={b} variant="caption" sx={{ display: 'block', color: COLORS.textSecondary }}>· {b}</Typography>
            ))}
          </Box>
        )}
      </BottomBar>
    </AppShell>
  );
}
