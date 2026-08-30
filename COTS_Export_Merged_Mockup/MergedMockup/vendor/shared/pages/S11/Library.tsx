import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem,
  Select, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { DataTable, type Column } from '../../components/DataTable';
import {
  BottomBar, BusinessConfirmation, EmptyState, PrototypeNote, ReadOnlyField, RequiredLabel, SectionCard,
  TraceNote,
} from '../../components/shared';
import { useStore } from '../../state/store';
import { useS11 } from '../../state/s11store';
import { useS10 } from '../../state/s10store';
import {
  MATERIAL_TYPES, PLACEMENTS, TODAY, addMonths, placementFor, reviewStatus, typeConfig,
  type MaterialType, type ReferenceItem,
} from '../../mockData/s11';
import { COLORS } from '../../theme';

/** Proposal marker — carried on every screen, with the platform question stated. */
export function ProposalBanner() {
  return (
    <Box sx={{ border: `1px dashed ${COLORS.attention}`, bgcolor: '#FFF7ED', borderRadius: 1, px: 1.5, py: 1, mb: 2 }}>
      <Stack direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap">
        <Chip size="small" label="PROPOSAL" sx={{ height: 20, bgcolor: COLORS.attention, color: '#fff', fontWeight: 700 }} />
        <Typography variant="caption" sx={{ color: COLORS.textPrimary, fontWeight: 600, flex: 1, minWidth: 320 }}>
          S11 is the least defined module in the layer — listed in the workshop structure but never described in
          detail. <b>It may not need to be built at all:</b> if an existing corporate platform already serves this,
          most of it is redundant. What survives that answer is the <b>contextual surfacing</b> at the point of work,
          because no external platform knows which COTS screen a user is on.
        </Typography>
      </Stack>
    </Box>
  );
}

export const statusColour = (s: string) =>
  s === 'Published' ? COLORS.good
    : s === 'Pending approval' ? COLORS.attention
      : s === 'Returned to owner' ? COLORS.bad
        : COLORS.neutral;

/* ================================================== S11-SC-01 library */

