import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, List,
  ListItem, ListItemText, Paper, Stack, Typography
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  HandOffBanner, PageBanner, PlaceholderNote, SectionBand, StatusChip, WhiteButton
} from '../../components/shared';
import { DataTable, Column } from '../../components/DataTable';
import { KpiTile } from '../../components/Charts';
import { DocumentPreview } from '../../components/DocumentsPanel7';
import { Doc7, docType as docTypeDef } from '../../mockData/c7';
import { ShellFooterNote } from '../../layouts/AppShell';

const roleLabel = (r: string) => r.replace(/_/g, ' ').toLowerCase();

/** 2.1 Document Register + 2.2 Preview + 2.3 Bulk Download + 2.4 Restricted notice — WF-C7-02 */
export const DocumentRegister: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [preview, setPreview] = React.useState<Doc7 | null>(null);
  const [restricted, setRestricted] = React.useState<{ doc: Doc7; why: string } | null>(null);
  const [bulkFor, setBulkFor] = React.useState<string | null>(null);

  const open = (doc: Doc7) => {
    const r = s.openDoc(doc.id, 'Opened');
    if (!r.ok) { setRestricted({ doc, why: r.why ?? 'Not permitted.' }); return; }
    setPreview(doc);
  };

  const columns: Column<Doc7>[] = [
    { key: 'systemRef', label: 'System reference', render: (d) => <Typography sx={{ fontSize: 12.5, color: tokens.primary }}>{d.systemRef}</Typography> },
    {
      key: 'docType', label: 'Document type',
      render: (d) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <span style={{ fontSize: 12.5 }}>{d.docType}</span>
          {docTypeDef(d.docType)?.sensitivity === 'Sensitive' && <LockOutlinedIcon sx={{ fontSize: 14, color: tokens.amber }} />}
        </Stack>
      )
    },
    { key: 'name', label: 'Name' },
    { key: 'recordName', label: 'Related record' },
    { key: 'objectType', label: 'Object type' },
    { key: 'country', label: 'Country' },
    { key: 'module', label: 'Module' },
    { key: 'documentDate', label: 'Document date' },
    { key: 'validFrom', label: 'Valid from', value: (d) => d.validFrom ?? '—', optional: true },
    { key: 'validTo', label: 'Valid to', value: (d) => d.validTo ?? '—' },
    {
      key: 'validity', label: 'Validity state',
      value: (d) => s.expiryStateOf(d),
      render: (d) => {
        const st = s.expiryStateOf(d);
        return st === 'No validity period'
          ? <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>none</Typography>
          : <StatusChip status={st === 'Valid' ? 'Valid' : st === 'Expired' ? 'Expired' : 'Approaching expiry'} />;
      }
    },
    { key: 'version', label: 'Version', value: (d) => String(d.version) },
    { key: 'status', label: 'Status', render: (d) => <StatusChip status={d.status} /> },
    { key: 'sensitivity', label: 'Sensitivity', value: (d) => docTypeDef(d.docType)?.sensitivity ?? 'Standard' },
    { key: 'uploadedBy', label: 'Uploaded by' },
    { key: 'uploadedAt', label: 'Uploaded at' },
    {
      key: 'actions', label: '',
      render: (d) => (
        <Stack direction="row" spacing={0.5}>
          <Button size="small" onClick={(e) => { e.stopPropagation(); open(d); }}>Preview</Button>
          {d.route && <Button size="small" onClick={(e) => { e.stopPropagation(); navigate(d.route!); }}>Record</Button>}
          <Button size="small" onClick={(e) => { e.stopPropagation(); setBulkFor(d.recordKey); }}>Bulk</Button>
        </Stack>
      )
    }
  ];

  const all = s.documents.slice().sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  const sensitive = all.filter((d) => docTypeDef(d.docType)?.sensitivity === 'Sensitive');
  const expiring = all.filter((d) => s.expiryStateOf(d) === 'Approaching expiry');
  const expired = all.filter((d) => s.expiryStateOf(d) === 'Expired');

  const bulkDocs = bulkFor ? s.docsFor(bulkFor, true) : [];
  const bulkAllowed = bulkDocs.filter((d) => s.canOpenDoc(d).ok);
  const bulkExcluded = bulkDocs.length - bulkAllowed.length;

  return (
    <>
      <PageBanner
        title="Document register"
        breadcrumb={[s.activeCountry, 'C7 File and Document Management', 'Document register']}
        subtitle="WF-C7-02 / Step 4 — documents per country and module, with type, related record, date, validity and status"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c7/expiry')}>Document expiry</WhiteButton>
            <WhiteButton onClick={() => navigate('/c7/retention')}>Retention and archive</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={all.length} label="Documents in the register" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={sensitive.length} label="Sensitive types — nominated roles only" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={expiring.length} label="Approaching expiry" tone="attention" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={expired.length} label="Expired" tone="attention" /></Grid>
        </Grid>

        <DataTable
          columns={columns} rows={all} groupable
          onRowClick={(d) => open(d)}
          emptyMessage="No documents are held"
          searchPlaceholder="Search the register"
        />

        <Paper variant="outlined" sx={{ mt: 2 }}>
          <SectionBand>How access is decided — WF-C7-02 / Steps 1–2</SectionBand>
          <Box sx={{ p: 2 }}>
            <List dense disablePadding>
              {[
                'Access is inherited from the record: a user who may see the record may see its documents (C1).',
                'A sensitive type — commercial contracts, pricing agreements, legal correspondence, identity documents — is further restricted to nominated roles.',
                'An external user sees only documents on their own records, and only types flagged externally visible. A type that is not externally visible is absent rather than shown and refused.',
                'Every open, download and export of a sensitive document is logged to the audit trail, which supports both compliance and investigation.'
              ].map((t) => (
                <ListItem key={t} disableGutters><ListItemText primaryTypographyProps={{ fontSize: 13 }} primary={t} /></ListItem>
              ))}
            </List>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <HandOffBanner label="DEPENDENCY" target="C1 / WF-C1-03 Role, Permission and Access Scope Management" passed="The record and the document type" returned="Whether this user may open it" />
              <HandOffBanner target="C8 / WF-C8-01 Capturing an Audit Entry" passed="Every open, download and export of a sensitive document" />
            </Stack>
            <PlaceholderNote>
              Business confirmation required: the storage approach, following the outstanding hosting decision between
              cloud and on-site, and whether an existing corporate document platform must be used instead of or
              alongside internal storage (WF-C7-01 / Step 6). Every row here is metadata; no file is stored.
            </PlaceholderNote>
          </Box>
        </Paper>

        <ShellFooterNote />
      </Box>

      <DocumentPreview doc={preview} onClose={() => setPreview(null)} />

      {/* 2.4 Restricted document notice */}
      <Dialog open={!!restricted} onClose={() => setRestricted(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>This document is restricted</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ fontSize: 13 }}>{restricted?.why}</Alert>
          <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mt: 2 }}>
            Only the document type is named. The refused attempt is written to the audit trail — WF-C7-02 / Step 5.
          </Typography>
        </DialogContent>
        <DialogActions><Button onClick={() => setRestricted(null)}>Close</Button></DialogActions>
      </Dialog>

      {/* 2.3 Bulk download */}
      <Dialog open={!!bulkFor} onClose={() => setBulkFor(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Bulk download — {bulkFor}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, mb: 1.5 }}>
            The documents for this record, retrieved together — WF-C7-02 / Step 3. Exactly what will be included is
            listed below.
          </Typography>
          <List dense disablePadding>
            {bulkAllowed.map((d) => (
              <ListItem key={d.id} divider>
                <ListItemText
                  primaryTypographyProps={{ fontSize: 13 }}
                  secondaryTypographyProps={{ fontSize: 11.5 }}
                  primary={`${d.name} — ${d.docType}`}
                  secondary={`${d.systemRef} · version ${d.version} · ${d.sizeMB.toFixed(1)} MB`}
                />
              </ListItem>
            ))}
          </List>
          {bulkExcluded > 0 && (
            <Alert severity="info" sx={{ mt: 2, fontSize: 12.5 }}>
              {bulkExcluded} document(s) on this record are <b>excluded</b> because you may not open them. The count is
              stated; the documents are not named.
            </Alert>
          )}
          {bulkAllowed.some((d) => docTypeDef(d.docType)?.sensitivity === 'Sensitive') && (
            <Alert severity="warning" sx={{ mt: 2, fontSize: 12.5 }}>
              This download includes sensitive documents. Each one is logged individually to the audit trail —
              WF-C7-02 / Step 5.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkFor(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              bulkAllowed.forEach((d) => s.openDoc(d.id, 'Downloaded'));
              s.setToast({
                message: `${bulkAllowed.length} document(s) downloaded together${bulkExcluded ? `, ${bulkExcluded} excluded because you may not open them` : ''}. Sensitive retrievals are logged individually — WF-C7-02 / Steps 3 and 5.`,
                severity: 'success'
              });
              setBulkFor(null);
            }}
          >
            Download {bulkAllowed.length} document(s)
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
