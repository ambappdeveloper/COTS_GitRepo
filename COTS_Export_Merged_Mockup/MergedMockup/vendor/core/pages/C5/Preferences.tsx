import React from 'react';
import {
  Alert, Box, Button, Checkbox, FormControlLabel, Paper, Stack, Switch, Table, TableBody,
  TableCell, TableHead, TableRow, Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  EmptyState, HandOffBanner, PageBanner, PlaceholderNote, SectionBand, StatusChip, WhiteButton
} from '../../components/shared';
import { DataTable, Column } from '../../components/DataTable';
import { CHANNELS, Channel, Subscription, policyFor } from '../../mockData/c5';
import { ShellFooterNote } from '../../layouts/AppShell';

/** 3.4 My Notification Preferences — WF-C5-03 / Step 3 */
export const MyPreferences: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const userId = s.currentUser?.id ?? 'U-001';

  const rows = s.rules.filter((r) => r.active).map((r) => {
    const policy = policyFor(s.channelPolicy, r.priority);
    const pref = s.preferences.find((p) => p.userId === userId && p.event === r.event);
    return { rule: r, policy, pref };
  });

  return (
    <>
      <PageBanner
        title="My notification preferences"
        breadcrumb={[s.activeCountry, 'C5 Notifications and Alerts', 'My notification preferences']}
        subtitle="WF-C5-03 / Step 3 — a user personalises only what the priority class permits"
        actions={<WhiteButton onClick={() => navigate('/c5/subscriptions')}>My subscriptions</WhiteButton>}
      />
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2, fontSize: 13 }}>
          An <b>informational</b> notification may be re-channelled, digested or switched off. An <b>operational</b> or
          <b> approval</b> notification may be re-channelled but never disabled, and an <b>urgent</b> notification is
          fixed. Where a choice is refused, the reason is stated rather than left to a disabled control.
        </Alert>

        <Paper variant="outlined">
          <SectionBand>Events this account receives</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Event type</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Priority class</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Channels permitted</TableCell>
                <TableCell sx={{ fontSize: 12 }}>My channels</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Daily digest</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Position</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(({ rule, policy, pref }) => {
                const chosen = pref?.channels ?? rule.channels.filter((c) => policy.permitted.includes(c));
                return (
                  <TableRow key={rule.id}>
                    <TableCell sx={{ fontSize: 12.5 }}>{rule.event}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{rule.priority}</TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{policy.permitted.join(', ')}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {policy.permitted.map((c: Channel) => {
                          const isOnlyOne = chosen.length === 1 && chosen.includes(c);
                          const lockedOff = !policy.userMayDisable && isOnlyOne;
                          return (
                            <FormControlLabel
                              key={c}
                              control={
                                <Checkbox
                                  size="small"
                                  checked={chosen.includes(c)}
                                  disabled={!policy.userMayRechannel}
                                  onChange={(e) => {
                                    const next = e.target.checked ? [...chosen, c] : chosen.filter((x) => x !== c);
                                    if (next.length === 0 && !policy.userMayDisable) {
                                      s.setToast({
                                        message: `${rule.event} is a mandatory ${rule.priority.toLowerCase()} notification and cannot be disabled — WF-C5-03 / Step 3. Choose at least one channel.`,
                                        severity: 'warning'
                                      });
                                      return;
                                    }
                                    s.savePreference(rule.event, next, pref?.digest ?? false);
                                  }}
                                />
                              }
                              label={<Typography sx={{ fontSize: 12, color: lockedOff ? tokens.textSecondary : tokens.textPrimary }}>{c}</Typography>}
                            />
                          );
                        })}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Switch
                        size="small"
                        checked={pref?.digest ?? false}
                        disabled={!policy.digestAvailable}
                        onChange={(e) => s.savePreference(rule.event, chosen, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 11.5, color: tokens.textSecondary, maxWidth: 260 }}>
                      {policy.userMayDisable
                        ? 'Informational — may be re-channelled, digested or switched off.'
                        : policy.userMayRechannel
                          ? 'Mandatory — the channel may change, the notification cannot be disabled.'
                          : 'Urgent — fixed by administration; no personalisation is permitted.'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Box sx={{ p: 2 }}>
            <PlaceholderNote>
              Business confirmation required: whether external parties receive operational notifications directly or
              only through their portal (WF-C5-01 / Step 4). An external party has no preferences screen in this
              prototype, because it is not yet settled whether they hold preferences at all.
            </PlaceholderNote>
          </Box>
        </Paper>

        <ShellFooterNote />
      </Box>
    </>
  );
};

/** 3.5 My Subscriptions — WF-C5-03 / Step 5 */
export const MySubscriptions: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();

  const columns: Column<Subscription>[] = [
    { key: 'record', label: 'Record', render: (b) => <Typography sx={{ fontSize: 13, color: tokens.primary }}>{b.record}</Typography> },
    { key: 'objectType', label: 'Object type' },
    { key: 'country', label: 'Country' },
    { key: 'userName', label: 'Follower' },
    { key: 'since', label: 'Followed since' },
    { key: 'received', label: 'Status changes received', value: (b) => String(b.received) },
    {
      key: 'actions', label: '',
      render: (b) => (
        <Stack direction="row" spacing={0.5}>
          {b.route && <Button size="small" onClick={(e) => { e.stopPropagation(); navigate(b.route!); }}>Open</Button>}
          <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); s.unsubscribe(b.id); }}>Unfollow</Button>
        </Stack>
      )
    }
  ];

  const mine = s.subscriptions.filter((b) => b.userId === (s.currentUser?.id ?? 'U-001'));
  const others = s.subscriptions.filter((b) => b.userId !== (s.currentUser?.id ?? 'U-001'));

  return (
    <>
      <PageBanner
        title="My subscriptions"
        breadcrumb={[s.activeCountry, 'C5 Notifications and Alerts', 'My subscriptions']}
        subtitle="WF-C5-03 / Step 5 — a user may follow a record and thereafter receives its status changes as a subscriber recipient"
        actions={<WhiteButton onClick={() => navigate('/c5/preferences')}>My preferences</WhiteButton>}
      />
      <Box sx={{ p: 3 }}>
        {mine.length === 0
          ? <EmptyState message="You are not following any record" hint="Use Follow this record on an access request or a master data record." />
          : <DataTable columns={columns} rows={mine} groupable={false} emptyMessage="You are not following any record" />}

        {others.length > 0 && (
          <Paper variant="outlined" sx={{ mt: 2 }}>
            <SectionBand>Other subscribers on records in scope</SectionBand>
            <DataTable columns={columns} rows={others} groupable={false} dense />
            <Box sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
                Shown to an administrator so that a rule which includes subscribers can be understood before it is
                relied on: these are the people a status-change event would reach.
              </Typography>
            </Box>
          </Paper>
        )}

        <Paper variant="outlined" sx={{ mt: 2 }}>
          <SectionBand>How a subscription reaches a message</SectionBand>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 13 }}>
              A subscription makes the follower a <b>Subscriber</b> recipient on any rule whose recipients include
              subscribers — today the <i>Approval outcome</i> and <i>Status change</i> rules. The subscriber then
              appears on the delivery log with that source against their name, so it is always clear why a person
              received a message they were not named in.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <Button size="small" variant="outlined" onClick={() => navigate('/c5/rules')}>See the rules that include subscribers</Button>
              <Button size="small" variant="outlined" onClick={() => navigate('/c5/deliveries')}>See subscriber rows on the delivery log</Button>
            </Stack>
            <HandOffBanner target="C5 / WF-C5-01 Event-Driven Notifications" passed="The subscriber as a recipient source on the record's status changes" />
          </Box>
        </Paper>

        <ShellFooterNote />
      </Box>
    </>
  );
};
