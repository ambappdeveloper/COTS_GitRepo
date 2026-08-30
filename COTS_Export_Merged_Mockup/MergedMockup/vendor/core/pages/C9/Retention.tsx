import React from 'react';
import {
  Alert, Box, Button, Chip, FormControl, FormControlLabel, InputLabel, MenuItem, OutlinedInput, Paper,
  Select, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  EmptyState, HandOffBanner, PageBanner, SectionBand, WhiteButton
} from '../../components/shared';
import {
  EXPORT_FORMATS, LOG_CLASSES, LogClass, LogEntry, RetentionAction, RotationMode, SEVERITIES, Severity
} from '../../mockData/c9';
import { ShellFooterNote } from '../../layouts/AppShell';
import { FriendlyErrorDialog } from './Health';

const ROTATIONS: RotationMode[] = ['Daily', 'Weekly', 'By size'];
const ACTIONS: RetentionAction[] = ['Recycle', 'Trim to summary', 'Delete'];

/** 3.3 Log Retention and Export — WF-C9-03 / Steps 4–5 */
export const LogRetention: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [preview, setPreview] = React.useState(false);

  // Export form
  const [classes, setClasses] = React.useState<string[]>(['Integration exchange log']);
  const [from, setFrom] = React.useState('2026-08-01');
  const [to, setTo] = React.useState('2026-08-18');
  const [severityFrom, setSeverityFrom] = React.useState<Severity | ''>('');
  const [correlation, setCorrelation] = React.useState('');
  const [includeArchived, setIncludeArchived] = React.useState(false);
  const [format, setFormat] = React.useState('CSV');
  const [result, setResult] = React.useState<{ ok: boolean; why?: string; rows?: LogEntry[]; maskedFields?: number } | null>(null);

  const rows = s.retentionPreview();

  return (
    <>
      <PageBanner
        title="Log retention and export"
        breadcrumb={['Global', 'C9 Logging and Monitoring', 'Log retention and export']}
        subtitle="WF-C9-03 / Steps 4–5 — rotation, recycling and trimming, and a masked export throughout the retention period"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c8/retention')}>C08 audit retention</WhiteButton>
            <WhiteButton onClick={() => navigate('/c9/levels')}>Log levels</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        {/* The C8 contrast, stated rather than assumed */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <Paper variant="outlined" sx={{ flex: 1, p: 2, borderColor: tokens.primary }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.5 }}>C8 — a business audit entry</Typography>
            <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
              Evidential. Cannot be edited or deleted from within the application by any role, including an administrator.
              Retention archives and trims; it never edits. Retained for years, read by compliance.
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ flex: 1, p: 2, borderColor: tokens.orange }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.5 }}>C9 — a technical log entry</Typography>
            <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
              Diagnostic. Masked as written, rotated, and <b>recycled or deleted under policy</b> — because volume must be
              controlled without losing the ability to investigate. Read by support.
            </Typography>
          </Paper>
        </Stack>

        {/* Rotation and retention */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Rotation and retention per log class — WF-C9-03 / Step 4</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Log class</TableCell>
                <TableCell sx={{ fontSize: 12, width: 140 }}>Rotation</TableCell>
                <TableCell sx={{ fontSize: 12, width: 130 }}>Online (days)</TableCell>
                <TableCell sx={{ fontSize: 12, width: 130 }}>Archived (days)</TableCell>
                <TableCell sx={{ fontSize: 12, width: 170 }}>Then</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Held online</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Archived</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Estimated volume</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {s.logRetention.map((r) => {
                const held = rows.find((x) => x.logClass === r.logClass);
                return (
                  <TableRow key={r.logClass}>
                    <TableCell sx={{ fontSize: 12.5 }}>{r.logClass}</TableCell>
                    <TableCell>
                      <Select size="small" fullWidth value={r.rotation}
                              inputProps={{ 'aria-label': `${r.logClass} rotation` }}
                              onChange={(e) => s.saveLogRetention(r.logClass, { rotation: e.target.value as RotationMode })}>
                        {ROTATIONS.map((x) => <MenuItem key={x} value={x} sx={{ fontSize: 13 }}>{x}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <TextField size="small" value={r.onlineDays} sx={{ width: 90 }}
                                 inputProps={{ 'aria-label': `${r.logClass} online days` }}
                                 onChange={(e) => s.saveLogRetention(r.logClass, { onlineDays: Number(e.target.value) || 0 })} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" value={r.archivedDays} sx={{ width: 90 }}
                                 inputProps={{ 'aria-label': `${r.logClass} archived days` }}
                                 onChange={(e) => s.saveLogRetention(r.logClass, { archivedDays: Number(e.target.value) || 0 })} />
                    </TableCell>
                    <TableCell>
                      <Select size="small" fullWidth value={r.then}
                              inputProps={{ 'aria-label': `${r.logClass} action` }}
                              onChange={(e) => s.saveLogRetention(r.logClass, { then: e.target.value as RetentionAction })}>
                        {ACTIONS.map((x) => <MenuItem key={x} value={x} sx={{ fontSize: 13 }}>{x}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{held?.online ?? 0}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{held?.archived ?? 0}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>
                      {r.estimatedMbPerMonth >= 1024
                        ? `${(r.estimatedMbPerMonth / 1024).toFixed(1)} GB / month`
                        : `${r.estimatedMbPerMonth} MB / month`}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
              The estimated volume is stated so that retention reads as a cost decision rather than a preference.
            </Typography>
          </Box>
        </Paper>

        {/* Run the cycle */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Run the retention cycle</SectionBand>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
              <Button variant="outlined" onClick={() => setPreview((v) => !v)}>
                {preview ? 'Hide the preview' : 'Preview what would happen'}
              </Button>
              <Button variant="contained" color="warning" onClick={() => { s.runLogRetentionCycle(); setPreview(false); }}>
                Run the cycle
              </Button>
            </Stack>
            {preview && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 12 }}>Log class</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Online</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Archived</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>To archive</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>To trim to summary</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>To recycle or delete</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Action beyond retention</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.logClass}>
                      <TableCell sx={{ fontSize: 12.5 }}>{r.logClass}</TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{r.online}</TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{r.archived}</TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{r.toArchive}</TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{r.toTrim}</TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{r.toDelete}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{r.action}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Typography sx={{ fontSize: 12.5, mt: 2 }}>
              The run itself writes a log entry recording what was removed and under whose authority. The <b>C08</b> audit
              retention cycle also writes an entry here — WF-C8-03 / Step 5 states that the trimming run is a technical
              event and is logged, not audited. Run the C08 cycle and this log gains an entry, which is the smallest proof
              that the two modules are one system.
            </Typography>
            <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/c8/retention')}>Open the C08 retention screen</Button>
          </Box>
        </Paper>

        {/* Export */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Export — WF-C9-03 / Step 5</SectionBand>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 280 }}>
                <InputLabel>Log class</InputLabel>
                <Select
                  multiple label="Log class" value={classes} input={<OutlinedInput label="Log class" />}
                  onChange={(e) => setClasses(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
                  renderValue={(v) => (v as string[]).join(', ')}
                >
                  {LOG_CLASSES.map((c) => <MenuItem key={c} value={c} sx={{ fontSize: 13 }}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField size="small" label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                         InputLabelProps={{ shrink: true }} />
              <TextField size="small" label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)}
                         InputLabelProps={{ shrink: true }} />
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Severity from</InputLabel>
                <Select label="Severity from" value={severityFrom} onChange={(e) => setSeverityFrom(e.target.value as Severity | '')}>
                  <MenuItem value="" sx={{ fontSize: 13 }}>Any</MenuItem>
                  {SEVERITIES.map((x) => <MenuItem key={x} value={x} sx={{ fontSize: 13 }}>{x}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField size="small" label="Correlation reference" value={correlation}
                         onChange={(e) => setCorrelation(e.target.value)} sx={{ minWidth: 200 }}
                         helperText="One reference, the full trail" />
              <FormControlLabel
                control={<Switch size="small" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />}
                label={<Typography sx={{ fontSize: 12.5 }}>Include archived</Typography>}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Format</InputLabel>
                <Select label="Format" value={format} onChange={(e) => setFormat(e.target.value)}>
                  {EXPORT_FORMATS.map((f) => <MenuItem key={f} value={f} sx={{ fontSize: 13 }}>{f}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>

            <Alert severity="info" sx={{ mt: 2, fontSize: 12.5 }}>
              Sensitive values are masked in the export exactly as in the original entry, and <b>cannot be unmasked
              here</b> — the original value was never written. Masking is enforced and is not a setting on this form.
            </Alert>

            <Button variant="contained" sx={{ mt: 2 }}
                    onClick={() => setResult(s.exportLogs({
                      logClasses: classes, from, to,
                      severityFrom: severityFrom || undefined,
                      correlation: correlation.trim() || undefined,
                      includeArchived, format
                    }))}>
              Produce the export
            </Button>

            {result && !result.ok && <Alert severity="error" sx={{ mt: 2, fontSize: 12.5 }}>{result.why}</Alert>}
            {result?.ok && (
              <Box sx={{ mt: 2 }}>
                <Typography sx={{ fontSize: 12.5, mb: 1 }}>
                  {result.rows?.length ?? 0} row{(result.rows?.length ?? 0) === 1 ? '' : 's'} · {result.maskedFields} masked
                  value{result.maskedFields === 1 ? '' : 's'} carried into the export as masked. Preview of the first rows:
                </Typography>
                {(result.rows?.length ?? 0) === 0
                  ? <EmptyState message="Nothing matches the export criteria." hint="Widen the date range, or include archived entries." />
                  : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontSize: 12 }}>At</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>Severity</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>Component</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>Message</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>Masked values</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {result.rows!.slice(0, 8).map((l) => (
                          <TableRow key={l.id}>
                            <TableCell sx={{ fontSize: 11.5 }}>{l.at}</TableCell>
                            <TableCell sx={{ fontSize: 12 }}>{l.severity}</TableCell>
                            <TableCell sx={{ fontSize: 12 }}>{l.component}</TableCell>
                            <TableCell sx={{ fontSize: 12 }}>{l.message}</TableCell>
                            <TableCell sx={{ fontSize: 11.5, fontFamily: 'monospace' }}>
                              {l.masked?.map((m) => `${m.field}: ${m.value}`).join('; ') ?? '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
              </Box>
            )}
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Exports produced — a technical action, logged here</SectionBand>
          {s.logExports.length === 0 ? <EmptyState message="No export has been produced." /> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Export</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>At</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>By</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Log classes</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Period</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Format</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Rows</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Masked values</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {s.logExports.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{e.id}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{e.at}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{e.by}</TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>{e.logClasses.join(', ')}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{e.from} to {e.to}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{e.format}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{e.rows}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{e.maskedFields}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
              C08 logs audit queries and exports because audit data is evidence; C09 logs log exports because a log export
              is a technical action. Both are recorded — in their own stores.
            </Typography>
          </Box>
        </Paper>

        <HandOffBanner
          label="RETURN"
          target="C8 / WF-C8-03 / Step 5"
          passed="Every trimming and recycling run in C08 is itself logged here, recording what was removed and under whose authority. The trimming run is a technical event and is logged, not audited."
        />
        <ShellFooterNote />
      </Box>
      <FriendlyErrorDialog />
    </>
  );
};
