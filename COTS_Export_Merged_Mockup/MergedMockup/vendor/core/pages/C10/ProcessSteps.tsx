import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel,
  MenuItem, OutlinedInput, Paper, Select, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow,
  Typography
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  EmptyState, HandOffBanner, PageBanner, PlaceholderNote, SectionBand, WhiteButton
} from '../../components/shared';
import { STEP_CATALOGUE } from '../../mockData/c10';
import { ShellFooterNote } from '../../layouts/AppShell';

/** 1.4 Process Step Applicability Matrix + 1.7 Consistency Validation — WF-C10-01 / Steps 3, 6 */
export const ProcessSteps: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const { code = '' } = useParams();
  const c = s.countryConfig(code);
  const [conflictOpen, setConflictOpen] = React.useState(false);
  const [blocked, setBlocked] = React.useState<string | null>(null);

  if (!c) {
    return (
      <>
        <PageBanner title="Process configuration" breadcrumb={['Global', 'C10 Configuration', 'Process configuration']} />
        <Box sx={{ p: 3 }}><EmptyState message="That country could not be found." /></Box>
      </>
    );
  }

  const conflicts = s.conflictsFor(c.country);
  const real = STEP_CATALOGUE.filter((sd) => sd.real);
  const documented = STEP_CATALOGUE.filter((sd) => !sd.real);
  const hidden = s.hiddenStepsFor(c.country);

  const row = (sd: typeof STEP_CATALOGUE[number]) => {
    const cfg = s.stepConfigFor(c.country, sd.key);
    return (
      <TableRow key={sd.key} hover>
        <TableCell sx={{ fontSize: 12 }}>{sd.module}</TableCell>
        <TableCell sx={{ fontSize: 12.5 }}>{sd.step}</TableCell>
        <TableCell>
          <Switch
            size="small" checked={cfg?.applies ?? true}
            disabled={!sd.real}
            inputProps={{ 'aria-label': `${sd.step} applies in ${c.country}` }}
            onChange={(e) => s.setStepConfig(c.country, sd.key, { applies: e.target.checked })}
          />
        </TableCell>
        <TableCell>
          <Switch
            size="small" checked={cfg?.mandatory ?? false}
            disabled={!sd.real || !(cfg?.applies ?? true)}
            inputProps={{ 'aria-label': `${sd.step} mandatory in ${c.country}` }}
            onChange={(e) => s.setStepConfig(c.country, sd.key, { mandatory: e.target.checked })}
          />
        </TableCell>
        <TableCell>
          {sd.fields.length === 0
            ? <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>—</Typography>
            : (
              <FormControl size="small" fullWidth disabled={!sd.real || !(cfg?.applies ?? true)}>
                <Select
                  multiple value={cfg?.requiredFields ?? []} input={<OutlinedInput />}
                  inputProps={{ 'aria-label': `${sd.step} required fields` }}
                  renderValue={(v) => ((v as string[]).length ? (v as string[]).join(', ') : 'None')}
                  onChange={(e) => s.setStepConfig(c.country, sd.key, {
                    requiredFields: typeof e.target.value === 'string' ? [e.target.value] : e.target.value
                  })}
                >
                  {sd.fields.map((f) => <MenuItem key={f} value={f} sx={{ fontSize: 13 }}>{f}</MenuItem>)}
                </Select>
              </FormControl>
            )}
        </TableCell>
        <TableCell sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
          {sd.real ? sd.consumedBy : (sd.documentedPattern ?? 'Not built')}
        </TableCell>
        <TableCell>
          <Chip
            size="small"
            label={sd.real ? 'Real and switchable' : 'Documented, module not built'}
            sx={{
              fontSize: 10.5,
              bgcolor: sd.real ? `${tokens.green}1A` : `${tokens.amber}1A`,
              color: sd.real ? tokens.green : tokens.amber
            }}
          />
        </TableCell>
      </TableRow>
    );
  };

  const head = (
    <TableHead>
      <TableRow>
        <TableCell sx={{ fontSize: 12, width: 90 }}>Module</TableCell>
        <TableCell sx={{ fontSize: 12 }}>Process step</TableCell>
        <TableCell sx={{ fontSize: 12, width: 90 }}>Applies</TableCell>
        <TableCell sx={{ fontSize: 12, width: 100 }}>Mandatory</TableCell>
        <TableCell sx={{ fontSize: 12, width: 240 }}>Required fields</TableCell>
        <TableCell sx={{ fontSize: 12 }}>Consumed by</TableCell>
        <TableCell sx={{ fontSize: 12, width: 190 }}>State</TableCell>
      </TableRow>
    </TableHead>
  );

  return (
    <>
      <PageBanner
        title={`${c.country} — process configuration`}
        breadcrumb={['Global', 'C10 Configuration', 'Countries', c.country, 'Process configuration']}
        subtitle="WF-C10-01 / Step 3 — for every process step: whether it applies, whether it is mandatory, and which fields are required"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate(`/c10/countries/${c.country}`)}>Country parameters</WhiteButton>
            <WhiteButton onClick={() => setConflictOpen(true)}>Validate consistency</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <PlaceholderNote>{s.configNotes.steps}</PlaceholderNote>

        <Alert severity="info" sx={{ my: 2, fontSize: 12.5 }}>
          <b>A step that does not apply is hidden, not branched around</b> — no parallel screen and no code branch
          (WF-C10-01 / Step 3). Switch one of the real rows off and the screen it feeds disappears from this country:
          open the module menu afterwards and the entry is absent, with the menu saying why.
        </Alert>

        {hidden.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2, fontSize: 12.5 }}>
            <b>{hidden.length} step{hidden.length === 1 ? '' : 's'} currently do not apply in {c.country}:</b>{' '}
            {hidden.map((h) => h.name).join(', ')}. What a country does <i>not</i> do is as much a part of its process
            model as what it does, which is why the configuration report lists it.
          </Alert>
        )}

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Steps the built modules have — switching these changes the running prototype</SectionBand>
          <Table size="small">{head}<TableBody>{real.map(row)}</TableBody></Table>
        </Paper>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Steps the workflow documents by name — in modules not yet built</SectionBand>
          <Table size="small">{head}<TableBody>{documented.map(row)}</TableBody></Table>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
              These four are the steps the workflow names with a country pattern: the Ex-contract, the Ex-form, the
              Mozambique commercial invoice and the logistics service request. They are seeded from the documented
              pattern and left read-only, because switching a step in a module that does not exist would be a claim the
              prototype cannot support.
            </Typography>
          </Box>
        </Paper>

        {conflicts.length > 0 && (
          <Paper variant="outlined" sx={{ mb: 2, borderColor: tokens.red }}>
            <SectionBand>Consistency conflicts — WF-C10-01 / Step 6</SectionBand>
            <Box sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 12.5, mb: 1 }}>
                One rule: <b>no mandatory step may be disabled where a later step depends on its output.</b> While a
                conflict is open, activation and submission for approval are prevented.
              </Typography>
              <Button variant="outlined" color="error" onClick={() => setConflictOpen(true)}>Open the conflict report</Button>
            </Box>
          </Paper>
        )}

        <PlaceholderNote kind="consistency">
          {s.configNotes.ownership.replace('No flagged inconsistency lands inside C10’s own workflows. ', '')}
        </PlaceholderNote>

        <HandOffBanner
          label="HAND-OFF"
          target="C2 / WF-C2-01 Country Context and Navigation"
          passed="The effective configuration drives the menu and each screen"
          to="/home"
          goLabel="Open the module menu"
        />
        <ShellFooterNote />
      </Box>

      {/* 1.7 Consistency Validation Result */}
      <Dialog open={conflictOpen} onClose={() => setConflictOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: 18 }}>
          Consistency validation — {conflicts.length === 0 ? 'Consistent' : `${conflicts.length} conflict${conflicts.length === 1 ? '' : 's'} found`}
        </DialogTitle>
        <DialogContent>
          {conflicts.length === 0 ? (
            <Alert severity="success" sx={{ fontSize: 12.5 }}>
              The configuration is internally consistent: no mandatory step is disabled where a later step depends on its
              output. The configuration may proceed to approval — WF-C10-01 / Step 6.
            </Alert>
          ) : (
            <>
              <Alert severity="error" sx={{ fontSize: 12.5, mb: 2 }}>
                Activation is prevented until these are resolved. Both offered resolutions are valid: the rule is about
                consistency, not about which step is right.
              </Alert>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 12 }}>Disabled step</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Dependent step that needs its output</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Why</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>Resolve</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {conflicts.map((cf, n) => (
                    <TableRow key={n}>
                      <TableCell sx={{ fontSize: 12.5 }}>{cf.disabledStepName} <span style={{ color: tokens.textSecondary }}>({cf.disabledModule})</span></TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{cf.dependentName} <span style={{ color: tokens.textSecondary }}>({cf.dependentModule})</span></TableCell>
                      <TableCell sx={{ fontSize: 12 }}>The dependent step cannot start without the output of the step you have disabled — {cf.because}.</TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Button size="small" variant="outlined"
                                  onClick={() => s.setStepConfig(c.country, cf.disabledStep, { applies: true, mandatory: true })}>
                            Re-enable {cf.disabledStepName.toLowerCase()}
                          </Button>
                          <Button size="small" variant="outlined" color="warning"
                                  onClick={() => {
                                    const dep = STEP_CATALOGUE.find((x) => x.step === cf.dependentName);
                                    if (dep) s.setStepConfig(c.country, dep.key, { applies: false });
                                    else setBlocked(`${cf.dependentName} belongs to a module that is not built, so it cannot be disabled here. Re-enabling ${cf.disabledStepName.toLowerCase()} is the resolution available in this prototype.`);
                                  }}>
                            Also disable {cf.dependentName.toLowerCase()}
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {blocked && <Alert severity="info" sx={{ mt: 2, fontSize: 12.5 }}>{blocked}</Alert>}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => setConflictOpen(false)}>Close</Button>
          {conflicts.length === 0 && c.status !== 'Active' && (
            <Button variant="contained" onClick={() => { s.activateCountry(c.country); setConflictOpen(false); }}>
              Activate {c.country}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};
