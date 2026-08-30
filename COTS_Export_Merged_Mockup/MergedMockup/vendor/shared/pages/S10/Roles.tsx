import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import {
  BottomBar, BusinessConfirmation, HandOffBanner, PrototypeNote, ReadOnlyField, SectionCard, TraceNote,
} from '../../components/shared';
import { useStore } from '../../state/store';
import { useS10 } from '../../state/s10store';
import { countryOf, nodeById } from '../../mockData/s10';
import { COLORS } from '../../theme';
import { ProposalBanner } from './Structure';

/* ============================================ S10-SC-08 assignment matrix */

export default function RoleMatrix() {
  const { country: activeCountry, say } = useStore();
  const { nodes, people, roles, resolve, assign } = useS10();

  const countries = nodes.filter((n) => n.type === 'Country' && n.active);
  const areasOf = (c: string) => nodes.filter((n) => n.type === 'Operational area' && n.active && countryOf(n.id) === c);

  const [edit, setEdit] = React.useState<{ roleId: string; country: string; areaId?: string; where: string } | null>(null);
  const [pick, setPick] = React.useState('');

  const cell = (roleId: string, country: string, areaId?: string) => {
    const r = resolve(roleId, country, areaId);
    if (r.ok) {
      return (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.person!.name}</Typography>
          <Chip size="small" label={r.account} sx={{ height: 17, fontSize: '0.6rem', bgcolor: '#E8F5E9', color: COLORS.good }} />
        </Stack>
      );
    }
    const label = !r.matched
      ? 'No holder'
      : r.person && !r.person.active
        ? `${r.person.name} — inactive`
        : `${r.person?.name} — no account`;
    return (
      <Tooltip title={r.reason ?? ''}>
        <Chip
          size="small" icon={<WarningAmberIcon sx={{ fontSize: 14 }} />} label={label}
          sx={{ height: 20, bgcolor: '#FDECEA', color: COLORS.bad, fontWeight: 700 }}
        />
      </Tooltip>
    );
  };

  return (
    <AppShell title="Role assignment" breadcrumb={[activeCountry, 'Shared Modules', 'Team Directory', 'Role assignment']} showSeason={false}>
      <ProposalBanner />

      <Alert severity="info" sx={{ mb: 2, fontSize: '0.82rem' }}>
        This is the screen that makes the module's value concrete. The <b>used by</b> column names what actually stops
        when a cell is empty — a real workflow in another module that cannot complete.
      </Alert>

      <SectionCard title="S10-SC-08 · Role assignment matrix">
        <TraceNote workflow="WF-S10-03 / Steps 1–2 — C4 Approval or C5 Notifications requests the holder of a role for a country or area; COTS resolves it through the structure and the directory" />
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, minWidth: 200 }}>Role · scope</TableCell>
                <TableCell sx={{ fontWeight: 600, minWidth: 280 }}>Used by — what stops if this does not resolve</TableCell>
                {countries.map((c) => (
                  <TableCell key={c.id} sx={{ fontWeight: 600, minWidth: 200 }}>{c.name}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{role.name}</Typography>
                    <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>{role.scope} scope</Typography>
                  </TableCell>
                  <TableCell>
                    {role.usedBy.map((u) => (
                      <Typography key={u.label} variant="caption" sx={{ display: 'block' }}>
                        · {u.to ? <Link to={u.to} style={{ color: COLORS.primary }}>{u.label}</Link> : u.label}
                      </Typography>
                    ))}
                  </TableCell>
                  {countries.map((c) => (
                    <TableCell key={c.id}>
                      {role.scope === 'Country' ? (
                        <Box
                          onClick={() => { setEdit({ roleId: role.id, country: c.name, where: c.name }); setPick(''); }}
                          sx={{ cursor: 'pointer' }}
                        >
                          {cell(role.id, c.name)}
                        </Box>
                      ) : (
                        <Stack spacing={0.5}>
                          {areasOf(c.name).map((a) => (
                            <Box
                              key={a.id}
                              onClick={() => { setEdit({ roleId: role.id, country: c.name, areaId: a.id, where: `${c.name} · ${a.name}` }); setPick(''); }}
                              sx={{ cursor: 'pointer' }}
                            >
                              <Typography variant="caption" sx={{ color: COLORS.textSecondary, display: 'block' }}>{a.name}</Typography>
                              {cell(role.id, c.name, a.id)}
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mt: 1 }}>
          An empty cell is rendered as a <b>risk marker, not a blank</b>. Click any cell to assign or change the
          holder; the change is audited.
        </Typography>
      </SectionCard>

      <HandOffBanner
        to="C4 Approval and C5 Notifications"
        passes="the resolved role holder and the linked user account"
        returns="nothing — the engines consume the structure as their structural reference"
        resumes="Where the role does not resolve, the gap is surfaced as an operational risk"
        linkLabel="Open the resolution trace"
        linkTo="/s10/resolution"
      />

      <BottomBar>
        <Button variant="outlined" component={Link} to="/s10">Organisation structure</Button>
        <Button variant="outlined" component={Link} to="/s10/resolution">Resolution trace</Button>
        <Button variant="contained" component={Link} to="/s10/gaps">Roles without a holder</Button>
      </BottomBar>

      <Dialog open={!!edit} onClose={() => setEdit(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign the role holder</DialogTitle>
        <DialogContent>
          <TraceNote workflow="WF-S10-03 / Step 4 — a change to an assignment that affects role resolution is audited, so who held a role when a past approval was given can always be established" />
          {edit && (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mt: 1 }}>
                <ReadOnlyField label="Role" value={roles.find((r) => r.id === edit.roleId)?.name ?? ''} />
                <ReadOnlyField label="Where" value={edit.where} />
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Holder</Typography>
                <Select size="small" fullWidth displayEmpty value={pick} onChange={(e) => setPick(e.target.value)} sx={{ mt: 0.5 }}>
                  <MenuItem value=""><em>Select a person</em></MenuItem>
                  {people.filter((p) => p.active).map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name} · {p.position} · {countryOf(p.areaId)}
                      {!p.userAccount ? ' · no system user' : ''}
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                  Inactive people are not offered. A person without a system account can be selected — they can be
                  notified, but they cannot approve, and the risk report will say so.
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdit(null)}>Cancel</Button>
          <Tooltip title={!pick ? 'Select a person.' : ''}>
            <span>
              <Button
                variant="contained" disabled={!pick}
                onClick={() => {
                  assign(edit!.roleId, edit!.country, edit!.areaId, pick);
                  say(`${roles.find((r) => r.id === edit!.roleId)?.name} assigned for ${edit!.where}. The change is audited.`);
                  setEdit(null);
                }}
              >
                Assign, effective today
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}

/* ============================================== S10-SC-09 resolution trace */

export function ResolutionTrace() {
  const { country: activeCountry } = useStore();
  const { nodes, roles, resolve, resolveAsAt } = useS10();

  const countries = nodes.filter((n) => n.type === 'Country' && n.active);
  const [roleId, setRoleId] = React.useState('R-1');
  const [country, setCountry] = React.useState('Sudan');
  const [areaId, setAreaId] = React.useState('');
  const [asAt, setAsAt] = React.useState('14-Jul-2026');

  const role = roles.find((r) => r.id === roleId)!;
  const areas = nodes.filter((n) => n.type === 'Operational area' && n.active && countryOf(n.id) === country);
  const effectiveArea = role.scope === 'Operational area' ? (areaId || areas[0]?.id) : undefined;
  const r = resolve(roleId, country, effectiveArea);
  const past = resolveAsAt(roleId, country, asAt);

  return (
    <AppShell title="Role resolution trace" breadcrumb={[activeCountry, 'Shared Modules', 'Team Directory', 'Resolution trace']} showSeason={false}>
      <ProposalBanner />

      <SectionCard title="S10-SC-09 · How a role resolves">
        <TraceNote workflow="WF-S10-03 / Step 2 — COTS resolves the role to a person through the organisation structure and the team directory, returning the linked user account" />

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mt: 1 }}>
          <Box>
            <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Role requested</Typography>
            <Select size="small" fullWidth value={roleId} onChange={(e) => { setRoleId(e.target.value); setAreaId(''); }} sx={{ mt: 0.5 }}>
              {roles.map((x) => <MenuItem key={x.id} value={x.id}>{x.name}</MenuItem>)}
            </Select>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Country</Typography>
            <Select size="small" fullWidth value={country} onChange={(e) => { setCountry(e.target.value); setAreaId(''); }} sx={{ mt: 0.5 }}>
              {countries.map((c) => <MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>)}
            </Select>
          </Box>
          {role.scope === 'Operational area' && (
            <Box>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Operational area</Typography>
              <Select size="small" fullWidth value={effectiveArea ?? ''} onChange={(e) => setAreaId(e.target.value)} sx={{ mt: 0.5 }}>
                {areas.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
              </Select>
            </Box>
          )}
        </Box>

        <Box sx={{ mt: 2, border: `1px solid ${COLORS.border}`, borderRadius: 1, p: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary, display: 'block' }}>
            THE REQUEST
          </Typography>
          <Typography variant="body2">
            C4 Approval requests: <b>{role.name}</b>, {country}
            {effectiveArea ? `, ${nodeById(effectiveArea)?.name}` : ''}
          </Typography>

          <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary, display: 'block', mt: 1.5 }}>
            RESOLUTION PATH
          </Typography>
          {r.path.map((p, i) => (
            <Typography key={p} variant="body2">{i + 1}. {p}</Typography>
          ))}
          {r.matched && (
            <Typography variant="body2">
              {r.path.length + 1}. Assignment matched — effective from {r.matched.effectiveFrom}
            </Typography>
          )}

          <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary, display: 'block', mt: 1.5 }}>
            OUTCOME
          </Typography>
          {r.ok ? (
            <Alert severity="success" sx={{ fontSize: '0.82rem' }}>
              Resolved to <b>{r.person!.name}</b> ({r.person!.position}), user account <b>{r.account}</b>.
            </Alert>
          ) : (
            <Alert severity="error" sx={{ fontSize: '0.82rem' }}>
              <b>Not resolved.</b> {r.reason}
              <Box sx={{ mt: 0.5 }}>
                What depends on it: {role.usedBy.map((u) => u.label).join(' · ')}
              </Box>
              <Button size="small" variant="contained" component={Link} to="/s10/gaps" sx={{ mt: 1 }}>
                Open the operational risk report
              </Button>
            </Alert>
          )}
        </Box>

        <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
          <b>Escalation and fallback are deliberately absent.</b> Where a role does not resolve, the prototype reports
          the gap; it does not invent an escalation to a parent country or a default approver. The source treats the
          gap as an operational risk — which means someone must fix the assignment, not that the system should quietly
          route elsewhere.
        </Alert>
      </SectionCard>

      <SectionCard title="Resolution as at a past date — who held the role when that approval was given">
        <TraceNote workflow="WF-S10-03 / Step 4 — it must always be possible to establish who held a role when a past approval was given" />
        <Stack direction="row" spacing={2} alignItems="flex-end">
          <Box>
            <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Resolve as at</Typography>
            <TextField size="small" sx={{ mt: 0.5, width: 200 }} value={asAt} onChange={(e) => setAsAt(e.target.value)} />
          </Box>
          <Typography variant="caption" sx={{ color: COLORS.textSecondary, pb: 1 }}>
            Try 14-Jul-2026, 15-Jan-2026 or 01-Nov-2025.
          </Typography>
        </Stack>

        {past?.person ? (
          <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.82rem' }}>
            On <b>{asAt}</b>, <b>{role.name}</b> in {country} was held by <b>{past.person.name}</b> — from the
            assignment effective {past.from} to {past.to}. The answer names the assignment record and its effective
            dates rather than asserting it.
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mt: 1.5, fontSize: '0.82rem' }}>
            No assignment was in force for <b>{role.name}</b> in {country} on {asAt}. An approval given on that date
            could not have resolved through this role.
          </Alert>
        )}
      </SectionCard>

      <BottomBar>
        <Button variant="outlined" component={Link} to="/s10/roles">Role assignment matrix</Button>
        <Button variant="outlined" component={Link} to="/s10">Change audit</Button>
      </BottomBar>
    </AppShell>
  );
}

/* ================================================= S10-SC-10 risk report */

export function RoleGaps() {
  const { country: activeCountry } = useStore();
  const { gaps } = useS10();

  const order = [
    'Country with no named administrator',
    'Assigned to an inactive person',
    'Not assigned',
    'Assigned but not a system user',
    'Area with no leading team',
  ];
  const sorted = [...gaps].sort((a, b) => order.indexOf(a.condition) - order.indexOf(b.condition));
  const counts = order.map((c) => ({ condition: c, n: gaps.filter((g) => g.condition === c).length }));

  const colour = (c: string) =>
    c === 'Country with no named administrator' || c === 'Assigned to an inactive person' ? COLORS.bad : COLORS.attention;

  return (
    <AppShell title="Roles without an assigned holder" breadcrumb={[activeCountry, 'Shared Modules', 'Team Directory', 'Operational risk']} showSeason={false}>
      <ProposalBanner />

      <TraceNote workflow="WF-S10-03 / Step 3 — where a role has no assigned holder the approval or notification cannot be resolved, and the gap is surfaced as an operational risk" />

      <Alert severity="error" sx={{ mb: 2, fontSize: '0.85rem' }}>
        <b>{gaps.length} gaps.</b> Each one is an approval or a notification that cannot reach anybody. This is the
        module's most important screen for management — the source itself calls it an operational risk report.
      </Alert>

      <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap' }}>
        {counts.map((c) => (
          <Box key={c.condition} sx={{ border: `1px solid ${COLORS.border}`, bgcolor: '#fff', borderRadius: 1, px: 1.5, py: 1, minWidth: 200, flex: '1 1 200px' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: c.n ? colour(c.condition) : COLORS.good, lineHeight: 1.2 }}>
              {c.n}
            </Typography>
            <Typography variant="caption" sx={{ color: COLORS.textSecondary, fontWeight: 600 }}>{c.condition}</Typography>
          </Box>
        ))}
      </Stack>

      <SectionCard title="S10-SC-10 · Operational risk — four conditions, not one">
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Role', 'Country · area', 'Condition', 'Depends on it', 'What actually stops', 'Since', 'Owner'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((g, i) => (
              <TableRow key={i} sx={{ bgcolor: g.condition === 'Country with no named administrator' ? '#FDECEA' : undefined }}>
                <TableCell sx={{ fontWeight: 600 }}>{g.role}</TableCell>
                <TableCell>{g.where}</TableCell>
                <TableCell>
                  <Chip size="small" label={g.condition} sx={{ height: 19, color: '#fff', bgcolor: colour(g.condition), fontWeight: 600 }} />
                </TableCell>
                <TableCell>
                  {g.dependsOn.map((d) => (
                    <Typography key={d.label} variant="caption" sx={{ display: 'block' }}>
                      · {d.to ? <Link to={d.to} style={{ color: COLORS.primary }}>{d.label}</Link> : d.label}
                    </Typography>
                  ))}
                </TableCell>
                <TableCell sx={{ color: COLORS.textSecondary }}>{g.consequence}</TableCell>
                <TableCell>{g.since}</TableCell>
                <TableCell sx={{ color: g.owner.includes('not assigned') ? COLORS.bad : undefined, fontWeight: g.owner.includes('not assigned') ? 700 : 400 }}>
                  {g.owner}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
          <b>Four conditions, not one.</b> A role with nobody assigned is the obvious case. The other three surprise
          people: a holder with no system account cannot approve, a holder who has left is still assigned, and an area
          with no leading team has no answer to who is responsible. Reporting only the first would give false comfort.
          <Box sx={{ mt: 0.5 }}>
            Where the <b>country administrator itself is unassigned</b> the report says so and orders that row first —
            a gap with no named owner is worse than a gap with one.
          </Box>
        </Alert>

        <PrototypeNote>
          an Actions Inbox item is raised for each gap against the country administrator (C5, simulated).
        </PrototypeNote>
      </SectionCard>

      <BottomBar>
        <Button variant="contained" component={Link} to="/s10/roles">Fix an assignment</Button>
        <Button variant="outlined" component={Link} to="/s10/leadership">Area leadership</Button>
        <Button variant="outlined" component={Link} to="/s10/reports">Reporting</Button>
      </BottomBar>
    </AppShell>
  );
}

/* =================================================== S10-SC-13 reporting */

export function DirectoryReports() {
  const { country: activeCountry } = useStore();
  const { nodes, people, leadership, gaps, showExternalPartners } = useS10();

  const countries = nodes.filter((n) => n.type === 'Country');
  const visible = people.filter((p) => showExternalPartners || p.contactType !== 'External partner');
  const nonUsers = visible.filter((p) => !p.userAccount).length;
  const areas = nodes.filter((n) => n.type === 'Operational area' && n.active);

  return (
    <AppShell title="Structure and contact reporting" breadcrumb={[activeCountry, 'Shared Modules', 'Team Directory', 'Reporting']} showSeason={false}>
      <ProposalBanner />

      <TraceNote workflow="WF-S10-01 / Step 4 and WF-S10-02 / Step 5 — the organisation structure by country and area, and the contact list by area and team, published through C11" />

      <SectionCard title="Organisation structure by country and area">
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Country', 'Departments', 'Operational areas', 'People', 'Named administrator', 'Active'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {countries.map((c) => {
              const deps = nodes.filter((n) => n.parent === c.id && n.type === 'Department');
              const ars = areas.filter((a) => countryOf(a.id) === c.name);
              const pp = visible.filter((p) => countryOf(p.areaId) === c.name);
              const admin = people.find((p) => p.id === c.administrator);
              return (
                <TableRow key={c.id}>
                  <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                  <TableCell align="right">{deps.length}</TableCell>
                  <TableCell align="right">{ars.length}</TableCell>
                  <TableCell align="right">{pp.length}</TableCell>
                  <TableCell sx={{ color: admin ? undefined : COLORS.bad, fontWeight: admin ? 400 : 700 }}>
                    {admin?.name ?? 'Not assigned'}
                  </TableCell>
                  <TableCell>{c.active ? 'Active' : 'Closed'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </SectionCard>

      <SectionCard title="Contact list by area and team">
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Area', 'Country', 'Leading team', 'People', 'Contacts who are not system users'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {areas.map((a) => {
              const l = leadership.find((x) => x.areaId === a.id && !x.superseded);
              const pp = visible.filter((p) => p.areaId === a.id);
              return (
                <TableRow key={a.id}>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>{countryOf(a.id)}</TableCell>
                  <TableCell sx={{ color: l ? undefined : COLORS.bad, fontWeight: l ? 400 : 700 }}>
                    {l?.team ?? 'No leading team identified'}
                  </TableCell>
                  <TableCell align="right">{pp.length}</TableCell>
                  <TableCell align="right">{pp.filter((p) => !p.userAccount).length}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mt: 0.5 }}>
          <b>{nonUsers} of {visible.length}</b> people held are not system users. The count is stated because it
          matters for countries where not every contact has an account.
        </Typography>
      </SectionCard>

      <SectionCard title="Roles without an assigned holder">
        <Typography variant="body2">
          <b>{gaps.length} gaps</b> across {countries.filter((c) => c.active).length} active countries.
        </Typography>
        <Alert severity="warning" sx={{ mt: 1, fontSize: '0.8rem' }}>
          Listed here as well as on the administrator screen, because it is a management report — an unresolvable
          approval is an operational risk, not an administrative housekeeping item.
        </Alert>
        <Button size="small" variant="contained" component={Link} to="/s10/gaps" sx={{ mt: 1 }}>
          Open the operational risk report
        </Button>
      </SectionCard>

      <PrototypeNote>
        All three are Core C11 report definitions in the built system; here they are computed from the prototype's
        mock data, so an assignment made on the matrix moves these figures immediately.
      </PrototypeNote>

      <BottomBar>
        <Button variant="outlined" component={Link} to="/s10">Organisation structure</Button>
        <Button variant="outlined" component={Link} to="/s10/directory">Team directory</Button>
      </BottomBar>
    </AppShell>
  );
}
