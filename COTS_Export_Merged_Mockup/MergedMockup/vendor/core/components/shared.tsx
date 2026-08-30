import React from 'react';
import {
  Box, Chip, Typography, Paper, Button, Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Divider, Alert, Stack, TextField
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import { useNavigate } from 'react-router-dom';
import { statusColour, tokens } from '../theme';

export const StatusChip: React.FC<{ status: string; size?: 'small' | 'medium' }> = ({ status, size = 'small' }) => (
  <Chip
    label={status}
    size={size}
    sx={{
      bgcolor: statusColour(status),
      color: '#fff',
      borderRadius: '3px',
      height: size === 'small' ? 22 : 26,
      fontSize: size === 'small' ? 11.5 : 13
    }}
  />
);

/** Deep-blue page header banner with breadcrumb, mirroring the CTRM reference. */
export const PageBanner: React.FC<{
  title: string;
  breadcrumb: string[];
  actions?: React.ReactNode;
  subtitle?: string;
}> = ({ title, breadcrumb, actions, subtitle }) => (
  <Box sx={{ bgcolor: tokens.primaryDark, color: '#fff', px: 3, pt: 2, pb: 2.5 }}>
    <Typography sx={{ fontSize: 12, opacity: 0.8, mb: 0.5 }}>{breadcrumb.join('  >  ')}</Typography>
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
      <Box>
        <Typography variant="h5">{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: 13, opacity: 0.85, mt: 0.25 }}>{subtitle}</Typography>}
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{actions}</Box>
    </Box>
  </Box>
);

export const SectionBand: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ bgcolor: '#EEF1F4', px: 2, py: 0.75, borderTop: `1px solid ${tokens.border}`, borderBottom: `1px solid ${tokens.border}` }}>
    <Typography variant="subtitle2" sx={{ color: tokens.textSecondary }}>{children}</Typography>
  </Box>
);

export const FormSectionCard: React.FC<{ title: string; children: React.ReactNode; note?: React.ReactNode }> = ({ title, children, note }) => (
  <Paper variant="outlined" sx={{ mb: 2 }}>
    <SectionBand>{title}</SectionBand>
    <Box sx={{ p: 2 }}>{children}</Box>
    {note && <Box sx={{ px: 2, pb: 2 }}>{note}</Box>}
  </Paper>
);

/** Read-only Label : Value grid, three columns — the CTRM detail pattern. */
export const FieldGrid: React.FC<{ items: [string, React.ReactNode][]; columns?: number }> = ({ items, columns = 3 }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: `repeat(${columns}, 1fr)` }, columnGap: 4, rowGap: 1.5, p: 2 }}>
    {items.map(([label, value], i) => (
      <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
        <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, minWidth: 150, textAlign: 'right' }}>{label}</Typography>
        <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>:</Typography>
        <Typography sx={{ fontSize: 13.5 }}>{value === undefined || value === null || value === '' ? '—' : value}</Typography>
      </Box>
    ))}
  </Box>
);

/** Current value beside proposed value — C3 / WF-C3-02, C10 / WF-C10-03, C1 amend mode. */
export const SideBySideCompare: React.FC<{ rows: { label: string; current: React.ReactNode; proposed: React.ReactNode }[] }> = ({ rows }) => (
  <Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, px: 2, py: 1, bgcolor: '#FAFBFC' }}>
      <Typography variant="subtitle2" color="text.secondary">Field</Typography>
      <Typography variant="subtitle2" color="text.secondary">Current value</Typography>
      <Typography variant="subtitle2" color="text.secondary">Proposed value</Typography>
    </Box>
    {rows.map((r, i) => (
      <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, px: 2, py: 1, borderTop: `1px solid ${tokens.border}` }}>
        <Typography sx={{ fontSize: 13 }}>{r.label}</Typography>
        <Typography sx={{ fontSize: 13, color: tokens.textSecondary }}>{r.current || '—'}</Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{r.proposed || '—'}</Typography>
      </Box>
    ))}
  </Box>
);

export const EmptyState: React.FC<{ message: string; hint?: string }> = ({ message, hint }) => (
  <Box sx={{ p: 4, textAlign: 'center', color: tokens.textSecondary }}>
    <InfoOutlinedIcon sx={{ fontSize: 28, opacity: 0.5 }} />
    <Typography sx={{ mt: 1, fontSize: 14 }}>{message}</Typography>
    {hint && <Typography sx={{ mt: 0.5, fontSize: 12.5, opacity: 0.8 }}>{hint}</Typography>}
  </Box>
);

