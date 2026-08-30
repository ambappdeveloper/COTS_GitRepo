import React from 'react';
import {
  Alert, Box, Button, Chip, FormControl, FormControlLabel, InputLabel, MenuItem, Paper, Select, Stack,
  Switch, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  EmptyState, HandOffBanner, PageBanner, SectionBand, WhiteButton
} from '../../components/shared';
import {
  COMPONENTS, ENVIRONMENTS, Environment, LOG_CLASSES, LogClass, MASK_DEMO, MASK_TARGETS, MaskMode,
  SEVERITIES, SEVERITY_COLOUR, SEVERITY_MEANING, Severity, applyMask, levelFor
} from '../../mockData/c9';
import { ShellFooterNote } from '../../layouts/AppShell';
import { FriendlyErrorDialog } from './Health';

const MODES: MaskMode[] = ['Full', 'Partial', 'Hash'];

/** 1.1 Log Level Configuration — WF-C9-01 / Steps 1–2 */
export const LogLevels: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const [logClass, setLogClass] = React.useState<LogClass | 'All'>('All');
  const env = s.logEnvironment;
  const view = s.visibleLog(env, logClass === 'All' ? undefined : logClass);

  return (
    <>
      <PageBanner
        title="Log levels"
        breadcrumb={['Global', 'C9 Logging and Monitoring', 'Log levels']}
        subtitle="WF-C9-01 / Steps 1–2 — the level per environment and component, and the masking applied as the entry is written"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c9/incidents')}>Incidents</WhiteButton>
            <WhiteButton onClick={() => navigate('/c9/retention')}>Retention and export</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Paper variant="outlined" sx={{ mb: 2, p: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1.5 }}>
            <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>Environment</Typography>
            <ToggleButtonGroup size="small" exclusive value={env}
                               onChange={(_, v) => v && s.setLogEnvironment(v as Environment)}>
              {ENVIRONMENTS.map((e) => <ToggleButton key={e} value={e} sx={{ fontSize: 12 }}>{e}</ToggleButton>)}
            </ToggleButtonGroup>
            <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
              The selector changes both the column highlighted below and the log viewer at the foot of the screen.
            </Typography>
          </Stack>
        </Paper>

        {/* Level per environment and component */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Level per environment and component — WF-C9-01 / Step 1</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Component</TableCell>
                {ENVIRONMENTS.map((e) => (
                  <TableCell key={e} sx={{ fontSize: 12, width: 150, bgcolor: e === env ? `${tokens.primary}12` : undefined }}>
                    {e}
                  </TableCell>
                ))}
                <TableCell sx={{ fontSize: 12 }}>Entries written at this level</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Effective from</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {s.logLevels.map((l) => {
                const shown = s.logEntries.filter((x) => x.component === l.component && x.environment === env
                  && SEVERITIES.indexOf(x.severity) >= SEVERITIES.indexOf(l[env])).length;
                return (
                  <TableRow key={l.component}>
                    <TableCell sx={{ fontSize: 12.5 }}>{l.component}</TableCell>
                    {ENVIRONMENTS.map((e) => (
                      <TableCell key={e} sx={{ bgcolor: e === env ? `${tokens.primary}0A` : undefined }}>
                        <Select size="small" fullWidth value={l[e]}
                                inputProps={{ 'aria-label': `${l.component} ${e} level` }}
                                onChange={(ev) => s.saveLogLevel(l.component, e, ev.target.value as Severity)}>
                          {SEVERITIES.map((x) => <MenuItem key={x} value={x} sx={{ fontSize: 13 }}>{x}</MenuItem>)}
                        </Select>
                      </TableCell>
                    ))}
                    <TableCell sx={{ fontSize: 12.5 }}>{shown}</TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>{l.changedAt} — {l.changedBy}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
              The level is configurable per environment so that production is not flooded with diagnostic detail. Selecting
              Development and viewing the log below shows Trace and Debug entries; selecting Production shows the same
              period reduced to Warning and above, with the suppressed count stated.
            </Typography>
          </Box>
        </Paper>

        {/* Severity reference */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Severity levels</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Level</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Meaning in this system</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {SEVERITIES.map((x) => (
                <TableRow key={x}>
                  <TableCell>
                    <Chip size="small" label={x} sx={{ fontSize: 11, bgcolor: `${SEVERITY_COLOUR[x]}1A`, color: SEVERITY_COLOUR[x] }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{SEVERITY_MEANING[x]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        <MaskingRules />

        {/* The log viewer */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>{`Log — ${env}, ${view.shown.length} entr${view.shown.length === 1 ? 'y' : 'ies'} shown`}</SectionBand>
          <Box sx={{ p: 2, pb: 0 }}>
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel>Log class</InputLabel>
              <Select label="Log class" value={logClass} onChange={(e) => setLogClass(e.target.value as LogClass | 'All')}>
                {['All', ...LOG_CLASSES].map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
              </Select>
            </FormControl>
            {view.suppressed > 0 && (
              <Alert severity="info" sx={{ mt: 2, fontSize: 12.5 }}>
                <b>{view.suppressed}</b> entr{view.suppressed === 1 ? 'y was' : 'ies were'} suppressed by the level
                configured for {env}. The application produced them; the level decides whether they are retained.
              </Alert>
            )}
          </Box>
          {view.shown.length === 0 ? <EmptyState message="No entry is visible at the configured level." hint="Lower the level for the component, or select another environment." /> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 12 }}>At</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Severity</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Component</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Log class</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Message</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Reference</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {view.shown.map((l) => (
                  <TableRow key={l.id} hover>
                    <TableCell sx={{ fontSize: 11.5 }}>{l.at}</TableCell>
                    <TableCell>
                      <Chip size="small" label={l.severity}
                            sx={{ fontSize: 11, bgcolor: `${SEVERITY_COLOUR[l.severity]}1A`, color: SEVERITY_COLOUR[l.severity] }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{l.component}</TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>{l.logClass}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>
                      {l.message}
                      {l.masked?.map((m) => (
                        <Typography key={m.field} sx={{ fontSize: 11.5, fontFamily: 'monospace', color: tokens.textSecondary }}>
                          {m.field}: {m.value} — masked by the {m.rule} rule as the entry was written
                        </Typography>
                      ))}
                      {l.archived && <Chip size="small" label="Archived" sx={{ ml: 1, fontSize: 10.5 }} />}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11.5, fontFamily: 'monospace' }}>
                      {l.errorRef ?? l.correlation ?? l.run ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        <HandOffBanner
          label="DEPENDENCY"
          target="C10 / WF-C10-03 Configuration Change Control"
          passed="The log level per environment and component, and the masking rules, are configuration: these changes are themselves approved and audited, and appear in the C10 change register"
          to="/c10/changes"
          goLabel="Open the change register"
        />
        <ShellFooterNote />
      </Box>
      <FriendlyErrorDialog />
    </>
  );
};

/** The masking half of the screen — Step 2 */
const MaskingRules: React.FC = () => {
  const s = useStore();
  const demoRule = s.maskRules.find((m) => m.name === 'Bank account');
  const mode = demoRule?.mode ?? 'Full';

  return (
    <Paper variant="outlined" sx={{ mb: 2 }}>
      <SectionBand>Masking rules — WF-C9-01 / Step 2</SectionBand>
      <Box sx={{ px: 2, pt: 1.5 }}>
        <Typography sx={{ fontSize: 12.5 }}>
          Sensitive data is masked <b>as it is written</b>, not masked on display. The distinction matters: a rule switched
          off later cannot recover a value that was never stored, and an administrator expecting to unmask during an
          investigation needs to discover that here rather than in an export file.
        </Typography>
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontSize: 12 }}>Rule</TableCell>
            <TableCell sx={{ fontSize: 12 }}>Pattern</TableCell>
            <TableCell sx={{ fontSize: 12, width: 130 }}>Masking</TableCell>
            <TableCell sx={{ fontSize: 12 }}>Applies to</TableCell>
            <TableCell sx={{ fontSize: 12, width: 100 }}>Active</TableCell>
            <TableCell sx={{ fontSize: 12 }}>Masked, last 24 h</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {s.maskRules.map((m) => (
            <TableRow key={m.id}>
              <TableCell sx={{ fontSize: 12.5 }}>{m.name}</TableCell>
              <TableCell sx={{ fontSize: 12 }}>{m.pattern}</TableCell>
              <TableCell>
                <Select size="small" fullWidth value={m.mode}
                        inputProps={{ 'aria-label': `${m.name} masking` }}
                        onChange={(e) => s.saveMaskRule(m.id, { mode: e.target.value as MaskMode })}>
                  {MODES.map((x) => <MenuItem key={x} value={x} sx={{ fontSize: 13 }}>{x}</MenuItem>)}
                </Select>
              </TableCell>
              <TableCell sx={{ fontSize: 11.5 }}>{m.appliesTo.join(', ')}</TableCell>
              <TableCell>
                <Switch size="small" checked={m.active}
                        inputProps={{ 'aria-label': `${m.name} active` }}
                        onChange={(e) => s.saveMaskRule(m.id, { active: e.target.checked })} />
              </TableCell>
              <TableCell sx={{ fontSize: 12.5 }}>{m.touched24h}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Box sx={{ p: 2 }}>
        <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mb: 1 }}>
          Partial keeps the last four characters; Hash keeps a comparable reference without the value. The masking
          targets available are: {MASK_TARGETS.join(', ')}.
        </Typography>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: '#FAFBFC' }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 500, mb: 1 }}>What was written, and what was not</Typography>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Entry</TableCell>
                <TableCell sx={{ fontSize: 12.5 }}>{MASK_DEMO.entry}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Field</TableCell>
                <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{MASK_DEMO.field}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Historical entry (Full)</TableCell>
                <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{applyMask(MASK_DEMO.original, 'Full')}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>A new entry at the current setting ({mode})</TableCell>
                <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{applyMask(MASK_DEMO.original, mode)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary, mt: 1 }}>
            Change the Bank account rule between Full and Partial to see the two side by side. The historical entry never
            changes, because the original value was never stored. <i>Can we see the real value for an investigation?</i> —
            no, and this is the screen that answers it.
          </Typography>
        </Paper>
      </Box>
    </Paper>
  );
};
