import React from 'react';
import { Box, Chip, Typography, Paper, Stack, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import { HandOffBanner, PageBanner, PlaceholderNote, WhiteButton } from '../../components/shared';
import { DataTable, Column } from '../../components/DataTable';
import { DOMAINS, DomainDef } from '../../mockData/c3';
import { ShellFooterNote } from '../../layouts/AppShell';

/** 1.1 Master Data Domain Browser — WF-C3-01 / Step 1 */
export const Domains: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();

  const count = (d: DomainDef, status?: string) =>
    s.masterRecords.filter((r) => r.domain === d.key && (!status || r.status === status)).length;

  const rows = DOMAINS.map((d) => ({ ...d, id: d.key }));

  const columns: Column<DomainDef & { id: string }>[] = [
    { key: 'name', label: 'Domain', render: (d) => <Typography sx={{ fontSize: 13, color: tokens.primary, fontWeight: 500 }}>{d.name}</Typography> },
    { key: 'group', label: 'Domain group' },
    { key: 'scope', label: 'Scope', render: (d) => <Chip size="small" variant="outlined" label={d.scope} sx={{ height: 19, fontSize: 10.5 }} /> },
    { key: 'owner', label: 'Owner' },
    {
      key: 'governed', label: 'Governance', value: (d) => (d.governed ? 'Approval required' : 'Immediate activation'),
      render: (d) => (
        <Chip
          size="small"
          label={d.governed ? 'Approval required' : 'Immediate activation'}
          sx={{ height: 19, fontSize: 10.5, bgcolor: d.governed ? '#0F79C4' : '#5A6B7B', color: '#fff' }}
        />
      )
    },
    { key: 'coding', label: 'Coding rule', value: (d) => (d.coding.mode === 'Generated' ? `Generated · ${d.coding.formula}` : `Manual · ${d.coding.hint}`) },
    { key: 'effectiveDated', label: 'Effective dating', value: (d) => (d.effectiveDated ? 'On' : 'Off') },
    { key: 'duplicateKeys', label: 'Duplicate check on', value: (d) => d.duplicateKeys.join(', '), optional: true },
    { key: 'records', label: 'Records', value: (d) => String(count(d)) },
    { key: 'active', label: 'Active', value: (d) => String(count(d, 'Active')) },
    { key: 'draft', label: 'Draft', value: (d) => String(count(d, 'Draft')) },
    { key: 'pending', label: 'Pending approval', value: (d) => String(count(d, 'Pending Approval')) }
  ];

  return (
    <>
      <PageBanner
        title="Master Data"
        breadcrumb={[s.activeCountry, 'C3 Master Data', 'Domains']}
        subtitle="WF-C3-01 / Step 1 — every domain, its scope, its owner and whether it is governed"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c3/bulk-load')}>Bulk load</WhiteButton>
            <WhiteButton onClick={() => navigate('/c3/mapping')}>External mapping</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#F7F9FB' }}>
          <Typography sx={{ fontSize: 13 }}>
            This screen exists so the governance model can be challenged before any individual record is reviewed.
            A <b>governed</b> domain routes every create and amend through approval. A domain marked
            <b> immediate activation</b> is a low-risk list that becomes Active without an approval step —
            WF-C3-01 / Step 7. Nothing is entered as free text anywhere in COTS where a master record exists.
          </Typography>
          <HandOffBanner
            label="DEPENDENCY"
            target="C10 / WF-C10-01 Configuring a Country"
            passed="Active country"
            returned="Which domains are country-scoped, which require approval and through which route, the coding rules and formulas, whether effective dating is on per attribute, and the duplicate-check rules per domain"
            resumes="C3 / WF-C3-01 / Step 1"
          />
          <PlaceholderNote>the named owner for each master data domain (WF-C3-01 / Step 1). The owners shown are placeholders.</PlaceholderNote>
          <PlaceholderNote>which domains are mastered in SAP and replicated into COTS read-only, and which are mastered in COTS (WF-C3-03 / Step 6).</PlaceholderNote>
        </Paper>

        <DataTable
          columns={columns as any}
          rows={rows as any}
          onRowClick={(d: any) => navigate(`/c3/domains/${d.key}`)}
          searchPlaceholder="Search domains"
        />
        <ShellFooterNote />
      </Box>
    </>
  );
};
