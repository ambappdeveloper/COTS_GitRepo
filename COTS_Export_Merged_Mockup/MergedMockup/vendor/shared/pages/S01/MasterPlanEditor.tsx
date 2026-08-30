import React from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Radio,
  RadioGroup, FormControlLabel, Stack, Step, StepLabel, Stepper, Tab, Tabs, TextField, Tooltip,
  Typography, Table, TableBody, TableCell, TableHead, TableRow, MenuItem, Select,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ContentPasteGoIcon from '@mui/icons-material/ContentPasteGo';
import AddIcon from '@mui/icons-material/Add';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import {
  BottomBar, BusinessConfirmation, HandOffBanner, InfoCardStrip, PrototypeNote, ReadOnlyField,
  RecordHeader, SectionCard, StatusChip, TraceNote, FieldGrid,
} from '../../components/shared';
import { PlanningGrid } from '../../components/PlanningGrid';
import { PasteFromExcelDialog } from '../../components/PasteFromExcelDialog';
import { useStore } from '../../state/store';
import { CITIES, COMMODITIES, FACILITIES, LOCATIONS, SEASONS, WAREHOUSES } from '../../mockData/master';
import type { PlanRow } from '../../mockData/s01';
import { COLORS } from '../../theme';

export default function MasterPlanEditor() {
  const { ref = '' } = useParams();
  const nav = useNavigate();
  const {
    country, seasonId, plans, plan, createPlan, updateRows, setPlanStatus, newVersionFrom, say, removeTask,
  } = useStore();

  const [tab, setTab] = React.useState(0);
  const [paste, setPaste] = React.useState(false);
  const [decide, setDecide] = React.useState(false);
  const [decision, setDecision] = React.useState<'Approve' | 'Reject' | 'Return'>('Approve');
  const [comment, setComment] = React.useState('');
  const [newVersion, setNewVersion] = React.useState(false);
  const [reason, setReason] = React.useState('');

  if (ref === 'NEW') {
    return (
      <AppShell title="New Master Plan" breadcrumb={[country, 'Planning', 'Master Plan', 'New']}>
        <SectionCard title="S01-SC-03 · Master plan editor (S01-SC-02 → new plan)">
          <TraceNote workflow="WF-S01-01 / Steps 1–2" />
          {plan ? (
            <Alert severity="warning">
              A master plan already exists for {country} / {SEASONS.find((s) => s.id === seasonId)?.label} —{' '}
              <b>{plan.ref}</b>. Each country has exactly one season plan for a given season, so a second plan cannot
              be created. Open the existing plan and create a new version instead.
              <Box sx={{ mt: 1 }}>
                <Button size="small" variant="contained" component={Link} to={`/s01/plan/${plan.ref}`}>
                  Open {plan.ref}
                </Button>
              </Box>
            </Alert>
          ) : (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                No master plan exists for {country} /{' '}
                {SEASONS.find((s) => s.id === seasonId)?.label ?? seasonId}. A draft can be created.
              </Alert>
              <Button
                variant="contained"
                onClick={() => {
                  const created = createPlan();
                  if (created) { say(`Draft master plan ${created} created`); nav(`/s01/plan/${created}`); }
                }}
              >
                Create draft plan
              </Button>
            </>
          )}
        </SectionCard>
        <Button size="small" component={Link} to="/s01/plans">Back to plan list</Button>
      </AppShell>
    );
  }

  const p = plans.find((x) => x.ref === ref);
  if (!p) {
    return (
      <AppShell title="Master Plan" breadcrumb={[country, 'Planning', 'Master Plan']}>
        <Alert severity="error">Plan {ref} not found in the prototype data.</Alert>
      </AppShell>
    );
  }

  const season = SEASONS.find((s) => s.id === p.seasonId)!;
  const version = p.versions.find((v) => v.version === p.activeVersion)!;
  const rows = version.rows;
  const editable = p.status === 'Draft' || p.status === 'Returned for amendment';

  const setRows = (next: PlanRow[]) => updateRows(p.ref, next);

  const mergePasted = (pasted: PlanRow[]) => {
    const next = [...rows];
    pasted.forEach((pr) => {
      const found = next.find(
        (r) => r.city === pr.city && r.location === pr.location && r.commodity === pr.commodity,
      );
      if (found) found.months = { ...found.months, ...pr.months };
      else next.push({ ...pr, id: `${next.length + 1}-${pr.commodity}` });
    });
    setRows(next);
    say(`${pasted.length} pasted row(s) validated and committed into the plan grid`);
  };

  const cityTotals = () => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const t = Object.values(r.months).reduce((a, b) => a + (b || 0), 0);
      m.set(r.city, (m.get(r.city) ?? 0) + t);
    });
    return m;
  };

  const infoCards = [
    {
      title: 'Facility capacities',
      lines: FACILITIES.filter((f) => CITIES.some((c) => c.name === f.city && c.country === country))
        .map((f) => [f.name, `${f.ratePerDay} MT/day`] as [string, string]),
      note: 'Source: C3 master data',
    },
    {
      title: 'Current raw material volumes (same cities)',
      lines: WAREHOUSES.filter((w) => CITIES.some((c) => c.name === w.city && c.country === country))
        .map((w) => [`${w.city} · ${w.code}`, `${(w.capacityMt * 0.7).toFixed(0)} MT`] as [string, string]),
    },
    {
      title: 'Overall raw material position',
      lines: [
        ['Planned this season', `${rows.reduce((a, r) => a + Object.values(r.months).reduce((x, y) => x + (y || 0), 0), 0).toLocaleString()} MT`],
        ['Held now', '9,000 MT'],
        ['Position', 'Long 1,250 MT'],
      ] as [string, string][],
    },
    {
      title: 'Commodity analysis',
      lines: Array.from(
        rows.reduce((m, r) => {
          const t = Object.values(r.months).reduce((a, b) => a + (b || 0), 0);
          m.set(r.commodity, (m.get(r.commodity) ?? 0) + t);
          return m;
        }, new Map<string, number>()),
      ).map(([k, v]) => [k, `${v.toLocaleString()} MT`] as [string, string]),
    },
  ];

  return (
    <AppShell
      title="Master Season Plan"
      breadcrumb={[country, 'Planning', 'Master Plan', p.ref]}
      banner={
        <RecordHeader
          title={p.ref}
          chip={<StatusChip status={p.status} />}
          meta={[
            ['Plan #', p.ref],
            ['Country', p.country],
            ['Season', season.label],
            ['Version', `v${p.activeVersion}`],
            ['Status', p.status],
          ]}
          actions={
            <>
              <Tooltip title="Paste from Excel (WF-S01-01 / Step 5)">
                <IconButton size="small" disabled={!editable} onClick={() => setPaste(true)} sx={{ color: COLORS.primary }}>
                  <ContentPasteGoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Create a new version of the approved plan (Step 9)">
                <IconButton
                  size="small"
                  disabled={p.status !== 'Approved'}
                  onClick={() => setNewVersion(true)}
                  sx={{ color: COLORS.primary }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          }
        />
      }
    >
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1, bgcolor: '#fff', border: `1px solid ${COLORS.border}` }}>
        <Tab label="Plan grid" />
        <Tab label="Approval" />
        <Tab label="Versions" />
        <Tab label="Documents" />
        <Tab label="Comments" />
        <Tab label="History" />
      </Tabs>

      {tab === 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 2 }}>
          <Box>
            <TraceNote workflow="WF-S01-01 / Steps 3–4 — quantities by country, city, location, commodity and commodity group, distributed across the months of the season" />
            {!editable && (
              <Alert severity="info" sx={{ mb: 1 }}>
                The grid is read-only because the plan is <b>{p.status}</b>.
                {p.status === 'Approved' && ' Use the edit action in the record header to create a new version.'}
              </Alert>
            )}
            <PlanningGrid
              rows={rows}
              months={season.months}
              lockedSections={p.lockedSections}
              editable={editable}
              onChange={setRows}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button
                size="small"
                startIcon={<ContentPasteGoIcon />}
                disabled={!editable}
                onClick={() => setPaste(true)}
                variant="outlined"
              >
                Paste from Excel
              </Button>
              <Button
                size="small"
                startIcon={<AddIcon />}
                disabled={!editable}
                variant="outlined"
                onClick={() =>
                  setRows([
                    ...rows,
                    {
                      id: `new-${rows.length + 1}`,
                      city: CITIES.filter((c) => c.country === country)[0]?.name ?? '',
                      location: LOCATIONS[0].name,
                      commodityGroup: COMMODITIES[0].group,
                      commodity: COMMODITIES[0].name,
                      months: {},
                      section: `${COMMODITIES[0].group} / ${CITIES[0].name}`,
                    },
                  ])
                }
              >
                Add row
              </Button>
            </Stack>

            <BottomBar>
              <Button component={Link} to="/s01/plans" variant="outlined">Cancel</Button>
              <Stack direction="row" spacing={1}>
                <Button disabled={!editable} onClick={() => say('Draft saved (front-end state only)')}>
                  Save draft
                </Button>
                <Button
                  variant="contained"
                  disabled={!editable || rows.length === 0}
                  onClick={() => { setPlanStatus(p.ref, 'Pending Approval'); setTab(1); say('Plan submitted through C4 Approval — status Pending Approval'); }}
                >
                  Submit for approval
                </Button>
              </Stack>
            </BottomBar>
          </Box>

          <Box>
            <InfoCardStrip
              cards={infoCards}
              heading={
                <>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>
                    PLANNING INFORMATION (S01-SC-05)
                  </Typography>
                  <TraceNote workflow="WF-S01-01 / Step 6 — presented alongside the entry grid, not in a separate report" />
                </>
              }
            />
            <BusinessConfirmation>
              Confirm the planning information cards required at each planning screen. Only the four cards named in
              the workflow are shown.
            </BusinessConfirmation>
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                Totals by city
              </Typography>
              {Array.from(cityTotals()).map(([c, t]) => (
                <Stack key={c} direction="row" justifyContent="space-between">
                  <Typography variant="caption">{c}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>{t.toLocaleString()} MT</Typography>
                </Stack>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {tab === 1 && (
        <SectionCard title="Approval — C4 Approval Workflow (S01-SC-06)">
          <TraceNote workflow="WF-S01-01 / Steps 7–8" />
          <ReadOnlyField label="Route" value="Sudan planning route — Planner → Country Manager (C4 configuration)" />
          <Stepper
            activeStep={p.status === 'Approved' ? 2 : p.status === 'Pending Approval' ? 1 : 0}
            sx={{ my: 3, maxWidth: 620 }}
          >
            <Step><StepLabel>Submitted</StepLabel></Step>
            <Step><StepLabel>Country Manager</StepLabel></Step>
            <Step><StepLabel>Approved baseline</StepLabel></Step>
          </Stepper>

          <BusinessConfirmation>
            Confirm whether the master plan is approved once per season or re-approved at each version.
            <PrototypeNote>
              the mockup routes every version for approval, because that demonstrates both behaviours.
            </PrototypeNote>
          </BusinessConfirmation>

          {p.status === 'Pending Approval' && (
            <Button variant="contained" onClick={() => setDecide(true)} sx={{ mt: 1 }}>
              Open approval task (as Country Manager)
            </Button>
          )}
          {p.status === 'Approved' && (
            <Alert severity="success" sx={{ mt: 1 }}>
              Approved by {version.approvedBy} on {version.approvedOn}. This version is the{' '}
              <b>active planning baseline</b> for {p.country} / {season.label}.
            </Alert>
          )}
          {p.status === 'Returned for amendment' && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              Returned for amendment — {version.reason}. The grid has reopened for editing (C6 returning comment).
            </Alert>
          )}

          <SectionCard title="Approval history (C4 / C8)">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Version</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Decision</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>By</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>On</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Reason / comment</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {p.versions.map((v) => (
                  <TableRow key={v.version}>
                    <TableCell>v{v.version}</TableCell>
                    <TableCell>{v.approvedBy ? 'Approved' : v.status}</TableCell>
                    <TableCell>{v.approvedBy ?? v.changedBy}</TableCell>
                    <TableCell>{v.approvedOn ?? v.changedOn}</TableCell>
                    <TableCell>{v.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>

          <HandOffBanner
            to="S06 SMA / WF-S06-01 and the short and long position"
            passes="approved purchase and processing volumes by country, season, commodity and month"
            returns="nothing"
            resumes="a change in the approved plan moves the expected position"
            linkLabel="Open expected SMA position"
            linkTo="/s06"
          />
        </SectionCard>
      )}

      {tab === 2 && (
        <SectionCard title="Version history (S01-SC-07)">
          <TraceNote workflow="WF-S01-01 / Step 9 — later changes create a new version; previous versions are retained with their approval history" />
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Version', 'Status', 'Effective from', 'Effective to', 'Approved by', 'Changed by', 'Reason'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {p.versions.map((v) => (
                <TableRow key={v.version} hover>
                  <TableCell>v{v.version}</TableCell>
                  <TableCell><StatusChip status={v.status} /></TableCell>
                  <TableCell>{v.effectiveFrom ?? '—'}</TableCell>
                  <TableCell>{v.effectiveTo ?? '—'}</TableCell>
                  <TableCell>{v.approvedBy ?? '—'}</TableCell>
                  <TableCell>{v.changedBy} · {v.changedOn}</TableCell>
                  <TableCell>{v.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: COLORS.textSecondary }}>
            Nothing is overwritten. Performance can always be measured against the baseline in force at the time.
          </Typography>
        </SectionCard>
      )}

      {tab === 3 && (
        <SectionCard title="Documents — C7 shared pattern">
          <Typography variant="body2" color="text.secondary">
            No documents attached. The shared Documents panel (Core S-14) and upload dialog (Core S-15) are reused
            here; S01 does not build its own document handling.
          </Typography>
        </SectionCard>
      )}
      {tab === 4 && (
        <SectionCard title="Comments — C6 shared pattern">
          <Typography variant="body2" color="text.secondary">
            Threaded discussion on the plan record, in the same position as on every other COTS record.
          </Typography>
        </SectionCard>
      )}
      {tab === 5 && (
        <SectionCard title="History — C8 audit trail">
          <Stack spacing={0.5}>
            {p.versions.map((v) => (
              <Typography key={v.version} variant="body2">
                v{v.version} · {v.changedOn} · {v.changedBy} · {v.reason}
                {v.approvedOn ? ` · approved by ${v.approvedBy} on ${v.approvedOn}` : ''}
              </Typography>
            ))}
          </Stack>
        </SectionCard>
      )}

      <PasteFromExcelDialog
        open={paste}
        onClose={() => setPaste(false)}
        months={season.months}
        country={country}
        onCommit={mergePasted}
      />

      {/* C4 decision drawer, shown as a dialog in the prototype */}
      <Dialog open={decide} onClose={() => setDecide(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.primary, color: '#fff', py: 1.25 }}>
          Approval task — {p.ref}
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.85 }}>
            Core C4 / WF-C4-01 decision drawer, reused unchanged
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <FieldGrid columns={2}>
            <ReadOnlyField label="Plan" value={p.ref} />
            <ReadOnlyField label="Season" value={season.label} />
            <ReadOnlyField label="Version" value={`v${p.activeVersion}`} />
            <ReadOnlyField label="Total planned" value={`${rows.reduce((a, r) => a + Object.values(r.months).reduce((x, y) => x + (y || 0), 0), 0).toLocaleString()} MT`} />
          </FieldGrid>
          <RadioGroup value={decision} onChange={(e) => setDecision(e.target.value as any)} sx={{ mt: 2 }}>
            <FormControlLabel value="Approve" control={<Radio size="small" />} label="Approve — the plan becomes the active baseline" />
            <FormControlLabel value="Return" control={<Radio size="small" />} label="Return for amendment" />
            <FormControlLabel value="Reject" control={<Radio size="small" />} label="Reject" />
          </RadioGroup>
          <TextField
            label="Comment"
            fullWidth
            multiline
            minRows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDecide(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (decision === 'Approve') { setPlanStatus(p.ref, 'Approved', comment || version.reason); say('Approved — the plan is now the active baseline'); }
              else if (decision === 'Return') { setPlanStatus(p.ref, 'Returned for amendment', comment || 'Returned for amendment'); say('Returned for amendment — the grid has reopened'); }
              else { setPlanStatus(p.ref, 'Returned for amendment', comment || 'Rejected'); say('Rejected'); }
              removeTask(`T-AP-${p.ref}`);
              setDecide(false);
              setComment('');
            }}
          >
            Record decision
          </Button>
        </DialogActions>
      </Dialog>

      {/* new version dialog — Step 9 */}
      <Dialog open={newVersion} onClose={() => setNewVersion(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create a new version</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            The approved plan is not edited in place. COTS creates v{p.activeVersion + 1} and retains v{p.activeVersion}{' '}
            with its approval history.
          </Alert>
          <TextField label="Reason for the change" fullWidth value={reason} onChange={(e) => setReason(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewVersion(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!reason.trim()}
            onClick={() => {
              newVersionFrom(p.ref, reason);
              setNewVersion(false);
              setReason('');
              setTab(0);
              say(`v${p.activeVersion + 1} created as Draft — v${p.activeVersion} retained as Superseded`);
            }}
          >
            Create version
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
