import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import {
  BottomBar, EmptyState, PrototypeNote, RequiredLabel, SectionCard, TraceNote,
} from '../../components/shared';
import { useStore } from '../../state/store';
import { useS11 } from '../../state/s11store';
import { useS10 } from '../../state/s10store';
import { placementFor, reviewStatus, typeConfig } from '../../mockData/s11';
import { COLORS } from '../../theme';
import { ProposalBanner, statusColour } from './Library';

/* ================================================ S11-SC-11 review queue */

export default function ReviewQueue() {
  const { country, say } = useStore();
  const { items, published, confirmReview, withdraw } = useS11();
  const { people } = useS10();

  const [withdrawId, setWithdrawId] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState('');

  const owner = (id: string) => people.find((p) => p.id === id)?.name ?? '—';
  const due = published.filter((i) => reviewStatus(i.reviewDate).state !== 'Current');

  return (
    <AppShell title="Content review" breadcrumb={[country, 'Shared Modules', 'Knowledge Portal', 'Review']} showSeason={false}>
      <ProposalBanner />

      <SectionCard title="S11-SC-11 · Review queue">
        <TraceNote workflow="WF-S11-05 / Steps 1–2 — an automated job identifies material past its review date and prompts the content owner, so that the library does not silently go stale" />

        <PrototypeNote>
          the C5 automated job is simulated. In the built system it raises an Actions Inbox item for each content
          owner on the configured schedule.
        </PrototypeNote>

        {due.length === 0 ? (
          <EmptyState text="No published material is due or overdue for review." />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Item', 'Type', 'Owner', 'Version · effective', 'Review date', 'State', 'Surfaced at', 'Outcome'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {due.map((i) => {
                const rs = reviewStatus(i.reviewDate);
                const pl = placementFor(i.type);
                return (
                  <TableRow key={i.id} sx={{ bgcolor: rs.state === 'Overdue for review' ? '#FFF7ED' : undefined }}>
                    <TableCell>
                      <Link to={`/s11/item/${i.id}`} style={{ color: COLORS.primary, fontWeight: 600 }}>{i.code} · {i.title}</Link>
                    </TableCell>
                    <TableCell>{i.type}</TableCell>
                    <TableCell>{owner(i.ownerId)}</TableCell>
                    <TableCell>{i.version} · {i.effectiveFrom}</TableCell>
                    <TableCell>{i.reviewDate}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={rs.state === 'Overdue for review' ? `Overdue by ${rs.days} days` : `Due in ${rs.days} days`}
                        sx={{
                          height: 19, fontWeight: 700,
                          bgcolor: rs.state === 'Overdue for review' ? '#FDECEA' : '#FFF4E5',
                          color: rs.state === 'Overdue for review' ? COLORS.bad : COLORS.attention,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {pl?.live
                        ? <Link to={pl.route} style={{ color: COLORS.primary }}>{pl.placement}</Link>
                        : <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Library only</Typography>}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                        <Button
                          size="small" variant="outlined"
                          onClick={() => { confirmReview(i.id); say(`${i.title} confirmed as still valid. A new review date has been set from the configured ${typeConfig(i.type).reviewMonths}-month cycle.`); }}
                        >
                          Still valid — reset to the {typeConfig(i.type).reviewMonths}-month cycle
                        </Button>
                        <Button size="small" variant="outlined" component={Link} to="/s11/publish">Publish a new version</Button>
                        <Button size="small" variant="outlined" color="error" onClick={() => { setReason(''); setWithdrawId(i.id); }}>
                          Withdraw
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
          <b>Three outcomes, each with a distinct consequence.</b> <i>Still valid</i> sets a new review date{' '}
          <b>from the configured cycle for the type</b>, not from a date the owner picks, so the cycle cannot be
          quietly extended. <i>Requires change</i> publishes a new version and supersedes the previous one, retained.
          <i> No longer applicable</i> withdraws the item — retained and marked — and its point-of-work placement falls
          back to <i>no material published</i> rather than continuing to show withdrawn guidance.
        </Alert>

        <Alert severity="warning" sx={{ mt: 1, fontSize: '0.8rem' }}>
          Overdue material is chipped <b>where users consult it</b>, not only here. A protocol three weeks past review
          is still governing work, and the person following it deserves to know its status.
        </Alert>
      </SectionCard>

      <BottomBar>
        <Button variant="outlined" component={Link} to="/s11">Back to the library</Button>
        <Button variant="outlined" component={Link} to="/s11/reports">Reporting</Button>
      </BottomBar>

      <Dialog open={!!withdrawId} onClose={() => setWithdrawId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Withdraw this material</DialogTitle>
        <DialogContent>
          <TraceNote workflow="WF-S11-05 / Step 2 branch — the owner withdraws it, and the withdrawn item is retained and marked so that past decisions remain explainable" />
          <Alert severity="warning" sx={{ mt: 1, fontSize: '0.82rem' }}>
            The item is <b>retained and marked as withdrawn</b>, never deleted. Its point-of-work placement will fall
            back to <i>no material published</i>, so users are not left following withdrawn guidance.
          </Alert>
          <Box sx={{ mt: 2 }}>
            <RequiredLabel label="Reason for withdrawal" required />
            <TextField size="small" fullWidth multiline minRows={2} sx={{ mt: 0.5 }} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWithdrawId(null)}>Cancel</Button>
          <Tooltip title={!reason ? 'A reason is required.' : ''}>
            <span>
              <Button
                variant="contained" disabled={!reason}
                onClick={() => {
                  const it = items.find((x) => x.id === withdrawId);
                  withdraw(withdrawId!, reason);
                  say(`${it?.title} withdrawn and retained. Its placement now falls back to "no material published".`);
                  setWithdrawId(null);
                }}
              >
                Withdraw and retain
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}

/* ================================================= S11-SC-12 reporting */

export function LibraryReports() {
  const { country } = useStore();
  const { items, published } = useS11();
  const { people } = useS10();

  const owner = (id: string) => people.find((p) => p.id === id)?.name ?? '—';
  const overdue = published.filter((i) => reviewStatus(i.reviewDate).state === 'Overdue for review');
  const zero = published.filter((i) => i.consultations === 0);
  const byType = Array.from(new Set(published.map((i) => i.type)));

  return (
    <AppShell title="Library reporting" breadcrumb={[country, 'Shared Modules', 'Knowledge Portal', 'Reporting']} showSeason={false}>
      <ProposalBanner />

      <TraceNote workflow="WF-S11-01 / Step 5, WF-S11-02 / Step 5 and WF-S11-05 / Step 3 — library inventory by country, module and type; usage; and material overdue for review" />

      <SectionCard title="Library inventory by country, module and type">
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Type', 'Published items', 'Countries', 'Modules', 'Requires approval', 'Review cycle', 'Surfaced at'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {byType.map((t) => {
              const rows = published.filter((i) => i.type === t);
              const cfg = typeConfig(t);
              const pl = placementFor(t);
              return (
                <TableRow key={t}>
                  <TableCell sx={{ fontWeight: 600 }}>{t}</TableCell>
                  <TableCell align="right">{rows.length}</TableCell>
                  <TableCell>{Array.from(new Set(rows.map((i) => i.country))).join(', ')}</TableCell>
                  <TableCell>{Array.from(new Set(rows.map((i) => i.module))).join(', ')}</TableCell>
                  <TableCell>{cfg.requiresApproval ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{cfg.reviewMonths} months</TableCell>
                  <TableCell sx={{ color: pl?.live ? undefined : COLORS.textSecondary }}>
                    {pl?.live ? pl.placement : 'Library only'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mt: 0.5 }}>
          {published.filter((i) => !placementFor(i.type)?.live).length} published item(s) have <b>no configured
          placement</b> — stated as a fact, because some material genuinely belongs only in the library.
        </Typography>
      </SectionCard>

      <SectionCard title="Material overdue for review">
        {overdue.length === 0 ? (
          <Alert severity="success" sx={{ fontSize: '0.82rem' }}>Nothing is overdue for review.</Alert>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Item', 'Type', 'Module', 'Owner', 'Review date', 'Overdue by', 'Still surfaced at'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {overdue.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <Link to={`/s11/item/${i.id}`} style={{ color: COLORS.primary, fontWeight: 600 }}>{i.code} · {i.title}</Link>
                    </TableCell>
                    <TableCell>{i.type}</TableCell>
                    <TableCell>{i.module}</TableCell>
                    <TableCell>{owner(i.ownerId)}</TableCell>
                    <TableCell>{i.reviewDate}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: COLORS.bad }}>
                      {reviewStatus(i.reviewDate).days} days
                    </TableCell>
                    <TableCell>{placementFor(i.type)?.live ? placementFor(i.type)!.placement : 'Library only'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Alert severity="warning" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
              Published here as well as in the owner's review queue, <i>so that stale content is visible to management
              and not only to the owner</i>. Note the last column: overdue material is <b>still governing work at the
              point of use</b>.
            </Alert>
          </>
        )}
      </SectionCard>

      <SectionCard title="Usage — which material is being consulted, and which is not">
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Item', 'Type', 'Surfaced at', 'Consultations this period'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {[...published].sort((a, b) => b.consultations - a.consultations).map((i) => (
              <TableRow key={i.id} sx={{ bgcolor: i.consultations === 0 ? '#FFF7ED' : undefined }}>
                <TableCell>{i.code} · {i.title}</TableCell>
                <TableCell>{i.type}</TableCell>
                <TableCell sx={{ color: placementFor(i.type)?.live ? undefined : COLORS.textSecondary }}>
                  {placementFor(i.type)?.live ? placementFor(i.type)!.placement : 'Library only'}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: i.consultations === 0 ? 700 : 400, color: i.consultations === 0 ? COLORS.attention : undefined }}>
                  {i.consultations}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
          <b>The value of this report is the zero rows.</b> {zero.length} published item
          {zero.length === 1 ? '' : 's'} {zero.length === 1 ? 'has' : 'have'} never been consulted. Reporting what is
          consulted flatters the library; reporting what is never consulted tells the business whether the placement
          configuration is wrong, whether the material is redundant, or whether people are still working from
          attachments.
        </Alert>
      </SectionCard>

      <PrototypeNote>
        All three are Core C11 report definitions in the built system; here they move as material is consulted at the
        point of work.
      </PrototypeNote>

      <BottomBar>
        <Button variant="outlined" component={Link} to="/s11">Back to the library</Button>
        <Button variant="outlined" component={Link} to="/s11/review">Review queue</Button>
      </BottomBar>
    </AppShell>
  );
}
