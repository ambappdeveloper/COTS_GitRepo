import React from 'react';
import {
  Box, Paper, Typography, TextField, Button, Stack, Select, MenuItem, FormControl, InputLabel,
  Step, StepLabel, Stepper, Table, TableBody, TableCell, TableHead, TableRow, Chip, Alert,
  IconButton, Tooltip, Autocomplete
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { AccessRequest, CommentRec, DocumentRec, AuditRec, User } from '../mockData';
import { useStore } from '../store';
import { tokens } from '../theme';
import { EmptyState, HandOffBanner, PlaceholderNote, SectionBand, StatusChip } from './shared';

/* ---------------------------------------------------------------------------
 * The C6 comment panel that used to live here has been replaced by the real
 * one in components/CommentThread.tsx (C06 turn). Nothing imports it now, so it
 * is removed rather than left to diverge from the panel actually in use.
 * ------------------------------------------------------------------------- */

/* ---------------------------------------------------------------------------
 * The C7 document panel that used to live here has been replaced by the real one
 * in components/DocumentsPanel7.tsx (C07 turn), and the C8 history panel by
 * components/HistoryPanel8.tsx (C08 turn). Both are removed rather than left to
 * diverge from the panels actually in use.
 * ------------------------------------------------------------------------- */

/* ------------------------------ C4 Approval ------------------------------ */

export const ApprovalPanel: React.FC<{ request: AccessRequest }> = ({ request }) => {
  const activeStep = request.status === 'Approved' ? request.steps.length : request.currentStep;
  return (
    <Box>
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <SectionBand>Route progress — resolved from configuration by object type, country and role sensitivity</SectionBand>
        <Box sx={{ p: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {request.steps.map((s) => (
              <Step key={s.seq} completed={!!s.decision && s.decision === 'Approved'}>
                <StepLabel
                  error={s.decision === 'Rejected' || s.decision === 'Returned for Amendment'}
                  optional={<Typography sx={{ fontSize: 11 }}>{s.type} · SLA {s.sla}{s.at ? ` · ${s.at}` : ''}</Typography>}
                >
                  {s.role}
                  <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>{s.approver}</Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
          <HandOffBanner
            target="C4 / WF-C4-01 Standard Approval Cycle"
            passed="Object type (access request), user type, requested roles and sensitivity, country and module scope, requester"
            returned="Approved / Rejected / Returned for amendment"
            resumes="C1 / WF-C1-02 / Step 6 on approval; Step 2 on return; request closed on rejection"
          />
          <HandOffBanner label="DEPENDENCY" target="C1 / WF-C1-04 Delegation and Absence Cover" passed="Approver role" returned="Named approver with any delegation in force applied" />
        </Box>
      </Paper>

      <Paper variant="outlined">
        <SectionBand>Approval history</SectionBand>
        {request.steps.every((s) => !s.decision)
          ? <EmptyState message="No decisions recorded yet" />
          : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Step</TableCell><TableCell>Approver role</TableCell><TableCell>Approver</TableCell>
                  <TableCell>Delegate</TableCell><TableCell>Decision</TableCell><TableCell>Comment</TableCell><TableCell>Timestamp</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {request.steps.filter((s) => s.decision).map((s) => (
                  <TableRow key={s.seq}>
                    <TableCell>{s.seq}</TableCell>
                    <TableCell>{s.role}</TableCell>
                    <TableCell>{s.approver}</TableCell>
                    <TableCell>{s.delegate ?? '—'}</TableCell>
                    <TableCell><StatusChip status={s.decision!} /></TableCell>
                    <TableCell sx={{ maxWidth: 320 }}>{s.comment ?? '—'}</TableCell>
                    <TableCell>{s.at}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </Paper>
    </Box>
  );
};
