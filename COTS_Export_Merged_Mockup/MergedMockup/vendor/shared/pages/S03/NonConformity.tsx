import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select, Stack,
  TextField, Typography,
} from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { DataTable, type Column } from '../../components/DataTable';
import {
  BottomBar, BusinessConfirmation, HandOffBanner, ReadOnlyField, RecordHeader, SectionCard, StatusChip,
  TraceNote, FieldGrid, RequiredLabel,
} from '../../components/shared';
import { ActionItemsList, CaseTabs, LinkedRecordsPanel } from '../../components/CaseWorkspace';
import { useStore } from '../../state/store';
import { useS03 } from '../../state/s03store';
import type { NonConformity } from '../../mockData/s03';
import { COLORS } from '../../theme';

export function NcList() {
  const { country } = useStore();
  const { ncs } = useS03();

  const cols: Column<NonConformity & { id: string }>[] = [
    {
      key: 'id',
      label: 'NC reference',
      render: (r) => <Link to={`/s03/nc/${r.id}`} style={{ color: COLORS.primary, fontWeight: 600 }}>{r.id}</Link>,
      value: (r) => r.id,
    },
    { key: 'source', label: 'Source', value: (r) => r.source },
    { key: 'description', label: 'Description', render: (r) => r.description.slice(0, 60) + '…', value: (r) => r.description },
    {
      key: 'material',
      label: 'Material · quantity',
      render: (r) => `${r.commodity} · ${r.quantityMt ? r.quantityMt + ' MT' : '—'}`,
      value: (r) => r.commodity,
    },
    { key: 'location', label: 'Location', value: (r) => r.location },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusChip status={r.status === 'Closed' ? 'Closed' : 'Open'} />,
      value: (r) => r.status,
    },
    {
      key: 'ageing',
      label: 'Ageing',
      render: (r) => {
        const overdue = r.actions.filter((a) => a.status !== 'Done').length;
        return r.status === 'Closed' ? '—' : `${r.actions.length} action(s) · ${overdue} open`;
      },
      value: (r) => String(r.actions.length),
    },
    {
      key: 'blocked',
      label: 'Blocked',
      render: (r) =>
        r.status === 'Closed'
          ? <Typography variant="caption" color="text.secondary">Released</Typography>
          : <Chip size="small" label={r.blockScope} sx={{ bgcolor: COLORS.attention, color: '#fff', height: 20 }} />,
      value: (r) => r.blockScope,
    },
  ];

  return (
    <AppShell title="Non-Conformity List" breadcrumb={[country, 'Quality Assurance', 'Non-conformities']} showSeason={false}>
      <SectionCard title="S03-SC-10 — Non-conformity list" dense>
        <div style={{ padding: '8px 16px' }}>
          <TraceNote workflow="WF-S03-03 / Step 9 — open and overdue non-conformities with ageing" />
        </div>
        <DataTable columns={cols as any} rows={ncs as any} toolbarNote="Non-conformities in the active country" />
      </SectionCard>
      <Button size="small" component={Link} to="/s03">Back to the control point board</Button>
    </AppShell>
  );
}

