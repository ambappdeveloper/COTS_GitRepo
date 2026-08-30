import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Paper, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  EmptyState, HandOffBanner, PageBanner, PlaceholderNote, SectionBand, StatusChip, WhiteButton
} from '../../components/shared';
import { DataTable, Column } from '../../components/DataTable';
import { KpiTile } from '../../components/Charts';
import { DocumentPreview } from '../../components/DocumentsPanel7';
import { Doc7, docType as docTypeDef } from '../../mockData/c7';
import { ShellFooterNote } from '../../layouts/AppShell';

/** 3.3 Retention and Archive + 3.4 Delete with Reason — WF-C7-03 / Steps 5–7 */
export const Retention: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [deleting, setDeleting] = React.useState<Doc7 | null>(null);
  const [reason, setReason] = React.useState('');
  const [refused, setRefused] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<Doc7 | null>(null);

  const isAdmin = (s.currentUser?.assignments ?? []).some((a) => a.status === 'Active' && a.role === 'SYSTEM_ADMINISTRATOR');
  const archived = s.documents.filter((d) => d.status === 'Archived');
  const metadataOnly = s.documents.filter((d) => d.status === 'Metadata only');
  const current = s.documents.filter((d) => d.status === 'Current');

  const columns: Column<Doc7>[] = [
    { key: 'systemRef', label: 'System reference', render: (d) => <Typography sx={{ fontSize: 12.5, color: tokens.primary }}>{d.systemRef}</Typography> },
    { key: 'docType', label: 'Document type' },
    { key: 'name', label: 'Name' },
    { key: 'recordName', label: 'Related record' },
    { key: 'retention', label: 'Retention rule', value: (d) => `${docTypeDef(d.docType)?.retentionYears ?? '—'} years from ${docTypeDef(d.docType)?.retentionBasis.toLowerCase() ?? '—'}` },
    { key: 'uploadedAt', label: 'Uploaded' },
    { key: 'archivedAt', label: 'Archived', value: (d) => d.archivedAt ?? '—' },
    { key: 'purgedAt', label: 'File purged', value: (d) => d.purgedAt ?? '—' },
    { key: 'deletedReason', label: 'Deletion reason', value: (d) => d.deletedReason ?? '—' },
    { key: 'status', label: 'Status', render: (d) => <StatusChip status={d.status} /> },
    {
      key: 'actions', label: '',
      render: (d) => (
        <Stack direction="row" spacing={0.5}>
          <Button size="small" onClick={(e) => {
            e.stopPropagation();
            const r = s.openDoc(d.id, 'Opened');
            if (!r.ok) { setRefused(r.why ?? 'Not permitted.'); return; }
            setPreview(d);
          }}>Preview</Button>
          {isAdmin && d.status === 'Current' && (
            <>
              <Button size="small" onClick={(e) => { e.stopPropagation(); s.archiveDoc(d.id); }}>Archive</Button>
              <Button size="small" onClick={(e) => { e.stopPropagation(); s.purgeDoc(d.id); }}>Purge file</Button>
              <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); setDeleting(d); setReason(''); }}>Delete</Button>
            </>
          )}
          {isAdmin && d.status === 'Archived' && (
            <Button size="small" onClick={(e) => { e.stopPropagation(); s.purgeDoc(d.id); }}>Purge file</Button>
          )}
        </Stack>
      )
    }
  ];

  return (
    <>
      <PageBanner
        title="Retention and archive"
        breadcrumb={['Global', 'C7 File and Document Management', 'Retention and archive']}
        subtitle="WF-C7-03 / Steps 5–7 — retention rules per document type, archived documents still retrievable, and metadata that persists after a purge"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c7/register')}>Document register</WhiteButton>
            <WhiteButton onClick={() => navigate('/c7/expiry')}>Document expiry</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        {!isAdmin && (
          <Alert severity="info" sx={{ mb: 2, fontSize: 13 }}>
            Archive, purge and delete are available only to an administrator, so those actions are absent for this
            account rather than shown and refused — WF-C7-03 / Step 6.
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={current.length} label="Current documents" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={archived.length} label="Archived — still retrievable" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={metadataOnly.length} label="File purged — metadata retained" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={s.docTypes.length} label="Document types with a retention rule" /></Grid>
        </Grid>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Retention rule per document type — WF-C7-03 / Step 5</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Document type</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Retention period</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Measured from</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Sensitivity</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Confirmed</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {s.docTypes.map((t) => (
                <TableRow key={t.name}>
                  <TableCell sx={{ fontSize: 12.5 }}>{t.name}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{t.retentionYears} years</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{t.retentionBasis}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{t.sensitivity}</TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" label="Unconfirmed"
                          sx={{ height: 19, fontSize: 10.5, borderColor: tokens.amber, color: tokens.amber }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ p: 2 }}>
            <PlaceholderNote>
              Business confirmation required: retention periods, to be confirmed with compliance and legal
              (WF-C7-03 / Step 5). Every period above is a demonstration value and is marked unconfirmed for that
              reason.
            </PlaceholderNote>
          </Box>
        </Paper>

        <Paper variant="outlined">
          <SectionBand>Every document, with what retention has done to it</SectionBand>
          <DataTable
            columns={columns} rows={s.documents} groupable
            emptyMessage="No documents are held"
            searchPlaceholder="Search documents"
          />
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 13 }}>
              An <b>archived</b> document remains retrievable through the register. Where the file itself is purged
              under retention policy the <b>metadata record persists</b>, so the register stays complete and the
              document is still accounted for — WF-C7-03 / Step 7. That is the one state in which a document can be
              gone and fully explained at the same time.
            </Typography>
            <HandOffBanner target="C8 / WF-C8-01 Capturing an Audit Entry" passed="Archiving, purging and administrator deletion with its reason, as sensitive actions" />
          </Box>
        </Paper>

        <ShellFooterNote />
      </Box>

      <DocumentPreview doc={preview} onClose={() => setPreview(null)} />

      <Dialog open={!!deleting} onClose={() => setDeleting(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Delete document — administrator only</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ fontSize: 13, mb: 2 }}>
            Deletion requires a reason and is fully audited. The metadata record persists so the document register
            remains complete — deletion is not a way to remove a document from the audit trail
            (WF-C7-03 / Steps 6–7).
          </Alert>
          <Typography sx={{ fontSize: 12.5, mb: 1.5 }}>
            {deleting?.systemRef} · {deleting?.docType} · {deleting?.recordName}
          </Typography>
          <TextField fullWidth size="small" multiline minRows={3} required label="Reason for deletion"
                     value={reason} onChange={(e) => setReason(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="contained" color="error" disabled={!reason.trim()}
                  onClick={() => {
                    if (!deleting) return;
                    const r = s.deleteDoc(deleting.id, reason.trim());
                    if (!r.ok) setRefused(r.why ?? null);
                    setDeleting(null);
                  }}>
            Delete with reason
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!refused} onClose={() => setRefused(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Not permitted</DialogTitle>
        <DialogContent><Alert severity="warning" sx={{ fontSize: 13 }}>{refused}</Alert></DialogContent>
        <DialogActions><Button onClick={() => setRefused(null)}>Close</Button></DialogActions>
      </Dialog>
    </>
  );
};
