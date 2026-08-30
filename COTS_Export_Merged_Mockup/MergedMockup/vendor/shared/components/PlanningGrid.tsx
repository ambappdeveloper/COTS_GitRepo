import React from 'react';
import {
  Box, IconButton, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { COLORS } from '../theme';
import type { PlanRow } from '../mockData/s01';

export function NumberCell({
  value,
  onChange,
  disabled,
  error,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  disabled?: boolean;
  error?: boolean;
}) {
  return (
    <TextField
      variant="standard"
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => {
        const n = Number(e.target.value.replace(/[^0-9.]/g, ''));
        onChange(Number.isFinite(n) ? n : 0);
      }}
      error={error}
      inputProps={{ style: { textAlign: 'right', fontSize: '0.78rem' } }}
      sx={{ width: 62 }}
    />
  );
}

/**
 * PlanningGrid — master season plan editor.
 * WF-S01-01 / Steps 3–4: dimensions × months of the season, section-level contribution control.
 */
export function PlanningGrid({
  rows,
  months,
  lockedSections,
  editable,
  onChange,
}: {
  rows: PlanRow[];
  months: string[];
  lockedSections: { section: string; by: string; since: string }[];
  editable: boolean;
  onChange: (rows: PlanRow[]) => void;
}) {
  const lockOf = (section: string) => lockedSections.find((l) => l.section === section);

  const setCell = (rowId: string, month: string, v: number) =>
    onChange(rows.map((r) => (r.id === rowId ? { ...r, months: { ...r.months, [month]: v } } : r)));

  const total = (r: PlanRow) => Object.values(r.months).reduce((a, b) => a + (b || 0), 0);
  const monthTotal = (m: string) => rows.reduce((a, r) => a + (r.months[m] || 0), 0);

  // group rows by commodity group for the grouping convention
  const groups = Array.from(new Set(rows.map((r) => r.commodityGroup)));

  return (
    <Paper variant="outlined" sx={{ borderColor: COLORS.border, overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 1000 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, minWidth: 90 }}>City</TableCell>
            <TableCell sx={{ fontWeight: 600, minWidth: 120 }}>Location</TableCell>
            <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>Commodity</TableCell>
            {months.map((m) => (
              <TableCell key={m} align="right" sx={{ fontWeight: 600 }}>{m}</TableCell>
            ))}
            <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#F7F8F9' }}>Total</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {groups.map((g) => {
            const groupRows = rows.filter((r) => r.commodityGroup === g);
            return (
              <React.Fragment key={g}>
                <TableRow>
                  <TableCell colSpan={months.length + 5} sx={{ bgcolor: '#EEF1F4', py: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>
                      COMMODITY GROUP · {g.toUpperCase()}
                    </Typography>
                  </TableCell>
                </TableRow>
                {groupRows.map((r) => {
                  const lock = lockOf(r.section);
                  const locked = !!lock || !editable;
                  return (
                    <TableRow key={r.id} hover sx={{ bgcolor: lock ? '#FAFAFA' : undefined }}>
                      <TableCell>{r.city}</TableCell>
                      <TableCell>{r.location}</TableCell>
                      <TableCell>
                        {r.commodity}
                        {lock && (
                          <Tooltip title={`Section "${r.section}" is being edited by ${lock.by} since ${lock.since}`}>
                            <LockOutlinedIcon sx={{ fontSize: 13, ml: 0.5, color: COLORS.attention, verticalAlign: 'middle' }} />
                          </Tooltip>
                        )}
                      </TableCell>
                      {months.map((m) => (
                        <TableCell key={m} align="right" sx={{ py: 0.25 }}>
                          <NumberCell
                            value={r.months[m]}
                            disabled={locked}
                            onChange={(v) => setCell(r.id, m, v)}
                          />
                        </TableCell>
                      ))}
                      <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#F7F8F9' }}>
                        {total(r).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          disabled={locked}
                          onClick={() => onChange(rows.filter((x) => x.id !== r.id))}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </React.Fragment>
            );
          })}
          <TableRow>
            <TableCell colSpan={3} sx={{ fontWeight: 700 }}>Total</TableCell>
            {months.map((m) => (
              <TableCell key={m} align="right" sx={{ fontWeight: 700 }}>
                {monthTotal(m).toLocaleString()}
              </TableCell>
            ))}
            <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#F7F8F9' }}>
              {rows.reduce((a, r) => a + total(r), 0).toLocaleString()}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
      {lockedSections.length > 0 && (
        <Box sx={{ px: 2, py: 1, borderTop: `1px solid ${COLORS.border}`, bgcolor: '#FFFDF5' }}>
          {lockedSections.map((l) => (
            <Typography key={l.section} variant="caption" sx={{ display: 'block', color: COLORS.attention }}>
              Section “{l.section}” is being edited by {l.by} since {l.since} — read-only here so contributions
              cannot overwrite each other (WF-S01-01 / Step 4).
            </Typography>
          ))}
        </Box>
      )}
    </Paper>
  );
}
