import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControl, Grid, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  EmptyState, HandOffBanner, PageBanner, PlaceholderNote, SectionBand, StatusChip, WhiteButton
} from '../../components/shared';
import { DataTable, Column } from '../../components/DataTable';
import {
  EVENT_TYPES, LANGUAGES, MERGE_FIELDS, Template, renderTemplate, unknownFields
} from '../../mockData/c5';
import { ShellFooterNote } from '../../layouts/AppShell';

const SAMPLE = {
  'record.reference': 'AR-000141',
  'record.name': 'Omar Bashir — Sourcing Officer, Sudan',
  'record.status': 'Pending Approval',
  requester: 'Nasreen Sayed',
  country: 'Sudan',
  due: '2026-08-22',
  decision: 'Approved',
  comment: 'Scope matches the role catalogue.',
  deepLink: '/c1/access-requests/AR-000141',
  'recipient.name': 'Grace Mensah'
};

const fieldsUsed = (t: Template) =>
  [...new Set([...t.subject.matchAll(/\{\{([^}]+)\}\}/g), ...t.body.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => `{{${m[1].trim()}}}`))];

/** 3.1 Template List + 3.2 Template Editor and Preview — WF-C5-03 / Step 1 */
export const Templates: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [edit, setEdit] = React.useState<Template | null>(null);
  const [preview, setPreview] = React.useState<Template | null>(null);

  const columns: Column<Template>[] = [
    { key: 'id', label: 'Template', render: (t) => <Typography sx={{ fontSize: 13, color: tokens.primary, fontWeight: 500 }}>{t.id}</Typography> },
    { key: 'event', label: 'Event type' },
    { key: 'language', label: 'Language' },
    { key: 'subject', label: 'Subject line' },
    { key: 'fields', label: 'Merge fields used', value: (t) => fieldsUsed(t).join(' ') },
    { key: 'version', label: 'Version', value: (t) => String(t.version) },
    { key: 'status', label: 'Status', render: (t) => <StatusChip status={t.status} /> },
    { key: 'lastChanged', label: 'Last changed', value: (t) => `${t.lastChanged} · ${t.changedBy}` },
    {
      key: 'actions', label: '',
      render: (t) => (
        <Stack direction="row" spacing={0.5}>
          <Button size="small" onClick={(e) => { e.stopPropagation(); setEdit({ ...t }); }}>Open</Button>
          <Button size="small" onClick={(e) => { e.stopPropagation(); setPreview(t); }}>Preview</Button>
          {t.status === 'Draft' && (
            <Button size="small" onClick={(e) => { e.stopPropagation(); s.releaseTemplate(t.id); }}>Release</Button>
          )}
        </Stack>
      )
    }
  ];

  /** a language with no released template for an event is an operational gap, not a cosmetic one */
  const gaps: { event: string; language: string }[] = [];
  [...new Set(s.templates.map((t) => t.event))].forEach((ev) => {
    LANGUAGES.forEach((lang) => {
      if (!s.templates.some((t) => t.event === ev && t.language === lang && t.status === 'Released')) {
        gaps.push({ event: ev, language: lang });
      }
    });
  });

  const previewTarget = preview ?? edit;
  const unknown = previewTarget ? [...new Set([...unknownFields(previewTarget.subject), ...unknownFields(previewTarget.body)])] : [];

  return (
    <>
      <PageBanner
        title="Notification templates"
        breadcrumb={['Global', 'C5 Notifications and Alerts', 'Templates']}
        subtitle="WF-C5-03 / Step 1 — a template per event type and per language, previewed before release"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => setEdit({
              id: `TPL-${String(s.templates.length + 1).padStart(2, '0')}`, event: EVENT_TYPES[0], language: 'English',
              subject: '', body: '', version: 1, status: 'Draft', lastChanged: '2026-08-18', changedBy: '—'
            })}>New template</WhiteButton>
            <WhiteButton onClick={() => navigate('/c5/rules')}>Notification rules</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <DataTable
          columns={columns} rows={s.templates} groupable
          onRowClick={(t) => setEdit({ ...t })}
          emptyMessage="No templates are configured"
          searchPlaceholder="Search templates"
        />

        <Paper variant="outlined" sx={{ mt: 2 }}>
          <SectionBand>Languages without a released template</SectionBand>
          {gaps.length === 0 ? (
            <EmptyState message="Every event has a released template in every language" />
          ) : (
            <Box sx={{ p: 2 }}>
              <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.75, mb: 1 }}>
                {gaps.map((g) => (
                  <Chip key={`${g.event}-${g.language}`} size="small" variant="outlined"
                        label={`${g.event} — ${g.language}`} sx={{ height: 21, fontSize: 11, borderColor: tokens.amber, color: tokens.amber }} />
                ))}
              </Stack>
              <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
                A recipient whose language has no released template receives the English template instead, and the
                delivery log says so on the row. The gap is shown here because it is an operational matter, not a
                cosmetic one — WF-C5-01 / Step 3.
              </Typography>
            </Box>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ mt: 2 }}>
          <SectionBand>Available merge fields</SectionBand>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.75 }}>
              {MERGE_FIELDS.map((f) => <Chip key={f} size="small" label={f} sx={{ height: 21, fontSize: 11, fontFamily: 'monospace' }} />)}
            </Stack>
            <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mt: 1 }}>
              Drawn from the event payload. A field the payload cannot supply is reported on preview rather than
              rendered blank, so a released template never sends an empty sentence to a recipient.
            </Typography>
            <HandOffBanner target="C8 / WF-C8-01 Capturing an Audit Entry" passed="Template changes, as configuration changes and sensitive actions" />
          </Box>
        </Paper>

        <ShellFooterNote />
      </Box>

      {/* editor */}
      <Dialog open={!!edit} onClose={() => setEdit(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>{edit?.id} — template</DialogTitle>
        <DialogContent>
          {edit && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={5}>
                <FormControl fullWidth size="small">
                  <InputLabel>Event type</InputLabel>
                  <Select label="Event type" value={edit.event} onChange={(e) => setEdit({ ...edit, event: e.target.value })}>
                    {EVENT_TYPES.map((ev) => <MenuItem key={ev} value={ev}>{ev}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Language</InputLabel>
                  <Select label="Language" value={edit.language} onChange={(e) => setEdit({ ...edit, language: e.target.value })}>
                    {LANGUAGES.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth size="small" label="Version" value={edit.version}
                           onChange={(e) => setEdit({ ...edit, version: Number(e.target.value) || 1 })} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth size="small" label="Subject" value={edit.subject}
                           onChange={(e) => setEdit({ ...edit, subject: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth size="small" label="Body" multiline minRows={7} value={edit.body}
                           onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mb: 0.5 }}>Insert a merge field</Typography>
                <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.5 }}>
                  {MERGE_FIELDS.map((f) => (
                    <Button key={f} size="small" variant="outlined" sx={{ fontSize: 11, py: 0.1 }}
                            onClick={() => setEdit({ ...edit, body: `${edit.body}${f}` })}>{f}</Button>
                  ))}
                </Stack>
              </Grid>
              {unknown.length > 0 && (
                <Grid item xs={12}>
                  <Alert severity="warning" sx={{ fontSize: 12.5 }}>
                    Unknown merge field(s): {unknown.join(', ')}. The event payload cannot supply these, so they are
                    reported rather than rendered blank.
                  </Alert>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdit(null)}>Cancel</Button>
          {edit && <Button onClick={() => setPreview(edit)}>Preview</Button>}
          <Button variant="contained" onClick={() => { if (edit) s.saveTemplate({ ...edit, status: 'Draft' }); setEdit(null); }}>
            Save draft
          </Button>
        </DialogActions>
      </Dialog>

      {/* preview before release */}
      <Dialog open={!!preview} onClose={() => setPreview(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Preview — {preview?.event}, {preview?.language}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, mb: 2 }}>
            Rendered against a sample record with the merge fields resolved, so the administrator reads what the
            recipient will read — WF-C5-03 / Step 1.
          </Typography>
          {preview && (
            <>
              <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>Subject</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1.5 }}>{renderTemplate(preview.subject, SAMPLE)}</Typography>
              <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>Body</Typography>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#FAFBFC' }}>
                <Typography sx={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{renderTemplate(preview.body, SAMPLE)}</Typography>
              </Paper>
              <Divider sx={{ my: 2 }} />
              <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
                Sample record: AR-000141, Sudan. Status: <b>{preview.status}</b>.
                {preview.status === 'Draft' && ' A Draft template is never used for dispatch.'}
              </Typography>
              {unknown.length > 0 && (
                <Alert severity="warning" sx={{ mt: 2, fontSize: 12.5 }}>
                  Unknown merge field(s) left visible: {unknown.join(', ')}.
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          {preview?.status === 'Draft' && (
            <Button variant="contained" onClick={() => { s.releaseTemplate(preview.id); setPreview(null); setEdit(null); }}>
              Release
            </Button>
          )}
          <Button onClick={() => setPreview(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
