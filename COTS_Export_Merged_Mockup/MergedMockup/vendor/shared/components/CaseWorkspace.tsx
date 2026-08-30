import React from 'react';
import { Box, Chip, Paper, Stack, Tab, Tabs, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { Link } from 'react-router-dom';
import { COLORS } from '../theme';
import { StatusChip } from './shared';

/**
 * SM-04 CaseWorkspace — the shared case pattern.
 * First used by S03 non-conformity; reused by S04 (variance and insurance), S07 and S09.
 */
export function CaseTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: string[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Tabs
      value={value}
      onChange={(_, v) => onChange(v)}
      sx={{ mb: 1, bgcolor: '#fff', border: `1px solid ${COLORS.border}` }}
      variant="scrollable"
    >
      {tabs.map((t) => <Tab key={t} label={t} />)}
    </Tabs>
  );
}

/**
 * SM-05 LinkedRecordsPanel — named cross-module records with navigation.
 */
export function LinkedRecordsPanel({
  rows,
}: {
  rows: { label: string; value: string; to?: string; note?: string }[];
}) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 600 }}>Record</TableCell>
          <TableCell sx={{ fontWeight: 600 }}>Reference</TableCell>
          <TableCell sx={{ fontWeight: 600 }}>Relationship</TableCell>
          <TableCell />
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.label + r.value} hover>
            <TableCell>{r.label}</TableCell>
            <TableCell sx={{ fontWeight: 600, color: r.to ? COLORS.primary : undefined }}>{r.value}</TableCell>
            <TableCell>
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>{r.note ?? '—'}</Typography>
            </TableCell>
            <TableCell align="right">
              {r.to && <Button size="small" component={Link} to={r.to}>Open</Button>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * SM-10 ActionItemsList — owner, target date, ageing, escalation.
 * Mirrors into the Core C2 Actions Inbox.
 */
export function ActionItemsList({
  rows,
  onStatus,
  today = '19-Aug-2026',
}: {
  rows: { id: string; action: string; owner: string; targetDate: string; status: string; note: string }[];
  onStatus: (id: string, status: 'Open' | 'In progress' | 'Done') => void;
  today?: string;
}) {
  const overdue = (r: { targetDate: string; status: string }) => {
    if (r.status === 'Done') return false;
    const d = (s: string) => new Date(s.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1, $3')).getTime();
    return d(r.targetDate) < d(today);
  };
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          {['Action', 'Owner', 'Target date', 'Status', 'Progress note', 'Ageing', ''].map((h) => (
            <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id} hover sx={{ bgcolor: overdue(r) ? '#FFF7E6' : undefined }}>
            <TableCell>{r.action}</TableCell>
            <TableCell>{r.owner}</TableCell>
            <TableCell>{r.targetDate}</TableCell>
            <TableCell>
              <Chip
                size="small"
                label={r.status}
                sx={{
                  height: 20, color: '#fff', fontWeight: 600, fontSize: '0.7rem', borderRadius: '3px',
                  bgcolor: r.status === 'Done' ? COLORS.good : r.status === 'In progress' ? COLORS.progress : COLORS.draft,
                }}
              />
            </TableCell>
            <TableCell><Typography variant="caption">{r.note || '—'}</Typography></TableCell>
            <TableCell>
              {overdue(r) ? (
                <Chip size="small" label="Overdue" sx={{ bgcolor: COLORS.attention, color: '#fff', height: 18 }} />
              ) : (
                <Typography variant="caption" color="text.secondary">On target</Typography>
              )}
            </TableCell>
            <TableCell align="right">
              {r.status !== 'Done' ? (
                <Button size="small" onClick={() => onStatus(r.id, 'Done')}>Mark done</Button>
              ) : (
                <Button size="small" onClick={() => onStatus(r.id, 'Open')}>Reopen</Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Tick-marked step strip, taken from the CTRM reference application.
 * Any step can be opened directly; the tick shows completeness, not a forced sequence.
 */
export function StepStrip({
  steps,
  value,
  onChange,
}: {
  steps: { label: string; done: boolean; disabled?: boolean; disabledReason?: string }[];
  value: number;
  onChange: (i: number) => void;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap', px: 0.5, pb: 1.5 }}>
      {steps.map((s, i) => (
        <Box
          key={s.label}
          onClick={() => !s.disabled && onChange(i)}
          title={s.disabled ? s.disabledReason : undefined}
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.75,
            cursor: s.disabled ? 'not-allowed' : 'pointer',
            opacity: s.disabled ? 0.55 : 1,
            borderBottom: i === value ? `2px solid ${COLORS.primary}` : '2px solid transparent',
            pb: 0.4,
          }}
        >
          {s.done
            ? <CheckCircleOutlineIcon sx={{ fontSize: 16, color: COLORS.good }} />
            : <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: COLORS.textSecondary }} />}
          <Typography
            variant="body2"
            sx={{ fontWeight: i === value ? 700 : 500, color: i === value ? COLORS.primary : COLORS.textPrimary }}
          >
            {s.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/**
 * SM-06 RequirementChecklist — required items driven by case type.
 */
export function RequirementChecklist({
  rows,
}: {
  rows: { item: string; provided: boolean; note?: string }[];
}) {
  const outstanding = rows.filter((r) => !r.provided).length;
  return (
    <Paper variant="outlined" sx={{ borderColor: COLORS.border }}>
      <Box sx={{ px: 1.5, py: 0.75, bgcolor: '#F7F8F9', borderBottom: `1px solid ${COLORS.border}` }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>
            REQUIRED EVIDENCE
          </Typography>
          <Chip
            size="small"
            label={outstanding === 0 ? 'Complete' : `${outstanding} outstanding`}
            sx={{ height: 18, bgcolor: outstanding === 0 ? COLORS.good : COLORS.attention, color: '#fff' }}
          />
        </Stack>
      </Box>
      <Box sx={{ px: 1.5, py: 1 }}>
        {rows.map((r) => (
          <Stack key={r.item} direction="row" spacing={1} alignItems="center" sx={{ py: 0.3 }}>
            {r.provided
              ? <CheckCircleOutlineIcon sx={{ fontSize: 15, color: COLORS.good }} />
              : <RadioButtonUncheckedIcon sx={{ fontSize: 15, color: COLORS.attention }} />}
            <Typography variant="body2" sx={{ flex: 1 }}>{r.item}</Typography>
            <Typography variant="caption" color="text.secondary">{r.note ?? ''}</Typography>
          </Stack>
        ))}
      </Box>
    </Paper>
  );
}
