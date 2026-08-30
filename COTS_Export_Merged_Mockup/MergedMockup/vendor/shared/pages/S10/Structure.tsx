import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem,
  Radio, RadioGroup, Select, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField,
  Tooltip, Typography,
} from '@mui/material';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import {
  BottomBar, BusinessConfirmation, PrototypeNote, ReadOnlyField, RequiredLabel, SectionCard, TraceNote,
} from '../../components/shared';
import { useStore } from '../../state/store';
import { useS10 } from '../../state/s10store';
import { CONFIGURED_DEPTH, STRUCTURE_AUDIT, countryOf, personById, type OrgNode } from '../../mockData/s10';
import { COLORS } from '../../theme';

/** Proposal marker — on every screen of a proposal-stage module, not just the landing page. */
export function ProposalBanner() {
  return (
    <Box sx={{ border: `1px dashed ${COLORS.attention}`, bgcolor: '#FFF7ED', borderRadius: 1, px: 1.5, py: 1, mb: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Chip size="small" label="PROPOSAL" sx={{ height: 20, bgcolor: COLORS.attention, color: '#fff', fontWeight: 700 }} />
        <Typography variant="caption" sx={{ color: COLORS.textPrimary, fontWeight: 600 }}>
          S10 is at proposal stage. It is also the structural reference that makes role-based approval and
          notification work — a gap here is not cosmetic, it is an approval that cannot route.
        </Typography>
      </Stack>
    </Box>
  );
}

/** The mastering control — the question with the widest consequence in this module. */
export function SourceControl() {
  const { source, setSource, editable } = useS10();
  return (
    <Box sx={{ border: `1px dashed ${COLORS.attention}`, borderRadius: 1, p: 1.5, mb: 2 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.attention, display: 'block' }}>
        PROTOTYPE — WHERE IS THIS INFORMATION MASTERED?
      </Typography>
      <RadioGroup row value={source} onChange={(e) => setSource(e.target.value as any)}>
        <FormControlLabel value="Maintained in COTS" control={<Radio size="small" />} label="Maintained in COTS" />
        <FormControlLabel value="Read from the corporate directory" control={<Radio size="small" />} label="Read from the corporate directory" />
      </RadioGroup>
      <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary }}>
        {editable
          ? 'COTS is the master: add, change and close are available on the structure, the people and the area leadership.'
          : 'The structure and the people are read-only with a source chip. Only role assignment, area leadership and the COTS active indicator stay editable — those are decisions about COTS, not facts about a person.'}{' '}
        No real directory integration exists; the external source is simulated. Not production functionality.
      </Typography>
    </Box>
  );
}

export const SourceChip = () => {
  const { source, editable } = useS10();
  return editable ? null : (
    <Chip
      size="small" icon={<CloudOutlinedIcon sx={{ fontSize: 14 }} />} label={source}
      sx={{ height: 20, bgcolor: '#EEF4FA', color: COLORS.primaryDark, fontWeight: 700 }}
    />
  );
};

/* ============================================== S10-SC-01 / 02 structure */

