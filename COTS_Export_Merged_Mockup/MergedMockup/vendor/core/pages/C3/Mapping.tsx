import React from 'react';
import {
  Box, Button, Paper, Typography, Stack, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Alert, Table, TableHead, TableRow, TableCell, TableBody, Chip, Autocomplete
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  EmptyState, HandOffBanner, PageBanner, PlaceholderNote, SectionBand, StatusChip, WhiteButton
} from '../../components/shared';
import { DataTable, Column } from '../../components/DataTable';
import { DOMAINS, MappingRec, UnmappedRec } from '../../mockData/c3';
import { ShellFooterNote } from '../../layouts/AppShell';

const domainName = (key: string) => DOMAINS.find((d) => d.key === key)?.name ?? key;

/** 3.3 External Mapping List and Form + 3.4 Unmapped Code Exception — WF-C3-03 / Steps 6–8 */
export const Mapping: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = React.useState(false);
  const [prefill, setPrefill] = React.useState<Partial<MappingRec> | null>(null);
  const [unmappedOpen, setUnmappedOpen] = React.useState(false);
  const [resolving, setResolving] = React.useState<UnmappedRec | null>(null);

  const columns: Column<MappingRec>[] = [
    { key: 'domain', label: 'Domain', value: (m) => domainName(m.domain) },
    { key: 'cotsCode', label: 'COTS code', render: (m) => <Typography sx={{ fontSize: 13, color: tokens.primary, fontWeight: 500 }}>{m.cotsCode}</Typography> },
    { key: 'cotsName', label: 'COTS name' },
    { key: 'externalSystem', label: 'External system', render: (m) => <Chip size="small" variant="outlined" label={m.externalSystem} sx={{ height: 19, fontSize: 10.5 }} /> },
    { key: 'externalCode', label: 'External code' },
    { key: 'validFrom', label: 'Valid from' },
    { key: 'validTo', label: 'Valid to', value: (m) => m.validTo ?? 'open' },
    { key: 'status', label: 'Status', render: (m) => <StatusChip status={m.status} /> }
  ];

  return (
    <>
      <PageBanner
        title="External mapping"
        breadcrumb={['Global', 'C3 Master Data', 'External mapping']}
        subtitle="WF-C3-03 / Steps 6–8 — the COTS code against the external code, maintained as master data in its own right"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => { setPrefill(null); setFormOpen(true); }}>New mapping</WhiteButton>
            <WhiteButton onClick={() => setUnmappedOpen(true)}>
              Unmapped codes ({s.unmapped.length})
            </WhiteButton>
            <WhiteButton onClick={() => navigate('/c3/domains')}>Back to domains</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        {s.unmapped.length > 0 && (
          <Alert
            severity="error" sx={{ mb: 2, fontSize: 13 }}
            action={<Button size="small" color="inherit" onClick={() => setUnmappedOpen(true)}>Review</Button>}
          >
            <b>{s.unmapped.length} unmapped code(s) have raised an exception.</b> An unmapped code raises an exception
            and the affected records are queued — the system never creates a master record silently to force a record
            through (WF-C3-03 / Step 8).
          </Alert>
        )}

        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#F7F9FB' }}>
          <Typography sx={{ fontSize: 13 }}>
            For every domain that also exists in an external system, a mapping table holds the COTS code against the
            external code — SAP material, vendor and customer codes, and Odoo logistics references. Mapping is itself
            governed master data, so it carries Draft and Pending Approval states and is audited like any other domain.
          </Typography>
          <HandOffBanner
            target="C12 / WF-C12-01 Standard Integration Exchange / Step 5"
            passed="Domain, COTS code or external code, external system, validity"
            returned="The translated code, or an unmapped-code exception with the record queued"
            resumes="Mapped → C12 / WF-C12-01 / Step 6. Unmapped → Step 10 for correction and reprocessing."
            to="/c12/exchanges"
            goLabel="Exchanges that used these mappings"
          />
          <PlaceholderNote>which domains are mastered in SAP and replicated into COTS read-only, and which are mastered in COTS (WF-C3-03 / Step 6).</PlaceholderNote>
        </Paper>

        <DataTable columns={columns} rows={s.mappings} selectable emptyMessage="No mappings defined" searchPlaceholder="Search mappings" />
        <ShellFooterNote />
      </Box>

      <MappingForm open={formOpen} onClose={() => setFormOpen(false)} prefill={prefill} />

      {/* 3.4 Unmapped Code Exception */}
      <Dialog open={unmappedOpen} onClose={() => setUnmappedOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontSize: 18 }}>Unmapped code exceptions — WF-C3-03 / Step 8</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ fontSize: 12.5, mb: 2 }}>
            The mapping is validated during every integration exchange. Where a code is unmapped, an exception is
            raised and the affected records are queued. <b>No master record is created silently to force a record
            through.</b>
          </Alert>
          {s.unmapped.length === 0 ? (
            <EmptyState message="No unmapped codes" hint="Every code arriving from an external system currently resolves to a COTS record." />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Interface</TableCell><TableCell>Direction</TableCell><TableCell>Domain</TableCell>
                  <TableCell>External system</TableCell><TableCell>External code</TableCell>
                  <TableCell>Correlation reference</TableCell><TableCell>Raised</TableCell>
                  <TableCell align="right">Records queued</TableCell><TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {s.unmapped.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>{u.interfaceName}</TableCell>
                    <TableCell>{u.direction}</TableCell>
                    <TableCell>{domainName(u.domain)}</TableCell>
                    <TableCell>{u.externalSystem}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{u.externalCode}</TableCell>
                    {/* C9 / WF-C9-02 / Step 1 — the correlation reference gives the full trail of the exchange */}
                    <TableCell>
                      <Button size="small" sx={{ fontFamily: 'monospace', fontSize: 12 }}
                              onClick={() => navigate(`/c9/exchanges/${u.correlation}`)}>
                        {u.correlation}
                      </Button>
                    </TableCell>
                    <TableCell>{u.at}</TableCell>
                    <TableCell align="right">{u.affected}</TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => setResolving(u)}>Create the missing mapping</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <HandOffBanner
            label="RETURN"
            target="C12 / WF-C12-01 / Step 10"
            passed="The corrected mapping"
            returned="The queued records can be corrected and reprocessed. C12 is built: its error queue groups these by cause class and shows the correction path for each."
            to="/c12/error-queue"
            goLabel="C12 error queue"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => setUnmappedOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <ResolveDialog unmapped={resolving} onClose={() => setResolving(null)} />
    </>
  );
};

