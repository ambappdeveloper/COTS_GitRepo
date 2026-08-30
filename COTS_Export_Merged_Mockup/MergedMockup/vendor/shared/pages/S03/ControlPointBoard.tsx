import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { SectionCard, StatusChip, TraceNote } from '../../components/shared';
import { useStore } from '../../state/store';
import { useS03 } from '../../state/s03store';
import { CONTROL_POINTS } from '../../mockData/s03';
import { COLORS } from '../../theme';

export default function ControlPointBoard() {
  const { country } = useStore();
  const { inspections, checks, programmes, ncs } = useS03();

  const countFor = (key: string) => {
    if (key === 'Warehouse check' || key === 'Truck check')
      return { total: checks.filter((c) => c.type === key).length, open: checks.filter((c) => c.type === key && !c.outcome).length };
    if (key === 'Quality programme')
      return { total: programmes.length, open: programmes.filter((p) => p.status !== 'Performed').length };
    return {
      total: inspections.filter((i) => i.controlPoint === key).length,
      open: inspections.filter((i) => i.controlPoint === key && !i.decision).length,
    };
  };

  const route = (key: string) => {
    if (key === 'Warehouse check' || key === 'Truck check') return '/s03/checks';
    if (key === 'Quality programme') return '/s03/programmes';
    return `/s03/inspections?point=${encodeURIComponent(key)}`;
  };

  return (
    <AppShell title="Quality Assurance" breadcrumb={[country, 'Shared Modules', 'Quality Assurance']} showSeason={false}>
      <SectionCard title="S03-SC-06 — Control point board">
        <TraceNote workflow="WF-S03-02 / Steps 1–8 — the same inspection process applied at a different trigger, which is why one inspection object serves all of the points" />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
          {CONTROL_POINTS.map((cp) => {
            const c = countFor(cp.key);
            return (
              <Paper
                key={cp.key}
                variant="outlined"
                sx={{
                  p: 2, borderColor: cp.applies ? COLORS.border : '#EDEDED',
                  bgcolor: cp.applies ? '#fff' : '#FAFAFA', opacity: cp.applies ? 1 : 0.7,
                }}
              >
                <Stack direction="row" alignItems="flex-start" spacing={1}>
                  <Typography variant="subtitle2" sx={{ flex: 1 }}>{cp.key}</Typography>
                  {!cp.applies && (
                    <Chip size="small" label="Not applicable for this country" sx={{ height: 20, fontSize: '0.66rem' }} />
                  )}
                </Stack>
                <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, minHeight: 52, mt: 0.5 }}>
                  {cp.note}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                  <Chip size="small" label={`${c.total} record(s)`} />
                  {c.open > 0 && <Chip size="small" label={`${c.open} open`} sx={{ bgcolor: COLORS.progress, color: '#fff' }} />}
                </Stack>
                <Button size="small" variant={cp.applies ? 'contained' : 'outlined'} component={Link} to={route(cp.key)} fullWidth>
                  Open
                </Button>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: COLORS.textSecondary }}>
                  {cp.step}
                </Typography>
              </Paper>
            );
          })}
        </Box>
        <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: COLORS.textSecondary }}>
          Tiles that are not configured for the active country and commodity are shown greyed rather than hidden, so
          the configuration point stays visible to the reviewer.
        </Typography>
      </SectionCard>

      <SectionCard title="Open non-conformities">
        <Stack spacing={0.75}>
          {ncs.filter((n) => n.status !== 'Closed').map((n) => (
            <Stack key={n.id} direction="row" spacing={1} alignItems="center">
              <StatusChip status={n.status === 'Open' ? 'Open' : 'Open'} />
              <Typography variant="body2" sx={{ minWidth: 88, fontWeight: 600, color: COLORS.primary }}>{n.id}</Typography>
              <Typography variant="body2" sx={{ flex: 1 }}>{n.description.slice(0, 90)}…</Typography>
              <Chip size="small" label={`${n.blockScope} blocked`} sx={{ bgcolor: COLORS.attention, color: '#fff', height: 20 }} />
              <Button size="small" component={Link} to={`/s03/nc/${n.id}`}>Open</Button>
            </Stack>
          ))}
        </Stack>
      </SectionCard>

      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" component={Link} to="/s03/inspections">All inspections</Button>
        <Button size="small" variant="outlined" component={Link} to="/s03/ncs">Non-conformities</Button>
        <Button size="small" variant="outlined" component={Link} to="/s03/contracts">Contract quality terms</Button>
        <Button size="small" variant="outlined" component={Link} to="/s03/programmes">Quality programmes</Button>
      </Stack>
    </AppShell>
  );
}
