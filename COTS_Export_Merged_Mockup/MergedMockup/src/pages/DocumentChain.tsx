/**
 * The export document chain, as a screen.
 *
 * This is the integrated workflow `COTS_Export_Documentation_Workflow_Integrated` made clickable:
 * the seven phases of the export document chain, and at each one the Core or Shared capability that
 * provides what the export review says is missing — with a link to the screen that provides it.
 *
 * It is not a second Export screen. Every export step links into the Export prototype; every
 * injection links into the Core or Shared screen that already exists.
 */

import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link } from 'react-router-dom';
import {
  ALERTS,
  CHAIN,
  CUSTODY,
  OPEN_POINTS,
  REFUSALS,
  REQUIREMENT_LIST,
  STATES,
  type ChainPhase,
} from '../integration/documentChain';
import { OWNER_COLOUR, OWNER_LABEL, SPINE } from '../integration/recordMap';

function PhaseCard({ p }: { p: ChainPhase }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: 'wrap' }}>
        <Chip size="small" label={p.phase} sx={{ height: 20, fontWeight: 700, bgcolor: OWNER_COLOUR.export, color: '#fff' }} />
        <Typography sx={{ fontWeight: 600 }}>{p.title}</Typography>
        <Chip size="small" variant="outlined" label={p.wf} sx={{ height: 20 }} />
        {/*
          v1.3 — the same phase in workflow v2.3's twenty-three-phase numbering, so a reviewer who has
          only seen the current process can find their place. The P-number stays beside it because it
          is what the source these rows were written from uses, and v2.3 §5 carries the mapping.

          Rendered as wrapping text rather than a Chip: MUI chips are `nowrap` with an ellipsis, and
          the two longest values here are 68 and 78 characters, so every one of them was truncated at
          every width with the full text available only on hover.
        */}
        <Typography variant="caption" color="text.secondary" sx={{ flexBasis: { xs: '100%', md: 'auto' } }}>
          now {p.workflowPhase}
        </Typography>
        {p.target && <Chip size="small" variant="outlined" label={`target ${p.target}`} sx={{ height: 20 }} />}
        <Box sx={{ flex: 1 }} />
        {p.exportTo && (
          <Button size="small" variant="outlined" component={Link} to={p.exportTo}>
            Open the Export screen
          </Button>
        )}
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {p.exportStep}
      </Typography>

      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
        Injected — the module that already provides this
      </Typography>
      <Stack spacing={0.75}>
        {p.injections.map((i) => (
          <Stack
            key={i.code + i.what}
            direction="row"
            spacing={1}
            alignItems="flex-start"
            sx={{ borderLeft: `3px solid ${OWNER_COLOUR[i.owner]}`, pl: 1, py: 0.25 }}
          >
            <Chip
              size="small"
              label={i.code}
              sx={{ bgcolor: OWNER_COLOUR[i.owner], color: '#fff', height: 19, fontSize: '0.68rem', minWidth: 44 }}
            />
            <Typography variant="body2" sx={{ flex: 1 }}>{i.what}</Typography>
            <Button size="small" component={Link} to={i.to} sx={{ flexShrink: 0, fontSize: '0.72rem' }}>
              Open
            </Button>
          </Stack>
        ))}
      </Stack>

      {p.rule && (
        <Alert severity="success" icon={false} sx={{ mt: 1.5, py: 0.25 }}>
          <Typography variant="caption"><b>Rule enforced.</b> {p.rule}</Typography>
        </Alert>
      )}
    </Paper>
  );
}

