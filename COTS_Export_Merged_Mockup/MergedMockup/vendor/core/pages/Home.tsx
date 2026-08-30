import React from 'react';
import {
  Box, Paper, Typography, Stack, Button, Chip, Divider, List, ListItemButton, ListItemText, Drawer,
  IconButton, Tooltip
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import CloseIcon from '@mui/icons-material/Close';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { tokens } from '../theme';
import { PageBanner, SectionBand, StatusChip, EmptyState, PlaceholderNote, HandOffBanner, WhiteButton } from '../components/shared';
import { DataTable, Column } from '../components/DataTable';
import { ShareBar } from '../components/Charts';
import { Task, DORMANCY_THRESHOLD_DAYS } from '../mockData';
import { CARD_CATALOGUE, INFO_OBJECTS, REPORTS_TO, COUNTRY_CONTEXT } from '../mockData/c2';
import { ShellFooterNote, useShell } from '../layouts/AppShell';

const Card: React.FC<{ title: string; module?: string; children: React.ReactNode; action?: React.ReactNode }> =
  ({ title, module, children, action }) => (
    <Paper variant="outlined">
      <SectionBand>
        <Stack direction="row" alignItems="center" spacing={1}>
          <span>{title}</span>
          <Box sx={{ flex: 1 }} />
          {module && <Typography sx={{ fontSize: 10.5, opacity: 0.75 }}>{module}</Typography>}
        </Stack>
      </SectionBand>
      <Box sx={{ p: 2 }}>{children}</Box>
      {action && <Box sx={{ px: 2, pb: 1.5 }}>{action}</Box>}
    </Paper>
  );

const Metric: React.FC<{ value: React.ReactNode; label: string; colour?: string }> = ({ value, label, colour }) => (
  <Box>
    <Typography sx={{ fontSize: 34, fontWeight: 300, color: colour ?? tokens.primary, lineHeight: 1.1 }}>{value}</Typography>
    <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>{label}</Typography>
  </Box>
);

/** S-03 Home / Role Dashboard — C2 / WF-C2-02 */
export const Home: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const shell = useShell();
  const user = s.currentUser!;
  const [arrange, setArrange] = React.useState(false);

  const layout = s.layoutFor(user.id, s.activeCountry);
  const permitted = s.permittedCards(user.id);
  const ctx = COUNTRY_CONTEXT[s.activeCountry];

  const tasks = s.openTasksFor(user.id);
  const pendingApprovals = s.requests.filter((r) => r.status === 'Pending Approval');
  const reviewsDue = s.reviewPacks.filter((p) => p.status === 'Open');
  const activeDelegations = s.delegations.filter((d) => d.status === 'Active');
  const dormant = s.users.filter((u) => !u.lastLogin || u.lastLogin < '2026-05-20');
  const reports = s.users.filter((u) => REPORTS_TO[u.id] === user.id);
  const teamTasks = s.tasks.filter((t) => reports.some((r) => r.id === t.assigneeId) && t.status !== 'Closed');
  const isStakeholder = user.userType === 'Internal Stakeholder';
  const countryObjects = INFO_OBJECTS.filter((o) => o.country === s.activeCountry).slice(0, 5);

  const renderCard = (key: string) => {
    const def = CARD_CATALOGUE.find((c) => c.key === key);
    if (!def) return null;
    const drill = <Button size="small" onClick={() => navigate(def.drillTo)}>Open</Button>;

    switch (key) {
      case 'pending':
        return (
          <Card key={key} title={def.title} module={def.owningModule} action={<Button size="small" onClick={() => navigate('/inbox')}>Open inbox</Button>}>
            <Stack direction="row" spacing={4} sx={{ mb: 2 }}>
              <Metric value={tasks.length} label="Open tasks" />
              <Metric value={tasks.filter((t) => t.status === 'Overdue').length} label="Overdue" colour={tokens.orange} />
              <Metric value={tasks.filter((t) => t.priority === 'Urgent').length} label="Urgent" colour={tokens.red} />
            </Stack>
            {tasks.length === 0 ? <EmptyState message="No tasks awaiting you" /> : (
              <List dense disablePadding>
                {tasks.slice(0, 4).map((t) => (
                  <ListItemButton key={t.id} onClick={() => navigate(t.route)} sx={{ px: 1 }}>
                    <ListItemText primaryTypographyProps={{ fontSize: 13 }} primary={t.type} secondary={`${t.relatedRecord} · due ${t.due}`} />
                    {t.priority === 'Urgent' && <StatusChip status="Urgent" />}
                    {t.status === 'Overdue' && <StatusChip status="Overdue" />}
                  </ListItemButton>
                ))}
              </List>
            )}
          </Card>
        );
      case 'requests':
        return (
          <Card key={key} title={def.title} module={def.owningModule} action={drill}>
            <Metric value={pendingApprovals.length} label="Awaiting approval" />
            <Divider sx={{ my: 1.5 }} />
            <Stack spacing={0.5}>
              {(['Draft', 'Returned for Amendment', 'Approved', 'Rejected'] as const).map((st) => (
                <Stack key={st} direction="row" spacing={1} alignItems="center">
                  <StatusChip status={st} />
                  <Typography sx={{ fontSize: 13 }}>{s.requests.filter((r) => r.status === st).length}</Typography>
                </Stack>
              ))}
            </Stack>
          </Card>
        );
      case 'reviews':
        return (
          <Card key={key} title={def.title} module={def.owningModule} action={drill}>
            <Metric value={reviewsDue.length} label="Open review packs" colour={tokens.orange} />
            <Divider sx={{ my: 1.5 }} />
            {reviewsDue.map((p) => (
              <Typography key={p.id} sx={{ fontSize: 13 }}>
                {p.country} {p.cycle} — {p.entries.filter((e) => e.decision).length} of {p.entries.length} decided, due {p.due}
              </Typography>
            ))}
          </Card>
        );
      case 'delegations':
        return (
          <Card key={key} title={def.title} module={def.owningModule} action={drill}>
            <Metric value={activeDelegations.length} label="Active delegations" />
            <Divider sx={{ my: 1.5 }} />
            {activeDelegations.length === 0 ? <EmptyState message="No delegations in force" /> : activeDelegations.map((d) => (
              <Typography key={d.id} sx={{ fontSize: 13 }}>{d.fromUser} → {d.toUser} ({d.start} to {d.end})</Typography>
            ))}
          </Card>
        );
      case 'dormant':
        return (
          <Card key={key} title={def.title} module={def.owningModule} action={drill}>
            <Metric value={dormant.length} label={`Beyond the ${DORMANCY_THRESHOLD_DAYS}-day threshold`} colour={tokens.orange} />
          </Card>
        );
      case 'recent':
        return (
          <Card key={key} title={def.title} module={def.owningModule}>
            <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mb: 1 }}>
              Any reference to a key object is an active link. Selecting one opens the infocard without leaving this
              page — C2 / WF-C2-04 / Steps 1–2.
            </Typography>
            <List dense disablePadding>
              {countryObjects.map((o) => (
                <ListItemButton key={o.id} sx={{ px: 1 }} onClick={() => shell.openInfocard(o.id)}>
                  <ListItemText
                    primaryTypographyProps={{ fontSize: 13, color: tokens.primary }}
                    primary={o.name}
                    secondary={`${o.kind} · ${o.id}`}
                  />
                  <StatusChip status={o.status} />
                </ListItemButton>
              ))}
            </List>
          </Card>
        );
      case 'alerts':
        return (
          <Card key={key} title={def.title} module={def.owningModule}>
            <Stack spacing={1}>
              {s.notifications.slice(0, 3).map((n) => (
                <Box key={n.id}>
                  <Typography sx={{ fontSize: 13 }}>{n.subject}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>{n.event} · {n.at}</Typography>
                </Box>
              ))}
            </Stack>
          </Card>
        );
      case 'ageing':
        return (
          <Card key={key} title={def.title} module={def.owningModule} action={<Button size="small" onClick={() => navigate('/c2/team')}>Open team view</Button>}>
            <Metric value={teamTasks.length} label={`Open across ${reports.length} report${reports.length === 1 ? '' : 's'}`} />
            <Divider sx={{ my: 1.5 }} />
            {reports.length === 0 ? <EmptyState message="No direct reports" /> : reports.map((r) => {
              const n = teamTasks.filter((t) => t.assigneeId === r.id).length;
              return (
                <Stack key={r.id} direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography sx={{ fontSize: 12.5, width: 120 }}>{r.name}</Typography>
                  <ShareBar value={n} total={teamTasks.length} width={90} />
                </Stack>
              );
            })}
          </Card>
        );
      case 'throughput':
        return (
          <Card key={key} title={def.title} module={def.owningModule} action={<Button size="small" onClick={() => navigate('/c2/analytics')}>Open analytics</Button>}>
            <Metric value="5.0 d" label="Average completion time" />
            <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mt: 1 }}>
              Slowest step: Country Manager approval, 5.1 days against a 2-day service level.
            </Typography>
          </Card>
        );
      case 'compliance':
        return (
          <Card key={key} title={def.title} module={def.owningModule} action={<Button size="small" onClick={() => navigate('/c2/analytics')}>Open</Button>}>
            <Metric value="4" label="Sensitive actions this month" colour={tokens.orange} />
            <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mt: 1 }}>
              Role changes, configuration changes and document deletions are classified as sensitive by C8.
            </Typography>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <PageBanner
        title={`Home — ${s.activeCountry}`}
        breadcrumb={[s.activeCountry, 'Home']}
        subtitle={`${user.name} · ${user.userType} · ${user.assignments.filter((a) => a.status === 'Active').map((a) => a.role).join(', ') || 'no operational role'}`}
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton startIcon={<TuneIcon />} onClick={() => setArrange(true)}>Arrange dashboard</WhiteButton>
            <WhiteButton onClick={() => navigate('/inbox')}>Open Actions Inbox</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: '#F7F9FB' }}>
          <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
            <b>Country configuration in force:</b> currency {ctx?.currency}, reporting in {ctx?.reportingCurrency} ·
            {' '}{ctx?.calendar} · {ctx?.season}
            {ctx && ctx.stepsNotApplicable.length > 0 && <> · hidden in this country: {ctx.stepsNotApplicable.join(', ')}</>}
          </Typography>
        </Paper>

        {isStakeholder && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#F2F8FD' }}>
            <Typography sx={{ fontSize: 13.5 }}>
              <b>Internal Stakeholder layout.</b> This user type lands on a reporting-oriented dashboard rather than an
              operational one — C2 / WF-C2-02 / Step 4. Operational cards are not offered, even in the Arrange dashboard drawer.
            </Typography>
          </Paper>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: 'repeat(3, 1fr)' }, gap: 2, mb: 2 }}>
          {layout.map((k) => renderCard(k))}
        </Box>

        {layout.length === 0 && <EmptyState message="No cards on your dashboard" hint="Use Arrange dashboard to add cards permitted to your role." />}

        <PlaceholderNote>the definitive list of dashboard cards per role, to be produced with each module owner (C2 / WF-C2-02). The cards above are illustrative.</PlaceholderNote>
        <HandOffBanner
          target="C11 / WF-C11-02 Dashboards and Scheduled Distribution"
          passed="Role, active country, permitted card set"
          returned="Card definitions with measure, filters, permission and drill-through target — one catalogue, enriched in C11 and rendered here"
          resumes="C2 / WF-C2-02 / Step 4"
          to="/c11/cards"
          goLabel="Open the card catalogue"
        />
        <HandOffBanner
          label="DEPENDENCY"
          target="C11 / WF-C11-02 / Step 2 Role Default Dashboards"
          passed="The default card set for your role, which you land on until you arrange your own"
          returned="Your arrangement, held per user per country and never overwritten by a change to the default"
          to="/c11/role-dashboards"
          goLabel="Open the role defaults"
        />
        <PlaceholderNote kind="consistency">
          the dashboard card catalogue and role default layouts appear as configuration in both C2 and C11 —
          C2 / WF-C2-02 / Step 3 has cards supplied by the owning module, while C11 / WF-C11-02 / Step 1 has each
          module publish the catalogue. Confirm which module owns that configuration.
        </PlaceholderNote>
        <ShellFooterNote />
      </Box>

      <ArrangeDrawer open={arrange} onClose={() => setArrange(false)} layout={layout} permitted={permitted} />
    </>
  );
};

