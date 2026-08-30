import React from 'react';
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { tokens } from '../theme';
import { EmptyState, HandOffBanner, SectionBand } from './shared';
import { AuditRec } from '../mockData';
import { AuditEntryDetail } from '../pages/C8/AuditSearch';

const roleLabel = (r: string) => r.replace(/_/g, ' ').toLowerCase();

const SOURCE_COLOUR: Record<string, string> = {
  'User interface': '#0F79C4',
  Integration: '#C77700',
  'Scheduled job': '#5A6B7B'
};

/**
 * C08 2.1 Record History — WF-C8-02 / Steps 1–2.
 * The audit entries of a record, read as business language rather than raw field names.
 * Raw names remain available in the entry detail drawer.
 */
export const HistoryPanel8: React.FC<{ recordKey: string; recordName?: string }> = ({ recordKey, recordName }) => {
  const s = useStore();
  const navigate = useNavigate();
  const entries = s.auditForRecord(recordKey);
  const [detail, setDetail] = React.useState<AuditRec | null>(null);

  /** the business sentence — who acted, under which authority, and what they did */
  const sentence = (a: AuditRec) => {
    const who = a.source === 'User interface'
      ? `${a.user}, acting as ${roleLabel(a.role)}`
      : a.source === 'Integration'
        ? `${a.user}${a.originatingSystem ? ` (${a.originatingSystem})` : ''}`
        : a.user;
    return `${a.action} by ${who} in ${a.country}`;
  };

  const detailLine = (a: AuditRec) => {
    if (a.field && (a.oldValue || a.newValue)) {
      return `${a.field}: ${a.oldValue ?? '—'} → ${a.newValue ?? '—'}${a.reason ? ` · reason: ${a.reason}` : ''}`;
    }
    if (a.levelApplied === 'Record level') {
      return `Record-level audit is configured for ${a.entity}, so field detail is not captured — WF-C8-01 / Step 4.`;
    }
    if (a.levelApplied === 'Status level' && !a.field) {
      return `Status-level audit is configured for ${a.entity}, so only status changes carry detail.`;
    }
    return undefined;
  };

  return (
    <Paper variant="outlined">
      <SectionBand>Record history — business change, in business language (C8 / WF-C8-02 / Step 1)</SectionBand>
      <Box sx={{ p: 2 }}>
        <Alert severity="info" sx={{ fontSize: 12.5, mb: 2 }}>
          <b>History</b> is C08's account of change: what changed, by whom, under which authority, from where.
          The <b>Activity</b> tab is C06's merged timeline over comments, documents and change — the same events read
          for a different question. Both are kept deliberately.
        </Alert>

        {entries.length === 0 ? (
          <EmptyState message="No history entries for this record yet" />
        ) : (
          <Box sx={{ position: 'relative', pl: 2 }}>
            <Box sx={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 2, bgcolor: tokens.border }} />
            {entries.map((a) => (
              <Box key={a.id} sx={{ position: 'relative', pl: 2.5, pb: 2 }}>
                <Box sx={{
                  position: 'absolute', left: -6.5, top: 4, width: 11, height: 11, borderRadius: '50%',
                  bgcolor: SOURCE_COLOUR[a.source] ?? tokens.grey, border: '2px solid #fff'
                }} />
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ gap: 0.5 }}>
                  <Typography sx={{ fontSize: 12, color: tokens.textSecondary, minWidth: 120 }}>{a.at}</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{sentence(a)}</Typography>
                  <Chip size="small" variant="outlined" label={a.source}
                        sx={{ height: 18, fontSize: 10, borderColor: SOURCE_COLOUR[a.source], color: SOURCE_COLOUR[a.source] }} />
                  {a.sensitive && (
                    <Chip size="small" icon={<LockOutlinedIcon sx={{ fontSize: 12 }} />}
                          label={a.sensitiveClass ?? 'Sensitive action'}
                          sx={{ height: 18, fontSize: 10, bgcolor: '#FBEBDF', color: '#8A4208' }} />
                  )}
                  {a.archived && <Chip size="small" variant="outlined" label="Archived" sx={{ height: 18, fontSize: 10 }} />}
                </Stack>
                {detailLine(a) && (
                  <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mt: 0.25 }}>{detailLine(a)}</Typography>
                )}
                <Button size="small" sx={{ fontSize: 11, p: 0, minWidth: 0, mt: 0.25 }} onClick={() => setDetail(a)}>
                  Entry detail
                </Button>
              </Box>
            ))}
          </Box>
        )}

        <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mt: 1 }}>
          {recordName ? `${recordName} — ` : ''}every entry was written in the same action as the change and cannot be
          edited or deleted by any role, including an administrator — WF-C8-01 / Steps 1 and 7. Technical field names,
          session, address and device are in the entry detail rather than on the timeline.
        </Typography>
        <Stack spacing={1} sx={{ mt: 1.5 }}>
          <HandOffBanner target="C4 / WF-C4-01 Standard Approval Cycle" passed="Approval decisions, which appear here as part of the record's change history" />
          <HandOffBanner target="C6 / WF-C6-02 Comments within Approvals and Exceptions" passed="Comment activity, merged into the Activity tab rather than duplicated here" />
          {/* The C8/C9 line: this store holds business activity, C9 holds technical activity. */}
          <HandOffBanner
            label="DEPENDENCY"
            target="C9 / WF-C9-01 Logging and Error Handling"
            passed="Technical events — errors, integration exchanges, jobs and system health — are held separately in C9 and are not written here"
            to="/c9/incidents"
            goLabel="Open the technical log"
          />
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          <Button size="small" variant="outlined" onClick={() => navigate('/c8/search')}>Open the audit search</Button>
        </Stack>
      </Box>

      <AuditEntryDetail entry={detail} onClose={() => setDetail(null)} />
    </Paper>
  );
};
