import React from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, List, ListItem,
  ListItemText, Paper, Stack, Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  EmptyState, HandOffBanner, PageBanner, PlaceholderNote, SectionBand, StatusChip, WhiteButton
} from '../../components/shared';
import { DataTable, Column } from '../../components/DataTable';
import { ChartFrame, DataTableView, HBar, KpiTile } from '../../components/Charts';
import { Doc7, TODAY, daysBetween, docType as docTypeDef } from '../../mockData/c7';
import { ShellFooterNote } from '../../layouts/AppShell';

const roleLabel = (r: string) => r.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());

/** 3.1 Expiry Monitor + 3.2 Blocked Operation Notice — WF-C7-03 / Steps 1–4 */
export const DocumentExpiry: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [blocked, setBlocked] = React.useState<string | null>(null);
  const [table, setTable] = React.useState(false);

  const dated = s.documents.filter((d) => d.validTo && d.status === 'Current');
  const state = (d: Doc7) => s.expiryStateOf(d);
  const approaching = dated.filter((d) => state(d) === 'Approaching expiry');
  const expired = dated.filter((d) => state(d) === 'Expired');
  const valid = dated.filter((d) => state(d) === 'Valid');
  const blocks = s.blockedOperations();

  const notifiedFor = (d: Doc7) =>
    s.tasks.some((t) => t.relatedRecord.includes(d.systemRef) && t.status !== 'Closed');

  const columns: Column<Doc7>[] = [
    { key: 'name', label: 'Document', render: (d) => <Typography sx={{ fontSize: 13, color: tokens.primary }}>{d.name}</Typography> },
    { key: 'docType', label: 'Type' },
    { key: 'recordName', label: 'Related record' },
    { key: 'country', label: 'Country' },
    { key: 'validTo', label: 'Valid to', value: (d) => d.validTo ?? '—' },
    {
      key: 'left', label: 'Days remaining',
      value: (d) => String(daysBetween(TODAY, d.validTo ?? TODAY)),
      render: (d) => {
        const left = daysBetween(TODAY, d.validTo ?? TODAY);
        return (
          <Typography sx={{ fontSize: 12.5, color: left < 0 ? tokens.red : left <= 30 ? tokens.orange : tokens.textPrimary, fontWeight: left <= 30 ? 600 : 400 }}>
            {left < 0 ? `${Math.abs(left)} days ago` : `${left} days`}
          </Typography>
        );
      }
    },
    { key: 'notice', label: 'Notice period for the type', value: (d) => `${docTypeDef(d.docType)?.noticeDays ?? 0} days` },
    { key: 'state', label: 'State', value: state, render: (d) => <StatusChip status={state(d) === 'Valid' ? 'Valid' : state(d) === 'Expired' ? 'Expired' : 'Approaching expiry'} /> },
    { key: 'responsible', label: 'Responsible role', value: (d) => roleLabel(docTypeDef(d.docType)?.responsibleRole ?? '—') },
    { key: 'escalation', label: 'Escalation role', value: (d) => roleLabel(docTypeDef(d.docType)?.escalationRole ?? '—') },
    {
      key: 'notified', label: 'Notified / escalated',
      value: (d) => (notifiedFor(d) ? (state(d) === 'Expired' ? 'Escalated' : 'Notified') : 'Not yet'),
      render: (d) => (notifiedFor(d)
        ? <StatusChip status={state(d) === 'Expired' ? 'Escalated' : 'Open'} />
        : <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>Not yet</Typography>)
    },
    {
      key: 'actions', label: '',
      render: (d) => (
        <Stack direction="row" spacing={0.5}>
          {d.route && <Button size="small" onClick={(e) => { e.stopPropagation(); navigate(d.route!); }}>Renew on the record</Button>}
          {blocks.some((b) => b.doc?.id === d.id) && (
            <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); setBlocked(d.id); }}>Blocked operations</Button>
          )}
        </Stack>
      )
    }
  ];

  const chartRows = [...new Set(dated.map((d) => d.docType))].map((t) => ({
    label: t,
    value: dated.filter((d) => d.docType === t && state(d) !== 'Valid').length,
    attention: dated.some((d) => d.docType === t && state(d) === 'Expired'),
    sub: `${dated.filter((d) => d.docType === t).length} with a validity period`
  })).filter((r) => r.value > 0);

  const blockedForDoc = blocks.filter((b) => b.doc?.id === blocked);

  return (
    <>
      <PageBanner
        title="Document expiry"
        breadcrumb={[s.activeCountry, 'C7 File and Document Management', 'Document expiry']}
        subtitle="WF-C7-03 / Steps 1–4 — notice periods per document type, notification and escalation, and operations stopped by a lapse"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => s.runExpiryCheck()}>Run the expiry check</WhiteButton>
            <WhiteButton onClick={() => navigate('/c7/register')}>Document register</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        {blocks.length > 0 && (
          <Alert
            severity="error" sx={{ mb: 2, fontSize: 13 }}
            action={<Button size="small" color="inherit" onClick={() => setBlocked(blocks[0].doc?.id ?? null)}>Review</Button>}
          >
            <b>{blocks.length} operation(s) are blocked by an expired document.</b> Where an expired document blocks an
            operation, the system prevents the dependent step and states the reason — WF-C7-03 / Step 4.
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={valid.length} label="Valid" tone="good" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={approaching.length} label="Approaching expiry" tone="attention" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={expired.length} label="Expired" tone="attention" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={blocks.length} label="Blocking an operation" tone="attention" /></Grid>
        </Grid>

        {chartRows.length > 0 && (
          <ChartFrame
            title="Documents needing attention, by document type"
            note="Counts documents approaching expiry or already expired. A type with an expired document is drawn in the attention colour; the figures are also available as a table."
            tableToggle={
              <Button size="small" sx={{ mt: 0.5 }} onClick={() => setTable((x) => !x)}>
                {table ? 'Show the chart' : 'Show the figures as a table'}
              </Button>
            }
          >
            {table
              ? <DataTableView head={['Document type', 'Needing attention']} rows={chartRows.map((r) => [r.label, r.value])} />
              : <HBar rows={chartRows} unit=" document(s)" attentionNote="A type with at least one expired document" />}
          </ChartFrame>
        )}

        <Paper variant="outlined">
          <SectionBand>Documents with a validity period — WF-C7-03 / Step 1</SectionBand>
          {dated.length === 0
            ? <EmptyState message="No documents carry a validity period" />
            : <DataTable columns={columns} rows={dated} groupable searchPlaceholder="Search documents" />}
        </Paper>

        <Paper variant="outlined" sx={{ mt: 2 }}>
          <SectionBand>How expiry is chased — Steps 2–3</SectionBand>
          <Box sx={{ p: 2 }}>
            <List dense disablePadding>
              {[
                'Each document type carries its own notice period — 60 days for a rental agreement, 30 for a fumigation certificate.',
                'The scheduler evaluates approaching expiry against that notice period.',
                'A notification and a task are issued to the responsible role in advance of expiry (C5, C2).',
                'Renewed before expiry → the new version is uploaded and the task closes. Lapsed → the item escalates to the escalation role.',
                'Where an expired document blocks an operation, the dependent step is prevented and the reason is stated.'
              ].map((t) => (
                <ListItem key={t} disableGutters><ListItemText primaryTypographyProps={{ fontSize: 13 }} primary={t} /></ListItem>
              ))}
            </List>
            <Alert severity="info" sx={{ fontSize: 12.5, mt: 1 }}>
              The C05 rule for <b>Document expiry</b> is currently <b>inactive</b> in the prototype. Running the check
              raises the event either way; C05's unmatched-events panel then explains that no notification was issued
              because the rule is inactive. Activate that rule in C05 and run the check again to see the delivery rows.
            </Alert>
            <Stack spacing={1} sx={{ mt: 1.5 }}>
              <HandOffBanner target="C5 / WF-C5-01 Event-Driven Notifications" passed="The approaching or lapsed document, and the responsible or escalation role" />
              <HandOffBanner target="C2 / WF-C2-03 Actions Inbox and Task Management" passed="A renewal task, so the obligation survives an unread email" />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <Button size="small" variant="outlined" onClick={() => navigate('/c5/rules')}>Open the C05 rule</Button>
              <Button size="small" variant="outlined" onClick={() => navigate('/c5/deliveries')}>Open the C05 delivery log</Button>
            </Stack>
          </Box>
        </Paper>

        <ShellFooterNote />
      </Box>

      {/* 3.2 Blocked operation notice */}
      <Dialog open={!!blocked} onClose={() => setBlocked(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Operation blocked by an expired document</DialogTitle>
        <DialogContent>
          {blockedForDoc.map((b) => (
            <Box key={b.operation} sx={{ mb: 2 }}>
              <Alert severity="error" sx={{ fontSize: 13 }}>
                <b>{b.operation} — prevented.</b><br />
                {b.doc?.docType} {b.doc?.systemRef} expired on {b.doc?.validTo}. {b.why}
              </Alert>
            </Box>
          ))}
          {blockedForDoc.length === 0 && (
            <Alert severity="info" sx={{ fontSize: 13 }}>
              No operation is blocked by this document.
            </Alert>
          )}
          <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
            The dialog offers the renewal path rather than only refusing — a blocked step should tell the user how to
            unblock it.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlocked(null)}>Close</Button>
          {blockedForDoc[0]?.renewRoute && (
            <Button variant="contained" onClick={() => { const r = blockedForDoc[0].renewRoute!; setBlocked(null); navigate(r); }}>
              Renew the document
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};
