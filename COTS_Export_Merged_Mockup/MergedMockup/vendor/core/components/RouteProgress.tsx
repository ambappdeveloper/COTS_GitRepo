import React from 'react';
import { Box, Paper, Typography, Stack, Chip, Tooltip } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import UndoIcon from '@mui/icons-material/Undo';
import { tokens } from '../theme';
import { ApprovalView, requiredCount, slaLabel } from '../mockData/c4';
import { SectionBand } from './shared';
import { useStore } from '../store';

/**
 * C04 1.4 Route Progress — WF-C4-01 / Steps 3–4 and 9.
 * Three things the shared approval panel could only assert:
 * how the route was resolved, that a step can be parallel, and which
 * version of the route this request is pinned to.
 */
export const RouteProgress: React.FC<{ view: ApprovalView; compact?: boolean }> = ({ view, compact }) => {
  const s = useStore();

  const decisionFor = (seq: number, role: string) =>
    view.decisions.find((d) => d.seq === seq && d.role === role);

  const iconFor = (decision?: string) => {
    if (decision === 'Approved') return <CheckIcon sx={{ fontSize: 15 }} />;
    if (decision === 'Rejected') return <CloseIcon sx={{ fontSize: 15 }} />;
    if (decision) return <UndoIcon sx={{ fontSize: 15 }} />;
    return null;
  };

  return (
    <Paper variant="outlined" sx={{ mb: 2 }}>
      <SectionBand>Route progress</SectionBand>

      {/* resolution strip — the route came from configuration, not from code */}
      <Box sx={{ px: 2, py: 1.25, bgcolor: '#F7FAFC', borderBottom: `1px solid ${tokens.border}` }}>
        <Typography sx={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: tokens.textSecondary, mb: 0.5 }}>
          How this route was resolved
        </Typography>
        <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.75 }}>
          {view.resolution.map((r) => (
            <Chip key={r} size="small" variant="outlined" label={r}
                  sx={{ height: 21, fontSize: 11, bgcolor: '#fff', borderColor: tokens.border }} />
          ))}
        </Stack>
        {view.thresholdValue && (
          <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary, mt: 0.5 }}>
            Threshold on this record: {view.thresholdValue}
          </Typography>
        )}
      </Box>

      {/* the tracker */}
      <Box sx={{ p: 2, overflowX: 'auto' }}>
        <Stack direction="row" alignItems="flex-start" sx={{ gap: 0 }}>
          {view.groups.map((g, gi) => {
            const groupDone = g.members.filter((m) => decisionFor(g.seq, m.role)?.decision === 'Approved').length;
            const need = requiredCount(g);
            const state = gi < view.currentGroup ? 'done' : gi === view.currentGroup ? 'active' : 'pending';
            return (
              <React.Fragment key={`${g.seq}-${gi}`}>
                <Box sx={{
                  minWidth: 210, p: 1.25, borderRadius: '3px',
                  border: g.type === 'Parallel' ? `1px dashed ${state === 'active' ? tokens.primary : tokens.border}` : '1px solid transparent',
                  bgcolor: g.type === 'Parallel' ? '#FBFCFD' : 'transparent'
                }}>
                  <Typography sx={{ fontSize: 11, color: tokens.textSecondary, mb: 0.75 }}>
                    Step {g.seq}{g.type === 'Parallel' ? ` — parallel, ${g.rule?.toLowerCase()}` : ''}
                  </Typography>
                  <Stack spacing={1}>
                    {g.members.map((m) => {
                      const d = decisionFor(g.seq, m.role);
                      const held = state === 'active' && view.unresolved?.role === m.role;
                      const resolvedName = (state === 'active' && view.assignedApprover)
                        ? view.assignedApprover
                        : s.resolveApprover(m.role, view.country).approver;
                      const colour = d?.decision === 'Approved' ? tokens.green
                        : d?.decision === 'Rejected' ? tokens.red
                        : d ? tokens.amber
                        : held ? tokens.red
                        : state === 'active' ? tokens.primary : tokens.border;
                      return (
                        <Tooltip
                          key={m.role}
                          disableInteractive
                          title={d
                            ? `${d.decision} by ${d.approver} at ${d.at}${d.comment ? ' — ' + d.comment : ''}`
                            : held
                              ? 'Held — no approver could be resolved'
                              : `${slaLabel(m)} service level${m.commentOnApprove ? '; a comment is required even when approving' : ''}`}
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{
                              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                              bgcolor: d || state === 'active' || held ? colour : '#fff',
                              border: `2px solid ${colour}`, color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              {iconFor(d?.decision) ?? (
                                <Typography sx={{ fontSize: 10.5, color: d || state === 'active' || held ? '#fff' : tokens.textSecondary }}>
                                  {g.seq}
                                </Typography>
                              )}
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography sx={{ fontSize: 12.5, fontWeight: state === 'active' ? 600 : 400 }}>
                                {m.role.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())}
                              </Typography>
                              <Typography sx={{ fontSize: 11, color: tokens.textSecondary }}>
                                {d ? `${d.decision} · ${d.approver}` : held ? 'Held — approver unresolved' : (resolvedName ?? 'Unresolved')}
                                {' · '}{slaLabel(m)}
                              </Typography>
                            </Box>
                          </Stack>
                        </Tooltip>
                      );
                    })}
                  </Stack>
                  {g.type === 'Parallel' && (
                    <Typography sx={{ fontSize: 11, color: state === 'active' ? tokens.primary : tokens.textSecondary, mt: 0.75 }}>
                      {groupDone} of {need} required decision(s) received
                    </Typography>
                  )}
                </Box>
                {gi < view.groups.length - 1 && (
                  <Box sx={{ width: 26, height: 2, bgcolor: tokens.border, alignSelf: 'center', mx: 0.5 }} />
                )}
              </React.Fragment>
            );
          })}
        </Stack>
      </Box>

      {/* version stamp — a request in flight never moves to a newer version */}
      <Box sx={{ px: 2, py: 1, borderTop: `1px solid ${tokens.border}`, bgcolor: '#FAFBFC' }}>
        <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
          Submitted on route <b>{view.routeId}</b> version <b>{view.routeVersion}</b>. A request already in flight
          continues on the version under which it was submitted, even after a newer version becomes effective —
          WF-C4-03 / Step 5.
          {!compact && view.delegatedFrom && ` Presented through a delegation from ${view.delegatedFrom}.`}
        </Typography>
      </Box>
    </Paper>
  );
};
