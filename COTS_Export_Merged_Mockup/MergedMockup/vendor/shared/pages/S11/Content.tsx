import React from 'react';
import {
  Alert, Box, Button, Chip, MenuItem, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import {
  BottomBar, BusinessConfirmation, EmptyState, PrototypeNote, ReadOnlyField, RequiredLabel, SectionCard,
  TraceNote,
} from '../../components/shared';
import { useStore } from '../../state/store';
import { liveAnnouncements, useS11 } from '../../state/s11store';
import { useS10 } from '../../state/s10store';
import { PLACEMENTS, TODAY, type Announcement } from '../../mockData/s11';
import { COLORS } from '../../theme';
import { ProposalBanner } from './Library';

/* ========================================= S11-SC-05 placement configuration */

export function Placements() {
  const { country } = useStore();

  return (
    <AppShell title="Contextual placement" breadcrumb={[country, 'Shared Modules', 'Knowledge Portal', 'Placement']} showSeason={false}>
      <ProposalBanner />

      <Alert severity="success" sx={{ mb: 2, fontSize: '0.85rem' }}>
        <b>These placements are live in this prototype.</b> S03, S04 and S05 are already built, so the three
        placements the source names are real panels on real screens — not mockups of an idea. Open any of the links
        below.
      </Alert>

      <SectionCard title="S11-SC-05 · Where each material type is surfaced">
        <TraceNote workflow="WF-S11-02 / Steps 1–2 — the configured placement per material type: the stuffing protocol in the stuffing screen, the country requirement matrix in the execution screen, the adjustment types document in the compliance case" />
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Material type', 'Surfaced at', 'Filter', 'Fallback where nothing matches', 'Live here'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {PLACEMENTS.map((p) => (
              <TableRow key={p.type}>
                <TableCell sx={{ fontWeight: 600 }}>{p.type}</TableCell>
                <TableCell>
                  {p.live
                    ? <Link to={p.route} style={{ color: COLORS.primary }}>{p.placement}</Link>
                    : <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>{p.placement}</Typography>}
                </TableCell>
                <TableCell>{p.filter}</TableCell>
                <TableCell sx={{ color: COLORS.textSecondary }}>
                  {p.live ? 'The panel still renders and names what is missing and who owns it' : '—'}
                </TableCell>
                <TableCell>
                  {p.live
                    ? <Chip size="small" label="Live" sx={{ height: 19, bgcolor: '#E8F5E9', color: COLORS.good, fontWeight: 700 }} />
                    : <Chip size="small" label="Library only" sx={{ height: 19, bgcolor: '#F0F0F0', color: COLORS.neutral }} />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
          <b>The fallback matters.</b> A point-of-work panel that renders nothing when no material matches teaches
          users to ignore it. So the panel always renders, and where there is nothing to show it names what is
          missing and who owns it — which is also how a gap in the library becomes visible to the people who feel it.
        </Alert>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
          <Button size="small" variant="contained" component={Link} to="/s05/requests">See it: S05 stuffing</Button>
          <Button size="small" variant="contained" component={Link} to="/s05/clearance">See it: S05 clearance</Button>
          <Button size="small" variant="contained" component={Link} to="/s04/cases">See it: S04 variance case</Button>
          <Button size="small" variant="contained" component={Link} to="/s03/inspections">See it: S03 inspections</Button>
        </Stack>
      </SectionCard>

      <BottomBar>
        <Button variant="outlined" component={Link} to="/s11">Back to the library</Button>
      </BottomBar>
    </AppShell>
  );
}

/* =============================================== S11-SC-09 module help */

export function ModuleHelp() {
  const { country } = useStore();
  const { help } = useS11();

  return (
    <AppShell title="Module help" breadcrumb={[country, 'Shared Modules', 'Knowledge Portal', 'Module help']} showSeason={false}>
      <ProposalBanner />

      <SectionCard title="S11-SC-09 · Module help content">
        <TraceNote workflow="WF-S11-03 / Steps 1–2 — help maintained with its module, section and language, rendered in context by the shell, and following the same publication and versioning treatment as other reference material" />

        <Table size="small">
          <TableHead>
            <TableRow>
              {['Module', 'Section', 'Language', 'Version', 'Effective', 'Review date', 'Status'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {help.map((h) => (
              <TableRow key={h.id}>
                <TableCell sx={{ fontWeight: 600 }}>{h.module}</TableCell>
                <TableCell>{h.section}</TableCell>
                <TableCell>{h.language}</TableCell>
                <TableCell>{h.version}</TableCell>
                <TableCell>{h.effectiveFrom}</TableCell>
                <TableCell>{h.reviewDate}</TableCell>
                <TableCell>
                  <Chip size="small" label={h.status} sx={{ height: 19, bgcolor: '#E8F5E9', color: COLORS.good, fontWeight: 600 }} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
          Help content follows the <b>same publication, approval and versioning machinery</b> as any other reference
          material — the source says so explicitly, <i>so that the guidance shown in the application is the current
          approved text</i>. It is not free text an administrator can change at will.
        </Alert>

        {help.map((h) => (
          <Box key={h.id} sx={{ mt: 2, border: `1px solid ${COLORS.border}`, borderRadius: 1, p: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary, display: 'block' }}>
              RENDERED IN CONTEXT BY THE SHELL (C2) — {h.module.toUpperCase()} · {h.section.toUpperCase()} · {h.version}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>{h.content}</Typography>
          </Box>
        ))}
      </SectionCard>

      <BottomBar>
        <Button variant="outlined" component={Link} to="/s11">Back to the library</Button>
        <Button variant="outlined" component={Link} to="/s11/announcements">Announcements</Button>
      </BottomBar>
    </AppShell>
  );
}

/* ======================================= S11-SC-10 / 13 announcements */

export function Announcements() {
  const { country, say } = useStore();
  const { announcements, addAnnouncement } = useS11();
  const { roles, resolve } = useS10();

  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [aCountry, setACountry] = React.useState(country);
  const [roleId, setRoleId] = React.useState('');
  const [from, setFrom] = React.useState('19-Aug-2026');
  const [to, setTo] = React.useState('19-Sep-2026');

  const ms = (s: string) => new Date(s.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1, $3')).getTime();
  const stateOf = (a: Announcement) =>
    ms(TODAY) < ms(a.publishFrom) ? 'Scheduled' : ms(TODAY) > ms(a.expiresOn) ? 'Expired' : 'Live';

  // a role-targeted announcement reaches whoever holds that role — an unassigned role reaches nobody
  const resolution = roleId ? resolve(roleId, aCountry) : null;

  const blocking: string[] = [];
  if (!title) blocking.push('A title is required.');
  if (!content) blocking.push('The announcement content is required.');
  if (!from) blocking.push('A publication date is required.');
  if (!to) blocking.push('An expiry date is required — an announcement with no end date becomes furniture people stop reading.');

  return (
    <AppShell title="Announcements" breadcrumb={[country, 'Shared Modules', 'Knowledge Portal', 'Announcements']} showSeason={false}>
      <ProposalBanner />

      <BusinessConfirmation>
        Confirm whether "collaboration" requires functionality beyond the record-level comments already provided by
        COTS Core Module C6.
        <PrototypeNote>
          <b>no forum, no threads and no channels are built.</b> The C6 record comments already exist on every record
          in this prototype — open any S04 case or S07 claim and the comments tab is there. Whether more is wanted is
          unresolved, and building a forum would presume the answer.
        </PrototypeNote>
      </BusinessConfirmation>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 460px', minWidth: 400 }}>
          <SectionCard title="S11-SC-10 · Publish an announcement">
            <TraceNote workflow="WF-S11-03 / Step 3 — title, content, audience and publication and expiry dates, targeted to a country or a role" />

            <Box sx={{ mt: 1 }}>
              <RequiredLabel label="Title" required />
              <TextField size="small" fullWidth sx={{ mt: 0.5 }} value={title} onChange={(e) => setTitle(e.target.value)} />
            </Box>
            <Box sx={{ mt: 2 }}>
              <RequiredLabel label="Content" required />
              <TextField size="small" fullWidth multiline minRows={3} sx={{ mt: 0.5 }} value={content} onChange={(e) => setContent(e.target.value)} />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 2 }}>
              <Box>
                <RequiredLabel label="Country" required />
                <Select size="small" fullWidth value={aCountry} onChange={(e) => setACountry(e.target.value)} sx={{ mt: 0.5 }}>
                  {['All countries', 'Sudan', 'Ethiopia', 'Chad'].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Role (optional) — resolved through S10</Typography>
                <Select size="small" fullWidth displayEmpty value={roleId} onChange={(e) => setRoleId(e.target.value)} sx={{ mt: 0.5 }}>
                  <MenuItem value=""><em>Everyone in the country</em></MenuItem>
                  {roles.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
                </Select>
              </Box>
              <Box>
                <RequiredLabel label="Publication date" required />
                <TextField size="small" fullWidth sx={{ mt: 0.5 }} value={from} onChange={(e) => setFrom(e.target.value)} />
              </Box>
              <Box>
                <RequiredLabel label="Expiry date" required />
                <TextField size="small" fullWidth sx={{ mt: 0.5 }} value={to} onChange={(e) => setTo(e.target.value)} />
              </Box>
            </Box>

            {roleId && (
              resolution?.ok ? (
                <Alert severity="success" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                  This announcement will reach <b>{resolution.person!.name}</b>, who holds{' '}
                  {roles.find((r) => r.id === roleId)?.name} in {aCountry}.
                </Alert>
              ) : (
                <Alert severity="error" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                  <b>This announcement would reach nobody.</b> {resolution?.reason} Announcements inherit the same
                  structural dependency as the approval engine — an unassigned role has no recipient.
                  <Box sx={{ mt: 0.5 }}>
                    <Button size="small" variant="outlined" component={Link} to="/s10/gaps">Open the S10 role gap report</Button>
                  </Box>
                </Alert>
              )
            )}

            <Box sx={{ mt: 2 }}>
              <Tooltip title={blocking.length ? blocking.join(' ') : ''}>
                <span>
                  <Button
                    variant="contained" disabled={blocking.length > 0}
                    onClick={() => {
                      addAnnouncement({
                        id: `AN-00${22 + announcements.length}`, title, content,
                        country: aCountry, roleId: roleId || undefined, publishFrom: from, expiresOn: to,
                      });
                      say(`Announcement published to ${aCountry}${roleId ? ` · ${roles.find((r) => r.id === roleId)?.name}` : ''}, from ${from} to ${to}.`);
                      setTitle(''); setContent('');
                    }}
                  >
                    Publish the announcement
                  </Button>
                </span>
              </Tooltip>
              {blocking.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  {blocking.map((b) => (
                    <Typography key={b} variant="caption" sx={{ display: 'block', color: COLORS.textSecondary }}>· {b}</Typography>
                  ))}
                </Box>
              )}
            </Box>
          </SectionCard>
        </Box>

        <Box sx={{ flex: '1 1 420px', minWidth: 360 }}>
          <SectionCard title="All announcements">
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Title', 'Audience', 'From · to', 'State'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {announcements.map((a) => {
                  const st = stateOf(a);
                  return (
                    <TableRow key={a.id}>
                      <TableCell>{a.title}</TableCell>
                      <TableCell>
                        {a.country}{a.roleId ? ` · ${roles.find((r) => r.id === a.roleId)?.name}` : ''}
                      </TableCell>
                      <TableCell>{a.publishFrom} · {a.expiresOn}</TableCell>
                      <TableCell>
                        <Chip
                          size="small" label={st}
                          sx={{
                            height: 19, fontWeight: 600, color: '#fff',
                            bgcolor: st === 'Live' ? COLORS.good : st === 'Scheduled' ? COLORS.progress : COLORS.neutral,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mt: 0.5 }}>
              Expired announcements do not appear on the home page; they remain here.
            </Typography>
          </SectionCard>

          <SectionCard title="S11-SC-13 · What the home page shows">
            <HomeAnnouncements />
          </SectionCard>
        </Box>
      </Box>

      <BottomBar>
        <Button variant="outlined" component={Link} to="/s11">Back to the library</Button>
        <Button variant="outlined" component={Link} to="/s11/help">Module help</Button>
      </BottomBar>
    </AppShell>
  );
}

/** S11-SC-13 — the panel the shell home page hosts. */
export function HomeAnnouncements() {
  const { country } = useStore();
  const { announcements } = useS11();
  const { roles } = useS10();
  const live = liveAnnouncements(announcements, country);

  return (
    <>
      <TraceNote workflow="WF-S11-03 / Step 4 — published announcements appear on the home page of the users in the targeted audience, for the period between their publication and expiry dates" />
      {live.length === 0 ? (
        <EmptyState text={`No announcement is live for ${country} today.`} />
      ) : (
        live.map((a) => (
          <Box key={a.id} sx={{ border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${COLORS.primary}`, borderRadius: 1, p: 1.5, mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{a.title}</Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>{a.content}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={`Targeted to: ${a.country}${a.roleId ? ` · ${roles.find((r) => r.id === a.roleId)?.name}` : ''}`}
                sx={{ height: 19, bgcolor: '#EEF4FA', color: COLORS.primaryDark, fontWeight: 600 }}
              />
              <Chip size="small" label={`Expires ${a.expiresOn}`} sx={{ height: 19, bgcolor: '#F0F0F0', color: COLORS.neutral }} />
            </Stack>
          </Box>
        ))
      )}
      <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mt: 0.5 }}>
        The panel states <b>why</b> the user is seeing each announcement — an announcement whose audience is invisible
        looks like noise.
      </Typography>
    </>
  );
}
