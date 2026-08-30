import React from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, FormControl, Grid, InputLabel, List, ListItem, ListItemText,
  MenuItem, OutlinedInput, Paper, Select, Stack, Switch, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  HandOffBanner, PageBanner, PlaceholderNote, SectionBand, StatusChip, WhiteButton
} from '../../components/shared';
import { AuditLevel } from '../../mockData/c8';
import { APPROVER_REGISTER } from '../../mockData/c4';
import { ShellFooterNote } from '../../layouts/AppShell';

const ROLES = [...new Set(APPROVER_REGISTER.map((e) => e.role))];
const roleLabel = (r: string) => r.replace(/_/g, ' ').toLowerCase();
const LEVELS: AuditLevel[] = ['Field level', 'Status level', 'Record level'];

/** 1.1 Audit Level Configuration + 1.2 Sensitive Action Classification + 1.3 What an Entry Captures */
export const AuditConfiguration: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();

  const entriesFor = (entity: string) =>
    s.audit.filter((a) => a.entity === entity || a.entity.startsWith(entity)).length;
  const occurrencesFor = (cls: string) => s.audit.filter((a) => a.sensitiveClass === cls).length;

  return (
    <>
      <PageBanner
        title="Audit configuration"
        breadcrumb={['Global', 'C8 Audit Trail', 'Audit configuration']}
        subtitle="WF-C8-01 / Steps 4, 6–7 — the audit level per entity, the sensitive action classification, and what every entry carries"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c8/search')}>Audit search</WhiteButton>
            <WhiteButton onClick={() => navigate('/c8/monitor')}>Sensitive actions</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        {/* 1.1 Audit level configuration */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Audit level per entity class — WF-C8-01 / Step 4</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Entity class</TableCell>
                <TableCell sx={{ fontSize: 12, width: 160 }}>Audit level</TableCell>
                <TableCell sx={{ fontSize: 12, width: 260 }}>Audited fields</TableCell>
                <TableCell sx={{ fontSize: 12, width: 120 }}>Reason on status change</TableCell>
                <TableCell sx={{ fontSize: 12, width: 130 }}>Log view and export</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Entries held</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {s.auditLevels.map((l) => (
                <TableRow key={l.entity}>
                  <TableCell sx={{ fontSize: 12.5 }}>{l.entity}</TableCell>
                  <TableCell>
                    <Select size="small" fullWidth value={l.level}
                            onChange={(e) => s.saveAuditLevel(l.entity, { level: e.target.value as AuditLevel })}>
                      {LEVELS.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                    </Select>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    {l.level === 'Field level'
                      ? (l.fields.length ? l.fields.join(', ') : 'Every field')
                      : <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>not applicable at {l.level.toLowerCase()}</Typography>}
                  </TableCell>
                  <TableCell>
                    <Switch size="small" checked={l.retainReason}
                            onChange={(e) => s.saveAuditLevel(l.entity, { retainReason: e.target.checked })} />
                  </TableCell>
                  <TableCell>
                    <Switch size="small" checked={l.logViewAndExport}
                            onChange={(e) => s.saveAuditLevel(l.entity, { logViewAndExport: e.target.checked })} />
                  </TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{entriesFor(l.entity)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ p: 2 }}>
            <Alert severity="info" sx={{ fontSize: 12.5, mb: 1.5 }}>
              <b>The audit level has visible consequences.</b> Set an entity to <i>record level</i>, then make a change
              to it: the entry is written without field detail, and both the History tab and the entry detail say so in
              words rather than showing empty columns. Set it back to field level and the next change carries the
              previous and new value again.
            </Alert>
            <PlaceholderNote>
              Business confirmation required: whether view and export of sensitive data must be logged as well as
              changes (WF-C8-01 / Step 7). It is recommended, and it carries a storage and performance cost that
              should be accepted deliberately — which is why it is a switch per entity class rather than a global
              default.
            </PlaceholderNote>
            <HandOffBanner target="C10 / WF-C10-03 Configuration Change Control" passed="A change to the audit configuration, which is itself a configuration change and is approved and audited — it appears in the C10 change register" to="/c10/changes" goLabel="Open the change register" />
          </Box>
        </Paper>

        {/* 1.2 Sensitive action classification */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Sensitive action classification — WF-C8-01 / Step 6</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Class</TableCell>
                <TableCell sx={{ fontSize: 12, width: 120 }}>Flagged at capture</TableCell>
                <TableCell sx={{ fontSize: 12, width: 340 }}>Alert recipients</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Alert channel</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Occurrences</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {s.sensitiveClasses.map((c) => (
                <TableRow key={c.cls}>
                  <TableCell sx={{ fontSize: 12.5 }}>{c.cls}</TableCell>
                  <TableCell>
                    <Switch size="small" checked={c.flagged}
                            onChange={(e) => s.saveSensitiveClass(c.cls, { flagged: e.target.checked })} />
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" fullWidth>
                      <Select
                        multiple value={c.recipients} input={<OutlinedInput />}
                        onChange={(e) => s.saveSensitiveClass(c.cls, { recipients: typeof e.target.value === 'string' ? [e.target.value] : e.target.value })}
                        renderValue={(v) => (v.length ? v.map(roleLabel).join(', ') : 'None configured')}
                      >
                        {ROLES.map((r) => (
                          <MenuItem key={r} value={r}><Checkbox size="small" checked={c.recipients.includes(r)} />{roleLabel(r)}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    <Chip size="small" variant="outlined" label="Through C5" sx={{ height: 19, fontSize: 10.5 }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{occurrencesFor(c.cls)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
              One class — bulk data load — deliberately has <b>no recipients configured</b>, so the monitor can show
              that state honestly rather than implying that every flagged action reaches someone.
            </Typography>
            <HandOffBanner target="C5 / WF-C5-01 Event-Driven Notifications" passed="The sensitive-action alert, subject to C5 channel policy and quiet hours" />
          </Box>
        </Paper>

        {/* 1.3 What an entry captures */}
        <Paper variant="outlined">
          <SectionBand>What every entry captures — WF-C8-01 / Steps 1–5</SectionBand>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 13, mb: 1.5 }}>
              Stated once and plainly, so it can be checked against your own audit requirements.
            </Typography>
            <Grid container spacing={2}>
              {[
                ['When and who', 'Timestamp · user · the role under which the user was acting · active country context'],
                ['What', 'Entity type · record identifier · action'],
                ['Detail, per audit level', 'Field · previous value · new value · previous and new status · reason where one was captured'],
                ['Source', 'User interface (named user) · Integration (service identity with the originating system named) · Scheduled job (job service identity)'],
                ['Technical context', 'Session · address · device — to support investigation'],
                ['Classification', 'The sensitive action class, where one applies']
              ].map(([k, v]) => (
                <Grid item xs={12} md={6} key={k}>
                  <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#FAFBFC', height: '100%' }}>
                    <Typography sx={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, color: tokens.textSecondary }}>{k}</Typography>
                    <Typography sx={{ fontSize: 13, mt: 0.5 }}>{v}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            <Alert severity="warning" sx={{ fontSize: 12.5, mt: 2 }}>
              <b>The role matters as much as the user.</b> The same person acting under a different role is a different
              act, and the entry records which authority was used — which is why the History timeline reads
              “approved by Grace Mensah, acting as country manager”.
            </Alert>
            <Alert severity="warning" sx={{ fontSize: 12.5, mt: 1.5 }}>
              An entry is written <b>once</b>. No screen in this prototype offers an edit or a delete of an audit entry,
              because none may exist — WF-C8-01 / Step 7. Retention archives and trims under policy; it never edits.
            </Alert>
            <List dense disablePadding sx={{ mt: 1 }}>
              <ListItem disableGutters>
                <ListItemText primaryTypographyProps={{ fontSize: 13 }}
                  primary="The entry is generated at the point the change is committed, within the same transaction, so a change can never be saved without its audit record — Step 1." />
              </ListItem>
            </List>
          </Box>
        </Paper>

        <ShellFooterNote />
      </Box>
    </>
  );
};