export default function Library() {
  const { country } = useStore();
  const { items, published } = useS11();
  const { people } = useS10();
  const nav = useNavigate();

  const owner = (id: string) => people.find((p) => p.id === id)?.name ?? '—';
  const noPlacement = published.filter((i) => !placementFor(i.type)?.live).length;
  const overdue = published.filter((i) => reviewStatus(i.reviewDate).state === 'Overdue for review').length;

  // pending and returned items are NOT in the library — only their owner sees them
  const libraryRows = items.filter((i) => i.status !== 'Pending approval' && i.status !== 'Returned to owner');
  const ownerDrafts = items.filter((i) => i.status === 'Pending approval' || i.status === 'Returned to owner');

  const columns: Column<ReferenceItem>[] = [
    {
      key: 'code', label: 'Reference · title', filterable: true,
      render: (r) => (
        <Box component="span" onClick={() => nav(`/s11/item/${r.id}`)} sx={{ color: COLORS.primary, fontWeight: 600, cursor: 'pointer' }}>
          {r.code} · {r.title}
        </Box>
      ),
      value: (r) => `${r.code} ${r.title}`,
    },
    { key: 'type', label: 'Type', filterable: true, value: (r) => r.type },
    { key: 'country', label: 'Country', filterable: true, value: (r) => r.country },
    { key: 'module', label: 'Module', filterable: true, value: (r) => r.module },
    { key: 'owner', label: 'Owner', render: (r) => owner(r.ownerId), value: (r) => owner(r.ownerId) },
    { key: 'version', label: 'Version', value: (r) => r.version },
    { key: 'effective', label: 'Effective', render: (r) => `${r.effectiveFrom}${r.effectiveTo ? ` → ${r.effectiveTo}` : ''}`, value: (r) => r.effectiveFrom },
    {
      key: 'review', label: 'Review status',
      render: (r) => {
        const rs = reviewStatus(r.reviewDate);
        if (r.status !== 'Published') return <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>—</Typography>;
        return rs.state === 'Current'
          ? <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Current · {r.reviewDate}</Typography>
          : (
            <Chip
              size="small"
              label={rs.state === 'Overdue for review' ? `Overdue by ${rs.days} days` : `Due in ${rs.days} days`}
              sx={{ height: 19, bgcolor: rs.state === 'Overdue for review' ? '#FDECEA' : '#FFF4E5', color: rs.state === 'Overdue for review' ? COLORS.bad : COLORS.attention, fontWeight: 700 }}
            />
          );
      },
      value: (r) => r.reviewDate,
    },
    {
      key: 'status', label: 'Status', filterable: true,
      render: (r) => <Chip size="small" label={r.status} sx={{ height: 20, color: '#fff', bgcolor: statusColour(r.status), fontWeight: 600 }} />,
      value: (r) => r.status,
    },
    {
      key: 'placement', label: 'Surfaced at',
      render: (r) => {
        const pl = placementFor(r.type);
        return pl?.live
          ? <Link to={pl.route} style={{ color: COLORS.primary }}>{pl.placement}</Link>
          : <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Library only</Typography>;
      },
      value: (r) => placementFor(r.type)?.placement ?? '',
    },
    {
      key: 'approval', label: 'Requires approval',
      render: (r) => (typeConfig(r.type).requiresApproval ? 'Yes' : 'No'),
      value: (r) => (typeConfig(r.type).requiresApproval ? 'Yes' : 'No'),
    },
  ];

  return (
    <AppShell title="Knowledge Portal" breadcrumb={[country, 'Shared Modules', 'Knowledge Portal']} showSeason={false}>
      <ProposalBanner />

      <BusinessConfirmation>
        Confirm that this scope is what the business intends by the knowledge portal, and whether an existing
        corporate platform already serves this need.
      </BusinessConfirmation>

      <Alert severity="info" sx={{ mb: 2, fontSize: '0.82rem' }}>
        <b>Review this module from other modules, not from here.</b> The library, the versioning, the approval and
        the search exist in every document management system. What does not is the material appearing on the screen
        where the work happens — open{' '}
        <Link to="/s05/requests" style={{ color: COLORS.primary }}>S05 service requests</Link>,{' '}
        <Link to="/s05/clearance" style={{ color: COLORS.primary }}>S05 clearance</Link>,{' '}
        <Link to="/s04/cases" style={{ color: COLORS.primary }}>an S04 variance case</Link> or{' '}
        <Link to="/s03/inspections" style={{ color: COLORS.primary }}>S03 inspections</Link> and the panel is there.
      </Alert>

      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          {[
            { k: 'Published items', v: String(published.length), n: 'Drawn only from material the requirements name' },
            { k: 'Overdue for review', v: String(overdue), n: 'Visible to management, not only the owner' },
            { k: 'No configured placement', v: String(noPlacement), n: 'A fact, not an error — some material is library-only' },
            { k: 'Never consulted', v: String(published.filter((i) => i.consultations === 0).length), n: 'Either nobody needs it or nobody can find it' },
          ].map((c) => (
            <Box key={c.k} sx={{ border: `1px solid ${COLORS.border}`, bgcolor: '#fff', borderRadius: 1, px: 1.5, py: 1, minWidth: 200, flex: '1 1 200px' }}>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary, fontWeight: 700 }}>{c.k}</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.primary, lineHeight: 1.2 }}>{c.v}</Typography>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>{c.n}</Typography>
            </Box>
          ))}
        </Stack>
      </Box>

      <SectionCard title="S11-SC-01 · Knowledge library">
        <TraceNote workflow="WF-S11-01 / Step 1 — material classified by type, country, module, owner, version, effective date and review date" />
        <DataTable
          columns={columns}
          rows={libraryRows}
          onNew={() => nav('/s11/publish')}
          newLabel="Publish material"
          toolbarNote="Material awaiting approval does not appear here, in search, or at the point of work — only its owner sees it."
        />
      </SectionCard>

      {ownerDrafts.length > 0 && (
        <SectionCard title="Your drafts — not in the library, not in search, not at the point of work">
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Reference · title', 'Type', 'Version', 'Status', ''].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {ownerDrafts.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.code} · {d.title}</TableCell>
                  <TableCell>{d.type}</TableCell>
                  <TableCell>{d.version}</TableCell>
                  <TableCell>
                    <Chip size="small" label={d.status} sx={{ height: 19, color: '#fff', bgcolor: statusColour(d.status), fontWeight: 600 }} />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" component={Link} to={`/s11/item/${d.id}`}>Open</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      )}

      <BottomBar>
        <Button variant="contained" component={Link} to="/s11/publish">Publish material</Button>
        <Button variant="outlined" component={Link} to="/s11/search">Search the library</Button>
        <Button variant="outlined" component={Link} to="/s11/placements">Contextual placement</Button>
        <Button variant="outlined" component={Link} to="/s11/review">Review queue</Button>
        <Button variant="outlined" component={Link} to="/s11/reports">Reporting</Button>
      </BottomBar>
    </AppShell>
  );
}

