import React from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  Drawer, FormControl, FormControlLabel, Grid, InputLabel, List, ListItem, ListItemText, MenuItem,
  OutlinedInput, Paper, Select, Stack, Switch, Table, TableBody, TableCell, TableRow, TextField, Typography
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  EmptyState, HandOffBanner, PageBanner, PlaceholderNote, SectionBand, StatusChip, WhiteButton
} from '../../components/shared';
import { DataTable, Column } from '../../components/DataTable';
import { KpiTile } from '../../components/Charts';
import { ACTION_TYPES, AUDIT_PERMISSION_ROLES } from '../../mockData/c8';
import { AuditRec, COUNTRIES } from '../../mockData';
import { ShellFooterNote } from '../../layouts/AppShell';

const roleLabel = (r: string) => r.replace(/_/g, ' ').toLowerCase();

/** 2.3 Audit Entry Detail — WF-C8-02 / Step 4 */
export const AuditEntryDetail: React.FC<{ entry: AuditRec | null; onClose: () => void }> = ({ entry, onClose }) => {
  const s = useStore();
  const navigate = useNavigate();
  if (!entry) return <Drawer anchor="right" open={false} onClose={onClose} />;
  const level = s.auditLevelOf(entry.entity);

  const block = (title: string, rows: [string, React.ReactNode][]) => (
    <Paper variant="outlined" sx={{ mb: 2 }}>
      <SectionBand>{title}</SectionBand>
      <Table size="small">
        <TableBody>
          {rows.map(([k, v]) => (
            <TableRow key={k}>
              <TableCell sx={{ fontSize: 12.5, color: tokens.textSecondary, width: 180 }}>{k}</TableCell>
              <TableCell sx={{ fontSize: 12.5 }}>{v}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );

  return (
    <Drawer anchor="right" open={!!entry} onClose={onClose} PaperProps={{ sx: { width: 660 } }}>
      <Box sx={{ bgcolor: tokens.primary, color: '#fff', px: 2, py: 1.5 }}>
        <Typography variant="h6" sx={{ fontSize: 16 }}>Audit entry {entry.id}</Typography>
        <Typography sx={{ fontSize: 12, opacity: 0.85 }}>{entry.at} · {entry.entity} · {entry.record}</Typography>
      </Box>
      <Box sx={{ p: 2 }}>
        {block('What changed', [
          ['Action', entry.action],
          ['Entity', entry.entity],
          ['Record', entry.record],
          ['Field', entry.field ?? '—'],
          ['Previous value', entry.oldValue ?? '—'],
          ['New value', entry.newValue ?? '—'],
          ['Reason', entry.reason ?? '—'],
          ['Audit level applied', entry.levelApplied ?? level?.level ?? '—']
        ])}
        {!entry.field && (
          <Alert severity="info" sx={{ fontSize: 12.5, mb: 2 }}>
            No field detail is held on this entry because <b>{entry.levelApplied ?? level?.level}</b> audit is
            configured for {entry.entity} — WF-C8-01 / Step 4. The action itself is still recorded.
          </Alert>
        )}
        {block('Who acted, and under which authority', [
          ['User', entry.user],
          ['Acting as role', entry.role === '—' ? 'Service identity' : roleLabel(entry.role)],
          ['Active country context', entry.country]
        ])}
        {block('Where the action came from', [
          ['Source', entry.source],
          ['Originating system', entry.originatingSystem ?? (entry.source === 'Integration' ? 'Not named' : '—')],
          ['Sensitive class', entry.sensitiveClass ?? (entry.sensitive ? 'Flagged, class not named' : '—')]
        ])}
        {block('Technical context — WF-C8-01 / Step 5', [
          ['Session', entry.session ?? '—'],
          ['Address', entry.address ?? '—'],
          ['Device', entry.device ?? '—']
        ])}
        <Alert severity="warning" sx={{ fontSize: 12.5, mb: 2 }}>
          This entry was written in the same action as the change. It <b>cannot be edited or deleted from within the
          application by any role</b>, including an administrator — WF-C8-01 / Step 7. Retention archives and trims;
          it never edits.
        </Alert>
        <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
          Retention state: {s.retentionStateOf(entry)}
          {entry.archived ? ' — retrievable through the audit search, though retrieval may be slower.' : '.'}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button size="small" variant="outlined" onClick={() => { onClose(); navigate('/c8/monitor'); }}>Sensitive action monitor</Button>
          <Button size="small" onClick={onClose}>Close</Button>
        </Stack>
      </Box>
    </Drawer>
  );
};

/** 2.2 Audit Search + 2.4 Audit Access Denied — WF-C8-02 / Steps 3–5 */
export const AuditSearch: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const permitted = s.hasAuditPermission();

  const [user, setUser] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [entities, setEntities] = React.useState<string[]>([]);
  const [countries, setCountries] = React.useState<string[]>([]);
  const [actions, setActions] = React.useState<string[]>([]);
  const [record, setRecord] = React.useState('');
  const [sensitiveOnly, setSensitiveOnly] = React.useState(false);
  const [sources, setSources] = React.useState<string[]>([]);
  const [results, setResults] = React.useState<AuditRec[] | null>(null);
  const [detail, setDetail] = React.useState<AuditRec | null>(null);
  const [denied, setDenied] = React.useState(!permitted);

  const describe = () => {
    const bits: string[] = [];
    if (user) bits.push(`user ${user}`);
    if (from || to) bits.push(`${from || 'any'} to ${to || 'any'}`);
    if (entities.length) bits.push(`entities ${entities.join('/')}`);
    if (countries.length) bits.push(`countries ${countries.join('/')}`);
    if (actions.length) bits.push(`actions ${actions.join('/')}`);
    if (record) bits.push(`record ${record}`);
    if (sensitiveOnly) bits.push('sensitive only');
    if (sources.length) bits.push(`source ${sources.join('/')}`);
    return bits.length ? bits.join(', ') : 'all entries in scope';
  };

  const run = () => {
    const res = s.searchAudit({ user, from, to, entities, countries, actions, record, sensitiveOnly, sources });
    setResults(res);
    s.logAuditQuery(describe(), res.length, 'Audit search');
  };

  const columns: Column<AuditRec>[] = [
    { key: 'at', label: 'When' },
    { key: 'user', label: 'User' },
    { key: 'role', label: 'Acting as', value: (a) => (a.role === '—' ? 'Service identity' : roleLabel(a.role)) },
    { key: 'country', label: 'Country' },
    { key: 'entity', label: 'Entity' },
    { key: 'record', label: 'Record' },
    {
      key: 'action', label: 'Action',
      render: (a) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <span style={{ fontSize: 12.5 }}>{a.action}</span>
          {a.sensitive && <LockOutlinedIcon sx={{ fontSize: 14, color: tokens.amber }} />}
        </Stack>
      )
    },
    { key: 'field', label: 'Field', value: (a) => a.field ?? '—' },
    { key: 'oldValue', label: 'From', value: (a) => a.oldValue ?? '—' },
    { key: 'newValue', label: 'To', value: (a) => a.newValue ?? '—' },
    { key: 'source', label: 'Source', value: (a) => (a.originatingSystem ? `${a.source} — ${a.originatingSystem}` : a.source) },
    { key: 'sensitiveClass', label: 'Sensitive class', value: (a) => a.sensitiveClass ?? '—' },
    {
      key: 'retention', label: 'Retention',
      value: (a) => s.retentionStateOf(a),
      render: (a) => {
        const st = s.retentionStateOf(a);
        return st === 'Within retention'
          ? <StatusChip status="Valid" />
          : <Chip size="small" variant="outlined" label={a.archived ? 'Archived' : 'Beyond retention'} sx={{ height: 19, fontSize: 10.5 }} />;
      }
    },
    { key: 'actions', label: '', render: (a) => <Button size="small" onClick={(e) => { e.stopPropagation(); setDetail(a); }}>Detail</Button> }
  ];

  const selfLogged = s.audit.filter((a) => a.entity === 'Audit trail');

  if (!permitted) {
    return (
      <>
        <PageBanner
          title="Audit search"
          breadcrumb={[s.activeCountry, 'C8 Audit Trail', 'Audit search']}
          subtitle="WF-C8-02 / Step 3 — cross-system audit search is permission-controlled"
        />
        <Box sx={{ p: 3 }}>
          <Alert severity="error" sx={{ fontSize: 13 }}>
            <b>Access refused.</b> The cross-system audit search requires audit permission, because audit data is
            sensitive in its own right — WF-C8-02 / Step 3. The permission is held by
            {' '}{AUDIT_PERMISSION_ROLES.map(roleLabel).join(' and ')}. The refused attempt has itself been logged.
          </Alert>
          <Paper variant="outlined" sx={{ mt: 2 }}>
            <SectionBand>What is still available to this account</SectionBand>
            <Box sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 13 }}>
                The <b>History tab of a record</b> is not gated this way: a user who may see the record may see its
                history. Only the cross-system search is restricted, and this screen deliberately does not reveal how
                many entries exist or what they contain.
              </Typography>
              <Button size="small" variant="outlined" sx={{ mt: 1.5 }} onClick={() => navigate('/c1/access-requests/AR-000141')}>
                Open a record and its History tab
              </Button>
            </Box>
          </Paper>
          <ShellFooterNote />
        </Box>
        <Dialog open={denied} onClose={() => setDenied(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontSize: 16 }}>Audit access denied</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ fontSize: 13 }}>
              Audit data is sensitive in its own right, so the cross-system search is available only to a user holding
              audit permission — {AUDIT_PERMISSION_ROLES.map(roleLabel).join(' or ')}. The attempt has been logged.
            </Alert>
          </DialogContent>
          <DialogActions><Button onClick={() => setDenied(false)}>Close</Button></DialogActions>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <PageBanner
        title="Audit search"
        breadcrumb={[s.activeCountry, 'C8 Audit Trail', 'Audit search']}
        subtitle="WF-C8-02 / Steps 4–5 — search across the system, export for investigation, and every query logged"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c8/monitor')}>Sensitive actions</WhiteButton>
            <WhiteButton onClick={() => navigate('/c8/configuration')}>Audit configuration</WhiteButton>
            <WhiteButton onClick={() => navigate('/c8/retention')}>Retention and volume</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2, fontSize: 13 }}>
          <b>Every audit query and export is itself logged</b> — WF-C8-02 / Step 5. Running the search below writes an
          entry recording who queried the audit trail and for what, and that entry appears in the next set of results.
        </Alert>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Search parameters</SectionBand>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField fullWidth size="small" label="User" value={user} onChange={(e) => setUser(e.target.value)}
                           placeholder="Named user, service or job identity" />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField fullWidth size="small" type="date" label="Date from" value={from}
                           onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField fullWidth size="small" type="date" label="Date to" value={to}
                           onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} md={5}>
                <FormControl fullWidth size="small">
                  <InputLabel>Entity class</InputLabel>
                  <Select multiple label="Entity class" value={entities} input={<OutlinedInput label="Entity class" />}
                          onChange={(e) => setEntities(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
                          renderValue={(v) => (v.length ? v.join(', ') : 'Any')}>
                    {s.auditLevels.map((l) => (
                      <MenuItem key={l.entity} value={l.entity}><Checkbox size="small" checked={entities.includes(l.entity)} />{l.entity}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Country</InputLabel>
                  <Select multiple label="Country" value={countries} input={<OutlinedInput label="Country" />}
                          onChange={(e) => setCountries(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
                          renderValue={(v) => (v.length ? v.join(', ') : 'Any in your scope')}>
                    {COUNTRIES.map((c) => (
                      <MenuItem key={c} value={c}><Checkbox size="small" checked={countries.includes(c)} />{c}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Action type</InputLabel>
                  <Select multiple label="Action type" value={actions} input={<OutlinedInput label="Action type" />}
                          onChange={(e) => setActions(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
                          renderValue={(v) => (v.length ? v.join(', ') : 'Any')}>
                    {ACTION_TYPES.map((a) => (
                      <MenuItem key={a} value={a}><Checkbox size="small" checked={actions.includes(a)} />{a}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth size="small" label="Record" value={record} onChange={(e) => setRecord(e.target.value)}
                           placeholder="Exact or partial reference" />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Source</InputLabel>
                  <Select multiple label="Source" value={sources} input={<OutlinedInput label="Source" />}
                          onChange={(e) => setSources(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
                          renderValue={(v) => (v.length ? v.join(', ') : 'Any')}>
                    {['User interface', 'Integration', 'Scheduled job'].map((x) => (
                      <MenuItem key={x} value={x}><Checkbox size="small" checked={sources.includes(x)} />{x}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={<Switch size="small" checked={sensitiveOnly} onChange={(e) => setSensitiveOnly(e.target.checked)} />}
                  label={<Typography sx={{ fontSize: 13 }}>Sensitive actions only</Typography>}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" size="small" onClick={run}>Search</Button>
                  <Button variant="outlined" size="small" disabled={!results?.length}
                          onClick={() => {
                            if (!results) return;
                            s.logAuditQuery(describe(), results.length, 'Audit export');
                            s.setToast({
                              message: `Export of ${results.length} entries prepared for investigation or external audit. The export is itself logged — WF-C8-02 / Step 5 — and is available as a standard report through C11.`,
                              severity: 'success'
                            });
                          }}>
                    Export for investigation
                  </Button>
                </Stack>
              </Grid>
            </Grid>
            <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mt: 1 }}>
              Results are limited to your country scope ({(s.currentUser?.countryScope ?? []).join(', ') || 'none'});
              entries with a global context are always in scope.
            </Typography>
          </Box>
        </Paper>

        {results === null ? (
          <EmptyState message="Set your parameters and run the search" hint="Leaving everything blank returns every entry in your scope." />
        ) : (
          <>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6} md={3}><KpiTile value={results.length} label="Entries returned" /></Grid>
              <Grid item xs={12} sm={6} md={3}><KpiTile value={results.filter((a) => a.sensitive).length} label="Sensitive actions" tone="attention" /></Grid>
              <Grid item xs={12} sm={6} md={3}><KpiTile value={results.filter((a) => a.source !== 'User interface').length} label="From integration or a job" /></Grid>
              <Grid item xs={12} sm={6} md={3}><KpiTile value={results.filter((a) => a.archived).length} label="Archived, still retrievable" /></Grid>
            </Grid>
            <DataTable
              columns={columns} rows={results} groupable
              onRowClick={(a) => setDetail(a)}
              emptyMessage="No entries match those parameters"
              searchPlaceholder="Filter these results"
            />
          </>
        )}

        <Paper variant="outlined" sx={{ mt: 2 }}>
          <SectionBand>The audit trail's record of audit access — WF-C8-02 / Step 5</SectionBand>
          {selfLogged.length === 0 ? (
            <EmptyState message="No audit query has been made in this session yet" />
          ) : (
            <List dense disablePadding>
              {selfLogged.slice(0, 10).map((a) => (
                <ListItem key={a.id} divider>
                  <ListItemText
                    primaryTypographyProps={{ fontSize: 13 }}
                    secondaryTypographyProps={{ fontSize: 11.5 }}
                    primary={a.action}
                    secondary={`${a.at} · ${a.user} acting as ${roleLabel(a.role)} · parameters: ${a.record}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
          <Box sx={{ p: 2 }}>
            <Stack spacing={1}>
              <HandOffBanner target="C11 / WF-C11-01 Running a Report" passed="Audit extracts, as a standard report rather than a special exercise" />
              <HandOffBanner label="DEPENDENCY" target="C1 / WF-C1-03 Role, Permission and Access Scope Management" passed="The user and the audit permission" returned="Whether the cross-system search may be opened" />
            </Stack>
            <PlaceholderNote>
              Business confirmation required: whether view and export of sensitive data must be logged as well as
              changes (WF-C8-01 / Step 7). It is recommended, and the storage and performance cost should be accepted
              deliberately. C07 already logs sensitive document access; the switch per entity class is on the audit
              configuration screen.
            </PlaceholderNote>
          </Box>
        </Paper>

        <ShellFooterNote />
      </Box>

      <AuditEntryDetail entry={detail} onClose={() => setDetail(null)} />
    </>
  );
};
