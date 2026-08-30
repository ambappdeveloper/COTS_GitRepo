import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import { AppShell } from '../../layouts/AppShell';
import { DataTable, type Column } from '../../components/DataTable';
import { SectionCard, StatusChip, TraceNote } from '../../components/shared';
import { useStore } from '../../state/store';
import { SEASONS } from '../../mockData/master';
import type { MasterPlan } from '../../mockData/s01';

export default function MasterPlanList() {
  const { country, plans } = useStore();
  const nav = useNavigate();
  const rows = plans.filter((p) => p.country === country);

  const cols: Column<MasterPlan & { id?: string }>[] = [
    {
      key: 'ref',
      label: 'Plan reference',
      render: (r) => <Link to={`/s01/plan/${r.ref}`} style={{ color: '#0084C7', fontWeight: 600 }}>{r.ref}</Link>,
      value: (r) => r.ref,
    },
    { key: 'country', label: 'Country', value: (r) => r.country },
    {
      key: 'season',
      label: 'Season',
      render: (r) => SEASONS.find((s) => s.id === r.seasonId)?.label ?? r.seasonId,
      value: (r) => SEASONS.find((s) => s.id === r.seasonId)?.label ?? '',
    },
    { key: 'version', label: 'Version', render: (r) => `v${r.activeVersion}`, value: (r) => r.activeVersion },
    { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} />, value: (r) => r.status },
    {
      key: 'approver',
      label: 'Approver',
      render: (r) => r.versions.find((v) => v.version === r.activeVersion)?.approvedBy ?? '—',
      value: (r) => r.versions.find((v) => v.version === r.activeVersion)?.approvedBy ?? '',
    },
    {
      key: 'approvedOn',
      label: 'Approved on',
      render: (r) => r.versions.find((v) => v.version === r.activeVersion)?.approvedOn ?? '—',
      value: (r) => r.versions.find((v) => v.version === r.activeVersion)?.approvedOn ?? '',
    },
    {
      key: 'updated',
      label: 'Last updated',
      render: (r) => `${r.lastUpdatedBy} · ${r.lastUpdatedAt}`,
      value: (r) => r.lastUpdatedBy,
    },
  ];

  return (
    <AppShell title="Master Plan List" breadcrumb={[country, 'Planning', 'Master Plan']}>
      <SectionCard title="S01-SC-02 — Master Plan List" dense>
        <div style={{ padding: '8px 16px' }}>
          <TraceNote workflow="WF-S01-01 / Steps 1–2, 8" />
        </div>
        <DataTable
          columns={cols as any}
          rows={rows as any}
          onNew={() => nav('/s01/plan/NEW')}
          newLabel="New master plan"
          toolbarNote="Master plans for the active country"
        />
      </SectionCard>
      <Button component={Link} to="/s01" size="small">Back to Planning</Button>
    </AppShell>
  );
}
