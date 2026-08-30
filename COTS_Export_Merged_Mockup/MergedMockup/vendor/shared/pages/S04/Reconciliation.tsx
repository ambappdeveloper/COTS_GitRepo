import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import {
  BottomBar, BusinessConfirmation, HandOffBanner, PrototypeNote, ReadOnlyField, SectionCard, StatusChip,
  TraceNote, RequiredLabel,
} from '../../components/shared';
import { ActionItemsList } from '../../components/CaseWorkspace';
import { NumberCell } from '../../components/PlanningGrid';
import { useStore } from '../../state/store';
import { useS04 } from '../../state/s04store';
import { MOVEMENT_REPORTS, WEIGHT_VARIANCE_TREND } from '../../mockData/s04';
import { COLORS } from '../../theme';

export function Reconciliation() {
  const { country, say } = useStore();
  const { cycles, updateCycle, updateReconRow, updateActionItem, addActionItem, cases, addCase } = useS04();
  const [sel, setSel] = React.useState(cycles[0]?.id ?? '');
  const [dl, setDl] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({ action: '', owner: 'Warehouse — Gedaref', targetDate: '25-Aug-2026' });
  const cyc = cycles.find((c) => c.id === sel);

  const raiseCase = (rowId: string) => {
    if (!cyc) return;
    const row = cyc.rows.find((r) => r.id === rowId)!;
    const variance = (row.countedMt ?? 0) - row.bookMt;
    const id = `VAR-00${60 + cases.length}`;
    addCase({
      id,
      createdAutomatically: false,
      triggerPoint: 'Manual — identified outside the configured trigger points',
      triggerRecord: `Reconciliation ${cyc.week} · ${row.location} · ${row.commodity}`,
      suggestedType: 'Stock take correction',
      suggestionBasis: [{ doc: `Reconciliation worksheet ${cyc.week}`, from: 'S04 Compliance' }],
      confirmedType: '',
      quantityMt: Math.abs(Number(variance.toFixed(1))),
      value: Math.round(Math.abs(variance) * 620),
      currency: 'USD',
      commodity: row.commodity,
      batch: '—',
      location: row.location,
      remarks: row.remarks,
      recommendation: '',
      evidence: [
        { item: 'Stock take sheet', provided: false },
        { item: 'Warehouse confirmation', provided: false },
      ],
      status: 'Created',
      approvals: [],
      erpConfirmed: false,
      erpReference: '',
      raisedOn: '21-Aug-2026',
      linked: [{ label: 'Reconciliation cycle', value: cyc.week, to: '/s04/reconciliation', note: 'Raised from the weekly reconciliation' }],
    });
    updateReconRow(cyc.id, rowId, { caseRef: id });
    say(`${id} raised from the reconciliation — the adjustment is not made in the reconciliation itself`);
  };

  return (
    <AppShell title="Stock Reconciliation" breadcrumb={[country, 'Compliance', 'Reconciliation']}>
      <SectionCard
        title="S04-SC-08 — Reconciliation cycles"
        right={
          <Select size="small" variant="standard" value={sel} onChange={(e) => setSel(e.target.value)}>
            {cycles.map((c) => <MenuItem key={c.id} value={c.id}>{c.week} · {c.country}</MenuItem>)}
          </Select>
        }
      >
        <TraceNote workflow="WF-S04-02 / Step 1 — compliance receive the movement reports weekly; in COTS the user downloads them directly from the system" />
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Cycle', 'Reports downloaded', 'Submitted by', 'Reconciled items', 'Variance', 'Action items', 'Status'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {cycles.map((c) => {
              const variance = c.rows.reduce((a, r) => a + Math.abs((r.countedMt ?? r.bookMt) - r.bookMt), 0);
              const overdue = c.actions.filter((a) => a.status !== 'Done').length;
              return (
                <TableRow key={c.id} hover selected={c.id === sel}>
                  <TableCell sx={{ fontWeight: 600, color: COLORS.primary }}>{c.week} · {c.country}</TableCell>
                  <TableCell>{c.downloaded.length} of {MOVEMENT_REPORTS.length}</TableCell>
                  <TableCell>{c.submittedBy}</TableCell>
                  <TableCell align="right">{c.rows.filter((r) => r.countedMt === r.bookMt).length}</TableCell>
                  <TableCell align="right">{variance.toFixed(1)} MT</TableCell>
                  <TableCell>{c.actions.length} · {overdue} open</TableCell>
                  <TableCell><StatusChip status={c.status === 'Closed' ? 'Closed' : 'Open'} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Button size="small" variant="outlined" sx={{ mt: 1.5 }} onClick={() => setDl(true)}>
          Download movement reports
        </Button>
      </SectionCard>

      {cyc && (
        <>
          <SectionCard title={`S04-SC-10 — Reconciliation worksheet · ${cyc.week}`}>
            <TraceNote workflow="WF-S04-02 / Step 2 — the reconciliation is performed and the results uploaded: items reconciled correctly, variance quantities, action items and remarks" />
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Report type', 'Location', 'Commodity', 'Book (MT)', 'Counted (MT)', 'Variance', 'Reconciled', 'Remarks', ''].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {cyc.rows.map((r) => {
                  const v = r.countedMt == null ? null : r.countedMt - r.bookMt;
                  return (
                    <TableRow key={r.id} hover sx={{ bgcolor: v != null && v !== 0 ? '#FFF7E6' : undefined }}>
                      <TableCell>{r.reportType}</TableCell>
                      <TableCell>{r.location}</TableCell>
                      <TableCell>{r.commodity}</TableCell>
                      <TableCell align="right">{r.bookMt.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <NumberCell
                          value={r.countedMt ?? undefined}
                          onChange={(val) => updateReconRow(cyc.id, r.id, { countedMt: val })}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: v && v < 0 ? COLORS.bad : undefined }}>
                        {v == null ? '—' : v.toFixed(1)}
                      </TableCell>
                      <TableCell>
                        {v == null
                          ? <Typography variant="caption" color="text.secondary">Not counted</Typography>
                          : v === 0
                            ? <Chip size="small" label="Correct" sx={{ height: 18, bgcolor: COLORS.good, color: '#fff' }} />
                            : <Chip size="small" label="Variance" sx={{ height: 18, bgcolor: COLORS.attention, color: '#fff' }} />}
                      </TableCell>
                      <TableCell>
                        <TextField
                          variant="standard" fullWidth value={r.remarks}
                          onChange={(e) => updateReconRow(cyc.id, r.id, { remarks: e.target.value })}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {v != null && v !== 0 && (
                          r.caseRef
                            ? <Button size="small" component={Link} to={`/s04/case/${r.caseRef}`}>{r.caseRef}</Button>
                            : <Button size="small" variant="outlined" onClick={() => raiseCase(r.id)}>Raise variance case</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Alert severity="info" icon={false} sx={{ mt: 1.5, fontSize: '0.8rem' }}>
              Where a variance requires a book adjustment the reconciliation <b>raises a case and stops there</b> — the
              adjustment is not made in the reconciliation.
            </Alert>
          </SectionCard>

          <SectionCard
            title={`S04-SC-11 — Reconciliation action items · ${cyc.week}`}
            right={<Button size="small" variant="outlined" onClick={() => setAddOpen(true)}>Add action item</Button>}
          >
            <TraceNote workflow="WF-S04-02 / Steps 3–5 — each action item has an owner and a target date and appears in the owner's Actions Inbox; COTS prompts for resolution updates the following week and items age and escalate" />
            <ActionItemsList
              rows={cyc.actions}
              onStatus={(itemId, status) => {
                updateActionItem(cyc.id, itemId, { status });
                say(status === 'Done' ? 'Action item confirmed' : 'Action item reopened');
              }}
            />
            <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }} icon={false}>
              The C5 prompt into the following week appears in the Core Actions Inbox. Items open beyond their target
              date are chipped <b>Overdue</b> and escalate per the configured rule — that is what converts a weekly
              report into a tracked commitment.
            </Alert>
          </SectionCard>
        </>
      )}

      <SectionCard title="S04-SC-12 — Cumulative weight variance trend">
        <TraceNote workflow="WF-S04-02 / Step 6 — cumulative weight variance percentages are analysed across receiving and loading reports to identify trends rather than isolated differences" />
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Period', 'Receiving variance %', 'Loading variance %', 'Trend'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {WEIGHT_VARIANCE_TREND.map((t, i) => {
              const prev = WEIGHT_VARIANCE_TREND[i - 1];
              const rising = prev && t.receiving + t.loading > prev.receiving + prev.loading;
              return (
                <TableRow key={t.period}>
                  <TableCell>{t.period}</TableCell>
                  <TableCell align="right">{t.receiving.toFixed(2)} %</TableCell>
                  <TableCell align="right">{t.loading.toFixed(2)} %</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: (t.receiving + t.loading) * 120, height: 8, bgcolor: rising ? COLORS.attention : COLORS.progress, borderRadius: 1 }} />
                      {rising && <Typography variant="caption" sx={{ color: COLORS.attention }}>rising</Typography>}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </SectionCard>

      <SectionCard title="S04-SC-13 — Stock status (weekly basis)">
        <TraceNote workflow="WF-S04-02 / Step 8 — a stock status based on the weekly inputs and the open action items, giving a current picture rather than a point-in-time snapshot" />
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Location', 'Commodity', 'Last reconciled (MT)', 'Open action items affecting the line', 'Status'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {(cyc?.rows ?? []).map((r) => {
              const open = (cyc?.actions ?? []).filter((a) => a.status !== 'Done' && a.action.toLowerCase().includes(r.location.split(' ')[0].toLowerCase())).length;
              return (
                <TableRow key={r.id}>
                  <TableCell>{r.location}</TableCell>
                  <TableCell>{r.commodity}</TableCell>
                  <TableCell align="right">{(r.countedMt ?? r.bookMt).toLocaleString()}</TableCell>
                  <TableCell>{open}</TableCell>
                  <TableCell>
                    {open > 0
                      ? <Chip size="small" label="Provisional — action items open" sx={{ height: 20, bgcolor: COLORS.attention, color: '#fff' }} />
                      : <Chip size="small" label="Reconciled" sx={{ height: 20, bgcolor: COLORS.good, color: '#fff' }} />}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: COLORS.textSecondary }}>
          The picture is built from the weekly inputs <b>and</b> the open action items — that combination is the point
          of this screen.
        </Typography>
      </SectionCard>

      <BottomBar>
        <Button component={Link} to="/s04" variant="outlined">Back to the compliance dashboard</Button>
        <Button variant="contained" onClick={() => { if (cyc) updateCycle(cyc.id, { status: 'Reconciled' }); say('Reconciliation results uploaded'); }}>
          Upload reconciliation results
        </Button>
      </BottomBar>

      {/* S04-SC-09 */}
      <Dialog open={dl} onClose={() => setDl(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.primary, color: '#fff', py: 1.25 }}>
          Movement report download
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.85 }}>WF-S04-02 / Step 1</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="info" icon={false} sx={{ mb: 2, fontSize: '0.8rem' }}>
            The user downloads the reports in the required template format directly from COTS, rather than collecting
            spreadsheets by email from each operation team.
          </Alert>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Report', 'Content', 'Template format', ''].map((h) => <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {MOVEMENT_REPORTS.map((r) => (
                <TableRow key={r.name}>
                  <TableCell sx={{ fontWeight: 600 }}>{r.name}</TableCell>
                  <TableCell>{r.detail}</TableCell>
                  <TableCell>{r.template}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => say(`${r.name} downloaded (simulated)`)}>Download</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <BusinessConfirmation>
            Provide the exact template formats the system must produce for the weekly movement reports.
            <PrototypeNote>placeholder formats are listed.</PrototypeNote>
          </BusinessConfirmation>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDl(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add action item</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <RequiredLabel label="Action" required />
            <TextField fullWidth variant="standard" value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value })} />
          </Box>
          <Box sx={{ mt: 2 }}>
            <RequiredLabel label="Owner" required />
            <Select fullWidth variant="standard" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })}>
              {['Warehouse — Gedaref', 'Logistics — Sudan', 'M. Idris (Processing)', 'Execution — Port Sudan'].map((o) => (
                <MenuItem key={o} value={o}>{o}</MenuItem>
              ))}
            </Select>
          </Box>
          <Box sx={{ mt: 2 }}>
            <RequiredLabel label="Target date" required />
            <TextField fullWidth variant="standard" value={draft.targetDate} onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })} />
          </Box>
          <Alert severity="info" sx={{ mt: 2, fontSize: '0.78rem' }}>
            The item appears in the owner's Core C2 Actions Inbox and is prompted for a resolution update the
            following week.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!draft.action.trim() || !cyc}
            onClick={() => {
              if (cyc) addActionItem(cyc.id, { id: `AI-${cyc.actions.length + 10}`, ...draft, status: 'Open', note: '' });
              setAddOpen(false);
              setDraft({ action: '', owner: 'Warehouse — Gedaref', targetDate: '25-Aug-2026' });
              say('Action item assigned — it appears in the owner’s Actions Inbox');
            }}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
