import React from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControl, FormControlLabel, Grid, IconButton, InputLabel, List, ListItem, ListItemText, MenuItem,
  OutlinedInput, Paper, Radio, RadioGroup, Select, Stack, Switch, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  ActionBar, EmptyState, FormSectionCard, HandOffBanner, PageBanner, PlaceholderNote,
  SectionBand, StatusChip, WhiteButton
} from '../../components/shared';
import { DataTable, Column } from '../../components/DataTable';
import {
  APPROVER_REGISTER, OBJECT_TYPES, ParallelRule, RouteDef, RouteStep, RouteVersion,
  effectiveVersion, groupSteps, resolveRoute, slaLabel
} from '../../mockData/c4';
import { ShellFooterNote } from '../../layouts/AppShell';

const COUNTRIES = ['Sudan', 'Ethiopia', 'Tanzania', 'Mozambique'];
const ORG_UNITS = ['Sourcing', 'Execution', 'Processing', 'Quality', 'Country Management', 'Group Finance'];
const COMMODITIES = ['Sesame — Hulled White', 'Sesame — Natural', 'Groundnut', 'Gum Arabic'];
const ROLES = [...new Set(APPROVER_REGISTER.map((e) => e.role))];
const CHANNELS = ['In-app', 'Email', 'SMS', 'Messaging'];
const RULES: ParallelRule[] = ['All required', 'Any one', 'Quorum 2 of 3'];

const roleLabel = (r: string) => r.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());

const conditionText = (r: RouteDef) => {
  const bits: string[] = [];
  bits.push(r.countries.length ? r.countries.join(', ') : 'every country');
  if (r.commodities.length) bits.push(r.commodities.join(', '));
  if (r.orgUnits.length) bits.push(r.orgUnits.join(', '));
  if (r.thresholdMeasure) {
    bits.push(r.thresholdTo === undefined
      ? `${r.thresholdMeasure} at or above ${r.thresholdFrom?.toLocaleString()} ${r.thresholdUnit}`
      : `${r.thresholdMeasure} below ${r.thresholdTo.toLocaleString()} ${r.thresholdUnit}`);
  }
  return bits.join(' · ');
};

/* ------------------------------------------------------------------ *
 * 3.1 Route List + 3.4 Route Simulation — WF-C4-03
 * ------------------------------------------------------------------ */

