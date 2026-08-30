import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer,
  FormControl, FormControlLabel, Grid, InputLabel, LinearProgress, List, ListItem, ListItemText,
  MenuItem, Paper, Radio, RadioGroup, Select, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Tooltip, Typography
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { useStore } from '../store';
import { tokens } from '../theme';
import { EmptyState, HandOffBanner, PlaceholderNote, SectionBand, StatusChip } from './shared';
import { Doc7, TODAY, daysBetween, docType as docTypeDef } from '../mockData/c7';

const roleLabel = (r: string) => r.replace(/_/g, ' ').toLowerCase();

/** C07 2.2 Document Preview — WF-C7-02 / Step 3 */
export const DocumentPreview: React.FC<{ doc: Doc7 | null; onClose: () => void }> = ({ doc, onClose }) => {
  const s = useStore();
  const def = doc ? docTypeDef(doc.docType) : undefined;
  return (
    <Drawer anchor="right" open={!!doc} onClose={onClose} PaperProps={{ sx: { width: 640 } }}>
      {doc && (
        <>
          <Box sx={{ bgcolor: tokens.primary, color: '#fff', px: 2, py: 1.5 }}>
            <Typography variant="h6" sx={{ fontSize: 16 }}>{doc.name}</Typography>
            <Typography sx={{ fontSize: 12, opacity: 0.85 }}>
              {doc.docType} · version {doc.version} · {doc.systemRef}
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', bgcolor: '#FAFBFC', mb: 2 }}>
              <Typography sx={{ fontSize: 13, color: tokens.textSecondary }}>
                Preview of a <b>.{doc.format}</b> document, rendered in the browser without download —
                WF-C7-02 / Step 3.
              </Typography>
              <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mt: 1 }}>
                No file exists: the prototype stores metadata only, because the storage approach is itself an open
                question (WF-C7-01 / Step 6).
              </Typography>
            </Paper>
            <Table size="small">
              <TableBody>
                {[
                  ['System reference', doc.systemRef],
                  ['Document type', `${doc.docType}${def?.sensitivity === 'Sensitive' ? ' — sensitive' : ''}`],
                  ['Related record', doc.recordName],
                  ['Country / module', `${doc.country} · ${doc.module}`],
                  ['Document date', doc.documentDate],
                  ['Validity', doc.validTo ? `${doc.validFrom ?? '—'} to ${doc.validTo}` : 'No validity period for this type'],
                  ['Issuing party', doc.issuingParty ?? '—'],
                  ['Reference number', doc.referenceNumber ?? '—'],
                  ['Version', `${doc.version} · uploaded by ${doc.uploadedBy} at ${doc.uploadedAt}`],
                  ['Size and format', `${doc.sizeMB.toFixed(1)} MB · .${doc.format}`],
                  ['Extraction used', doc.extractionUsed ? 'Yes — values confirmed by a person before storage' : 'No'],
                  ['Source', doc.fromComment ? 'Attached to a comment (C6 / WF-C6-01 / Step 6)' : 'Attached from the record']
                ].map(([k, v]) => (
                  <TableRow key={k}>
                    <TableCell sx={{ fontSize: 12.5, color: tokens.textSecondary, width: 190 }}>{k}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{v}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {def?.sensitivity === 'Sensitive' && (
              <Alert severity="info" sx={{ mt: 2, fontSize: 12.5 }}>
                This open has been written to the audit trail, because every open, download and export of a
                sensitive document is logged — WF-C7-02 / Step 5.
              </Alert>
            )}
            {doc.accessLog.length > 0 && (
              <Paper variant="outlined" sx={{ mt: 2 }}>
                <SectionBand>Access log</SectionBand>
                <List dense disablePadding>
                  {doc.accessLog.slice(0, 8).map((a, i) => (
                    <ListItem key={i} divider>
                      <ListItemText
                        primaryTypographyProps={{ fontSize: 12.5 }}
                        primary={`${a.action} by ${a.who} (${roleLabel(a.role)})`}
                        secondaryTypographyProps={{ fontSize: 11.5 }}
                        secondary={a.at}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button variant="outlined" size="small"
                      onClick={() => { const r = s.openDoc(doc.id, 'Downloaded'); if (r.ok) s.setToast({ message: `${doc.name} downloaded. The retrieval is logged for a sensitive type — WF-C7-02 / Steps 3 and 5.`, severity: 'success' }); }}>
                Download
              </Button>
              <Button size="small" onClick={onClose}>Close</Button>
            </Stack>
          </Box>
        </>
      )}
    </Drawer>
  );
};

/**
 * C07 1.1–1.5 — the documents panel on a record: checklist, upload with validation and
 * classification, extraction confirmation, versions, preview and access control.
 */
export const DocumentsPanel7: React.FC<{
  recordKey: string;
  recordName: string;
  objectType: string;
  country: string;
  module: string;
  route?: string;
}> = ({ recordKey, recordName, objectType, country, module, route }) => {
  const s = useStore();
  const docs = s.docsFor(recordKey);
  const { def: checklist, outstanding, countryAdded, disabledByConfig } = s.checklistFor(objectType, recordKey, country);
  const isAdmin = (s.currentUser?.assignments ?? []).some((a) => a.status === 'Active' && a.role === 'SYSTEM_ADMINISTRATOR');

  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [source, setSource] = React.useState('Attach from the record');
  const [fileName, setFileName] = React.useState('');
  const [sizeMB, setSizeMB] = React.useState('1.2');
  const [type, setType] = React.useState(s.docTypes[0].name);
  const [documentDate, setDocumentDate] = React.useState('2026-08-18');
  const [validFrom, setValidFrom] = React.useState('');
  const [validTo, setValidTo] = React.useState('');
  const [issuingParty, setIssuingParty] = React.useState('');
  const [referenceNumber, setReferenceNumber] = React.useState('');
  const [refusal, setRefusal] = React.useState<string[] | null>(null);
  const [extracting, setExtracting] = React.useState(false);
  const [proposed, setProposed] = React.useState<{ field: string; value: string; confidence: number }[] | null>(null);
  const [preview, setPreview] = React.useState<Doc7 | null>(null);
  const [restricted, setRestricted] = React.useState<{ doc: Doc7; why: string } | null>(null);
  const [versionsFor, setVersionsFor] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<Doc7 | null>(null);
  const [reason, setReason] = React.useState('');

  const def = docTypeDef(type);

  const reset = () => {
    setFileName(''); setSizeMB('1.2'); setRefusal(null); setProposed(null);
    setValidFrom(''); setValidTo(''); setIssuingParty(''); setReferenceNumber('');
  };

  const submit = () => {
    const check = s.validateUpload(fileName, Number(sizeMB) || 0, type);
    if (!check.ok) { setRefusal(check.failures); return; }
    setRefusal(null);
    if (def?.extraction) {
      // Step 5 — the file goes to the extraction service and comes back for confirmation
      setExtracting(true);
      window.setTimeout(() => {
        setExtracting(false);
        setProposed(s.extractionFor(type).map((f) => ({ ...f })));
      }, 600);
      return;
    }
    store(false);
  };

  const store = (extractionAccepted: boolean) => {
    const get = (field: string) => proposed?.find((p) => p.field === field)?.value;
    const res = s.uploadDocument({
      fileName, sizeMB: Number(sizeMB) || 0, docType: type, recordKey, recordName, objectType,
      country, module, route, documentDate,
      validFrom: get('Valid from') ?? (validFrom || undefined),
      validTo: get('Valid to') ?? (validTo || undefined),
      issuingParty: get('Issuing party') ?? get('Counterparty') ?? (issuingParty || undefined),
      referenceNumber: get('Reference number') ?? (referenceNumber || undefined),
      extractionAccepted
    });
    if (res.ok) { setUploadOpen(false); reset(); }
  };

  const openDocument = (doc: Doc7) => {
    const r = s.openDoc(doc.id, 'Opened');
    if (!r.ok) { setRestricted({ doc, why: r.why ?? 'Not permitted.' }); return; }
    setPreview(doc);
  };

  const versionRows = versionsFor ? s.versionsOf(recordKey, versionsFor) : [];

  return (
    <Box>
      {/* 1.5 Document checklist — WF-C7-01 / Step 8 */}
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <SectionBand>Document checklist for this process step — WF-C7-01 / Step 8</SectionBand>
        <Box sx={{ p: 2 }}>
          {/* C10 / WF-C10-01 / Step 3 — the checklist step is configurable per country */}
          {disabledByConfig ? (
            <Alert severity="info" sx={{ fontSize: 12.5 }}>
              {disabledByConfig} There is no gate at this step in this country: the step is hidden rather than branched
              around, so nothing is blocked and nothing is listed as outstanding.
            </Alert>
          ) : !checklist ? (
            <Typography sx={{ fontSize: 13, color: tokens.textSecondary }}>
              No mandatory documents are configured for this record type at this step.
            </Typography>
          ) : (
            <>
              <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mb: 1 }}>
                Step: <b>{checklist.step}</b>
              </Typography>
              {checklist.mandatory.map((m) => {
                const held = docs.find((x) => x.docType === m);
                return (
                  <Stack key={m} direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                    <StatusChip status={held ? 'Valid' : 'Expired'} />
                    <Typography sx={{ fontSize: 13 }}>{m}</Typography>
                    {countryAdded.includes(m) && (
                      <Chip size="small" label={`required in ${country} — C10`} variant="outlined"
                            sx={{ height: 18, fontSize: 10.5, color: tokens.primary, borderColor: tokens.primary }} />
                    )}
                    {held && (
                      <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
                        {held.systemRef} · version {held.version} · {held.uploadedAt}
                      </Typography>
                    )}
                  </Stack>
                );
              })}
              {outstanding.length > 0 ? (
                <Alert severity="warning" sx={{ mt: 1.5, fontSize: 12.5 }}>
                  <b>{outstanding.length} mandatory document(s) outstanding: {outstanding.join(', ')}.</b> The step
                  cannot be completed, so <i>{checklist.blocks}</i> is unavailable on this record — WF-C7-01 / Step 8.
                  A completeness reminder is issued to the responsible role (C5 / WF-C5-01).
                </Alert>
              ) : (
                <Alert severity="success" sx={{ mt: 1.5, fontSize: 12.5 }}>
                  Every mandatory document for this step is present, so <i>{checklist.blocks}</i> is available.
                </Alert>
              )}
            </>
          )}
          <HandOffBanner
            label="DEPENDENCY"
            target="C10 / WF-C10-01 Configuring a Country"
            passed="Country and process step"
            returned={countryAdded.length
              ? `The checklist that applies in ${country}, including ${countryAdded.length} country-specific mandatory document${countryAdded.length === 1 ? '' : 's'} added in C10`
              : 'The document checklist that applies in this country'}
            to={`/c10/countries/${country}`}
            goLabel="Open the country checklist"
          />
        </Box>
      </Paper>

      {/* 1.4 Documents and versions */}
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <SectionBand>Documents on this record</SectionBand>
        <Box sx={{ px: 2, pt: 2 }}>
          <Button variant="contained" size="small" startIcon={<UploadFileIcon />} onClick={() => { reset(); setUploadOpen(true); }}>
            Attach a document
          </Button>
        </Box>
        {docs.length === 0 ? (
          <EmptyState message="No documents on this record" />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Type</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Name</TableCell>
                <TableCell sx={{ fontSize: 12 }}>System reference</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Version</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Validity</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Uploaded</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Status</TableCell>
                <TableCell sx={{ fontSize: 12 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {docs.map((doc) => {
                const d = docTypeDef(doc.docType);
                const state = s.expiryStateOf(doc);
                const versions = s.versionsOf(recordKey, doc.docType).length;
                return (
                  <TableRow key={doc.id} hover>
                    <TableCell sx={{ fontSize: 12.5 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <span>{doc.docType}</span>
                        {d?.sensitivity === 'Sensitive' && (
                          <Tooltip disableInteractive title={`Sensitive type — only ${d.nominatedRoles.map(roleLabel).join(', ')} may open it`}>
                            <LockOutlinedIcon sx={{ fontSize: 14, color: tokens.amber }} />
                          </Tooltip>
                        )}
                        {doc.fromComment && (
                          <Tooltip disableInteractive title="Attached to a comment and inheriting the record's access rules — C6 / WF-C6-01 / Step 6">
                            <Chip size="small" label="from a comment" sx={{ height: 17, fontSize: 10 }} />
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12.5, color: tokens.primary }}>{doc.name}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{doc.systemRef}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>
                      {doc.version}
                      {versions > 1 && (
                        <Button size="small" sx={{ fontSize: 11, p: 0, minWidth: 0, ml: 0.75 }} onClick={() => setVersionsFor(doc.docType)}>
                          {versions} versions
                        </Button>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>
                      {doc.validTo
                        ? <Stack direction="row" spacing={0.5} alignItems="center">
                            <span>{doc.validTo}</span>
                            {state !== 'Valid' && <StatusChip status={state === 'Expired' ? 'Expired' : 'Approaching expiry'} />}
                          </Stack>
                        : <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>none</Typography>}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{doc.uploadedBy}<br />{doc.uploadedAt}</TableCell>
                    <TableCell><StatusChip status={doc.status} /></TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Button size="small" onClick={() => openDocument(doc)}>Preview</Button>
                        {isAdmin && doc.status === 'Current' && (
                          <Button size="small" color="error" onClick={() => { setDeleting(doc); setReason(''); }}>Delete</Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <Box sx={{ p: 2 }}>
          <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
            Uploading the same document type again creates a new version rather than replacing the previous one, and
            every version keeps its author and upload date — WF-C7-01 / Step 6.
          </Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            <HandOffBanner target="C8 / WF-C8-01 Capturing an Audit Entry" passed="The upload, and every open, download or export of a sensitive document" />
            <HandOffBanner target="C6 / WF-C6-02 Comments within Approvals and Exceptions" passed="Document activity, which forms part of the record's activity timeline" />
          </Stack>
        </Box>
      </Paper>

      {/* 1.1 Upload and classification */}
      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Attach a document — {recordName}</DialogTitle>
        <DialogContent>
          {!proposed ? (
            <>
              <Typography sx={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, color: tokens.textSecondary, mb: 1 }}>
                1 — The file (Steps 1–2)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth size="small" label="File name" value={fileName}
                             onChange={(e) => { setFileName(e.target.value); setRefusal(null); }}
                             placeholder="lease-agreement.pdf" />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField fullWidth size="small" label="Size (MB)" value={sizeMB}
                             onChange={(e) => { setSizeMB(e.target.value.replace(/[^0-9.]/g, '')); setRefusal(null); }} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
                    Permitted for this type: {(def?.permittedFormats ?? []).map((f) => f.toUpperCase()).join(', ')} ·
                    maximum {def?.maxMB} MB
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <RadioGroup row value={source} onChange={(e) => setSource(e.target.value)}>
                    {['Attach from the record', 'Drag and drop', 'Mobile capture'].map((o) => (
                      <FormControlLabel key={o} value={o} control={<Radio size="small" />}
                                        label={<Typography sx={{ fontSize: 13 }}>{o}</Typography>} />
                    ))}
                  </RadioGroup>
                  {source === 'Mobile capture' && (
                    <Alert severity="info" icon={<PhotoCameraIcon />} sx={{ fontSize: 12.5 }}>
                      Mobile capture covers container inspection photographs and a signed delivery note — which is why
                      image formats are permitted for those types at all (WF-C7-01 / Step 1).
                    </Alert>
                  )}
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />
              <Typography sx={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, color: tokens.textSecondary, mb: 1 }}>
                2 — Classification (Step 3)
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>Document type</InputLabel>
                <Select label="Document type" value={type} onChange={(e) => { setType(e.target.value); setRefusal(null); }}>
                  {s.docTypes.map((t) => (
                    <MenuItem key={t.name} value={t.name}>
                      {t.name}{t.sensitivity === 'Sensitive' ? ' — sensitive' : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {def && (
                <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5, bgcolor: '#F7FAFC' }}>
                  <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mb: 0.5 }}>
                    What this document type implies — the type is the rule-bearer (Step 3)
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.75 }}>
                    <Chip size="small" variant="outlined" label={`Required metadata: ${def.requiredMetadata.join(', ')}`} sx={{ height: 21, fontSize: 11 }} />
                    <Chip size="small" variant="outlined" label={`Retention: ${def.retentionYears} years from ${def.retentionBasis.toLowerCase()}`} sx={{ height: 21, fontSize: 11 }} />
                    <Chip size="small" variant="outlined" label={def.sensitivity === 'Sensitive' ? `Sensitive — ${def.nominatedRoles.map(roleLabel).join(', ')} only` : 'Standard — record permission governs access'} sx={{ height: 21, fontSize: 11 }} />
                    <Chip size="small" variant="outlined" label={def.extraction ? 'Extraction applies' : 'No extraction'} sx={{ height: 21, fontSize: 11 }} />
                    {def.hasValidity && <Chip size="small" variant="outlined" label={`Notice period: ${def.noticeDays} days before expiry`} sx={{ height: 21, fontSize: 11 }} />}
                    <Chip size="small" variant="outlined" label={def.externallyVisible ? 'Externally visible' : 'Not externally visible'} sx={{ height: 21, fontSize: 11 }} />
                  </Stack>
                  <HandOffBanner label="DEPENDENCY" target="C3 / WF-C3-01 Create and Approve Master Data" passed="Document type reference" returned="The governed document type with its rules" />
                </Paper>
              )}

              <Divider sx={{ my: 2 }} />
              <Typography sx={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, color: tokens.textSecondary, mb: 1 }}>
                3 — Metadata (Step 4)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth size="small" label="Country" value={country} InputProps={{ readOnly: true }} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth size="small" label="Module" value={module} InputProps={{ readOnly: true }} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth size="small" label="Related record" value={recordName} InputProps={{ readOnly: true }} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth size="small" type="date" label="Document date" value={documentDate}
                             onChange={(e) => setDocumentDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                </Grid>
                {def?.hasValidity && (
                  <>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth size="small" type="date" label="Valid from" value={validFrom}
                                 onChange={(e) => setValidFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth size="small" type="date" label="Valid to" value={validTo}
                                 onChange={(e) => setValidTo(e.target.value)} InputLabelProps={{ shrink: true }} />
                    </Grid>
                  </>
                )}
                {def?.requiredMetadata.includes('Issuing party') && (
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth size="small" label="Issuing party" value={issuingParty}
                               onChange={(e) => setIssuingParty(e.target.value)} />
                  </Grid>
                )}
                {def?.requiredMetadata.includes('Reference number') && (
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth size="small" label="Reference number" value={referenceNumber}
                               onChange={(e) => setReferenceNumber(e.target.value)} />
                  </Grid>
                )}
              </Grid>

              {extracting && (
                <Box sx={{ mt: 2 }}>
                  <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mb: 0.5 }}>
                    Passing the file to the extraction service (C12)…
                  </Typography>
                  <LinearProgress />
                </Box>
              )}

              {/* 1.2 Upload refused */}
              {refusal && (
                <Alert severity="error" sx={{ mt: 2, fontSize: 12.5 }}>
                  <b>Upload refused — the file has not been stored and the record is unchanged.</b>
                  <List dense disablePadding>
                    {refusal.map((f) => (
                      <ListItem key={f} disableGutters><ListItemText primaryTypographyProps={{ fontSize: 12.5 }} primary={f} /></ListItem>
                    ))}
                  </List>
                  Try again with a different file.
                </Alert>
              )}
              <PlaceholderNote>
                Business confirmation required: the storage approach, which follows the outstanding hosting decision
                between cloud and on-site, and whether an existing corporate document platform must be used instead of
                or alongside internal storage (WF-C7-01 / Step 6). The prototype stores metadata only.
              </PlaceholderNote>
            </>
          ) : (
            /* 1.3 Extraction confirmation */
            <>
              <Alert severity="info" sx={{ fontSize: 13, mb: 2 }}>
                The extraction service has proposed the values below. <b>Nothing is written to the transaction until you
                accept them</b> — WF-C7-01 / Step 5. Correct anything that is wrong before accepting.
              </Alert>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 12 }}>Field</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Proposed value</TableCell>
                    <TableCell sx={{ fontSize: 12, width: 150 }}>Confidence</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {proposed.map((f, i) => (
                    <TableRow key={f.field}>
                      <TableCell sx={{ fontSize: 12.5 }}>{f.field}</TableCell>
                      <TableCell>
                        <TextField
                          size="small" fullWidth value={f.value}
                          onChange={(e) => setProposed(proposed.map((x, ix) => (ix === i ? { ...x, value: e.target.value } : x)))}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Box sx={{ width: 60, height: 6, bgcolor: tokens.border, borderRadius: 3, overflow: 'hidden' }}>
                            <Box sx={{ width: `${f.confidence * 100}%`, height: '100%', bgcolor: f.confidence < 0.75 ? tokens.orange : tokens.green }} />
                          </Box>
                          <Typography sx={{ fontSize: 11.5, color: f.confidence < 0.75 ? tokens.orange : tokens.textSecondary }}>
                            {(f.confidence * 100).toFixed(0)}%
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <HandOffBanner
                target="C12 / WF-C12-01 Standard Integration Exchange (AI services)"
                passed="File reference, document type, target field set"
                returned="Proposed field values with a confidence figure"
                resumes="C7 / WF-C7-01 / Step 6"
              />
              <PlaceholderNote>
                Business confirmation required: which document types are in scope for AI extraction in the first
                phase, and the accuracy threshold at which extraction is considered useful (WF-C7-01 / Step 5). No
                threshold is set here, so a low-confidence field is flagged in colour but not refused.
              </PlaceholderNote>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setUploadOpen(false); reset(); }}>Cancel</Button>
          {proposed ? (
            <>
              <Button onClick={() => setProposed(null)}>Back to the file</Button>
              <Button variant="contained" onClick={() => store(true)}>Accept and store</Button>
            </>
          ) : (
            <Button variant="contained" disabled={!fileName.trim() || extracting} onClick={submit}>
              {def?.extraction ? 'Validate and extract' : 'Validate and store'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* version history */}
      <Dialog open={!!versionsFor} onClose={() => setVersionsFor(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Version history — {versionsFor}</DialogTitle>
        <DialogContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Version</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Name</TableCell>
                <TableCell sx={{ fontSize: 12 }}>System reference</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Uploaded by</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Uploaded at</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Validity</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Status</TableCell>
                <TableCell sx={{ fontSize: 12 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {versionRows.map((v) => (
                <TableRow key={v.id}>
                  <TableCell sx={{ fontSize: 12.5 }}>{v.version}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{v.name}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{v.systemRef}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{v.uploadedBy}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{v.uploadedAt}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{v.validTo ? `${v.validFrom ?? '—'} to ${v.validTo}` : '—'}</TableCell>
                  <TableCell><StatusChip status={v.status} /></TableCell>
                  <TableCell><Button size="small" onClick={() => { setVersionsFor(null); openDocument(v); }}>Preview</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mt: 1.5 }}>
            Every previous version is retained with its upload date and author, and remains retrievable —
            WF-C7-01 / Step 6.
          </Typography>
        </DialogContent>
        <DialogActions><Button onClick={() => setVersionsFor(null)}>Close</Button></DialogActions>
      </Dialog>

      {/* 2.4 Restricted document notice */}
      <Dialog open={!!restricted} onClose={() => setRestricted(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>This document is restricted</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ fontSize: 13 }}>{restricted?.why}</Alert>
          <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mt: 2 }}>
            Only the document type is shown here. Its metadata is not, because the restriction is on the content and
            its detail — WF-C7-02 / Step 2. The refused attempt has been written to the audit trail (Step 5).
          </Typography>
        </DialogContent>
        <DialogActions><Button onClick={() => setRestricted(null)}>Close</Button></DialogActions>
      </Dialog>

      {/* 3.4 Delete with reason */}
      <Dialog open={!!deleting} onClose={() => setDeleting(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Delete document — administrator only</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ fontSize: 13, mb: 2 }}>
            Deletion is available only to an administrator, requires a reason and is fully audited. The
            <b> metadata record persists</b> so the document register remains complete — deletion is not a way to
            remove a document from the audit trail (WF-C7-03 / Steps 6–7).
          </Alert>
          <TextField
            fullWidth size="small" multiline minRows={3} required label="Reason for deletion"
            value={reason} onChange={(e) => setReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="contained" color="error" disabled={!reason.trim()}
                  onClick={() => { if (deleting) s.deleteDoc(deleting.id, reason.trim()); setDeleting(null); }}>
            Delete with reason
          </Button>
        </DialogActions>
      </Dialog>

      <DocumentPreview doc={preview} onClose={() => setPreview(null)} />
    </Box>
  );
};

/** Small helper used by the expiry screens */
export const daysLeft = (validTo?: string) => (validTo ? daysBetween(TODAY, validTo) : undefined);
