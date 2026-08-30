import React from 'react';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { useStore } from '../store';
import { tokens } from '../theme';
import { EmptyState, HandOffBanner, SectionBand } from './shared';
import { TimelineSource } from '../mockData/c6';

const SOURCE_COLOUR: Record<TimelineSource, string> = {
  'C6 Comments': '#0F79C4',
  'C7 Documents': '#1E7B4F',
  'C8 Audit': '#5A6B7B'
};

/**
 * C06 2.4 Activity Timeline — WF-C6-02 / Step 5.
 * One chronological view over three sources. Each entry names the module that
 * recorded it, so the timeline reads as a view rather than a fourth store.
 */
export const ActivityTimeline: React.FC<{ recordKey: string; recordName?: string }> = ({ recordKey, recordName }) => {
  const s = useStore();
  const all = s.timelineFor(recordKey);
  const [only, setOnly] = React.useState<TimelineSource | 'All'>('All');
  const entries = only === 'All' ? all : all.filter((e) => e.source === only);
  const sources: (TimelineSource | 'All')[] = ['All', 'C6 Comments', 'C7 Documents', 'C8 Audit'];

  return (
    <Paper variant="outlined">
      <SectionBand>Activity — comments, documents and status changes in one chronology</SectionBand>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2, gap: 0.5 }}>
          {sources.map((src) => (
            <Chip
              key={src} size="small" label={src === 'All' ? `All (${all.length})` : `${src} (${all.filter((e) => e.source === src).length})`}
              onClick={() => setOnly(src)}
              variant={only === src ? 'filled' : 'outlined'}
              sx={{
                height: 24, fontSize: 11.5,
                bgcolor: only === src ? tokens.primary : '#fff',
                color: only === src ? '#fff' : tokens.textSecondary
              }}
            />
          ))}
        </Stack>

        {entries.length === 0 ? (
          <EmptyState message="No activity recorded for this record yet" />
        ) : (
          <Box sx={{ position: 'relative', pl: 2 }}>
            <Box sx={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 2, bgcolor: tokens.border }} />
            {entries.map((e, i) => (
              <Box key={`${e.at}-${i}`} sx={{ position: 'relative', pl: 2.5, pb: 2 }}>
                <Box sx={{
                  position: 'absolute', left: -6.5, top: 4, width: 11, height: 11, borderRadius: '50%',
                  bgcolor: SOURCE_COLOUR[e.source], border: '2px solid #fff'
                }} />
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ gap: 0.5 }}>
                  <Typography sx={{ fontSize: 12, color: tokens.textSecondary, minWidth: 120 }}>{e.at}</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{e.what}</Typography>
                  <Chip size="small" variant="outlined" label={e.source}
                        sx={{ height: 18, fontSize: 10, borderColor: SOURCE_COLOUR[e.source], color: SOURCE_COLOUR[e.source] }} />
                </Stack>
                <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
                  {e.who}{e.role ? ` · ${e.role.replace(/_/g, ' ').toLowerCase()}` : ''}
                </Typography>
                {e.detail && (
                  <Typography sx={{ fontSize: 13, mt: 0.25, whiteSpace: 'pre-wrap' }}>{e.detail}</Typography>
                )}
              </Box>
            ))}
          </Box>
        )}

        <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary, mt: 1 }}>
          {recordName ? `${recordName} — ` : ''}the timeline is a <i>view</i> over three modules, not a fourth place where
          activity is stored: comment activity from C6, document activity from C7 and change history from C8. Each entry
          states which module recorded it.
        </Typography>
        <Stack spacing={1} sx={{ mt: 1.5 }}>
          <HandOffBanner target="C7 / WF-C7-02 Access, Retrieval and Document Register" passed="Document activity, which forms part of the same activity timeline" />
          <HandOffBanner target="C8 / WF-C8-01 Capturing an Audit Entry" passed="Status and field changes, and the full comment history including decision comments" />
        </Stack>
      </Box>
    </Paper>
  );
};
