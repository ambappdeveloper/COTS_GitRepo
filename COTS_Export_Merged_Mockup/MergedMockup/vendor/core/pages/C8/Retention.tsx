import React from 'react';
import {
  Alert, Box, Button, Chip, Grid, Paper, Stack, Switch, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Tooltip, Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  ConfirmDialog, HandOffBanner, PageBanner, PlaceholderNote, SectionBand, WhiteButton
} from '../../components/shared';
import { ChartFrame, DataTableView, HBar, KpiTile } from '../../components/Charts';
import { ShellFooterNote } from '../../layouts/AppShell';

/** 3.1 Retention and Archive Control + 3.2 Audit Volume Monitor — WF-C8-03 */
export const AuditRetention: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [runOpen, setRunOpen] = React.useState(false);
  const [trimOpen, setTrimOpen] = React.useState(false);
  const [classTable, setClassTable] = React.useState(false);
  const [trendTable, setTrendTable] = React.useState(false);

  const online = s.audit.filter((a) => !a.archived);
  const archived = s.audit.filter((a) => a.archived);
  const eligible = s.audit.filter((a) => s.retentionStateOf(a) === 'Beyond retention — eligible for trimming');
  const beyond = s.audit.filter((a) => s.retentionStateOf(a) !== 'Within retention');

  const entriesFor = (entity: string) =>
    s.audit.filter((a) => a.entity === entity || a.entity.startsWith(entity));

  const classRows = s.auditLevels.map((l) => ({
    label: l.entity,
    value: entriesFor(l.entity).length,
    attention: entriesFor(l.entity).length >= 8,
    sub: `${l.retentionYears} years · ${l.retentionBasis}`
  })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);

  const sourceRows = ['User interface', 'Integration', 'Scheduled job'].map((src) => ({
    label: src,
    value: s.audit.filter((a) => a.source === src).length,
    attention: false
  })).filter((r) => r.value > 0);

  const trendRows = s.volumeByMonth.map((m) => ({
    label: m.month === s.lastRetentionCycle ? `${m.month} — retention cycle ran` : m.month,
    value: m.entries,
    attention: m.month === s.volumeByMonth[s.volumeByMonth.length - 1].month
  }));

  const projected = Math.round((s.volumeByMonth[s.volumeByMonth.length - 1].entries) * 12 * 1.15);

  return (
    <>
      <PageBanner
        title="Audit retention and volume"
        breadcrumb={['Global', 'C8 Audit Trail', 'Retention and volume']}
        subtitle="WF-C8-03 — retention per entity class, archiving on a cycle, trimming only outside retention, and volume monitored"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => setRunOpen(true)}>Run the retention cycle</WhiteButton>
            <WhiteButton onClick={() => navigate('/c8/search')}>Audit search</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={online.length} label="Entries online — fully searchable" tone="good" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={archived.length} label="Archived — retrievable, slower" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={s.volumeByMonth[s.volumeByMonth.length - 1].entries.toLocaleString()} label="Written this month" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={projected.toLocaleString()} label="Projected annual growth" tone="attention" /></Grid>
        </Grid>

        {/* 3.1 Retention control */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Retention period per entity class — WF-C8-03 / Step 1</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Entity class</TableCell>
                <TableCell sx={{ fontSize: 12, width: 130 }}>Retention</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Basis</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Confirmed</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Online</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Archived</TableCell>
                <TableCell sx={{ fontSize: 12, width: 150 }}>Tamper-evident archive</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {s.auditLevels.map((l) => {
                const rows = entriesFor(l.entity);
                return (
                  <TableRow key={l.entity}>
                    <TableCell sx={{ fontSize: 12.5 }}>{l.entity}</TableCell>
                    <TableCell>
                      <TextField
                        size="small" type="number" value={l.retentionYears} sx={{ width: 90 }}
                        onChange={(e) => s.saveAuditLevel(l.entity, { retentionYears: Math.max(1, Number(e.target.value) || 1) })}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{l.retentionBasis}</TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined" label="Unconfirmed"
                            sx={{ height: 19, fontSize: 10.5, borderColor: tokens.amber, color: tokens.amber }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{rows.filter((a) => !a.archived).length}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{rows.filter((a) => a.archived).length}</TableCell>
                    <TableCell>
                      <Tooltip disableInteractive title="Open question: whether an external, tamper-evident archive is required for the highest-sensitivity entities — WF-C8-03 / Step 4">
                        <span><Switch size="small" disabled /></span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
              <Button variant="outlined" size="small" onClick={() => setRunOpen(true)}>Run the retention cycle</Button>
              <Button variant="outlined" size="small" color="warning" onClick={() => setTrimOpen(true)}>
                Trim archived, out-of-retention entries ({eligible.length})
              </Button>
            </Stack>
            <Alert severity="info" sx={{ fontSize: 12.5, mb: 1.5 }}>
              Entries within retention stay <b>online and fully searchable</b>. Beyond retention they are archived to
              lower-cost storage and remain retrievable through the audit search, though retrieval may be slower.
              <b> Trimming and recycling apply only to archived, out-of-retention entries</b> — entries within retention
              are never trimmed, and attempting it reports how many were refused rather than silently doing nothing.
            </Alert>
            <PlaceholderNote>
              Business confirmation required: retention periods per entity class, to be confirmed with compliance and
              legal (WF-C8-03 / Step 1). Every period above is a demonstration value and is marked unconfirmed.
            </PlaceholderNote>
            <PlaceholderNote>
              Business confirmation required: whether an external, tamper-evident archive is required for the
              highest-sensitivity entities (WF-C8-03 / Step 4). The switch is present and disabled for that reason.
            </PlaceholderNote>
            <HandOffBanner target="C9 / WF-C9-03 Monitoring and Retention" passed="Every trimming and recycling run, recording what was removed and under whose authority — the trimming run is a technical event and is logged, not audited" to="/c9/retention" goLabel="Open the C9 log retention screen" />
          </Box>
        </Paper>

        {/* 3.2 Volume monitor */}
        <ChartFrame
          title="Entries by entity class"
          note="Which classes are driving audit volume. A class at eight entries or more in this prototype is drawn in the attention colour; in a live system the threshold would be a configured one."
          tableToggle={
            <Button size="small" sx={{ mt: 0.5 }} onClick={() => setClassTable((x) => !x)}>
              {classTable ? 'Show the chart' : 'Show the figures as a table'}
            </Button>
          }
        >
          {classTable
            ? <DataTableView head={['Entity class', 'Entries', 'Retention']} rows={classRows.map((r) => [r.label, r.value, r.sub])} />
            : <HBar rows={classRows} unit=" entries" attentionNote="Driving volume in this prototype" />}
        </ChartFrame>

        <ChartFrame title="Entries by source" note="An automated source generating volume is visible here rather than hidden inside a total.">
          <HBar rows={sourceRows} unit=" entries" />
        </ChartFrame>

        <ChartFrame
          title="Entries written per month"
          note="Volume is monitored so that growth is predictable and does not degrade transactional performance. The month in which the last retention cycle ran is marked."
          tableToggle={
            <Button size="small" sx={{ mt: 0.5 }} onClick={() => setTrendTable((x) => !x)}>
              {trendTable ? 'Show the chart' : 'Show the figures as a table'}
            </Button>
          }
        >
          {trendTable
            ? <DataTableView head={['Month', 'Entries written']} rows={trendRows.map((r) => [r.label, r.value])} />
            : <HBar rows={trendRows} unit=" entries" attentionNote="Current month" />}
        </ChartFrame>

        <Paper variant="outlined">
          <SectionBand>What the monitor is for</SectionBand>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 13 }}>
              Audit volume grows with use, and an audit trail that degrades transactional performance will eventually be
              turned down — which is how audit coverage is lost in practice. Monitoring makes the growth predictable and
              the retention cycle deliberate, so nothing of evidential value is removed to buy performance.
              {' '}{beyond.length} of {s.audit.length} entries currently sit beyond their retention period.
            </Typography>
            <HandOffBanner target="C11 / WF-C11-01 Running a Report" passed="The monitoring output, reported to administration" />
          </Box>
        </Paper>

        <ShellFooterNote />
      </Box>

      <ConfirmDialog
        open={runOpen}
        title="Run the retention and archiving cycle"
        body={
          <>
            <Typography sx={{ fontSize: 13 }}>
              Each entry is evaluated against the retention period configured for its entity class. Entries within
              retention stay online and fully searchable; entries beyond retention are archived to lower-cost storage
              and remain retrievable through the audit search.
            </Typography>
            <Typography sx={{ fontSize: 13, mt: 1 }}>
              The run is itself recorded, including how many entries moved and under whose authority — WF-C8-03 / Step 5.
            </Typography>
          </>
        }
        confirmLabel="Run the cycle"
        onClose={() => setRunOpen(false)}
        onConfirm={() => { s.runRetentionCycle(); setRunOpen(false); }}
      />

      <ConfirmDialog
        open={trimOpen}
        title="Trim archived, out-of-retention entries"
        body={
          <>
            <Alert severity="warning" sx={{ fontSize: 12.5, mb: 1.5 }}>
              Trimming applies <b>only</b> to archived entries already beyond their retention period. Entries within
              retention are never trimmed — {online.length} entries are within retention and will not be touched.
            </Alert>
            <Typography sx={{ fontSize: 13 }}>
              {eligible.length} entr{eligible.length === 1 ? 'y is' : 'ies are'} eligible. The run records what was
              removed and under whose authority.
            </Typography>
          </>
        }
        confirmLabel="Trim"
        confirmColor="warning"
        onClose={() => setTrimOpen(false)}
        onConfirm={() => { s.trimArchived(); setTrimOpen(false); }}
      />
    </>
  );
};