/* ================================================ S11-SC-02 publish */

export function PublishMaterial() {
  const { country, say } = useStore();
  const { items, addItem } = useS11();
  const { people } = useS10();
  const nav = useNavigate();

  const [title, setTitle] = React.useState('');
  const [type, setType] = React.useState<MaterialType | ''>('');
  const [itemCountry, setItemCountry] = React.useState(country);
  const [module, setModule] = React.useState('');
  const [ownerId, setOwnerId] = React.useState('');
  const [version, setVersion] = React.useState('v1.0');
  const [effectiveFrom, setEffectiveFrom] = React.useState('01-Sep-2026');
  const [file, setFile] = React.useState('');

  const cfg = type ? typeConfig(type) : null;
  const reviewDate = type ? addMonths(effectiveFrom, cfg!.reviewMonths) : '';
  const existing = items.find((i) => i.title === title && i.status === 'Published');

  const blocking: string[] = [];
  if (!title) blocking.push('A title is required.');
  if (!type) blocking.push('A material type is required — it decides the approval requirement and the review cycle.');
  if (!module) blocking.push('The module it applies to is required.');
  if (!ownerId) blocking.push('A business owner is required, selected from the team directory.');
  if (!file) blocking.push('The underlying file is required. It is stored and versioned in C7.');

  const onSave = () => {
    const id = `I-${100 + items.length}`;
    const code = existing?.code ?? `KB-00${45 + items.length}`;
    addItem({
      id, code, title, type: type as MaterialType, country: itemCountry, module, ownerId,
      version, effectiveFrom, reviewDate,
      status: cfg!.requiresApproval ? 'Pending approval' : 'Published',
      file, consultations: 0,
    });
    say(cfg!.requiresApproval
      ? `${title} submitted for approval. It is not in the library, not in search and not at the point of work until approved.`
      : `${title} published with effect from ${effectiveFrom}.`);
    nav(`/s11/item/${id}`);
  };

  return (
    <AppShell title="Publish reference material" breadcrumb={[country, 'Shared Modules', 'Knowledge Portal', 'Publish']} showSeason={false}>
      <ProposalBanner />

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 540px', minWidth: 440 }}>
          <SectionCard title="S11-SC-02 · Classification">
            <TraceNote workflow="WF-S11-01 / Steps 1–2 — classified with its type, country, module, owner, version, effective date and review date; the file stored and versioned through C7" />

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 1 }}>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <RequiredLabel label="Title" required />
                <TextField size="small" fullWidth sx={{ mt: 0.5 }} value={title} onChange={(e) => setTitle(e.target.value)} />
                {existing && (
                  <Typography variant="caption" sx={{ color: COLORS.attention, fontWeight: 700 }}>
                    This will supersede {existing.code} {existing.version}, which is retained and marked.
                  </Typography>
                )}
              </Box>
              <Box>
                <RequiredLabel label="Material type" required />
                <Select size="small" fullWidth displayEmpty value={type} onChange={(e) => setType(e.target.value as MaterialType)} sx={{ mt: 0.5 }}>
                  <MenuItem value=""><em>Select</em></MenuItem>
                  {MATERIAL_TYPES.map((m) => <MenuItem key={m.type} value={m.type}>{m.type}</MenuItem>)}
                </Select>
              </Box>
              <Box>
                <RequiredLabel label="Country" required />
                <Select size="small" fullWidth value={itemCountry} onChange={(e) => setItemCountry(e.target.value)} sx={{ mt: 0.5 }}>
                  {['All countries', 'Sudan', 'Ethiopia', 'Chad'].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </Box>
              <Box>
                <RequiredLabel label="Module" required />
                <Select size="small" fullWidth displayEmpty value={module} onChange={(e) => setModule(e.target.value)} sx={{ mt: 0.5 }}>
                  <MenuItem value=""><em>Select</em></MenuItem>
                  {['S1 Planning', 'S3 Quality Assurance', 'S4 Compliance', 'S5 Logistics', 'S6 SMA', 'S7 Claims'].map((m) => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </Select>
              </Box>
              <Box>
                <RequiredLabel label="Owner" required />
                <Select size="small" fullWidth displayEmpty value={ownerId} onChange={(e) => setOwnerId(e.target.value)} sx={{ mt: 0.5 }}>
                  <MenuItem value=""><em>Select from the team directory</em></MenuItem>
                  {people.filter((p) => p.active).map((p) => <MenuItem key={p.id} value={p.id}>{p.name} · {p.position}</MenuItem>)}
                </Select>
              </Box>
              <Box>
                <RequiredLabel label="Version" required />
                <TextField size="small" fullWidth sx={{ mt: 0.5 }} value={version} onChange={(e) => setVersion(e.target.value)} />
              </Box>
              <Box>
                <RequiredLabel label="Effective from" required />
                <TextField size="small" fullWidth sx={{ mt: 0.5 }} value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
              </Box>
            </Box>

            <Box sx={{ mt: 2 }}>
              <RequiredLabel label="Underlying file" required />
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <Button size="small" variant="outlined" onClick={() => setFile(`${(title || 'material').toLowerCase().replace(/\s+/g, '-')}-${version}.pdf`)}>
                  Attach the file (simulated)
                </Button>
                <Typography variant="body2">{file || 'None attached'}</Typography>
              </Stack>
              <Alert severity="info" sx={{ mt: 1, fontSize: '0.8rem' }}>
                Storage and versioning of the underlying file is the <b>document module (C7)</b>. S11 holds the
                classification, the placement and the publication state — <b>it is not a file store</b>, and the
                estimate should reflect that.
              </Alert>
            </Box>
          </SectionCard>
        </Box>

        <Box sx={{ flex: '1 1 380px', minWidth: 340 }}>
          <SectionCard title="What this type implies">
            {!cfg ? (
              <EmptyState text="Choose a material type to see its approval requirement, review cycle and placement." />
            ) : (
              <>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, width: 190 }}>Requires approval</TableCell>
                      <TableCell>
                        <b>{cfg.requiresApproval ? 'Yes' : 'No'}</b> — {cfg.reason}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Review cycle</TableCell>
                      <TableCell>{cfg.reviewMonths} months</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Review date</TableCell>
                      <TableCell>
                        <b>{reviewDate}</b>
                        <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary }}>
                          Derived from the configured cycle, so an override is a visible choice.
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Surfaced at</TableCell>
                      <TableCell>{placementFor(cfg.type)?.placement ?? 'Not configured — library only'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <Alert severity={cfg.requiresApproval ? 'warning' : 'success'} sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                  {cfg.requiresApproval
                    ? 'This type is routed for review and approval through C4 before publication, because it governs how work is performed.'
                    : 'This type does not require approval — the owner publishes directly. The control is not missing; it does not apply.'}
                </Alert>
              </>
            )}
          </SectionCard>
        </Box>
      </Box>

      <BottomBar>
        <Tooltip title={blocking.length ? blocking.join(' ') : ''}>
          <span>
            <Button variant="contained" disabled={blocking.length > 0} onClick={onSave}>
              {cfg?.requiresApproval ? 'Submit for approval' : 'Publish directly'}
            </Button>
          </span>
        </Tooltip>
        <Button variant="outlined" component={Link} to="/s11">Cancel</Button>
        {blocking.length > 0 && (
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: COLORS.bad, fontWeight: 700 }}>Publication is blocked:</Typography>
            {blocking.map((b) => (
              <Typography key={b} variant="caption" sx={{ display: 'block', color: COLORS.textSecondary }}>· {b}</Typography>
            ))}
          </Box>
        )}
      </BottomBar>
    </AppShell>
  );
}

