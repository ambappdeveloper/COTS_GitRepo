/**
 * The frame every Export screen renders inside — v1.4.
 *
 * WHAT CHANGED AT v1.4
 * --------------------
 * Export is no longer framed in an iframe. Its pages are imported in place and rendered here, inside
 * the one Core shell, exactly as the Shared pages have been since v1.2. This component is the Export
 * equivalent of `shell/SharedPageFrame.tsx`: it takes the place of the module's own chrome.
 *
 * What Export's own `Shell` drew — a second app bar with a hamburger, its own module drawer, its own
 * home control, theme switch and account menu — is all provided by the Core shell above, and drawing
 * it again is the "third bar inside the frame" the v1.2 review complained about. So none of it is
 * drawn. `components/Shell.tsx` is not substituted or modified; it is simply never imported, because
 * only Export's own `App.tsx` imports it and this application does not use that file.
 *
 * What is kept from Export's shell: the skip link, and the error boundary — a page that throws should
 * say so inside the frame rather than blanking the whole application.
 *
 * WHAT IT ADDS
 * ------------
 * The phase context built at v1.3, now rendered natively above a real Export screen rather than above
 * an iframe: where this screen sits in the twenty-three phases, previous and next in business
 * sequence, and — on request — the fields, statuses, capabilities and open questions of the phase.
 *
 * It knows which phase a screen belongs to by matching the address against the process model, so a
 * screen that serves no single phase simply gets no strip.
 */

import React from 'react';
import { Box, Chip, Collapse, Divider, Paper, Stack, Tooltip, Typography, Alert, AlertTitle, Button, Breadcrumbs } from '@mui/material';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ToastProvider } from '@export/components/feedback';
import { ThemeProvider as ExportThemeProvider } from '@export/theme/ThemeContext';
import { AuthProvider } from './ExportAuthBridge';
import {
  EXPORT_PHASES,
  TOTAL_PHASES,
  fieldNote,
  fieldSource,
  fieldText,
  neighbours,
  phaseForPath,
  statusBasis,
  statusText,
} from '../integration/exportProcess';
import { OWNER_COLOUR } from '../integration/recordMap';
import { MODULE_SHARED, hasModule } from '../integration/session';
import { useIdentity } from '../integration/useIdentity';
import { WorkflowStepper, type WorkflowStep } from '../components/WorkflowStepper';
import { CapabilityRail } from '../components/CapabilityRail';
import { OpenItems } from '../components/OpenItems';
import { TAG_COLOUR } from '../components/tokens';
import './export-scoped.css';

/** The twenty-three phases as the shared stepper wants them, built once from the model. */
const STEPPER_STEPS: WorkflowStep[] = EXPORT_PHASES.map((p) => ({
  no: p.no,
  label: p.name,
  group: p.group,
  to: p.path,
}));

