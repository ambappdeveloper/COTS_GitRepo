import {
  Box, Button, MenuItem, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography, Chip,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { HandOffBanner, SectionCard, TraceNote } from '../../components/shared';
import { useStore } from '../../state/store';
import { PLAN_ACTUAL } from '../../mockData/s01';
import { SEASONS } from '../../mockData/master';
import { COLORS } from '../../theme';

function Params({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', bgcolor: '#fff', border: `1px solid ${COLORS.border}`, p: 1.5, mb: 2 }}>
      {children}
    </Box>
  );
}

export function PlanVsActual() {
  const { country, seasonId } = useStore();
  const season = SEASONS.find((s) => s.id === seasonId)!;
  return (
    <AppShell title="Plan against Actual" breadcrumb={[country, 'Planning', 'Reports', 'Plan against Actual']}>
      <SectionCard title="S01-SC-08 — Plan against Actual (Core C11 report viewer)">
        <TraceNote workflow="WF-S01-01 / Step 11 — by country, commodity and month" />
        <Params>
          <Box>
            <Typography variant="caption" color="text.secondary">Country (locked to context)</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{country}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Season</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{season.label}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Version basis</Typography>
            <Select size="small" variant="standard" defaultValue="active">
              <MenuItem value="active">Active baseline</MenuItem>
              <MenuItem value="atTime">Baseline in force at the time</MenuItem>
            </Select>
          </Box>
        </Params>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Commodity', 'Month', 'Planned (MT)', 'Actual (MT)', 'Variance', 'Variance %'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }} align={h === 'Commodity' || h === 'Month' ? 'left' : 'right'}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {PLAN_ACTUAL.map((r, i) => {
              const v = r.actual - r.planned;
              const pct = ((v / r.planned) * 100).toFixed(1);
              return (
                <TableRow key={i} hover>
                  <TableCell>{r.commodity}</TableCell>
                  <TableCell>{r.month}</TableCell>
                  <TableCell align="right">{r.planned.toLocaleString()}</TableCell>
                  <TableCell align="right">{r.actual.toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ color: v < 0 ? COLORS.bad : COLORS.good, fontWeight: 600 }}>
                    {v > 0 ? '+' : ''}{v.toLocaleString()}
                  </TableCell>
                  <TableCell align="right">{pct}%</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <HandOffBanner
          to="S06 SMA and the short and long position"
          passes="approved plan volumes"
          returns="nothing"
          resumes="a change in the approved plan moves the expected volumes"
          linkLabel="Open expected SMA position"
          linkTo="/s06"
        />
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined">Export to Excel (C11)</Button>
          <Button size="small" component={Link} to="/s01">Back to Planning</Button>
        </Stack>
      </SectionCard>
    </AppShell>
  );
}

export function ExpectedVsActual() {
  const { country, sourcing } = useStore();
  return (
    <AppShell title="Expected against Actual Delivery" breadcrumb={[country, 'Planning', 'Reports', 'Delivery']}>
      <SectionCard title="S01-SC-12 — Expected against actual delivery (Core C11 report viewer)">
        <TraceNote workflow="WF-S01-02 / Step 7 — the variance is visible to sourcing, processing and execution" />
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Agent', 'Area', 'Commodity', 'Expected (MT)', 'Delivered (MT)', 'Variance', 'Variance %', 'Receiving location'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sourcing.map((r) => {
              const expected = r.expectedPrice > 0 ? r.fundsIssued / r.expectedPrice : 0;
              const v = r.deliveredMt - expected;
              const pct = expected ? ((v / expected) * 100).toFixed(1) : '—';
              const beyondTolerance = expected > 0 && Math.abs(v / expected) > 0.05;
              return (
                <TableRow key={r.id} hover>
                  <TableCell>{r.agent}</TableCell>
                  <TableCell>{r.area}</TableCell>
                  <TableCell>{r.commodity}</TableCell>
                  <TableCell align="right">{expected.toFixed(1)}</TableCell>
                  <TableCell align="right">{r.deliveredMt.toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: v < 0 ? COLORS.bad : COLORS.good }}>
                    {v > 0 ? '+' : ''}{v.toFixed(1)}
                  </TableCell>
                  <TableCell align="right">
                    {pct}%{' '}
                    {beyondTolerance && <Chip size="small" label="Attention" sx={{ bgcolor: COLORS.attention, color: '#fff', height: 18 }} />}
                  </TableCell>
                  <TableCell>{r.receivingLocation ?? '—'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Button size="small" component={Link} to="/s01/sourcing" sx={{ mt: 1 }}>Back to sourcing plan</Button>
      </SectionCard>
    </AppShell>
  );
}
