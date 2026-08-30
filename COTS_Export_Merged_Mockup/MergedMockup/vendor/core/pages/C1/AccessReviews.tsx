import React from 'react';
import {
  Box, Button, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, RadioGroup,
  Radio, FormControlLabel, Select, MenuItem, FormControl, InputLabel, OutlinedInput, TextField,
  Alert, Stack, LinearProgress, Chip
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  ActionBar, ConfirmDialog, EmptyState, HandOffBanner, PageBanner, PlaceholderNote, SectionBand,
  StatusChip, WhiteButton
} from '../../components/shared';
import { DataTable, Column } from '../../components/DataTable';
import { COUNTRIES, DORMANCY_THRESHOLD_DAYS, Decision, ReviewPack, User, REVIEW_CYCLE } from '../../mockData';
import { ShellFooterNote } from '../../layouts/AppShell';

/* ------------------------- 5.1 Access Review Pack List ------------------------- */

export const AccessReviewList: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();

  const columns: Column<ReviewPack>[] = [
    { key: 'id', label: 'Pack reference', render: (p) => <Typography sx={{ fontSize: 13, color: tokens.primary, fontWeight: 500 }}>{p.id}</Typography> },
    { key: 'country', label: 'Country' },
    { key: 'cycle', label: 'Cycle' },
    { key: 'generated', label: 'Generated' },
    { key: 'entries', label: 'Entries', value: (p) => String(p.entries.length) },
    { key: 'confirmed', label: 'Confirmed', value: (p) => String(p.entries.filter((e) => e.decision === 'Confirm').length) },
    { key: 'amended', label: 'Amended', value: (p) => String(p.entries.filter((e) => e.decision === 'Amend').length) },
    { key: 'revoked', label: 'Revoked', value: (p) => String(p.entries.filter((e) => e.decision === 'Revoke').length) },
    { key: 'status', label: 'Status', render: (p) => <StatusChip status={p.status} /> },
    { key: 'due', label: 'Due date' }
  ];

  return (
    <>
      <PageBanner
        title="Access Reviews"
        breadcrumb={[s.activeCountry, 'C1 Identity and Access', 'Access Reviews']}
        subtitle={`WF-C1-05 Periodic Access Review — cycle: ${REVIEW_CYCLE}, per country`}
      />
      <Box sx={{ p: 3 }}>
        <DataTable columns={columns} rows={s.reviewPacks} onRowClick={(p) => navigate(`/c1/access-reviews/${p.id}`)} />
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography sx={{ fontSize: 13 }}>
            On the defined cycle the system generates a pack per country listing every user, user type, role and scope, and reminders
            are issued to the country and module owners.
          </Typography>
          <HandOffBanner
            target="C5 / WF-C5-02 Time-Based Notifications and Automated Jobs"
            passed="Pack reference, country, due date, country and module owner recipients"
            returned="Reminder dispatched; escalation where the review is not completed"
            resumes="C1 / WF-C1-05 / Step 3"
          />
          <HandOffBanner target="C2 / WF-C2-03 Actions Inbox and Task Management" passed="Access review task" returned="Task presented to the country or module owner" to="/inbox" goLabel="Open inbox" />
        </Paper>
        <ShellFooterNote />
      </Box>
    </>
  );
};

/* ------------------------- 5.2 Access Review Worksheet ------------------------- */

