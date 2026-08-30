import React from 'react';
import {
  Alert, Box, Button, Chip, FormControl, InputLabel, MenuItem, OutlinedInput, Paper, Select, Stack, Switch,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  EmptyState, HandOffBanner, PageBanner, PlaceholderNote, SectionBand, WhiteButton
} from '../../components/shared';
import { CARD_CATALOGUE } from '../../mockData/c2';
import { REFRESH_CYCLES, RefreshCycle } from '../../mockData/c11';
import { ShellFooterNote } from '../../layouts/AppShell';

const ROLES = [
  'SYSTEM_ADMINISTRATOR', 'COUNTRY_MANAGER', 'COMPLIANCE_OFFICER', 'SOURCING_OFFICER',
  'EXECUTION_OFFICER', 'PROCESSING_SUPERVISOR', 'QUALITY_INSPECTOR'
];

/** 2.1 Dashboard Card Catalogue — WF-C11-02 / Steps 1, 3 */
export const CardCatalogue: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();

  return (
    <>
      <PageBanner
        title="Dashboard cards"
        breadcrumb={['Global', 'C11 Reporting and Dashboards', 'Dashboard cards']}
        subtitle="WF-C11-02 / Step 1 — every card defined with its measure, its filters, its permission requirement and its drill-through target"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c11/role-dashboards')}>Role defaults</WhiteButton>
            <WhiteButton onClick={() => navigate('/home')}>The dashboard itself</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <PlaceholderNote kind="consistency">
          {s.reportNotes.cards.replace('Integration consistency issue: ', '')}
        </PlaceholderNote>

        <Alert severity="info" sx={{ my: 2, fontSize: 12.5 }}>
          <b>One catalogue, not two.</b> This is the same catalogue the C02 home page reads. C11 adds the fields the
          workflow names — measure, filters, refresh cycle and last refresh — and edits it in place. Publishing a second
          catalogue would have produced two lists that drift, which is the mistake the C06 comments and C07 documents
          placeholders were retired to avoid.
        </Alert>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Cards, with the five things Step 1 requires</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Card</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Owning module</TableCell>
                <TableCell sx={{ fontSize: 12, width: 300 }}>Measure</TableCell>
                <TableCell sx={{ fontSize: 12, width: 240 }}>Filters</TableCell>
                <TableCell sx={{ fontSize: 12, width: 220 }}>Permission requirement</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Drill-through</TableCell>
                <TableCell sx={{ fontSize: 12, width: 140 }}>Refresh cycle</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Last refreshed</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Placed by</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {CARD_CATALOGUE.map((c) => {
                const e = s.cardEnrichmentFor(c.key);
                const stale = s.cardStale(c.key);
                const roles = s.cardRolesFor(c.key);
                return (
                  <TableRow key={c.key} hover>
                    <TableCell sx={{ fontSize: 12.5 }}>
                      {c.title}
                      {c.reportingOriented && (
                        <Chip size="small" label="reporting" variant="outlined" sx={{ ml: 0.5, height: 17, fontSize: 10 }} />
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{c.owningModule}</TableCell>
                    <TableCell>
                      <TextField size="small" fullWidth value={e?.measure ?? ''}
                                 inputProps={{ 'aria-label': `${c.key} measure` }}
                                 onChange={(ev) => s.saveCardEnrichment(c.key, { measure: ev.target.value })} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" fullWidth value={e?.filters ?? ''}
                                 onChange={(ev) => s.saveCardEnrichment(c.key, { filters: ev.target.value })} />
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" fullWidth>
                        <Select
                          multiple value={roles} input={<OutlinedInput />}
                          inputProps={{ 'aria-label': `${c.key} permission` }}
                          renderValue={(v) => ((v as string[]).includes('*')
                            ? 'Any role'
                            : (v as string[]).map((r) => r.replace(/_/g, ' ').toLowerCase()).join(', ') || 'None')}
                          onChange={(ev) => s.saveCardRoles(c.key, typeof ev.target.value === 'string' ? [ev.target.value] : ev.target.value)}
                        >
                          <MenuItem value="*" sx={{ fontSize: 13 }}>Any role</MenuItem>
                          {ROLES.map((r) => (
                            <MenuItem key={r} value={r} sx={{ fontSize: 13 }}>{r.replace(/_/g, ' ').toLowerCase()}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>
                      <Button size="small" onClick={() => navigate(c.drillTo)}>{c.drillTo}</Button>
                    </TableCell>
                    <TableCell>
                      <Select size="small" fullWidth value={e?.refreshCycle ?? 'On load'}
                              inputProps={{ 'aria-label': `${c.key} refresh cycle` }}
                              onChange={(ev) => s.saveCardEnrichment(c.key, { refreshCycle: ev.target.value as RefreshCycle })}>
                        {REFRESH_CYCLES.map((x) => <MenuItem key={x} value={x} sx={{ fontSize: 13 }}>{x}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>
                      {e?.lastRefreshed}
                      {stale && (
                        <Chip size="small" label="stale" sx={{ ml: 0.5, height: 18, fontSize: 10, bgcolor: `${tokens.amber}1A`, color: tokens.amber }} />
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{s.placedCount(c.key)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
              Step 3 says the last refresh time is displayed <i>so that no one acts on stale figures believing them
              current</i> — so the screen compares the time against the cycle and marks the card stale, because a
              timestamp nobody can compare against a cycle does not achieve that. Changing a card's permission changes
              what a user may place on their dashboard, because the shell reads this catalogue.
            </Typography>
          </Box>
        </Paper>

        <HandOffBanner
          label="HAND-OFF"
          target="C2 / WF-C2-02 Home Page and Dashboards"
          passed="The card definitions and their permission requirements"
          returned="The arrangement, saved per user per country — C11 defines the catalogue and the default; C02 renders and stores the arrangement"
          to="/home"
          goLabel="Open the dashboard"
        />
        <ShellFooterNote />
      </Box>
    </>
  );
};

/** 2.2 Role Default Dashboard — WF-C11-02 / Step 2 */
export const RoleDashboards: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [role, setRole] = React.useState('COMPLIANCE_OFFICER');
  const current = s.roleDefaults[role] ?? [];
  const counts = s.usersOnDefault(role);

  const permittedForRole = CARD_CATALOGUE.filter((c) => {
    const roles = s.cardRolesFor(c.key);
    return roles.includes('*') || roles.includes(role);
  });
  const notPermitted = CARD_CATALOGUE.filter((c) => !permittedForRole.some((p) => p.key === c.key));

  return (
    <>
      <PageBanner
        title="Role default dashboards"
        breadcrumb={['Global', 'C11 Reporting and Dashboards', 'Role defaults']}
        subtitle="WF-C11-02 / Step 2 — the default set a role lands on, before the user arranges anything"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c11/cards')}>Card catalogue</WhiteButton>
            <WhiteButton onClick={() => navigate('/home')}>The dashboard itself</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <PlaceholderNote kind="consistency">
          {s.reportNotes.cards.replace('Integration consistency issue: ', '')}
        </PlaceholderNote>

        <Paper variant="outlined" sx={{ mb: 2, mt: 2 }}>
          <SectionBand>Default cards per role</SectionBand>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 2, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 260 }}>
                <InputLabel>Role</InputLabel>
                <Select label="Role" value={role} inputProps={{ 'aria-label': 'Role' }}
                        onChange={(e) => setRole(e.target.value)}>
                  {ROLES.map((r) => <MenuItem key={r} value={r} sx={{ fontSize: 13 }}>{r.replace(/_/g, ' ').toLowerCase()}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 420 }}>
                <InputLabel>Default cards</InputLabel>
                <Select
                  multiple label="Default cards" value={current} input={<OutlinedInput label="Default cards" />}
                  inputProps={{ 'aria-label': 'Default cards' }}
                  renderValue={(v) => (v as string[]).map((k) => CARD_CATALOGUE.find((c) => c.key === k)?.title ?? k).join(', ')}
                  onChange={(e) => s.saveRoleDefault(role, typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
                >
                  {permittedForRole.map((c) => (
                    <MenuItem key={c.key} value={c.key} sx={{ fontSize: 13 }}>{c.title}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontSize: 12, width: 320 }}>Default cards</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>
                    {current.length
                      ? current.map((k) => CARD_CATALOGUE.find((c) => c.key === k)?.title ?? k).join(', ')
                      : 'None — a holder of this role lands on an empty dashboard'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Permitted but not default</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>
                    {permittedForRole.filter((c) => !current.includes(c.key)).map((c) => c.title).join(', ') || '—'}
                    <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
                      The user may add these themselves.
                    </Typography>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Not permitted</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>
                    {notPermitted.length === 0 ? '—' : notPermitted.map((c) => (
                      <div key={c.key}>
                        {c.title} — requires {s.cardRolesFor(c.key).map((r) => r.replace(/_/g, ' ').toLowerCase()).join(' or ')}
                      </div>
                    ))}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Holders on the default</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{counts.onDefault}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Holders who arranged their own</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>
                    {counts.arranged}
                    <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
                      Their arrangement is theirs: changing the default does not overwrite it.
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Alert severity="info" sx={{ mt: 2, fontSize: 12.5 }}>
              <b>Changing the default changes what the role lands on.</b> Add a card here, sign in as a holder of the role
              who has not arranged their own dashboard, and it is there. A holder who <i>has</i> arranged their own keeps
              their arrangement — which is the failure mode this screen invites and the one it avoids.
            </Alert>
          </Box>
        </Paper>

        <HandOffBanner
          label="HAND-OFF"
          target="C2 / WF-C2-02 Home Page and Dashboards"
          passed="The default card set per role"
          returned="The user's own arrangement, saved per user per country and never overwritten by a default change"
          to="/home"
          goLabel="Open the dashboard"
        />
        <ShellFooterNote />
      </Box>
    </>
  );
};