export function NcCase() {
  const { id = '' } = useParams();
  const { country, say } = useStore();
  const { ncs, updateNc, updateAction } = useS03();
  const nc = ncs.find((n) => n.id === id);
  const [tab, setTab] = React.useState(0);
  const [addOpen, setAddOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({ action: '', owner: 'M. Idris (Processing)', targetDate: '25-Aug-2026' });
  const [closeOpen, setCloseOpen] = React.useState(false);
  const [resolution, setResolution] = React.useState('');

  if (!nc) {
    return (
      <AppShell title="Non-conformity" breadcrumb={[country, 'Quality Assurance']} showSeason={false}>
        <Alert severity="error">Non-conformity {id} not found in the prototype data.</Alert>
      </AppShell>
    );
  }

  const allDone = nc.actions.length > 0 && nc.actions.every((a) => a.status === 'Done');
  const closed = nc.status === 'Closed';

  const linkedRows = [
    ...nc.linked.map((l) => ({ label: l.label, value: l.value, note: 'Operational consequence visible where the work is done' })),
    ...(nc.varianceCase
      ? [{ label: 'S04 Compliance variance case', value: nc.varianceCase, to: `/s04/case/${nc.varianceCase}`, note: 'Raised where the finding results in reprocessing, repacking or loss' }]
      : []),
    ...(nc.claimRef
      ? [{ label: 'S07 commercial claim', value: nc.claimRef, to: '/s07', note: 'The non-conformity is the quality reference on the claim; separate linked records' }]
      : []),
    ...(nc.source.startsWith('Customer feedback')
      ? [{ label: 'S09 customer feedback', value: nc.source.replace('Customer feedback ', '').replace(' (S09)', ''), to: '/s09', note: 'Commodity complaint routed to quality' }]
      : []),
  ];

  return (
    <AppShell
      title="Non-Conformity Case"
      breadcrumb={[country, 'Quality Assurance', 'Non-conformities', nc.id]}
      showSeason={false}
      banner={
        <RecordHeader
          title={nc.id}
          chip={<StatusChip status={closed ? 'Closed' : 'Open'} />}
          meta={[
            ['Case #', nc.id],
            ['Source', nc.source],
            ['Raised', nc.raisedOn],
            ['Material', `${nc.commodity}${nc.quantityMt ? ` · ${nc.quantityMt} MT` : ''}`],
            ['Owner', nc.raisedBy],
          ]}
        />
      }
    >
      <CaseTabs
        tabs={['Summary', 'Evidence', 'Linked Records', 'Corrective Actions', 'Stock Block', 'Activity', 'History']}
        value={tab}
        onChange={setTab}
      />

      {tab === 0 && (
        <SectionCard title="S03-SC-11 — Case summary">
          <TraceNote workflow="WF-S03-03 / Steps 1, 7 — the finding, the material affected, the location and the quantity; closed only when the corrective action is confirmed" />
          <FieldGrid columns={3}>
            <ReadOnlyField label="Raised by" value={nc.raisedBy} />
            <ReadOnlyField
              label="Source"
              value={nc.sourceRoute ? <Link to={nc.sourceRoute}>{nc.source}</Link> : nc.source}
            />
            <ReadOnlyField label="Raised on" value={nc.raisedOn} />
            <ReadOnlyField label="Material affected" value={nc.commodity} />
            <ReadOnlyField label="Quantity affected" value={nc.quantityMt ? `${nc.quantityMt} MT` : '—'} />
            <ReadOnlyField label="Location" value={nc.location} />
          </FieldGrid>
          <Box sx={{ mt: 2 }}>
            <RequiredLabel label="Description of the finding" required />
            <TextField
              fullWidth variant="standard" multiline value={nc.description} disabled={closed}
              onChange={(e) => updateNc(nc.id, { description: e.target.value })}
            />
          </Box>
          {nc.resolution && (
            <Box sx={{ mt: 2 }}>
              <ReadOnlyField label="Resolution" value={nc.resolution} />
            </Box>
          )}

          <BusinessConfirmation>
            Confirm how the non-conformity implementation already in place is to be carried over into COTS or replaced
            by it.{nc.migratedRef ? ` This case carries a migrated reference: ${nc.migratedRef}.` : ''}
          </BusinessConfirmation>

          {!closed && (
            <>
              <Alert severity={allDone ? 'success' : 'info'} sx={{ mt: 2 }}>
                {allDone
                  ? 'Every corrective action is confirmed — the case may be closed.'
                  : 'The case can be closed only when the corrective action is confirmed. Outstanding actions are listed on the Corrective Actions tab.'}
              </Alert>
              <Button
                variant="contained"
                sx={{ mt: 1 }}
                disabled={!allDone}
                onClick={() => setCloseOpen(true)}
              >
                Close non-conformity
              </Button>
            </>
          )}
        </SectionCard>
      )}

      {tab === 1 && (
        <SectionCard title="Evidence — C7 shared documents pattern">
          <Typography variant="body2" color="text.secondary">
            Photographs, inspection reports and correspondence attach through the shared Documents panel (Core S-14)
            and upload dialog (Core S-15). S03 does not build its own document handling.
          </Typography>
          <Button size="small" sx={{ mt: 1 }} onClick={() => say('Core C7 upload dialog would open here')}>Attach document</Button>
        </SectionCard>
      )}

      {tab === 2 && (
        <SectionCard title="S03-SC-11 — Linked records (SM-05)">
          <TraceNote workflow="WF-S03-03 / Steps 2, 6, 8 — linked to the stock, batch, shipment or contract concerned; and to the S04 case or S07 claim where they exist" />
          <LinkedRecordsPanel rows={linkedRows} />
          <HandOffBanner
            to="S04 Compliance / WF-S04-01"
            passes="non-conformity reference, affected stock and quantity, resolution outcome"
            returns="variance case reference"
            resumes="where the resolution results in a physical loss or a change in recorded quantity"
            linkLabel="Open S04 Compliance"
            linkTo="/s04/cases"
          />
        </SectionCard>
      )}

      {tab === 3 && (
        <SectionCard
          title="S03-SC-12 — Corrective actions (SM-10)"
          right={!closed && <Button size="small" variant="outlined" onClick={() => setAddOpen(true)}>Add action</Button>}
        >
          <TraceNote workflow="WF-S03-03 / Steps 3, 5 — recommended corrective actions with an owner and a target date; the assigned actions appear in the owner's Actions Inbox" />
          {nc.actions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No corrective actions recorded yet. The case cannot be closed until at least one action is recorded and
              confirmed.
            </Typography>
          ) : (
            <ActionItemsList
              rows={nc.actions}
              onStatus={(actionId, status) => {
                updateAction(nc.id, actionId, { status });
                const remaining = nc.actions.filter((a) => a.id !== actionId && a.status !== 'Done').length;
                updateNc(nc.id, { status: status === 'Done' && remaining === 0 ? 'Actions in progress' : 'Actions in progress' });
                say(status === 'Done' ? 'Corrective action confirmed' : 'Corrective action reopened');
              }}
            />
          )}
          <HandOffBanner
            to="S04 Compliance / WF-S04-04 Ongoing Compliance Monitoring"
            passes="open non-conformity references and corrective action progress — status only"
            returns="follow-up pressure"
            resumes="S04 tracks resolution progress and does not repeat the S03 investigation"
            linkLabel="Open S04 monitoring stub"
            linkTo="/s04/cases"
          />
        </SectionCard>
      )}

      {tab === 4 && (
        <SectionCard title="S03-SC-13 — Stock block indicator">
          <TraceNote workflow="WF-S03-03 / Step 4 — non-conforming material cannot be allocated or dispatched while the non-conformity is open, according to the configured rule" />
          <FieldGrid columns={2}>
            <ReadOnlyField label="Affected stock / batch" value={nc.linked.find((l) => l.label === 'Batch')?.value ?? '—'} />
            <ReadOnlyField label="Quantity" value={nc.quantityMt ? `${nc.quantityMt} MT` : '—'} />
            <ReadOnlyField
              label="Block scope (configuration in force)"
              value={
                closed
                  ? <Chip size="small" label="Released — case closed" sx={{ bgcolor: COLORS.good, color: '#fff', height: 20 }} />
                  : <Chip size="small" label={nc.blockScope} sx={{ bgcolor: COLORS.attention, color: '#fff', height: 20 }} />
              }
            />
            <ReadOnlyField label="Effective while" value={closed ? 'No longer effective' : `${nc.id} remains open`} />
          </FieldGrid>
          <Box sx={{ mt: 1 }}>
            <Select
              size="small" variant="standard" value={nc.blockScope} disabled={closed}
              onChange={(e) => updateNc(nc.id, { blockScope: e.target.value as any })}
            >
              {['Allocation', 'Dispatch', 'Allocation and dispatch'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: COLORS.textSecondary }}>
              Whether an open non-conformity blocks allocation, dispatch or both is a configuration point (C10). The
              screen states the rule in force rather than assuming one — the selector here stands in for that
              configuration so the reviewer can see each behaviour.
            </Typography>
          </Box>
          <HandOffBanner
            to="Stock allocation and dispatch (Export)"
            passes="blocked stock, batch, block scope, originating non-conformity"
            returns="nothing"
            resumes="the block is released when the case closes"
            linkLabel="Open stock record stub"
            linkTo="/stub/stock"
          />
        </SectionCard>
      )}

      {tab === 5 && (
        <SectionCard title="Activity — C6 comments and action history">
          <Stack spacing={0.5}>
            <Typography variant="body2">{nc.raisedOn} · {nc.raisedBy} · case raised from {nc.source}</Typography>
            {nc.actions.map((a) => (
              <Typography key={a.id} variant="body2">
                {a.targetDate} · {a.owner} · {a.action} — {a.status}
              </Typography>
            ))}
            {closed && <Typography variant="body2">Closed · resolution recorded · audited (C8)</Typography>}
          </Stack>
        </SectionCard>
      )}

      {tab === 6 && (
        <SectionCard title="History — C8 audit trail">
          <Typography variant="body2" color="text.secondary">
            Business-language timeline of the case, in the same position as on every other COTS record.
          </Typography>
        </SectionCard>
      )}

      <BottomBar>
        <Button component={Link} to="/s03/ncs" variant="outlined">Back to non-conformities</Button>
        <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
          Open and overdue non-conformities with ageing are published through C11 Reporting.
        </Typography>
      </BottomBar>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add corrective action</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <RequiredLabel label="Action" required />
            <TextField fullWidth variant="standard" value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value })} />
          </Box>
          <Box sx={{ mt: 2 }}>
            <RequiredLabel label="Owner" required />
            <Select fullWidth variant="standard" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })}>
              {['M. Idris (Processing)', 'F. Ahmed (Sourcing)', 'Warehouse — Gedaref', 'Quality — Gedaref'].map((o) => (
                <MenuItem key={o} value={o}>{o}</MenuItem>
              ))}
            </Select>
          </Box>
          <Box sx={{ mt: 2 }}>
            <RequiredLabel label="Target date" required />
            <TextField fullWidth variant="standard" value={draft.targetDate} onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })} />
          </Box>
          <Alert severity="info" sx={{ mt: 2, fontSize: '0.78rem' }}>
            Assigning the action creates an item in the owner's Core C2 Actions Inbox.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!draft.action.trim()}
            onClick={() => {
              updateNc(nc.id, {
                actions: [...nc.actions, { id: `CA-${Date.parse('2026-08-19') % 1000}-${nc.actions.length + 1}`, ...draft, status: 'Open', note: '' }],
                status: 'Actions in progress',
              });
              setAddOpen(false);
              setDraft({ action: '', owner: 'M. Idris (Processing)', targetDate: '25-Aug-2026' });
              say('Corrective action assigned — it appears in the owner’s Actions Inbox');
            }}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={closeOpen} onClose={() => setCloseOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Close non-conformity</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            The non-conformity is closed only when the corrective action is confirmed. Closure is recorded and audited
            (C8), and the stock block is released.
          </Alert>
          <RequiredLabel label="Resolution" required />
          <TextField fullWidth variant="standard" multiline minRows={2} value={resolution} onChange={(e) => setResolution(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!resolution.trim()}
            onClick={() => {
              updateNc(nc.id, { status: 'Closed', resolution });
              setCloseOpen(false);
              say(`${nc.id} closed on confirmed corrective action — stock block released`);
            }}
          >
            Close case
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
