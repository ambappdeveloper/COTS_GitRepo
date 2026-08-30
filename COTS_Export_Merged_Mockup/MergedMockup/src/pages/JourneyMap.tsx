/**
 * The journey map: the fourteen integrated workflows, each step linked to the screen where it is
 * performed. This is the screen that makes the integration reviewable — the workflow document, the
 * mockup and the walkthrough all describe what is listed here.
 *
 * A step with no screen carries its reason and no link. Nothing on this page is a dead button.
 */

import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BlockIcon from '@mui/icons-material/Block';
import { Link } from 'react-router-dom';
import { INTAKE_INTEGRATION_GAP, WORKFLOWS, phaseLabel } from '../integration/journey';
import { TOTAL_PHASES } from '../integration/exportProcess';
import { OWNER_COLOUR, OWNER_LABEL } from '../integration/recordMap';

export default function JourneyMap() {
  const [filter, setFilter] = React.useState<'all' | 'core' | 'shared' | 'export'>('all');

  const gaps = WORKFLOWS.flatMap((w) => w.steps.filter((s) => s.unavailable));

  return (
    <Box sx={{ p: 3, bgcolor: '#F4F6F8', minHeight: 'calc(100vh - 44px)' }}>
      <Typography sx={{ fontSize: 20, fontWeight: 500 }}>Integrated journey map</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 900, mt: 0.5 }}>
        Every step below is a numbered step of <code>COTS_Integrated_Workflows.md</code>. The link beside it opens the
        screen in the Core, Shared or Export prototype where that step is carried out. <b>WF-INT-11</b> and{' '}
        <b>WF-INT-12</b> come first because they run before every business journey.
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button size="small" variant="contained" component={Link} to="/document-chain">
          Open the export document chain — Core and Shared injected
        </Button>
        <Button size="small" variant="outlined" component={Link} to="/export">
          The Export process — all {TOTAL_PHASES} phases in order
        </Button>
      </Stack>

      {/*
        v1.3 — the one integration finding the Export update produces, stated rather than filled in.
        It belongs on this screen because this is the screen that claims to show how Core and Shared
        are integrated with Export, and for seven of the twenty-three phases nothing does.
      */}
      <Alert severity="warning" sx={{ mt: 2, maxWidth: 1100 }}>
        <AlertTitle sx={{ fontSize: 13.5 }}>
          Phases {INTAKE_INTEGRATION_GAP.phases} — {INTAKE_INTEGRATION_GAP.title}
        </AlertTitle>
        <Typography variant="body2">{INTAKE_INTEGRATION_GAP.detail}</Typography>
        <Typography variant="body2" sx={{ mt: 0.75 }}>
          <b>Blocked by:</b> {INTAKE_INTEGRATION_GAP.blockedBy}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          component={Link}
          to={INTAKE_INTEGRATION_GAP.seeInstead}
          sx={{ mt: 1 }}
        >
          See those seven phases and the capabilities they would need
        </Button>
      </Alert>

      <Stack direction="row" spacing={1} sx={{ my: 2 }}>
        {(['all', 'core', 'shared', 'export'] as const).map((f) => (
          <Button
            key={f}
            size="small"
            variant={filter === f ? 'contained' : 'outlined'}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All steps' : OWNER_LABEL[f]}
          </Button>
        ))}
      </Stack>

      {gaps.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2, maxWidth: 1100 }}>
          <b>{gaps.length} step{gaps.length === 1 ? '' : 's'} in the workflow ha{gaps.length === 1 ? 's' : 've'} no
          screen in any of the three prototypes.</b> They are listed in place, with the reason, rather than given a
          link that leads nowhere.
        </Alert>
      )}

      {WORKFLOWS.map((w) => {
        const steps = w.steps.filter((s) => filter === 'all' || s.owner === filter || s.owner === 'integration');
        if (steps.length === 0) return null;
        return (
          <Accordion key={w.id} disableGutters defaultExpanded={w.id === 'WF-INT-01'} sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                <Chip size="small" label={w.id} sx={{ height: 20, fontWeight: 700 }} />
                <Typography sx={{ fontWeight: 600 }}>{w.title}</Typography>
                <Chip size="small" variant="outlined" label={`${w.steps.length} steps`} sx={{ height: 20 }} />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <b>Trigger.</b> {w.trigger}
              </Typography>
              <Stack spacing={1}>
                {steps.map((s, i) => (
                  <Paper
                    key={`${s.wf}-${s.step}-${i}`}
                    variant="outlined"
                    sx={{ p: 1.5, borderLeft: `3px solid ${OWNER_COLOUR[s.owner]}` }}
                  >
                    <Stack
                      direction={{ xs: 'column', md: 'row' }}
                      spacing={1}
                      justifyContent="space-between"
                      alignItems={{ md: 'center' }}
                    >
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                          <Chip
                            size="small"
                            label={OWNER_LABEL[s.owner]}
                            sx={{ bgcolor: OWNER_COLOUR[s.owner], color: '#fff', height: 18, fontSize: '0.65rem' }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {s.wf} / Step {s.step}
                          </Typography>
                          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{s.title}</Typography>
                          {/* v1.3 — the Export phase this step's work belongs to, read from the
                              process model so the number and the name cannot go stale here. */}
                          {phaseLabel(s) && (
                            <Chip
                              size="small"
                              variant="outlined"
                              label={phaseLabel(s)}
                              sx={{ height: 19, fontSize: '0.65rem' }}
                            />
                          )}
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                          {s.note}
                        </Typography>
                        {s.unavailable && (
                          <Alert icon={<BlockIcon fontSize="small" />} severity="warning" sx={{ mt: 1, py: 0 }}>
                            <Typography variant="caption">{s.unavailable}</Typography>
                          </Alert>
                        )}
                      </Box>
                      {s.to ? (
                        <Button size="small" variant="outlined" component={Link} to={s.to} sx={{ flexShrink: 0 }}>
                          Open the screen
                        </Button>
                      ) : (
                        <Chip size="small" label="No screen — stated gap" sx={{ flexShrink: 0, height: 22 }} />
                      )}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
              <Typography variant="body2" sx={{ mt: 1.5 }}>
                <b>Outcome.</b> {w.outcome}
              </Typography>
            </AccordionDetails>
          </Accordion>
        );
      })}

      <Alert severity="info" sx={{ mt: 2, maxWidth: 1100 }}>
        The conflict register at the end of <code>COTS_Integrated_Workflows.md</code> records ten cross-document
        points, five of them resolved on 23 August 2026 and five still open. The open ones are marked{' '}
        <i>Business confirmation required</i> in the workflow document and on the steps above.
      </Alert>
    </Box>
  );
}
