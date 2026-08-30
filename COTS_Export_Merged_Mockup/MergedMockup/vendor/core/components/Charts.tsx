import React from 'react';
import { Box, Paper, Typography, Stack, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';
import { tokens } from '../theme';
import { SectionBand } from './shared';

/**
 * Small SVG chart set for the prototype. Deliberately dependency-free.
 * Follows the project visualisation rules: horizontal bars for phrase-length
 * category labels, thin marks, 4px rounded data-ends anchored to the baseline,
 * a 2px surface gap between stacked segments, recessive gridlines, values in
 * text ink rather than series colour, one axis per chart, hover tooltip per mark,
 * legend plus direct labels for multi-series, and a table view for every figure.
 */

const SURFACE = '#FFFFFF';
const GRID = '#E8ECEF';
const LABEL_W = 260;
const ROW_H = 30;
const BAR_H = 14;
const PAD_R = 74;

/** Rounded on the far end only; the baseline end stays square. */
function barPath(x: number, y: number, w: number, h: number, r = 4, round = true) {
  const rr = round ? Math.min(r, Math.max(0, w)) : 0;
  if (w <= 0) return '';
  return `M${x},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h - rr} Q${x + w},${y + h} ${x + w - rr},${y + h} H${x} Z`;
}

function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0];
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  // the top tick must cover the largest value, otherwise the longest bar overflows the plot
  const upper = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= upper + step * 0.001; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

interface Tip { x: number; y: number; lines: string[] }

const Tooltip: React.FC<{ tip: Tip | null }> = ({ tip }) =>
  tip ? (
    <Box sx={{
      position: 'fixed', left: tip.x + 12, top: tip.y + 12, zIndex: 1500, pointerEvents: 'none',
      bgcolor: '#1B2733', color: '#fff', px: 1.25, py: 0.75, borderRadius: '3px', maxWidth: 320,
      boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
    }}>
      {tip.lines.map((l, i) => (
        <Typography key={i} sx={{ fontSize: i === 0 ? 12.5 : 11.5, fontWeight: i === 0 ? 600 : 400, opacity: i === 0 ? 1 : 0.85 }}>{l}</Typography>
      ))}
    </Box>
  ) : null;

export const ChartFrame: React.FC<{
  title: string;
  note?: string;
  children: React.ReactNode;
  legend?: { key: string; colour: string }[];
  tableToggle?: React.ReactNode;
}> = ({ title, note, children, legend, tableToggle }) => (
  <Paper variant="outlined" sx={{ mb: 2 }}>
    <SectionBand>{title}</SectionBand>
    <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
      {legend && (
        <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
          {legend.map((l) => (
            <Stack key={l.key} direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ width: 11, height: 11, borderRadius: '2px', bgcolor: l.colour }} />
              <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>{l.key}</Typography>
            </Stack>
          ))}
        </Stack>
      )}
      {children}
      {note && <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary, mt: 1 }}>{note}</Typography>}
      {tableToggle}
    </Box>
  </Paper>
);

/* ------------------------------ single-series bars ------------------------------ */

export interface BarRow { label: string; value: number; attention?: boolean; sub?: string }

export const HBar: React.FC<{
  rows: BarRow[];
  unit?: string;
  format?: (v: number) => string;
  attentionNote?: string;
  width?: number;
}> = ({ rows, unit = '', format, attentionNote, width = 900 }) => {
  const [tip, setTip] = React.useState<Tip | null>(null);
  const max = Math.max(...rows.map((r) => r.value), 0);
  const ticks = niceTicks(max);
  const plotW = width - LABEL_W - PAD_R;
  const scale = (v: number) => (max === 0 ? 0 : (v / (ticks[ticks.length - 1] || max)) * plotW);
  const h = rows.length * ROW_H + 26;
  const fmt = format ?? ((v: number) => `${v}${unit}`);

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <svg width={width} height={h} role="img">
        {/* recessive gridlines */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={LABEL_W + scale(t)} x2={LABEL_W + scale(t)} y1={0} y2={rows.length * ROW_H} stroke={GRID} strokeWidth={1} />
            <text x={LABEL_W + scale(t)} y={rows.length * ROW_H + 16} fontSize={10.5} fill={tokens.textSecondary} textAnchor="middle">{fmt(t)}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const y = i * ROW_H + (ROW_H - BAR_H) / 2;
          const w = scale(r.value);
          const colour = r.attention ? '#D9660B' : tokens.primary;
          return (
            <g key={r.label}
               onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, lines: [r.label, `${fmt(r.value)}${r.sub ? ' · ' + r.sub : ''}`] })}
               onMouseLeave={() => setTip(null)}>
              <rect x={0} y={i * ROW_H} width={width} height={ROW_H} fill="transparent" />
              <text x={LABEL_W - 10} y={i * ROW_H + ROW_H / 2 + 4} fontSize={12} fill={tokens.textPrimary} textAnchor="end">
                {r.label.length > 42 ? r.label.slice(0, 41) + '…' : r.label}
              </text>
              <path d={barPath(LABEL_W, y, Math.max(w, 1), BAR_H)} fill={colour} />
              <text x={LABEL_W + w + 8} y={y + BAR_H - 2} fontSize={11.5} fill={tokens.textSecondary}>{fmt(r.value)}</text>
            </g>
          );
        })}
      </svg>
      {attentionNote && (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5 }}>
          <Box sx={{ width: 11, height: 11, borderRadius: '2px', bgcolor: '#D9660B' }} />
          <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>{attentionNote}</Typography>
        </Stack>
      )}
      <Tooltip tip={tip} />
    </Box>
  );
};

