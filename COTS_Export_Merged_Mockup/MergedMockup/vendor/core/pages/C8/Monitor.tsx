import React from 'react';
import {
  Alert, Box, Button, Chip, Grid, Paper, Stack, Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  EmptyState, HandOffBanner, PageBanner, SectionBand, StatusChip, WhiteButton
} from '../../components/shared';
import { DataTable, Column } from '../../components/DataTable';
import { ChartFrame, DataTableView, HBar, KpiTile } from '../../components/Charts';
import { AuditEntryDetail } from './AuditSearch';
import { SENSITIVE_CLASSES } from '../../mockData/c8';
import { AuditRec } from '../../mockData';
import { ShellFooterNote } from '../../layouts/AppShell';

const roleLabel = (r: string) => r.replace(/_/g, ' ').toLowerCase();

/** 2.5 Sensitive Action Monitor — WF-C8-02 / Step 6 */
export const SensitiveMonitor: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [detail, setDetail] = React.useState<AuditRec | null>(null);
  const [acknowledged, setAcknowledged] = React.useState<string[]>([]);
  const [table, setTable] = React.useState(false);

  const flagged = s.audit.filter((a) => a.sensitive);

  /** the alert state is where C05 and C08 have to agree honestly */
  const alertState = (a: AuditRec): { state: string; tone: 'ok' | 'warn' } => {
    const def = s.sensitiveClasses.find((c) => c.cls === a.sensitiveClass);
    if (!a.sensitiveClass) return { state: 'Flagged, class not named', tone: 'warn' };
    if (!def?.flagged) return { state: 'Class no longer flagged', tone: 'warn' };
    if (def.recipients.length === 0) return { state: 'No recipients configured', tone: 'warn' };
    const delivered = s.deliveries.filter((d) => d.event === 'Sensitive action' && d.subject.includes(a.record));
    if (delivered.some((d) => d.status === 'Held — quiet hours')) return { state: 'Held by quiet hours (C5)', tone: 'warn' };
    if (delivered.length) return { state: `Alerted — ${delivered.length} delivery row(s)`, tone: 'ok' };
    return { state: 'Alert raised before the class had recipients', tone: 'warn' };
  };

  const columns: Column<AuditRec>[] = [
    { key: 'at', label: 'When' },
    { key: 'sensitiveClass', label: 'Class', value: (a) => a.sensitiveClass ?? 'Not named' },
    { key: 'action', label: 'Action' },
    { key: 'user', label: 'User' },
    { key: 'role', label: 'Acting as', value: (a) => (a.role === '—' ? 'Service identity' : roleLabel(a.role)) },
    { key: 'country', label: 'Country' },
    { key: 'entity', label: 'Entity' },
    { key: 'record', label: 'Record' },
    { key: 'source', label: 'Source', value: (a) => (a.originatingSystem ? `${a.source} — ${a.originatingSystem}` : a.source) },
    {
      key: 'recipients', label: 'Alert recipients',
      value: (a) => (s.sensitiveClasses.find((c) => c.cls === a.sensitiveClass)?.recipients ?? []).map(roleLabel).join(', ') || 'none'
    },
    {
      key: 'alert', label: 'Alert state',
      value: (a) => alertState(a).state,
      render: (a) => {
        const st = alertState(a);
        return (
          <Chip
            size="small" variant="outlined" label={st.state}
            sx={{ height: 19, fontSize: 10.5, borderColor: st.tone === 'ok' ? tokens.green : tokens.orange, color: st.tone === 'ok' ? tokens.green : tokens.orange }}
          />
        );
      }
    },
    {
      key: 'ack', label: 'Acknowledged',
      value: (a) => (acknowledged.includes(a.id) ? 'Yes' : 'No'),
      render: (a) => (acknowledged.includes(a.id)
        ? <StatusChip status="Closed" />
        : <Button size="small" onClick={(e) => {
            e.stopPropagation();
            setAcknowledged((prev) => [...prev, a.id]);
            s.setToast({ message: `${a.sensitiveClass ?? 'Sensitive action'} on ${a.record} acknowledged. The acknowledgement is recorded against the monitor, not against the entry — an audit entry is never edited (WF-C8-01 / Step 7).`, severity: 'success' });
          }}>Acknowledge</Button>)
    },
    { key: 'actions', label: '', render: (a) => <Button size="small" onClick={(e) => { e.stopPropagation(); setDetail(a); }}>Detail</Button> }
  ];

  const chartRows = SENSITIVE_CLASSES.map((cls) => ({
    label: cls,
    value: flagged.filter((a) => a.sensitiveClass === cls).length,
    attention: (s.sensitiveClasses.find((c) => c.cls === cls)?.recipients.length ?? 0) === 0
      && flagged.some((a) => a.sensitiveClass === cls),
    sub: (s.sensitiveClasses.find((c) => c.cls === cls)?.recipients ?? []).map(roleLabel).join(', ') || 'no recipients configured'
  })).filter((r) => r.value > 0);

  const unalerted = flagged.filter((a) => alertState(a).tone === 'warn');

  return (
    <>
      <PageBanner
        title="Sensitive actions monitor"
        breadcrumb={[s.activeCountry, 'C8 Audit Trail', 'Sensitive actions']}
        subtitle="WF-C8-02 / Step 6 — actions flagged at capture, monitored, and alerted to the configured recipients"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c8/search')}>Audit search</WhiteButton>
            <WhiteButton onClick={() => navigate('/c8/configuration')}>Classification</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        {unalerted.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2, fontSize: 13 }}>
            <b>{unalerted.length} flagged action(s) did not reach a recipient.</b> A sensitive action with no configured
            recipient is shown as such rather than silently unalerted — which is the point of having a monitor as well
            as an alert.
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={flagged.length} label="Flagged actions" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={flagged.filter((a) => alertState(a).tone === 'ok').length} label="Alerted" tone="good" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={unalerted.length} label="Not alerted" tone="attention" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={acknowledged.length} label="Acknowledged" /></Grid>
        </Grid>

        {chartRows.length > 0 && (
          <ChartFrame
            title="Flagged actions by class"
            note="A class drawn in the attention colour has occurrences but no configured alert recipients. Every figure is also available as a table."
            tableToggle={
              <Button size="small" sx={{ mt: 0.5 }} onClick={() => setTable((x) => !x)}>
                {table ? 'Show the chart' : 'Show the figures as a table'}
              </Button>
            }
          >
            {table
              ? <DataTableView head={['Class', 'Occurrences', 'Recipients']} rows={chartRows.map((r) => [r.label, r.value, r.sub])} />
              : <HBar rows={chartRows} unit=" action(s)" attentionNote="Occurrences with no configured alert recipients" />}
          </ChartFrame>
        )}

        <Paper variant="outlined">
          <SectionBand>Flagged actions</SectionBand>
          {flagged.length === 0
            ? <EmptyState message="No sensitive actions have been captured yet" />
            : <DataTable columns={columns} rows={flagged} groupable onRowClick={(a) => setDetail(a)} searchPlaceholder="Search flagged actions" />}
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mb: 1 }}>
              Acknowledgement is recorded against the monitor, never against the entry: an audit entry is written once
              and cannot be edited — WF-C8-01 / Step 7.
            </Typography>
            <Stack spacing={1}>
              <HandOffBanner target="C5 / WF-C5-01 Event-Driven Notifications" passed="The sensitive-action alert to compliance or administration" />
              <HandOffBanner target="C11 / WF-C11-01 Running a Report" passed="Monitored sensitive actions, as a standard report" />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <Button size="small" variant="outlined" onClick={() => navigate('/c5/deliveries')}>See the alert delivery rows in C05</Button>
              <Button size="small" variant="outlined" onClick={() => navigate('/c8/configuration')}>Configure recipients</Button>
            </Stack>
          </Box>
        </Paper>

        <ShellFooterNote />
      </Box>

      <AuditEntryDetail entry={detail} onClose={() => setDetail(null)} />
    </>
  );
};