/** Bottom action bar: outlined secondary left, filled primary right. */
export const ActionBar: React.FC<{ left?: React.ReactNode; right?: React.ReactNode }> = ({ left, right }) => (
  <Paper variant="outlined" sx={{ mt: 2, p: 2, display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', position: 'sticky', bottom: 0, zIndex: 2 }}>
    <Box sx={{ display: 'flex', gap: 1 }}>{left}</Box>
    <Box sx={{ display: 'flex', gap: 1 }}>{right}</Box>
  </Paper>
);

export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  confirmColor?: 'primary' | 'error' | 'warning';
  commentLabel?: string;
  commentRequired?: boolean;
  onClose: () => void;
  onConfirm: (comment: string) => void;
}> = ({ open, title, body, confirmLabel = 'Confirm', confirmColor = 'primary', commentLabel, commentRequired, onClose, onConfirm }) => {
  const [comment, setComment] = React.useState('');
  React.useEffect(() => { if (open) setComment(''); }, [open]);
  const blocked = !!commentRequired && comment.trim() === '';
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 18 }}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ fontSize: 14 }} component="div">{body}</DialogContentText>
        {commentLabel && (
          <TextField
            label={commentLabel + (commentRequired ? ' (mandatory)' : ' (optional)')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            multiline minRows={3} fullWidth sx={{ mt: 2 }}
            error={blocked}
            helperText={blocked ? 'A comment is mandatory for this decision — C4 / WF-C4-01 / Step 8.' : ' '}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose}>Cancel</Button>
        <Button variant="contained" color={confirmColor} disabled={blocked} onClick={() => { onConfirm(comment); onClose(); }}>{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Review aid, not a production UI element. Makes a cross-module transition explicit,
 * drawn from the hand-off blocks in COTS_Core_Workflows_Integrated.
 */
export const HandOffBanner: React.FC<{
  label?: 'HAND-OFF' | 'DEPENDENCY' | 'RETURN' | 'CONTINUE';
  target: string;
  passed?: string;
  returned?: string;
  resumes?: string;
  to?: string;
  goLabel?: string;
}> = ({ label = 'HAND-OFF', target, passed, returned, resumes, to, goLabel }) => {
  const navigate = useNavigate();
  return (
    <Paper variant="outlined" sx={{ p: 1.25, my: 1, borderLeft: `4px solid ${tokens.primary}`, bgcolor: '#F2F8FD' }}>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <CallSplitIcon sx={{ fontSize: 18, color: tokens.primary, mt: 0.2 }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: tokens.primary }}>
            {label} → {target}
          </Typography>
          {passed && <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}><b>Passed:</b> {passed}</Typography>}
          {returned && <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}><b>Returned:</b> {returned}</Typography>}
          {resumes && <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}><b>Resumes at:</b> {resumes}</Typography>}
        </Box>
        {to && <Button size="small" onClick={() => navigate(to)}>{goLabel ?? 'Go'}</Button>}
      </Stack>
    </Paper>
  );
};

/** An unresolved business point carried from the workflow documents. */
export const PlaceholderNote: React.FC<{ children: React.ReactNode; kind?: 'confirmation' | 'consistency' }> = ({ children, kind = 'confirmation' }) => (
  <Alert
    severity={kind === 'confirmation' ? 'warning' : 'error'}
    icon={<ReportProblemOutlinedIcon fontSize="inherit" />}
    sx={{ my: 1, fontSize: 12.5, alignItems: 'flex-start', py: 0.5 }}
  >
    <b>{kind === 'confirmation' ? 'Business confirmation required: ' : 'Integration consistency issue: '}</b>
    {children}
  </Alert>
);

export const RecordHeader: React.FC<{
  name: string;
  status: string;
  reference: string;
  date?: string;
  meta?: [string, React.ReactNode][];
  actions?: React.ReactNode;
}> = ({ name, status, reference, date, meta, actions }) => (
  <Box sx={{ bgcolor: tokens.primary, color: '#fff', px: 3, py: 2 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
      <Box>
        <Typography sx={{ fontSize: 22, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.3 }}>{name}</Typography>
        <Box sx={{ mt: 1 }}><StatusChip status={status} size="medium" /></Box>
      </Box>
      <Box sx={{ textAlign: 'right' }}>
        <Typography sx={{ fontSize: 20, fontWeight: 500 }}>{reference}</Typography>
        {date && <Typography sx={{ fontSize: 13, opacity: 0.85 }}>{date}</Typography>}
      </Box>
    </Box>
    {meta && (
      <Box sx={{ mt: 1.5, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {meta.map(([k, v], i) => (
          <Typography key={i} sx={{ fontSize: 12.5, opacity: 0.9 }}><b>{k}:</b> {v}</Typography>
        ))}
      </Box>
    )}
    {actions && (
      <>
        <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.25)' }} />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{actions}</Box>
      </>
    )}
  </Box>
);

export const WhiteButton: React.FC<React.ComponentProps<typeof Button>> = (props) => (
  <Button
    size="small"
    {...props}
    sx={{ bgcolor: '#fff', color: tokens.primary, '&:hover': { bgcolor: '#F0F6FB' }, ...(props.sx ?? {}) }}
    variant="contained"
  />
);
