import React from 'react';
import {
  Alert, Box, Button, Chip, FormControlLabel, MenuItem, Select, Stack, Switch, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { DataTable, type Column } from '../../components/DataTable';
import {
  BottomBar, BusinessConfirmation, HandOffBanner, PrototypeNote, ReadOnlyField, RecordHeader, SectionCard,
  StatusChip, TraceNote, FieldGrid, RequiredLabel,
} from '../../components/shared';
import { NumberCell } from '../../components/PlanningGrid';
import { useStore } from '../../state/store';
import { useS05 } from '../../state/s05store';
import { COUNTRY_MODELS, UNDESIGNED_MODES, type Movement } from '../../mockData/s05';
import { COLORS } from '../../theme';

const statusChip = (s: string) =>
  s === 'Closed' || s === 'Received' ? 'Approved' : s === 'In transit' ? 'Open' : 'Draft';

/* --------------------------------------------------- S05-SC-02 movement list */

export function MovementList() {
  const { country } = useStore();
  const { movements } = useS05();

  const cols: Column<Movement & { id: string }>[] = [
    {
      key: 'id', label: 'Movement',
      render: (r) => <Link to={`/s05/movement/${r.id}`} style={{ color: COLORS.primary, fontWeight: 600 }}>{r.id}</Link>,
      value: (r) => r.id,
    },
    { key: 'type', label: 'Type', value: (r) => r.type },
    {
      key: 'tracking', label: 'Tracking',
      render: (r) => <Chip size="small" label={r.tracking} sx={{ height: 20, fontSize: '0.68rem' }} />,
      value: (r) => r.tracking,
    },
    { key: 'mode', label: 'Mode', value: (r) => r.mode },
    { key: 'country', label: 'Country', value: (r) => r.country },
    { key: 'route', label: 'Origin → destination', render: (r) => `${r.origin} → ${r.destination}`, value: (r) => r.origin },
    { key: 'commodity', label: 'Commodity', value: (r) => r.commodity },
    { key: 'loadedMt', label: 'Loaded (MT)', align: 'right', render: (r) => (r.loadedMt ?? '—'), value: (r) => r.loadedMt ?? 0 },
    { key: 'receivedMt', label: 'Received (MT)', align: 'right', render: (r) => (r.receivedMt ?? '—'), value: (r) => r.receivedMt ?? 0 },
    {
      key: 'variance', label: 'Variance', align: 'right',
      render: (r) => {
        if (r.loadedMt == null || r.receivedMt == null)
          return <Typography variant="caption" color="text.secondary">Not measurable</Typography>;
        const v = r.receivedMt - r.loadedMt;
        return (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
            <Typography variant="body2" sx={{ color: v < 0 ? COLORS.bad : COLORS.good, fontWeight: 600 }}>
              {v > 0 ? '+' : ''}{v.toFixed(1)}
            </Typography>
            {Math.abs(v / r.loadedMt) > 0.002 && (
              <Chip size="small" label="Attention" sx={{ bgcolor: COLORS.attention, color: '#fff', height: 18 }} />
            )}
          </Stack>
        );
      },
      value: (r) => String((r.receivedMt ?? 0) - (r.loadedMt ?? 0)),
    },
    { key: 'status', label: 'Status', render: (r) => <StatusChip status={statusChip(r.status)} />, value: (r) => r.status },
  ];

  return (
    <AppShell title="Movement List" breadcrumb={[country, 'Logistics', 'Movements']} showSeason={false}>
      <SectionCard title="S05-SC-02 — Movement list" dense>
        <div style={{ padding: '8px 16px' }}>
          <TraceNote workflow="WF-S05-02 / Steps 1, 9 — movements by type, country, mode and status" />
        </div>
        <DataTable columns={cols as any} rows={movements as any} toolbarNote="Movements across the operating countries" />
      </SectionCard>
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" component={Link} to="/s05/transit">Goods in transit</Button>
        <Button size="small" variant="outlined" component={Link} to="/s05/requests">Service requests</Button>
        <Button size="small" variant="outlined" component={Link} to="/s05/shunting">Local shunting</Button>
        <Button size="small" variant="outlined" component={Link} to="/s05/rates">Freight rates</Button>
        <Button size="small" variant="outlined" component={Link} to="/s05/clearance">Clearance</Button>
      </Stack>
    </AppShell>
  );
}

/* ------------------------- S05-SC-03 / 04 / 05 movement detail and quantities */

export function MovementDetail() {
  const { id = '' } = useParams();
  const { country, say } = useStore();
  const { movements, updateMovement } = useS05();
  const m = movements.find((x) => x.id === id);

  if (!m) {
    return (
      <AppShell title="Movement" breadcrumb={[country, 'Logistics']} showSeason={false}>
        <Alert severity="error">Movement {id} not found in the prototype data.</Alert>
      </AppShell>
    );
  }

  const cm = COUNTRY_MODELS.find((c) => c.country === m.country)!;
  const variance = m.loadedMt != null && m.receivedMt != null ? m.receivedMt - m.loadedMt : null;
  const tripTotal = m.trips.reduce((a, t) => a + t.quantityMt, 0);
  const dayLoaded = m.days.reduce((a, d) => a + d.loadedMt, 0);
  const dayReceived = m.days.reduce((a, d) => a + d.receivedMt, 0);

  return (
    <AppShell
      title={`Movement Detail — ${m.tracking}`}
      breadcrumb={[country, 'Logistics', 'Movements', m.id]}
      showSeason={false}
      banner={
        <RecordHeader
          title={m.id}
          chip={<StatusChip status={statusChip(m.status)} />}
          meta={[
            ['Movement #', m.id],
            ['Type', m.type],
            ['Tracking', m.tracking],
            ['Mode', m.mode],
            ['Route', `${m.origin} → ${m.destination}`],
            ['Commodity', m.commodity],
          ]}
        />
      }
    >
      <SectionCard title="Movement">
        <TraceNote workflow="WF-S05-02 / Steps 1, 4 — created from its originating process; commodity, quantity and the loading, departure and arrival dates" />
        <FieldGrid columns={3}>
          <ReadOnlyField label="Movement type" value={m.type} />
          <ReadOnlyField
            label="Originating record"
            value={m.originatingRoute ? <Link to={m.originatingRoute}>{m.originatingRecord}</Link> : m.originatingRecord}
          />
          <ReadOnlyField label="Commodity" value={m.commodity} />
          <ReadOnlyField label="Origin" value={m.origin} />
          <ReadOnlyField label="Destination" value={m.destination} />
          <ReadOnlyField label="Status" value={<StatusChip status={statusChip(m.status)} />} />
        </FieldGrid>
        <FieldGrid columns={3}>
          <Box sx={{ mt: 1 }}>
            <RequiredLabel label="Loading date" required />
            <TextField fullWidth variant="standard" value={m.loadingDate} onChange={(e) => updateMovement(m.id, { loadingDate: e.target.value })} />
          </Box>
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">Departure date</Typography>
            <TextField fullWidth variant="standard" value={m.departureDate} onChange={(e) => updateMovement(m.id, { departureDate: e.target.value })} />
          </Box>
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">Arrival date</Typography>
            <TextField fullWidth variant="standard" value={m.arrivalDate} onChange={(e) => updateMovement(m.id, { arrivalDate: e.target.value })} />
          </Box>
        </FieldGrid>
      </SectionCard>

      <SectionCard title="Country operating model">
        <TraceNote workflow="WF-S05-02 / Step 2 — the country model determines how the movement is arranged" />
        <Alert severity="info" icon={false} sx={{ fontSize: '0.82rem' }}>
          <b>{m.country}.</b> {cm.model}
        </Alert>
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: COLORS.textSecondary }}>
          Read-only. The operating model is configuration, not a choice made on the movement.
        </Typography>
      </SectionCard>

      <SectionCard title="Transport mode">
        <TraceNote workflow="WF-S05-02 / Step 5 — modes enabled for the country: trucks, rail, and containers on trucks" />
        <Select
          size="small" variant="standard" value={m.mode} sx={{ minWidth: 260 }}
          onChange={(e) => updateMovement(m.id, { mode: e.target.value })}
        >
          {cm.modes.map((mo) => <MenuItem key={mo} value={mo}>{mo}</MenuItem>)}
          {UNDESIGNED_MODES.map((mo) => (
            <MenuItem key={mo} value={mo} disabled>
              {mo} — information set not yet designed
            </MenuItem>
          ))}
        </Select>
        <BusinessConfirmation>
          Design and confirm the road shipment, bulk vessel and air freight information sets, which are not yet
          defined. The existing Export Direct development covers container shipments only — those options are shown
          disabled rather than invented.
        </BusinessConfirmation>
      </SectionCard>

      {m.tracking === 'Truck detail' ? (
        <SectionCard title="S05-SC-03 — Trip detail (truck tracking)">
          <TraceNote workflow="WF-S05-02 / Step 3 — the individual vehicle, driver, transporter, capacity, quantity and dates for each trip" />
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Trip reference', 'Vehicle', 'Driver', 'Transporter', 'Capacity (MT)', 'Quantity on trip (MT)'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {m.trips.map((t, i) => (
                <TableRow key={t.tripRef} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{t.tripRef}</TableCell>
                  <TableCell>{t.vehicle}</TableCell>
                  <TableCell>{t.driver}</TableCell>
                  <TableCell>{t.transporter}</TableCell>
                  <TableCell align="right">{t.capacityMt}</TableCell>
                  <TableCell align="right">
                    <NumberCell
                      value={t.quantityMt}
                      onChange={(v) => {
                        const trips = [...m.trips];
                        trips[i] = { ...t, quantityMt: v };
                        updateMovement(m.id, { trips });
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={5} sx={{ fontWeight: 700 }}>Total on trips</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{tripTotal.toFixed(1)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </SectionCard>
      ) : (
        <SectionCard title="S05-SC-04 — Bulk daily tracking">
          <TraceNote workflow="WF-S05-02 / Step 3 — the date, route, number of trips and the quantities loaded and received for the day" />
          <Alert severity="info" icon={false} sx={{ mb: 1, fontSize: '0.8rem' }}>
            Bulk daily tracking is the functionality configured for this movement type and country. It is the same
            movement record with a different tracking body, not a different process.
          </Alert>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Date', 'Route', 'Trips', 'Loaded (MT)', 'Received (MT)', 'Variance'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {m.days.map((d, i) => {
                const v = d.receivedMt ? d.receivedMt - d.loadedMt : null;
                return (
                  <TableRow key={d.date} hover>
                    <TableCell>{d.date}</TableCell>
                    <TableCell>{d.route}</TableCell>
                    <TableCell align="right">
                      <NumberCell
                        value={d.trips}
                        onChange={(val) => {
                          const days = [...m.days];
                          days[i] = { ...d, trips: val };
                          updateMovement(m.id, { days });
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <NumberCell
                        value={d.loadedMt}
                        onChange={(val) => {
                          const days = [...m.days];
                          days[i] = { ...d, loadedMt: val };
                          updateMovement(m.id, { days, loadedMt: days.reduce((a, x) => a + x.loadedMt, 0) });
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <NumberCell
                        value={d.receivedMt}
                        onChange={(val) => {
                          const days = [...m.days];
                          days[i] = { ...d, receivedMt: val };
                          const totalRec = days.reduce((a, x) => a + x.receivedMt, 0);
                          updateMovement(m.id, { days, receivedMt: totalRec > 0 ? totalRec : null });
                        }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ color: v != null && v < 0 ? COLORS.bad : undefined, fontWeight: 600 }}>
                      {v == null ? '—' : v.toFixed(1)}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow>
                <TableCell colSpan={3} sx={{ fontWeight: 700 }}>Total</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{dayLoaded.toFixed(1)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{dayReceived.toFixed(1)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </SectionCard>
      )}

      {/* S05-SC-05 */}
      <SectionCard title="S05-SC-05 — Loaded and received quantities">
        <TraceNote workflow="WF-S05-02 / Step 6 — both quantities are recorded; the difference is the input to the load-receive variance monitoring performed by compliance" />
        <FieldGrid columns={3}>
          <Box>
            <RequiredLabel label="Quantity loaded (MT)" required />
            <TextField
              fullWidth variant="standard" value={m.loadedMt ?? ''}
              onChange={(e) => updateMovement(m.id, { loadedMt: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </Box>
          <Box>
            <RequiredLabel label="Quantity received (MT)" required />
            <TextField
              fullWidth variant="standard" value={m.receivedMt ?? ''}
              placeholder="Recorded on arrival"
              onChange={(e) => updateMovement(m.id, { receivedMt: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </Box>
          <ReadOnlyField
            label="Variance"
            value={
              variance == null
                ? <Chip size="small" label="Not measurable" sx={{ height: 20 }} />
                : <Typography component="span" sx={{ fontWeight: 700, color: variance < 0 ? COLORS.bad : COLORS.good }}>
                    {variance > 0 ? '+' : ''}{variance.toFixed(1)} MT
                    {m.loadedMt ? ` (${((variance / m.loadedMt) * 100).toFixed(2)} %)` : ''}
                  </Typography>
            }
          />
        </FieldGrid>

        {variance == null ? (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            Variance cannot be calculated. Both the loaded and the received quantity must be captured at movement
            level — this is the only source of the load-receive variance monitored by S04 Compliance.
          </Alert>
        ) : (
          <>
            {m.tracking === 'Bulk daily' && (
              <ReadOnlyField
                label="Loss per trip"
                value={`${(variance / Math.max(1, m.days.reduce((a, d) => a + d.trips, 0))).toFixed(2)} MT per trip`}
              />
            )}
            {m.varianceCase && (
              <ReadOnlyField
                label="Related compliance case"
                value={<Link to={`/s04/case/${m.varianceCase}`}>{m.varianceCase}</Link>}
              />
            )}
          </>
        )}

        <HandOffBanner
          to="S04 Compliance / WF-S04-04 Ongoing Compliance Monitoring"
          passes="quantity loaded, quantity received, trip records"
          returns="variance case reference where an adjustment is required"
          resumes="the variance is only measurable if both quantities are captured here"
          linkLabel="Open S04 Compliance"
          linkTo="/s04/cases"
        />
      </SectionCard>

      <SectionCard title="Logistics system exchange (C12)">
        <TraceNote workflow="WF-S05-02 / Step 8 — where the movement is exchanged with the logistics system" />
        <FormControlLabel
          control={
            <Switch
              size="small" checked={m.externalAuthoritative}
              onChange={(e) => updateMovement(m.id, { externalAuthoritative: e.target.checked })}
            />
          }
          label={
            <Typography variant="body2">
              Treat the logistics system as authoritative for this movement
            </Typography>
          }
        />
        {m.externalAuthoritative && (
          <Alert severity="info" sx={{ mt: 1 }}>
            Under this assumption the fields the logistics system owns — route, dates and trip detail — would be
            read-only in COTS, and COTS would hold the reference. Shown to demonstrate the shape, not as a decision.
          </Alert>
        )}
        <BusinessConfirmation>
          Confirm the scope of the logistics system integration and which system is authoritative for movement
          information.
          <PrototypeNote>the toggle above demonstrates both shapes.</PrototypeNote>
        </BusinessConfirmation>
      </SectionCard>

      <BottomBar>
        <Button component={Link} to="/s05" variant="outlined">Back to movements</Button>
        <Stack direction="row" spacing={1}>
          <Button onClick={() => say('Movement saved (front-end state only)')}>Save</Button>
          <Button
            variant="contained"
            disabled={m.receivedMt == null || m.status === 'Closed'}
            onClick={() => { updateMovement(m.id, { status: 'Closed' }); say('Received quantity confirmed at the receiving location — movement closed'); }}
          >
            Confirm arrival and close
          </Button>
        </Stack>
      </BottomBar>
    </AppShell>
  );
}

/* ------------------------------------------------ S05-SC-06 goods in transit */

export function GoodsInTransit() {
  const { country } = useStore();
  const { movements } = useS05();
  const rows = movements.filter((m) => m.status === 'In transit' || (m.loadedMt != null && m.receivedMt == null));

  return (
    <AppShell title="Goods in Transit" breadcrumb={[country, 'Logistics', 'Goods in transit']} showSeason={false}>
      <SectionCard title="S05-SC-06 — Goods in transit">
        <TraceNote workflow="WF-S05-02 / Step 7 — goods in transit are visible as a stock status, feeding the transit position in reconciliation and inventory reporting" />
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Movement', 'Commodity', 'Quantity in transit (MT)', 'Origin → destination', 'Departed', 'Days in transit', 'Stock status'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((m) => (
              <TableRow key={m.id} hover>
                <TableCell><Link to={`/s05/movement/${m.id}`} style={{ color: COLORS.primary, fontWeight: 600 }}>{m.id}</Link></TableCell>
                <TableCell>{m.commodity}</TableCell>
                <TableCell align="right">{((m.loadedMt ?? 0) - (m.receivedMt ?? 0)).toFixed(1)}</TableCell>
                <TableCell>{m.origin} → {m.destination}</TableCell>
                <TableCell>{m.departureDate}</TableCell>
                <TableCell>{m.departureDate ? '1–2 days' : '—'}</TableCell>
                <TableCell><Chip size="small" label="Goods in transit" sx={{ bgcolor: COLORS.progress, color: '#fff', height: 20 }} /></TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={7}><Typography variant="body2" color="text.secondary">No goods in transit</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>

        <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: COLORS.textSecondary }}>
          Reached from here through the Core report viewer (C11), each with a country parameter: goods in transit
          (processing team) · goods in transit to Douala (Chad) · in-transit status (Sudan logistics).
        </Typography>

        <HandOffBanner
          to="S04 Compliance / WF-S04-02 and WF-S04-04"
          passes="the transit position by movement and commodity"
          returns="nothing"
          resumes="feeding the transit warehouse reconciliation and the weekly stock reconciliation"
          linkLabel="Open S04 Compliance"
          linkTo="/s04/cases"
        />
      </SectionCard>
      <Button size="small" component={Link} to="/s05">Back to movements</Button>
    </AppShell>
  );
}