export const AccessReviewWorksheet: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const { id } = useParams();
  const pack = s.reviewPacks.find((p) => p.id === id);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  if (!pack) return <Box sx={{ p: 3 }}><EmptyState message="Review pack not found" /></Box>;

  const decided = pack.entries.filter((e) => e.decision).length;
  const undecided = pack.entries.length - decided;
  const revokeMissingComment = pack.entries.some((e) => e.decision === 'Revoke' && !e.comment?.trim());
  const readOnly = pack.status === 'Complete';

  return (
    <>
      <PageBanner
        title={`Access Review — ${pack.country} ${pack.cycle}`}
        breadcrumb={[s.activeCountry, 'C1 Identity and Access', 'Access Reviews', pack.id]}
        subtitle={`Generated ${pack.generated} · due ${pack.due} · reminder issued ${pack.reminderSent}`}
        actions={<WhiteButton onClick={() => navigate('/c1/access-reviews')}>Back to packs</WhiteButton>}
      />
      <Box sx={{ p: 3 }}>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{decided} of {pack.entries.length} decided</Typography>
            <StatusChip status={pack.status} />
          </Stack>
          <LinearProgress variant="determinate" value={(decided / pack.entries.length) * 100} sx={{ height: 6, borderRadius: 3 }} />
        </Paper>

        <Paper variant="outlined">
          <SectionBand>Every user, user type, role and scope in {pack.country} — confirm, amend or revoke each entry</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell><TableCell>User type</TableCell><TableCell>Role</TableCell>
                <TableCell>Country scope</TableCell><TableCell>Module scope</TableCell><TableCell>Last login</TableCell>
                <TableCell sx={{ minWidth: 250 }}>Decision</TableCell><TableCell sx={{ minWidth: 200 }}>Amended scope</TableCell><TableCell sx={{ minWidth: 200 }}>Comment</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pack.entries.map((e) => {
                const dormant = !e.lastLogin || e.lastLogin < '2026-05-20';
                return (
                  <TableRow key={e.userId} hover>
                    <TableCell>
                      <Typography sx={{ fontSize: 13, color: tokens.primary, cursor: 'pointer' }} onClick={() => navigate(`/c1/users/${e.userId}`)}>{e.userName}</Typography>
                    </TableCell>
                    <TableCell>{e.userType}</TableCell>
                    <TableCell>{e.role}</TableCell>
                    <TableCell>{e.countryScope.join(', ')}</TableCell>
                    <TableCell>{e.moduleScope.join(', ')}</TableCell>
                    <TableCell>
                      {e.lastLogin ?? 'Never'}
                      {dormant && <Chip size="small" color="warning" label="Dormant" sx={{ ml: 0.5, height: 17, fontSize: 10 }} />}
                    </TableCell>
                    <TableCell>
                      <RadioGroup
                        row value={e.decision ?? ''}
                        onChange={(ev) => s.setReviewDecision(pack.id, e.userId, ev.target.value as Decision, e.amendedScope, e.comment)}
                      >
                        {(['Confirm', 'Amend', 'Revoke'] as Decision[]).map((d) => (
                          <FormControlLabel key={d} value={d} disabled={readOnly} control={<Radio size="small" />} label={<Typography sx={{ fontSize: 12.5 }}>{d}</Typography>} />
                        ))}
                      </RadioGroup>
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" fullWidth disabled={e.decision !== 'Amend' || readOnly}>
                        <InputLabel sx={{ fontSize: 12 }}>Country scope</InputLabel>
                        <Select
                          multiple input={<OutlinedInput label="Country scope" />}
                          value={e.amendedScope ?? e.countryScope}
                          onChange={(ev) => s.setReviewDecision(pack.id, e.userId, 'Amend', ev.target.value as string[], e.comment)}
                          renderValue={(v) => (v as string[]).join(', ')}
                          sx={{ fontSize: 12.5 }}
                        >
                          {COUNTRIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small" fullWidth disabled={readOnly}
                        placeholder={e.decision === 'Revoke' ? 'Required for revoke' : 'Optional'}
                        error={e.decision === 'Revoke' && !e.comment?.trim()}
                        value={e.comment ?? ''}
                        onChange={(ev) => s.setReviewDecision(pack.id, e.userId, e.decision ?? 'Confirm', e.amendedScope, ev.target.value)}
                        inputProps={{ style: { fontSize: 12.5 } }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography sx={{ fontSize: 13 }}>
            On completion, amendments and revocations are applied automatically to the affected accounts. Where a revocation leaves
            open tasks or pending approvals, those must be reassigned before the change takes effect.
          </Typography>
          <HandOffBanner target="C8 / WF-C8-01 Capturing an Audit Entry" passed="Review outcome per entry" returned="Immutable entry; access review outcomes are sensitive actions" />
          <HandOffBanner label="CONTINUE" target="C1 / WF-C1-02 Deactivate Account and Reassign Open Work" passed="Revoked assignment with open work" returned="Reassigned tasks" to="/c1/users" goLabel="Open user register" />
        </Paper>

        {!readOnly && (
          <ActionBar
            left={<Button variant="outlined" onClick={() => navigate('/c1/access-reviews')}>Save progress and close</Button>}
            right={
              <Button
                variant="contained"
                disabled={undecided > 0 || revokeMissingComment}
                onClick={() => setConfirmOpen(true)}
              >
                Complete Review
              </Button>
            }
          />
        )}
        {undecided > 0 && !readOnly && (
          <Typography sx={{ fontSize: 12, color: tokens.orange, mt: 1 }}>
            {undecided} entr{undecided === 1 ? 'y' : 'ies'} still undecided. Every row requires a decision before the review can be completed.
          </Typography>
        )}
        {revokeMissingComment && (
          <Typography sx={{ fontSize: 12, color: tokens.red, mt: 0.5 }}>
            A comment is required for every revocation.
          </Typography>
        )}
        <ShellFooterNote />
      </Box>

      <ConfirmDialog
        open={confirmOpen}
        title="Complete this access review"
        body={<>
          {pack.entries.filter((e) => e.decision === 'Confirm').length} confirmed,
          {' '}{pack.entries.filter((e) => e.decision === 'Amend').length} amended,
          {' '}{pack.entries.filter((e) => e.decision === 'Revoke').length} revoked.
          Amendments and revocations will be applied automatically and the outcome written to the audit trail.
        </>}
        confirmLabel="Complete Review"
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { s.completeReview(pack.id); navigate('/c1/access-reviews'); }}
      />
    </>
  );
};

/* ------------------------- 5.3 Dormant Accounts ------------------------- */

interface DormantRow extends User { daysDormant: number; proposed: string }

export const DormantAccounts: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();

  const days = (last?: string) => {
    if (!last) return 999;
    const d = Math.round((new Date('2026-08-18').getTime() - new Date(last.slice(0, 10)).getTime()) / 86400000);
    return d;
  };

  const rows: DormantRow[] = s.users
    .map((u) => ({ ...u, daysDormant: days(u.lastLogin), proposed: days(u.lastLogin) > DORMANCY_THRESHOLD_DAYS ? 'Auto-suspend' : 'Remain active' }))
    .filter((u) => u.daysDormant > DORMANCY_THRESHOLD_DAYS);

  const columns: Column<DormantRow>[] = [
    { key: 'name', label: 'User', render: (u) => <Typography sx={{ fontSize: 13, color: tokens.primary }}>{u.name}</Typography> },
    { key: 'userType', label: 'User type' },
    { key: 'status', label: 'Status', render: (u) => <StatusChip status={u.status} /> },
    { key: 'lastLogin', label: 'Last login', value: (u) => u.lastLogin ?? 'Never' },
    { key: 'daysDormant', label: 'Days dormant', value: (u) => (u.daysDormant === 999 ? 'Never signed in' : String(u.daysDormant)) },
    { key: 'threshold', label: 'Dormancy threshold', value: () => `${DORMANCY_THRESHOLD_DAYS} days` },
    { key: 'proposed', label: 'Proposed action' },
    {
      key: 'actions', label: '', render: (u) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" onClick={(e) => { e.stopPropagation(); s.confirmDormant(u.id); }}>Confirm still required</Button>
          <Button size="small" color="warning" onClick={(e) => { e.stopPropagation(); s.suspendDormant(u.id); }} disabled={u.status === 'Suspended'}>Suspend</Button>
        </Stack>
      )
    }
  ];

  return (
    <>
      <PageBanner
        title="Dormant Accounts"
        breadcrumb={[s.activeCountry, 'C1 Identity and Access', 'Dormant Accounts']}
        subtitle={`WF-C1-05 / Step 6 — accounts dormant beyond the configurable ${DORMANCY_THRESHOLD_DAYS}-day threshold are flagged for review`}
      />
      <Box sx={{ p: 3 }}>
        <DataTable columns={columns} rows={rows} onRowClick={(u) => navigate(`/c1/users/${u.id}`)} emptyMessage="No accounts are beyond the dormancy threshold" />
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Alert severity="info" sx={{ fontSize: 12.5, mb: 1 }}>
            Confirmed as still required → the account remains active. Not confirmed → the account may be auto-suspended.
            Where a suspension leaves open tasks or pending approvals, these are reassigned first (see WF-C1-02).
          </Alert>
          <HandOffBanner label="DEPENDENCY" target="C10 / WF-C10-03 Configuration Change Control" passed="Dormancy threshold and review frequency" returned="Approved, effective-dated configuration value" />
          <HandOffBanner target="C8 / WF-C8-01 Capturing an Audit Entry" passed="Dormancy confirmation or suspension" returned="Immutable entry" />
        </Paper>
        <ShellFooterNote />
      </Box>
    </>
  );
};