/** C2 / WF-C2-02 / Step 5 — arrange, add or remove cards within the set permitted to the role */
const ArrangeDrawer: React.FC<{ open: boolean; onClose: () => void; layout: string[]; permitted: string[] }> =
  ({ open, onClose, layout, permitted }) => {
    const s = useStore();
    const user = s.currentUser!;
    const [draft, setDraft] = React.useState<string[]>(layout);
    React.useEffect(() => { if (open) setDraft(layout); }, [open]);

    const available = permitted.filter((k) => !draft.includes(k));
    const move = (i: number, d: number) => {
      const next = [...draft];
      const j = i + d;
      if (j < 0 || j >= next.length) return;
      [next[i], next[j]] = [next[j], next[i]];
      setDraft(next);
    };
    const title = (k: string) => CARD_CATALOGUE.find((c) => c.key === k);

    return (
      <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 460 } }}>
        <Box sx={{ bgcolor: tokens.primary, color: '#fff', px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Arrange dashboard</Typography>
          <IconButton size="small" sx={{ color: '#fff' }} onClick={onClose}><CloseIcon /></IconButton>
        </Box>
        <Box sx={{ p: 2, flex: 1, overflowY: 'auto' }}>
          <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mb: 1.5 }}>
            The arrangement is saved per user <b>per country</b>. You are editing the layout for <b>{s.activeCountry}</b>.
          </Typography>

          <SectionBand>On my dashboard ({draft.length})</SectionBand>
          <Box sx={{ mt: 1, mb: 2 }}>
            {draft.length === 0 && <EmptyState message="No cards selected" />}
            {draft.map((k, i) => (
              <Paper key={k} variant="outlined" sx={{ p: 1, mb: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 13 }}>{title(k)?.title}</Typography>
                  <Typography sx={{ fontSize: 11, color: tokens.textSecondary }}>{title(k)?.owningModule}</Typography>
                </Box>
                <Tooltip title="Move up"><IconButton size="small" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUpwardIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Move down"><IconButton size="small" disabled={i === draft.length - 1} onClick={() => move(i, 1)}><ArrowDownwardIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Remove"><IconButton size="small" onClick={() => setDraft(draft.filter((x) => x !== k))}><RemoveIcon fontSize="small" /></IconButton></Tooltip>
              </Paper>
            ))}
          </Box>

          <SectionBand>Available to my role ({available.length})</SectionBand>
          <Box sx={{ mt: 1 }}>
            {available.length === 0 && <EmptyState message="Every permitted card is already on your dashboard" />}
            {available.map((k) => (
              <Paper key={k} variant="outlined" sx={{ p: 1, mb: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 13 }}>{title(k)?.title}</Typography>
                  <Typography sx={{ fontSize: 11, color: tokens.textSecondary }}>{title(k)?.owningModule}</Typography>
                </Box>
                <Tooltip title="Add"><IconButton size="small" onClick={() => setDraft([...draft, k])}><AddIcon fontSize="small" /></IconButton></Tooltip>
              </Paper>
            ))}
          </Box>

          <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mt: 2 }}>
            Only cards permitted to your role appear here. A card your role may not see is never offered —
            C2 / WF-C2-02 / Step 5.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex' }}>
          <Button sx={{ py: 1.5, borderRadius: 0, flex: 1 }} onClick={() => { s.resetLayout(user.id, s.activeCountry); onClose(); }}>Reset to role default</Button>
          <Button sx={{ py: 1.5, borderRadius: 0, flex: 1 }} onClick={onClose}>Cancel</Button>
          <Button variant="contained" sx={{ py: 1.5, borderRadius: 0, flex: 1 }} onClick={() => { s.setLayout(user.id, s.activeCountry, draft); onClose(); }}>Apply</Button>
        </Box>
      </Drawer>
    );
  };

