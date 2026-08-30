import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Radio, RadioGroup,
  FormControlLabel, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import {
  BottomBar, HandOffBanner, PrototypeNote, ReadOnlyField, SectionCard, StatusChip, TraceNote, RequiredLabel,
} from '../../components/shared';
import { useStore } from '../../state/store';
import { useS03 } from '../../state/s03store';
import { COLORS } from '../../theme';

/* ------------------------------------ S03-SC-07 warehouse / truck condition checks */

export function ConditionChecks() {
  const { country, say } = useStore();
  const { checks, updateCheck } = useS03();
  const [open, setOpen] = React.useState<string | null>(checks[0]?.id ?? null);
  const check = checks.find((c) => c.id === open);

  return (
    <AppShell title="Warehouse and Truck Condition Checks" breadcrumb={[country, 'Quality Assurance', 'Condition checks']} showSeason={false}>
      <SectionCard title="Condition checks">
        <TraceNote workflow="WF-S03-02 / Steps 6–7 — condition check before the warehouse handover receipt, and before loading" />
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Check', 'Type', 'Subject', 'Related operation', 'Date', 'Outcome', ''].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {checks.map((c) => (
              <TableRow key={c.id} hover selected={c.id === open}>
                <TableCell sx={{ fontWeight: 600, color: COLORS.primary }}>{c.id}</TableCell>
                <TableCell>{c.type}</TableCell>
                <TableCell>{c.subject}</TableCell>
                <TableCell>{c.related}</TableCell>
                <TableCell>{c.date}</TableCell>
                <TableCell>
                  {c.outcome
                    ? <StatusChip status={c.outcome === 'Suitable' ? 'Approved' : 'Rejected'} />
                    : <StatusChip status="Open" />}
                </TableCell>
                <TableCell align="right"><Button size="small" onClick={() => setOpen(c.id)}>Open</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      {check && (
        <SectionCard title={`S03-SC-07 — ${check.type} · ${check.id}`}>
          <ReadOnlyField label="Subject" value={check.subject} />
          <ReadOnlyField label="Related operation" value={check.related} />
          <Typography variant="caption" sx={{ display: 'block', mt: 1, mb: 1, color: COLORS.textSecondary }}>
            {check.type === 'Warehouse check'
              ? 'Performed before the warehouse handover receipt, so that space is not accepted in unsuitable condition.'
              : 'Performed before loading, whether from warehouse to warehouse or to the customer.'}
          </Typography>

          <Table size="small">
            <TableHead>
              <TableRow>
                {['Condition item', 'Outcome', 'Note'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {check.items.map((it, i) => (
                <TableRow key={it.item} sx={{ bgcolor: it.outcome === 'Fail' ? '#FDF3F2' : undefined }}>
                  <TableCell>{it.item}</TableCell>
                  <TableCell>
                    <Select
                      size="small" variant="standard" value={it.outcome}
                      onChange={(e) => {
                        const items = [...check.items];
                        items[i] = { ...it, outcome: e.target.value as any };
                        updateCheck(check.id, { items });
                      }}
                      sx={{ minWidth: 90 }}
                    >
                      <MenuItem value="">—</MenuItem>
                      <MenuItem value="Pass">Pass</MenuItem>
                      <MenuItem value="Fail">Fail</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <TextField
                      variant="standard" fullWidth value={it.note}
                      onChange={(e) => {
                        const items = [...check.items];
                        items[i] = { ...it, note: e.target.value };
                        updateCheck(check.id, { items });
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <PrototypeNote>
            the condition item list is a placeholder drawn from the two checks the source names; the full item set is
            part of the quality forms still to be supplied.
          </PrototypeNote>

          <Box sx={{ mt: 2 }}>
            <RequiredLabel label="Outcome" required />
            <RadioGroup
              row value={check.outcome}
              onChange={(e) => updateCheck(check.id, { outcome: e.target.value as any })}
            >
              <FormControlLabel value="Suitable" control={<Radio size="small" />} label="Suitable — the operation may proceed" />
              <FormControlLabel value="Not suitable" control={<Radio size="small" />} label="Not suitable — the step is blocked" />
            </RadioGroup>
          </Box>

          {check.outcome === 'Not suitable' && (
            <>
              <Alert severity="error" sx={{ mt: 1 }}>
                The handover receipt or loading is blocked. Where corrective action is required, a non-conformity is
                raised.
              </Alert>
              <HandOffBanner
                to="S03 / WF-S03-03 Non-Conformity Management"
                passes="condition finding, subject, related operation"
                returns="non-conformity reference"
                resumes="corrective action is tracked on the non-conformity case"
                linkLabel="Open non-conformities"
                linkTo="/s03/ncs"
              />
            </>
          )}

          <BottomBar>
            <Button component={Link} to="/s03" variant="outlined">Back to the control point board</Button>
            <Button variant="contained" disabled={!check.outcome} onClick={() => say(`${check.id} recorded — ${check.outcome}`)}>
              Record check
            </Button>
          </BottomBar>
        </SectionCard>
      )}
    </AppShell>
  );
}

/* ------------------------------ S03-SC-08 / S03-SC-09 quality programmes */

export function Programmes() {
  const { country, say } = useStore();
  const { programmes, updateProgramme } = useS03();
  const [rec, setRec] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ performedDate: '19-Aug-2026', performedBy: 'Quality — Gedaref', result: 'Satisfactory' });

  const p = programmes.find((x) => x.id === rec);

  return (
    <AppShell title="Quality Programmes" breadcrumb={[country, 'Quality Assurance', 'Programmes']} showSeason={false}>
      <Alert severity="info" sx={{ mb: 2 }}>
        Scheduled activities are prompted by the C5 automated job. Two programmes are currently prompted — the
        prompt appears in the Core Actions Inbox and opens the activity record.
      </Alert>

      <SectionCard title="S03-SC-08 — Quality programme schedule">
        <TraceNote workflow="WF-S03-02 / Step 8 — activities such as fumigation and pest control planned per warehouse, with an automated job prompting the scheduled activity" />
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Programme', 'Type', 'Location', 'Schedule', 'Next due', 'Status', 'Last performed', 'Prompted', ''].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {programmes.map((x) => (
              <TableRow key={x.id} hover sx={{ bgcolor: x.status === 'Overdue' ? '#FFF7E6' : undefined }}>
                <TableCell sx={{ fontWeight: 600, color: COLORS.primary }}>{x.id}</TableCell>
                <TableCell>{x.type}</TableCell>
                <TableCell>{x.location}</TableCell>
                <TableCell>{x.schedule}</TableCell>
                <TableCell>{x.nextDue}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={x.status}
                    sx={{
                      height: 20, color: '#fff',
                      bgcolor: x.status === 'Overdue' ? COLORS.attention : x.status === 'Performed' ? COLORS.good : COLORS.progress,
                    }}
                  />
                </TableCell>
                <TableCell>{x.lastPerformed ? `${x.lastPerformed} · ${x.lastResult}` : '—'}</TableCell>
                <TableCell>{x.prompted ?? '—'}</TableCell>
                <TableCell align="right">
                  <Button size="small" disabled={x.status === 'Performed'} onClick={() => setRec(x.id)}>Record activity</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: COLORS.textSecondary }}>
          Programme completion against schedule is published through C11 Reporting.
        </Typography>
      </SectionCard>

      <Button size="small" component={Link} to="/s03">Back to the control point board</Button>

      <Dialog open={!!rec} onClose={() => setRec(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          S03-SC-09 — Programme activity record
          <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary }}>
            WF-S03-02 / Step 8
          </Typography>
        </DialogTitle>
        <DialogContent>
          {p && (
            <>
              <ReadOnlyField label="Programme" value={`${p.type} · ${p.location}`} />
              <Box sx={{ mt: 2 }}>
                <RequiredLabel label="Performed date" required />
                <TextField fullWidth variant="standard" value={form.performedDate} onChange={(e) => setForm({ ...form, performedDate: e.target.value })} />
              </Box>
              <Box sx={{ mt: 2 }}>
                <RequiredLabel label="Performed by" required />
                <TextField fullWidth variant="standard" value={form.performedBy} onChange={(e) => setForm({ ...form, performedBy: e.target.value })} />
              </Box>
              <Box sx={{ mt: 2 }}>
                <RequiredLabel label="Result" required />
                <Select fullWidth variant="standard" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })}>
                  {['Satisfactory', 'Partially effective', 'Adverse finding'].map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </Select>
              </Box>
              {form.result === 'Adverse finding' && (
                <Alert severity="warning" sx={{ mt: 2, fontSize: '0.78rem' }}>
                  An adverse result records the decision through the inspection pattern and raises a non-conformity
                  where corrective action is required.
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRec(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (p) {
                updateProgramme(p.id, {
                  status: 'Performed',
                  performedDate: form.performedDate,
                  performedBy: form.performedBy,
                  result: form.result,
                  lastPerformed: form.performedDate,
                  lastResult: form.result,
                });
                say(`${p.id} recorded as performed — ${form.result}`);
              }
              setRec(null);
            }}
          >
            Record
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
