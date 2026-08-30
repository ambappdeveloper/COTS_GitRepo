import React from 'react';
import {
  Alert, Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Drawer,
  FormControlLabel, MenuItem, Select, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { DataTable, type Column } from '../../components/DataTable';
import {
  BottomBar, BusinessConfirmation, EmptyState, HandOffBanner, PrototypeNote, ReadOnlyField, RequiredLabel,
  SectionCard, TraceNote,
} from '../../components/shared';
import { useStore } from '../../state/store';
import { useS10 } from '../../state/s10store';
import {
  UNLINKED_ACCOUNTS, countryOf, nodeById, type Person,
} from '../../mockData/s10';
import { COLORS } from '../../theme';
import { ProposalBanner, SourceChip, SourceControl } from './Structure';

/* ================================================= S10-SC-11 person card */

export function PersonCard({ person, onClose }: { person: Person | null; onClose: () => void }) {
  const { assignments, roles, leadership } = useS10();
  if (!person) return null;
  const held = assignments.filter((a) => a.personId === person.id);
  const leads = leadership.filter((l) => !l.superseded && (l.contactPersonId === person.id || l.deputyPersonId === person.id));

  return (
    <Drawer anchor="right" open={!!person} onClose={onClose}>
      <Box sx={{ width: 380, p: 2 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>
          S10-SC-11 · PERSON CARD (CORE C2 INFOCARD)
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1.5 }}>
          <Avatar sx={{ bgcolor: COLORS.primary, width: 52, height: 52, fontWeight: 700 }}>{person.initials}</Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{person.name}</Typography>
            <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>{person.position}</Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={0.5} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
          <Chip size="small" label={person.contactType} sx={{ height: 20, bgcolor: '#EEF4FA', color: COLORS.primaryDark, fontWeight: 600 }} />
          {person.userAccount
            ? <Chip size="small" label={`User: ${person.userAccount}`} sx={{ height: 20, bgcolor: '#E8F5E9', color: COLORS.good, fontWeight: 600 }} />
            : <Chip size="small" label="No system user" sx={{ height: 20, bgcolor: '#FFF4E5', color: COLORS.attention, fontWeight: 700 }} />}
          {!person.active && <Chip size="small" label={`Left ${person.leftOn}`} sx={{ height: 20, bgcolor: '#FDECEA', color: COLORS.bad, fontWeight: 700 }} />}
        </Stack>

        <Box sx={{ mt: 2, display: 'grid', gap: 1.2 }}>
          <ReadOnlyField label="Area · department" value={nodeById(person.areaId)?.name ?? '—'} />
          <ReadOnlyField label="Country" value={countryOf(person.areaId)} />
          <ReadOnlyField label="Telephone" value={person.telephone} />
          <ReadOnlyField label="Email" value={person.email} />
          <ReadOnlyField label="Job description" value={person.jobDescription} />
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>ROLES HELD</Typography>
          {held.length === 0 ? (
            <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>None</Typography>
          ) : held.map((a) => (
            <Typography key={a.roleId + (a.areaId ?? '')} variant="body2">
              · {roles.find((r) => r.id === a.roleId)?.name} — {a.areaId ? nodeById(a.areaId)?.name : a.country}
            </Typography>
          ))}
        </Box>

        {leads.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>LEADING TEAM</Typography>
            {leads.map((l) => (
              <Typography key={l.id} variant="body2">
                · {l.team} — {l.contactPersonId === person.id ? 'contact person' : 'deputy'}
              </Typography>
            ))}
          </Box>
        )}

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button size="small" variant="contained" component={Link} to={`/s10/person/${person.id}`} onClick={onClose}>
            Open the full record
          </Button>
          <Button size="small" onClick={onClose}>Close</Button>
        </Stack>
        <PrototypeNote>
          this same card opens from a person's name anywhere in COTS, without leaving the screen — which is the
          concrete demonstration that contact details are held once.
        </PrototypeNote>
      </Box>
    </Drawer>
  );
}

/* ======================================= S10-SC-04 / 12 directory + search */

