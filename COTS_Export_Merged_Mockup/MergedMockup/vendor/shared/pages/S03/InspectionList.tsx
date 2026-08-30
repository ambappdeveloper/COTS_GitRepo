import { Button, Chip } from '@mui/material';
import { Link, useSearchParams } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { DataTable, type Column } from '../../components/DataTable';
import { SectionCard, TraceNote } from '../../components/shared';
import { useStore } from '../../state/store';
import { useS03 } from '../../state/s03store';
import type { Inspection } from '../../mockData/s03';
import { KnowledgePanel } from '../../components/KnowledgePanel';
import { COLORS } from '../../theme';

const decisionChip = (d: string) => {
  if (d === 'Accepted') return COLORS.good;
  if (d === 'Rejected') return COLORS.bad;
  if (d === 'Report with recommendations') return COLORS.attention;
  return COLORS.progress;
};

export default function InspectionList() {
  const { country } = useStore();
  const { inspections } = useS03();
  const [params] = useSearchParams();
  const point = params.get('point');
  const rows = point ? inspections.filter((i) => i.controlPoint === point) : inspections;

  const cols: Column<Inspection & { id: string }>[] = [
    {
      key: 'id',
      label: 'Inspection',
      render: (r) => <Link to={`/s03/inspection/${r.id}`} style={{ color: COLORS.primary, fontWeight: 600 }}>{r.id}</Link>,
      value: (r) => r.id,
    },
    { key: 'controlPoint', label: 'Control point', value: (r) => r.controlPoint },
    { key: 'relatedRecord', label: 'Related record', value: (r) => r.relatedRecord },
    { key: 'commodity', label: 'Commodity', value: (r) => r.commodity },
    { key: 'supplier', label: 'Supplier / party', value: (r) => r.supplier },
    { key: 'location', label: 'Location', value: (r) => r.location },
    { key: 'date', label: 'Date', value: (r) => r.date },
    {
      key: 'inspector',
      label: 'Inspector · team',
      render: (r) => `${r.inspector} · ${r.inspectorTeam}`,
      value: (r) => r.inspector,
    },
    {
      key: 'decision',
      label: 'Decision',
      render: (r) => (
        <Chip
          size="small"
          label={r.decision || (r.labRequired && r.lab?.status !== 'Result received' ? 'Awaiting laboratory result' : 'Open')}
          sx={{ bgcolor: decisionChip(r.decision), color: '#fff', height: 20, fontSize: '0.68rem', fontWeight: 600 }}
        />
      ),
      value: (r) => r.decision,
    },
    { key: 'grade', label: 'Grade', render: (r) => r.grade || '—', value: (r) => r.grade },
  ];

  return (
    <AppShell
      title={point ? `Inspections — ${point}` : 'Inspection List'}
      breadcrumb={[country, 'Quality Assurance', 'Inspections']}
      showSeason={false}
    >
      <KnowledgePanel type="Form" country={country} contextLabel="Quality formats and forms" />
      <SectionCard title="S03-SC-01 — Inspection list" dense>
        <div style={{ padding: '8px 16px' }}>
          <TraceNote workflow="WF-S03-01 / Step 10 — inspection results by commodity, supplier, location and period" />
        </div>
        <DataTable
          columns={cols as any}
          rows={rows as any}
          toolbarNote={point ? `Filtered to ${point}` : 'All inspections in the active country'}
        />
      </SectionCard>
      <Button size="small" component={Link} to="/s03">Back to the control point board</Button>
    </AppShell>
  );
}
