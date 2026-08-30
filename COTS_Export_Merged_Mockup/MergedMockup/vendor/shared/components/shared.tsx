import React from 'react';
import {
  Box, Button, Chip, Divider, Paper, Stack, Typography, IconButton, Collapse,
} from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CallMadeIcon from '@mui/icons-material/CallMade';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import { COLORS } from '../theme';
import { Link as RouterLink } from 'react-router-dom';

/* ------------------------------------------------------------------ status */

const STATUS_GROUP: Record<string, string> = {
  Draft: COLORS.draft,
  'Returned for amendment': COLORS.draft,
  'Evidence incomplete': COLORS.draft,
  'Pending Approval': COLORS.progress,
  Open: COLORS.progress,
  Pending: COLORS.progress,
  Approved: COLORS.good,
  Confirmed: COLORS.good,
  Sufficient: COLORS.good,
  Closed: COLORS.good,
  Rejected: COLORS.bad,
  'Not approved': COLORS.bad,
  Expired: COLORS.bad,
  Superseded: COLORS.neutral,
  Closed_: COLORS.neutral,
  Insufficient: COLORS.attention,
  Overdue: COLORS.attention,
  'Variance flagged': COLORS.attention,
};

export function StatusChip({ status, size = 'small' }: { status: string; size?: 'small' | 'medium' }) {
  const color = STATUS_GROUP[status] ?? COLORS.progress;
  return (
    <Chip
      label={status}
      size={size}
      sx={{
        bgcolor: color,
        color: '#fff',
        fontWeight: 600,
        fontSize: '0.7rem',
        height: 20,
        borderRadius: '3px',
        '& .MuiChip-label': { px: 1 },
      }}
    />
  );
}

/* ------------------------------------------------------- section container */

export function SectionCard({
  title,
  children,
  right,
  collapsible = false,
  dense = false,
}: {
  title?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  collapsible?: boolean;
  dense?: boolean;
}) {
  const [open, setOpen] = React.useState(true);
  return (
    <Paper variant="outlined" sx={{ mb: 2, borderColor: COLORS.border }}>
      {title && (
        <Box
          sx={{
            px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1,
            borderBottom: open ? `1px solid ${COLORS.border}` : 'none',
          }}
        >
          <Typography variant="subtitle2" sx={{ flex: 1 }}>{title}</Typography>
          {right}
          {collapsible && (
            <IconButton size="small" onClick={() => setOpen(!open)} sx={{ color: COLORS.primary }}>
              {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
            </IconButton>
          )}
        </Box>
      )}
      <Collapse in={open}>
        <Box sx={{ p: dense ? 0 : 2 }}>{children}</Box>
      </Collapse>
    </Paper>
  );
}

/* ----------------------------------------------------------- record header */

export function MetaLine({ items }: { items: [string, string][] }) {
  return (
    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.92)', fontSize: '0.8rem' }}>
      {items.map(([k, v], i) => (
        <React.Fragment key={k}>
          {i > 0 && <Box component="span" sx={{ px: 1, opacity: 0.6 }}>│</Box>}
          <Box component="span" sx={{ opacity: 0.8 }}>{k} : </Box>
          <Box component="span" sx={{ fontWeight: 600 }}>{v}</Box>
        </React.Fragment>
      ))}
    </Typography>
  );
}

export function RecordHeader({
  title,
  chip,
  meta,
  actions,
}: {
  title: string;
  chip?: React.ReactNode;
  meta: [string, string][];
  actions?: React.ReactNode;
}) {
  return (
    <Box sx={{ bgcolor: COLORS.primary, color: '#fff', px: 3, pt: 1.5, pb: 2 }}>
      <Stack direction="row" alignItems="flex-start" spacing={2}>
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
            <Typography sx={{ fontSize: '1.35rem', fontWeight: 500, letterSpacing: 0.4 }}>
              {title.toUpperCase()}
            </Typography>
            {chip}
          </Stack>
          <MetaLine items={meta} />
        </Box>
        {actions && (
          <Paper sx={{ borderRadius: 999, px: 1, py: 0.5, display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {actions}
          </Paper>
        )}
      </Stack>
    </Box>
  );
}

/* ------------------------------------------------------------ field layout */

export function RequiredLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Typography
      variant="caption"
      sx={{ color: required ? COLORS.required : COLORS.textSecondary, fontWeight: required ? 600 : 400 }}
    >
      {label}
    </Typography>
  );
}

export function ReadOnlyField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1} sx={{ py: 0.4 }}>
      <Typography variant="caption" sx={{ color: COLORS.textSecondary, minWidth: 190, textAlign: 'right' }}>
        {label} :
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
    </Stack>
  );
}