export default function Directory() {
  const { country: activeCountry } = useStore();
  const { people, assignments, roles, leadership, showExternalPartners, setShowExternalPartners, editable } = useS10();
  const nav = useNavigate();

  const [card, setCard] = React.useState<Person | null>(null);
  const [query, setQuery] = React.useState('');

  const visible = people.filter((p) => showExternalPartners || p.contactType !== 'External partner');
  const nonUsers = visible.filter((p) => !p.userAccount).length;

  // S10-SC-12 — one field across the four dimensions the source names
  const matchOf = (p: Person): string | null => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    if (p.name.toLowerCase().includes(q)) return 'name';
    if (p.position.toLowerCase().includes(q)) return 'position';
    if ((nodeById(p.areaId)?.name ?? '').toLowerCase().includes(q)) return 'area';
    if (countryOf(p.areaId).toLowerCase().includes(q)) return 'country';
    return null;
  };
  const peopleHits = query ? visible.map((p) => ({ p, m: matchOf(p) })).filter((x) => x.m) : [];
  const leadHits = query
    ? leadership.filter((l) => !l.superseded && (
        l.team.toLowerCase().includes(query.toLowerCase()) ||
        (nodeById(l.areaId)?.name ?? '').toLowerCase().includes(query.toLowerCase())))
    : [];

  const columns: Column<Person>[] = [
    {
      key: 'name', label: 'Name', filterable: true,
      render: (r) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: r.active ? COLORS.primary : COLORS.neutral }}>{r.initials}</Avatar>
          <Box component="span" onClick={() => setCard(r)} sx={{ color: COLORS.primary, fontWeight: 600, cursor: 'pointer' }}>
            {r.name}
          </Box>
        </Stack>
      ),
      value: (r) => r.name,
    },
    { key: 'position', label: 'Position', filterable: true, value: (r) => r.position },
    { key: 'area', label: 'Area · department', render: (r) => nodeById(r.areaId)?.name ?? '—', value: (r) => nodeById(r.areaId)?.name ?? '' },
    { key: 'country', label: 'Country', filterable: true, render: (r) => countryOf(r.areaId), value: (r) => countryOf(r.areaId) },
    { key: 'telephone', label: 'Telephone', value: (r) => r.telephone },
    { key: 'email', label: 'Email', value: (r) => r.email },
    {
      key: 'contactType', label: 'Contact type', filterable: true,
      render: (r) => (
        <Chip
          size="small" label={r.contactType}
          sx={{
            height: 19, fontWeight: 600,
            bgcolor: r.contactType === 'External partner' ? '#FFF4E5' : '#EEF4FA',
            color: r.contactType === 'External partner' ? COLORS.attention : COLORS.primaryDark,
          }}
        />
      ),
      value: (r) => r.contactType,
    },
    {
      key: 'user', label: 'System user',
      render: (r) => (r.userAccount
        ? r.userAccount
        : <Chip size="small" label="No system user" sx={{ height: 19, bgcolor: '#FFF4E5', color: COLORS.attention, fontWeight: 700 }} />),
      value: (r) => r.userAccount ?? '',
    },
    {
      key: 'roles', label: 'Roles held',
      render: (r) => assignments.filter((a) => a.personId === r.id)
        .map((a) => `${roles.find((x) => x.id === a.roleId)?.name} (${a.areaId ? nodeById(a.areaId)?.name : a.country})`).join(', ') || '—',
      value: (r) => assignments.filter((a) => a.personId === r.id).length,
    },
    {
      key: 'active', label: 'Active',
      render: (r) => (r.active ? 'Active' : <Chip size="small" label={`Left ${r.leftOn}`} sx={{ height: 19, bgcolor: '#FDECEA', color: COLORS.bad, fontWeight: 700 }} />),
      value: (r) => (r.active ? 'Active' : 'Inactive'),
    },
  ];

  return (
    <AppShell title="Team directory" breadcrumb={[activeCountry, 'Shared Modules', 'Team Directory', 'Directory']} showSeason={false}>
      <ProposalBanner />
      <SourceControl />

      {/* S10-SC-12 */}
      <SectionCard title="S10-SC-12 · Directory search from the point of work">
        <TraceNote workflow="WF-S10-04 / Steps 1–2 — search by name, position, area or country; results cover people and area leadership entries" />
        <TextField
          size="small" fullWidth sx={{ mt: 1 }}
          placeholder="Search by name, position, area or country"
          value={query} onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <Box sx={{ mt: 1.5 }}>
            {peopleHits.length === 0 && leadHits.length === 0 ? (
              <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                No match. Searched across <b>name, position, area and country</b> — the four dimensions the source
                names — so a failed search is diagnosable.
              </Alert>
            ) : (
              <>
                {peopleHits.map(({ p, m }) => (
                  <Stack key={p.id} direction="row" spacing={1.5} alignItems="center" sx={{ py: 0.6, borderBottom: `1px solid ${COLORS.border}` }}>
                    <Avatar sx={{ width: 30, height: 30, fontSize: '0.75rem', bgcolor: COLORS.primary }}>{p.initials}</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.name}</Typography>
                      <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                        {p.position} · {nodeById(p.areaId)?.name} · {countryOf(p.areaId)} · {p.telephone}
                      </Typography>
                    </Box>
                    <Chip size="small" label={`matched on ${m}`} sx={{ height: 18, fontSize: '0.62rem', bgcolor: '#EEF4FA', color: COLORS.primaryDark }} />
                    <Button size="small" onClick={() => setCard(p)}>Person card</Button>
                  </Stack>
                ))}
                {leadHits.map((l) => (
                  <Stack key={l.id} direction="row" spacing={1.5} alignItems="center" sx={{ py: 0.6, borderBottom: `1px solid ${COLORS.border}` }}>
                    <Chip size="small" label="Leading team" sx={{ height: 20, bgcolor: '#E8F5E9', color: COLORS.good, fontWeight: 700 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{l.team}</Typography>
                      <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                        {nodeById(l.areaId)?.name} · contact {people.find((p) => p.id === l.contactPersonId)?.name}
                      </Typography>
                    </Box>
                    <Button size="small" component={Link} to="/s10/leadership">Open leadership</Button>
                  </Stack>
                ))}
              </>
            )}
          </Box>
        )}
      </SectionCard>

      <BusinessConfirmation>
        Confirm whether external partner contacts appear in the team directory, or only in party master data.
        <PrototypeNote>
          external partners are included so the consequence is visible — they appear in search results and person
          cards alongside colleagues. The alternative is to hold them only as contacts against the party in C3 master
          data. Neither is presented as decided; the filter below shows the directory both ways.
        </PrototypeNote>
      </BusinessConfirmation>

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
        <FormControlLabel
          control={<Switch size="small" checked={showExternalPartners} onChange={(e) => setShowExternalPartners(e.target.checked)} />}
          label={<Typography variant="caption" sx={{ color: COLORS.attention, fontWeight: 700 }}>PROTOTYPE — include external partner contacts</Typography>}
        />
        <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
          {visible.length} people held · <b>{nonUsers} are not system users</b>
        </Typography>
      </Stack>

      <SectionCard title="S10-SC-04 · Team directory" right={<SourceChip />}>
        <TraceNote workflow="WF-S10-02 / Step 1 — name, position, telephone, email, profile picture, job description, area and active indicator" />
        <DataTable
          columns={columns}
          rows={visible}
          onNew={editable ? () => nav('/s10/person/new') : undefined}
          newLabel="Add a person"
          toolbarNote="Group by area or country. Contacts who are not system users are held here too — it matters for countries where not every contact has an account."
        />
      </SectionCard>

      <SectionCard title="Unlinked user accounts">
        <TraceNote workflow="WF-S10-02 / Step 2 — an account with no directory entry cannot be resolved from a role" />
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          {UNLINKED_ACCOUNTS.map((a) => (
            <Chip key={a} size="small" label={a} sx={{ bgcolor: '#FFF4E5', color: COLORS.attention, fontWeight: 700 }} />
          ))}
        </Stack>
        <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mt: 0.5 }}>
          These C1 accounts have no directory entry, so no role can resolve to them.
        </Typography>
      </SectionCard>

      <HandOffBanner
        to="S08 Projects"
        passes="the same directory records"
        returns="project team membership held against the person"
        resumes="Project assignment resolves to the same people as approvals and notifications"
        linkLabel="Open S08 Projects"
        linkTo="/s08"
      />

      <BottomBar>
        <Button variant="outlined" component={Link} to="/s10">Organisation structure</Button>
        <Button variant="outlined" component={Link} to="/s10/leadership">Area leadership</Button>
        <Button variant="outlined" component={Link} to="/s10/roles">Role assignment matrix</Button>
      </BottomBar>

      <PersonCard person={card} onClose={() => setCard(null)} />
    </AppShell>
  );
}

