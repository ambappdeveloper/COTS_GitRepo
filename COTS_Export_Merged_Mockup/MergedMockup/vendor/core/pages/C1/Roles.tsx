import React from 'react';
import {
  Box, Button, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Checkbox,
  Tabs, Tab, TextField, Select, MenuItem, FormControl, InputLabel, Chip, Stack, Switch, Alert, Divider
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  ActionBar, EmptyState, HandOffBanner, PageBanner, PlaceholderNote, SectionBand, StatusChip, WhiteButton
} from '../../components/shared';
import { DataTable, Column } from '../../components/DataTable';
import { ACTIONS, COUNTRIES, MODULES, OBJECTS, Role, AdMapping } from '../../mockData';
import { ShellFooterNote } from '../../layouts/AppShell';

/* ------------------------- 3.1 Permission Catalogue ------------------------- */

interface PermRow { id: string; code: string; object: string; action: string; module: string; description: string }

export const PermissionCatalogue: React.FC = () => {
  const s = useStore();
  const rows: PermRow[] = OBJECTS.flatMap((o) =>
    ACTIONS.map((a) => ({
      id: `${o.object}|${a}`,
      code: `${o.object.replace(/\s+/g, '_').toUpperCase()}.${a.toUpperCase()}`,
      object: o.object,
      action: a,
      module: o.module,
      description: `${a} on ${o.object}`
    }))
  );

  const columns: Column<PermRow>[] = [
    { key: 'code', label: 'Permission code' },
    { key: 'object', label: 'Screen or object' },
    { key: 'action', label: 'Action' },
    { key: 'module', label: 'Module' },
    { key: 'description', label: 'Description', optional: true }
  ];

  return (
    <>
      <PageBanner
        title="Permission Catalogue"
        breadcrumb={[s.activeCountry, 'C1 Identity and Access', 'Permission Catalogue']}
        subtitle="WF-C1-03 / Step 1 — a permission is a screen or object plus an action"
      />
      <Box sx={{ p: 3 }}>
        <DataTable columns={columns} rows={rows} emptyMessage="No permissions defined" />
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography sx={{ fontSize: 13 }}>
            Grouping this list by <b>Module</b> or <b>Screen or object</b> shows how the eight actions repeat across every object.
            The default position at runtime is deny; access must be explicitly granted — WF-C1-03 / Step 6.
          </Typography>
        </Paper>
        <ShellFooterNote />
      </Box>
    </>
  );
};

/* ------------------------- 3.2 Role Catalogue ------------------------- */

export const RoleCatalogue: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();

  const columns: Column<Role & { id: string }>[] = [
    { key: 'code', label: 'Role code', render: (r) => <Typography sx={{ fontSize: 13, color: tokens.primary, fontWeight: 500 }}>{r.code}</Typography> },
    { key: 'description', label: 'Description' },
    { key: 'sensitivity', label: 'Sensitivity', render: (r) => <Chip size="small" label={r.sensitivity} color={r.sensitivity === 'Administrative' ? 'error' : r.sensitivity === 'Elevated' ? 'warning' : 'default'} sx={{ height: 20, fontSize: 11 }} /> },
    { key: 'owner', label: 'Owner' },
    { key: 'permissions', label: 'Permissions', value: (r) => String(r.permissions.length) },
    { key: 'assigned', label: 'Assigned users', value: (r) => String(s.users.filter((u) => u.assignments.some((a) => a.role === r.code && a.status === 'Active')).length) },
    { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> }
  ];

  return (
    <>
      <PageBanner
        title="Role Catalogue"
        breadcrumb={[s.activeCountry, 'C1 Identity and Access', 'Role Catalogue']}
        subtitle="WF-C1-03 / Step 2 — roles correspond to real operational positions"
        actions={<WhiteButton onClick={() => navigate('/c1/roles/NEW_ROLE')}>New Role</WhiteButton>}
      />
      <Box sx={{ p: 3 }}>
        <PlaceholderNote>
          confirmation of the full role catalogue, agreed once the high-level business processes are signed off, in line with the
          workshop decision to defer roles and permissions (WF-C1-03 / Step 8). Every role below is a demonstration placeholder.
        </PlaceholderNote>
        <DataTable columns={columns.map((c) => c) as any} rows={s.roles.map((r) => ({ ...r, id: r.code }))} onRowClick={(r: any) => navigate(`/c1/roles/${r.code}`)} />
        <ShellFooterNote />
      </Box>
    </>
  );
};

