import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Paper,
  Stack, Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  EmptyState, HandOffBanner, PageBanner, PlaceholderNote, SectionBand, StatusChip, WhiteButton
} from '../../components/shared';
import { DataTable, Column } from '../../components/DataTable';
import { ChartFrame, DataTableView, HBar, KpiTile } from '../../components/Charts';
import { DELIVERY_STATUS_ORDER, DeliveryRec } from '../../mockData/c5';
import { ShellFooterNote } from '../../layouts/AppShell';

/** 1.5 Delivery Log + 3.6 Notification Activity Review — WF-C5-01 / Steps 5–6, 8 */
export const DeliveryLog: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [show, setShow] = React.useState<DeliveryRec | null>(null);
  const [table, setTable] = React.useState(false);

  const count = (status: string) => s.deliveries.filter((d) => d.status === status).length;

  const columns: Column<DeliveryRec>[] = [
    { key: 'event', label: 'Event' },
    { key: 'subject', label: 'Subject', render: (d) => <Typography sx={{ fontSize: 13 }}>{d.subject}</Typography> },
    {
      key: 'recipient', label: 'Recipient',
      value: (d) => `${d.recipient} ${d.address}`,
      render: (d) => (
        <Box>
          <Typography sx={{ fontSize: 13 }}>{d.recipient}</Typography>
          <Typography sx={{ fontSize: 11, color: tokens.textSecondary }}>{d.address}</Typography>
        </Box>
      )
    },
    { key: 'source', label: 'Recipient source', render: (d) => <Chip size="small" variant="outlined" label={d.source} sx={{ height: 19, fontSize: 10.5 }} /> },
    { key: 'external', label: 'Internal / external', value: (d) => (d.external ? 'External' : 'Internal') },
    { key: 'channel', label: 'Channel' },
    { key: 'language', label: 'Language' },
    { key: 'status', label: 'Status', render: (d) => <StatusChip status={d.status} /> },
    { key: 'attempts', label: 'Attempts', value: (d) => String(d.attempts) },
    { key: 'country', label: 'Country' },
    { key: 'priority', label: 'Priority class', optional: true },
    { key: 'correlation', label: 'Correlation reference', optional: true },
    {
      key: 'ack', label: 'Acknowledged',
      value: (d) => (d.requiresAck ? (d.acknowledgedAt ? d.acknowledgedAt : 'Awaiting') : 'Not required'),
      render: (d) => (!d.requiresAck
        ? <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>Not required</Typography>
        : d.acknowledgedAt
          ? <Typography sx={{ fontSize: 12.5, color: tokens.green }}>{d.acknowledgedAt}</Typography>
          : <Button size="small" onClick={(e) => { e.stopPropagation(); s.acknowledgeDelivery(d.id); }}>Acknowledge</Button>)
    },
    { key: 'at', label: 'At' },
    {
      key: 'actions', label: '',
      render: (d) => (
        <Stack direction="row" spacing={0.5}>
          <Button size="small" onClick={(e) => { e.stopPropagation(); setShow(d); }}>Message</Button>
          {d.status === 'Permanently failed' && (
            <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); s.retryDelivery(d.id); }}>Retry now</Button>
          )}
          {d.deepLink && (
            <Button size="small" onClick={(e) => { e.stopPropagation(); navigate(d.deepLink!); }}>Open record</Button>
          )}
        </Stack>
      )
    }
  ];

  const chartRows = DELIVERY_STATUS_ORDER.map((st) => ({
    label: st,
    value: count(st),
    attention: st === 'Permanently failed' || st === 'Transient failure, retrying'
  })).filter((r) => r.value > 0);

  const failed = s.deliveries.filter((d) => d.status === 'Permanently failed');

  return (
    <>
      <PageBanner
        title="Delivery log"
        breadcrumb={[s.activeCountry, 'C5 Notifications and Alerts', 'Delivery log']}
        subtitle="WF-C5-01 / Steps 5–6, 8 — one row per recipient per channel, with the outcome recorded for each"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c5/rules')}>Notification rules</WhiteButton>
            <WhiteButton onClick={() => navigate('/c5/channels')}>Channels and quiet hours</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        {failed.length > 0 && (
          <Alert severity="error" sx={{ mb: 2, fontSize: 13 }}>
            <b>{failed.length} message(s) failed permanently.</b> A permanent failure is logged (C9 / WF-C9-01) and
            surfaced here to the administrator, so that a message is never silently lost — WF-C5-01 / Step 6.
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={2.4}><KpiTile value={count('Delivered')} label="Delivered" tone="good" /></Grid>
          <Grid item xs={12} sm={6} md={2.4}><KpiTile value={count('Queued')} label="Queued" /></Grid>
          <Grid item xs={12} sm={6} md={2.4}><KpiTile value={count('Held — quiet hours')} label="Held for quiet hours" /></Grid>
          <Grid item xs={12} sm={6} md={2.4}><KpiTile value={count('Transient failure, retrying')} label="Retrying" tone="attention" /></Grid>
          <Grid item xs={12} sm={6} md={2.4}><KpiTile value={count('Permanently failed')} label="Permanently failed" tone="attention" /></Grid>
        </Grid>

        <ChartFrame
          title="Delivery outcomes across every recipient and channel"
          note="One notification becomes many delivery attempts. Failures and retries are drawn in the attention colour; every figure is also available as a table."
          tableToggle={
            <Button size="small" sx={{ mt: 0.5 }} onClick={() => setTable((x) => !x)}>
              {table ? 'Show the chart' : 'Show the figures as a table'}
            </Button>
          }
        >
          {chartRows.length === 0
            ? <EmptyState message="No deliveries have been recorded yet" />
            : table
              ? <DataTableView head={['Outcome', 'Rows']} rows={chartRows.map((r) => [r.label, r.value])} />
              : <HBar rows={chartRows} unit=" rows" attentionNote="Failed or retrying — an administrator must act" />}
        </ChartFrame>

        <Paper variant="outlined">
          <SectionBand>Every message sent, to whom, through which channel and with what result — WF-C5-03 / Step 6</SectionBand>
          <DataTable
            columns={columns} rows={s.deliveries} groupable
            emptyMessage="No deliveries have been recorded yet"
            searchPlaceholder="Search deliveries"
          />
        </Paper>

        <Paper variant="outlined" sx={{ mt: 2 }}>
          <SectionBand>How dispatch behaves</SectionBand>
          <Box sx={{ p: 2 }}>
            <Stack spacing={1}>
              <HandOffBanner
                target="C12 / WF-C12-01 Standard Integration Exchange"
                passed="Recipient address, channel, rendered message, correlation reference"
                returned="Delivery status per recipient per channel, or a transient or permanent failure"
                resumes="C5 / WF-C5-01 / Step 6"
              />
              <HandOffBanner target="C9 / WF-C9-01 Logging and Error Handling" passed="Permanent dispatch failures, logged and surfaced to the administrator" />
              <HandOffBanner target="C2 / WF-C2-03 Actions Inbox and Task Management" passed="A task where the notification requires action, so the obligation survives an unread email" />
              <HandOffBanner target="C8 / WF-C8-01 Capturing an Audit Entry" passed="Configuration changes to rules, templates and channels, as sensitive actions" />
            </Stack>
            <PlaceholderNote>
              Business confirmation required: the sending domain and address to be used per country, given that
              recipients sit outside the group directory (WF-C5-01 / Step 6). The permanent failure seeded here is
              exactly that case — a relay refusal for an unrecognised sending domain.
            </PlaceholderNote>
            <PlaceholderNote>
              Business confirmation required: selection and commercial approval of the SMS and messaging providers,
              which require separate confirmation of cost, licensing and feasibility (WF-C5-03 / Step 2). No provider
              is named in the prototype and no message leaves the browser.
            </PlaceholderNote>
          </Box>
        </Paper>

        <HandOffBanner
          label="CONTINUE"
          target="C11 / WF-C11-02 Dashboards and Scheduled Distribution"
          passed="A scheduled report distribution is delivered through these same channels and appears in this log — the distribution log records it from the schedule's side, with the row count each recipient received"
          to="/c11/distribution"
          goLabel="Open the distribution log"
        />
        <ShellFooterNote />
      </Box>

      <Dialog open={!!show} onClose={() => setShow(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Composed message — {show?.channel}, {show?.language}</DialogTitle>
        <DialogContent>
          {show && (
            <>
              <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>Subject</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1.5 }}>{show.subject}</Typography>
              <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>Body</Typography>
              <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: '#FAFBFC' }}>
                <Typography sx={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{show.body}</Typography>
              </Paper>
              <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
                Composed from the template for <b>{show.event}</b> in <b>{show.language}</b>, the recipient's language —
                WF-C5-01 / Step 3. The deep link opens the record with the correct country context already applied.
              </Typography>
              {show.note && <Alert severity="info" sx={{ mt: 2, fontSize: 12.5 }}>{show.note}</Alert>}
              {show.failureReason && <Alert severity="error" sx={{ mt: 2, fontSize: 12.5 }}>{show.failureReason}</Alert>}
            </>
          )}
        </DialogContent>
        <DialogActions>
          {show?.deepLink && <Button onClick={() => { const r = show.deepLink!; setShow(null); navigate(r); }}>Open the record</Button>}
          <Button onClick={() => setShow(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
