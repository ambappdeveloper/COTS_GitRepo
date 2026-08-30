import React from 'react';
import {
  Alert, Box, Button, Chip, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Switch, Table,
  TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  EmptyState, HandOffBanner, PageBanner, PlaceholderNote, SectionBand, WhiteButton
} from '../../components/shared';
import {
  AVAILABLE_ELEMENTS, FORMAT_SAMPLE, LANGUAGES, THRESHOLD_CLASSES, ThresholdClass,
  fmtCurrency, fmtDate, fmtNumber, fmtTime, renderFormula, directionOf
} from '../../mockData/c10';
import { ShellFooterNote } from '../../layouts/AppShell';

/** 1.6 Numbering Series — WF-C10-01 / Step 5 */
export const NumberingSeriesPage: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();

  return (
    <>
      <PageBanner
        title="Numbering series"
        breadcrumb={['Global', 'C10 Configuration', 'Numbering series']}
        subtitle="WF-C10-01 / Step 5 — per country and document type, and the series that actually generates the code"
        actions={<WhiteButton onClick={() => navigate('/c3/domains')}>C03 master data</WhiteButton>}
      />
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
          C03's generated domains used hard-coded patterns — <code>SUP-&lt;sequence 6&gt;</code>,
          <code> WH-&lt;sequence 4&gt;</code> — from the third module onwards. They read this screen now. Change the
          supplier prefix or the sequence length and the code the next supplier record is created with changes with it.
        </Alert>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Series per country and document type</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Country</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Document type</TableCell>
                <TableCell sx={{ fontSize: 12, width: 110 }}>Prefix</TableCell>
                <TableCell sx={{ fontSize: 12, width: 90 }}>Country code</TableCell>
                <TableCell sx={{ fontSize: 12, width: 140 }}>Year</TableCell>
                <TableCell sx={{ fontSize: 12, width: 110 }}>Sequence</TableCell>
                <TableCell sx={{ fontSize: 12, width: 150 }}>Reset</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Next number</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Generates for</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {s.numberingSeries.map((n) => (
                <TableRow key={n.id}>
                  <TableCell sx={{ fontSize: 12 }}>{n.country}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{n.documentType}</TableCell>
                  <TableCell>
                    <TextField size="small" value={n.prefix} sx={{ width: 90 }}
                               inputProps={{ 'aria-label': `${n.documentType} prefix` }}
                               onChange={(e) => s.saveSeries(n.id, { prefix: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <Switch size="small" checked={n.includeCountryCode}
                            inputProps={{ 'aria-label': `${n.documentType} country code` }}
                            onChange={(e) => s.saveSeries(n.id, { includeCountryCode: e.target.checked })} />
                  </TableCell>
                  <TableCell>
                    <Select size="small" fullWidth value={n.includeYear}
                            inputProps={{ 'aria-label': `${n.documentType} year` }}
                            onChange={(e) => s.saveSeries(n.id, { includeYear: e.target.value as typeof n.includeYear })}>
                      {['None', 'Two-digit', 'Four-digit'].map((x) => <MenuItem key={x} value={x} sx={{ fontSize: 13 }}>{x}</MenuItem>)}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <TextField size="small" value={n.sequenceLength} sx={{ width: 70 }}
                               inputProps={{ 'aria-label': `${n.documentType} sequence length` }}
                               onChange={(e) => s.saveSeries(n.id, { sequenceLength: Number(e.target.value) || 1 })} />
                  </TableCell>
                  <TableCell>
                    <Select size="small" fullWidth value={n.reset}
                            inputProps={{ 'aria-label': `${n.documentType} reset` }}
                            onChange={(e) => s.saveSeries(n.id, { reset: e.target.value as typeof n.reset })}>
                      {['Never', 'Annually', 'Per season'].map((x) => <MenuItem key={x} value={x} sx={{ fontSize: 13 }}>{x}</MenuItem>)}
                    </Select>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12.5, fontFamily: 'monospace' }}>{s.seriesSample(n.id)}</TableCell>
                  <TableCell sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
                    {n.domain
                      ? <Button size="small" onClick={() => navigate(`/c3/domains/${n.domain}/new`)}>C03 {n.domain} — create one</Button>
                      : 'Not generated in the built modules'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
              The next number is rendered live from the current settings. Open a C03 create form for a generated domain
              and the code offered is this number — the sample field alone would not have been a demonstration.
            </Typography>
          </Box>
        </Paper>

        <HandOffBanner
          label="HAND-OFF"
          target="C3 / WF-C3-01 Create and Approve Master Data"
          passed="Codes are generated from the series configured here at master record creation"
          to="/c3/domains/supplier/new"
          goLabel="Create a supplier and see the code"
        />
        <ShellFooterNote />
      </Box>
    </>
  );
};

/** 2.1 Coding Formula Builder — WF-C10-02 / Steps 1–2 */
export const CodingFormulas: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [key, setKey] = React.useState<'raw' | 'finished'>('raw');
  const [newElement, setNewElement] = React.useState(AVAILABLE_ELEMENTS[0].element);
  const [effectiveFrom, setEffectiveFrom] = React.useState('2026-10-01');
  const [requirement, setRequirement] = React.useState('');

  const f = s.formulas.find((x) => x.key === key)!;
  const inForce = f.versions.find((v) => v.status === 'In force') ?? f.versions[f.versions.length - 1];
  const [draft, setDraft] = React.useState(inForce.elements);

  React.useEffect(() => {
    const cur = s.formulas.find((x) => x.key === key);
    const v = cur?.versions.find((y) => y.status === 'In force') ?? cur?.versions[cur.versions.length - 1];
    if (v) setDraft(v.elements);
  }, [key, s.formulas]);

  return (
    <>
      <PageBanner
        title="Coding formulas"
        breadcrumb={['Global', 'C10 Configuration', 'Coding formulas']}
        subtitle="WF-C10-02 / Steps 1–2 — the batch code structure for raw and finished goods, versioned and effective-dated"
        actions={<WhiteButton onClick={() => navigate('/c10/thresholds')}>Thresholds and tolerances</WhiteButton>}
      />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel>Formula</InputLabel>
            <Select label="Formula" value={key} inputProps={{ 'aria-label': 'Formula' }}
                    onChange={(e) => setKey(e.target.value as 'raw' | 'finished')}>
              {s.formulas.map((x) => <MenuItem key={x.key} value={x.key}>{x.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
            The workflow names two formulas and their elements exactly, so the builder offers exactly those elements.
          </Typography>
        </Stack>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Versions and their effective periods — WF-C10-02 / Step 2</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Version</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Effective from</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Structure</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Sample code</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Customer requirement</TableCell>
                <TableCell sx={{ fontSize: 12 }}>State</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {f.versions.map((v) => (
                <TableRow key={v.version}>
                  <TableCell sx={{ fontSize: 12.5 }}>{v.version}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{v.effectiveFrom}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{v.elements.map((e) => e.element).join(' · ')}</TableCell>
                  <TableCell sx={{ fontSize: 12.5, fontFamily: 'monospace' }}>{renderFormula(v)}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{v.customerRequirement ?? '—'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={v.status}
                          sx={{
                            fontSize: 11,
                            bgcolor: v.status === 'In force' ? `${tokens.green}1A` : `${tokens.grey}1A`,
                            color: v.status === 'In force' ? tokens.green : tokens.grey
                          }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>
              A standard formula generates the code on creation of the record (C3). A customer requirement that demands
              an amended batch code produces a <b>new version effective from a date</b>, and records created before that
              date keep codes generated under the earlier version — which is why a code that does not match the current
              formula is explained rather than looking like a defect.
            </Typography>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Elements, in order</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12, width: 60 }}>#</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Element</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Source</TableCell>
                <TableCell sx={{ fontSize: 12, width: 90 }}>Length</TableCell>
                <TableCell sx={{ fontSize: 12, width: 110 }}>Separator</TableCell>
                <TableCell sx={{ fontSize: 12, width: 120 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {draft.map((e, i) => (
                <TableRow key={`${e.element}-${i}`}>
                  <TableCell sx={{ fontSize: 12.5 }}>{i + 1}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{e.element}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{e.source}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{e.length}</TableCell>
                  <TableCell sx={{ fontSize: 12.5, fontFamily: 'monospace' }}>{e.separator || '—'}</TableCell>
                  <TableCell>
                    <Button size="small" color="warning"
                            onClick={() => setDraft((prev) => prev.filter((_, n) => n !== i))}>
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Add an element</InputLabel>
                <Select label="Add an element" value={newElement} inputProps={{ 'aria-label': 'Add an element' }}
                        onChange={(e) => setNewElement(e.target.value)}>
                  {AVAILABLE_ELEMENTS.map((a) => <MenuItem key={a.element} value={a.element}>{a.element}</MenuItem>)}
                </Select>
              </FormControl>
              <Button variant="outlined" onClick={() => {
                const src = AVAILABLE_ELEMENTS.find((a) => a.element === newElement)!;
                setDraft((prev) => [...prev.map((x, i) => (i === prev.length - 1 ? { ...x, separator: '-' } : x)),
                  { element: src.element, source: src.source, length: src.sample.length, separator: '' }]);
              }}>
                Add
              </Button>
              <Typography sx={{ fontSize: 12.5 }}>
                Sample from the draft: <b style={{ fontFamily: 'monospace' }}>{renderFormula({ ...inForce, elements: draft })}</b>
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 2, alignItems: 'center' }}>
              <TextField size="small" label="Applies from" type="date" value={effectiveFrom}
                         InputLabelProps={{ shrink: true }} onChange={(e) => setEffectiveFrom(e.target.value)} />
              <TextField size="small" label="Customer requirement" value={requirement} sx={{ minWidth: 340 }}
                         onChange={(e) => setRequirement(e.target.value)}
                         helperText="Why an amended version exists" />
              <Button variant="contained" disabled={draft.length === 0}
                      onClick={() => s.saveFormulaElements(key, draft, effectiveFrom, requirement.trim())}>
                Create a new version
              </Button>
            </Stack>
          </Box>
        </Paper>

        <HandOffBanner
          label="HAND-OFF"
          target="C3 / WF-C3-01 Create and Approve Master Data"
          passed="Codes are generated from the formula at master record creation, under the version in force on the creation date"
        />
        <HandOffBanner
          label="HAND-OFF"
          target="C10 / WF-C10-03 Configuration Change Control"
          passed="A new formula version raises a change request rather than saving directly — every rule, formula and localisation change follows the change control route"
          to="/c10/changes"
          goLabel="Open the change register"
        />
        <ShellFooterNote />
      </Box>
    </>
  );
};

/** 2.2 Thresholds and Tolerances — WF-C10-02 / Step 3 */
export const Thresholds10: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [cls, setCls] = React.useState<ThresholdClass | 'All'>('All');
  const rows = s.thresholds10.filter((t) => cls === 'All' || t.cls === cls);
  const f = s.fmt();

  return (
    <>
      <PageBanner
        title="Thresholds and tolerances"
        breadcrumb={['Global', 'C10 Configuration', 'Thresholds and tolerances']}
        subtitle="WF-C10-02 / Step 3 — approval value bands, variance tolerances, capacity limits and quality ranges"
        actions={<WhiteButton onClick={() => navigate('/c4/routes')}>C04 approval routes</WhiteButton>}
      />
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
          <b>Changing a value band changes an approval outcome.</b> Lower the single-approver ceiling below 30,000 USD and
          resolve a 30,000 USD record: a different route applies, and the C04 resolution strip names the band that decided
          it. That is what <i>consumed by the approval engine at runtime</i> means.
        </Alert>

        <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel>Class</InputLabel>
            <Select label="Class" value={cls} onChange={(e) => setCls(e.target.value as ThresholdClass | 'All')}>
              {['All', ...THRESHOLD_CLASSES].map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>{`Thresholds — ${rows.length} of ${s.thresholds10.length}`}</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Class</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Name</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Scope</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Commodity</TableCell>
                <TableCell sx={{ fontSize: 12, width: 120 }}>From</TableCell>
                <TableCell sx={{ fontSize: 12, width: 120 }}>To</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Unit</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Consumed by</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Effective from</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell sx={{ fontSize: 12 }}>{t.cls}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{t.name}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{t.scope}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{t.commodity ?? '—'}</TableCell>
                  <TableCell>
                    <TextField size="small" value={t.from ?? ''} sx={{ width: 100 }}
                               inputProps={{ 'aria-label': `${t.name} from` }}
                               onChange={(e) => s.saveThreshold10(t.id, { from: Number(e.target.value) || 0 })} />
                  </TableCell>
                  <TableCell>
                    <TextField size="small" value={t.to ?? ''} sx={{ width: 100 }}
                               inputProps={{ 'aria-label': `${t.name} to` }}
                               onChange={(e) => s.saveThreshold10(t.id, { to: e.target.value === '' ? undefined : Number(e.target.value) })} />
                  </TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{t.unit}</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>
                    {t.routeId
                      ? <Button size="small" onClick={() => navigate(`/c4/routes/${t.routeId}`)}>{t.consumedBy}</Button>
                      : <span style={{ color: tokens.textSecondary }}>{t.consumedBy}</span>}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{t.effectiveFrom}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
              Values are shown in the active country's number format — {f.number(50000)} reads differently in Mozambique
              than in Sudan, which is the point of the regional formats screen. Only the approval value bands have a
              built consumer; the other three classes name the modules that will read them.
            </Typography>
          </Box>
        </Paper>

        <HandOffBanner
          label="DEPENDENCY"
          target="C4 / WF-C4-01 Standard Approval Cycle"
          passed="Approval value bands are consumed as route thresholds at runtime"
          to="/c4/submission-check"
          goLabel="Resolve a route and see the band applied"
        />
        <ShellFooterNote />
      </Box>
    </>
  );
};

/** 2.3 Translation Resources — WF-C10-02 / Steps 4–5 */
export const Translations: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [newLanguage, setNewLanguage] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const lang = s.previewLanguage;
  const cov = s.coverageFor(lang);
  const falling = s.fallbackCount(lang);
  const rtl = s.directionFor(lang) === 'rtl';
  const groups = Array.from(new Set(s.translations.map((t) => t.group)));

  return (
    <>
      <PageBanner
        title="Translations"
        breadcrumb={['Global', 'C10 Configuration', 'Translations']}
        subtitle="WF-C10-02 / Steps 4–5 — translatable resources, fallback to the default language, and right-to-left where the language requires it"
        actions={<WhiteButton onClick={() => navigate('/c10/formats')}>Regional formats</WhiteButton>}
      />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap', rowGap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Preview language</InputLabel>
            <Select label="Preview language" value={lang} inputProps={{ 'aria-label': 'Preview language' }}
                    onChange={(e) => s.setPreviewLanguage(e.target.value)}>
              {s.languages.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </Select>
          </FormControl>
          <Typography sx={{ fontSize: 12.5 }}>
            Coverage: <b>{cov.translated} of {cov.total}</b> keys ({Math.round((cov.translated / cov.total) * 100)}%).{' '}
            <b>{falling}</b> key{falling === 1 ? '' : 's'} fall{falling === 1 ? 's' : ''} back to English.
          </Typography>
          <Box sx={{ flex: 1 }} />
          <TextField size="small" label="Add a language" value={newLanguage} sx={{ width: 200 }}
                     onChange={(e) => setNewLanguage(e.target.value)} />
          <Button variant="outlined" onClick={() => {
            const r = s.addLanguage(newLanguage);
            setError(r.ok ? null : (r.why ?? null));
            if (r.ok) setNewLanguage('');
          }}>
            Add
          </Button>
        </Stack>
        {error && <Alert severity="error" sx={{ mb: 2, fontSize: 12.5 }}>{error}</Alert>}

        <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
          <b>Translation present → the content is presented in the user's preferred language. Translation absent → it
          falls back to the default language rather than failing</b> (Step 4). Nothing below fails; the untranslated keys
          are marked as falling back, and the count above states the size of a translation job rather than implying it is
          small.
        </Alert>

        {/* the fallback demonstration */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>{`Preview in ${lang} — ${rtl ? 'right to left' : 'left to right'}`}</SectionBand>
          <Box sx={{ p: 2 }}>
            <Box dir={rtl ? 'rtl' : 'ltr'} sx={{ border: `1px solid ${tokens.border}`, p: 2, bgcolor: '#FAFBFC' }}>
              <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 1, mb: 1.5 }}>
                {['nav.home', 'nav.inbox', 'nav.masterData', 'nav.approvals', 'nav.documents', 'nav.configuration'].map((k) => {
                  const v = s.t(k, lang);
                  return (
                    <Chip key={k} size="small" label={v.text} variant="outlined"
                          sx={{ fontSize: 12, borderStyle: v.fallback ? 'dashed' : 'solid', color: v.fallback ? tokens.amber : undefined }} />
                  );
                })}
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 12 }}>{s.t('field.country', lang).text}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{s.t('field.commodity', lang).text}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{s.t('field.supplier', lang).text}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{s.t('field.validTo', lang).text}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontSize: 12.5 }}>Sudan</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>Sesame — Hulled White</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>Agrotem Trading LLC</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>31/12/2026</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip size="small" label={s.t('status.pendingApproval', lang).text} sx={{ fontSize: 11 }} />
                <Button size="small" variant="contained">{s.t('action.approve', lang).text}</Button>
                <Button size="small" variant="outlined">{s.t('action.return', lang).text}</Button>
              </Stack>
            </Box>
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary, mt: 1 }}>
              A dashed outline marks a label falling back to English. {rtl ? s.configNotes.rtl : ''}
            </Typography>
          </Box>
        </Paper>

        {groups.map((g) => (
          <Paper variant="outlined" sx={{ mb: 2 }} key={g}>
            <SectionBand>{g}</SectionBand>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>Resource key</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Default (English)</TableCell>
                  {s.languages.filter((l) => l !== 'English').map((l) => (
                    <TableCell key={l} sx={{ fontSize: 12 }}>{l}</TableCell>
                  ))}
                  <TableCell sx={{ fontSize: 12, width: 170 }}>State in {lang}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {s.translations.filter((t) => t.group === g).map((t) => {
                  const v = s.t(t.key, lang);
                  return (
                    <TableRow key={t.key}>
                      <TableCell sx={{ fontSize: 11.5, fontFamily: 'monospace' }}>{t.key}</TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{t.English}</TableCell>
                      {s.languages.filter((l) => l !== 'English').map((l) => (
                        <TableCell key={l}>
                          <TextField
                            size="small" fullWidth value={(t[l] as string) ?? ''}
                            inputProps={{ 'aria-label': `${t.key} ${l}`, dir: s.directionFor(l) }}
                            onChange={(e) => s.saveTranslation(t.key, l, e.target.value)}
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        <Chip
                          size="small"
                          label={lang === 'English' ? 'Default' : (v.fallback ? 'Falling back to English' : 'Translated')}
                          sx={{
                            fontSize: 10.5,
                            bgcolor: v.fallback && lang !== 'English' ? `${tokens.amber}1A` : `${tokens.green}1A`,
                            color: v.fallback && lang !== 'English' ? tokens.amber : tokens.green
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>
        ))}

        <Paper variant="outlined" sx={{ mb: 2, p: 2 }}>
          <Typography sx={{ fontSize: 12.5 }}>
            <b>Adding a language requires no release.</b> Adding one creates a column, sets every key to fall back to
            English, and makes the language selectable in the country parameters — with no build step, which is the point
            of Step 4. Right-to-left is applied where the language requires it (Step 5): {s.configNotes.rtl}
          </Typography>
        </Paper>

        <ShellFooterNote />
      </Box>
    </>
  );
};

/** 2.4 Regional Format Settings — WF-C10-02 / Step 6 */
export const RegionalFormats: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();

  return (
    <>
      <PageBanner
        title="Regional formats"
        breadcrumb={['Global', 'C10 Configuration', 'Regional formats']}
        subtitle="WF-C10-02 / Step 6 — number, date, currency and unit of measure applied from the active country context"
        actions={<WhiteButton onClick={() => navigate('/c10/countries')}>Countries</WhiteButton>}
      />
      <Box sx={{ p: 3 }}>
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>One value, five renderings — the same data under each country's settings</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Country</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Quantity</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Amount (local)</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Amount (reporting)</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Date</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Time</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Unit</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Direction</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {s.countryConfigs.map((c) => (
                <TableRow key={c.code} hover selected={c.country === s.activeCountry}>
                  <TableCell sx={{ fontSize: 12.5 }}>
                    {c.country}{c.country === s.activeCountry ? ' — active context' : ''}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{fmtNumber(FORMAT_SAMPLE.quantity, c.numberFormat)}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{fmtCurrency(FORMAT_SAMPLE.amount, c)}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{fmtCurrency(FORMAT_SAMPLE.amount, c, c.reportingCurrency)}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{fmtDate(FORMAT_SAMPLE.date, c.dateFormat)}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{fmtTime(FORMAT_SAMPLE.time, c.timeFormat)}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{c.defaultUnit}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{directionOf(c.defaultLanguage) === 'rtl' ? 'Right to left' : 'Left to right'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
              It is the clearest way to show that formatting is configuration and not code, and it takes one table rather
              than a paragraph. Mozambique uses a comma decimal separator and Tanzania no decimal places at all — both are
              settings on this screen, not code branches.
            </Typography>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Per-country settings</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Country</TableCell>
                <TableCell sx={{ fontSize: 12, width: 120 }}>Decimal</TableCell>
                <TableCell sx={{ fontSize: 12, width: 120 }}>Thousands</TableCell>
                <TableCell sx={{ fontSize: 12, width: 120 }}>Places</TableCell>
                <TableCell sx={{ fontSize: 12, width: 150 }}>Time format</TableCell>
                <TableCell sx={{ fontSize: 12, width: 180 }}>Currency display</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Reporting normalisation</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {s.countryConfigs.map((c) => (
                <TableRow key={c.code}>
                  <TableCell sx={{ fontSize: 12.5 }}>{c.country}</TableCell>
                  <TableCell>
                    <Select size="small" fullWidth value={c.numberFormat.decimal}
                            inputProps={{ 'aria-label': `${c.country} decimal separator` }}
                            onChange={(e) => s.saveCountryParam(c.country, { numberFormat: { ...c.numberFormat, decimal: e.target.value } }, 'Decimal separator')}>
                      {['.', ','].map((x) => <MenuItem key={x} value={x} sx={{ fontSize: 13 }}>{x}</MenuItem>)}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select size="small" fullWidth value={c.numberFormat.thousands}
                            onChange={(e) => s.saveCountryParam(c.country, { numberFormat: { ...c.numberFormat, thousands: e.target.value } }, 'Thousands separator')}>
                      {[',', '.', ' '].map((x) => <MenuItem key={x} value={x} sx={{ fontSize: 13 }}>{x === ' ' ? 'space' : x}</MenuItem>)}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select size="small" fullWidth value={c.numberFormat.places}
                            inputProps={{ 'aria-label': `${c.country} decimal places` }}
                            onChange={(e) => s.saveCountryParam(c.country, { numberFormat: { ...c.numberFormat, places: Number(e.target.value) } }, 'Decimal places')}>
                      {[0, 1, 2, 3].map((x) => <MenuItem key={x} value={x} sx={{ fontSize: 13 }}>{x}</MenuItem>)}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select size="small" fullWidth value={c.timeFormat}
                            onChange={(e) => s.saveCountryParam(c.country, { timeFormat: e.target.value as '24-hour' | '12-hour' }, 'Time format')}>
                      {['24-hour', '12-hour'].map((x) => <MenuItem key={x} value={x} sx={{ fontSize: 13 }}>{x}</MenuItem>)}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select size="small" fullWidth value={c.currencyDisplay}
                            onChange={(e) => s.saveCountryParam(c.country, { currencyDisplay: e.target.value as typeof c.currencyDisplay }, 'Currency display')}>
                      {['Code before', 'Symbol before', 'Code after'].map((x) => <MenuItem key={x} value={x} sx={{ fontSize: 13 }}>{x}</MenuItem>)}
                    </Select>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{c.reportingCurrency} and {c.defaultUnit}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        <HandOffBanner
          label="HAND-OFF"
          target="C11 / WF-C11-01 Running a Report"
          passed="Reporting may normalise to a common currency and unit for comparison — the reporting currency and default unit defined here are the normalisation targets, and the C11 consolidated multi-country report is the consumer that makes them mean something."
          to="/c11/reports/R-11"
          goLabel="Open the consolidated report"
        />
        <ShellFooterNote />
      </Box>
    </>
  );
};