export default function Structure() {
  const { country: activeCountry } = useStore();
  const { nodes, people, assignments, editable, mandatory, toggleMandatory, updateNode, roles } = useS10();

  const [selected, setSelected] = React.useState<string>('N-10');
  const [showInactive, setShowInactive] = React.useState(false);
  const [form, setForm] = React.useState(false);
  const [blockDialog, setBlockDialog] = React.useState<string[] | null>(null);
  const [draft, setDraft] = React.useState({ name: '', type: 'Operational area', parent: 'N-11', code: '' });

  const node = nodes.find((n) => n.id === selected);
  const children = (id?: string) => nodes.filter((n) => n.parent === id && (showInactive || n.active));
  const peopleAt = (id: string) => people.filter((p) => p.areaId === id).length;

  const rolesHeldAt = (n: OrgNode) => {
    const cn = n.type === 'Country' ? n.name : countryOf(n.id);
    return assignments
      .filter((a) => (n.type === 'Country' ? a.country === cn && !a.areaId : a.areaId === n.id))
      .map((a) => `${roles.find((r) => r.id === a.roleId)?.name} (${n.type === 'Country' ? cn : n.name})`);
  };

  const tryDeactivate = (n: OrgNode) => {
    const held = rolesHeldAt(n);
    if (held.length) { setBlockDialog(held); return; }
    updateNode(n.id, { active: false, closureDate: '19-Aug-2026' });
  };

  const renderNode = (n: OrgNode, depth = 0): React.ReactNode => (
    <React.Fragment key={n.id}>
      <Box
        onClick={() => setSelected(n.id)}
        sx={{
          pl: depth * 2.2 + 1, py: 0.5, cursor: 'pointer', borderRadius: 0.5,
          bgcolor: selected === n.id ? '#EAF4FB' : 'transparent',
          borderLeft: selected === n.id ? `3px solid ${COLORS.primary}` : '3px solid transparent',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" sx={{ fontWeight: n.type === 'Country' ? 700 : 500, opacity: n.active ? 1 : 0.55 }}>
            {n.name}
          </Typography>
          <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>{n.type}</Typography>
          {!n.active && (
            <Chip size="small" label={`Closed ${n.closureDate}`} sx={{ height: 17, fontSize: '0.62rem', bgcolor: '#F0F0F0', color: COLORS.neutral }} />
          )}
          {n.type === 'Country' && !n.administrator && (
            <Chip size="small" label="No named administrator" sx={{ height: 17, fontSize: '0.62rem', bgcolor: '#FDECEA', color: COLORS.bad, fontWeight: 700 }} />
          )}
        </Stack>
      </Box>
      {children(n.id).map((c) => renderNode(c, depth + 1))}
    </React.Fragment>
  );

  return (
    <AppShell title="Team Directory and Organisation Structure" breadcrumb={[activeCountry, 'Shared Modules', 'Team Directory']} showSeason={false}>
      <ProposalBanner />

      <BusinessConfirmation>
        Confirm that the proposed Team Directory and Organisation Structure workflow and scope are approved by the
        business.
      </BusinessConfirmation>

      <BusinessConfirmation>
        Confirm whether organisation and directory information is mastered in the corporate directory service or
        maintained in COTS.
      </BusinessConfirmation>

      <SourceControl />

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 420px', minWidth: 380 }}>
          <SectionCard
            title="S10-SC-01 · Organisation structure"
            right={<SourceChip />}
          >
            <TraceNote workflow="WF-S10-01 / Steps 1–2 — companies and countries, with the operational areas and departments within each and their parent relationships" />

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
              <FormControlLabel
                control={<Switch size="small" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />}
                label={<Typography variant="caption">Show closed nodes</Typography>}
              />
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                Configured depth: <b>{CONFIGURED_DEPTH} levels</b> — company, country, department, operational area
              </Typography>
            </Stack>

            <Box sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 1, py: 1 }}>
              {nodes.filter((n) => n.type === 'Company').map((n) => renderNode(n))}
            </Box>

            <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
              <b>Closing is not deleting.</b> A country, department or area that closes is marked inactive with a
              closure date and stays in the structure, because past approvals resolved through it and the audit must
              remain reconstructible.
            </Alert>

            {editable && (
              <Button size="small" variant="contained" sx={{ mt: 1 }} onClick={() => setForm(true)}>
                Add a node
              </Button>
            )}
          </SectionCard>
        </Box>

        <Box sx={{ flex: '1 1 420px', minWidth: 380 }}>
          {node && (
            <SectionCard title={`${node.type} · ${node.name}`} right={<SourceChip />}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
                <ReadOnlyField label="Type" value={node.type} />
                <ReadOnlyField label="Code" value={node.code} />
                <ReadOnlyField label="Parent" value={nodes.find((n) => n.id === node.parent)?.name ?? '—'} />
                <ReadOnlyField label="Country" value={node.type === 'Country' ? node.name : countryOf(node.id)} />
                <ReadOnlyField label="People held here" value={String(peopleAt(node.id))} />
                <ReadOnlyField label="Active" value={node.active ? 'Active' : `Closed ${node.closureDate}`} />
              </Box>

              {node.type === 'Country' && (
                <Box sx={{ mt: 1.5 }}>
                  <ReadOnlyField
                    label="Named administrator — the clear owner per country"
                    value={
                      node.administrator
                        ? personById(node.administrator)?.name ?? '—'
                        : <Chip size="small" label="Not assigned — see the risk report" sx={{ height: 19, bgcolor: '#FDECEA', color: COLORS.bad, fontWeight: 700 }} />
                    }
                  />
                </Box>
              )}

              {rolesHeldAt(node).length > 0 && (
                <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                  Roles resolved through this node: <b>{rolesHeldAt(node).join(', ')}</b>
                </Alert>
              )}

              {editable && node.active && node.type !== 'Company' && (
                <Button size="small" variant="outlined" color="error" sx={{ mt: 1.5 }} onClick={() => tryDeactivate(node)}>
                  Close this node
                </Button>
              )}
              {!editable && (
                <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                  Read-only — the structure is mastered in the corporate directory service. Role assignment and area
                  leadership remain editable in COTS.
                </Alert>
              )}
            </SectionCard>
          )}

          <SectionCard title="Mandatory attributes — configuration, not code">
            <TraceNote workflow="WF-S10-01 / Step 2 — maintained to the configured depth, using the attributes configured as mandatory" />
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Attribute', 'Mandatory', ''].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {mandatory.map((m) => (
                  <TableRow key={m.attribute}>
                    <TableCell>{m.attribute}</TableCell>
                    <TableCell>{m.mandatory ? 'Yes' : 'No'}</TableCell>
                    <TableCell align="right">
                      {m.fixed ? (
                        <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>Always required</Typography>
                      ) : (
                        <Button size="small" onClick={() => toggleMandatory(m.attribute)}>
                          Make {m.mandatory ? 'optional' : 'mandatory'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PrototypeNote>
              change a setting here and the required markers on the person record follow it — the form is driven by
              configuration rather than hard-coded.
            </PrototypeNote>
          </SectionCard>
        </Box>
      </Box>

      {/* ------------------------------------------------ S10-SC-03 audit */}
      <SectionCard title="S10-SC-03 · Structure and directory change audit (Core C8)">
        <TraceNote workflow="WF-S10-01 / Step 3 and WF-S10-03 / Step 4 — every structural change recorded and audited, because the structure affects who receives approvals and notifications" />
        <Table size="small">
          <TableHead>
            <TableRow>
              {['When', 'Who', 'Record', 'Change', 'Affects role resolution'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {STRUCTURE_AUDIT.map((a) => (
              <TableRow key={a.when}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{a.when}</TableCell>
                <TableCell>{a.who}</TableCell>
                <TableCell>{a.record}</TableCell>
                <TableCell>{a.change}</TableCell>
                <TableCell sx={{ fontWeight: a.affectsResolution.startsWith('Yes') ? 700 : 400, color: a.affectsResolution.startsWith('Yes') ? COLORS.attention : COLORS.textSecondary }}>
                  {a.affectsResolution}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
          The last column is why this screen exists. The audit does not merely record the change — it flags whether
          <b> role resolution moved</b>. An auditor asking who held a role when a past approval was given starts here
          and continues in the resolution trace.
        </Alert>
        <Button size="small" variant="outlined" component={Link} to="/s10/resolution" sx={{ mt: 1 }}>
          Open the role resolution trace
        </Button>
      </SectionCard>

      <BottomBar>
        <Button variant="outlined" component={Link} to="/s10/directory">Team directory</Button>
        <Button variant="outlined" component={Link} to="/s10/roles">Role assignment matrix</Button>
        <Button variant="contained" component={Link} to="/s10/gaps">Roles without a holder</Button>
        <Button variant="outlined" component={Link} to="/s10/reports">Reporting</Button>
      </BottomBar>

      {/* add node */}
      <Dialog open={form} onClose={() => setForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>S10-SC-02 · Organisation node</DialogTitle>
        <DialogContent>
          <TraceNote workflow="WF-S10-01 / Steps 1–2 — node type, name, parent, code and the named administrator" />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 1 }}>
            <Box>
              <RequiredLabel label="Node type" required />
              <Select size="small" fullWidth value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} sx={{ mt: 0.5 }}>
                {['Country', 'Department', 'Operational area'].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </Box>
            <Box>
              <RequiredLabel label="Parent" required />
              <Select size="small" fullWidth value={draft.parent} onChange={(e) => setDraft({ ...draft, parent: e.target.value })} sx={{ mt: 0.5 }}>
                {nodes.filter((n) => n.active && n.type !== 'Operational area').map((n) => (
                  <MenuItem key={n.id} value={n.id}>{n.type}: {n.name}</MenuItem>
                ))}
              </Select>
            </Box>
            <Box>
              <RequiredLabel label="Name" required />
              <TextField size="small" fullWidth sx={{ mt: 0.5 }} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Box>
            <Box>
              <RequiredLabel label="Code" required />
              <TextField size="small" fullWidth sx={{ mt: 0.5 }} value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(false)}>Cancel</Button>
          <Tooltip title={!draft.name || !draft.code ? 'Name and code are required.' : ''}>
            <span>
              <Button variant="contained" disabled={!draft.name || !draft.code} onClick={() => setForm(false)}>
                Save the node
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>

      {/* deactivation blocked */}
      <Dialog open={!!blockDialog} onClose={() => setBlockDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>This node cannot be closed yet</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ fontSize: '0.85rem' }}>
            Role assignments still resolve through this node. Closing it would silently break approval routing —
            exactly the failure this module exists to prevent. Reassign the following first:
            <Box component="ul" sx={{ pl: 2, m: 0.5 }}>
              {(blockDialog ?? []).map((r) => <li key={r}>{r}</li>)}
            </Box>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlockDialog(null)}>Close</Button>
          <Button variant="contained" component={Link} to="/s10/roles">Open the role assignment matrix</Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