export default function DocumentChain() {
  const [tab, setTab] = React.useState(0);

  return (
    <Box sx={{ p: 3, bgcolor: '#F4F6F8', minHeight: '100%' }}>
      <Typography sx={{ fontSize: 20, fontWeight: 500 }}>Export document chain — Core and Shared injected</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 980, mt: 0.5 }}>
        The document chain is the commercial critical path of the export process: the goal of the whole journey is a
        document arriving before a vessel does. The export review's conclusion is that it needs <b>enforcement, not
        redesign</b> — and most of that enforcement is Core and Shared capability that already exists. This screen is
        that workflow made clickable, on {SPINE.exportContractNo}.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, my: 2, overflowX: 'auto' }}>
        <Stepper activeStep={-1} alternativeLabel sx={{ minWidth: 820 }}>
          {CHAIN.map((p) => (
            <Step key={p.phase}>
              <StepLabel optional={<Typography variant="caption" color="text.secondary">{p.wf}</Typography>}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>{p.phase} · {p.title}</Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable" scrollButtons="auto">
        <Tab label="The chain, phase by phase" />
        <Tab label="The sixteen documents" />
        <Tab label="States and refusals" />
        <Tab label="Custody" />
        <Tab label="Alerts" />
      </Tabs>

      {tab === 0 && (
        <>
          {CHAIN.map((p) => <PhaseCard key={p.phase} p={p} />)}
          <Alert severity="info" sx={{ maxWidth: 1000 }}>
            <AlertTitle>What the injection changes</AlertTitle>
            Seven of the nine rules the export review lists as advisory — messages that print and then let the save
            proceed — become blocking without any new export logic, because the module that owns the data owns the
            refusal.
          </Alert>
        </>
      )}

      {tab === 1 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            One canonical list, set once on the purchase contract and inherited by every shipment under it. In the
            integrated design the sixteen are a <b>governed C03 domain</b>, and which of them apply is <b>C10 country
            configuration</b> — so a document that does not apply is marked <i>not applicable</i> rather than left
            pending.
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['#', 'Document', 'Applies', 'Where it is governed'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {REQUIREMENT_LIST.map((d) => (
                <TableRow key={d.n} hover>
                  <TableCell>{d.n}</TableCell>
                  <TableCell>{d.doc}</TableCell>
                  <TableCell>
                    {d.conditional ? (
                      <Chip size="small" variant="outlined" label={`by ${d.conditional}`} sx={{ height: 20 }} />
                    ) : (
                      <Chip size="small" label="always" sx={{ height: 20 }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="small" component={Link} to={d.conditional ? '/c10/countries/SD/steps' : '/c3/domains'}>
                      {d.conditional ? 'C10 country steps' : 'C03 master data'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <i>Business confirmation required:</i> the purchase contract carries fifteen checkboxes and the shipping
            instruction repeats them and adds the SSMO certificate. One list must be adopted before the C03 domain can
            be populated.
          </Alert>
        </Paper>
      )}

      {tab === 2 && (
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>One state model for all sixteen document types</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>State</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Meaning</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {STATES.map((s) => (
                  <TableRow key={s.state}>
                    <TableCell><code>{s.state}</code></TableCell>
                    <TableCell>{s.meaning}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>The four moves the proposed process refuses</Typography>
            <Stack spacing={0.5}>
              {REFUSALS.map((r) => (
                <Stack key={r} direction="row" spacing={1} alignItems="center">
                  <BlockIcon sx={{ fontSize: 16, color: '#B3261E' }} />
                  <Typography variant="body2">{r}</Typography>
                </Stack>
              ))}
            </Stack>
            <Alert severity="info" sx={{ mt: 2 }}>
              With <b>C07</b> holding the versions and <b>C08</b> holding the transitions, state ordering is not fixed
              by a validation rule at all: the original is a version of a record that already has a draft, and a version
              cannot precede the version it supersedes.
              <Box sx={{ mt: 1 }}>
                <Button size="small" variant="outlined" component={Link} to="/c7/register">Open the C07 register</Button>
                <Button size="small" component={Link} to="/c8/search" sx={{ ml: 1 }}>Open the C08 audit trail</Button>
              </Box>
            </Alert>
          </Paper>
        </Stack>
      )}

      {tab === 3 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Export documents change physical hands repeatedly, and each hand-off is a point where a shipment can stall
            invisibly. Custody is unrecorded on roughly 45 % of packs at OPU and 41 % at PZU — not because the form is
            hard, but because the tick is optional.
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Hand-off', 'From → to', 'Recorded today', 'Injected'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {CUSTODY.map((c, i) => (
                <TableRow key={i} hover>
                  <TableCell>{c.handoff}</TableCell>
                  <TableCell>{c.from}</TableCell>
                  <TableCell><Typography variant="caption">{c.recordedToday}</Typography></TableCell>
                  <TableCell>{c.injected}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {tab === 4 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            What exists today is a set of e-mail workflows behind status columns. <b>They fire on a change; none of them
            fires on an absence</b> — which is exactly what a late document is. All four document alerts are C05 rules,
            each raising a C02 task and publishing through C11.
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Alert', 'Source of the condition', 'Wired as', ''].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {ALERTS.map((a) => (
                <TableRow key={a.alert} hover>
                  <TableCell>{a.alert}</TableCell>
                  <TableCell><Typography variant="caption">{a.source}</Typography></TableCell>
                  <TableCell>{a.wired}</TableCell>
                  <TableCell align="right">
                    <Button size="small" component={Link} to={a.to}>Open</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Divider sx={{ my: 3 }} />

      <Typography sx={{ fontWeight: 600, mb: 1 }}>Open points</Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 2, maxWidth: 1000 }}>
        <Stack spacing={0.5}>
          {OPEN_POINTS.map((o) => (
            <Typography key={o} variant="body2" color="text.secondary">· {o}</Typography>
          ))}
        </Stack>
      </Paper>

      <Stack direction="row" spacing={1}>
        <Button component={Link} to="/journey" endIcon={<ArrowForwardIcon />}>The integrated journey map</Button>
        <Button component={Link} to="/export/documents">Export — documents and charges</Button>
        <Chip
          size="small"
          label={`${OWNER_LABEL.core} · ${OWNER_LABEL.shared} · ${OWNER_LABEL.export}`}
          sx={{ ml: 'auto', height: 24 }}
        />
      </Stack>
    </Box>
  );
}
