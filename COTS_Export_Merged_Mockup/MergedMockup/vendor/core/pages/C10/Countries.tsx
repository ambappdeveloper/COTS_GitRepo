import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel,
  MenuItem, Paper, Select, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField,
  Typography
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  ActionBar, EmptyState, FieldGrid, HandOffBanner, PageBanner, PlaceholderNote, SideBySideCompare,
  SectionBand, StatusChip, WhiteButton
} from '../../components/shared';
import {
  ADDRESS_FORMATS, DATE_FORMATS, WORKING_DAY_PATTERNS, directionOf, fmtCurrency, fmtDate, fmtNumber, fmtTime
} from '../../mockData/c10';
import { DOMAINS } from '../../mockData/c3';
import { CHECKLISTS, DOC_TYPES } from '../../mockData/c7';
import { ShellFooterNote } from '../../layouts/AppShell';

/** 1.1 Country List — WF-C10-01 / Steps 1, 7 */
export const CountryList: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();

  return (
    <>
      <PageBanner
        title="Countries"
        breadcrumb={['Global', 'C10 Configuration', 'Countries']}
        subtitle="WF-C10-01 / Steps 1, 7 — a country is one process model expressed in configuration, approved and effective-dated"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c10/changes')}>Change requests</WhiteButton>
            <WhiteButton onClick={() => navigate('/c10/versions')}>Version history</WhiteButton>
            <WhiteButton onClick={() => navigate('/c10/report')}>Configuration report</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
          Nine modules have been reading configuration that no screen defined: the country context (C02), the generated
          code patterns (C03), the approval value bands (C04), the working calendar and quiet hours (C05), the document
          checklist (C07), the audit levels (C08) and the log levels (C09). This is where they are defined — and a change
          here is a versioned, approved, effective-dated thing rather than a saved field.
        </Alert>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Countries and their configuration versions</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Country</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Status</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Version</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Effective from</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Pending version</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Currency</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Reporting</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Steps applicable</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Open changes</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Conflicts</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {s.countryConfigs.map((c) => {
                const applicable = s.stepConfigs.filter((x) => x.country === c.country && x.applies).length;
                const total = s.stepConfigs.filter((x) => x.country === c.country).length;
                const open = s.changeRequests.filter((r) => (r.country === c.country || r.country === 'All countries')
                  && ['Draft', 'Pending approval', 'Approved — awaiting effective date'].includes(r.status)).length;
                const conflicts = s.conflictsFor(c.country);
                return (
                  <TableRow key={c.code} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/c10/countries/${c.country}`)}>
                    <TableCell sx={{ fontSize: 12.5 }}>{c.country} <span style={{ color: tokens.textSecondary }}>({c.iso})</span></TableCell>
                    <TableCell><StatusChip status={c.status} /></TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{c.version === 0 ? '—' : c.version}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{c.effectiveFrom}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {c.pendingVersion ? `v${c.pendingVersion} from ${c.pendingEffectiveFrom}` : '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{c.localCurrency}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{c.reportingCurrency}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{applicable} of {total}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{open}</TableCell>
                    <TableCell>
                      {conflicts.length > 0
                        ? <Chip size="small" label={`${conflicts.length} conflict`} sx={{ fontSize: 11, bgcolor: `${tokens.red}1A`, color: tokens.red }} />
                        : <Chip size="small" label="None" sx={{ fontSize: 11, bgcolor: `${tokens.green}1A`, color: tokens.green }} />}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
              A country that is not activated cannot be selected as a country context, which is the first visible
              consequence of activation. Egypt already appears as a country context on C09 incidents and has never been
              selectable — which is exactly what an unactivated country should look like.
            </Typography>
          </Box>
        </Paper>

        <HandOffBanner
          label="HAND-OFF"
          target="C2 / WF-C2-01 Country Context and Navigation"
          passed="The effective configuration drives the menu and each screen — open the module menu in a country where a step does not apply and the entry is absent, with the menu saying why"
        />
        <ShellFooterNote />
      </Box>
    </>
  );
};

/** 1.2 Country Parameters + 1.3 Operational Structure + 1.5 Checklists, routes and rules */
export const CountryParameters: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const { code = '' } = useParams();
  const c = s.countryConfig(code);
  const [submitOpen, setSubmitOpen] = React.useState(false);
  const [effectiveFrom, setEffectiveFrom] = React.useState('2026-09-01');
  const [reason, setReason] = React.useState('');
  const [blocked, setBlocked] = React.useState<string | null>(null);
  const [proposedDate, setProposedDate] = React.useState('yyyy-MM-dd');
  const [addDoc, setAddDoc] = React.useState(DOC_TYPES[0].name);
  const [addObject, setAddObject] = React.useState('Master data — Supplier');
  const [addReason, setAddReason] = React.useState('');

  if (!c) {
    return (
      <>
        <PageBanner title="Country" breadcrumb={['Global', 'C10 Configuration', 'Country']} />
        <Box sx={{ p: 3 }}><EmptyState message="That country could not be found." /></Box>
      </>
    );
  }

  const conflicts = s.conflictsFor(c.country);
  const structure = [
    { label: 'Cities', domain: 'city' },
    { label: 'Operational areas', domain: 'oparea' },
    { label: 'Warehouses', domain: 'warehouse' },
    { label: 'Processing facilities', domain: 'facility' },
    { label: 'Ports', domain: 'port' }
  ];
  const additions = s.checklistAdditions.filter((a) => a.country === c.country);
  const countryRoutes = s.routes.filter((r) => r.countries.length === 0 || r.countries.includes(c.country));
  const countryRules = s.rules.filter((r) => r.countries.length === 0 || r.countries.includes(c.country));

  return (
    <>
      <PageBanner
        title={`${c.country} — country parameters`}
        breadcrumb={['Global', 'C10 Configuration', 'Countries', c.country]}
        subtitle="WF-C10-01 / Steps 1–2, 4 — operating parameters, operational structure, checklists, routes and rules"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate(`/c10/countries/${c.country}/steps`)}>Process configuration</WhiteButton>
            <WhiteButton onClick={() => navigate('/c10/numbering')}>Numbering series</WhiteButton>
            <WhiteButton onClick={() => navigate('/c10/countries')}>All countries</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        {conflicts.length > 0 && (
          <Alert severity="error" sx={{ mb: 2, fontSize: 12.5 }}>
            <b>{conflicts.length} consistency conflict{conflicts.length === 1 ? '' : 's'} outstanding.</b> Activation and
            submission for approval are prevented until they are resolved — WF-C10-01 / Step 6.{' '}
            <Button size="small" onClick={() => navigate(`/c10/countries/${c.country}/steps`)}>Open the conflict report</Button>
          </Alert>
        )}

        {/* Step 1 — operating parameters */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Operating parameters — WF-C10-01 / Step 1</SectionBand>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <InputLabel>Local currency</InputLabel>
                <Select label="Local currency" value={c.localCurrency}
                        inputProps={{ 'aria-label': 'Local currency' }}
                        onChange={(e) => s.saveCountryParam(c.country, { localCurrency: e.target.value }, 'Local currency')}>
                  {['SDG', 'ETB', 'TZS', 'MZN', 'EGP', 'USD', 'AED'].map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 190 }}>
                <InputLabel>Reporting currency</InputLabel>
                <Select label="Reporting currency" value={c.reportingCurrency}
                        onChange={(e) => s.saveCountryParam(c.country, { reportingCurrency: e.target.value }, 'Reporting currency')}>
                  {['USD', 'EUR', 'AED'].map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Working calendar</InputLabel>
                <Select label="Working calendar" value={c.workingDays}
                        inputProps={{ 'aria-label': 'Working calendar' }}
                        onChange={(e) => s.saveCountryParam(c.country, { workingDays: e.target.value }, 'Working calendar')}>
                  {WORKING_DAY_PATTERNS.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField size="small" label="Season" value={c.season} sx={{ width: 120 }}
                         onChange={(e) => s.saveCountryParam(c.country, { season: e.target.value }, 'Season')} />
              <TextField size="small" label="Season starts" value={c.seasonStart} sx={{ width: 140 }} InputProps={{ readOnly: true }} />
              <TextField size="small" label="Season ends" value={c.seasonEnd} sx={{ width: 140 }} InputProps={{ readOnly: true }} />
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <InputLabel>Default language</InputLabel>
                <Select label="Default language" value={c.defaultLanguage}
                        inputProps={{ 'aria-label': 'Default language' }}
                        onChange={(e) => s.saveCountryParam(c.country, { defaultLanguage: e.target.value }, 'Default language')}>
                  {s.languages.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <InputLabel>Date format</InputLabel>
                <Select label="Date format" value={c.dateFormat}
                        inputProps={{ 'aria-label': 'Date format' }}
                        onChange={(e) => { setProposedDate(e.target.value); s.saveCountryParam(c.country, { dateFormat: e.target.value }, 'Date format'); }}>
                  {DATE_FORMATS.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 290 }}>
                <InputLabel>Address format</InputLabel>
                <Select label="Address format" value={c.addressFormat}
                        onChange={(e) => s.saveCountryParam(c.country, { addressFormat: e.target.value }, 'Address format')}>
                  {ADDRESS_FORMATS.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <FieldGrid items={[
              ['Additional languages', c.additionalLanguages.length ? c.additionalLanguages.join(', ') : 'None'],
              ['Reading direction', `${directionOf(c.defaultLanguage) === 'rtl' ? 'Right to left' : 'Left to right'} — derived from the language, not chosen`],
              ['Number format', `${fmtNumber(1234567.891, c.numberFormat)} — ${c.numberFormat.places} decimal places`]
            ]} columns={3} />
          </Box>
        </Paper>

        {/* the format preview: current beside proposed */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>What the parameters do — current beside proposed</SectionBand>
          <SideBySideCompare rows={[
            {
              label: 'Date', current: fmtDate('2026-08-18', c.dateFormat),
              proposed: fmtDate('2026-08-18', proposedDate === 'yyyy-MM-dd' && c.dateFormat === 'yyyy-MM-dd' ? 'dd/MM/yyyy' : proposedDate)
            },
            { label: 'Time', current: fmtTime('14:30', c.timeFormat), proposed: fmtTime('14:30', c.timeFormat === '24-hour' ? '12-hour' : '24-hour') },
            { label: 'Quantity', current: `${fmtNumber(1234567.891, c.numberFormat)} ${c.defaultUnit}`, proposed: `${fmtNumber(1234567.891, { decimal: ',', thousands: '.', places: 3 })} ${c.defaultUnit}` },
            { label: 'Amount', current: fmtCurrency(48500.5, c), proposed: fmtCurrency(48500.5, c, c.reportingCurrency) },
            { label: 'Address', current: c.addressFormat, proposed: ADDRESS_FORMATS.find((a) => a !== c.addressFormat) ?? '' }
          ]} />
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
              A format change is exactly the kind of change whose effect is invisible until it is shown, so the C03
              side-by-side compare pattern is reused here rather than a list of format codes.
            </Typography>
          </Box>
        </Paper>

        {/* public holidays and the two consumers of the calendar */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Working calendar and public holidays — defined once, read twice</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Date</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Public holiday</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {c.holidays.map((h) => (
                <TableRow key={h.date}>
                  <TableCell sx={{ fontSize: 12.5 }}>{fmtDate(h.date, c.dateFormat)}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{h.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12.5, mb: 1 }}>
              <b>{c.workingDays}</b>, with the holidays above. Two screens read this calendar and neither should hold its
              own copy:
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              <Button size="small" variant="outlined" onClick={() => navigate('/c4/sla')}>
                C04 service-level clock — counts working hours
              </Button>
              <Button size="small" variant="outlined" onClick={() => navigate('/c5/channels')}>
                C05 quiet hours — holds a notification outside working time
              </Button>
            </Stack>
          </Box>
        </Paper>

        {/* Step 2 — operational structure, linked not created */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Operational structure — WF-C10-01 / Step 2</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Structure</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Linked records in {c.country}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Governed in</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {structure.map((row) => {
                const d = DOMAINS.find((x) => x.key === row.domain);
                const count = s.masterRecords.filter((r) => r.domain === row.domain
                  && (r.country === c.country || !r.country)).length;
                return (
                  <TableRow key={row.label}>
                    <TableCell sx={{ fontSize: 12.5 }}>{row.label}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{count}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>C03 — {d?.name} ({d?.scope} scope, owner {d?.owner})</TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => navigate(`/c3/domains/${row.domain}`)}>Add in master data</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
              Nothing here is editable, and that is deliberate. Cities, locations, warehouses, facilities, ports and
              operational areas are governed master data: they are created and approved in C03 under its duplicate
              control and its approval route. C10 links them to a country; it does not become a second place to create
              them.
            </Typography>
          </Box>
          <Box sx={{ px: 2, pb: 2 }}>
            <HandOffBanner
              label="DEPENDENCY"
              target="C3 / WF-C3-01 Create and Approve Master Data"
              passed="Cities, locations, warehouses, facilities, ports and operational areas are governed master data and are linked here, not created here"
              to="/c3/domains"
              goLabel="Open master data"
            />
          </Box>
        </Paper>

        {/* Step 4 — checklists, routes and rules */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Checklists, routes and notification rules — WF-C10-01 / Step 4</SectionBand>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 500, mb: 1 }}>
              Country-specific mandatory documents (C7)
            </Typography>
            <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mb: 1.5 }}>
              This is the one place in the panel where C10 holds data rather than pointing at it: the checklist is
              country-specific by the workflow's own words, and the C07 checklist has no country dimension of its own.
              What is added here is read by the C07 checklist gate and blocks submission in this country.
            </Typography>
            {additions.length === 0
              ? <EmptyState message={`No country-specific mandatory document is set for ${c.country}.`} />
              : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: 12 }}>Object type</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>Mandatory document</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>Reason</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {additions.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell sx={{ fontSize: 12.5 }}>{a.objectType}</TableCell>
                        <TableCell sx={{ fontSize: 12.5 }}>{a.docType}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{a.reason}</TableCell>
                        <TableCell>
                          <Button size="small" color="warning" onClick={() => s.removeChecklistAddition(a.id)}>Remove</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 2, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 250 }}>
                <InputLabel>Object type</InputLabel>
                <Select label="Object type" value={addObject} onChange={(e) => setAddObject(e.target.value)}>
                  {CHECKLISTS.map((x) => <MenuItem key={x.objectType} value={x.objectType}>{x.objectType}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Mandatory document</InputLabel>
                <Select label="Mandatory document" value={addDoc} onChange={(e) => setAddDoc(e.target.value)}>
                  {DOC_TYPES.map((x) => <MenuItem key={x.name} value={x.name}>{x.name}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField size="small" label="Reason" value={addReason} sx={{ minWidth: 260 }}
                         onChange={(e) => setAddReason(e.target.value)} />
              <Button variant="outlined" disabled={!addReason.trim()}
                      onClick={() => { s.addChecklistAddition(c.country, addObject, addDoc, addReason.trim()); setAddReason(''); }}>
                Make it mandatory in {c.country}
              </Button>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mt: 3, flexWrap: 'wrap', rowGap: 1 }}>
              <Button size="small" variant="outlined" onClick={() => navigate('/c4/routes')}>
                Approval routes applying here ({countryRoutes.length}) — defined in C04
              </Button>
              <Button size="small" variant="outlined" onClick={() => navigate('/c5/rules')}>
                Notification rules applying here ({countryRules.length}) — maintained in C05
              </Button>
              <Button size="small" variant="outlined" onClick={() => navigate('/c7/register')}>
                Document register — C07
              </Button>
            </Stack>
          </Box>
        </Paper>

        <ActionBar
          left={<Button variant="outlined" onClick={() => navigate('/c10/countries')}>All countries</Button>}
          right={
            <Stack direction="row" spacing={1}>
              {c.status !== 'Active' && (
                <Button variant="outlined" onClick={() => {
                  const r = s.activateCountry(c.country);
                  setBlocked(r.ok ? null : (r.why ?? null));
                }}>
                  Activate the country
                </Button>
              )}
              <Button variant="contained" onClick={() => setSubmitOpen(true)}>Submit the configuration version</Button>
            </Stack>
          }
        />
        {blocked && <Alert severity="error" sx={{ mt: 2, fontSize: 12.5 }}>{blocked}</Alert>}
        <ShellFooterNote />
      </Box>

      {/* Step 7 — submission with an effective date */}
      <Dialog open={submitOpen} onClose={() => setSubmitOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 18 }}>Submit configuration version {c.version + 1}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, mb: 2 }}>
            The version, its current and proposed values and its effective-from date are passed to C04. Approved, the
            version becomes effective on its date; rejected, the previous version remains in force — WF-C10-01 / Step 7.
          </Typography>
          <Stack spacing={2}>
            <TextField size="small" label="Effective from" type="date" value={effectiveFrom}
                       InputLabelProps={{ shrink: true }} onChange={(e) => setEffectiveFrom(e.target.value)} />
            <TextField size="small" label="Business reason" value={reason} multiline minRows={3}
                       onChange={(e) => setReason(e.target.value)} />
          </Stack>
          {conflicts.length > 0 && (
            <Alert severity="error" sx={{ mt: 2, fontSize: 12.5 }}>
              Submission is prevented while {conflicts.length} consistency conflict
              {conflicts.length === 1 ? '' : 's'} remain{conflicts.length === 1 ? 's' : ''} open — WF-C10-01 / Step 6.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => setSubmitOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!reason.trim() || conflicts.length > 0}
            onClick={() => {
              const req = s.raiseChangeRequest({
                cls: 'Country parameter', parameter: `${c.country} configuration version ${c.version + 1}`,
                country: c.country, currentValue: `Version ${c.version}`, proposedValue: `Version ${c.version + 1}`,
                reason, effectiveFrom, originScreen: 'C10 country parameters', originRoute: `/c10/countries/${c.country}`
              });
              s.submitChangeRequest(req.id);
              setSubmitOpen(false);
              navigate(`/c10/changes/${req.id}`);
            }}
          >
            Submit for approval
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
