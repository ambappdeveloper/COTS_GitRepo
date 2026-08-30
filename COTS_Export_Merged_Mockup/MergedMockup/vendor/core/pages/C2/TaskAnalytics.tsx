import React from 'react';
import {
  Box, Paper, Typography, Stack, Button, FormControl, InputLabel, Select, MenuItem, Table, TableHead,
  TableRow, TableCell, TableBody, Chip, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import TableRowsIcon from '@mui/icons-material/TableRows';
import BarChartIcon from '@mui/icons-material/BarChart';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import { HandOffBanner, PageBanner, PlaceholderNote, SectionBand, WhiteButton } from '../../components/shared';
import { ChartFrame, HBar, KpiTile, StackedHBar, DataTableView } from '../../components/Charts';
import { CHART_STATUS, TASK_HISTORY } from '../../mockData/c2';
import { ShellFooterNote } from '../../layouts/AppShell';

/** WF-C2-03 / Step 8 — volumes by type, average completion time by step and by user, bottleneck identification. */
export const TaskAnalytics: React.FC = () => {
  const s = useStore();
  const [period, setPeriod] = React.useState('Last 3 months');
  const [module, setModule] = React.useState('All modules');
  const [view, setView] = React.useState<'chart' | 'table'>('chart');

  const history = TASK_HISTORY.filter((h) => module === 'All modules' || h.sourceModule === module);
  const live = s.tasks.filter((t) => module === 'All modules' || t.sourceModule === module);
  const modules = ['All modules', ...Array.from(new Set([...TASK_HISTORY.map((h) => h.sourceModule), ...s.tasks.map((t) => t.sourceModule)]))];

  /* ---------- volumes by task type: Overdue / Open / Closed ---------- */
  const types = Array.from(new Set([...live.map((t) => t.type), ...history.map((h) => h.type)]));
  const volumeRows = types.map((ty) => {
    const openN = live.filter((t) => t.type === ty && t.status === 'Open').length;
    const overdueN = live.filter((t) => t.type === ty && t.status === 'Overdue').length;
    const closedN = live.filter((t) => t.type === ty && t.status === 'Closed').length + history.filter((h) => h.type === ty).length;
    return {
      label: ty,
      segments: [
        { key: 'Overdue', value: overdueN, colour: CHART_STATUS[0].colour },
        { key: 'Open', value: openN, colour: CHART_STATUS[1].colour },
        { key: 'Closed', value: closedN, colour: CHART_STATUS[2].colour }
      ]
    };
  }).sort((a, b) => b.segments.reduce((x, s2) => x + s2.value, 0) - a.segments.reduce((x, s2) => x + s2.value, 0));

  /* ---------- average completion time by step ---------- */
  const steps = Array.from(new Set(history.map((h) => h.step)));
  const byStep = steps.map((st) => {
    const rows = history.filter((h) => h.step === st);
    const avg = rows.reduce((a, r) => a + r.days, 0) / rows.length;
    const sla = rows[0].slaDays;
    const breaches = rows.filter((r) => r.days > r.slaDays).length;
    return { label: st, value: Number(avg.toFixed(1)), attention: avg > sla, sla, breaches, count: rows.length };
  }).sort((a, b) => b.value - a.value);

  /* ---------- average completion time by user ---------- */
  const people = Array.from(new Set(history.map((h) => h.assignee)));
  const byUser = people.map((p) => {
    const rows = history.filter((h) => h.assignee === p);
    const avg = rows.reduce((a, r) => a + r.days, 0) / rows.length;
    return { label: p, value: Number(avg.toFixed(1)), sub: `${rows.length} completed`, attention: false };
  }).sort((a, b) => b.value - a.value);

  /* ---------- headline figures ---------- */
  const openTotal = live.filter((t) => t.status !== 'Closed').length;
  const overdueTotal = live.filter((t) => t.status === 'Overdue').length;
  const avgAll = history.length ? history.reduce((a, r) => a + r.days, 0) / history.length : 0;
  const bottleneck = byStep.filter((x) => x.attention)[0] ?? byStep[0];

  return (
    <>
      <PageBanner
        title="Task Analytics"
        breadcrumb={[s.activeCountry, 'C2 Shell, Navigation and Inbox', 'Task Analytics']}
        subtitle="WF-C2-03 / Step 8 — feeds the process improvement objective"
        actions={<WhiteButton onClick={() => setView(view === 'chart' ? 'table' : 'chart')}>{view === 'chart' ? 'Table view' : 'Chart view'}</WhiteButton>}
      />
      <Box sx={{ p: 3 }}>
        {/* filters in one row above the charts */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Period</InputLabel>
              <Select label="Period" value={period} onChange={(e) => setPeriod(e.target.value)}>
                {['Last month', 'Last 3 months', 'Last 6 months', 'Year to date'].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel>Source module</InputLabel>
              <Select label="Source module" value={module} onChange={(e) => setModule(e.target.value)}>
                {modules.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>
            <Box sx={{ flex: 1 }} />
            <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}>
              <ToggleButton value="chart"><BarChartIcon fontSize="small" sx={{ mr: 0.5 }} />Charts</ToggleButton>
              <ToggleButton value="table"><TableRowsIcon fontSize="small" sx={{ mr: 0.5 }} />Table</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary, mt: 1 }}>
            Country context {s.activeCountry} is applied automatically and cannot be widened here — a consolidated
            multi-country view exists in the reporting area only, for users holding regional scope.
          </Typography>
        </Paper>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
          <KpiTile value={openTotal} label="Open tasks" sub="across every source module" />
          <KpiTile value={overdueTotal} label="Overdue" tone="attention" sub="escalated per C4 service level" />
          <KpiTile value={`${avgAll.toFixed(1)} d`} label="Average completion time" sub={`${history.length} completed tasks`} />
          <KpiTile value={`${bottleneck?.value ?? 0} d`} label="Current bottleneck" tone="attention" sub={bottleneck?.label} />
        </Box>

        {view === 'chart' ? (
          <>
            <ChartFrame
              title="Task volumes by type"
              legend={CHART_STATUS.map((c) => ({ key: c.key, colour: c.colour }))}
              note="Segment order places Overdue first so the green and orange segments are never adjacent. Every segment carries its count, and the table view holds the same numbers."
            >
              <StackedHBar rows={volumeRows} width={880} />
            </ChartFrame>

            <ChartFrame
              title="Average completion time by workflow step"
              note="One measure, one axis. Volume is never plotted on the same scale as duration."
            >
              <HBar
                rows={byStep}
                format={(v) => `${v} d`}
                attentionNote="Average exceeds the service level defined for that step"
                width={880}
              />
            </ChartFrame>

            <ChartFrame title="Average completion time by user">
              <HBar rows={byUser} format={(v) => `${v} d`} width={880} />
            </ChartFrame>
          </>
        ) : (
          <>
            <Paper variant="outlined" sx={{ mb: 2 }}>
              <SectionBand>Task volumes by type</SectionBand>
              <Box sx={{ px: 2, pb: 2 }}>
                <DataTableView
                  head={['Task type', 'Overdue', 'Open', 'Closed', 'Total']}
                  rows={volumeRows.map((r) => [r.label, r.segments[0].value, r.segments[1].value, r.segments[2].value, r.segments.reduce((a, x) => a + x.value, 0)])}
                />
              </Box>
            </Paper>
            <Paper variant="outlined" sx={{ mb: 2 }}>
              <SectionBand>Average completion time by workflow step</SectionBand>
              <Box sx={{ px: 2, pb: 2 }}>
                <DataTableView
                  head={['Step', 'Average days', 'Service level', 'Completed', 'Breaches']}
                  rows={byStep.map((r) => [r.label, r.value, `${r.sla} d`, r.count, r.breaches])}
                />
              </Box>
            </Paper>
            <Paper variant="outlined" sx={{ mb: 2 }}>
              <SectionBand>Average completion time by user</SectionBand>
              <Box sx={{ px: 2, pb: 2 }}>
                <DataTableView head={['User', 'Average days', 'Completed']} rows={byUser.map((r) => [r.label, r.value, r.sub ?? ''])} />
              </Box>
            </Paper>
          </>
        )}

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Bottleneck identification — ranked worst first</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Workflow step</TableCell>
                <TableCell align="right">Average time</TableCell>
                <TableCell align="right">Service level</TableCell>
                <TableCell align="right">Breach rate</TableCell>
                <TableCell align="right">Tasks affected</TableCell>
                <TableCell>Assessment</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {byStep.map((r) => {
                const rate = r.count ? Math.round((r.breaches / r.count) * 100) : 0;
                return (
                  <TableRow key={r.label} hover>
                    <TableCell>{r.label}</TableCell>
                    <TableCell align="right">{r.value} d</TableCell>
                    <TableCell align="right">{r.sla} d</TableCell>
                    <TableCell align="right">{rate}%</TableCell>
                    <TableCell align="right">{r.breaches} of {r.count}</TableCell>
                    <TableCell>
                      {r.attention
                        ? <Chip size="small" label="Bottleneck" sx={{ height: 20, fontSize: 11, bgcolor: '#D9660B', color: '#fff' }} />
                        : <Chip size="small" label="Within service level" sx={{ height: 20, fontSize: 11, bgcolor: '#1E7B4F', color: '#fff' }} />}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>
              The assessment column names the state in words and carries an icon-free coloured chip beside it, so the
              judgement is never conveyed by colour alone.
            </Typography>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <HandOffBanner
            target="C4 / WF-C4-02 Escalation and Exception Handling"
            passed="Repeated service-level breaches per step"
            returned="Escalation behaviour and reassignment"
            resumes="C2 / WF-C2-03 / Step 8"
          />
          <HandOffBanner
            target="C11 / WF-C11-01 Running a Report"
            passed="Task analytics measures"
            returned="Approval ageing and process bottleneck analysis as a standard report in the shared reporting area"
          />
          <PlaceholderNote>
            the data latency acceptable per report — real time against the transactional store, or scheduled refresh
            against a reporting store (C11 / WF-C11-01). These figures are computed live from the mock task set.
          </PlaceholderNote>
        </Paper>
        <ShellFooterNote />
      </Box>
    </>
  );
};