/* ============================ S11-SC-03 / 04 / 07 item detail, approval, versions */

export function ItemDetail() {
  const { id } = useParams();
  const { country, say } = useStore();
  const { items, decide, inForce } = useS11();
  const { people } = useS10();
  const nav = useNavigate();

  const item = items.find((i) => i.id === id);
  const [decideOpen, setDecideOpen] = React.useState<'Approved' | 'Returned' | null>(null);
  const [justification, setJustification] = React.useState('');
  const [asAt, setAsAt] = React.useState('15-Mar-2026');

  if (!item) {
    return (
      <AppShell title="Reference item" breadcrumb={[country, 'Shared Modules', 'Knowledge Portal']} showSeason={false}>
        <ProposalBanner />
        <Alert severity="warning">No item with that reference exists in the prototype data.</Alert>
        <Button component={Link} to="/s11" variant="outlined" sx={{ mt: 2 }}>Back to the library</Button>
      </AppShell>
    );
  }

  const owner = (pid: string) => people.find((p) => p.id === pid)?.name ?? '—';
  const cfg = typeConfig(item.type);
  const versions = items.filter((i) => i.code === item.code).sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1));
  const rs = reviewStatus(item.reviewDate);
  const pl = placementFor(item.type);
  const governing = inForce(item.code, asAt);

  return (
    <AppShell title={item.title} breadcrumb={[country, 'Shared Modules', 'Knowledge Portal', item.code]} showSeason={false}>
      <ProposalBanner />

      <Box sx={{ bgcolor: COLORS.primary, color: '#fff', px: 2, py: 1.2, borderRadius: 1, mb: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{item.code} · {item.title}</Typography>
          <Chip size="small" label={item.status} sx={{ height: 20, bgcolor: statusColour(item.status), color: '#fff', fontWeight: 700 }} />
          <Chip size="small" label={item.version} sx={{ height: 20, bgcolor: '#fff', color: COLORS.primaryDark, fontWeight: 700 }} />
        </Stack>
        <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.92)' }}>
          {item.type} · {item.country} · {item.module} · Owner {owner(item.ownerId)} · effective {item.effectiveFrom}
          {item.effectiveTo ? ` to ${item.effectiveTo}` : ''}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 520px', minWidth: 440 }}>
          <SectionCard title="S11-SC-07 · Reference item">
            <TraceNote workflow="WF-S11-04 / Step 4 — the item opened, the underlying file served from the document module" />
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
              <ReadOnlyField label="Type" value={item.type} />
              <ReadOnlyField label="Country · module" value={`${item.country} · ${item.module}`} />
              <ReadOnlyField label="Owner" value={owner(item.ownerId)} />
              <ReadOnlyField label="Version · effective from" value={`${item.version} · ${item.effectiveFrom}`} />
              <ReadOnlyField label="Review date" value={`${item.reviewDate} — ${rs.state}`} />
              <ReadOnlyField label="File (C7)" value={item.file} />
              <ReadOnlyField label="Surfaced at" value={pl?.live ? pl.placement : 'Not configured — library only'} />
              <ReadOnlyField label="Consultations this period" value={String(item.consultations)} />
            </Box>

            {item.status === 'Withdrawn' && (
              <Alert severity="warning" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                <b>Withdrawn on {item.withdrawnOn}</b> — {item.withdrawnReason} The item is <b>retained and marked</b>
                so past decisions remain explainable, and its placement falls back to <i>no material published</i>
                rather than continuing to show withdrawn guidance.
              </Alert>
            )}

            {item.consultations === 0 && item.status === 'Published' && (
              <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                <b>Never consulted.</b> Either nobody needs this material, or nobody can find it — and with no
                configured placement, the second is likely.
              </Alert>
            )}
          </SectionCard>

          {/* --------------------------------------- S11-SC-04 versions */}
          <SectionCard title="S11-SC-04 · Version history and supersession">
            <TraceNote workflow="WF-S11-01 / Step 4 — superseded versions retained and clearly marked, so a past decision can be understood against the rule in force at the time" />
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Version', 'Effective from · to', 'Approval', 'Status', 'File'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {versions.map((v) => (
                  <TableRow key={v.id} selected={v.id === item.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{v.version}</TableCell>
                    <TableCell>{v.effectiveFrom}{v.effectiveTo ? ` → ${v.effectiveTo}` : ' → current'}</TableCell>
                    <TableCell>
                      {v.approval ? `${v.approval.approver} · ${v.approval.decision} · ${v.approval.date}` : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={v.status} sx={{ height: 19, color: '#fff', bgcolor: statusColour(v.status), fontWeight: 600 }} />
                    </TableCell>
                    <TableCell sx={{ color: COLORS.primary }}>{v.file}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Box sx={{ mt: 2, border: `1px solid ${COLORS.border}`, borderRadius: 1, p: 1.5, bgcolor: '#FAFAFA' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary, display: 'block' }}>
                RULE IN FORCE AT
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
                <TextField size="small" value={asAt} onChange={(e) => setAsAt(e.target.value)} sx={{ width: 180 }} />
                <Typography variant="body2">
                  {governing
                    ? <>On <b>{asAt}</b>, <b>{governing.version}</b> governed — effective {governing.effectiveFrom}{governing.effectiveTo ? ` to ${governing.effectiveTo}` : ''}.</>
                    : <>No version of {item.code} was in force on {asAt}.</>}
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                A decision taken in March must be explainable against March's rule, not today's — the same pattern as
                the S02 <i>value in force at</i> and the S10 historical role resolution.
              </Typography>
            </Box>
          </SectionCard>
        </Box>

        {/* --------------------------------------- S11-SC-03 approval */}
        <Box sx={{ flex: '1 1 380px', minWidth: 340 }}>
          <SectionCard title="S11-SC-03 · Publication approval">
            <TraceNote workflow="WF-S11-01 / Step 3 — where the material type governs how work is performed, COTS routes it for review and approval through C4 before publication" />

            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, width: 170 }}>Type requires approval</TableCell>
                  <TableCell><b>{cfg.requiresApproval ? 'Yes' : 'No'}</b> — {cfg.reason}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {!cfg.requiresApproval && (
              <Alert severity="success" sx={{ mt: 1, fontSize: '0.8rem' }}>
                This type is published directly by its owner. The approval control is <b>not missing — it does not
                apply</b>. Types that publish directly: {MATERIAL_TYPES.filter((m) => !m.requiresApproval).map((m) => m.type).join(', ')}.
              </Alert>
            )}

            {item.status === 'Pending approval' && (
              <>
                <Alert severity="warning" sx={{ mt: 1, fontSize: '0.8rem' }}>
                  Pending approval. While it is pending, this item is <b>not in the library, not in search and not at
                  the point of work</b>.
                </Alert>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button size="small" variant="contained" onClick={() => { setJustification(''); setDecideOpen('Approved'); }}>
                    PROTOTYPE — approve
                  </Button>
                  <Button size="small" variant="outlined" color="error" onClick={() => { setJustification(''); setDecideOpen('Returned'); }}>
                    PROTOTYPE — return to owner
                  </Button>
                </Stack>
                <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mt: 0.5 }}>
                  C4 approval is simulated. Not production functionality.
                </Typography>
              </>
            )}

            {item.status === 'Returned to owner' && (
              <Alert severity="error" sx={{ mt: 1, fontSize: '0.8rem' }}>
                <b>Returned to the owner and not published.</b> {item.approval?.justification} A returned item is not a
                failed one — the reason is held against it and the owner can revise and resubmit.
              </Alert>
            )}

            {item.approval && item.status !== 'Returned to owner' && (
              <Table size="small" sx={{ mt: 1 }}>
                <TableBody>
                  <TableRow><TableCell sx={{ fontWeight: 600, width: 130 }}>Approver</TableCell><TableCell>{item.approval.approver}</TableCell></TableRow>
                  <TableRow><TableCell sx={{ fontWeight: 600 }}>Decision · date</TableCell><TableCell>{item.approval.decision} · {item.approval.date}</TableCell></TableRow>
                  <TableRow><TableCell sx={{ fontWeight: 600 }}>Justification</TableCell><TableCell>{item.approval.justification}</TableCell></TableRow>
                </TableBody>
              </Table>
            )}
          </SectionCard>
        </Box>
      </Box>

      <BottomBar>
        <Button variant="outlined" onClick={() => nav('/s11')}>Back to the library</Button>
        {pl?.live && <Button variant="contained" component={Link} to={pl.route}>See it at the point of work</Button>}
      </BottomBar>

      <Dialog open={!!decideOpen} onClose={() => setDecideOpen(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{decideOpen === 'Approved' ? 'Approve for publication' : 'Return to the owner'}</DialogTitle>
        <DialogContent>
          <TraceNote workflow="WF-S11-01 / Step 3 branches — approved is published with its effective date; not approved is returned to the owner and not published" />
          <Box sx={{ mt: 1 }}>
            <RequiredLabel label="Justification" required />
            <TextField
              size="small" fullWidth multiline minRows={3} sx={{ mt: 0.5 }}
              value={justification} onChange={(e) => setJustification(e.target.value)}
            />
            <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
              Mandatory on both outcomes, consistent with the S07 claims approval.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDecideOpen(null)}>Cancel</Button>
          <Tooltip title={!justification ? 'The justification is mandatory.' : ''}>
            <span>
              <Button
                variant="contained" disabled={!justification}
                onClick={() => {
                  decide(item.id, decideOpen!, justification);
                  say(decideOpen === 'Approved'
                    ? `${item.title} published with effect from ${item.effectiveFrom}. Any previous version is superseded and retained.`
                    : `${item.title} returned to the owner and not published.`);
                  setDecideOpen(null);
                }}
              >
                Record the decision
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}

