import React from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, Chip,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import {
  BottomBar, BusinessConfirmation, HandOffBanner, PrototypeNote, ReadOnlyField, SectionCard,
  StatusChip, TraceNote, RequiredLabel, FieldGrid,
} from '../../components/shared';
import { NumberCell } from '../../components/PlanningGrid';
import { useStore } from '../../state/store';
import { AGENTS, COMMODITIES, LOCATIONS, SEASONS, TRADERS } from '../../mockData/master';
import { COLORS } from '../../theme';
import type { SourcingAgreement } from '../../mockData/s01';

export default function Sourcing() {
  const { country, seasonId, plan, agreements, addAgreement, sourcing, updateSourcing, say } = useStore();
  const season = SEASONS.find((s) => s.id === seasonId)!;
  const [agrOpen, setAgrOpen] = React.useState(false);
  const [recvRow, setRecvRow] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<SourcingAgreement>({
    id: '', agent: AGENTS[0].name, area: AGENTS[0].area, traders: [], tareTerms: '', governmentFees: '',
    commissions: '', seasonId,
  });

  const expectedVolume = (funds: number, price: number) => (price > 0 ? funds / price : 0);

  return (
    <AppShell title="Sourcing Plan and On-Spot Estimation" breadcrumb={[country, 'Planning', 'Sourcing Plan']}>
      {plan?.status === 'Approved' ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          Derived from master plan <b>{plan.ref} v{plan.activeVersion}</b> (approved{' '}
          {plan.versions.find((v) => v.version === plan.activeVersion)?.approvedOn}) — the approved baseline for{' '}
          {country} / {season.label}.
        </Alert>
      ) : (
        <Alert severity="warning" sx={{ mb: 2 }}>
          The master plan for this season is <b>{plan?.status ?? 'not created'}</b>. The sourcing plan is derived from
          the <b>approved</b> master plan (WF-S01-02 / Step 1).
        </Alert>
      )}

      <SectionCard
        title="S01-SC-09 — Sourcing agreements"
        right={<Button size="small" variant="outlined" onClick={() => setAgrOpen(true)}>New agreement</Button>}
      >
        <TraceNote workflow="WF-S01-02 / Step 2 — the sourcing agreement is recorded first" />
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Agent', 'Operational area', 'Traders coordinated with', 'Tare weight terms', 'Government fees', 'Commissions'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {agreements.filter((a) => a.seasonId === seasonId).map((a) => (
              <TableRow key={a.id} hover>
                <TableCell>{a.agent}</TableCell>
                <TableCell>{a.area}</TableCell>
                <TableCell>{a.traders.join(', ') || '—'}</TableCell>
                <TableCell>{a.tareTerms}</TableCell>
                <TableCell>{a.governmentFees}</TableCell>
                <TableCell>{a.commissions}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      <SectionCard title="S01-SC-10 — Sourcing plan editor">
        <TraceNote workflow="WF-S01-02 / Steps 1, 3–4 — funds issued and expected prices; COTS calculates the expected volume for on-spot purchases and deliveries" />
        <BusinessConfirmation>
          Confirm who owns the sourcing plan against the master plan, and at what level of detail funds are recorded.
          <PrototypeNote>funds are recorded per agent and area.</PrototypeNote>
        </BusinessConfirmation>

        <Table size="small">
          <TableHead>
            <TableRow>
              {['Agent', 'Area', 'Commodity', 'Funds issued (USD)', 'Expected price (USD/MT)', 'Expected volume (MT)', 'Receiving location'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sourcing.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.agent}</TableCell>
                <TableCell>{r.area}</TableCell>
                <TableCell>{r.commodity}</TableCell>
                <TableCell align="right">
                  <NumberCell
                    value={r.fundsIssued}
                    onChange={(v) => updateSourcing(sourcing.map((x) => (x.id === r.id ? { ...x, fundsIssued: v } : x)))}
                  />
                </TableCell>
                <TableCell align="right">
                  <NumberCell
                    value={r.expectedPrice}
                    onChange={(v) => updateSourcing(sourcing.map((x) => (x.id === r.id ? { ...x, expectedPrice: v } : x)))}
                  />
                </TableCell>
                <TableCell align="right" sx={{ bgcolor: '#F7F8F9', fontWeight: 700 }}>
                  {expectedVolume(r.fundsIssued, r.expectedPrice).toFixed(1)}
                </TableCell>
                <TableCell>
                  {r.receivingLocation ? (
                    <Chip size="small" label={r.receivingLocation} />
                  ) : (
                    <Button size="small" onClick={() => setRecvRow(r.id)}>Assign</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: COLORS.textSecondary }}>
          Expected volume is calculated from funds issued ÷ expected price and is read-only.
        </Typography>

        <HandOffBanner
          to="S02 Costing / WF-S02-02 Running a Cost Estimate"
          passes="expected price per agent and area"
          returns="nothing"
          resumes="the price is available as an input to the cost estimate"
          linkLabel="Open cost estimate calculator"
          linkTo="/s02"
        />

        <BottomBar>
          <Button component={Link} to="/s01" variant="outlined">Back to Planning</Button>
          <Stack direction="row" spacing={1}>
            <Button onClick={() => say('Sourcing plan draft saved (front-end state only)')}>Save draft</Button>
            <Button variant="contained" component={Link} to="/s01/expected-actual">
              Expected against actual delivery
            </Button>
          </Stack>
        </BottomBar>
      </SectionCard>

      {/* S01-SC-09 agreement form */}
      <Dialog open={agrOpen} onClose={() => setAgrOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.primary, color: '#fff', py: 1.25 }}>
          Sourcing agreement
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.85 }}>
            WF-S01-02 / Step 2 — mandatory labels are shown in the reference convention
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <FieldGrid columns={3}>
            <Box>
              <RequiredLabel label="Agent" required />
              <Select
                fullWidth variant="standard" value={draft.agent}
                onChange={(e) => {
                  const a = AGENTS.find((x) => x.name === e.target.value)!;
                  setDraft({ ...draft, agent: a.name, area: a.area });
                }}
              >
                {AGENTS.map((a) => <MenuItem key={a.name} value={a.name}>{a.name}</MenuItem>)}
              </Select>
            </Box>
            <Box>
              <RequiredLabel label="Operational area" required />
              <TextField fullWidth variant="standard" value={draft.area} InputProps={{ readOnly: true }} />
            </Box>
            <Box>
              <RequiredLabel label="Traders coordinated with" required />
              <Select
                fullWidth variant="standard" multiple value={draft.traders}
                onChange={(e) => setDraft({ ...draft, traders: e.target.value as string[] })}
                renderValue={(v) => (v as string[]).join(', ')}
              >
                {TRADERS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </Box>
            <Box>
              <RequiredLabel label="Tare weight terms" required />
              <TextField fullWidth variant="standard" placeholder="0.5 kg per bag" value={draft.tareTerms}
                onChange={(e) => setDraft({ ...draft, tareTerms: e.target.value })} />
            </Box>
            <Box>
              <RequiredLabel label="Government fees" required />
              <TextField fullWidth variant="standard" placeholder="2.5 %" value={draft.governmentFees}
                onChange={(e) => setDraft({ ...draft, governmentFees: e.target.value })} />
            </Box>
            <Box>
              <RequiredLabel label="Commissions" required />
              <TextField fullWidth variant="standard" placeholder="1.0 %" value={draft.commissions}
                onChange={(e) => setDraft({ ...draft, commissions: e.target.value })} />
            </Box>
            <ReadOnlyField label="Season" value={season.label} />
          </FieldGrid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAgrOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!draft.tareTerms || !draft.governmentFees || !draft.commissions || draft.traders.length === 0}
            onClick={() => {
              addAgreement({ ...draft, id: `SA-${agreements.length + 1}`, seasonId });
              setAgrOpen(false);
              say('Sourcing agreement recorded');
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* S01-SC-11 receiving location */}
      <Dialog open={!!recvRow} onClose={() => setRecvRow(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Receiving location assignment</DialogTitle>
        <DialogContent>
          <TraceNote workflow="WF-S01-02 / Step 5 — the processing team confirms where each agreement quantity will be received" />
          <ReadOnlyField
            label="Agreement quantity"
            value={`${expectedVolume(
              sourcing.find((s) => s.id === recvRow)?.fundsIssued ?? 0,
              sourcing.find((s) => s.id === recvRow)?.expectedPrice ?? 1,
            ).toFixed(1)} MT (expected)`}
          />
          <Box sx={{ mt: 2 }}>
            <RequiredLabel label="Receiving location" required />
            <Select
              fullWidth variant="standard" defaultValue={LOCATIONS[0].name} id="recv"
              onChange={(e) =>
                updateSourcing(sourcing.map((x) => (x.id === recvRow ? { ...x, receivingLocation: String(e.target.value) } : x)))
              }
            >
              {LOCATIONS.map((l) => <MenuItem key={l.name} value={l.name}>{l.name}</MenuItem>)}
            </Select>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecvRow(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              const row = sourcing.find((x) => x.id === recvRow);
              if (row && !row.receivingLocation)
                updateSourcing(sourcing.map((x) => (x.id === recvRow ? { ...x, receivingLocation: LOCATIONS[0].name } : x)));
              setRecvRow(null);
              say('Receiving location confirmed by the processing team');
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
