/**
 * The Export module landing page — v1.3.
 *
 * WHY THIS SCREEN IS NEW
 * ---------------------
 * Until v1.2 the Export tile on the Core module screen went straight into the Export springboard
 * inside a frame, and the only way to see the Export process as a process was the journey map, which
 * is organised by integrated workflow rather than by phase. With workflow v2.3 at twenty-three
 * phases that is no longer enough: a reviewer opening Export needs to see where the twenty-three
 * phases are, in order, and which of them they are about to enter.
 *
 * So the Export tile now lands here, and this screen is the module's own front door: the phases in
 * business sequence, grouped into six sections, each opening the Export screen that serves it.
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It states no progress and no status. Nothing in this integrated layer knows how far a real
 * shipment has got — the Export application holds that, and the phases whose owner the workflow
 * leaves unassigned are shown as unassigned rather than given a plausible function. The counts on
 * this page are counts of *unresolved questions*, which is a fact about the specification, not a
 * fact about a shipment.
 */

import React from 'react';
import { Alert, AlertTitle, Box, Button, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import {
  CROSS_CUTTING,
  EXPORT_PHASES,
  PHASE_SECTIONS,
  TOTAL_PHASES,
  PROCESS_LEVEL_OPEN,
  allOpenItems,
  phasesInSection,
  sectionRange,
} from '../integration/exportProcess';
import { EXPORT_CONTRIBUTION } from '../integration/exportTarget';
import { OWNER_COLOUR } from '../integration/recordMap';
import { SectionNav, type SectionNavSection } from '../components/SectionNav';
import { OpenItems } from '../components/OpenItems';
import { CORE_APP_BAR_HEIGHT, sectionColour } from '../components/tokens';

export default function ExportModule() {
  const open = allOpenItems();
  const unassigned = EXPORT_PHASES.filter((p) => !p.ownerConfirmed);
  const changed = EXPORT_PHASES.filter((p) => p.changedAtV24);

  const sections: SectionNavSection[] = PHASE_SECTIONS.map((s, i) => ({
    section: `${s.section} · phases ${sectionRange(s.section)}`,
    note: s.note,
    colour: sectionColour(i),
    items: phasesInSection(s.section).map((p) => ({
      key: p.key,
      label: p.name,
      to: `/export/${p.key}`,
      badge: String(p.no).padStart(2, '0'),
      hint: p.why,
      meta: p.ownerConfirmed ? p.owner : undefined,
      qualifier: p.ownerConfirmed ? undefined : 'owner to be confirmed',
    })),
  }));

  return (
    <Box sx={{ p: 3, bgcolor: '#F4F6F8', minHeight: `calc(100vh - ${CORE_APP_BAR_HEIGHT}px)` }}>
      <Typography component="h1" sx={{ fontSize: 20, fontWeight: 500 }}>
        Export — the {TOTAL_PHASES}-phase process
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 980, mt: 0.5 }}>
        The order below is <code>COTS_Export_End_to_End_Workflow_v2.3</code>, phase for phase. Each entry opens the
        screen in the Export mock-up <b>{EXPORT_CONTRIBUTION}</b> that serves that phase, inside this application’s
        shell and this session. The six headings are a grouping for navigation only — the business sequence is the
        phase number, and no phase has been moved.
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mt: 2, mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button size="small" variant="contained" component={Link} to="/export/home">
          The Export springboard
        </Button>
        <Button size="small" variant="outlined" component={Link} to="/export/dashboard">
          Operations dashboard
        </Button>
        <Button size="small" variant="outlined" component={Link} to="/export/exceptions">
          Exceptions and risks
        </Button>
        <Button size="small" variant="outlined" component={Link} to="/journey">
          Journey map — the integrated workflows
        </Button>
        <Button size="small" variant="outlined" component={Link} to="/document-chain">
          The document chain
        </Button>
      </Stack>

      {/* What a reviewer should know before clicking anything, and no more than that. */}
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <Alert severity="warning" sx={{ flex: 1 }}>
          <AlertTitle sx={{ fontSize: 13.5 }}>
            {open.length} unresolved questions are carried onto the phases they belong to
          </AlertTitle>
          <Typography variant="body2">
            Each is tagged as the workflow tags it — <b>OPEN</b>, <b>ASSUMPTION</b>, <b>PROPOSED</b> or{' '}
            <b>AS-IS</b> — and none of them has been turned into behaviour on a screen. The whole of §14 is
            outstanding: not one of the twenty-two decisions can be answered from the documents.
          </Typography>
        </Alert>
        <Alert severity="info" sx={{ flex: 1 }}>
          <AlertTitle sx={{ fontSize: 13.5 }}>
            {unassigned.length} phases have no owning function
          </AlertTitle>
          <Typography variant="body2">
            Phases {unassigned[0]?.no.toString().padStart(2, '0')}–
            {unassigned[unassigned.length - 1]?.no.toString().padStart(2, '0')} — the seasonal purchase plan, the
            budget and the five Material Management Portal phases. The workflow’s own figure says it: <i>every owner
            in this part is a business confirmation</i>. They are shown as unassigned rather than given a plausible
            function.
          </Typography>
        </Alert>
      </Stack>

      <SectionNav
        sections={sections}
        headingLevel="h2"
        columns={2}
        ariaLabel={`The ${TOTAL_PHASES} phases of the export process, grouped into six sections`}
      />

      <Divider sx={{ my: 3 }} />

      {/*
        Six rows of the source's registers belong to the process rather than to any one phase, so
        carrying them only on phases would have lost them. Two of the twenty-two decisions were
        reachable nowhere in the mockup before this.
      */}
      <Typography component="h2" sx={{ fontSize: 15, fontWeight: 600, mb: 1 }}>
        Undecided about the process as a whole
      </Typography>
      <Box sx={{ maxWidth: 1100 }}>
        <OpenItems
          items={PROCESS_LEVEL_OPEN}
          title="Decisions and gaps that belong to no single phase"
          intro="Carried here because they are about the process rather than about one step of it. Each is on the phases it blocks as well, where it blocks one."
        />
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography component="h2" sx={{ fontSize: 15, fontWeight: 600 }}>
        Screens that serve the whole process
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 900, mt: 0.5, mb: 1.5 }}>
        These belong to no single phase, so they are held apart from the twenty-three rather than given a phase
        number they do not have.
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 1 }}>
        {CROSS_CUTTING.map((c) => (
          <Paper
            key={c.key}
            variant="outlined"
            component={Link}
            to={`/export/${c.key}`}
            sx={{
              p: 1.5,
              textDecoration: 'none',
              color: 'text.primary',
              borderLeft: `3px solid ${OWNER_COLOUR.export}`,
              display: 'block',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' },
              '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
            }}
          >
            <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{c.label}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
              {c.why}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Divider sx={{ my: 3 }} />

      {/*
        The two places the sources disagree with each other. Both are recorded here rather than
        settled, because settling either one is a business decision and not a mockup's to take.
      */}
      <Typography component="h2" sx={{ fontSize: 15, fontWeight: 600, mb: 1 }}>
        Where the sources disagree
      </Typography>
      <Stack spacing={1.5} sx={{ maxWidth: 1100 }}>
        <Alert severity="info">
          <AlertTitle sx={{ fontSize: 13.5 }}>
            The Export mock-up’s own phase model is still the sixteen phases of workflow v2.0
          </AlertTitle>
          <Typography variant="body2">
            <code>export-process-mockup/src/domain/workflow.ts</code> holds <code>WF01</code>…<code>WF16</code>, and
            its process-map screen is captioned “the sixteen phases”. Workflow v2.3 has twenty-three. The mapping is
            exact and additive — v2.0’s phase <i>n</i> is v2.3’s phase <i>n</i> + 7 — and this page carries it as a
            cross-reference. Nothing in the Export contribution has been changed to make this page work.
          </Typography>
        </Alert>
        <Alert severity="success">
          <AlertTitle sx={{ fontSize: 13.5 }}>
            Workflow v2.3 §16.1 says phases 01 and 02 have no screen. They do now.
          </AlertTitle>
          <Typography variant="body2">
            v2.3 was written on 26 August 2026. Mock-up v2.1 built the seasonal purchase plan, v2.2 rebuilt it to the
            shape of <code>Export Plan V1.xlsx</code>, v2.3 gave the budget its first stated rules and v2.4 reshaped
            funds and the purchase agreement. The workflow governs behaviour and the mock-up governs presentation, so
            the screens are recorded as present and that statement is marked superseded rather than contradicted in
            silence. {changed.length} phases carry a note about what changed at v2.4.
          </Typography>
        </Alert>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3, maxWidth: 1000 }}>
        Export screens are reused in place, not rebuilt: the Export mock-up {EXPORT_CONTRIBUTION} is compiled into
        this application from its own sources, the same way Core and Shared are, and its pages render inside this
        shell at their own addresses. There is one session and one menu, because there is one application. The
        integration layer adds the phase sequence, the position in it and the links to the Core and Shared
        capabilities each phase uses — and changes no file inside the Export contribution.
      </Typography>
    </Box>
  );
}