export function FieldGrid({ children, columns = 3 }: { children: React.ReactNode; columns?: number }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, columnGap: 3, rowGap: 1 }}>
      {children}
    </Box>
  );
}

/* --------------------------------------------------- review-aid components */

export function BusinessConfirmation({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex', gap: 1, alignItems: 'flex-start',
        bgcolor: '#FFF7E6', border: `1px solid #F0D9A8`, borderRadius: 1, px: 1.5, py: 1, my: 1,
      }}
    >
      <InfoOutlinedIcon sx={{ fontSize: 17, color: COLORS.draft, mt: '1px' }} />
      <Typography variant="caption" sx={{ color: '#6B4E00' }}>
        <b>Business confirmation required:</b> {children}
      </Typography>
    </Box>
  );
}

export function PrototypeNote({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, fontStyle: 'italic', my: 0.5 }}>
      Prototype assumption — {children}
    </Typography>
  );
}

export function HandOffBanner({
  to,
  passes,
  returns,
  resumes,
  linkLabel,
  linkTo,
}: {
  to: string;
  passes: string;
  returns: string;
  resumes?: string;
  linkLabel?: string;
  linkTo?: string;
}) {
  return (
    <Box
      sx={{
        border: `1px dashed ${COLORS.primary}`, bgcolor: '#F0F8FD', borderRadius: 1,
        px: 1.5, py: 1, my: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap',
      }}
    >
      <CallMadeIcon sx={{ fontSize: 16, color: COLORS.primary }} />
      <Box sx={{ flex: 1, minWidth: 260 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.primaryDark, display: 'block' }}>
          HAND-OFF → {to}
        </Typography>
        <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
          Passes: {passes} · Returns: {returns}{resumes ? ` · ${resumes}` : ''}
        </Typography>
      </Box>
      {linkTo && (
        <Button size="small" component={RouterLink} to={linkTo} variant="outlined">
          {linkLabel ?? 'Open'}
        </Button>
      )}
    </Box>
  );
}

export function SimulationButton({
  label,
  note,
  onClick,
}: {
  label: string;
  note?: string;
  onClick: () => void;
}) {
  return (
    <Box sx={{ my: 1 }}>
      <Button
        onClick={onClick}
        size="small"
        startIcon={<ScienceOutlinedIcon />}
        sx={{
          border: `1px dashed ${COLORS.attention}`, color: COLORS.attention,
          fontSize: '0.72rem', fontWeight: 700, letterSpacing: 0.3,
        }}
      >
        PROTOTYPE — {label}
      </Button>
      {note && (
        <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mt: 0.3 }}>
          {note} Not production functionality.
        </Typography>
      )}
    </Box>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <Box sx={{ py: 4, textAlign: 'center', color: COLORS.textSecondary }}>
      <Typography variant="body2">{text}</Typography>
    </Box>
  );
}

export function TraceNote({ workflow }: { workflow: string }) {
  return (
    <Typography variant="caption" sx={{ color: COLORS.textSecondary, display: 'block', mb: 1 }}>
      Traces to {workflow}
    </Typography>
  );
}

/* --------------------------------------------------------- info card strip */

export type InfoCard = { title: string; lines: [string, string][]; note?: string };

export function InfoCardStrip({ cards, heading }: { cards: InfoCard[]; heading?: React.ReactNode }) {
  return (
    <Box>
      {heading}
      <Stack spacing={1.5}>
        {cards.map((c) => (
          <Paper key={c.title} variant="outlined" sx={{ borderColor: COLORS.border }}>
            <Box sx={{ bgcolor: '#F7F8F9', px: 1.5, py: 0.75, borderBottom: `1px solid ${COLORS.border}` }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>
                {c.title.toUpperCase()}
              </Typography>
            </Box>
            <Box sx={{ px: 1.5, py: 1 }}>
              {c.lines.length === 0 && <Typography variant="caption" color="text.secondary">No records</Typography>}
              {c.lines.map(([k, v]) => (
                <Stack key={k} direction="row" justifyContent="space-between" sx={{ py: 0.25 }}>
                  <Typography variant="caption" color="text.secondary">{k}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>{v}</Typography>
                </Stack>
              ))}
              {c.note && (
                <>
                  <Divider sx={{ my: 0.75 }} />
                  <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>{c.note}</Typography>
                </>
              )}
            </Box>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}

/* --------------------------------------------------------- bottom bar */

export function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        bgcolor: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: 1, px: 2, py: 1.25, mt: 2,
      }}
    >
      {children}
    </Box>
  );
}
