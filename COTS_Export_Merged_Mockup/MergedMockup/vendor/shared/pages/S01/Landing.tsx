import { Box, Button, Paper, Stack, Typography, Tooltip } from '@mui/material';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { SectionCard, StatusChip, TraceNote, ReadOnlyField, FieldGrid } from '../../components/shared';
import { useStore } from '../../state/store';
import { SEASONS } from '../../mockData/master';
import { COLORS } from '../../theme';

export default function Landing() {
  const { country, seasonId, plan, tasks } = useStore();
  const season = SEASONS.find((s) => s.id === seasonId) ?? SEASONS.find((s) => s.country === country)!;

  const cards = [
    {
      title: 'Master Plan',
      status: plan ? `${plan.status} · v${plan.activeVersion}` : 'Not created',
      chip: plan?.status ?? 'Draft',
      to: '/s01/plans',
      action: plan ? 'Open' : 'Create',
      note: plan
        ? 'A plan already exists for this season — each country has exactly one master plan per season.'
        : 'No plan exists for this season yet.',
    },
    { title: 'Sourcing Plan', status: 'Recorded · 3 agents', chip: 'Draft', to: '/s01/sourcing', action: 'Open', note: 'Derived from the approved master plan.' },
    { title: 'Processing Plan', status: 'Weekly · 3 facilities', chip: 'Draft', to: '/s01/processing', action: 'Open', note: 'Built on material actually received.' },
    { title: 'Warehousing', status: '4 warehouses · 1 shortfall', chip: 'Insufficient', to: '/s01/warehouse', action: 'Open', note: 'Expected stock against available capacity.' },
  ];

  return (
    <AppShell title="Planning" breadcrumb={[country, 'Shared Modules', 'Planning']}>
      <SectionCard title="S01-SC-01 · Active season and planning entry points">
        <TraceNote workflow="WF-S01-01 / Step 1 — COTS identifies the active country and the applicable season from master data (C3)" />
        <FieldGrid columns={4}>
          <ReadOnlyField label="Country" value={country} />
          <ReadOnlyField label="Season" value={season.label} />
          <ReadOnlyField label="Season start" value={season.start} />
          <ReadOnlyField label="Season end" value={season.end} />
        </FieldGrid>
        <Box sx={{ mt: 1 }}><StatusChip status={season.status === 'Open' ? 'Open' : 'Superseded'} /></Box>
        <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: COLORS.textSecondary }}>
          Each country has its own season, and each country has exactly one season plan for a given season.
        </Typography>
      </SectionCard>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 2 }}>
        {cards.map((c) => (
          <Paper key={c.title} variant="outlined" sx={{ borderColor: COLORS.border, p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{c.title}</Typography>
            <Box sx={{ mb: 1 }}><StatusChip status={c.chip} /></Box>
            <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, minHeight: 46 }}>
              {c.note}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>{c.status}</Typography>
            {c.title === 'Master Plan' && plan ? (
              <Tooltip title="A master plan already exists for this country and season">
                <span>
                  <Button size="small" variant="contained" component={Link} to={c.to} fullWidth>Open</Button>
                </span>
              </Tooltip>
            ) : (
              <Button size="small" variant="contained" component={Link} to={c.to} fullWidth>{c.action}</Button>
            )}
          </Paper>
        ))}
      </Box>

      <Box sx={{ mt: 2 }}>
        <SectionCard title="Planning notifications and tasks (C2 Actions Inbox · C5)">
          <Stack spacing={0.75}>
            {tasks.map((t) => (
              <Stack key={t.id} direction="row" spacing={1} alignItems="center">
                <StatusChip status={t.kind === 'approval' ? 'Pending Approval' : 'Open'} />
                <Typography variant="body2" sx={{ flex: 1 }}>{t.title}</Typography>
                <Typography variant="caption" color="text.secondary">{t.workflow}</Typography>
                <Button size="small" component={Link} to={t.route}>Open</Button>
              </Stack>
            ))}
            {tasks.length === 0 && <Typography variant="body2" color="text.secondary">No open tasks</Typography>}
          </Stack>
        </SectionCard>
      </Box>

      <Stack direction="row" spacing={1}>
        <Button size="small" component={Link} to="/s01/plan-actual" variant="outlined">Plan against Actual (C11)</Button>
        <Button size="small" component={Link} to="/s01/expected-actual" variant="outlined">
          Expected against Actual Delivery (C11)
        </Button>
      </Stack>
    </AppShell>
  );
}
