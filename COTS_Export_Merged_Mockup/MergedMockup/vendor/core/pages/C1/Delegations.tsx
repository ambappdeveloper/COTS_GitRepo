import React from 'react';
import {
  Box, Button, Paper, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, OutlinedInput, Alert, Stack, List, ListItem, ListItemText
} from '@mui/material';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import { HandOffBanner, PageBanner, PlaceholderNote, SectionBand, StatusChip, WhiteButton } from '../../components/shared';
import { DataTable, Column } from '../../components/DataTable';
import { Delegation } from '../../mockData';
import { ShellFooterNote } from '../../layouts/AppShell';

/** 4.1 Delegation List + 4.2 Delegation Form — WF-C1-04 */
export const Delegations: React.FC = () => {
  const s = useStore();
  const [open, setOpen] = React.useState(false);

  const columns: Column<Delegation>[] = [
    { key: 'id', label: 'Reference' },
    { key: 'fromUser', label: 'From user' },
    { key: 'toUser', label: 'To delegate' },
    { key: 'scope', label: 'Scope of delegated authority', value: (d) => d.scope.join(', ') },
    { key: 'start', label: 'Start date' },
    { key: 'end', label: 'End date' },
    { key: 'status', label: 'Status', render: (d) => <StatusChip status={d.status} /> },
    { key: 'reason', label: 'Reason', optional: true },
    {
      key: 'actions', label: '', render: (d) => (
        d.status === 'Active' ? <Button size="small" color="error" onClick={() => s.endDelegation(d.id)}>End early</Button> : null
      )
    }
  ];

  return (
    <>
      <PageBanner
        title="Delegations"
        breadcrumb={[s.activeCountry, 'C1 Identity and Access', 'Delegations']}
        subtitle="WF-C1-04 Delegation and Absence Cover"
        actions={<WhiteButton onClick={() => setOpen(true)}>New Delegation</WhiteButton>}
      />
      <Box sx={{ p: 3 }}>
        <DataTable columns={columns} rows={s.delegations} groupable={false} emptyMessage="No delegations recorded" />

        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography sx={{ fontSize: 13 }}>
            During the delegation period, approval tasks and actions resolve to the delegate and appear in the delegate's Actions inbox.
            Both the original approver and the delegate are shown on the approval history of every record decided under the delegation.
            On the end date the delegation lapses automatically and routing reverts.
          </Typography>
          <HandOffBanner label="DEPENDENCY" target="C4 / WF-C4-01 / Step 5" passed="Approver role" returned="Named approver with the delegation applied" />
          <HandOffBanner target="C2 / WF-C2-03 Actions Inbox and Task Management" passed="Delegated tasks" returned="Tasks presented in the delegate's inbox" to="/inbox" goLabel="Open inbox" />
          <HandOffBanner target="C8 / WF-C8-01 Capturing an Audit Entry" passed="Accepted delegation" returned="Immutable entry" />
          <PlaceholderNote kind="consistency">
            three files describe the point at which delegation is applied differently — C1 / WF-C1-04 / Step 4 places it in C4 with C2
            presenting; C2 / WF-C2-03 / Step 2 places it in C2 "with delegation applied (C1)"; C4 / WF-C4-01 / Step 5 places it in C4.
            The owning module for delegation resolution should be fixed before development.
          </PlaceholderNote>
        </Paper>
        <ShellFooterNote />
      </Box>

      <DelegationDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
};

const DelegationDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const s = useStore();
  const [fromUserId, setFromUserId] = React.useState(s.currentUser?.id ?? 'U-001');
  const [toUserId, setToUserId] = React.useState('');
  const [scope, setScope] = React.useState<string[]>([]);
  const [start, setStart] = React.useState('2026-08-20');
  const [end, setEnd] = React.useState('2026-09-03');
  const [reason, setReason] = React.useState('');
  const [blocked, setBlocked] = React.useState<string[] | null>(null);

  React.useEffect(() => { if (open) { setBlocked(null); setToUserId(''); setScope([]); } }, [open]);

  const from = s.users.find((u) => u.id === fromUserId);
  const scopeOptions = (from?.assignments.filter((a) => a.status === 'Active') ?? [])
    .flatMap((a) => a.countryScope.map((c) => `${a.role} — approvals, ${c}`));
  const datesInvalid = !start || !end || end <= start;

  const submit = () => {
    const to = s.users.find((u) => u.id === toUserId);
    if (!from || !to) return;
    const result = s.createDelegation({ fromUserId, fromUser: from.name, toUserId, toUser: to.name, scope, start, end, reason: reason || undefined });
    if (result.ok) onClose();
    else setBlocked(result.blocked ?? []);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: 18 }}>New delegation — WF-C1-04 / Steps 1–2</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
          <FormControl size="small">
            <InputLabel>From user</InputLabel>
            <Select label="From user" value={fromUserId} onChange={(e) => { setFromUserId(e.target.value); setScope([]); }}>
              {s.users.filter((u) => u.status === 'Active').map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Delegate</InputLabel>
            <Select label="Delegate" value={toUserId} onChange={(e) => { setToUserId(e.target.value); setBlocked(null); }}>
              {s.users.filter((u) => u.status === 'Active' && u.id !== fromUserId).map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.name} — {u.assignments.filter((a) => a.status === 'Active').map((a) => a.role).join(', ') || 'no role'}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ gridColumn: { md: 'span 2' } }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Scope of delegated authority</InputLabel>
              <Select
                multiple label="Scope of delegated authority" input={<OutlinedInput label="Scope of delegated authority" />}
                value={scope} onChange={(e) => setScope(e.target.value as string[])} renderValue={(v) => (v as string[]).join('; ')}
              >
                {scopeOptions.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <TextField size="small" type="date" label="Start date" InputLabelProps={{ shrink: true }} value={start} onChange={(e) => setStart(e.target.value)} />
          <TextField
            size="small" type="date" label="End date" InputLabelProps={{ shrink: true }} value={end}
            onChange={(e) => setEnd(e.target.value)} error={datesInvalid}
            helperText={datesInvalid ? 'The end date must be after the start date' : ' '}
          />
          <Box sx={{ gridColumn: { md: 'span 2' } }}>
            <TextField size="small" fullWidth multiline minRows={2} label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Annual leave" />
          </Box>
        </Box>

        {blocked && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <b>Delegation refused — it exceeds the delegate's own permission ceiling.</b>
            <Typography sx={{ fontSize: 13, mt: 0.5 }}>
              Authority the delegate could not otherwise hold cannot be delegated — WF-C1-04 / Step 2.
              The following permissions are not held by the delegate:
            </Typography>
            <List dense sx={{ py: 0 }}>
              {blocked.map((b) => <ListItem key={b} sx={{ py: 0 }}><ListItemText primaryTypographyProps={{ fontSize: 12.5 }} primary={`• ${b.replace('|', ' — ')}`} /></ListItem>)}
            </List>
            <Typography sx={{ fontSize: 12, mt: 0.5, opacity: 0.9 }}>
              The refusal has been recorded in the delegation register with status Refused.
            </Typography>
          </Alert>
        )}

        <Paper variant="outlined" sx={{ mt: 2 }}>
          <SectionBand>What happens next</SectionBand>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, whiteSpace: 'pre-line' }}>
{`Validate against the delegate's own permission ceiling
    Within ceiling → accepted, written to the audit trail (C8)
    Beyond ceiling → refused with the offending permissions listed
During the period → C4 resolves approval tasks to the delegate, C2 presents them in their inbox
Approval history → shows both the original approver and the delegate
On the end date → the delegation lapses and routing reverts`}
            </Typography>
          </Box>
        </Paper>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!toUserId || scope.length === 0 || datesInvalid} onClick={submit}>Create delegation</Button>
      </DialogActions>
    </Dialog>
  );
};
