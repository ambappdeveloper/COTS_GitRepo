import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Drawer, FormControl,
  FormControlLabel, InputLabel, MenuItem, OutlinedInput, Paper, Select, Stack, Switch, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  EmptyState, EmptyState as Empty, FieldGrid, HandOffBanner, PageBanner, PlaceholderNote, SectionBand,
  StatusChip, WhiteButton
} from '../../components/shared';
import { ChartFrame, DataTableView, HBar } from '../../components/Charts';
import {
  EXPORT_LAYOUTS, ExportLayout, PERIOD_PRESETS, PUBLISH_ROLES, REPORTS, reportDef
} from '../../mockData/c11';
import { DOMAINS } from '../../mockData/c3';
import { ShellFooterNote } from '../../layouts/AppShell';

/** 1.1 Report Catalogue — WF-C11-01 / Steps 1, 9 */
export const ReportCatalogue: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const modules = Array.from(new Set(REPORTS.map((r) => r.module)));

  return (
    <>
      <PageBanner
        title="Reports"
        breadcrumb={['Global', 'C11 Reporting and Dashboards', 'Reports']}
        subtitle="WF-C11-01 / Step 1 — opened from the module that owns it, or from the shared reporting area for cross-module reports"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c11/views')}>Saved views</WhiteButton>
            <WhiteButton onClick={() => navigate('/c11/cards')}>Dashboard cards</WhiteButton>
            <WhiteButton onClick={() => navigate('/c11/schedules')}>Schedules</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
          C11 is the module that consumes everything above it, and it inherits three debts: the C09 health dashboard, the
          C10 configuration report and C10's reporting normalisation targets were all built holding C11's place, each with
          a banner saying so. <b>Every figure here is computed from the live stores of C01–C10 and drills to the records it
          was computed from</b> — nothing is a hard-coded total, because a hard-coded total cannot be drilled.
        </Alert>

        <PlaceholderNote>{s.reportNotes.delivery}</PlaceholderNote>
        <PlaceholderNote>{s.reportNotes.latency}</PlaceholderNote>

        {modules.map((m) => (
          <Paper variant="outlined" sx={{ mb: 2, mt: 2 }} key={m}>
            <SectionBand>{m === 'Shared' ? 'Shared reporting area — cross-module reports' : `${m} reports`}</SectionBand>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Report</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>What it answers</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Parameters</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Source</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Weight</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Drill-through</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Permission</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {REPORTS.filter((r) => r.module === m).map((r) => {
                  const can = s.canRunReport(r.id);
                  return (
                    <TableRow key={r.id} hover>
                      <TableCell>
                        <Button size="small" sx={{ fontSize: 12, textAlign: 'left' }}
                                onClick={() => navigate(`/c11/reports/${r.id}`)}>
                          {r.id} {r.name}
                        </Button>
                        {r.inheritedFrom && (
                          <Chip size="small" label={`takes over from ${r.inheritedFrom.module}`} variant="outlined"
                                sx={{ ml: 0.5, height: 18, fontSize: 10, color: tokens.primary, borderColor: tokens.primary }} />
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{r.question}</TableCell>
                      <TableCell sx={{ fontSize: 11.5 }}>{r.params.join(', ')}</TableCell>
                      <TableCell sx={{ fontSize: 11.5 }}>{r.source}</TableCell>
                      <TableCell>
                        <Chip size="small" label={r.heavy ? 'Heavy' : 'Light'}
                              sx={{
                                fontSize: 10.5,
                                bgcolor: r.heavy ? `${tokens.amber}1A` : `${tokens.green}1A`,
                                color: r.heavy ? tokens.amber : tokens.green
                              }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 11.5, fontFamily: 'monospace' }}>{r.drillTo}</TableCell>
                      <TableCell sx={{ fontSize: 11.5 }}>
                        {can.ok
                          ? <Chip size="small" label="You may run this" sx={{ fontSize: 10.5, bgcolor: `${tokens.green}1A`, color: tokens.green }} />
                          : <Chip size="small" label="Not permitted" sx={{ fontSize: 10.5, bgcolor: `${tokens.red}1A`, color: tokens.red }} />}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>
        ))}

        <Paper variant="outlined" sx={{ mb: 2, p: 2 }}>
          <Typography sx={{ fontSize: 12.5 }}>
            <b>A report the user may not run is shown, not hidden.</b> Knowing a report exists and who can grant access to
            it is more useful than a shorter list, and it is the pattern C08 established for the audit search. Heavy
            reports are routed to the reporting data store so that operational performance is protected — WF-C11-01 /
            Step 9.
          </Typography>
        </Paper>

        <ShellFooterNote />
      </Box>
    </>
  );
};

/** 1.2 Parameter panel + 1.3 Report viewer + 1.4 Export — WF-C11-01 / Steps 2–7, 9 */
export const ReportViewer: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const def = reportDef(id);
  const scope = s.reportScope();
  const can = s.canRunReport(id);

  const [paramsOpen, setParamsOpen] = React.useState(false);
  const [countries, setCountries] = React.useState<string[]>(scope.countries);
  const [period, setPeriod] = React.useState(def?.defaultPeriod ?? 'This month');
  const [status, setStatus] = React.useState('All');
  const [commodity, setCommodity] = React.useState('All');
  const [contract, setContract] = React.useState('');
  const [location, setLocation] = React.useState('All');
  const [party, setParty] = React.useState('All');
  const [drill, setDrill] = React.useState<string | null>(null);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [viewName, setViewName] = React.useState('');
  const [showTable, setShowTable] = React.useState(false);

  const params: Record<string, string> = {
    Country: countries.join(','), Period: period, Status: status, Commodity: commodity,
    Contract: contract, Location: location, Party: party
  };

  const result = React.useMemo(
    () => (can.ok ? s.runReport(id, params) : null),
    // the run is deliberately re-executed when the parameters or the underlying data change
    [id, can.ok, countries.join(','), period, status, commodity, location, party,
      s.requests, s.masterRecords, s.documents, s.audit, s.incidents, s.deliveries, s.stepConfigs]
  );

  if (!def) {
    return (
      <>
        <PageBanner title="Report" breadcrumb={['Global', 'C11 Reporting and Dashboards', 'Report']} />
        <Box sx={{ p: 3 }}><EmptyState message="That report is not in the catalogue." /></Box>
      </>
    );
  }

  if (!can.ok) {
    return (
      <>
        <PageBanner
          title={`${def.id} — ${def.name}`}
          breadcrumb={['Global', 'C11 Reporting and Dashboards', 'Reports', def.id]}
          actions={<WhiteButton onClick={() => navigate('/c11/reports')}>Back to the catalogue</WhiteButton>}
        />
        <Box sx={{ p: 3 }}>
          <Alert severity="error" sx={{ fontSize: 13 }}>
            <b>You do not hold the permission for this report.</b> {can.why}
          </Alert>
          <Typography sx={{ fontSize: 12.5, mt: 2, color: tokens.textSecondary }}>
            The report is shown in the catalogue rather than hidden, and the refusal names the permission and who grants
            it — the pattern C08 established for the audit search.
          </Typography>
          <ShellFooterNote />
        </Box>
      </>
    );
  }

  const facts = drill ? (result?.facts ?? []).filter((f) => f.dim === drill) : [];

  return (
    <>
      <PageBanner
        title={`${def.id} — ${def.name}`}
        breadcrumb={['Global', 'C11 Reporting and Dashboards', 'Reports', def.id]}
        subtitle={def.question}
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => setParamsOpen(true)}>Parameters</WhiteButton>
            <WhiteButton onClick={() => setSaveOpen(true)}>Save this view</WhiteButton>
            <WhiteButton onClick={() => setExportOpen(true)}>Export</WhiteButton>
            <WhiteButton onClick={() => navigate('/c11/reports')}>Catalogue</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        {def.inheritedFrom && (
          <HandOffBanner
            label="CONTINUE"
            target={`${def.inheritedFrom.module} — the screen that held this place`}
            passed={def.inheritedFrom.note}
            to={def.inheritedFrom.route}
            goLabel={`Open the ${def.inheritedFrom.module} screen`}
          />
        )}

        {/* Step 5 — the parameter stamp, first on the screen and included in every export */}
        <Paper variant="outlined" sx={{ mb: 2, borderLeft: `4px solid ${tokens.primary}` }}>
          <SectionBand>Parameters used — WF-C11-01 / Step 5</SectionBand>
          <FieldGrid items={[
            ['Report', result?.stamp.report ?? '—'],
            ['Run at', result?.stamp.runAt ?? '—'],
            ['Run by', `${result?.stamp.by} acting as ${result?.stamp.role}`],
            ['Country', result?.stamp.countries ?? '—'],
            ['Source', `${result?.stamp.source}${result?.stamp.refreshedAt ? ` · last refreshed ${result.stamp.refreshedAt}` : ''}`],
            ...(result?.stamp.params ?? []).map((x) => ['Parameter', x] as [string, React.ReactNode])
          ]} columns={2} />
          <Box sx={{ px: 2, pb: 1.5 }}>
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
              The stamp is the first thing on the screen and travels into every export, so that any printed or exported
              copy is self-describing. A figure separated from its parameters is a rumour.
            </Typography>
          </Box>
        </Paper>

        {/* Step 4 — row-level security, stated */}
        <Alert severity={result?.security.kind === 'External' ? 'warning' : 'info'} sx={{ mb: 2, fontSize: 12.5 }}>
          <b>Row-level security applied before retrieval — Step 4.</b> {result?.security.statement}
        </Alert>

        {/* Steps 5–6 — the figures, each drillable */}
        {result?.empty ? (
          <Paper variant="outlined" sx={{ mb: 2, p: 3 }}>
            <EmptyState
              message="The report ran and returned nothing within your scope."
              hint={result.emptyReason}
            />
          </Paper>
        ) : (
          <ChartFrame
            title={`${def.name} by ${def.dimension.toLowerCase()} — ${result?.total} row${result?.total === 1 ? '' : 's'}`}
            note="Horizontal bars, because the labels are phrase-length. Every bar drills to the underlying list, and from the list to the individual record — Step 6."
            tableToggle={
              <Button size="small" sx={{ mt: 1 }} onClick={() => setShowTable((v) => !v)}>
                {showTable ? 'Hide table' : 'Show as table'}
              </Button>
            }
          >
            <HBar rows={result?.rows ?? []} attentionNote="Needs attention" />
            {showTable && (
              <Box sx={{ mt: 2 }}>
                <DataTableView
                  head={[def.dimension, 'Rows']}
                  rows={(result?.rows ?? []).map((r) => [r.label, r.value])}
                />
              </Box>
            )}
          </ChartFrame>
        )}

        {/* the drill-through list */}
        {!result?.empty && (
          <Paper variant="outlined" sx={{ mb: 2 }}>
            <SectionBand>Drill-through — Step 6</SectionBand>
            <Box sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, mb: 1.5 }}>
                {(result?.rows ?? []).map((r) => (
                  <Chip
                    key={r.label}
                    label={`${r.label} (${r.value})`}
                    variant={drill === r.label ? 'filled' : 'outlined'}
                    color={drill === r.label ? 'primary' : 'default'}
                    onClick={() => setDrill(drill === r.label ? null : r.label)}
                    sx={{ fontSize: 12 }}
                  />
                ))}
              </Stack>
              {!drill ? (
                <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
                  Select a figure above to open the rows behind it. A number that cannot be explained is a number nobody
                  trusts, so every figure in this module opens the records it was computed from.
                </Typography>
              ) : (
                <>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: 12 }}>Reference</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{def.dimension}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>Country</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>Detail</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>Record</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {facts.map((f) => (
                        <TableRow key={f.ref} hover>
                          <TableCell sx={{ fontSize: 12.5, fontFamily: 'monospace' }}>{f.ref}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{f.dim}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{f.country}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{f.detail}</TableCell>
                          <TableCell>
                            <Button size="small" onClick={() => navigate(f.route)}>Open the record</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Button size="small" sx={{ mt: 1 }} onClick={() => navigate(def.drillTo)}>
                    Open the full {def.module} list
                  </Button>
                </>
              )}
            </Box>
          </Paper>
        )}

        {/* Step 9 — the execution log entry this run wrote */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Execution log — WF-C11-01 / Step 9</SectionBand>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12.5 }}>
              This run wrote log entry <b>{result?.logRef}</b> in C09, recording the report, the parameters, the row count
              and the rows withheld by row-level security.{' '}
              {def.heavy && <>Because this report is <b>heavy</b>, it was served from the reporting store rather than the
                transactional store, so a long query cannot degrade operational performance.</>}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary, mt: 1 }}>
              Whether that entry is <i>retained</i> is a C09 decision, not a C11 one: the Web application writes it at
              Information, and production is configured at Warning, so it is suppressed there and visible in development.
              C09 / WF-C9-01 / Step 1 — the level decides what is kept, not what the application produces.
            </Typography>
            <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/c9/levels')}>Open the technical log</Button>
            <PlaceholderNote>{s.reportNotes.latency}</PlaceholderNote>
          </Box>
        </Paper>

        <HandOffBanner
          label="DEPENDENCY"
          target="C1 / WF-C1-03 Role, Permission and Access Scope Management"
          passed="Row-level security is applied from role and country scope, with the external record-level filter for external users — and regional scope decides whether the country parameter may be widened"
          to="/c1/effective-permissions"
          goLabel="Open the effective permission viewer"
        />
        <ShellFooterNote />
      </Box>

      {/* 1.2 Parameter panel */}
      <Drawer anchor="right" open={paramsOpen} onClose={() => setParamsOpen(false)} PaperProps={{ sx: { width: 520 } }}>
        <Box sx={{ bgcolor: tokens.primaryDark, color: '#fff', px: 2.5, py: 2 }}>
          <Typography sx={{ fontSize: 12, opacity: 0.85 }}>Parameters — WF-C11-01 / Steps 2–3</Typography>
          <Typography variant="h6">{def.id} {def.name}</Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          {/* Step 2 — the country parameter is where permission becomes visible */}
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: scope.regional ? '#F2F8FD' : '#FFF6E5' }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.5 }}>
              Country — {scope.regional ? 'may be widened' : 'locked'}
            </Typography>
            <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mb: 1 }}>{scope.statement}</Typography>
            {scope.regional ? (
              <FormControl size="small" fullWidth>
                <InputLabel>Countries</InputLabel>
                <Select
                  multiple label="Countries" value={countries} input={<OutlinedInput label="Countries" />}
                  inputProps={{ 'aria-label': 'Countries' }}
                  renderValue={(v) => (v as string[]).join(', ')}
                  onChange={(e) => setCountries(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
                >
                  {scope.countries.map((c) => <MenuItem key={c} value={c} sx={{ fontSize: 13 }}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            ) : (
              <Chip label={scope.countries[0] ?? '—'} sx={{ fontSize: 12 }} />
            )}
            {scope.regional && countries.length > 1 && (
              <Typography sx={{ fontSize: 11.5, color: tokens.primary, mt: 1 }}>
                Several countries selected — permitted <b>for consolidated reporting only</b>, and the output labels
                itself consolidated.
              </Typography>
            )}
          </Paper>
          <PlaceholderNote>{s.reportNotes.consolidated}</PlaceholderNote>

          <Stack spacing={2} sx={{ mt: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Period</InputLabel>
              <Select label="Period" value={period} inputProps={{ 'aria-label': 'Period' }}
                      onChange={(e) => setPeriod(e.target.value)}>
                {PERIOD_PRESETS.map((x) => <MenuItem key={x} value={x} sx={{ fontSize: 13 }}>{x}</MenuItem>)}
              </Select>
            </FormControl>
            {def.params.includes('Status') && (
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={status} inputProps={{ 'aria-label': 'Status' }}
                        onChange={(e) => setStatus(e.target.value)}>
                  {['All', 'Pending Approval', 'Draft', 'Active', 'Sensitive only'].map((x) => (
                    <MenuItem key={x} value={x} sx={{ fontSize: 13 }}>{x}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {def.params.includes('Commodity') && (
              <FormControl size="small" fullWidth>
                <InputLabel>Commodity</InputLabel>
                <Select label="Commodity" value={commodity} onChange={(e) => setCommodity(e.target.value)}>
                  {['All', ...s.masterRecords.filter((r) => r.domain === 'commodity').map((r) => r.name)]
                    .map((x) => <MenuItem key={x} value={x} sx={{ fontSize: 13 }}>{x}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            {def.params.includes('Location') && (
              <FormControl size="small" fullWidth>
                <InputLabel>Location</InputLabel>
                <Select label="Location" value={location} onChange={(e) => setLocation(e.target.value)}>
                  {['All', ...s.masterRecords.filter((r) => ['warehouse', 'facility', 'port'].includes(r.domain)).map((r) => r.name)]
                    .map((x) => <MenuItem key={x} value={x} sx={{ fontSize: 13 }}>{x}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            {def.params.includes('Party') && (
              <FormControl size="small" fullWidth>
                <InputLabel>Party</InputLabel>
                <Select label="Party" value={party} onChange={(e) => setParty(e.target.value)}>
                  {['All', ...s.masterRecords.filter((r) => ['supplier', 'buyer', 'transporter'].includes(r.domain)).map((r) => r.name)]
                    .map((x) => <MenuItem key={x} value={x} sx={{ fontSize: 13 }}>{x}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            {def.params.includes('Contract') && (
              <>
                <TextField size="small" label="Contract reference" value={contract}
                           onChange={(e) => setContract(e.target.value)} />
                <PlaceholderNote>{s.reportNotes.contract}</PlaceholderNote>
              </>
            )}
          </Stack>
          <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary, mt: 2 }}>
            The defaults are those appropriate to this report: <b>{def.defaultPeriod}</b> for the period, and the country
            set from your access scope. Parameters this report does not accept are not shown, rather than shown and
            ignored.
          </Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => setParamsOpen(false)}>Apply</Button>
        </Box>
      </Drawer>

      {/* 1.4 Export */}
      <ExportDialog
        open={exportOpen} onClose={() => setExportOpen(false)} reportId={def.id}
        rows={result?.total ?? 0} params={params}
      />

      {/* Step 8 — save the parameter set */}
      <Dialog open={saveOpen} onClose={() => setSaveOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 18 }}>Save this parameter set</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, mb: 2 }}>
            A saved view retains the parameters, not the data. Running it later applies your row-level security again, so
            the numbers are current and are yours — WF-C11-01 / Step 8.
          </Typography>
          <TextField size="small" fullWidth label="View name" value={viewName}
                     onChange={(e) => setViewName(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => setSaveOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!viewName.trim()}
                  onClick={() => { s.saveView(viewName.trim(), def.id, params); setSaveOpen(false); setViewName(''); navigate('/c11/views'); }}>
            Save as a personal view
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

/** 1.4 Export — WF-C11-01 / Step 7 */
const ExportDialog: React.FC<{
  open: boolean; onClose: () => void; reportId: string; rows: number; params: Record<string, string>;
}> = ({ open, onClose, reportId, rows, params }) => {
  const s = useStore();
  const [layout, setLayout] = React.useState<ExportLayout>('Excel');
  const [templateId, setTemplateId] = React.useState(s.mandatedTemplates[0].id);
  const [error, setError] = React.useState<string | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [proposed, setProposed] = React.useState('');
  const [reason, setReason] = React.useState('');
  const tpl = s.mandatedTemplates.find((t) => t.id === templateId);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: 18 }}>Export {reportId}</DialogTitle>
        <DialogContent>
          <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel>Layout</InputLabel>
              <Select label="Layout" value={layout} inputProps={{ 'aria-label': 'Layout' }}
                      onChange={(e) => setLayout(e.target.value as ExportLayout)}>
                {EXPORT_LAYOUTS.map((x) => <MenuItem key={x} value={x} sx={{ fontSize: 13 }}>{x}</MenuItem>)}
              </Select>
            </FormControl>
            {layout === 'Mandated external template' && (
              <FormControl size="small" sx={{ minWidth: 380 }}>
                <InputLabel>Template</InputLabel>
                <Select label="Template" value={templateId} inputProps={{ 'aria-label': 'Template' }}
                        onChange={(e) => setTemplateId(e.target.value)}>
                  {s.mandatedTemplates.map((t) => <MenuItem key={t.id} value={t.id} sx={{ fontSize: 13 }}>{t.name}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            <FormControlLabel
              control={<Switch size="small" checked disabled />}
              label={<Typography sx={{ fontSize: 12.5 }}>Include the parameter stamp — locked on</Typography>}
            />
          </Stack>
          <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mb: 2 }}>
            The stamp is locked on because Step 5 requires the export to be self-describing. <b>{rows}</b> row
            {rows === 1 ? '' : 's'} will be exported — the count after row-level security, so an export can never be
            larger than what was shown.
          </Typography>

          {layout === 'Mandated external template' && tpl && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.5 }}>
                {tpl.name} — mandated by {tpl.mandatedBy}
              </Typography>
              <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mb: 1 }}>
                The export follows this template exactly and is <b>not adjustable at export time</b>. If the layout is
                wrong, the template is changed — and a template is configuration.
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {tpl.columns.map((c) => <TableCell key={c} sx={{ fontSize: 11.5 }}>{c}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    {tpl.columns.map((c) => <TableCell key={c} sx={{ fontSize: 11.5, color: tokens.textSecondary }}>…</TableCell>)}
                  </TableRow>
                </TableBody>
              </Table>
              <PlaceholderNote>{s.reportNotes.template}</PlaceholderNote>
              <Button size="small" sx={{ mt: 1 }} onClick={() => { setProposed(tpl.columns.join(', ')); setEditOpen(true); }}>
                Change this template
              </Button>
            </Paper>
          )}
          {error && <Alert severity="error" sx={{ mt: 2, fontSize: 12.5 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={() => {
            const r = s.exportReport(reportId, layout, layout === 'Mandated external template' ? templateId : undefined, rows, params);
            if (!r.ok) { setError(r.why ?? null); return; }
            setError(null); onClose();
          }}>
            Produce the export
          </Button>
        </DialogActions>
      </Dialog>

      {/* DEPENDENCY → C10 / WF-C10-03 — a template change is a configuration change */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 18 }}>Change the mandated template</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ fontSize: 12.5, mb: 2 }}>
            An export template where an external layout is mandated is <b>configuration</b>, so it changes through
            C10 / WF-C10-03 with a business reason and an effective date — not here.
          </Alert>
          <Stack spacing={2}>
            <TextField size="small" label="Proposed columns" value={proposed} multiline minRows={2}
                       onChange={(e) => setProposed(e.target.value)} />
            <TextField size="small" label="Business reason" value={reason} multiline minRows={2}
                       onChange={(e) => setReason(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!reason.trim()}
                  onClick={() => { s.requestTemplateChange(templateId, proposed, reason.trim()); setEditOpen(false); }}>
            Raise the change request
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

/** 1.5 Saved Views — WF-C11-01 / Step 8 */
export const SavedViews: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [role, setRole] = React.useState(PUBLISH_ROLES[0]);
  const [error, setError] = React.useState<string | null>(null);
  const mine = s.viewsFor();

  return (
    <>
      <PageBanner
        title="Saved views"
        breadcrumb={['Global', 'C11 Reporting and Dashboards', 'Saved views']}
        subtitle="WF-C11-01 / Step 8 — a personal view for the user alone, or a shared view published for a role"
        actions={<WhiteButton onClick={() => navigate('/c11/reports')}>Reports</WhiteButton>}
      />
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
          <b>A shared view shares the parameters, never the data.</b> Every holder of the role sees the view, but running
          it applies the runner's own row-level security — so two holders of the same role in different countries see
          different numbers from the same shared view. That is the point worth testing.
        </Alert>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>{`Views available to you — ${mine.length}`}</SectionBand>
          {mine.length === 0 ? <EmptyState message="No view is saved for you or published to your roles." /> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>View</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Report</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Parameters</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Visibility</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Published for</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Owner</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mine.map((v) => (
                  <TableRow key={v.id} hover>
                    <TableCell sx={{ fontSize: 12.5 }}>{v.name}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{v.report} {reportDef(v.report)?.name}</TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>
                      {Object.entries(v.params).filter(([, x]) => x && x !== 'All').map(([k, x]) => `${k}: ${x}`).join(' · ') || 'defaults'}
                    </TableCell>
                    <TableCell><StatusChip status={v.visibility === 'Shared' ? 'Active' : 'Draft'} /></TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {v.publishedForRole ? v.publishedForRole.replace(/_/g, ' ').toLowerCase() : '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{v.owner}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Button size="small" onClick={() => navigate(`/c11/reports/${v.report}`)}>Run</Button>
                        {v.visibility === 'Personal'
                          ? (
                            <Button size="small" onClick={() => {
                              const r = s.publishView(v.id, role);
                              setError(r.ok ? null : (r.why ?? null));
                            }}>
                              Publish
                            </Button>
                          )
                          : <Button size="small" onClick={() => s.unpublishView(v.id)}>Unpublish</Button>}
                        <Button size="small" color="warning" onClick={() => s.deleteView(v.id)}>Delete</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              <FormControl size="small" sx={{ minWidth: 260 }}>
                <InputLabel>Publish to role</InputLabel>
                <Select label="Publish to role" value={role} inputProps={{ 'aria-label': 'Publish to role' }}
                        onChange={(e) => setRole(e.target.value)}>
                  {PUBLISH_ROLES.map((r) => <MenuItem key={r} value={r} sx={{ fontSize: 13 }}>{r.replace(/_/g, ' ').toLowerCase()}</MenuItem>)}
                </Select>
              </FormControl>
              <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
                {s.canPublish()
                  ? 'You hold the publish permission.'
                  : 'You do not hold the publish permission — the Publish action states which role is required and who grants it.'}
              </Typography>
            </Stack>
            {error && <Alert severity="error" sx={{ mt: 2, fontSize: 12.5 }}>{error}</Alert>}
          </Box>
        </Paper>

        <ShellFooterNote />
      </Box>
    </>
  );
};