const MappingForm: React.FC<{ open: boolean; onClose: () => void; prefill: Partial<MappingRec> | null }> = ({ open, onClose, prefill }) => {
  const s = useStore();
  const [domain, setDomain] = React.useState(prefill?.domain ?? 'commodity');
  const [record, setRecord] = React.useState<string | null>(null);
  const [system, setSystem] = React.useState<'SAP' | 'Odoo'>(prefill?.externalSystem ?? 'SAP');
  const [externalCode, setExternalCode] = React.useState(prefill?.externalCode ?? '');
  const [validFrom, setValidFrom] = React.useState('2026-09-01');
  const [validTo, setValidTo] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setDomain(prefill?.domain ?? 'commodity');
      setSystem(prefill?.externalSystem ?? 'SAP');
      setExternalCode(prefill?.externalCode ?? '');
      setRecord(null);
    }
  }, [open, prefill]);

  /** Only Active records may be mapped — a Draft record is not selectable anywhere. */
  const candidates = s.masterRecords.filter((r) => r.domain === domain && r.status === 'Active');
  const chosen = candidates.find((r) => r.code === record);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: 18 }}>New external mapping — WF-C3-03 / Steps 6–7</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
          <FormControl size="small">
            <InputLabel>Domain</InputLabel>
            <Select label="Domain" value={domain} onChange={(e) => { setDomain(e.target.value); setRecord(null); }}>
              {DOMAINS.map((d) => <MenuItem key={d.key} value={d.key}>{d.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Autocomplete
            size="small"
            options={candidates.map((r) => r.code)}
            value={record}
            onChange={(_, v) => setRecord(v)}
            renderInput={(p) => <TextField {...p} required label="COTS record (Active only)" helperText="A Draft record cannot be mapped" />}
          />
          <FormControl size="small">
            <InputLabel>External system</InputLabel>
            <Select label="External system" value={system} onChange={(e) => setSystem(e.target.value as 'SAP' | 'Odoo')}>
              <MenuItem value="SAP">SAP — material, vendor and customer codes</MenuItem>
              <MenuItem value="Odoo">Odoo — logistics references</MenuItem>
            </Select>
          </FormControl>
          <TextField size="small" required label="External code" value={externalCode} onChange={(e) => setExternalCode(e.target.value)} />
          <TextField size="small" required type="date" label="Valid from" InputLabelProps={{ shrink: true }} value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
          <TextField size="small" type="date" label="Valid to" InputLabelProps={{ shrink: true }} value={validTo} onChange={(e) => setValidTo(e.target.value)} />
        </Box>
        <Alert severity="info" sx={{ mt: 2, fontSize: 12.5 }}>
          Mapping is maintained as master data in its own right, so this submission follows the same creation,
          approval and audit control as any other domain — WF-C3-03 / Step 7.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose}>Cancel</Button>
        <Button
          variant="contained" disabled={!record || !externalCode || !validFrom}
          onClick={() => {
            s.saveMapping({
              id: `MP-N${Math.floor(Math.random() * 1)}${s.mappings.length + 1}`,
              domain, cotsCode: record!, cotsName: chosen?.name ?? '', externalSystem: system,
              externalCode, validFrom, validTo: validTo || undefined, status: 'Pending Approval'
            });
            onClose();
          }}
        >Submit for approval</Button>
      </DialogActions>
    </Dialog>
  );
};

