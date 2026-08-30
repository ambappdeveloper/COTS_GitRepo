import React from 'react';
import {
  Box, Button, Paper, Typography, Stack, FormControl, InputLabel, Select, MenuItem, RadioGroup,
  Radio, FormControlLabel, Alert, Table, TableHead, TableRow, TableCell, TableBody, Chip, TextField, Divider
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import { HandOffBanner, PageBanner, PlaceholderNote, SectionBand, WhiteButton } from '../../components/shared';
import {
  BULK_ROWS_READ, BULK_TEMPLATE_FIELDS, BULK_VALIDATION, DOMAINS, EXTRACTION_PROPOSAL
} from '../../mockData/c3';
import { ShellFooterNote } from '../../layouts/AppShell';

const Step: React.FC<{ n: number; title: string; children: React.ReactNode; done?: boolean }> = ({ n, title, children, done }) => (
  <Paper variant="outlined" sx={{ mb: 2 }}>
    <SectionBand>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box sx={{
          width: 20, height: 20, borderRadius: '50%', bgcolor: done ? '#1E7B4F' : tokens.primary, color: '#fff',
          fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>{n}</Box>
        <span>{title}</span>
      </Stack>
    </SectionBand>
    <Box sx={{ p: 2 }}>{children}</Box>
  </Paper>
);

/** 3.1 Bulk Load + 3.2 Validation Report — WF-C3-03 / Steps 1–5 */
export const BulkLoad: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [domain, setDomain] = React.useState('warehouse');
  const [source, setSource] = React.useState<'Spreadsheet' | 'Document'>('Spreadsheet');
  const [downloaded, setDownloaded] = React.useState(false);
  const [uploaded, setUploaded] = React.useState(false);
  const [fileName, setFileName] = React.useState('');
  const [extractionAccepted, setExtractionAccepted] = React.useState(false);
  const [proposal, setProposal] = React.useState(EXTRACTION_PROPOSAL);

  const d = DOMAINS.find((x) => x.key === domain)!;
  const fields = BULK_TEMPLATE_FIELDS[domain] ?? ['Code', 'Name', 'Description'];
  const errors = BULK_VALIDATION.filter((v) => v.severity === 'Error');
  const errorRows = new Set(errors.map((e) => e.row));
  const validRows = BULK_ROWS_READ - errorRows.size;

  return (
    <>
      <PageBanner
        title="Bulk load"
        breadcrumb={[d.scope === 'Global' ? 'Global' : s.activeCountry, 'C3 Master Data', 'Bulk load']}
        subtitle="WF-C3-03 / Steps 1–5 — nothing is committed until the outcome of validation is resolved"
        actions={<WhiteButton onClick={() => navigate('/c3/domains')}>Back to domains</WhiteButton>}
      />
      <Box sx={{ p: 3 }}>
        <Step n={1} title="Download the template for the domain" done={downloaded}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel>Domain</InputLabel>
              <Select label="Domain" value={domain} onChange={(e) => { setDomain(e.target.value); setDownloaded(false); setUploaded(false); }}>
                {DOMAINS.map((x) => <MenuItem key={x.key} value={x.key}>{x.name} — {x.group}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => setDownloaded(true)}>Download template</Button>
            {downloaded && <Chip size="small" label="Template downloaded" sx={{ bgcolor: '#1E7B4F', color: '#fff', height: 22 }} />}
          </Stack>
          <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mt: 1.5 }}>
            The template carries the <b>current</b> field definitions and permitted values, so an out-of-date template
            is never silently accepted — WF-C3-03 / Step 1.
          </Typography>
          <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5, bgcolor: '#FAFBFC' }}>
            <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mb: 0.5 }}>Columns in the {d.name} template</Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {fields.map((f) => <Chip key={f} size="small" variant="outlined" label={f} sx={{ height: 20, fontSize: 10.5 }} />)}
            </Stack>
          </Paper>
        </Step>

        <Step n={2} title="Upload the completed file" done={uploaded}>
          <RadioGroup row value={source} onChange={(e) => { setSource(e.target.value as any); setUploaded(false); setExtractionAccepted(false); }}>
            <FormControlLabel value="Spreadsheet" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 13.5 }}>Spreadsheet</Typography>} />
            <FormControlLabel value="Document" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 13.5 }}>Document — extraction proposes the values</Typography>} />
          </RadioGroup>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 1 }}>
            <TextField
              size="small" label="File name" sx={{ minWidth: 280 }}
              value={fileName} onChange={(e) => setFileName(e.target.value)}
              placeholder={source === 'Spreadsheet' ? 'warehouses-2026-08.xlsx' : 'kassala-lease.pdf'}
            />
            <Button variant="contained" startIcon={<UploadFileIcon />} disabled={!downloaded && source === 'Spreadsheet'} onClick={() => setUploaded(true)}>Upload</Button>
          </Stack>
          {!downloaded && source === 'Spreadsheet' && (
            <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mt: 1 }}>Download the template first.</Typography>
          )}
        </Step>

        {uploaded && source === 'Document' && (
          <Step n={3} title="Confirm the extracted values" done={extractionAccepted}>
            <Alert severity="info" sx={{ fontSize: 12.5, mb: 2 }}>
              Where the source is a document rather than a spreadsheet, AI-assisted extraction proposes values.
              <b> The user must confirm them before they are committed</b> — WF-C3-03 / Step 4.
            </Alert>
            <Table size="small">
              <TableHead><TableRow><TableCell>Field</TableCell><TableCell>Proposed value</TableCell><TableCell>Confidence</TableCell><TableCell>Confirmed value</TableCell></TableRow></TableHead>
              <TableBody>
                {proposal.map((p, i) => (
                  <TableRow key={p.field}>
                    <TableCell>{p.field}</TableCell>
                    <TableCell sx={{ color: tokens.textSecondary }}>{p.proposed}</TableCell>
                    <TableCell>
                      <Chip size="small" label={p.confidence} sx={{ height: 19, fontSize: 10.5, bgcolor: p.confidence === 'High' ? '#1E7B4F' : '#D9660B', color: '#fff' }} />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small" value={p.proposed}
                        onChange={(e) => setProposal((prev) => prev.map((x, j) => (j === i ? { ...x, proposed: e.target.value } : x)))}
                        inputProps={{ style: { fontSize: 12.5 } }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PlaceholderNote kind="consistency">
              C3 / WF-C3-03 / Step 4 describes bulk-load extraction without naming an integration route, whereas
              C7 / WF-C7-01 / Step 5 routes document extraction through C12 / WF-C12-01 and C12 / WF-C12-02 / Step 8
              lists AI services as a registered interface. Confirm whether bulk-load extraction uses the same
              registered C12 interface. The screen below assumes it does.
            </PlaceholderNote>
            <HandOffBanner
              target="C12 / WF-C12-01 Standard Integration Exchange (AI services)"
              passed="File reference, domain, target field set"
              returned="Proposed field values for confirmation"
              resumes="C3 / WF-C3-03 / Step 5 once the user accepts"
            />
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button variant="outlined" onClick={() => { setUploaded(false); setExtractionAccepted(false); }}>Discard</Button>
              <Button variant="contained" onClick={() => setExtractionAccepted(true)}>Accept the confirmed values</Button>
            </Stack>
          </Step>
        )}

        {uploaded && source === 'Spreadsheet' && (
          <Step n={3} title="Validation report">
            <Stack direction="row" spacing={4} sx={{ mb: 2 }}>
              <Box><Typography sx={{ fontSize: 26, fontWeight: 300, color: tokens.primary }}>{BULK_ROWS_READ}</Typography><Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>rows read</Typography></Box>
              <Box><Typography sx={{ fontSize: 26, fontWeight: 300, color: '#1E7B4F' }}>{validRows}</Typography><Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>rows valid</Typography></Box>
              <Box><Typography sx={{ fontSize: 26, fontWeight: 300, color: '#B3261E' }}>{errorRows.size}</Typography><Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>rows in error</Typography></Box>
              <Box><Typography sx={{ fontSize: 26, fontWeight: 300, color: '#D9660B' }}>{BULK_VALIDATION.filter((v) => v.severity === 'Warning').length}</Typography><Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>warnings</Typography></Box>
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Row</TableCell><TableCell>Field</TableCell><TableCell>Value supplied</TableCell>
                  <TableCell>Severity</TableCell><TableCell>Message</TableCell><TableCell>Outcome</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {BULK_VALIDATION.map((v, i) => (
                  <TableRow key={i} hover>
                    <TableCell>{v.row}</TableCell>
                    <TableCell>{v.field}</TableCell>
                    <TableCell sx={{ color: tokens.textSecondary }}>{v.value}</TableCell>
                    <TableCell>
                      <Chip size="small" label={v.severity} sx={{ height: 19, fontSize: 10.5, bgcolor: v.severity === 'Error' ? '#B3261E' : '#D9660B', color: '#fff' }} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 380 }}>{v.message}</TableCell>
                    <TableCell>{v.severity === 'Error' ? 'Blocked' : 'Will be loaded'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Alert severity="warning" sx={{ mt: 2, fontSize: 12.5 }}>
              Nothing is committed until the outcome is resolved — WF-C3-03 / Step 3. Either correct the file and
              re-upload, or accept a partial load of the {validRows} valid rows only. Rows in error are never loaded
              silently.
            </Alert>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <Button variant="outlined" startIcon={<DownloadIcon />}>Download the report</Button>
              <Button variant="outlined" onClick={() => { setUploaded(false); setFileName(''); }}>Correct and re-upload</Button>
            </Stack>
          </Step>
        )}

        {((uploaded && source === 'Spreadsheet') || extractionAccepted) && (
          <Step n={4} title="Commit">
            <Typography sx={{ fontSize: 13, mb: 1.5 }}>
              Loaded records enter the same approval route as manually created records, and the load is written to the
              audit trail as a sensitive action — WF-C3-03 / Step 5.
            </Typography>
            <HandOffBanner
              target="C4 / WF-C4-01 Standard Approval Cycle"
              passed="Staged rows, domain, country, requester"
              returned="Approved / Rejected / Returned for amendment per record"
              resumes="C3 / WF-C3-01 / Step 9 for each approved record"
            />
            <HandOffBanner target="C8 / WF-C8-01 Capturing an Audit Entry" passed="The load itself" returned="Immutable entry; bulk data loads are sensitive actions" />
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => navigate('/c3/domains')}>Cancel the load</Button>
              {source === 'Spreadsheet' && (
                <Button variant="outlined" onClick={() => { s.bulkLoad(domain, validRows, true); navigate(`/c3/domains/${domain}`); }}>
                  Accept partial load — {validRows} valid rows
                </Button>
              )}
              <Button
                variant="contained"
                disabled={source === 'Spreadsheet' && errorRows.size > 0}
                onClick={() => { s.bulkLoad(domain, source === 'Document' ? 1 : BULK_ROWS_READ, false); navigate(`/c3/domains/${domain}`); }}
              >
                Commit {source === 'Document' ? 'the extracted record' : `all ${BULK_ROWS_READ} rows`}
              </Button>
            </Stack>
            {source === 'Spreadsheet' && errorRows.size > 0 && (
              <Typography sx={{ fontSize: 12, color: tokens.red, mt: 1 }}>
                Committing every row is blocked while {errorRows.size} row(s) are in error. Correct the file, or accept
                the partial load.
              </Typography>
            )}
          </Step>
        )}

        <ShellFooterNote />
      </Box>
    </>
  );
};
