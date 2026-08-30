import React from 'react';
import {
  Alert, Box, Button, Chip, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  EmptyState, FieldGrid, HandOffBanner, PageBanner, PlaceholderNote, SectionBand, WhiteButton
} from '../../components/shared';
import { STEP_CATALOGUE, fmtCurrency, fmtDate, fmtNumber } from '../../mockData/c10';
import { CHECKLISTS } from '../../mockData/c7';
import { ShellFooterNote } from '../../layouts/AppShell';

/** 3.3 Configuration Version History — WF-C10-03 / Steps 4–5 */
export const ConfigVersions: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [country, setCountry] = React.useState(s.activeCountry);
  const [asAt, setAsAt] = React.useState('2026-05-01');

  const versions = s.versionsFor(country);
  const asAtView = s.configAsAt(country, asAt);
  const current = s.countryConfig(country);

  return (
    <>
      <PageBanner
        title="Configuration version history"
        breadcrumb={['Global', 'C10 Configuration', 'Version history']}
        subtitle="WF-C10-01 / Step 8 and WF-C10-03 / Steps 4–5 — effective periods, in-flight records, and the configuration as it stood on any past date"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c10/changes')}>Change requests</WhiteButton>
            <WhiteButton onClick={() => navigate('/c10/report')}>Configuration report</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2, fontSize: 13 }}>
          <b>Existing transactions continue under the configuration version that was in force when they were created, so
          historical records remain interpretable</b> — WF-C10-01 / Step 8. That single sentence is the difference between
          configuration and a settings page, and it is what this screen exists to show.
        </Alert>

        <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap', rowGap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Country</InputLabel>
            <Select label="Country" value={country} inputProps={{ 'aria-label': 'Country' }}
                    onChange={(e) => setCountry(e.target.value)}>
              {s.countryConfigs.map((c) => <MenuItem key={c.code} value={c.country}>{c.country}</MenuItem>)}
            </Select>
          </FormControl>
          <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
            {current?.status === 'Active'
              ? `Version ${current.version} is in force from ${current.effectiveFrom}.`
              : `${country} is ${current?.status.toLowerCase()} and has no version in force.`}
          </Typography>
        </Stack>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>{`Versions of the ${country} configuration`}</SectionBand>
          {versions.length === 0 ? <EmptyState message={`No version has taken effect for ${country}.`} /> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Version</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Effective from</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Effective to</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>What this version changed</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Approved by</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Records created</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Still open</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>State</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {versions.map((v) => {
                  const recs = s.recordsUnderVersion(country, v.version);
                  const open = recs.filter((x) => x.open);
                  const inForce = !v.effectiveTo;
                  return (
                    <TableRow key={`${v.country}-${v.version}`} hover>
                      <TableCell sx={{ fontSize: 12.5 }}>{v.version}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{v.effectiveFrom}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{v.effectiveTo ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{v.changes.join('; ')}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{v.approvedBy ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{recs.length}</TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{open.length}</TableCell>
                      <TableCell>
                        <Chip
                          size="small" label={inForce ? 'In force' : 'Superseded'}
                          sx={{
                            fontSize: 11,
                            bgcolor: inForce ? `${tokens.green}1A` : `${tokens.grey}1A`,
                            color: inForce ? tokens.green : tokens.grey
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Paper>

        {/* the in-flight statement, per record */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Records and the version they are interpreted under — WF-C10-01 / Step 8</SectionBand>
          {(() => {
            const rows = versions.flatMap((v) => s.recordsUnderVersion(country, v.version)
              .map((r) => ({ ...r, version: v.version })));
            if (rows.length === 0) return <EmptyState message={`No record in ${country} falls inside a version period.`} />;
            const currentVersion = current?.version ?? 0;
            return (
              <>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: 12 }}>Record</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>Created</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>Interpreted under</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>Open</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>Statement on the record</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.reference} hover>
                        <TableCell sx={{ fontSize: 12.5 }}>{r.reference}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{r.created}</TableCell>
                        <TableCell sx={{ fontSize: 12.5 }}>Version {r.version}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{r.open ? 'Yes' : 'No'}</TableCell>
                        <TableCell sx={{ fontSize: 12, color: tokens.textSecondary }}>
                          {r.version === currentVersion
                            ? `Created on ${r.created} and interpreted under configuration version ${r.version}, which is the version currently in force.`
                            : `Created on ${r.created} and interpreted under configuration version ${r.version}; version ${currentVersion} became effective later and does not apply to it.`}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
                    Nothing about an earlier record changes when a new version takes effect. It is a small line and it is
                    the module's whole argument.
                  </Typography>
                </Box>
              </>
            );
          })()}
        </Paper>

        {/* as-at reading */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>The configuration as it stood on a past date — WF-C10-03 / Step 5</SectionBand>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
              <TextField size="small" label="As at" type="date" value={asAt} InputLabelProps={{ shrink: true }}
                         onChange={(e) => setAsAt(e.target.value)} />
              <Typography sx={{ fontSize: 12.5 }}>
                {asAtView.version
                  ? <>On {asAt}, {country} was on <b>configuration version {asAtView.version.version}</b>, effective from {asAtView.version.effectiveFrom}.</>
                  : <>On {asAt}, {country} had no configuration version in force.</>}
              </Typography>
            </Stack>
            <FieldGrid items={[
              ['Version in force', asAtView.version ? `Version ${asAtView.version.version}` : 'None'],
              ['What it changed', asAtView.version?.changes.join('; ') ?? '—'],
              ['Approval value bands then in force', asAtView.bands.map((b) => `${b.name} ${b.from ?? 0}–${b.to ?? '∞'} ${b.unit}`).join('; ') || '—'],
              ['Raw goods batch code', `${asAtView.formulas[0]?.sample ?? '—'} (version ${asAtView.formulas[0]?.version ?? '—'})`],
              ['Finished goods batch code', `${asAtView.formulas[1]?.sample ?? '—'} (version ${asAtView.formulas[1]?.version ?? '—'})`]
            ]} columns={1} />
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary, px: 2 }}>
              An as-at view is what makes <i>any past transaction can be interpreted against the rules that were in force
              at the time</i> a usable statement rather than a stored history nobody can read. The applicable-step list is
              read from the current configuration, and the screen says so rather than implying a per-step history it does
              not hold.
            </Typography>
          </Box>
        </Paper>

        <ShellFooterNote />
      </Box>
    </>
  );
};

/** 3.4 Country Configuration Report — WF-C10-03 / Step 7 */
export const ConfigurationReport: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [country, setCountry] = React.useState(s.activeCountry);
  const c = s.countryConfig(country);

  if (!c) return <Box sx={{ p: 3 }}><EmptyState message="Select a country." /></Box>;

  const applies = STEP_CATALOGUE.filter((sd) => s.stepApplies(country, sd.key));
  const notApplies = STEP_CATALOGUE.filter((sd) => !s.stepApplies(country, sd.key));
  const additions = s.checklistAdditions.filter((a) => a.country === country);
  const countryRoutes = s.routes.filter((r) => r.countries.length === 0 || r.countries.includes(country));
  const countryRules = s.rules.filter((r) => r.countries.length === 0 || r.countries.includes(country));
  const series = s.numberingSeries.filter((n) => n.country === 'All countries' || n.country === country);
  const bands = s.thresholds10.filter((t) => t.cls === 'Approval value band');
  const versions = s.versionsFor(country);

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <Paper variant="outlined" sx={{ mb: 2 }}>
      <SectionBand>{title}</SectionBand>
      <Box sx={{ p: 2 }}>{children}</Box>
    </Paper>
  );

  return (
    <>
      <PageBanner
        title="Country configuration report"
        breadcrumb={['Global', 'C10 Configuration', 'Configuration report']}
        subtitle="WF-C10-03 / Step 7 — exactly which steps, fields, routes and rules apply: living process documentation for the business"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => window.print()}>Print</WhiteButton>
            <WhiteButton onClick={() => navigate('/c10/versions')}>Version history</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Country</InputLabel>
            <Select label="Country" value={country} inputProps={{ 'aria-label': 'Report country' }}
                    onChange={(e) => setCountry(e.target.value)}>
              {s.countryConfigs.map((x) => <MenuItem key={x.code} value={x.country}>{x.country}</MenuItem>)}
            </Select>
          </FormControl>
          <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
            Generated from the live configuration, not written. Change a step's applicability and reopen this report — the
            change appears in both the <i>applies</i> and the <i>does not apply</i> sections.
          </Typography>
        </Stack>

        <Section title={`${c.country} — configuration version ${c.version === 0 ? '—' : c.version}, effective from ${c.effectiveFrom}, as at 18 August 2026`}>
          <Typography sx={{ fontSize: 13.5 }}>
            {c.country} operates under one process model expressed in configuration. It is {c.status.toLowerCase()}, keeps
            its accounts in <b>{c.localCurrency}</b> and reports in <b>{c.reportingCurrency}</b>, works{' '}
            <b>{c.workingDays.toLowerCase()}</b> with {c.holidays.length} public holiday
            {c.holidays.length === 1 ? '' : 's'} recorded, and runs the <b>{c.season}</b> season from {c.seasonStart} to{' '}
            {c.seasonEnd}. Its default language is <b>{c.defaultLanguage}</b>
            {c.additionalLanguages.length ? `, with ${c.additionalLanguages.join(' and ')} also available` : ''}, read{' '}
            {s.directionFor(c.defaultLanguage) === 'rtl' ? 'right to left' : 'left to right'}. Dates are shown as{' '}
            {fmtDate('2026-08-18', c.dateFormat)}, quantities as {fmtNumber(1234567.891, c.numberFormat)} {c.defaultUnit},
            and amounts as {fmtCurrency(48500.5, c)}.
          </Typography>
        </Section>

        <Section title="Operational structure">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Structure</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Records linked</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[['Warehouses', 'warehouse'], ['Processing facilities', 'facility'], ['Operational areas', 'oparea'], ['Cities', 'city'], ['Ports', 'port']].map(([label, key]) => (
                <TableRow key={key}>
                  <TableCell sx={{ fontSize: 12.5 }}>{label}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>
                    {s.masterRecords.filter((r) => r.domain === key && (r.country === country || !r.country)).length}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        <Section title={`Process steps that apply — ${applies.length}`}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Module</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Step</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Mandatory</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Required fields</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {applies.map((sd) => {
                const cfg = s.stepConfigFor(country, sd.key);
                return (
                  <TableRow key={sd.key}>
                    <TableCell sx={{ fontSize: 12 }}>{sd.module}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{sd.step}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{cfg?.mandatory ? 'Yes' : 'No'}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{cfg?.requiredFields.length ? cfg.requiredFields.join(', ') : '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Section>

        <Section title={`Process steps that do not apply — ${notApplies.length}`}>
          <Typography sx={{ fontSize: 12.5, mb: 1.5 }}>
            What a country does <i>not</i> do is as much a part of its process model as what it does, so it is stated
            rather than left as an absence.
          </Typography>
          {notApplies.length === 0
            ? <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>Every configured step applies in {country}.</Typography>
            : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 12 }}>Module</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Step</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Effect</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {notApplies.map((sd) => (
                    <TableRow key={sd.key}>
                      <TableCell sx={{ fontSize: 12 }}>{sd.module}</TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{sd.step}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {sd.real ? `${sd.consumedBy} is not presented in ${country}.` : 'Documented in the workflow; the module is not built.'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </Section>

        <Section title="Document checklists">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Object type</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Step</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Mandatory documents</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Country-specific additions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {CHECKLISTS.map((cl) => {
                const added = additions.filter((a) => a.objectType === cl.objectType).map((a) => a.docType);
                return (
                  <TableRow key={cl.objectType}>
                    <TableCell sx={{ fontSize: 12.5 }}>{cl.objectType}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{cl.step}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{cl.mandatory.join(', ')}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{added.length ? added.join(', ') : '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Section>

        <Section title="Approval routes and the value bands that select between them">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Route</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Object type</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Countries</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Value band</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {countryRoutes.map((r) => {
                const band = bands.find((b) => b.routeId === r.id);
                return (
                  <TableRow key={r.id}>
                    <TableCell sx={{ fontSize: 12.5 }}>{r.id}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{r.objectType}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{r.countries.length ? r.countries.join(', ') : 'All countries'}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {band ? `${band.name}: ${band.from ?? 0}–${band.to ?? '∞'} ${band.unit}` : (r.thresholdMeasure ? `${r.thresholdFrom ?? 0}–${r.thresholdTo ?? '∞'} ${r.thresholdUnit}` : '—')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Section>

        <Section title={`Notification rules applying in ${country} — ${countryRules.length}`}>
          <Typography sx={{ fontSize: 12.5 }}>
            {countryRules.filter((r) => r.active).length} active, {countryRules.filter((r) => !r.active).length} inactive.
            Maintained in C05; listed here so the country's statement is complete.
          </Typography>
        </Section>

        <Section title="Numbering series">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Document type</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Format</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Next number</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Reset</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {series.map((n) => (
                <TableRow key={n.id}>
                  <TableCell sx={{ fontSize: 12.5 }}>{n.documentType}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    {n.prefix}{n.includeCountryCode ? `${c.iso}-` : ''}{n.includeYear !== 'None' ? `${n.includeYear.toLowerCase()} year-` : ''}{'0'.repeat(n.sequenceLength)}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12.5, fontFamily: 'monospace' }}>{s.seriesSample(n.id)}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{n.reset}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        <Section title="Business rules">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Rule</TableCell>
                <TableCell sx={{ fontSize: 12 }}>In force</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {s.formulas.map((f) => {
                const v = s.formulaSample(f.key);
                return (
                  <TableRow key={f.key}>
                    <TableCell sx={{ fontSize: 12.5 }}>{f.name}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      Version {v.version} from {v.effectiveFrom} — sample <span style={{ fontFamily: 'monospace' }}>{v.sample}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
              {s.thresholds10.map((t) => (
                <TableRow key={t.id}>
                  <TableCell sx={{ fontSize: 12.5 }}>{t.cls} — {t.name}{t.commodity ? ` (${t.commodity})` : ''}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{t.from ?? 0}–{t.to ?? '∞'} {t.unit}, from {t.effectiveFrom}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        <Section title="Localisation">
          <Typography sx={{ fontSize: 12.5 }}>
            Default language <b>{c.defaultLanguage}</b>
            {c.additionalLanguages.length ? `, additional: ${c.additionalLanguages.join(', ')}` : ''}. Reading direction{' '}
            {s.directionFor(c.defaultLanguage) === 'rtl' ? 'right to left' : 'left to right'}. Coverage in{' '}
            {c.defaultLanguage}: {s.coverageFor(c.defaultLanguage).translated} of{' '}
            {s.coverageFor(c.defaultLanguage).total} keys, with {s.fallbackCount(c.defaultLanguage)} falling back to
            English rather than failing.
          </Typography>
        </Section>

        <Section title="Change history">
          {versions.length === 0
            ? <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>No version has taken effect.</Typography>
            : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 12 }}>Version</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Effective period</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Changes</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Approved by</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {versions.map((v) => (
                    <TableRow key={v.version}>
                      <TableCell sx={{ fontSize: 12.5 }}>{v.version}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{v.effectiveFrom} to {v.effectiveTo ?? 'present'}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{v.changes.join('; ')}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{v.approvedBy ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </Section>

        <HandOffBanner
          label="HAND-OFF"
          target="C11 / WF-C11-01 Running a Report"
          passed="The per-country configuration report belongs in the shared reporting area with its parameter panel and export. C11 now registers it as report R-10 — this screen remains the printable statement, and both read one configuration."
          to="/c11/reports/R-10"
          goLabel="Open R-10 in the reporting area"
        />
        <ShellFooterNote />
      </Box>
    </>
  );
};
