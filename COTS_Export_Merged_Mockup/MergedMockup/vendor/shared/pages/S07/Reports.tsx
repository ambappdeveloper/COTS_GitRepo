import React from 'react';
import {
  Alert, Box, Button, Chip, Collapse, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  Typography,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { BottomBar, BusinessConfirmation, PrototypeNote, SectionCard, TraceNote } from '../../components/shared';
import { useStore } from '../../state/store';
import { useS07 } from '../../state/s07store';
import { CONTRACTS } from '../../mockData/s07';
import { COLORS } from '../../theme';
import { stateColour } from './Register';

const money = (n: number) => (n ? `USD ${n.toLocaleString()}` : '—');

/* ==================================================== S07-SC-10 exposure */

export function ContractExposure() {
  const { country } = useStore();
  const { claims } = useS07();
  const [open, setOpen] = React.useState<string | null>('S30000942-1');

  const rows = CONTRACTS.map((c) => {
    const cl = claims.filter((x) => x.contract === c.id);
    const claimed = cl.reduce((s, x) => s + x.claimValue, 0);
    const approved = cl.reduce((s, x) => s + (x.approval?.approvedAmount ?? 0), 0);
    const settled = cl.reduce((s, x) => s + (x.settledAmount ?? 0), 0);
    const undecided = cl.filter((x) => !x.approval).reduce((s, x) => s + x.claimValue, 0);
    const shipmentsWithClaims = new Set(cl.flatMap((x) => x.shipments)).size;
    return { c, cl, claimed, approved, settled, undecided, shipmentsWithClaims };
  });

  return (
    <AppShell
      title="Contract exposure"
      breadcrumb={[country, 'Shared Modules', 'Claims', 'Contract exposure']}
      showSeason={false}
    >
      <TraceNote workflow="WF-S07-01 / Step 2 — the claim is recorded against the contract so exposure is visible at contract level" />

      <Alert severity="info" sx={{ mb: 2, fontSize: '0.82rem' }}>
        This panel is the answer to <i>why record the claim against the contract at all</i>. Recording against the
        buyer alone would not produce it.
      </Alert>

      <SectionCard title="S07-SC-10 · Claim exposure by contract">
        <Table size="small">
          <TableHead>
            <TableRow>
              {['', 'Contract', 'Buyer · commodity · destination', 'Contract value', 'Shipments',
                'Claims', 'Claimed', 'Approved', 'Settled', 'Exposure open', '% of contract'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <React.Fragment key={r.c.id}>
                <TableRow hover>
                  <TableCell sx={{ width: 36 }}>
                    <IconButton size="small" onClick={() => setOpen(open === r.c.id ? null : r.c.id)} sx={{ color: COLORS.primary }}>
                      {open === r.c.id ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: COLORS.primary }}>{r.c.id}</TableCell>
                  <TableCell>{r.c.buyer} · {r.c.commodity} · {r.c.destination}</TableCell>
                  <TableCell align="right">{money(r.c.valueUsd)}</TableCell>
                  <TableCell>{r.c.shipments.length} shipments · {r.shipmentsWithClaims} with claims</TableCell>
                  <TableCell>
                    {r.cl.length} ({r.cl.filter((x) => !x.approval).length} open ·{' '}
                    {r.cl.filter((x) => x.approval?.decision === 'Approved' && !x.closureDate).length} approved ·{' '}
                    {r.cl.filter((x) => x.closureDate).length} closed)
                  </TableCell>
                  <TableCell align="right">{money(r.claimed)}</TableCell>
                  <TableCell align="right">{money(r.approved)}</TableCell>
                  <TableCell align="right">{money(r.settled)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: r.undecided ? COLORS.attention : undefined }}>
                    {money(r.undecided)}
                  </TableCell>
                  <TableCell align="right">{((r.claimed / r.c.valueUsd) * 100).toFixed(1)} %</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={11} sx={{ p: 0, borderBottom: open === r.c.id ? undefined : 'none' }}>
                    <Collapse in={open === r.c.id}>
                      <Box sx={{ p: 1.5, bgcolor: '#FAFAFA' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              {['Claim', 'Shipment(s)', 'Cause', 'Type', 'Raised', 'Claimed', 'State'].map((h) => (
                                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {r.cl.map((x) => (
                              <TableRow key={x.id}>
                                <TableCell>
                                  <Link to={`/s07/claim/${x.id}`} style={{ color: COLORS.primary, fontWeight: 600 }}>{x.id}</Link>
                                </TableCell>
                                <TableCell>{x.shipments.join(', ') || '—'}</TableCell>
                                <TableCell>{x.cause}</TableCell>
                                <TableCell>{x.type}</TableCell>
                                <TableCell>{x.dateRaised}</TableCell>
                                <TableCell align="right">{money(x.claimValue)}</TableCell>
                                <TableCell>
                                  <Chip size="small" label={x.state} sx={{ height: 19, color: '#fff', bgcolor: stateColour(x.state) }} />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
        <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mt: 1 }}>
          <b>Exposure open</b> is the claimed value on claims not yet decided. Approved and settled amounts are shown
          separately so a decided claim does not read as open exposure.
        </Typography>
      </SectionCard>

      <BottomBar>
        <Button variant="outlined" component={Link} to="/s07">Back to the claim register</Button>
        <Button variant="outlined" component={Link} to="/s07/reports">Claims reporting</Button>
      </BottomBar>
    </AppShell>
  );
}

/* ==================================================== S07-SC-11 reporting */

export function ClaimsReporting() {
  const { country } = useStore();
  const { claims, shipmentsDelivered } = useS07();

  const withShipment = claims.filter((c) => c.shipments.length > 0);
  const withoutShipment = claims.filter((c) => c.shipments.length === 0);
  const rate = (withShipment.length / shipmentsDelivered) * 100;

  // by buyer
  const buyers = Array.from(new Set(claims.map((c) => c.buyer)));
  const byBuyer = buyers.map((b) => {
    const cl = claims.filter((c) => c.buyer === b);
    return {
      buyer: b,
      commodity: Array.from(new Set(cl.map((c) => CONTRACTS.find((x) => x.id === c.contract)?.commodity ?? '—'))).join(', '),
      contracts: Array.from(new Set(cl.map((c) => c.contract))).length,
      count: cl.length,
      claimed: cl.reduce((s, c) => s + c.claimValue, 0),
      approved: cl.reduce((s, c) => s + (c.approval?.approvedAmount ?? 0), 0),
      settled: cl.reduce((s, c) => s + (c.settledAmount ?? 0), 0),
      open: cl.filter((c) => !c.closureDate).length,
    };
  });

  // by cause
  const byCause = (['Quality', 'Service'] as const).map((cause) => {
    const cl = claims.filter((c) => c.cause === cause);
    return {
      cause,
      count: cl.length,
      claimed: cl.reduce((s, c) => s + c.claimValue, 0),
      approved: cl.reduce((s, c) => s + (c.approval?.approvedAmount ?? 0), 0),
      rejected: cl.filter((c) => c.approval?.decision === 'Rejected').length,
      types: Array.from(new Set(cl.map((c) => c.type))).join(', '),
      ncs: cl.filter((c) => c.qualityRecord).map((c) => c.qualityRecord!),
    };
  });

  return (
    <AppShell
      title="Claims reporting"
      breadcrumb={[country, 'Shared Modules', 'Claims', 'Reporting']}
      showSeason={false}
    >
      <TraceNote workflow="WF-S07-03 / Step 3 — claims by buyer, commodity, contract and period; the claim rate against shipments as a service quality indicator; claims by cause for root cause discussion" />

      {/* --------------------------------------------- claims by buyer etc. */}
      <SectionCard title="Claims by buyer, commodity, contract and period — value and status">
        <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mb: 1 }}>
          Period: 01-Jun-2026 to 19-Aug-2026. Groupable and filterable on all four dimensions in the built system.
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Buyer', 'Commodity', 'Contracts', 'Claims', 'Open', 'Claimed', 'Approved', 'Settled'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {byBuyer.map((b) => (
              <TableRow key={b.buyer}>
                <TableCell sx={{ fontWeight: 600 }}>{b.buyer}</TableCell>
                <TableCell>{b.commodity}</TableCell>
                <TableCell align="right">{b.contracts}</TableCell>
                <TableCell align="right">{b.count}</TableCell>
                <TableCell align="right">{b.open}</TableCell>
                <TableCell align="right">{money(b.claimed)}</TableCell>
                <TableCell align="right">{money(b.approved)}</TableCell>
                <TableCell align="right">{money(b.settled)}</TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ bgcolor: '#F7F8F9' }}>
              <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
              <TableCell />
              <TableCell />
              <TableCell align="right" sx={{ fontWeight: 700 }}>{claims.length}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{claims.filter((c) => !c.closureDate).length}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{money(byBuyer.reduce((s, b) => s + b.claimed, 0))}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{money(byBuyer.reduce((s, b) => s + b.approved, 0))}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{money(byBuyer.reduce((s, b) => s + b.settled, 0))}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </SectionCard>

      {/* ------------------------------------------------------- claim rate */}
      <SectionCard title="Claim rate against shipments — a service quality indicator">
        <Stack direction="row" spacing={4} alignItems="baseline" sx={{ mb: 1 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.primary }}>{rate.toFixed(1)} %</Typography>
            <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
              {withShipment.length} claims with a linked shipment against {shipmentsDelivered} shipments delivered in
              the period
            </Typography>
          </Box>
        </Stack>

        <Alert severity="warning" sx={{ fontSize: '0.8rem' }}>
          <b>Denominator stated.</b> {withoutShipment.length} claim
          {withoutShipment.length === 1 ? ' is' : 's are'} <b>excluded</b> from this rate because no shipment is
          linked ({withoutShipment.map((c) => c.id).join(', ') || 'none'}). A claim with no shipment cannot
          contribute to claims-against-shipments, so it is named rather than quietly folded in — the same discipline
          S04 uses for monitoring duties that are not measurable from COTS data.
        </Alert>

        <Table size="small" sx={{ mt: 1.5 }}>
          <TableHead>
            <TableRow>
              {['Buyer', 'Shipments delivered', 'Claims with a shipment', 'Rate'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {CONTRACTS.map((c) => {
              const cl = claims.filter((x) => x.contract === c.id && x.shipments.length > 0);
              return (
                <TableRow key={c.id}>
                  <TableCell>{c.buyer} · {c.id}</TableCell>
                  <TableCell align="right">{c.shipments.length}</TableCell>
                  <TableCell align="right">{cl.length}</TableCell>
                  <TableCell align="right">{((cl.length / c.shipments.length) * 100).toFixed(1)} %</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </SectionCard>

      {/* ------------------------------------------------------ by cause */}
      <SectionCard title="Claims by cause — for root cause discussion with quality and operations">
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Cause category', 'Claim types', 'Claims', 'Claimed', 'Approved', 'Rejected', 'Linked S03 quality records'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {byCause.map((r) => (
              <TableRow key={r.cause}>
                <TableCell sx={{ fontWeight: 600 }}>{r.cause}</TableCell>
                <TableCell>{r.types || '—'}</TableCell>
                <TableCell align="right">{r.count}</TableCell>
                <TableCell align="right">{money(r.claimed)}</TableCell>
                <TableCell align="right">{money(r.approved)}</TableCell>
                <TableCell align="right">{r.rejected}</TableCell>
                <TableCell>
                  {r.ncs.length
                    ? r.ncs.map((n) => (
                        <Link key={n} to="/s03/ncs" style={{ color: COLORS.primary, marginRight: 8 }}>{n}</Link>
                      ))
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
          Each quality-caused claim carries its <b>non-conformity reference</b>, so the root-cause conversation starts
          from the quality record rather than from the claim total. Claims <b>closed without settlement are included
          and counted</b> — a rejected claim still tells you something about a buyer or a lane.
        </Alert>
      </SectionCard>

      <BusinessConfirmation>
        No open question sits on these three reports. They are the reports the source names, and the only judgement
        applied is to state the claim-rate denominator rather than leave it implied.
      </BusinessConfirmation>

      <PrototypeNote>
        All three are Core C11 report definitions in the built system; here they are computed from the prototype's
        mock data, so decisions taken on the claim screens move these figures immediately.
      </PrototypeNote>

      <BottomBar>
        <Button variant="outlined" component={Link} to="/s07">Back to the claim register</Button>
        <Button variant="outlined" component={Link} to="/s07/exposure">Contract exposure</Button>
      </BottomBar>
    </AppShell>
  );
}
