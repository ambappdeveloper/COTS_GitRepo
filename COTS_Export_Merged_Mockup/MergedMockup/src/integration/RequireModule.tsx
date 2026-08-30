/**
 * Module access, as WF-INT-11 / Steps 5–6 describe it.
 *
 * A module is reachable only where the account's module scope carries it. Where it does not, the
 * module is not hidden and the link is not dead: the reviewer is told what is missing, which role
 * grants it, and where access is requested — which is the Core screen that already exists for it.
 */

import React from 'react';
import { Alert, AlertTitle, Box, Button, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useIdentity } from './useIdentity';
import { GRANTED_BY, hasModule } from './session';
import { OWNER_COLOUR } from './recordMap';

/** The demonstration accounts, so a reviewer can see the rule work both ways. */
const DEMO_SCOPE: { user: string; who: string; scope: string }[] = [
  { user: 'nasreen.sayed', who: 'Nasreen Sayed — System Administrator', scope: 'every module' },
  { user: 'ahmed.osman', who: 'Ahmed Osman — Sourcing Officer, Sudan', scope: 'Export · Shared Modules' },
  { user: 'meseret.alemu', who: 'Meseret Alemu — Execution Officer, Ethiopia', scope: 'Export only' },
  { user: 'yusuf.kamal', who: 'Yusuf Kamal — Quality Inspector, Sudan', scope: 'Shared Modules only' },
  { user: 'fatima.idris', who: 'Fatima Idris — Compliance Officer', scope: 'Reports and Dashboards only' },
];

export function ModuleDenied({ module }: { module: string }) {
  const id = useIdentity();
  const loc = useLocation();

  return (
    <Box sx={{ p: 3, bgcolor: '#F4F6F8', minHeight: 'calc(100vh - 44px)' }}>
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 900, borderLeft: `4px solid ${OWNER_COLOUR.core}` }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <LockOutlinedIcon color="action" />
          <Typography sx={{ fontSize: 20, fontWeight: 500 }}>
            {module} is not in this account’s module scope
          </Typography>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The screen at <code>{loc.pathname}</code> belongs to <b>{module}</b>. Access to a module is granted on the
          account, not assumed by opening its address, so this screen states what is missing rather than failing
          silently.
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          <AlertTitle>What this account holds</AlertTitle>
          <Typography variant="body2">
            <b>{id.name}</b> — {id.orgUnit}, active country <b>{id.activeCountry}</b>.
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ mr: 0.5 }}>Roles in force:</Typography>
            {id.roles.length ? (
              id.roles.map((r) => <Chip key={r} size="small" label={r} sx={{ height: 20 }} />)
            ) : (
              <Chip size="small" label="none" sx={{ height: 20 }} />
            )}
          </Stack>
          <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ mr: 0.5 }}>Module scope:</Typography>
            {id.moduleScope.length ? (
              id.moduleScope.map((m) => <Chip key={m} size="small" label={m} sx={{ height: 20 }} />)
            ) : (
              <Chip size="small" label="none" sx={{ height: 20 }} />
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {id.fromAssignments
              ? 'Taken from the assignments in force on the account (WF-C1-03). A lapsed assignment grants nothing.'
              : 'Taken from the account record, because no assignment in force carries a module scope.'}
          </Typography>
        </Alert>

        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>How access is granted</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {GRANTED_BY[module] ?? 'This module is granted through the module scope on an assignment.'}
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
          <Button size="small" variant="contained" component={Link} to="/c1/access-requests/new">
            Raise an access request (C1)
          </Button>
          <Button size="small" variant="outlined" component={Link} to="/c1/effective-permissions">
            See the effective permissions
          </Button>
          <Button size="small" variant="outlined" component={Link} to="/c1/roles">
            The role catalogue and what each grants
          </Button>
          <Button size="small" component={Link} to="/login">
            Sign in as a different account
          </Button>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Accounts in the demonstration data</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Sign in as one of these to see the rule from both sides — the user name is the one shown, and the password is{' '}
          <code>demo</code> for all of them. The scope is the one on the assignment in force, which is not always the
          same as the scope on the account record.
        </Typography>
        <Stack spacing={0.25}>
          {DEMO_SCOPE.map((d) => (
            <Typography key={d.user} variant="caption" color="text.secondary">
              · <b>{d.user}</b> {d.who} — {d.scope}
            </Typography>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}

/** Route guard: the module's screens where the scope allows, the explanation where it does not. */
export function RequireModule({ module }: { module: string }) {
  const id = useIdentity();
  if (!hasModule(id, module)) return <ModuleDenied module={module} />;
  return <Outlet />;
}