/* ------------------------- 3.3 Role Definition Form ------------------------- */

export const RoleDefinition: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const { code } = useParams();
  const existing = s.roles.find((r) => r.code === code);
  const [role, setRole] = React.useState<Role>(
    existing ?? { code: '', description: '', sensitivity: 'Standard', owner: '', permissions: [], status: 'Draft', placeholder: true }
  );
  const [moduleTab, setModuleTab] = React.useState(0);
  const moduleList = [...new Set(OBJECTS.map((o) => o.module))];
  const objects = OBJECTS.filter((o) => o.module === moduleList[moduleTab]);

  const toggle = (key: string) =>
    setRole((p) => ({ ...p, permissions: p.permissions.includes(key) ? p.permissions.filter((x) => x !== key) : [...p.permissions, key] }));

  const invalid = !role.code || !role.description || !role.owner || role.permissions.length === 0;

  return (
    <>
      <PageBanner
        title={existing ? `Role — ${existing.description}` : 'New Role'}
        breadcrumb={[s.activeCountry, 'C1 Identity and Access', 'Role Catalogue', role.code || 'New']}
        subtitle="WF-C1-03 / Steps 1–2, 4 — permission matrix, then approval"
      />
      <Box sx={{ p: 3 }}>
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Role header</SectionBand>
          <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <TextField size="small" required label="Role code" value={role.code} onChange={(e) => setRole({ ...role, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })} InputProps={{ readOnly: !!existing }} helperText={existing ? 'Read-only after creation' : ' '} />
            <TextField size="small" required label="Description" value={role.description} onChange={(e) => setRole({ ...role, description: e.target.value })} />
            <FormControl size="small">
              <InputLabel>Sensitivity classification</InputLabel>
              <Select label="Sensitivity classification" value={role.sensitivity} onChange={(e) => setRole({ ...role, sensitivity: e.target.value as Role['sensitivity'] })}>
                <MenuItem value="Standard">Standard</MenuItem>
                <MenuItem value="Elevated">Elevated</MenuItem>
                <MenuItem value="Administrative">Administrative</MenuItem>
              </Select>
            </FormControl>
            <TextField size="small" required label="Role owner" value={role.owner} onChange={(e) => setRole({ ...role, owner: e.target.value })} />
          </Box>
          <Box sx={{ px: 2, pb: 2 }}>
            <Alert severity="info" sx={{ fontSize: 12.5 }}>
              Sensitivity drives the approval route: administrative and approval-bearing roles require a higher level of authorisation — WF-C1-02 / Step 5.
            </Alert>
          </Box>
        </Paper>

        <Paper variant="outlined">
          <SectionBand>Permission matrix — {role.permissions.length} permissions selected</SectionBand>
          <Tabs value={moduleTab} onChange={(_, v) => setModuleTab(v)} variant="scrollable" sx={{ borderBottom: `1px solid ${tokens.border}` }}>
            {moduleList.map((m) => <Tab key={m} label={m} />)}
          </Tabs>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 200 }}>Screen or object</TableCell>
                {ACTIONS.map((a) => <TableCell key={a} align="center">{a}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {objects.map((o) => (
                <TableRow key={o.object} hover>
                  <TableCell>{o.object}</TableCell>
                  {ACTIONS.map((a) => (
                    <TableCell key={a} align="center" padding="none">
                      <Checkbox size="small" checked={role.permissions.includes(`${o.object}|${a}`)} onChange={() => toggle(`${o.object}|${a}`)} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
              Anything not explicitly ticked is denied at runtime. The effective permission is the intersection of this matrix and
              the active country context — WF-C1-03 / Step 6.
            </Typography>
            <HandOffBanner
              target="C4 / WF-C4-01 Standard Approval Cycle"
              passed="Role definition, current and proposed permissions, sensitivity classification"
              returned="Approved / Rejected"
              resumes="C1 / WF-C1-03 / Step 5 — written to the audit trail as a sensitive action"
            />
            <HandOffBanner target="C5 / WF-C5-01 Event-Driven Notifications" passed="Rejection outcome" returned="Requester informed" />
          </Box>
        </Paper>

        <ActionBar
          left={<Button variant="outlined" onClick={() => navigate('/c1/roles')}>Cancel</Button>}
          right={
            <>
              <Button variant="outlined" disabled={invalid} onClick={() => { s.saveRole({ ...role, status: 'Draft' }); navigate('/c1/roles'); }}>Save Draft</Button>
              <Button variant="contained" disabled={invalid} onClick={() => { s.saveRole({ ...role, status: 'Pending Approval' }); navigate('/c1/roles'); }}>Submit for Approval</Button>
            </>
          }
        />
        <ShellFooterNote />
      </Box>
    </>
  );
};

/* ------------------------- 3.5 AD Group Mapping ------------------------- */

export const AdGroupMapping: React.FC = () => {
  const s = useStore();
  const anyEnabled = s.adMappings.some((m) => m.enabled);

  const columns: Column<AdMapping & { id: string }>[] = [
    { key: 'group', label: 'Active Directory group' },
    { key: 'role', label: 'Mapped COTS role' },
    { key: 'countryScope', label: 'Country scope', value: (m) => m.countryScope.join(', ') },
    { key: 'moduleScope', label: 'Module scope', value: (m) => m.moduleScope.join(', ') },
    { key: 'enabled', label: 'Automatic mapping', render: (m) => <Switch size="small" checked={m.enabled} onChange={() => s.toggleAdMapping(m.group)} /> },
    { key: 'lastSync', label: 'Last synchronised' }
  ];

  return (
    <>
      <PageBanner
        title="Active Directory Group Mapping"
        breadcrumb={[s.activeCountry, 'C1 Identity and Access', 'Active Directory Group Mapping']}
        subtitle="WF-C1-03 / Step 3 — where automatic mapping is enabled, assignments may be derived from group membership"
      />
      <Box sx={{ p: 3 }}>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography sx={{ fontSize: 13.5 }}>
            Automatic Active Directory group-to-role mapping is <b>{anyEnabled ? 'enabled for at least one group' : 'disabled for every group'}</b>.
            Where it is not enabled, the assignment is made manually by the administrator.
          </Typography>
          <HandOffBanner label="DEPENDENCY" target="C10 / WF-C10-03 Configuration Change Control" passed="Mapping table and enablement flag" returned="Approved, effective-dated configuration" />
          <HandOffBanner target="C12 / WF-C12-01 Standard Integration Exchange (Active Directory)" passed="Scheduled attribute and group-membership retrieval" returned="Group membership per user" resumes="C1 / WF-C1-02 / Step 1 — a new group member raises an access request automatically" />
          <PlaceholderNote>which Active Directory attributes are authoritative (department, manager, country) and which are maintained in COTS? (WF-C1-02)</PlaceholderNote>
        </Paper>
        <DataTable columns={columns as any} rows={s.adMappings.map((m) => ({ ...m, id: m.group }))} groupable={false} />
        <ShellFooterNote />
      </Box>
    </>
  );
};

/* ------------------------- 3.6 Effective Permission Viewer ------------------------- */

export const EffectivePermissions: React.FC = () => {
  const s = useStore();
  const [userId, setUserId] = React.useState(s.currentUser?.id ?? 'U-002');
  const [country, setCountry] = React.useState(s.activeCountry);
  const u = s.users.find((x) => x.id === userId)!;
  const { granted, role } = s.effectivePermissions(userId, country);
  const inCountry = u.assignments.some((a) => a.status === 'Active' && a.countryScope.includes(country));

  const allKeys = OBJECTS.flatMap((o) => ACTIONS.map((a) => `${o.object}|${a}`));

  return (
    <>
      <PageBanner
        title="Effective Permission Viewer"
        breadcrumb={[s.activeCountry, 'C1 Identity and Access', 'Effective Permission Viewer']}
        subtitle="WF-C1-03 / Steps 6–7 — effective permission is the intersection of role permission and active country context"
      />
      <Box sx={{ p: 3 }}>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel>User</InputLabel>
              <Select label="User" value={userId} onChange={(e) => setUserId(e.target.value)}>
                {s.users.map((x) => <MenuItem key={x.id} value={x.id}>{x.name} — {x.userType}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Active country context</InputLabel>
              <Select label="Active country context" value={country} onChange={(e) => setCountry(e.target.value)}>
                {COUNTRIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
        </Paper>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
          <Paper variant="outlined">
            <SectionBand>1 — Role permissions</SectionBand>
            <Box sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 30, fontWeight: 300, color: tokens.primary }}>{role.length}</Typography>
              <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
                union of permissions from {u.assignments.filter((a) => a.status === 'Active').length} active assignment(s)
              </Typography>
            </Box>
          </Paper>
          <Paper variant="outlined">
            <SectionBand>2 — Active country context</SectionBand>
            <Box sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 20, fontWeight: 500 }}>{country}</Typography>
              <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
                {inCountry ? 'The user holds an active assignment covering this country.' : 'No active assignment covers this country.'}
              </Typography>
            </Box>
          </Paper>
          <Paper variant="outlined" sx={{ borderColor: tokens.primary }}>
            <SectionBand>3 — Effective permission</SectionBand>
            <Box sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 30, fontWeight: 300, color: granted.length ? tokens.green : tokens.red }}>{granted.length}</Typography>
              <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
                {granted.length ? 'granted' : 'nothing granted — deny by default'} · {allKeys.length - granted.length} denied
              </Typography>
            </Box>
          </Paper>
        </Box>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Additional filter applied by user type</SectionBand>
          <Box sx={{ p: 2 }}>
            {u.userType === 'External User' && (
              <Alert severity="warning" sx={{ fontSize: 13 }}>
                <b>External User.</b> An automatic record-level filter restricts every query to records in which the linked party
                ({u.partyRecord ?? 'no party linked'}) is a participant — WF-C1-03 / Step 7.
              </Alert>
            )}
            {u.userType === 'Internal Stakeholder' && (
              <Alert severity="info" sx={{ fontSize: 13 }}>
                <b>Internal Stakeholder.</b> The permission set is predominantly read and report access, with named exceptions for
                approval steps and limited data entry — WF-C1-03 / Step 7.
              </Alert>
            )}
            {u.userType === 'Team Member' && (
              <Alert severity="success" sx={{ fontSize: 13 }}>
                <b>Team Member.</b> The operational permission set carried by the assigned roles applies — WF-C1-03 / Step 7.
              </Alert>
            )}
          </Box>
        </Paper>

        <Paper variant="outlined">
          <SectionBand>Resolution detail — the default position is deny; access must be explicitly granted</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 200 }}>Screen or object</TableCell>
                {ACTIONS.map((a) => <TableCell key={a} align="center">{a}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {OBJECTS.map((o) => (
                <TableRow key={o.object}>
                  <TableCell>{o.object}</TableCell>
                  {ACTIONS.map((a) => {
                    const key = `${o.object}|${a}`;
                    const isGranted = granted.includes(key);
                    const inRole = role.includes(key);
                    return (
                      <TableCell key={a} align="center" sx={{ bgcolor: isGranted ? '#E8F5EE' : undefined }}>
                        <Typography sx={{ fontSize: 11, color: isGranted ? tokens.green : tokens.grey, fontWeight: isGranted ? 600 : 400 }}>
                          {isGranted ? 'Allow' : inRole ? 'Deny (country)' : 'Deny'}
                        </Typography>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ p: 2 }}>
            <HandOffBanner target="C2 / WF-C2-01 Country Context and Navigation" passed="Resolved scope" returned="Menu assembled by user type and role" />
            <HandOffBanner target="C11 / WF-C11-01 Running a Report" passed="Resolved scope" returned="Row-level security context for every report" />
          </Box>
        </Paper>
        <ShellFooterNote />
      </Box>
    </>
  );
};