/* ================================== S10-SC-05 / 06 person record + account */

export function PersonRecord() {
  const { id } = useParams();
  const { country: activeCountry, say } = useStore();
  const { people, assignments, roles, editable, mandatory, updatePerson } = useS10();
  const nav = useNavigate();

  const person = people.find((p) => p.id === id);
  const [blocked, setBlocked] = React.useState<string[] | null>(null);

  if (!person) {
    return (
      <AppShell title="Person" breadcrumb={[activeCountry, 'Shared Modules', 'Team Directory']} showSeason={false}>
        <ProposalBanner />
        <Alert severity="info">
          {id === 'new'
            ? 'A new person record would open here. The prototype demonstrates maintenance on the existing records.'
            : 'No person with that reference exists in the prototype data.'}
        </Alert>
        <Button component={Link} to="/s10/directory" variant="outlined" sx={{ mt: 2 }}>Back to the directory</Button>
      </AppShell>
    );
  }

  const held = assignments.filter((a) => a.personId === person.id);
  const req = (attr: string) => mandatory.find((m) => m.attribute === attr)?.mandatory ?? false;

  const tryDeactivate = () => {
    if (held.length) {
      setBlocked(held.map((a) => `${roles.find((r) => r.id === a.roleId)?.name} — ${a.areaId ? nodeById(a.areaId)?.name : a.country}`));
      return;
    }
    updatePerson(person.id, { active: false, leftOn: '19-Aug-2026' });
    say(`${person.name} deactivated. The record is retained, because past approvals resolved to them.`);
  };

  return (
    <AppShell title={person.name} breadcrumb={[activeCountry, 'Shared Modules', 'Team Directory', person.name]} showSeason={false}>
      <ProposalBanner />

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 520px', minWidth: 420 }}>
          <SectionCard title="S10-SC-05 · Person record" right={<SourceChip />}>
            <TraceNote workflow="WF-S10-02 / Step 1 — the person in the team directory with their contact details, area and active indicator" />

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: COLORS.primary, fontWeight: 700 }}>{person.initials}</Avatar>
              <Box>
                <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                  Profile picture {req('Profile picture') ? '(required)' : '(optional)'}
                </Typography>
                <Box>
                  <Button size="small" variant="outlined" disabled={!editable}>Upload (simulated)</Button>
                </Box>
              </Box>
            </Stack>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              <Box>
                <RequiredLabel label="Name" required />
                <TextField size="small" fullWidth sx={{ mt: 0.5 }} value={person.name} disabled={!editable}
                  onChange={(e) => updatePerson(person.id, { name: e.target.value })} />
              </Box>
              <Box>
                <RequiredLabel label="Position" required />
                <TextField size="small" fullWidth sx={{ mt: 0.5 }} value={person.position} disabled={!editable}
                  onChange={(e) => updatePerson(person.id, { position: e.target.value })} />
              </Box>
              <Box>
                <RequiredLabel label="Telephone" required={req('Telephone')} />
                <TextField size="small" fullWidth sx={{ mt: 0.5 }} value={person.telephone} disabled={!editable}
                  onChange={(e) => updatePerson(person.id, { telephone: e.target.value })} />
              </Box>
              <Box>
                <RequiredLabel label="Email" required={req('Email')} />
                <TextField
                  size="small" fullWidth sx={{ mt: 0.5 }} value={person.email}
                  disabled={!editable || !!person.userAccount}
                  onChange={(e) => updatePerson(person.id, { email: e.target.value })}
                />
                {person.userAccount && (
                  <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                    Read-only — owned by the linked C1 account
                  </Typography>
                )}
              </Box>
              <ReadOnlyField label="Area · department" value={nodeById(person.areaId)?.name ?? '—'} />
              <ReadOnlyField label="Country" value={countryOf(person.areaId)} />
            </Box>

            <Box sx={{ mt: 2 }}>
              <RequiredLabel label="Job description" required={req('Job description')} />
              <TextField
                size="small" fullWidth multiline minRows={2} sx={{ mt: 0.5 }} value={person.jobDescription}
                disabled={!editable} onChange={(e) => updatePerson(person.id, { jobDescription: e.target.value })}
              />
            </Box>

            <Alert severity="info" sx={{ mt: 2, fontSize: '0.8rem' }}>
              <b>A person is deactivated, not deleted.</b> Leavers stay in the directory as inactive, because past
              approvals and notifications resolved to them and the record must stay reconstructible.
            </Alert>

            {person.active && (
              <Button size="small" variant="outlined" color="error" sx={{ mt: 1 }} onClick={tryDeactivate}>
                Deactivate this person
              </Button>
            )}
            {!person.active && (
              <Alert severity="warning" sx={{ mt: 1, fontSize: '0.8rem' }}>
                Inactive since {person.leftOn}.{held.length > 0 && ' They are still assigned to a role — see the risk report.'}
              </Alert>
            )}
          </SectionCard>
        </Box>

        <Box sx={{ flex: '1 1 380px', minWidth: 340 }}>
          <SectionCard title="S10-SC-06 · User account link">
            <TraceNote workflow="WF-S10-02 / Step 2 — linked to the C1 user account so contact details are held once and the directory and the user record do not diverge" />

            {person.userAccount ? (
              <>
                <ReadOnlyField label="Linked C1 account" value={person.userAccount} />
                <Alert severity="success" sx={{ mt: 1, fontSize: '0.8rem' }}>
                  Name and email are <b>read-only, owned by C1</b>. Position, telephone, picture, job description and
                  area are owned by the directory and editable here.
                </Alert>
              </>
            ) : (
              <>
                <Chip size="small" label="No system user" sx={{ height: 22, bgcolor: '#FFF4E5', color: COLORS.attention, fontWeight: 700 }} />
                <Alert severity="info" sx={{ mt: 1, fontSize: '0.8rem' }}>
                  {person.name} is an <b>operational contact who is not a COTS user</b>. The directory still holds
                  them — a first-class record, not an incomplete one — which matters for countries where not every
                  contact has an account.
                </Alert>
                {held.length > 0 && (
                  <Alert severity="warning" sx={{ mt: 1, fontSize: '0.8rem' }}>
                    <b>One consequence follows.</b> Role resolution returns the linked user account where the person
                    is a system user. {person.name} holds{' '}
                    {held.map((a) => roles.find((r) => r.id === a.roleId)?.name).join(', ')}, so they can be{' '}
                    <b>notified</b> — there is an email address — but cannot <b>approve</b> in COTS, because there is
                    no account to act.
                  </Alert>
                )}
                <BusinessConfirmation>
                  Confirm whether a role holder without a linked user account is acceptable for notification but not
                  for approval.
                  <PrototypeNote>
                    this question is <b>not stated in the source</b> — it arises from the design, and is labelled as
                    such rather than presented as an existing business requirement.
                  </PrototypeNote>
                </BusinessConfirmation>
              </>
            )}
          </SectionCard>

          <SectionCard title="Roles held">
            {held.length === 0 ? (
              <EmptyState text="This person holds no role." />
            ) : (
              <Table size="small">
                <TableBody>
                  {held.map((a) => (
                    <TableRow key={a.roleId + (a.areaId ?? '')}>
                      <TableCell>{roles.find((r) => r.id === a.roleId)?.name}</TableCell>
                      <TableCell>{a.areaId ? nodeById(a.areaId)?.name : a.country}</TableCell>
                      <TableCell>from {a.effectiveFrom}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Button size="small" variant="outlined" component={Link} to="/s10/roles" sx={{ mt: 1 }}>
              Open the role assignment matrix
            </Button>
          </SectionCard>
        </Box>
      </Box>

      <BottomBar>
        <Button variant="outlined" onClick={() => nav('/s10/directory')}>Back to the directory</Button>
      </BottomBar>

      <Dialog open={!!blocked} onClose={() => setBlocked(null)} maxWidth="sm" fullWidth>
        <DialogTitle>This person cannot be deactivated yet</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ fontSize: '0.85rem' }}>
            They still hold roles that approvals and notifications resolve to. Reassign these first:
            <Box component="ul" sx={{ pl: 2, m: 0.5 }}>
              {(blocked ?? []).map((r) => <li key={r}>{r}</li>)}
            </Box>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlocked(null)}>Close</Button>
          <Button variant="contained" component={Link} to="/s10/roles">Open the role assignment matrix</Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}

/* ============================================== S10-SC-07 area leadership */

export function AreaLeadership() {
  const { country: activeCountry } = useStore();
  const { nodes, people, leadership } = useS10();
  const [card, setCard] = React.useState<Person | null>(null);

  const areas = nodes.filter((n) => n.type === 'Operational area' && n.active);
  const current = (areaId: string) => leadership.find((l) => l.areaId === areaId && !l.superseded);
  const superseded = leadership.filter((l) => l.superseded);
  const personOf = (id?: string) => people.find((p) => p.id === id);

  return (
    <AppShell title="Area leadership" breadcrumb={[activeCountry, 'Shared Modules', 'Team Directory', 'Area leadership']} showSeason={false}>
      <ProposalBanner />

      <SectionCard title="S10-SC-07 · Leading team for each operational area">
        <TraceNote workflow="WF-S10-02 / Steps 3–4 — the leading teams identified with their contact person and contact details, giving a clear answer to who is responsible where" />
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Operational area', 'Country', 'Leading team', 'Contact person', 'Contact details', 'Deputy', 'Effective from'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {areas.map((a) => {
              const l = current(a.id);
              const c = personOf(l?.contactPersonId);
              return (
                <TableRow key={a.id} sx={{ bgcolor: l ? undefined : '#FFF7ED' }}>
                  <TableCell sx={{ fontWeight: 600 }}>{a.name}</TableCell>
                  <TableCell>{countryOf(a.id)}</TableCell>
                  <TableCell>
                    {l ? l.team : (
                      <Chip size="small" label="No leading team identified" sx={{ height: 19, bgcolor: '#FDECEA', color: COLORS.bad, fontWeight: 700 }} />
                    )}
                  </TableCell>
                  <TableCell>
                    {c ? (
                      <Box component="span" onClick={() => setCard(c)} sx={{ color: COLORS.primary, fontWeight: 600, cursor: 'pointer' }}>
                        {c.name}
                      </Box>
                    ) : '—'}
                  </TableCell>
                  <TableCell>{c ? `${c.telephone} · ${c.email}` : '—'}</TableCell>
                  <TableCell>{personOf(l?.deputyPersonId)?.name ?? '—'}</TableCell>
                  <TableCell>{l?.effectiveFrom ?? '—'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Alert severity="warning" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
          Areas with <b>no leading team are shown as rows, not omitted</b>. The stated purpose is <i>giving a clear
          answer to who is responsible where</i> — and a directory that answers by silence has failed. These areas
          also appear on the operational risk report.
        </Alert>
      </SectionCard>

      <SectionCard title="Superseded leadership — retained, because 'who led this area in July' must be answerable">
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Area', 'Leading team', 'Contact person', 'Effective from', 'State'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {superseded.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{nodeById(l.areaId)?.name}</TableCell>
                <TableCell>{l.team}</TableCell>
                <TableCell>{personOf(l.contactPersonId)?.name}</TableCell>
                <TableCell>{l.effectiveFrom}</TableCell>
                <TableCell>
                  <Chip size="small" label="Superseded — retained" sx={{ height: 19, bgcolor: '#F0F0F0', color: COLORS.neutral, fontWeight: 600 }} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mt: 0.5 }}>
          A leadership change creates a new effective-dated entry and retains the previous one — the same requirement
          as reconstructing a past approval.
        </Typography>
      </SectionCard>

      <BottomBar>
        <Button variant="outlined" component={Link} to="/s10/directory">Team directory</Button>
        <Button variant="contained" component={Link} to="/s10/gaps">Roles without a holder</Button>
      </BottomBar>

      <PersonCard person={card} onClose={() => setCard(null)} />
    </AppShell>
  );
}
