import React from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel,
  MenuItem, Select, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import {
  BottomBar, BusinessConfirmation, HandOffBanner, PrototypeNote, ReadOnlyField, SectionCard, StatusChip,
  TraceNote, FieldGrid, RequiredLabel,
} from '../../components/shared';
import { NumberCell } from '../../components/PlanningGrid';
import { useStore } from '../../state/store';
import { useS05 } from '../../state/s05store';
import { COUNTRY_MODELS } from '../../mockData/s05';
import { COMMODITIES, LOCATIONS, WAREHOUSES, FACILITIES } from '../../mockData/master';
import { KnowledgePanel } from '../../components/KnowledgePanel';
import { COLORS } from '../../theme';

/* ------------------------------------------ S05-SC-01 transportation service request */

export function ServiceRequests() {
  const { country, say } = useStore();
  const { requests, addRequest, updateRequest, requestInCots, setRequestInCots } = useS05();
  const cm = COUNTRY_MODELS.find((c) => c.country === country)!;
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({
    requirement: '', commodity: 'Sesame', quantityMt: 0,
    origin: LOCATIONS[0].name, destination: LOCATIONS[3].name, dateRequired: '26-Aug-2026',
  });

  const rows = requests.filter((r) => r.country === country);

  if (!cm.usesServiceRequest) {
    return (
      <AppShell title="Transportation Service Request" breadcrumb={[country, 'Logistics', 'Service requests']} showSeason={false}>
        <SectionCard title="S05-SC-01 — Country gate">
          <TraceNote workflow="WF-S05-01 / Step 1 — the service request is used in the Sudan operation and is not used in other countries; it is configured on or off per country" />
          <Alert severity="info">
            <b>Not applicable for {country}.</b> {cm.model} Movements are created directly through WF-S05-02.
          </Alert>
          <Button variant="contained" component={Link} to="/s05" sx={{ mt: 2 }}>Go to movements</Button>
        </SectionCard>
      </AppShell>
    );
  }

  return (
    <AppShell title="Transportation Service Request" breadcrumb={[country, 'Logistics', 'Service requests']} showSeason={false}>
      <KnowledgePanel type="Protocol" country={country} commodity="Sesame" contextLabel="Stuffing protocol for this movement" />
      <SectionCard title="Where does the request run?">
        <BusinessConfirmation>
          Confirm whether the transportation service request is executed in COTS, or remains in the enterprise system
          with COTS holding the reference.
          <PrototypeNote>both shapes are shown behind the toggle below; neither is presented as decided.</PrototypeNote>
        </BusinessConfirmation>
        <FormControlLabel
          control={<Switch size="small" checked={requestInCots} onChange={(e) => setRequestInCots(e.target.checked)} />}
          label={
            <Typography variant="body2">
              {requestInCots
                ? 'Executed in COTS — full request and response captured here'
                : 'Remains in the enterprise system — COTS holds the reference only'}
            </Typography>
          }
        />
      </SectionCard>

      <SectionCard
        title="S05-SC-01 — Transportation service requests"
        right={requestInCots && <Button size="small" variant="outlined" onClick={() => setOpen(true)}>New request</Button>}
      >
        <TraceNote workflow="WF-S05-01 / Steps 2–4 — requirement, quantity, locations and date required; the logistics response and status; on acceptance the movement is created" />
        <Table size="small">
          <TableHead>
            <TableRow>
              {(requestInCots
                ? ['Request', 'Requester', 'Requirement', 'Commodity · quantity', 'Route', 'Date required', 'Logistics response', 'Status', 'Movement', '']
                : ['Request reference (external)', 'Requester', 'Date required', 'Status', 'Movement', '']
              ).map((h) => <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell sx={{ fontWeight: 600, color: COLORS.primary }}>{r.id}</TableCell>
                <TableCell>{r.requester}</TableCell>
                {requestInCots && <TableCell sx={{ maxWidth: 260 }}>{r.requirement}</TableCell>}
                {requestInCots && <TableCell>{r.commodity} · {r.quantityMt} MT</TableCell>}
                {requestInCots && <TableCell>{r.origin} → {r.destination}</TableCell>}
                <TableCell>{r.dateRequired}</TableCell>
                {requestInCots && (
                  <TableCell sx={{ minWidth: 180 }}>
                    <TextField
                      variant="standard" fullWidth placeholder="Logistics response" value={r.response}
                      onChange={(e) => updateRequest(r.id, { response: e.target.value, status: e.target.value ? 'Logistics responded' : 'Raised' })}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <StatusChip status={r.status === 'Accepted' ? 'Approved' : r.status === 'Logistics responded' ? 'Open' : 'Draft'} />
                </TableCell>
                <TableCell>
                  {r.movementRef
                    ? <Link to={`/s05/movement/${r.movementRef}`} style={{ color: COLORS.primary }}>{r.movementRef}</Link>
                    : '—'}
                </TableCell>
                <TableCell align="right">
                  {r.status !== 'Accepted' && (
                    <Button
                      size="small"
                      disabled={!r.response}
                      onClick={() => {
                        updateRequest(r.id, { status: 'Accepted', movementRef: 'MOV-0553' });
                        say('Request accepted — the movement is created and retains the request as its originating reference');
                      }}
                    >
                      Accept
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!requestInCots && (
          <Alert severity="info" sx={{ mt: 1.5 }}>
            Under the enterprise-system assumption COTS records only the reference, the requester and the date, and
            links out to the request. No requirement or response fields are captured here.
          </Alert>
        )}
      </SectionCard>

      <BottomBar>
        <Button component={Link} to="/s05" variant="outlined">Back to movements</Button>
        <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
          The requester is notified of the logistics response (C5).
        </Typography>
      </BottomBar>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.primary, color: '#fff', py: 1.25 }}>
          New transportation service request
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.85 }}>WF-S05-01 / Step 2</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <FieldGrid columns={2}>
            <ReadOnlyField label="Requester" value="M. Idris (Processing)" />
            <ReadOnlyField label="Country" value={country} />
          </FieldGrid>
          <Box sx={{ mt: 2 }}>
            <RequiredLabel label="Requirement" required />
            <TextField fullWidth variant="standard" multiline minRows={2} value={draft.requirement} onChange={(e) => setDraft({ ...draft, requirement: e.target.value })} />
          </Box>
          <FieldGrid columns={2}>
            <Box sx={{ mt: 2 }}>
              <RequiredLabel label="Commodity" required />
              <Select fullWidth variant="standard" value={draft.commodity} onChange={(e) => setDraft({ ...draft, commodity: e.target.value })}>
                {COMMODITIES.map((c) => <MenuItem key={c.name} value={c.name}>{c.name}</MenuItem>)}
              </Select>
            </Box>
            <Box sx={{ mt: 2 }}>
              <RequiredLabel label="Quantity (MT)" required />
              <TextField fullWidth variant="standard" value={draft.quantityMt || ''} onChange={(e) => setDraft({ ...draft, quantityMt: Number(e.target.value.replace(/[^0-9.]/g, '')) })} />
            </Box>
            <Box sx={{ mt: 2 }}>
              <RequiredLabel label="Origin" required />
              <Select fullWidth variant="standard" value={draft.origin} onChange={(e) => setDraft({ ...draft, origin: e.target.value })}>
                {LOCATIONS.map((l) => <MenuItem key={l.name} value={l.name}>{l.name}</MenuItem>)}
              </Select>
            </Box>
            <Box sx={{ mt: 2 }}>
              <RequiredLabel label="Destination" required />
              <Select fullWidth variant="standard" value={draft.destination} onChange={(e) => setDraft({ ...draft, destination: e.target.value })}>
                {LOCATIONS.map((l) => <MenuItem key={l.name} value={l.name}>{l.name}</MenuItem>)}
              </Select>
            </Box>
            <Box sx={{ mt: 2 }}>
              <RequiredLabel label="Date required" required />
              <TextField fullWidth variant="standard" value={draft.dateRequired} onChange={(e) => setDraft({ ...draft, dateRequired: e.target.value })} />
            </Box>
          </FieldGrid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!draft.requirement.trim() || !draft.quantityMt}
            onClick={() => {
              addRequest({
                id: `SR-0${189 + requests.length}`, country, requester: 'M. Idris (Processing)',
                ...draft, response: '', status: 'Raised',
              });
              setOpen(false);
              say('Service request raised to the logistics department');
            }}
          >
            Raise request
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}

/* --------------------------------------------- S05-SC-07 local shunting trip log */

export function Shunting() {
  const { country, say } = useStore();
  const { shunting, setShunting } = useS05();
  const [period, setPeriod] = React.useState('Aug 2026');
  const rows = shunting.filter((r) => r.period === period);
  const smaTrips = rows.filter((r) => r.sma).reduce((a, r) => a + r.trips, 0);
  const smaQty = rows.filter((r) => r.sma).reduce((a, r) => a + r.quantityMt, 0);

  const places = [...WAREHOUSES.map((w) => w.name), ...FACILITIES.map((f) => f.name)];

  return (
    <AppShell title="Local Shunting Trip Log" breadcrumb={[country, 'Logistics', 'Local shunting']} showSeason={false}>
      <SectionCard
        title="S05-SC-07 — Local shunting trip log"
        right={
          <Select size="small" variant="standard" value={period} onChange={(e) => setPeriod(e.target.value)}>
            {['Aug 2026', 'Jul 2026'].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </Select>
        }
      >
        <TraceNote workflow="WF-S05-03 / Steps 1–3 — recorded in COTS because this movement is not covered in the enterprise system, and the number of trips is required for the monthly transportation cost allocation" />
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Date', 'Route', 'Trips', 'Commodity', 'Quantity (MT)', 'SMA related'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.date}</TableCell>
                <TableCell>
                  <Select
                    size="small" variant="standard" value={r.origin} sx={{ minWidth: 150 }}
                    onChange={(e) => setShunting(shunting.map((x) => (x.id === r.id ? { ...x, origin: e.target.value } : x)))}
                  >
                    {places.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                  </Select>
                  {' → '}
                  <Select
                    size="small" variant="standard" value={r.destination} sx={{ minWidth: 150 }}
                    onChange={(e) => setShunting(shunting.map((x) => (x.id === r.id ? { ...x, destination: e.target.value } : x)))}
                  >
                    {places.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                  </Select>
                </TableCell>
                <TableCell align="right">
                  <NumberCell value={r.trips} onChange={(v) => setShunting(shunting.map((x) => (x.id === r.id ? { ...x, trips: v } : x)))} />
                </TableCell>
                <TableCell>{r.commodity}</TableCell>
                <TableCell align="right">
                  <NumberCell value={r.quantityMt} onChange={(v) => setShunting(shunting.map((x) => (x.id === r.id ? { ...x, quantityMt: v } : x)))} />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    size="small" checked={r.sma}
                    onChange={(e) => setShunting(shunting.map((x) => (x.id === r.id ? { ...x, sma: e.target.checked } : x)))}
                  />
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={2} sx={{ fontWeight: 700 }}>Total for {period}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{rows.reduce((a, r) => a + r.trips, 0)}</TableCell>
              <TableCell />
              <TableCell align="right" sx={{ fontWeight: 700 }}>{rows.reduce((a, r) => a + r.quantityMt, 0)}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>

        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          <Chip size="small" label={`${smaTrips} SMA-related trips`} sx={{ bgcolor: COLORS.primary, color: '#fff' }} />
          <Chip size="small" label={`${smaQty} MT shunted under the agreement`} />
        </Stack>

        <HandOffBanner
          to="S06 SMA / WF-S06-02 monthly transportation cost allocation"
          passes="trip count, route and quantities for the period"
          returns="nothing"
          resumes="the trips are required for the monthly transportation cost allocation under the agreement"
          linkLabel="Open S06 SMA"
          linkTo="/s06/transfer"
        />

        <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary }}>
          The Sudan local shunting summary report is published through C11 Reporting.
        </Typography>
      </SectionCard>

      <BottomBar>
        <Button component={Link} to="/s05" variant="outlined">Back to movements</Button>
        <Button variant="contained" onClick={() => say('Shunting log saved (front-end state only)')}>Save log</Button>
      </BottomBar>
    </AppShell>
  );
}
