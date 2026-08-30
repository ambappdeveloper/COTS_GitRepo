import React from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
  Drawer, IconButton, Button, TextField, InputAdornment, Checkbox, Select, MenuItem, FormControl,
  InputLabel, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText, Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import { tokens } from '../theme';
import { EmptyState } from './shared';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  value?: (row: T) => string;
  width?: number | string;
  optional?: boolean;
}

/**
 * Shared list component. Reproduces the reference application's grid conventions:
 * grouping bar, per-column filter through the Customize View drawer, saved view
 * templates, selection column, identifier as a link.
 */
export function DataTable<T extends { id?: string }>({
  columns, rows, onRowClick, selectable, groupable = true, dense, emptyMessage = 'No records to display', toolbarExtra, searchPlaceholder = 'Search'
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  groupable?: boolean;
  dense?: boolean;
  emptyMessage?: string;
  toolbarExtra?: React.ReactNode;
  searchPlaceholder?: string;
}) {
  const [query, setQuery] = React.useState('');
  const [drawer, setDrawer] = React.useState(false);
  const [groupBy, setGroupBy] = React.useState<string>('');
  const [hidden, setHidden] = React.useState<string[]>(columns.filter((c) => c.optional).map((c) => c.key));
  const [selected, setSelected] = React.useState<string[]>([]);
  const [template, setTemplate] = React.useState('Default view');
  const [colFilters, setColFilters] = React.useState<Record<string, string>>({});

  const visible = columns.filter((c) => !hidden.includes(c.key));
  const textOf = (row: T, c: Column<T>) => (c.value ? c.value(row) : String((row as any)[c.key] ?? ''));

  const filtered = rows.filter((r) => {
    const matchesQuery = !query || columns.some((c) => textOf(r, c).toLowerCase().includes(query.toLowerCase()));
    const matchesCols = Object.entries(colFilters).every(([k, v]) => {
      if (!v) return true;
      const c = columns.find((x) => x.key === k);
      return c ? textOf(r, c).toLowerCase().includes(v.toLowerCase()) : true;
    });
    return matchesQuery && matchesCols;
  });

  const groups = groupBy
    ? filtered.reduce<Record<string, T[]>>((acc, r) => {
        const c = columns.find((x) => x.key === groupBy)!;
        const k = textOf(r, c) || '—';
        (acc[k] = acc[k] || []).push(r);
        return acc;
      }, {})
    : { '': filtered };

  return (
    <Paper variant="outlined">
      <Box sx={{ p: 1.5, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small" placeholder={searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)}
          sx={{ minWidth: 260 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <Box sx={{ flex: 1 }} />
        {toolbarExtra}
        <Button size="small" startIcon={<ViewColumnIcon />} onClick={() => setDrawer(true)}>Customize View</Button>
        <Tooltip title="Export is simulated in this prototype">
          <Button size="small" startIcon={<FileDownloadOutlinedIcon />}>Export</Button>
        </Tooltip>
      </Box>

      {groupable && (
        <Box sx={{ px: 1.5, py: 1, bgcolor: '#F7F9FB', borderTop: `1px solid ${tokens.border}`, borderBottom: `1px solid ${tokens.border}`, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
            Drag a column header and drop it here to group by that column
          </Typography>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Select displayEmpty value={groupBy} onChange={(e) => setGroupBy(e.target.value)} sx={{ fontSize: 13, height: 30 }}>
              <MenuItem value=""><em>No grouping</em></MenuItem>
              {columns.map((c) => <MenuItem key={c.key} value={c.key}>{c.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
      )}

      <TableContainer>
        <Table size={dense ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              {selectable && <TableCell padding="checkbox" />}
              {visible.map((c) => <TableCell key={c.key} sx={{ width: c.width }}>{c.label}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(groups).map(([g, list]) => (
              <React.Fragment key={g}>
                {g && (
                  <TableRow>
                    <TableCell colSpan={visible.length + (selectable ? 1 : 0)} sx={{ bgcolor: '#EEF1F4', fontWeight: 500 }}>
                      {columns.find((c) => c.key === groupBy)?.label}: {g} ({list.length})
                    </TableCell>
                  </TableRow>
                )}
                {list.map((row, i) => {
                  const id = (row as any).id ?? String(i);
                  return (
                    <TableRow
                      key={id + i}
                      hover
                      onClick={() => onRowClick?.(row)}
                      sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                    >
                      {selectable && (
                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            size="small"
                            checked={selected.includes(id)}
                            onChange={() => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))}
                          />
                        </TableCell>
                      )}
                      {visible.map((c) => <TableCell key={c.key}>{c.render ? c.render(row) : textOf(row, c) || '—'}</TableCell>)}
                    </TableRow>
                  );
                })}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filtered.length === 0 && <EmptyState message={emptyMessage} />}

      <Drawer anchor="right" open={drawer} onClose={() => setDrawer(false)} PaperProps={{ sx: { width: 400 } }}>
        <Box sx={{ bgcolor: tokens.primary, color: '#fff', px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Customize View</Typography>
          <IconButton size="small" onClick={() => setDrawer(false)} sx={{ color: '#fff' }}><CloseIcon /></IconButton>
        </Box>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', mb: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Select Template</InputLabel>
              <Select label="Select Template" value={template} onChange={(e) => setTemplate(e.target.value)}>
                <MenuItem value="Default view">Default view</MenuItem>
                <MenuItem value="My pending items">My pending items</MenuItem>
                <MenuItem value="Administrative roles only">Administrative roles only</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" size="small">Add</Button>
          </Box>

          <Accordion disableGutters defaultExpanded variant="outlined">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="subtitle2">Filter Columns</Typography></AccordionSummary>
            <AccordionDetails>
              {columns.map((c) => (
                <TextField
                  key={c.key} size="small" label={c.label} fullWidth sx={{ mb: 1.5 }}
                  value={colFilters[c.key] ?? ''}
                  onChange={(e) => setColFilters((p) => ({ ...p, [c.key]: e.target.value }))}
                />
              ))}
            </AccordionDetails>
          </Accordion>

          <Accordion disableGutters variant="outlined">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="subtitle2">Customize Columns</Typography></AccordionSummary>
            <AccordionDetails>
              <Typography variant="caption" color="text.secondary">Selected columns</Typography>
              <List dense>
                {columns.map((c) => (
                  <ListItem key={c.key} disableGutters secondaryAction={
                    <Checkbox
                      size="small"
                      checked={!hidden.includes(c.key)}
                      onChange={() => setHidden((p) => (p.includes(c.key) ? p.filter((x) => x !== c.key) : [...p, c.key]))}
                    />
                  }>
                    <ListItemText primaryTypographyProps={{ fontSize: 13 }} primary={c.label} />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        </Box>
        <Box sx={{ mt: 'auto', display: 'flex' }}>
          <Button fullWidth sx={{ py: 1.5, borderRadius: 0 }} onClick={() => { setColFilters({}); setDrawer(false); }}>Cancel</Button>
          <Button fullWidth variant="contained" sx={{ py: 1.5, borderRadius: 0 }} onClick={() => setDrawer(false)}>Apply</Button>
        </Box>
      </Drawer>
    </Paper>
  );
}
