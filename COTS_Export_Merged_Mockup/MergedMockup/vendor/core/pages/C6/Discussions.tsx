import React from 'react';
import {
  Alert, Box, Button, Chip, Divider, Grid, List, ListItem, ListItemText, Paper, Stack, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  EmptyState, FieldGrid, HandOffBanner, PageBanner, PlaceholderNote, SectionBand, StatusChip, WhiteButton
} from '../../components/shared';
import { CommentThread } from '../../components/CommentThread';
import { ActivityTimeline } from '../../components/ActivityTimeline';
import { KpiTile } from '../../components/Charts';
import {
  EDIT_WINDOW_MINUTES, EXPORT_INCLUDES_COMMENTS, VISIBILITY_DEFAULT
} from '../../mockData/c6';
import { ShellFooterNote } from '../../layouts/AppShell';

/** Part 3 — the review page. In the built system every panel here is reached through its record. */
export const Discussions: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = React.useState(0);
  const [openException, setOpenException] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');

  const threads = React.useMemo(() => {
    const keys = [...new Set(s.comments6.map((c) => c.recordKey))];
    return keys.map((k) => {
      const rows = s.commentsFor(k);
      const first = rows[0];
      return {
        key: k,
        name: first?.recordName ?? k,
        objectType: first?.objectType ?? '—',
        country: first?.country ?? '—',
        route: rows.find((r) => r.route)?.route,
        total: rows.length,
        replies: rows.filter((r) => r.parentId).length,
        decisions: rows.filter((r) => r.isDecision).length,
        removed: rows.filter((r) => r.removed).length,
        edited: rows.filter((r) => r.editedAt).length,
        last: rows[rows.length - 1]?.at ?? '—',
        isException: s.exceptions.some((e) => e.key === k)
      };
    }).sort((a, b) => b.last.localeCompare(a.last));
  }, [s.comments6, s.commentsFor, s.exceptions]);

  const recordThreads = threads.filter((t) => !t.isException);
  const search = s.searchComments(query);
  const ex = s.exceptions.find((e) => e.key === openException) ?? null;

  return (
    <>
      <PageBanner
        title="Discussions"
        breadcrumb={[s.activeCountry, 'C6 Comments and Collaboration', 'Discussions']}
        subtitle="WF-C6-01 and WF-C6-02 — a review aid. In the built system every panel here is reached through its record."
        actions={<WhiteButton onClick={() => navigate('/c1/access-requests/AR-000141')}>See the panel on a record</WhiteButton>}
      />
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2, fontSize: 13 }}>
          <b>C06 is a panel programme, not a screen programme.</b> The comment panel appears in the same position on
          every operational and master record — WF-C6-01 / Step 1 — so this page exists only to let the behaviour be
          reviewed in one place without hunting through five modules.
        </Alert>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={s.comments6.length} label="Comments in the prototype" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={s.comments6.filter((c) => c.isDecision).length} label="Decision comments — unalterable" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={s.comments6.filter((c) => c.removed).length} label="Removed (soft delete)" /></Grid>
          <Grid item xs={12} sm={6} md={3}><KpiTile value={s.exceptions.filter((e) => e.state === 'Open').length} label="Exception threads open" tone="attention" /></Grid>
        </Grid>

        <Tabs value={tab} onChange={(_, v) => { setTab(v); setOpenException(null); }} sx={{ mb: 2, minHeight: 38 }}>
          <Tab label={`Record discussions (${recordThreads.length})`} sx={{ minHeight: 38, fontSize: 13 }} />
          <Tab label={`Exception threads (${s.exceptions.length})`} sx={{ minHeight: 38, fontSize: 13 }} />
          <Tab label="Comment search" sx={{ minHeight: 38, fontSize: 13 }} />
          <Tab label="Configuration points" sx={{ minHeight: 38, fontSize: 13 }} />
        </Tabs>

        {/* ---------------- record discussions ---------------- */}
        {tab === 0 && (
          <Paper variant="outlined">
            <SectionBand>Every thread in the prototype, grouped by record</SectionBand>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Record</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Object type</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Country</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Comments</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Replies</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Decision</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Edited</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Removed</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Last activity</TableCell>
                  <TableCell sx={{ fontSize: 12 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {recordThreads.map((t) => (
                  <TableRow key={t.key}>
                    <TableCell sx={{ fontSize: 12.5, color: tokens.primary }}>{t.name}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{t.objectType}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{t.country}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{t.total}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{t.replies}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{t.decisions}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{t.edited}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{t.removed}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{t.last}</TableCell>
                    <TableCell>
                      {t.route
                        ? <Button size="small" onClick={() => navigate(t.route!)}>Open the record</Button>
                        : <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>Owning module not built</Typography>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Box sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
                Discussion stays attached to the transaction rather than living in email, with the author, role, country
                and time recorded — WF-C6-01 outcome. One record here sits in Mozambique, outside the demonstration
                user's country scope, so that the search scope rule can be shown honestly.
              </Typography>
            </Box>
          </Paper>
        )}

        {/* ---------------- exception threads ---------------- */}
        {tab === 1 && (
          <>
            {!ex ? (
              <Paper variant="outlined">
                <SectionBand>Exception threads — WF-C6-02 / Step 4</SectionBand>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: 12 }}>Reference</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>Type</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>Description</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>Raised by</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>Raised at</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>Comments</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>State</TableCell>
                      <TableCell sx={{ fontSize: 12 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {s.exceptions.map((e) => (
                      <TableRow key={e.key}>
                        <TableCell sx={{ fontSize: 12.5, color: tokens.primary }}>{e.key}</TableCell>
                        <TableCell sx={{ fontSize: 12.5 }}>{e.type}</TableCell>
                        <TableCell sx={{ fontSize: 12.5 }}>{e.name}</TableCell>
                        <TableCell sx={{ fontSize: 12.5 }}>{e.raisedBy}</TableCell>
                        <TableCell sx={{ fontSize: 12.5 }}>{e.raisedAt}</TableCell>
                        <TableCell sx={{ fontSize: 12.5 }}>{s.commentsFor(e.key).length}</TableCell>
                        <TableCell><StatusChip status={e.state === 'Resolved' ? 'Closed' : 'Open'} /></TableCell>
                        <TableCell><Button size="small" onClick={() => setOpenException(e.key)}>Open thread</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Box sx={{ p: 2 }}>
                  <Typography sx={{ fontSize: 13 }}>
                    For a non-conformity, variance, claim or delay the comment thread <b>is</b> the working record of how
                    the exception was resolved, and it is retained for compliance review. The four types named in the
                    workflow belong to modules outside the core layer, so these are seeded demonstration records.
                  </Typography>
                </Box>
              </Paper>
            ) : (
              <>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Button variant="outlined" size="small" onClick={() => setOpenException(null)}>Back to exception threads</Button>
                  {ex.relatedRoute && <Button variant="outlined" size="small" onClick={() => navigate(ex.relatedRoute!)}>Open the related record</Button>}
                  {ex.state === 'Open' && (
                    <Button variant="contained" size="small" onClick={() => s.resolveException(ex.key)}>Resolve thread</Button>
                  )}
                </Stack>

                <Paper variant="outlined" sx={{ mb: 2 }}>
                  <SectionBand>{ex.type} {ex.key} — {ex.state === 'Resolved' ? 'resolved' : 'open'}</SectionBand>
                  <Box sx={{ p: 2 }}>
                    <FieldGrid items={[
                      ['Description', ex.name],
                      ['Country', ex.country],
                      ['Raised by', ex.raisedBy],
                      ['Raised at', ex.raisedAt],
                      ['State', <StatusChip key="st" status={ex.state === 'Resolved' ? 'Closed' : 'Open'} />],
                      ['Resolved', ex.resolvedAt ? `${ex.resolvedAt} · ${ex.resolvedBy}` : '—'],
                      ...ex.detail.map(([k, v]) => [k, v] as [string, React.ReactNode])
                    ]} />
                    {ex.state === 'Resolved' && (
                      <Alert severity="success" sx={{ mt: 2, fontSize: 12.5 }}>
                        Resolution, drawn from the thread rather than typed twice:
                        “{s.commentsFor(ex.key).slice().reverse().find((c) => !c.removed)?.text ?? '—'}”
                      </Alert>
                    )}
                    <PlaceholderNote>
                      Business confirmation required: whether a comment thread can be closed once an issue is resolved
                      (WF-C6-02 / Step 4). Resolving marks the thread and does <b>not</b> lock it, because forbidding
                      further comment on a resolved exception is exactly the decision that has not been taken.
                    </PlaceholderNote>
                  </Box>
                </Paper>

                <CommentThread
                  recordKey={ex.key} recordName={ex.name} objectType={ex.type} country={ex.country}
                  module={ex.type === 'Non-conformity' ? 'Quality' : 'Execution'}
                  route="/c6/discussions"
                />

                <Box sx={{ mt: 2 }}>
                  <ActivityTimeline recordKey={ex.key} recordName={ex.name} />
                </Box>
              </>
            )}
          </>
        )}

        {/* ---------------- comment search ---------------- */}
        {tab === 2 && (
          <Paper variant="outlined">
            <SectionBand>Comment search — WF-C6-01 / Step 10</SectionBand>
            <Box sx={{ p: 2 }}>
              <TextField
                fullWidth size="small" label="Search comments" value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="moisture, scope, lease, variance…"
                helperText="Searches comment text, record name and author."
              />
              <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mt: 1.5 }}>
                Results are limited to records the signed-in user may see, in the countries in their scope
                ({(s.currentUser?.countryScope ?? []).join(', ') || 'none'}). A comment on a record outside scope is not
                returned and its existence is not implied.
              </Typography>

              {query.trim() && (
                <>
                  <Divider sx={{ my: 2 }} />
                  {search.results.length === 0 ? (
                    <EmptyState message="No comments match within your permission and country scope" />
                  ) : (
                    <List dense disablePadding>
                      {search.results.map((c) => (
                        <ListItem key={c.id} divider secondaryAction={
                          c.route ? <Button size="small" onClick={() => navigate(c.route!)}>Open the record</Button> : undefined
                        }>
                          <ListItemText
                            primaryTypographyProps={{ fontSize: 13.5 }}
                            secondaryTypographyProps={{ fontSize: 12 }}
                            primary={c.text}
                            secondary={
                              <>
                                {c.recordName} · {c.objectType} · {c.country} · {c.author} ({c.role.replace(/_/g, ' ').toLowerCase()}) · {c.at}
                                {c.isDecision ? ' · decision comment' : ''}
                              </>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                  {search.hiddenByScope > 0 && (
                    <Alert severity="info" sx={{ mt: 2, fontSize: 12.5 }}>
                      {search.hiddenByScope} matching comment(s) were <b>not</b> returned because they sit on records
                      outside your country scope. This message states the count deliberately; the record, its contents
                      and its author are not disclosed.
                    </Alert>
                  )}
                </>
              )}
              <HandOffBanner label="DEPENDENCY" target="C2 / WF-C2-04 Global Search" passed="The comment query" returned="Matches grouped with records, users and tasks, within the same permission scope" />
            </Box>
          </Paper>
        )}

        {/* ---------------- configuration points ---------------- */}
        {tab === 3 && (
          <>
            <Paper variant="outlined" sx={{ mb: 2 }}>
              <SectionBand>Edit window — WF-C6-01 / Step 7</SectionBand>
              <Box sx={{ p: 2 }}>
                <FieldGrid items={[
                  ['Edit window', `${EDIT_WINDOW_MINUTES} minutes from posting`],
                  ['Applies to', 'Ordinary comments only'],
                  ['Decision comments', 'Never editable or removable'],
                  ['On expiry', 'The comment is fixed; edit and remove are withdrawn with the reason stated'],
                  ['Versions', 'Every version retained and readable'],
                  ['Owner', 'C10 System Configuration']
                ]} columns={2} />
                <HandOffBanner label="DEPENDENCY" target="C10 / WF-C10-01 Configuring a Country" passed="The edit window length and the per-record-type settings below" />
              </Box>
            </Paper>

            <Paper variant="outlined" sx={{ mb: 2 }}>
              <SectionBand>Default visibility per record type — WF-C6-01 / Step 4</SectionBand>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 12 }}>Record type</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Default visibility</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Why</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {VISIBILITY_DEFAULT.map((v) => (
                    <TableRow key={v.objectType}>
                      <TableCell sx={{ fontSize: 12.5 }}>{v.objectType}</TableCell>
                      <TableCell>
                        <Chip size="small" variant="outlined" label={v.default}
                              sx={{ height: 19, fontSize: 10.5, borderColor: v.default === 'Internal only' ? tokens.border : tokens.amber, color: v.default === 'Internal only' ? tokens.textSecondary : tokens.amber }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{v.why}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box sx={{ p: 2 }}>
                <PlaceholderNote>
                  Business confirmation required: whether external users are permitted to comment, and on which record
                  types (WF-C6-01 / Step 4). The defaults above are demonstration values drawn from the record types
                  built so far.
                </PlaceholderNote>
              </Box>
            </Paper>

            <Paper variant="outlined">
              <SectionBand>Comments in printed and exported output — WF-C6-01 / Step 9</SectionBand>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 12 }}>Record type</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Comments included in export</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {EXPORT_INCLUDES_COMMENTS.map((e) => (
                    <TableRow key={e.objectType}>
                      <TableCell sx={{ fontSize: 12.5 }}>{e.objectType}</TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{e.included ? 'Yes' : 'No'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box sx={{ p: 2 }}>
                <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
                  Comments are always included in the record history view; whether they appear in printed or exported
                  output is configured per record type. The exception types are set to include them, because the thread is
                  the working record of the resolution.
                </Typography>
              </Box>
            </Paper>
          </>
        )}

        <ShellFooterNote />
      </Box>
    </>
  );
};

/** A record's activity timeline reached directly, for records whose module is not built. */
export const RecordActivity: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const { key = '' } = useParams();
  const first = s.commentsFor(key)[0];

  return (
    <>
      <PageBanner
        title="Activity"
        breadcrumb={[first?.country ?? s.activeCountry, 'C6 Comments and Collaboration', key]}
        subtitle="WF-C6-02 / Step 5 — comments, documents and status changes in one chronological view"
        actions={<WhiteButton onClick={() => navigate('/c6/discussions')}>Back to discussions</WhiteButton>}
      />
      <Box sx={{ p: 3 }}>
        <ActivityTimeline recordKey={key} recordName={first?.recordName} />
        <ShellFooterNote />
      </Box>
    </>
  );
};