export function ExportPageFrame() {
  const loc = useLocation();
  const id = useIdentity();
  const [context, setContext] = React.useState(false);
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  /* Which phase this address belongs to. Longest match wins — see `phaseForPath`. */
  const phase = phaseForPath(loc.pathname);
  const { prev, next } = phase ? neighbours(phase.no) : { prev: undefined, next: undefined };

  /* A client-side route change is silent unless something announces it. */
  React.useEffect(() => {
    document.title = phase
      ? `Phase ${String(phase.no).padStart(2, '0')} · ${phase.name} — Export — COTS`
      : 'Export — COTS';
    return () => {
      document.title = 'COTS — Integrated Mockup (Core · Shared · Export)';
    };
  }, [phase]);

  React.useEffect(() => {
    if (context && phase) headingRef.current?.focus();
  }, [context, phase?.no]);

  return (
    <ExportThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Box sx={{ bgcolor: '#F4F6F8', minHeight: '100%' }}>
            {phase && (
              <Box sx={{ px: 1.5, py: 0.5, bgcolor: '#fff', borderBottom: '1px solid #E0E0E0' }}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={1}
                  alignItems={{ md: 'center' }}
                  sx={{ mb: 0.25, flexWrap: 'wrap', rowGap: 0.5 }}
                >
                  <Breadcrumbs separator="›" sx={{ fontSize: 12 }}>
                    <Typography
                      component={Link}
                      to="/export"
                      variant="caption"
                      sx={{ color: 'primary.main', textDecoration: 'none' }}
                    >
                      Export
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {phase.group}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {String(phase.no).padStart(2, '0')} · {phase.name}
                    </Typography>
                  </Breadcrumbs>
                  <Chip
                    size="small"
                    label={`${phase.section} · phase ${phase.no} of ${TOTAL_PHASES}`}
                    sx={{ height: 18, fontSize: '0.62rem', flexShrink: 0 }}
                  />
                  {phase.pNumber && (
                    <Chip size="small" variant="outlined" label={`was ${phase.pNumber}`} sx={{ height: 18, fontSize: '0.62rem', flexShrink: 0 }} />
                  )}
                  {!phase.ownerConfirmed && (
                    <Chip size="small" label="owner to be confirmed" sx={{ height: 18, fontSize: '0.62rem', flexShrink: 0, bgcolor: TAG_COLOUR.open, color: '#fff' }} />
                  )}
                  {phase.changedAtV24 && (
                    <Chip size="small" label="changed at v2.4" sx={{ height: 18, fontSize: '0.62rem', flexShrink: 0, bgcolor: TAG_COLOUR.changed, color: '#fff' }} />
                  )}
                  <Box sx={{ flex: 1 }} />
                  <Tooltip describeChild title="What this phase captures, the capabilities it uses, and what about it is still undecided">
                    <Button
                      size="small"
                      onClick={() => setContext((c) => !c)}
                      aria-expanded={context}
                      startIcon={<LayersOutlinedIcon sx={{ fontSize: 15 }} />}
                      sx={{ whiteSpace: 'nowrap', flexShrink: 0, fontSize: '0.72rem', textTransform: 'none' }}
                    >
                      {context ? 'Hide phase context' : `Phase context · ${phase.open.length} open`}
                    </Button>
                  </Tooltip>
                </Stack>

                <WorkflowStepper
                  steps={STEPPER_STEPS}
                  currentNo={phase.no}
                  prev={prev ? { no: prev.no, label: prev.name, group: prev.group, to: prev.path } : undefined}
                  next={next ? { no: next.no, label: next.name, group: next.group, to: next.path } : undefined}
                  unit="phase"
                  heading={phase.group}
                  colour={OWNER_COLOUR.export}
                  ariaLabel={`The ${TOTAL_PHASES} phases of the export process, in order`}
                />
              </Box>
            )}

            {phase && (
              <Collapse in={context}>
                <Box sx={{ p: 1.5, bgcolor: '#F4F6F8', borderBottom: '1px solid #E0E0E0' }}>
                  <Typography component="h2" ref={headingRef} tabIndex={-1} sx={{ fontSize: 15, fontWeight: 600, mb: 0.25, outline: 'none' }}>
                    Phase {String(phase.no).padStart(2, '0')} · {phase.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    {phase.group} · {phase.section} of <code>COTS_Export_End_to_End_Workflow_v2.3</code>
                    {phase.mockupPhaseId && (
                      <> · the Export mock-up’s own sixteen-phase model still calls it <b>{phase.mockupPhaseId}</b></>
                    )}
                    .
                  </Typography>

                  {!phase.ownerConfirmed && (
                    <Alert severity="warning" sx={{ mb: 1.5 }}>
                      <AlertTitle sx={{ fontSize: 13 }}>This phase has no owning function</AlertTitle>
                      <Typography variant="body2">
                        The workflow assigns none. Its own figure says so in as many words — <i>every owner in this
                        part is a business confirmation</i> — so the phase is shown as unassigned rather than given a
                        plausible one. All seven of phases 01–07 are in this position.
                      </Typography>
                    </Alert>
                  )}
                  {phase.changedAtV24 && (
                    <Alert severity="success" sx={{ mb: 1.5 }}>
                      <AlertTitle sx={{ fontSize: 13 }}>What changed at mock-up v2.4</AlertTitle>
                      <Typography variant="body2">{phase.changedAtV24}</Typography>
                    </Alert>
                  )}

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: '1fr 1fr 1fr' }, gap: 1.5, alignItems: 'start' }}>
                    <Paper variant="outlined" sx={{ p: 1.75 }}>
                      <Typography component="h3" sx={{ fontSize: 13, fontWeight: 600, m: 0 }}>
                        What phase {String(phase.no).padStart(2, '0')} captures
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        {phase.section} of the workflow, in its own words. Owner: {phase.owner}.
                      </Typography>
                      <Stack component="ul" role="list" spacing={0.5} sx={{ listStyle: 'none', m: 0, p: 0 }}>
                        {phase.fields.map((f, i) => {
                          const src = fieldSource(f);
                          const note = fieldNote(f);
                          return (
                            <Box component="li" key={i} sx={{ pl: 1.25, position: 'relative' }}>
                              <Box component="span" aria-hidden sx={{ position: 'absolute', left: 0, fontSize: 12.5 }}>·</Box>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12.5, lineHeight: 1.4, display: 'inline' }}>
                                {fieldText(f)}
                              </Typography>
                              {src !== 'workflow' && (
                                <>
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    component="span"
                                    label={src === 'mockup' ? 'from the mock-up' : 'from the spreadsheet'}
                                    sx={{ height: 16, fontSize: '0.58rem', ml: 0.75, verticalAlign: 'middle' }}
                                  />
                                  {note && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic', lineHeight: 1.35, mt: 0.15 }}>
                                      {note}
                                    </Typography>
                                  )}
                                </>
                              )}
                            </Box>
                          );
                        })}
                      </Stack>

                      <Divider sx={{ my: 1.25 }} />
                      <Typography component="h3" sx={{ fontSize: 12.5, fontWeight: 600, m: 0 }}>Statuses</Typography>
                      {phase.statuses.length === 0 ? (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                          None. No status model is defined for this phase, so none is shown — and none is invented.
                        </Typography>
                      ) : (
                        <>
                          <Stack component="ul" role="list" spacing={0.3} sx={{ listStyle: 'none', m: 0, mt: 0.5, p: 0 }}>
                            {phase.statuses.map((st, i) => (
                              <Box component="li" key={i}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'inline', lineHeight: 1.4 }}>
                                  {statusText(st)}
                                </Typography>
                                {statusBasis(st) === 'proposed' && (
                                  <Chip
                                    size="small"
                                    component="span"
                                    label="proposed, not stated"
                                    sx={{ height: 16, fontSize: '0.58rem', ml: 0.75, verticalAlign: 'middle', bgcolor: TAG_COLOUR.proposed, color: '#fff' }}
                                  />
                                )}
                              </Box>
                            ))}
                          </Stack>
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                            {phase.transitionModel
                              ? 'The workflow states an ordering between the statuses it observes.'
                              : 'The workflow states no ordering between these, so no transition is asserted.'}
                          </Typography>
                        </>
                      )}
                    </Paper>

                    <CapabilityRail
                      items={phase.capabilities.map((c) => {
                        const needsShared = c.to.startsWith('/s');
                        const available = !needsShared || hasModule(id, MODULE_SHARED);
                        return {
                          code: c.code,
                          label: c.label,
                          to: c.to,
                          colour: OWNER_COLOUR[c.owner],
                          basis: c.basis,
                          available,
                          unavailableReason: available
                            ? undefined
                            : 'Shared Modules is not in this account’s module scope, so this screen would refuse. The capability is named here because the phase still uses it.',
                        };
                      })}
                      title={`Core and Shared capabilities phase ${String(phase.no).padStart(2, '0')} uses`}
                      intro="Reached where they already live. Export builds no second approval, document register, audit trail or inspection of its own."
                    />

                    <OpenItems items={phase.open} title={`Not decided on phase ${String(phase.no).padStart(2, '0')}`} previewCount={5} />
                  </Box>
                </Box>
              </Collapse>
            )}

            {/*
              The wrapper the scoped stylesheet hangs off. Every Export page renders inside it, and
              nothing outside it is touched by Export's element-level rules.
            */}
            <Box className="cots-export">
              <a className="skip-link" href="#export-main">Skip to the screen</a>
              <Box component="main" id="export-main" tabIndex={-1}>
                <ExportErrorBoundary>
                  <Outlet />
                </ExportErrorBoundary>
              </Box>
            </Box>
          </Box>
        </ToastProvider>
      </AuthProvider>
    </ExportThemeProvider>
  );
}

/**
 * Kept from Export's own shell: a page that throws says so here rather than blanking the
 * application. The Core shell and the menu stay usable, which is the point of catching it.
 */
class ExportErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled error in an Export page', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error" sx={{ maxWidth: 900 }}>
            <AlertTitle>This Export screen could not be displayed</AlertTitle>
            <Typography variant="body2" sx={{ mb: 2 }}>{this.state.error.message}</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="contained" onClick={() => this.setState({ error: null })}>Try again</Button>
              <Button size="small" component={Link} to="/export">The Export module</Button>
            </Stack>
          </Alert>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default ExportPageFrame;
