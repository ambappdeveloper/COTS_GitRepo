import React from 'react';
import {
  Box, Button, Paper, Typography, Tabs, Tab, TextField, Select, MenuItem, FormControl, InputLabel,
  Chip, Stack, Alert, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle,
  DialogContent, DialogActions, Divider
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  ActionBar, ConfirmDialog, EmptyState, FieldGrid, FormSectionCard, HandOffBanner, PageBanner,
  PlaceholderNote, RecordHeader, SectionBand, SideBySideCompare, StatusChip, WhiteButton
} from '../../components/shared';
import { DataTable, Column } from '../../components/DataTable';
import { HistoryPanel8 } from '../../components/HistoryPanel8';
import { DocumentsPanel7 } from '../../components/DocumentsPanel7';
import { RouteProgress } from '../../components/RouteProgress';
import { CommentThread } from '../../components/CommentThread';
import { ActivityTimeline } from '../../components/ActivityTimeline';
import { DOMAINS, DOMAIN_ATTRS, GENERIC_ATTRS, MasterRecord, AttrDef } from '../../mockData/c3';
import { ShellFooterNote } from '../../layouts/AppShell';

const domainOf = (key?: string) => DOMAINS.find((d) => d.key === key);
const attrsFor = (key: string): AttrDef[] => DOMAIN_ATTRS[key] ?? GENERIC_ATTRS;

const isRequired = (a: AttrDef, values: Record<string, string>) =>
  !!a.required || (!!a.requiredWhen && values[a.requiredWhen.label] === a.requiredWhen.equals);

/* ------------------------- 1.2 Master Record List ------------------------- */

export const MasterRecordList: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const { domain } = useParams();
  const d = domainOf(domain);

  if (!d) return <Box sx={{ p: 3 }}><EmptyState message="Domain not found" /></Box>;

  const rows = s.masterRecords.filter((r) => r.domain === d.key && (d.scope === 'Global' || r.country === s.activeCountry));

  const columns: Column<MasterRecord>[] = [
    { key: 'code', label: 'Code', render: (r) => <Typography sx={{ fontSize: 13, color: tokens.primary, fontWeight: 500 }}>{r.code}</Typography> },
    { key: 'name', label: 'Name' },
    {
      key: 'status', label: 'Status', render: (r) => (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <StatusChip status={r.status} />
          {r.status === 'Draft' && <Typography sx={{ fontSize: 10.5, color: tokens.textSecondary }}>not selectable in transactions</Typography>}
        </Stack>
      )
    },
    ...(d.scope === 'Country' ? [{ key: 'country', label: 'Country' } as Column<MasterRecord>] : []),
    { key: 'owner', label: 'Owner' },
    ...(d.effectiveDated ? [
      { key: 'validFrom', label: 'Valid from', value: (r: MasterRecord) => r.versions.find((v) => v.status === 'Current')?.validFrom ?? '—' } as Column<MasterRecord>,
      { key: 'validTo', label: 'Valid to', value: (r: MasterRecord) => r.versions.find((v) => v.status === 'Current')?.validTo ?? 'open' } as Column<MasterRecord>
    ] : []),
    { key: 'version', label: 'Version', value: (r) => String(r.versions.filter((v) => v.status !== 'Future').length || '—') },
    { key: 'lastChanged', label: 'Last changed' },
    { key: 'changedBy', label: 'Changed by' }
  ];

  return (
    <>
      <PageBanner
        title={`${d.name} records`}
        breadcrumb={[d.scope === 'Global' ? 'Global' : s.activeCountry, 'C3 Master Data', d.name]}
        subtitle={`${d.group} · ${d.scope} scope · ${d.governed ? 'approval required' : 'immediate activation'} · coding ${d.coding.mode === 'Generated' ? `generated from ${d.coding.formula}` : `manual, ${d.coding.hint}`}`}
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate(`/c3/domains/${d.key}/new`)}>New {d.name.toLowerCase()}</WhiteButton>
            <WhiteButton onClick={() => navigate('/c3/bulk-load')}>Bulk load</WhiteButton>
            <WhiteButton onClick={() => navigate('/c3/mapping')}>External mapping</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        {d.scope === 'Country' && (
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: '#F7F9FB' }}>
            <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
              This domain is country-scoped, so the list shows <b>{s.activeCountry}</b> only. Switching country in the
              header re-filters it.
            </Typography>
          </Paper>
        )}
        <DataTable columns={columns} rows={rows} selectable onRowClick={(r) => navigate(`/c3/records/${r.id}`)} emptyMessage={`No ${d.name.toLowerCase()} records`} />
        <ShellFooterNote />
      </Box>
    </>
  );
};

/* ------------------------- 1.3 Master Record Form ------------------------- */

let seqCounter = 200;