/* ------------------------------ stacked bars ------------------------------ */

export interface StackRow { label: string; segments: { key: string; value: number; colour: string }[] }

export const StackedHBar: React.FC<{ rows: StackRow[]; width?: number }> = ({ rows, width = 900 }) => {
  const [tip, setTip] = React.useState<Tip | null>(null);
  const totals = rows.map((r) => r.segments.reduce((a, s) => a + s.value, 0));
  const max = Math.max(...totals, 0);
  const ticks = niceTicks(max);
  const plotW = width - LABEL_W - PAD_R;
  const scale = (v: number) => (max === 0 ? 0 : (v / (ticks[ticks.length - 1] || max)) * plotW);
  const h = rows.length * ROW_H + 26;

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <svg width={width} height={h} role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={LABEL_W + scale(t)} x2={LABEL_W + scale(t)} y1={0} y2={rows.length * ROW_H} stroke={GRID} strokeWidth={1} />
            <text x={LABEL_W + scale(t)} y={rows.length * ROW_H + 16} fontSize={10.5} fill={tokens.textSecondary} textAnchor="middle">{t}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const y = i * ROW_H + (ROW_H - BAR_H) / 2;
          let x = LABEL_W;
          const visible = r.segments.filter((s) => s.value > 0);
          const total = totals[i];
          return (
            <g key={r.label}>
              <text x={LABEL_W - 10} y={i * ROW_H + ROW_H / 2 + 4} fontSize={12} fill={tokens.textPrimary} textAnchor="end">
                {r.label.length > 42 ? r.label.slice(0, 41) + '…' : r.label}
              </text>
              {visible.map((s, j) => {
                const w = Math.max(scale(s.value), 2);
                const isLast = j === visible.length - 1;
                const seg = (
                  <g key={s.key}
                     onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, lines: [`${r.label} — ${s.key}`, `${s.value} of ${total} tasks`] })}
                     onMouseLeave={() => setTip(null)}>
                    <path d={barPath(x, y, w, BAR_H, 4, isLast)} fill={s.colour} />
                    {/* direct label — secondary encoding, mandatory for this palette */}
                    {w > 22 && <text x={x + w / 2} y={y + BAR_H - 3} fontSize={10.5} fill="#FFFFFF" textAnchor="middle">{s.value}</text>}
                  </g>
                );
                x += w + 2; /* 2px surface gap between segments */
                return seg;
              })}
              <text x={x + 6} y={y + BAR_H - 2} fontSize={11.5} fill={tokens.textSecondary}>{total}</text>
            </g>
          );
        })}
      </svg>
      <Tooltip tip={tip} />
    </Box>
  );
};

/* ------------------------------ tiles and tables ------------------------------ */

export const KpiTile: React.FC<{ value: React.ReactNode; label: string; sub?: string; tone?: 'primary' | 'attention' | 'good' }> =
  ({ value, label, sub, tone = 'primary' }) => {
    const colour = tone === 'attention' ? '#D9660B' : tone === 'good' ? '#1E7B4F' : tokens.primary;
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ fontSize: 32, fontWeight: 300, color: colour, lineHeight: 1.1 }}>{value}</Typography>
        <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>{label}</Typography>
        {sub && <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary, opacity: 0.85, mt: 0.5 }}>{sub}</Typography>}
      </Paper>
    );
  };

export const DataTableView: React.FC<{ head: string[]; rows: (string | number)[][] }> = ({ head, rows }) => (
  <Table size="small" sx={{ mt: 1 }}>
    <TableHead><TableRow>{head.map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
    <TableBody>
      {rows.map((r, i) => (
        <TableRow key={i}>{r.map((c, j) => <TableCell key={j}>{c}</TableCell>)}</TableRow>
      ))}
    </TableBody>
  </Table>
);

/** Proportional share bar with the count printed beside it — secondary encoding. */
export const ShareBar: React.FC<{ value: number; total: number; width?: number }> = ({ value, total, width = 120 }) => {
  const pct = total === 0 ? 0 : value / total;
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Box sx={{ width, height: 8, bgcolor: GRID, borderRadius: '4px', overflow: 'hidden' }}>
        <Box sx={{ width: `${Math.round(pct * 100)}%`, height: '100%', bgcolor: tokens.primary }} />
      </Box>
      <Typography sx={{ fontSize: 12, color: tokens.textSecondary, minWidth: 54 }}>{value} ({Math.round(pct * 100)}%)</Typography>
    </Stack>
  );
};