const ResolveDialog: React.FC<{ unmapped: UnmappedRec | null; onClose: () => void }> = ({ unmapped, onClose }) => {
  const s = useStore();
  const [record, setRecord] = React.useState<string | null>(null);
  React.useEffect(() => { setRecord(null); }, [unmapped]);
  if (!unmapped) return null;

  const candidates = s.masterRecords.filter((r) => r.domain === unmapped.domain && r.status === 'Active');
  const chosen = candidates.find((r) => r.code === record);

  return (
    <Dialog open={!!unmapped} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 18 }}>Create the missing mapping</DialogTitle>
      <DialogContent>
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: '#FAFBFC' }}>
          <Typography sx={{ fontSize: 12.5 }}><b>Interface:</b> {unmapped.interfaceName} ({unmapped.direction})</Typography>
          <Typography sx={{ fontSize: 12.5 }}><b>External code:</b> {unmapped.externalSystem} {unmapped.externalCode}</Typography>
          <Typography sx={{ fontSize: 12.5 }}><b>Domain:</b> {domainName(unmapped.domain)}</Typography>
          <Typography sx={{ fontSize: 12.5 }}><b>Correlation reference:</b> {unmapped.correlation}</Typography>
          <Typography sx={{ fontSize: 12.5 }}><b>Records queued:</b> {unmapped.affected}</Typography>
        </Paper>
        <Autocomplete
          size="small"
          options={candidates.map((r) => r.code)}
          value={record}
          onChange={(_, v) => setRecord(v)}
          renderInput={(p) => <TextField {...p} required label={`COTS ${domainName(unmapped.domain)} to map to`} />}
        />
        {candidates.length === 0 && (
          <Alert severity="warning" sx={{ mt: 2, fontSize: 12.5 }}>
            No Active record exists in this domain to map to. The master record must be created and approved first —
            which is precisely why the exchange raised an exception rather than creating one silently.
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose}>Cancel</Button>
        <Button
          variant="contained" disabled={!record}
          onClick={() => { s.resolveUnmapped(unmapped.id, unmapped.externalCode, record!, chosen?.name ?? ''); onClose(); }}
        >Create mapping and release the queue</Button>
      </DialogActions>
    </Dialog>
  );
};