/* ================================================== S11-SC-08 search */

export function LibrarySearch() {
  const { country } = useStore();
  const { items } = useS11();
  const { people } = useS10();

  const [q, setQ] = React.useState('');
  const [fCountry, setFCountry] = React.useState('');
  const [fModule, setFModule] = React.useState('');
  const [fType, setFType] = React.useState('');
  const [includeSuperseded, setIncludeSuperseded] = React.useState(false);

  const owner = (id: string) => people.find((p) => p.id === id)?.name ?? '—';

  // pending and returned material is never returned by search
  const searchable = items.filter((i) => i.status === 'Published' || i.status === 'Superseded' || i.status === 'Withdrawn');
  const match = searchable.filter((i) => {
    if (q && !`${i.code} ${i.title} ${i.type} ${i.module}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (fCountry && i.country !== fCountry) return false;
    if (fModule && i.module !== fModule) return false;
    if (fType && i.type !== fType) return false;
    return true;
  });
  const current = match.filter((i) => i.status !== 'Superseded');
  const supersededCount = match.length - current.length;
  const rows = includeSuperseded ? match : current;

  return (
    <AppShell title="Search the library" breadcrumb={[country, 'Shared Modules', 'Knowledge Portal', 'Search']} showSeason={false}>
      <ProposalBanner />

      <SectionCard title="S11-SC-08 · Library search">
        <TraceNote workflow="WF-S11-04 / Steps 1–3 — search by keyword, country, module and material type, within the user's permission scope; the result shows enough to tell the current version from a superseded one" />

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mt: 1 }}>
          <TextField size="small" placeholder="Keyword" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select size="small" displayEmpty value={fCountry} onChange={(e) => setFCountry(e.target.value)}>
            <MenuItem value=""><em>Any country</em></MenuItem>
            {['All countries', 'Sudan', 'Ethiopia', 'Chad'].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
          <Select size="small" displayEmpty value={fModule} onChange={(e) => setFModule(e.target.value)}>
            <MenuItem value=""><em>Any module</em></MenuItem>
            {Array.from(new Set(items.map((i) => i.module))).map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </Select>
          <Select size="small" displayEmpty value={fType} onChange={(e) => setFType(e.target.value)}>
            <MenuItem value=""><em>Any type</em></MenuItem>
            {MATERIAL_TYPES.map((m) => <MenuItem key={m.type} value={m.type}>{m.type}</MenuItem>)}
          </Select>
        </Box>

        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1.5 }}>
          <FormControlLabel
            control={<Switch size="small" checked={includeSuperseded} onChange={(e) => setIncludeSuperseded(e.target.checked)} />}
            label={<Typography variant="caption">Include superseded versions</Typography>}
          />
          <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
            {supersededCount} superseded match{supersededCount === 1 ? '' : 'es'} {includeSuperseded ? 'shown' : 'hidden'}.
          </Typography>
        </Stack>

        <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
          Results are restricted to <b>your C1 permission scope</b>, and material awaiting approval is never returned.
          The restriction is stated rather than silent — a search that quietly omits things teaches users the library
          is incomplete.
        </Alert>

        <Table size="small" sx={{ mt: 1 }}>
          <TableHead>
            <TableRow>
              {['Reference · title', 'Type', 'Country', 'Module', 'Owner', 'Version', 'Effective', 'Status'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={8}><EmptyState text="No material matches. Keyword, country, module and type were all applied." /></TableCell></TableRow>
            ) : rows.map((i) => (
              <TableRow
                key={i.id}
                sx={i.status === 'Superseded' ? { bgcolor: '#F5F5F5', opacity: 0.85 } : undefined}
              >
                <TableCell>
                  <Link to={`/s11/item/${i.id}`} style={{ color: COLORS.primary, fontWeight: 600 }}>{i.code} · {i.title}</Link>
                </TableCell>
                <TableCell>{i.type}</TableCell>
                <TableCell>{i.country}</TableCell>
                <TableCell>{i.module}</TableCell>
                <TableCell>{owner(i.ownerId)}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i.version}</TableCell>
                <TableCell>{i.effectiveFrom}{i.effectiveTo ? ` → ${i.effectiveTo}` : ''}</TableCell>
                <TableCell>
                  <Chip size="small" label={i.status} sx={{ height: 19, color: '#fff', bgcolor: statusColour(i.status), fontWeight: 600 }} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      <BottomBar>
        <Button variant="outlined" component={Link} to="/s11">Back to the library</Button>
      </BottomBar>
    </AppShell>
  );
}