export const RouteList: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [sim, setSim] = React.useState(false);
  const [simObject, setSimObject] = React.useState(OBJECT_TYPES[0]);
  const [simCountry, setSimCountry] = React.useState('Sudan');
  const [simUnit, setSimUnit] = React.useState('');
  const [simValue, setSimValue] = React.useState('');

  interface Row extends RouteDef { rowId: string; version: RouteVersion }
  const rows: Row[] = s.routes.flatMap((r) => r.versions.map((v) => ({ ...r, rowId: `${r.id}-v${v.version}`, version: v, id: r.id })));

  const columns: Column<Row>[] = [
    { key: 'id', label: 'Route', render: (r) => <Typography sx={{ fontSize: 13, color: tokens.primary, fontWeight: 500 }}>{r.id}</Typography> },
    { key: 'objectType', label: 'Object type' },
    { key: 'conditions', label: 'Conditions', value: conditionText },
    { key: 'version', label: 'Version', value: (r) => String(r.version.version) },
    { key: 'from', label: 'Effective from', value: (r) => r.version.effectiveFrom },
    { key: 'to', label: 'Effective to', value: (r) => r.version.effectiveTo ?? 'open' },
    {
      key: 'steps', label: 'Steps',
      value: (r) => groupSteps(r.version.steps).map((g) => (g.type === 'Parallel'
        ? `${g.members.map((m) => roleLabel(m.role)).join(' / ')} (${g.rule?.toLowerCase()})`
        : roleLabel(g.members[0].role))).join(' → ')
    },
    { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.version.status} /> },
    {
      key: 'inflight', label: 'Requests in flight on this version',
      value: (r) => String(s.inFlightOn(r.id, r.version.version).length)
    },
    {
      key: 'actions', label: '',
      render: (r) => <Button size="small" onClick={(e) => { e.stopPropagation(); navigate(`/c4/routes/${r.id}`); }}>Open</Button>
    }
  ];

  const res = resolveRoute(s.routes, {
    objectType: simObject,
    country: simCountry || undefined,
    orgUnit: simUnit || undefined,
    thresholdValue: simValue ? Number(simValue) : undefined
  });

  return (
    <>
      <PageBanner
        title="Approval routes"
        breadcrumb={['Global', 'C4 Approval Workflow', 'Approval routes']}
        subtitle="WF-C4-03 Approval Route Configuration — object type, conditions, steps, exception rules, versions"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => setSim(true)}>Simulate a route</WhiteButton>
            <WhiteButton onClick={() => navigate('/c4/routes/new')}>New route</WhiteButton>
            <WhiteButton onClick={() => navigate('/c4/approvals')}>My approvals</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <DataTable
          columns={columns} rows={rows as any} groupable
          onRowClick={(r: any) => navigate(`/c4/routes/${r.id}`)}
          emptyMessage="No approval routes are configured"
          searchPlaceholder="Search routes"
        />

        <Paper variant="outlined" sx={{ mt: 2 }}>
          <SectionBand>Why the last column matters</SectionBand>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 13 }}>
              Superseding a route does not disturb work already under way. New requests are submitted on the current
              effective version; requests in flight continue on the version under which they were submitted. A superseded
              version with requests still in flight cannot be deleted.
            </Typography>
            <PlaceholderNote>
              Business confirmation required: the definitive list of object types requiring approval, to be completed as
              each module's processes are finalised (WF-C4-03 / Step 1). Nine object types are configured here.
            </PlaceholderNote>
            <HandOffBanner
              label="DEPENDENCY"
              target="C10 / WF-C10-02 Business Rules, Formulas and Localisation"
              passed="The approval value bands that select between these routes are configuration and are consumed here at runtime — change a band in C10 and the route that resolves changes with it"
              to="/c10/thresholds"
              goLabel="Open the value bands"
            />
          </Box>
        </Paper>

        <ShellFooterNote />
      </Box>

      {/* 3.4 Route Simulation */}
      <Dialog open={sim} onClose={() => setSim(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Simulate a route</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, mb: 2 }}>
            The route that <i>would</i> apply, resolved from the same configuration the live process uses. Where a change
            alters a route or a mandatory step, this is what the administrator is required to see before activation —
            WF-C4-03 / Step 5 and C10 / WF-C10-03 / Step 3.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Object type</InputLabel>
                <Select label="Object type" value={simObject} onChange={(e) => setSimObject(e.target.value)}>
                  {OBJECT_TYPES.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Country</InputLabel>
                <Select label="Country" value={simCountry} onChange={(e) => setSimCountry(e.target.value)}>
                  {COUNTRIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Organisational unit</InputLabel>
                <Select label="Organisational unit" value={simUnit} onChange={(e) => setSimUnit(e.target.value)}>
                  <MenuItem value="">Not specified</MenuItem>
                  {ORG_UNITS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth size="small" label="Threshold value" value={simValue}
                onChange={(e) => setSimValue(e.target.value.replace(/[^0-9.]/g, ''))}
                helperText="Value or volume, where the object type is banded"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />
          <Typography sx={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, color: tokens.textSecondary, mb: 0.75 }}>
            Resolution
          </Typography>
          <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.75, mb: 2 }}>
            {res.reasons.map((r) => <Chip key={r} size="small" variant="outlined" label={r} sx={{ height: 21, fontSize: 11 }} />)}
          </Stack>

          {!res.version ? (
            <Alert severity="warning" sx={{ fontSize: 13 }}>
              No effective route resolves for this combination. A submission of this object type would be refused until a
              route is configured and approved.
            </Alert>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Step</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Approver role</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Type</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Would resolve to</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Service level</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupSteps(res.version.steps).map((g) => g.members.map((m, mi) => {
                  const r = s.resolveApprover(m.role, simCountry);
                  return (
                    <TableRow key={`${g.seq}-${m.role}-${mi}`}>
                      <TableCell sx={{ fontSize: 12.5 }}>{g.seq}</TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{roleLabel(m.role)}</TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{g.type === 'Parallel' ? `Parallel — ${g.rule?.toLowerCase()}` : 'Sequential'}</TableCell>
                      <TableCell sx={{ fontSize: 12.5, color: r.approver ? tokens.textPrimary : tokens.red }}>
                        {r.approver ?? 'Unresolved — the request would be held'}
                        {r.delegateOf ? ` (delegated from ${r.delegateOf})` : ''}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{slaLabel(m)}</TableCell>
                    </TableRow>
                  );
                }))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSim(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

/* ------------------------------------------------------------------ *
 * 3.2 Route Builder + 3.3 Route Version History — WF-C4-03 / Steps 1–5
 * ------------------------------------------------------------------ */

const emptyStep = (seq: number): RouteStep => ({
  seq, role: ROLES[0], type: 'Sequential', slaValue: 2, slaUnit: 'working days', commentOnApprove: false
});

export const RouteBuilder: React.FC = () => {
  const s = useStore();
  const { id = 'new' } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const route = s.routes.find((r) => r.id === id);
  const base = route ? (route.versions.find((v) => v.status === 'Draft') ?? effectiveVersion(route) ?? route.versions[0]) : undefined;
  const draftExists = !!route?.versions.find((v) => v.status === 'Draft');

  const [objectType, setObjectType] = React.useState(route?.objectType ?? OBJECT_TYPES[0]);
  const [countries, setCountries] = React.useState<string[]>(route?.countries ?? []);
  const [commodities, setCommodities] = React.useState<string[]>(route?.commodities ?? []);
  const [orgUnits, setOrgUnits] = React.useState<string[]>(route?.orgUnits ?? []);
  const [measure, setMeasure] = React.useState<string>(route?.thresholdMeasure ?? '');
  const [from, setFrom] = React.useState(route?.thresholdFrom !== undefined ? String(route.thresholdFrom) : '');
  const [to, setTo] = React.useState(route?.thresholdTo !== undefined ? String(route.thresholdTo) : '');
  const [unit, setUnit] = React.useState(route?.thresholdUnit ?? '');
  const [steps, setSteps] = React.useState<RouteStep[]>(base ? base.steps.map((x) => ({ ...x })) : [emptyStep(1)]);
  const [onReturn, setOnReturn] = React.useState(route?.onReturn ?? 'Restart from the returning step');
  const [onReject, setOnReject] = React.useState(route?.onReject ?? 'Terminate the request');
  const [urgentAvailable, setUrgentAvailable] = React.useState(route?.urgentAvailable ?? false);
  const [urgentChannels, setUrgentChannels] = React.useState<string[]>(route?.urgentChannels ?? []);
  const [effectiveFrom, setEffectiveFrom] = React.useState(draftExists && base ? base.effectiveFrom : '2026-10-01');
  const [reason, setReason] = React.useState(draftExists && base ? base.reason : '');
  const [changed, setChanged] = React.useState(draftExists && base ? base.changed : '');
  const [deleteAttempt, setDeleteAttempt] = React.useState<RouteVersion | null>(null);
  const [simulate, setSimulate] = React.useState(false);
  const [simCountry, setSimCountry] = React.useState(COUNTRIES[0]);

  const nextVersion = draftExists && base ? base.version : (route ? Math.max(...route.versions.map((v) => v.version)) + 1 : 1);
  const routeId = isNew ? `RT-${String(s.routes.length + 1).padStart(2, '0')}` : id;

  const setStep = (i: number, patch: Partial<RouteStep>) =>
    setSteps((prev) => prev.map((st, ix) => (ix === i ? { ...st, ...patch } : st)));

  const move = (i: number, dir: -1 | 1) => setSteps((prev) => {
    const next = [...prev];
    const j = i + dir;
    if (j < 0 || j >= next.length) return prev;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const version = (): RouteVersion => ({
    version: nextVersion, status: 'Draft', effectiveFrom, changed: changed || 'Route amended', reason,
    steps: steps.map((st) => ({ ...st, parallelRule: st.type === 'Parallel' ? (st.parallelRule ?? 'All required') : undefined }))
  });

  const meta = () => ({
    objectType, countries, commodities, orgUnits,
    thresholdMeasure: (measure || undefined) as RouteDef['thresholdMeasure'],
    thresholdFrom: from ? Number(from) : undefined,
    thresholdTo: to ? Number(to) : undefined,
    thresholdUnit: unit || undefined,
    onReturn, onReject, urgentAvailable, urgentChannels
  });

  const canSubmit = !!reason.trim() && !!effectiveFrom && steps.length > 0;

  return (
    <>
      <PageBanner
        title={isNew ? 'New approval route' : `Route ${id} — ${route?.objectType}`}
        breadcrumb={['Global', 'C4 Approval Workflow', 'Approval routes', isNew ? 'New' : id]}
        subtitle="WF-C4-03 / Steps 1–5 — a route change alters who holds authority, so it is itself approved"
        actions={<WhiteButton onClick={() => navigate('/c4/routes')}>Back to routes</WhiteButton>}
      />
      <Box sx={{ p: 3, pb: 10 }}>
        <FormSectionCard title="1 — Object type and conditions (Steps 1–2)">
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Object type</InputLabel>
                <Select label="Object type" value={objectType} onChange={(e) => setObjectType(e.target.value)}>
                  {OBJECT_TYPES.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Country</InputLabel>
                <Select
                  multiple label="Country" value={countries} input={<OutlinedInput label="Country" />}
                  onChange={(e) => setCountries(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
                  renderValue={(v) => (v.length ? v.join(', ') : 'Every country')}
                >
                  {COUNTRIES.map((c) => (
                    <MenuItem key={c} value={c}><Checkbox size="small" checked={countries.includes(c)} />{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Commodity</InputLabel>
                <Select
                  multiple label="Commodity" value={commodities} input={<OutlinedInput label="Commodity" />}
                  onChange={(e) => setCommodities(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
                  renderValue={(v) => (v.length ? v.join(', ') : 'Any commodity')}
                >
                  {COMMODITIES.map((c) => (
                    <MenuItem key={c} value={c}><Checkbox size="small" checked={commodities.includes(c)} />{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Organisational unit</InputLabel>
                <Select
                  multiple label="Organisational unit" value={orgUnits} input={<OutlinedInput label="Organisational unit" />}
                  onChange={(e) => setOrgUnits(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
                  renderValue={(v) => (v.length ? v.join(', ') : 'Any unit')}
                >
                  {ORG_UNITS.map((c) => (
                    <MenuItem key={c} value={c}><Checkbox size="small" checked={orgUnits.includes(c)} />{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Threshold measure</InputLabel>
                <Select label="Threshold measure" value={measure} onChange={(e) => setMeasure(e.target.value)}>
                  <MenuItem value="">Not banded</MenuItem>
                  <MenuItem value="Value">Value</MenuItem>
                  <MenuItem value="Volume">Volume</MenuItem>
                  <MenuItem value="Duration">Duration</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth size="small" label="Band from" value={from} disabled={!measure}
                         onChange={(e) => setFrom(e.target.value.replace(/[^0-9.]/g, ''))} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth size="small" label="Band to" value={to} disabled={!measure}
                         helperText="Blank means no upper limit" onChange={(e) => setTo(e.target.value.replace(/[^0-9.]/g, ''))} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth size="small" label="Unit" value={unit} disabled={!measure}
                         placeholder="USD, MT, days" onChange={(e) => setUnit(e.target.value)} />
            </Grid>
          </Grid>
          <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mt: 1.5 }}>
            Leaving a condition blank makes the route apply to every value of it. A different route applies above a
            defined value or volume, which is how threshold authority is expressed.
          </Typography>
        </FormSectionCard>

        <FormSectionCard title="2 — Steps (Step 3)">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12, width: 90 }}>Sequence</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Approver role</TableCell>
                <TableCell sx={{ fontSize: 12, width: 150 }}>Step type</TableCell>
                <TableCell sx={{ fontSize: 12, width: 170 }}>Parallel rule</TableCell>
                <TableCell sx={{ fontSize: 12, width: 200 }}>Service level</TableCell>
                <TableCell sx={{ fontSize: 12, width: 150 }}>Comment on approve</TableCell>
                <TableCell sx={{ fontSize: 12, width: 90 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {steps.map((st, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <TextField size="small" type="number" value={st.seq} sx={{ width: 70 }}
                               onChange={(e) => setStep(i, { seq: Math.max(1, Number(e.target.value) || 1) })} />
                  </TableCell>
                  <TableCell>
                    <Select size="small" fullWidth value={st.role} onChange={(e) => setStep(i, { role: e.target.value })}>
                      {ROLES.map((r) => <MenuItem key={r} value={r}>{roleLabel(r)}</MenuItem>)}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select size="small" fullWidth value={st.type}
                            onChange={(e) => setStep(i, { type: e.target.value as RouteStep['type'], parallelRule: e.target.value === 'Parallel' ? 'All required' : undefined })}>
                      <MenuItem value="Sequential">Sequential</MenuItem>
                      <MenuItem value="Parallel">Parallel</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select size="small" fullWidth disabled={st.type !== 'Parallel'} value={st.parallelRule ?? ''}
                            onChange={(e) => setStep(i, { parallelRule: e.target.value as ParallelRule })}>
                      {RULES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <TextField size="small" type="number" value={st.slaValue} sx={{ width: 70 }}
                                 onChange={(e) => setStep(i, { slaValue: Math.max(1, Number(e.target.value) || 1) })} />
                      <Select size="small" value={st.slaUnit} onChange={(e) => setStep(i, { slaUnit: e.target.value as RouteStep['slaUnit'] })}>
                        <MenuItem value="working hours">working hours</MenuItem>
                        <MenuItem value="working days">working days</MenuItem>
                      </Select>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Switch size="small" checked={st.commentOnApprove} onChange={(e) => setStep(i, { commentOnApprove: e.target.checked })} />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row">
                      <IconButton size="small" onClick={() => move(i, -1)}><ArrowUpwardIcon sx={{ fontSize: 16 }} /></IconButton>
                      <IconButton size="small" onClick={() => move(i, 1)}><ArrowDownwardIcon sx={{ fontSize: 16 }} /></IconButton>
                      <IconButton size="small" disabled={steps.length === 1}
                                  onClick={() => setSteps((prev) => prev.filter((_, ix) => ix !== i))}>
                        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button size="small" sx={{ mt: 1 }} onClick={() => setSteps((prev) => [...prev, emptyStep(Math.max(...prev.map((p) => p.seq)) + 1)])}>
            Add step
          </Button>
          <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mt: 1 }}>
            Steps sharing the same sequence number form a parallel group. The role is resolved to named users at runtime;
            reject and return always require a comment, so the toggle governs approval only.
          </Typography>
        </FormSectionCard>

        <FormSectionCard title="3 — Exception rules (Step 4)">
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.5 }}>On return for amendment</Typography>
              <RadioGroup value={onReturn} onChange={(e) => setOnReturn(e.target.value as RouteDef['onReturn'])}>
                <FormControlLabel value="Restart from the beginning" control={<Radio size="small" />}
                                  label={<Typography sx={{ fontSize: 13 }}>Restart from the beginning</Typography>} />
                <FormControlLabel value="Restart from the returning step" control={<Radio size="small" />}
                                  label={<Typography sx={{ fontSize: 13 }}>Restart from the returning step</Typography>} />
              </RadioGroup>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.5 }}>On rejection</Typography>
              <RadioGroup value={onReject} onChange={(e) => setOnReject(e.target.value as RouteDef['onReject'])}>
                <FormControlLabel value="Terminate the request" control={<Radio size="small" />}
                                  label={<Typography sx={{ fontSize: 13 }}>Terminate the request</Typography>} />
                <FormControlLabel value="Return to Draft" control={<Radio size="small" />}
                                  label={<Typography sx={{ fontSize: 13 }}>Return to Draft</Typography>} />
              </RadioGroup>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={<Switch size="small" checked={urgentAvailable} onChange={(e) => setUrgentAvailable(e.target.checked)} />}
                label={<Typography sx={{ fontSize: 13 }}>Urgent flag available on this object type</Typography>}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small" disabled={!urgentAvailable}>
                <InputLabel>Channels the urgent flag activates</InputLabel>
                <Select
                  multiple label="Channels the urgent flag activates" value={urgentChannels}
                  input={<OutlinedInput label="Channels the urgent flag activates" />}
                  onChange={(e) => setUrgentChannels(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
                  renderValue={(v) => v.join(', ')}
                >
                  {CHANNELS.map((c) => (
                    <MenuItem key={c} value={c}><Checkbox size="small" checked={urgentChannels.includes(c)} />{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <PlaceholderNote kind="consistency">
            Integration consistency issue — urgent-flag channels. C4 / WF-C4-03 / Step 4 places the channels the urgent
            flag activates in route configuration, while C5 / WF-C5-03 / Step 2 places channel permission and
            urgent-channel reservation in notification administration. The setting is shown here with the disagreement
            flagged rather than choosing an owner.
          </PlaceholderNote>
        </FormSectionCard>

        <FormSectionCard title="4 — Version and effective date (Step 5)">
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField fullWidth size="small" label="Version" value={nextVersion} InputProps={{ readOnly: true }} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth size="small" label="Effective from" type="date" required
                         value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)}
                         InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="What changed" value={changed} onChange={(e) => setChanged(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Reason for change" required multiline minRows={2}
                         value={reason} onChange={(e) => setReason(e.target.value)} />
            </Grid>
          </Grid>
          <Stack spacing={1} sx={{ mt: 2 }}>
            <HandOffBanner target="C4 / WF-C4-01 Standard Approval Cycle"
                           passed="The route version, because the change alters who holds authority"
                           returned="The approval outcome; on approval the version becomes effective on its effective-from date" />
            <HandOffBanner label="DEPENDENCY" target="C10 / WF-C10-03 Configuration Change Control"
                           passed="The proposed authority change, for simulation before activation" />
            <HandOffBanner target="C8 / WF-C8-01 Audit Capture"
                           passed="Route definitions and changes, as sensitive actions" />
          </Stack>
        </FormSectionCard>

        {/* 3.3 Route Version History */}
        {route && (
          <Paper variant="outlined" sx={{ mt: 2 }}>
            <SectionBand>Version history — WF-C4-03 / Step 5</SectionBand>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Version</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Status</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Effective from</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Effective to</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>What changed</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Reason</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Approved by</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Requests in flight</TableCell>
                  <TableCell sx={{ fontSize: 12 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {route.versions.map((v) => {
                  const inFlight = s.inFlightOn(route.id, v.version);
                  return (
                    <TableRow key={v.version}>
                      <TableCell sx={{ fontSize: 12.5 }}>{v.version}</TableCell>
                      <TableCell><StatusChip status={v.status} /></TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{v.effectiveFrom}</TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{v.effectiveTo ?? 'open'}</TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{v.changed}</TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{v.reason}</TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{v.approvedBy ? `${v.approvedBy} · ${v.approvedAt}` : '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>
                        {inFlight.length === 0 ? '—' : inFlight.map((f) => (
                          <Button key={f.id} size="small" sx={{ p: 0, minWidth: 0, mr: 1, fontSize: 12 }}
                                  onClick={() => navigate(`/c4/approvals/${f.id}`)}>{f.record.split(' ')[0]}</Button>
                        ))}
                      </TableCell>
                      <TableCell>
                        <Button size="small" color="error" onClick={() => setDeleteAttempt(v)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {route.versions.some((v) => v.status === 'Draft') && (
              <Box sx={{ p: 2, pt: 1 }}>
                <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
                  A Draft version affects nothing until it is approved and reaches its effective-from date.
                </Typography>
              </Box>
            )}
          </Paper>
        )}

        {!route && !isNew && <EmptyState message="This route no longer exists" />}

        <ShellFooterNote />
      </Box>

      <ActionBar
        left={<Button variant="text" onClick={() => navigate('/c4/routes')}>Cancel</Button>}
        right={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => { s.saveRouteVersion(routeId, version(), meta()); navigate(`/c4/routes/${routeId}`); }}>
              Save draft
            </Button>
            <Button variant="outlined" onClick={() => setSimulate(true)}>Simulate</Button>
            <Button variant="contained" disabled={!canSubmit}
                    onClick={() => { s.saveRouteVersion(routeId, version(), meta()); s.submitRouteVersion(routeId, nextVersion); navigate('/c4/approvals'); }}>
              Submit for approval
            </Button>
          </Stack>
        }
      />

      {/* 3.4 Route Simulation, against the draft in the builder */}
      <Dialog open={simulate} onClose={() => setSimulate(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Simulate this draft</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, mb: 2 }}>
            The steps as drafted, with the approvers they would resolve to. Because the change alters who holds
            authority, the administrator is required to see this before activation — WF-C4-03 / Step 5.
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Resolve for country</InputLabel>
            <Select label="Resolve for country" value={simCountry} onChange={(e) => setSimCountry(e.target.value)}>
              {COUNTRIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Step</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Approver role</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Type</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Would resolve to</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Service level</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groupSteps(version().steps).map((g) => g.members.map((m, mi) => {
                const r = s.resolveApprover(m.role, simCountry);
                return (
                  <TableRow key={`${g.seq}-${m.role}-${mi}`}>
                    <TableCell sx={{ fontSize: 12.5 }}>{g.seq}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{roleLabel(m.role)}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{g.type === 'Parallel' ? `Parallel — ${g.rule?.toLowerCase()}` : 'Sequential'}</TableCell>
                    <TableCell sx={{ fontSize: 12.5, color: r.approver ? tokens.textPrimary : tokens.red }}>
                      {r.approver ?? 'Unresolved — the request would be held'}
                      {r.delegateOf ? ` (delegated from ${r.delegateOf})` : ''}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{slaLabel(m)}</TableCell>
                  </TableRow>
                );
              }))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions><Button onClick={() => setSimulate(false)}>Close</Button></DialogActions>
      </Dialog>

      <Dialog open={!!deleteAttempt} onClose={() => setDeleteAttempt(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Delete route version</DialogTitle>
        <DialogContent>
          {deleteAttempt && route && s.inFlightOn(route.id, deleteAttempt.version).length > 0 ? (
            <Alert severity="error" sx={{ fontSize: 13 }}>
              Version {deleteAttempt.version} cannot be deleted: {s.inFlightOn(route.id, deleteAttempt.version).length}
              {' '}request(s) are still in flight on it. Those requests continue on the version under which they were
              submitted, so the version must remain readable.
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ fontSize: 13 }}>
              A route version that has ever been effective is retained so that historical decisions remain explainable.
              Deletion is not offered in the prototype; superseding is the intended path.
            </Alert>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDeleteAttempt(null)}>Close</Button></DialogActions>
      </Dialog>
    </>
  );
};