export const MasterRecordForm: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const { domain } = useParams();
  const d = domainOf(domain)!;
  const attrs = attrsFor(d.key);

  const generated = d.coding.mode === 'Generated';
  const codingPrefix = d.coding.mode === 'Generated' ? d.coding.formula.split('-')[0] : d.name.slice(0, 3).toUpperCase();
  const codingHelp = d.coding.mode === 'Generated'
    ? `Generated from the numbering series configured for this document type in C10 — change the series and the next code changes with it`
    : `Entered manually and validated against the domain rule — ${d.coding.hint}`;
  const codingHint = d.coding.mode === 'Manual' ? d.coding.hint : '';
  /* C10 / WF-C10-01 / Step 5 — the code comes from the numbering series configured per
   * document type, not from the hard-coded domain pattern this form used until C10. */
  const seriesNumber = s.nextNumberFor(d.key);
  const [code, setCode] = React.useState(() => (generated ? (seriesNumber || `${codingPrefix}-0${++seqCounter}`) : ''));
  const [name, setName] = React.useState('');
  const [owner, setOwner] = React.useState(d.owner);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [documents, setDocuments] = React.useState<MasterRecord['documents']>([]);
  const [dupOpen, setDupOpen] = React.useState(false);
  const [dupConfirmed, setDupConfirmed] = React.useState(false);
  const [effectiveFrom, setEffectiveFrom] = React.useState('2026-09-01');

  React.useEffect(() => () => { s.setDirty(null); }, []);
  const touch = () => s.setDirty(`New ${d.name.toLowerCase()} — ${name || 'unnamed'} in progress`);

  const codeValid = generated || (d.coding.mode === 'Manual' && new RegExp(d.coding.pattern).test(code));
  const missingAttrs = attrs.filter((a) => isRequired(a, values) && !values[a.label]);
  const missingDocs = d.mandatoryDocs.filter((m) => !documents.some((x) => x.docType === m));
  const rentedNeedsAgreement = d.key === 'warehouse' && values['Owned or rented'] === 'Rented' && !documents.some((x) => x.docType === 'Rental agreement');

  /** WF-C3-01 / Step 4 — duplicate check on code, name and, for parties, the registration or tax identifier */
  const duplicates = s.masterRecords.filter((r) => {
    if (r.domain !== d.key) return false;
    const nameHit = name.trim().length > 3 && r.name.toLowerCase().includes(name.trim().toLowerCase());
    const codeHit = code.trim().length > 2 && r.code.toLowerCase() === code.trim().toLowerCase();
    const taxHit = !!values['Tax identifier'] && r.attrs['Tax identifier'] === values['Tax identifier'];
    return nameHit || codeHit || taxHit;
  });

  const blocked =
    !name || !codeValid || missingAttrs.length > 0 || missingDocs.length > 0 || rentedNeedsAgreement ||
    (duplicates.length > 0 && !dupConfirmed) ||
    (d.effectiveDated && !effectiveFrom);

  const build = (status: MasterRecord['status']): MasterRecord => ({
    id: `MD-N${++seqCounter}`,
    domain: d.key,
    code: code || `${d.name.slice(0, 3).toUpperCase()}-${seqCounter}`,
    name,
    status,
    country: d.scope === 'Country' ? s.activeCountry : undefined,
    owner,
    attrs: values,
    versions: [],
    documents,
    dependencies: [],
    lastChanged: '2026-08-18 09:00',
    changedBy: s.currentUser?.name ?? '—',
    currentStep: 0,
    steps: [
      { seq: 1, role: 'COUNTRY_MANAGER', type: 'Sequential', approver: 'Grace Mensah', sla: '2 working days' },
      ...(d.group === 'Parties' || d.group === 'Commodity' || d.group === 'Financial'
        ? [{ seq: 2, role: 'COMPLIANCE_OFFICER', type: 'Sequential' as const, approver: 'Fatima Idris', sla: '2 working days' }]
        : [])
    ],
    comments: []
  });

  const reason = () => {
    if (!name) return 'A name is required.';
    if (!codeValid) return `The code must match the domain rule: ${codingHint}.`;
    if (missingAttrs.length) return `${missingAttrs.length} mandatory attribute(s) outstanding: ${missingAttrs.map((a) => a.label).join(', ')}.`;
    if (rentedNeedsAgreement) return 'A rented warehouse requires the rental agreement to be attached — WF-C3-01 / Step 3.';
    if (missingDocs.length) return `Mandatory document(s) outstanding: ${missingDocs.join(', ')}.`;
    if (duplicates.length && !dupConfirmed) return 'A potential duplicate was found. Confirm the record is genuinely new, or abandon the entry.';
    if (d.effectiveDated && !effectiveFrom) return 'An effective-from date is required for this domain.';
    return '';
  };

  return (
    <>
      <PageBanner
        title={`New ${d.name}`}
        breadcrumb={[d.scope === 'Global' ? 'Global' : s.activeCountry, 'C3 Master Data', d.name, 'New']}
        subtitle="WF-C3-01 / Steps 1–6"
      />
      <Box sx={{ p: 3 }}>
        <FormSectionCard title="1 — Identity and scope">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <TextField size="small" label="Domain" value={d.name} InputProps={{ readOnly: true }} />
            <TextField
              size="small" label="Scope"
              value={d.scope === 'Global' ? 'Global — available to all countries' : `Country — ${s.activeCountry}`}
              InputProps={{ readOnly: true }}
            />
            <TextField
              size="small" required label="Code" value={code}
              onChange={(e) => { setCode(e.target.value); touch(); }}
              InputProps={{ readOnly: generated }}
              error={!codeValid && code.length > 0}
              helperText={codingHelp}
            />
            <TextField size="small" required label="Name" value={name} onChange={(e) => { setName(e.target.value); touch(); }} />
            <TextField size="small" required label="Owner" value={owner} onChange={(e) => { setOwner(e.target.value); touch(); }} />
            {d.effectiveDated && (
              <TextField
                size="small" required type="date" label="Effective from" InputLabelProps={{ shrink: true }}
                value={effectiveFrom} onChange={(e) => { setEffectiveFrom(e.target.value); touch(); }}
                helperText="This domain is effective-dated — WF-C3-02 / Step 2"
              />
            )}
          </Box>
          {d.key === 'batchformula' && (
            <PlaceholderNote>the batch coding structure and formula for raw and finished goods, to be provided by the business (WF-C3-01 / Step 2).</PlaceholderNote>
          )}
        </FormSectionCard>

        <FormSectionCard title={`2 — ${d.name} attributes`}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            {attrs.map((a) => {
              const req = isRequired(a, values);
              const err = req && !values[a.label];
              const common = {
                size: 'small' as const, label: a.label, required: req, error: err,
                value: values[a.label] ?? '',
                onChange: (e: any) => { setValues((p) => ({ ...p, [a.label]: e.target.value })); setDupConfirmed(false); touch(); },
                helperText: a.hint ?? (a.requiredWhen ? `Mandatory when ${a.requiredWhen.label} is ${a.requiredWhen.equals}` : ' ')
              };
              if (a.control === 'select') {
                return (
                  <FormControl key={a.label} size="small" required={req} error={err}>
                    <InputLabel>{a.label}</InputLabel>
                    <Select label={a.label} value={values[a.label] ?? ''} onChange={common.onChange}>
                      {(a.options ?? []).map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </Select>
                  </FormControl>
                );
              }
              if (a.control === 'date') return <TextField key={a.label} {...common} type="date" InputLabelProps={{ shrink: true }} />;
              if (a.control === 'number') return <TextField key={a.label} {...common} type="number" />;
              if (a.control === 'textarea') return <TextField key={a.label} {...common} multiline minRows={2} />;
              return <TextField key={a.label} {...common} />;
            })}
          </Box>
          {d.key === 'warehouse' && values['Owned or rented'] === 'Rented' && (
            <Alert severity="info" sx={{ mt: 2, fontSize: 12.5 }}>
              A rented warehouse requires start and end dates, payment terms, currency, amount, owner, contact
              details and the rental agreement attachment — the domain-specific validation named in
              WF-C3-01 / Step 3.
            </Alert>
          )}
        </FormSectionCard>

        <FormSectionCard title="3 — Duplicate check">
          <Typography sx={{ fontSize: 13, mb: 1 }}>
            The check compares <b>{d.duplicateKeys.join(', ')}</b> for this domain.
          </Typography>
          {duplicates.length === 0 ? (
            <Alert severity="success" sx={{ fontSize: 12.5 }}>No potential duplicate found on the attributes entered so far.</Alert>
          ) : dupConfirmed ? (
            <Alert severity="success" sx={{ fontSize: 12.5 }}>
              Confirmed as genuinely new despite {duplicates.length} potential match(es). The confirmation is recorded, so the
              decision to create a near-duplicate is auditable.
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ fontSize: 12.5 }}>
              {duplicates.length} potential duplicate(s) found.
              <Button size="small" sx={{ ml: 1 }} onClick={() => setDupOpen(true)}>Review matches</Button>
            </Alert>
          )}
        </FormSectionCard>

        {/* C07 1.1–1.5 — documents attach to the record being created, under the same rules */}
        <FormSectionCard
          title="4 — Supporting documents"
          note="Documents attach under the C07 rules — type-driven metadata, validation, versioning — so the checklist for this domain is satisfied before submission."
        >
          <DocumentsPanel7
            recordKey={code || 'new record'}
            recordName={`${code || 'new'} ${name || d.name}`}
            objectType={`Master data — ${d.name}`}
            country={d.scope === 'Country' ? s.activeCountry : 'Global'}
            module="C3 Master Data"
          />
        </FormSectionCard>

        <ActionBar
          left={<Button variant="outlined" onClick={() => { s.setDirty(null); navigate(`/c3/domains/${d.key}`); }}>Cancel</Button>}
          right={
            <>
              <Button variant="outlined" disabled={!name} onClick={() => { s.setDirty(null); const r = build('Draft'); s.saveMaster(r); navigate(`/c3/records/${r.id}`); }}>Save Draft</Button>
              <Button variant="contained" disabled={blocked} onClick={() => { s.setDirty(null); const r = build('Draft'); s.submitMaster(r); navigate(`/c3/records/${r.id}`); }}>
                {d.governed ? 'Submit for Approval' : 'Create and activate'}
              </Button>
            </>
          }
        />
        {blocked && <Typography sx={{ fontSize: 12, color: tokens.red, mt: 1 }}>{reason()}</Typography>}
        {!d.governed && (
          <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mt: 1 }}>
            {d.name} is a low-risk list configured for immediate activation, so no approval step applies — WF-C3-01 / Step 7.
          </Typography>
        )}
        <ShellFooterNote />
      </Box>

      {/* 1.4 Duplicate Check Results */}
      <Dialog open={dupOpen} onClose={() => setDupOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: 18 }}>Potential duplicates — WF-C3-01 / Step 4</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, mb: 1.5 }}>
            The check compared <b>{d.duplicateKeys.join(', ')}</b> and found the following existing records.
          </Typography>
          <Table size="small">
            <TableHead><TableRow><TableCell>Code</TableCell><TableCell>Name</TableCell><TableCell>Status</TableCell><TableCell>Matched on</TableCell></TableRow></TableHead>
            <TableBody>
              {duplicates.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell><Typography sx={{ fontSize: 13, color: tokens.primary, cursor: 'pointer' }} onClick={() => navigate(`/c3/records/${r.id}`)}>{r.code}</Typography></TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell><StatusChip status={r.status} /></TableCell>
                  <TableCell>
                    {r.attrs['Tax identifier'] && r.attrs['Tax identifier'] === values['Tax identifier']
                      ? 'Tax identifier'
                      : r.code.toLowerCase() === code.trim().toLowerCase() ? 'Code' : 'Name'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Alert severity="info" sx={{ mt: 2, fontSize: 12.5 }}>
            Confirming the record is genuinely new is recorded against the entry, so the decision is auditable.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" color="error" onClick={() => { setDupOpen(false); navigate(`/c3/domains/${d.key}`); }}>Abandon this entry</Button>
          <Button variant="contained" onClick={() => { setDupConfirmed(true); setDupOpen(false); }}>Confirm genuinely new and continue</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

/* ------------------------- 1.5 Master Record Detail ------------------------- */

export const MasterRecordDetail: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const { id } = useParams();
  const r = s.masterRecords.find((x) => x.id === id);
  const c4View = s.approvalById(id ?? '');
  const [tab, setTab] = React.useState(0);
  const [dialog, setDialog] = React.useState<null | 'Approved' | 'Rejected' | 'Returned for Amendment'>(null);
  const [amendOpen, setAmendOpen] = React.useState(false);
  const [deactOpen, setDeactOpen] = React.useState(false);

  if (!r) return <Box sx={{ p: 3 }}><EmptyState message="Record not found" /></Box>;
  const d = domainOf(r.domain)!;
  const current = r.versions.find((v) => v.status === 'Current');
  const returnedComment = r.status === 'Returned for Amendment' ? s.returnReasonFor(r.code) : undefined;
  const following = s.subscriptions.find((b) => b.userId === (s.currentUser?.id ?? 'U-001') && b.record.startsWith(r.code));

  const actions = (
    <>
      {r.status === 'Draft' && <>
        <WhiteButton onClick={() => navigate(`/c3/domains/${d.key}/new`)}>Edit</WhiteButton>
        <WhiteButton onClick={() => s.submitMaster(r)}>Submit for Approval</WhiteButton>
      </>}
      {r.status === 'Pending Approval' && <>
        <WhiteButton onClick={() => setDialog('Approved')}>Approve</WhiteButton>
        <WhiteButton onClick={() => setDialog('Returned for Amendment')}>Return for Amendment</WhiteButton>
        <WhiteButton onClick={() => setDialog('Rejected')}>Reject</WhiteButton>
      </>}
      {r.status === 'Returned for Amendment' && <WhiteButton onClick={() => s.submitMaster(r)}>Resubmit</WhiteButton>}
      {r.status === 'Active' && <>
        <WhiteButton onClick={() => setAmendOpen(true)}>Amend</WhiteButton>
        <WhiteButton onClick={() => setDeactOpen(true)}>Deactivate</WhiteButton>
      </>}
      {r.status === 'Inactive' && <WhiteButton onClick={() => s.reactivateMaster(r.id)}>Reactivate</WhiteButton>}
      {/* C5 / WF-C5-03 / Step 5 — follow the record to receive its status changes as a subscriber */}
      {following
        ? <Button size="small" variant="outlined" sx={{ color: '#fff', borderColor: '#fff' }}
                  onClick={() => s.unsubscribe(following.id)}>Following</Button>
        : <WhiteButton onClick={() => s.subscribeToRecord(`${r.code} ${r.name}`, `Master data — ${d.name}`, r.country ?? 'Global', `/c3/records/${r.id}`)}>
            Follow this record
          </WhiteButton>}
    </>
  );

  return (
    <>
      <PageBanner title={d.name} breadcrumb={[r.country ?? 'Global', 'C3 Master Data', d.name, r.code]} />
      <RecordHeader
        name={r.name}
        status={r.status}
        reference={r.code}
        date={current ? `Version ${current.version} · valid from ${current.validFrom}` : 'No approved version yet'}
        meta={[
          ['Domain', `${d.name} (${d.group})`],
          ['Scope', r.country ?? 'Global'],
          ['Owner', r.owner],
          ['Governance', d.governed ? 'Approval required' : 'Immediate activation'],
          ['Effective dating', d.effectiveDated ? 'On' : 'Off']
        ]}
        actions={actions}
      />
      <Box sx={{ px: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: `1px solid ${tokens.border}` }}>
          <Tab label="Summary" /><Tab label="Versions" /><Tab label="Documents" /><Tab label="Comments" /><Tab label="Approval" /><Tab label="Activity" /><Tab label="History" />
        </Tabs>
      </Box>
      <Box sx={{ p: 3 }}>
        {r.status === 'Draft' && (
          <Alert severity="warning" sx={{ mb: 2, fontSize: 13 }}>
            This record is <b>not selectable in transactions</b> until it is Active — WF-C3-01 / Step 6.
          </Alert>
        )}
        {r.pendingAmendment && (
          <Alert severity="info" sx={{ mb: 2, fontSize: 13 }}>
            An amendment is awaiting approval{r.pendingAmendment.effectiveFrom ? ` with an effective-from date of ${r.pendingAmendment.effectiveFrom}` : ''}.
            The current values remain in force until it is approved.
          </Alert>
        )}

        {tab === 0 && (
          <Paper variant="outlined">
            <SectionBand>Identity and scope</SectionBand>
            <FieldGrid items={[
              ['Code', r.code], ['Name', r.name], ['Status', <StatusChip status={r.status} />],
              ['Domain', d.name], ['Domain group', d.group], ['Scope', r.country ?? 'Global'],
              ['Owner', r.owner], ['Coding rule', d.coding.mode === 'Generated' ? `Generated · ${d.coding.formula}` : `Manual · ${d.coding.hint}`],
              ['Duplicate check on', d.duplicateKeys.join(', ')]
            ]} />
            <SectionBand>{d.name} attributes</SectionBand>
            <FieldGrid items={Object.entries(r.attrs)} />
            <SectionBand>Consumption</SectionBand>
            <Box sx={{ p: 2 }}>
              {r.dependencies.length === 0
                ? <Typography sx={{ fontSize: 13, color: tokens.textSecondary }}>No module currently references this record.</Typography>
                : (
                  <Table size="small">
                    <TableHead><TableRow><TableCell>Type</TableCell><TableCell>Reference</TableCell><TableCell>Detail</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
                    <TableBody>
                      {r.dependencies.map((x) => (
                        <TableRow key={x.ref}>
                          <TableCell>{x.kind}</TableCell>
                          <TableCell sx={{ color: tokens.primary }}>{x.ref}</TableCell>
                          <TableCell>{x.detail}</TableCell>
                          <TableCell><StatusChip status={x.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mt: 1.5 }}>
                Everything listed here would block deactivation — WF-C3-02 / Step 7.
              </Typography>
            </Box>
          </Paper>
        )}

        {tab === 1 && <VersionsPanel record={r} />}

        {/* C07 1.1–1.5 — the same panel on a master data record */}
        {tab === 2 && (
          <DocumentsPanel7
            recordKey={r.code}
            recordName={`${r.code} ${r.name}`}
            objectType={`Master data — ${d.name}`}
            country={r.country ?? 'Global'}
            module="C3 Master Data"
            route={`/c3/records/${r.id}`}
          />
        )}

        {/* C06 1.1 — the same panel, in the same position, on a master record */}
        {tab === 3 && (
          <CommentThread
            recordKey={r.code}
            recordName={`${r.code} ${r.name}`}
            objectType={`Master data — ${d.name}`}
            country={r.country ?? 'Global'}
            module="C3 Master Data"
            route={`/c3/records/${r.id}`}
          />
        )}

        {tab === 4 && (
          <>
            {/* C04 1.4 — the route progress panel is a view of C4, on the subject record */}
            {c4View && (
              <>
                <RouteProgress view={c4View} compact />
                <Box sx={{ mb: 2 }}>
                  <Button size="small" variant="outlined" onClick={() => navigate(`/c4/approvals/${r.id}`)}>
                    Open the approval task in C4
                  </Button>
                </Box>
              </>
            )}
            <Paper variant="outlined" sx={{ mb: 2 }}>
              <SectionBand>Approval route — resolved from the domain and the country</SectionBand>
              {r.steps.length === 0 ? (
                <Box sx={{ p: 2 }}>
                  <Alert severity="info" sx={{ fontSize: 13 }}>
                    {d.name} is a low-risk list configured for immediate activation, so no approval route applies —
                    WF-C3-01 / Step 7.
                  </Alert>
                </Box>
              ) : (
                <Table size="small">
                  <TableHead><TableRow><TableCell>Step</TableCell><TableCell>Approver role</TableCell><TableCell>Approver</TableCell><TableCell>Type</TableCell><TableCell>SLA</TableCell><TableCell>Decision</TableCell><TableCell>Comment</TableCell><TableCell>When</TableCell></TableRow></TableHead>
                  <TableBody>
                    {r.steps.map((st) => (
                      <TableRow key={st.seq} sx={{ bgcolor: r.status === 'Pending Approval' && st.seq === r.currentStep + 1 ? '#F2F8FD' : undefined }}>
                        <TableCell>{st.seq}</TableCell>
                        <TableCell>{st.role}</TableCell>
                        <TableCell>{st.approver}</TableCell>
                        <TableCell>{st.type}</TableCell>
                        <TableCell>{st.sla}</TableCell>
                        <TableCell>{st.decision ? <StatusChip status={st.decision} /> : '—'}</TableCell>
                        <TableCell sx={{ maxWidth: 280 }}>{st.comment ?? '—'}</TableCell>
                        <TableCell>{st.at ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <Box sx={{ p: 2 }}>
                <HandOffBanner
                  target="C4 / WF-C4-01 Standard Approval Cycle"
                  passed="Object type (master data domain), country, requester, master record reference, attached documents"
                  returned="Approved / Rejected / Returned for amendment"
                  resumes="Approved → C3 / WF-C3-01 / Step 9. Returned → Step 6 (Draft). Rejected → record closed."
                />
                <HandOffBanner label="DEPENDENCY" target="C10 / WF-C10-01 Configuring a Country" passed="Domain and country" returned="Whether approval is required and which route applies" />
                <HandOffBanner target="C6 / WF-C6-02 Comments within Approvals and Exceptions" passed="Decision comment" returned="Locked decision comment on the record" />
                <HandOffBanner target="C8 / WF-C8-01 Capturing an Audit Entry" passed="Creation and approval history" returned="Immutable entry; master data approval is a sensitive action" />
              </Box>
            </Paper>
          </>
        )}

        {/* C06 2.4 — the merged activity timeline over C6, C7 and C8 */}
        {tab === 5 && <ActivityTimeline recordKey={r.code} recordName={`${r.code} ${r.name}`} />}

        {/* C08 2.1 — the record history, in business language */}
        {tab === 6 && <HistoryPanel8 recordKey={r.code} recordName={`${r.code} ${r.name}`} />}

        <ShellFooterNote />
      </Box>

      <ConfirmDialog
        open={dialog === 'Approved'} title="Approve this master data record"
        body={<>On final approval the record becomes Active and is immediately available to all modules within its scope — WF-C3-01 / Step 9. Master data approval is classified as a sensitive action.</>}
        commentLabel="Comment" confirmLabel="Approve"
        onClose={() => setDialog(null)} onConfirm={(c) => s.decideMaster(r.id, 'Approved', c)}
      />
      <ConfirmDialog
        open={dialog === 'Rejected'} title="Reject this master data record"
        body="The record is closed and the requester is notified. A comment is mandatory."
        commentLabel="Reason for rejection" commentRequired confirmLabel="Reject" confirmColor="error"
        onClose={() => setDialog(null)} onConfirm={(c) => s.decideMaster(r.id, 'Rejected', c)}
      />
      <ConfirmDialog
        open={dialog === 'Returned for Amendment'} title="Return for amendment"
        body="The record returns to Draft for the data owner. The returning comment is shown to them prominently."
        commentLabel="Reason for return" commentRequired confirmLabel="Return for Amendment" confirmColor="warning"
        onClose={() => setDialog(null)} onConfirm={(c) => s.decideMaster(r.id, 'Returned for Amendment', c)}
      />

      <AmendDialog open={amendOpen} onClose={() => setAmendOpen(false)} record={r} />
      <DeactivateDialog open={deactOpen} onClose={() => setDeactOpen(false)} record={r} />
    </>
  );
};

/* ------------------------- 2.2 Version history and effective dating ------------------------- */

const VersionsPanel: React.FC<{ record: MasterRecord }> = ({ record }) => {
  const d = domainOf(record.domain)!;
  const [asAt, setAsAt] = React.useState('2026-08-18');

  const resolved = [...record.versions]
    .filter((v) => v.validFrom <= asAt && (!v.validTo || v.validTo >= asAt))
    .sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0];

  return (
    <>
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <SectionBand>Version history</SectionBand>
        {record.versions.length === 0 ? <EmptyState message="No approved version yet" hint="A record has no version until it is first approved." /> : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Version</TableCell><TableCell>Status</TableCell><TableCell>Valid from</TableCell><TableCell>Valid to</TableCell>
                <TableCell>Changed value</TableCell><TableCell>Reason for change</TableCell><TableCell>Approved by</TableCell><TableCell>Approved at</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {record.versions.map((v) => (
                <TableRow key={v.version} hover>
                  <TableCell>{v.version}</TableCell>
                  <TableCell><StatusChip status={v.status === 'Current' ? 'Active' : v.status === 'Future' ? 'Pending Approval' : 'Superseded'} /></TableCell>
                  <TableCell>{v.validFrom}</TableCell>
                  <TableCell>{v.validTo ?? 'open'}</TableCell>
                  <TableCell>{v.changed}</TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>{v.reason}</TableCell>
                  <TableCell>{v.approvedBy ?? '—'}</TableCell>
                  <TableCell>{v.approvedAt ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Box sx={{ p: 2 }}>
          <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>
            Every previous version remains queryable with its validity period and the reason for change — WF-C3-02 / Step 5.
            A version marked as future-dated is visible but not yet in force.
          </Typography>
        </Box>
      </Paper>

      <Paper variant="outlined">
        <SectionBand>Value as at a date — the rule in WF-C3-02 / Step 3</SectionBand>
        <Box sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <TextField size="small" type="date" label="Transaction date" InputLabelProps={{ shrink: true }} value={asAt} onChange={(e) => setAsAt(e.target.value)} />
            <Box>
              <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>Value that a transaction on this date would resolve</Typography>
              <Typography sx={{ fontSize: 18, fontWeight: 500, color: tokens.primary }}>
                {resolved ? resolved.changed : 'No version was in force on that date'}
              </Typography>
              {resolved && <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>Version {resolved.version} · valid from {resolved.validFrom}{resolved.validTo ? ` to ${resolved.validTo}` : ''}</Typography>}
            </Box>
          </Stack>
          <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mt: 1.5 }}>
            Transactions always resolve the value applicable at the transaction date, so historical records remain
            reproducible{d.effectiveDated ? '' : '. This domain is not effective-dated, so amendments replace the value rather than adding a validity period'}.
          </Typography>
          {!d.effectiveDated && (
            <PlaceholderNote>the country and execution requirement matrix, and the inter-country transfer price matrix, so both can be modelled as master data (WF-C3-02 / Step 2).</PlaceholderNote>
          )}
        </Box>
      </Paper>
    </>
  );
};

/* ------------------------- 2.1 Amendment request ------------------------- */

const AmendDialog: React.FC<{ open: boolean; onClose: () => void; record: MasterRecord }> = ({ open, onClose, record }) => {
  const s = useStore();
  const d = domainOf(record.domain)!;
  const attrs = attrsFor(d.key);
  const [patch, setPatch] = React.useState<Record<string, string>>({});
  const [effectiveFrom, setEffectiveFrom] = React.useState('2026-09-01');
  const [reason, setReason] = React.useState('');
  const [critical, setCritical] = React.useState(true);

  React.useEffect(() => { if (open) { setPatch({}); setReason(''); } }, [open]);

  const changed = Object.entries(patch).filter(([k, v]) => v !== '' && v !== record.attrs[k]);
  const rows = changed.map(([k, v]) => ({ label: k, current: record.attrs[k] ?? '—', proposed: v }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: 18 }}>Amend {record.code} — WF-C3-02 / Steps 1–4</DialogTitle>
      <DialogContent>
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Current value beside proposed value</SectionBand>
          {rows.length === 0
            ? <Box sx={{ p: 2 }}><Typography sx={{ fontSize: 13, color: tokens.textSecondary }}>Change a value below and the comparison appears here.</Typography></Box>
            : <SideBySideCompare rows={rows} />}
        </Paper>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          {attrs.filter((a) => a.control !== 'textarea').slice(0, 8).map((a) => (
            a.control === 'select' ? (
              <FormControl key={a.label} size="small">
                <InputLabel>{a.label}</InputLabel>
                <Select label={a.label} value={patch[a.label] ?? record.attrs[a.label] ?? ''} onChange={(e) => setPatch((p) => ({ ...p, [a.label]: e.target.value }))}>
                  {(a.options ?? []).map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </Select>
              </FormControl>
            ) : (
              <TextField
                key={a.label} size="small" label={a.label}
                type={a.control === 'number' ? 'number' : a.control === 'date' ? 'date' : 'text'}
                InputLabelProps={a.control === 'date' ? { shrink: true } : undefined}
                value={patch[a.label] ?? record.attrs[a.label] ?? ''}
                onChange={(e) => setPatch((p) => ({ ...p, [a.label]: e.target.value }))}
              />
            )
          ))}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          {d.effectiveDated ? (
            <TextField
              size="small" required type="date" label="Effective from" InputLabelProps={{ shrink: true }}
              value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)}
              helperText="This attribute is effective-dated, so the previous value is retained rather than overwritten"
            />
          ) : (
            <Alert severity="info" sx={{ fontSize: 12.5 }}>
              This domain is not effective-dated, so the value is replaced under the same approval and audit control —
              WF-C3-02 / Step 2.
            </Alert>
          )}
          <FormControl size="small">
            <InputLabel>Attribute criticality</InputLabel>
            <Select label="Attribute criticality" value={critical ? 'critical' : 'non-critical'} onChange={(e) => setCritical(e.target.value === 'critical')}>
              <MenuItem value="critical">Critical — the same route as creation</MenuItem>
              <MenuItem value="non-critical">Non-critical — the shorter route configured for the domain</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ gridColumn: { md: 'span 2' } }}>
            <TextField size="small" fullWidth required multiline minRows={2} label="Reason for change" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Box>
        </Box>

        <HandOffBanner
          target="C4 / WF-C4-01 Standard Approval Cycle"
          passed="Master record reference, current and proposed values, effective-from date, attribute criticality"
          returned="Approved / Rejected / Returned for amendment"
          resumes="Approved → a new version is created (Step 5). Rejected or returned → the current values remain in force."
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose}>Cancel</Button>
        <Button
          variant="contained" disabled={rows.length === 0 || !reason.trim()}
          onClick={() => {
            s.amendMaster(record.id, Object.fromEntries(changed), d.effectiveDated ? effectiveFrom : undefined, reason, critical);
            onClose();
          }}
        >Submit amendment</Button>
      </DialogActions>
    </Dialog>
  );
};

/* ------------------------- 2.3 Deactivate and blocking dependencies ------------------------- */

const DeactivateDialog: React.FC<{ open: boolean; onClose: () => void; record: MasterRecord }> = ({ open, onClose, record }) => {
  const s = useStore();
  const navigate = useNavigate();
  const [reason, setReason] = React.useState('');
  const [checked, setChecked] = React.useState(false);
  const blocked = record.dependencies.length > 0;

  React.useEffect(() => { if (open) { setReason(''); setChecked(false); } }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: 18 }}>Deactivate {record.code} — WF-C3-02 / Steps 6–8</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ fontSize: 12.5, mb: 2 }}>
          Deactivation is requested rather than deletion. The record is never deleted, so historical transactions and
          reports remain intact.
        </Alert>
        <TextField size="small" fullWidth required multiline minRows={2} label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} sx={{ mb: 2 }} />

        {!checked ? (
          <Button variant="outlined" onClick={() => setChecked(true)}>Check dependencies</Button>
        ) : blocked ? (
          <>
            <Alert severity="error" sx={{ fontSize: 13 }}>
              <b>Deactivation refused — {record.dependencies.length} blocking record(s).</b>
              <Typography sx={{ fontSize: 13, mt: 0.5 }}>
                The system checks for open transactions, allocated stock and active contracts, and refuses deactivation
                where these exist — WF-C3-02 / Step 7.
              </Typography>
            </Alert>
            <Table size="small" sx={{ mt: 1.5 }}>
              <TableHead><TableRow><TableCell>Type</TableCell><TableCell>Reference</TableCell><TableCell>Detail</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
              <TableBody>
                {record.dependencies.map((x) => (
                  <TableRow key={x.ref} hover>
                    <TableCell>{x.kind}</TableCell>
                    <TableCell sx={{ color: tokens.primary }}>{x.ref}</TableCell>
                    <TableCell>{x.detail}</TableCell>
                    <TableCell><StatusChip status={x.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        ) : (
          <Alert severity="success" sx={{ fontSize: 13 }}>
            No open transactions, allocated stock or active contracts reference this record. Deactivation may proceed
            through the controlled route.
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose}>Cancel</Button>
        <Button
          variant="contained" color="error"
          disabled={!checked || blocked || !reason.trim()}
          onClick={() => { s.deactivateMaster(record.id, reason); onClose(); }}
        >Deactivate</Button>
      </DialogActions>
    </Dialog>
  );
};
