import React from 'react';
import {
  Box, Checkbox, IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography, Drawer, Button, Divider,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import GridOnIcon from '@mui/icons-material/GridOn';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { COLORS } from '../theme';
import { EmptyState } from './shared';

export type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  value?: (row: T) => string | number;
  align?: 'left' | 'right';
  width?: number;
  filterable?: boolean;
};

/**
 * DataTable — the CTRM list conventions: grouping strip, per-column filter row,
 * identifier as a link, solid status chip, circular icon toolbar, Customize View drawer.
 */
export function DataTable<T extends { id?: string }>({
  columns,
  rows,
  onNew,
  newLabel,
  toolbarNote,
}: {
  columns: Column<T>[];
  rows: T[];
  onNew?: () => void;
  newLabel?: string;
  toolbarNote?: string;
}) {
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const [customize, setCustomize] = React.useState(false);
  const [hidden, setHidden] = React.useState<string[]>([]);

  const visible = columns.filter((c) => !hidden.includes(c.key));

  const filtered = rows.filter((r) =>
    Object.entries(filters).every(([k, v]) => {
      if (!v) return true;
      const col = columns.find((c) => c.key === k);
      const val = col?.value ? String(col.value(r)) : String((r as any)[k] ?? '');
      return val.toLowerCase().includes(v.toLowerCase());
    }),
  );

  return (
    <Paper variant="outlined" sx={{ borderColor: COLORS.border, mb: 2 }}>
      <Box sx={{ bgcolor: COLORS.primary, px: 1.5, py: 0.75, display: 'flex', alignItems: 'center' }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', flex: 1 }}>
          {toolbarNote}
        </Typography>
        <Stack direction="row" spacing={0.5}>
          {[
            { icon: <HistoryIcon fontSize="small" />, tip: 'Recently viewed' },
            { icon: <SettingsIcon fontSize="small" />, tip: 'Customize view', on: () => setCustomize(true) },
            { icon: <GridOnIcon fontSize="small" />, tip: 'Export to Excel (C11)' },
            { icon: <PictureAsPdfIcon fontSize="small" />, tip: 'Export to PDF (C11)' },
            ...(onNew ? [{ icon: <AddIcon fontSize="small" />, tip: newLabel ?? 'New', on: onNew }] : []),
            { icon: <RefreshIcon fontSize="small" />, tip: 'Refresh' },
          ].map((b, i) => (
            <Tooltip key={i} title={b.tip}>
              <IconButton
                size="small"
                onClick={b.on}
                sx={{ bgcolor: '#fff', color: COLORS.primary, width: 26, height: 26, '&:hover': { bgcolor: '#EAF4FB' } }}
              >
                {b.icon}
              </IconButton>
            </Tooltip>
          ))}
        </Stack>
      </Box>

      <Box sx={{ bgcolor: '#EEF1F4', border: `1px dashed ${COLORS.border}`, px: 1.5, py: 0.6 }}>
        <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
          Drag a column header and drop it here to group by that column
        </Typography>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: '#fff' }}>
            <TableCell padding="checkbox"><Checkbox size="small" /></TableCell>
            {visible.map((c) => (
              <TableCell key={c.key} align={c.align} sx={{ fontWeight: 600, width: c.width }}>
                {c.label}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell padding="checkbox" />
            {visible.map((c) => (
              <TableCell key={c.key} sx={{ pt: 0, pb: 0.75 }}>
                {c.filterable !== false && (
                  <TextField
                    variant="standard"
                    placeholder=""
                    value={filters[c.key] ?? ''}
                    onChange={(e) => setFilters({ ...filters, [c.key]: e.target.value })}
                    InputProps={{ sx: { fontSize: '0.75rem' } }}
                    sx={{ width: '100%' }}
                  />
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {filtered.map((r, i) => (
            <TableRow key={(r.id as string) ?? i} hover>
              <TableCell padding="checkbox"><Checkbox size="small" /></TableCell>
              {visible.map((c) => (
                <TableCell key={c.key} align={c.align}>
                  {c.render ? c.render(r) : String((r as any)[c.key] ?? '')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {filtered.length === 0 && <EmptyState text="No records" />}

      <Drawer anchor="right" open={customize} onClose={() => setCustomize(false)}>
        <Box sx={{ width: 340 }}>
          <Box sx={{ bgcolor: COLORS.primary, color: '#fff', px: 2, py: 1.25 }}>
            <Typography variant="subtitle2">Customize View</Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>
              CUSTOMIZE COLUMNS
            </Typography>
            <Divider sx={{ my: 1 }} />
            {columns.map((c) => (
              <Stack key={c.key} direction="row" alignItems="center">
                <Checkbox
                  size="small"
                  checked={!hidden.includes(c.key)}
                  onChange={(e) =>
                    setHidden((prev) => (e.target.checked ? prev.filter((k) => k !== c.key) : [...prev, c.key]))
                  }
                />
                <Typography variant="body2">{c.label}</Typography>
              </Stack>
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, p: 2, borderTop: `1px solid ${COLORS.border}` }}>
            <Button fullWidth onClick={() => setHidden([])}>Cancel</Button>
            <Button fullWidth variant="contained" onClick={() => setCustomize(false)}>Apply</Button>
          </Box>
        </Box>
      </Drawer>
    </Paper>
  );
}