/** S-04 Actions Inbox — C2 / WF-C2-03 */
export const Inbox: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const user = s.currentUser!;
  const rows = s.tasks.filter((t) => t.assigneeId === user.id);
  const hasReports = s.users.some((u) => REPORTS_TO[u.id] === user.id);

  const columns: Column<Task>[] = [
    { key: 'type', label: 'Task type' },
    { key: 'sourceModule', label: 'Source module' },
    { key: 'relatedRecord', label: 'Related record', render: (t) => <Typography sx={{ fontSize: 13, color: tokens.primary }}>{t.relatedRecord}</Typography> },
    { key: 'requester', label: 'Requester' },
    { key: 'raised', label: 'Raised' },
    { key: 'due', label: 'Due' },
    { key: 'priority', label: 'Priority', render: (t) => (t.priority === 'Urgent' ? <StatusChip status="Urgent" /> : <Typography sx={{ fontSize: 13 }}>Normal</Typography>) },
    { key: 'status', label: 'Status', render: (t) => <StatusChip status={t.status} /> },
    { key: 'onBehalfOf', label: 'Acting for' }
  ];

  return (
    <>
      <PageBanner
        title="Actions Inbox"
        breadcrumb={[s.activeCountry, 'C2 Shell, Navigation and Inbox', 'Actions Inbox']}
        subtitle="Everything awaiting you, from every module, in one list"
        actions={
          <Stack direction="row" spacing={1}>
            {hasReports && <WhiteButton onClick={() => navigate('/c2/team')}>Team view</WhiteButton>}
            <WhiteButton onClick={() => navigate('/c2/analytics')}>Task analytics</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <DataTable columns={columns} rows={rows} selectable onRowClick={(t) => navigate(t.route)} emptyMessage="No tasks in this view" />
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography sx={{ fontSize: 13 }}>
            A task closes automatically when the underlying action is completed. It can never be closed by hand
            without the action being performed — C2 / WF-C2-03 / Step 6. Group the list by task type, source module
            or priority using the grouping bar above.
          </Typography>
          <HandOffBanner label="DEPENDENCY" target="C1 / WF-C1-04 Delegation and Absence Cover" passed="Approver role" returned="Named assignee with delegation applied" />
          <HandOffBanner target="C5 / WF-C5-01 Event-Driven Notifications" passed="Task type, related record, assignee, due date, priority" returned="Dispatch outcome per channel — the inbox task stands regardless of delivery" resumes="C2 / WF-C2-03 / Step 4" />
          <HandOffBanner target="C4 / WF-C4-02 Escalation and Exception Handling" passed="Task reference, task type, assignee, ageing, service level breached" returned="Reminder, reassignment to the manager, or widened manager authority" resumes="C2 / WF-C2-03 / Step 8" />
          <PlaceholderNote kind="consistency">
            three files place delegation resolution differently — C1 / WF-C1-04 / Step 4, C2 / WF-C2-03 / Step 2 and
            C4 / WF-C4-01 / Step 5. The owning module must be fixed before development.
          </PlaceholderNote>
          <PlaceholderNote>whether the mobile or responsive view carries the full inbox or a reduced action set (C2 / WF-C2-03).</PlaceholderNote>
        </Paper>
        <ShellFooterNote />
      </Box>
    </>
  );
};
