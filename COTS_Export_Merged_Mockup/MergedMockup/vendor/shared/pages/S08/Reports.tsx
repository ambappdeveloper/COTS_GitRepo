import React from 'react';
import {
  Alert, Box, Button, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { BottomBar, PrototypeNote, SectionCard, TraceNote } from '../../components/shared';
import { useStore } from '../../state/store';
import { useS08 } from '../../state/s08store';
import { useS10 } from '../../state/s10store';
import {
  TODAY, daysBetween, isOverdue, openItems, overdueBy, progressOf, timelinePosition,
} from '../../mockData/s08';
import { COLORS } from '../../theme';
import { ProposalBanner, statusColour } from './Portfolio';

export default function PortfolioReports() {
  const { country } = useStore();
  const { projects } = useS08();
  const { people } = useS10();

  const person = (id: string) => people.find((p) => p.id === id)?.name ?? '—';
  const active = projects.filter((p) => p.status !== 'Completed');
  const completed = projects.filter((p) => p.status === 'Completed');

  // every overdue item, flattened — reported by project AND by assignee
  const overdue = projects.flatMap((p) => [
    ...p.tasks.filter((t) => isOverdue(t.end, t.status)).map((t) => ({
      project: p.id, projectName: p.name, kind: 'Task', description: t.description,
      owner: person(t.assigneeId), due: t.end, days: overdueBy(t.end),
    })),
    ...p.deliverables.filter((d) => isOverdue(d.targetDate, d.status)).map((d) => ({
      project: p.id, projectName: p.name, kind: 'Deliverable', description: d.description,
      owner: person(p.ownerId), due: d.targetDate, days: overdueBy(d.targetDate),
    })),
  ]).sort((a, b) => b.days - a.days);

  const byAssignee = Array.from(new Set(overdue.map((o) => o.owner))).map((owner) => ({
    owner,
    items: overdue.filter((o) => o.owner === owner),
    projects: Array.from(new Set(overdue.filter((o) => o.owner === owner).map((o) => o.project))).length,
  })).sort((a, b) => b.items.length - a.items.length);

  const countries = Array.from(new Set(projects.map((p) => p.country)));

  return (
    <AppShell title="Portfolio reporting" breadcrumb={[country, 'Shared Modules', 'Projects', 'Reporting']} showSeason={false}>
      <ProposalBanner />

      <TraceNote workflow="WF-S08-03 / Step 6 and WF-S08-04 / Steps 3–4 — active projects by country with status, timeline position and open items; overdue tasks and deliverables by project and assignee; completed projects with duration against plan" />

      {/* ---------------------------------------------- active by country */}
      <SectionCard title="S08-SC-13 · Active projects by country">
        {countries.map((c) => {
          const rows = active.filter((p) => p.country === c);
          if (rows.length === 0) return null;
          return (
            <Box key={c} sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary }}>{c.toUpperCase()}</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Project', 'Type', 'Owner', 'Status', 'Timeline position', 'Progress (derived)', 'Open items'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((p) => {
                    const g = progressOf(p);
                    const t = timelinePosition(p);
                    const o = openItems(p);
                    const od = o.overdueTasks.length + o.overdueDeliverables.length;
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Link to={`/s08/project/${p.id}`} style={{ color: COLORS.primary, fontWeight: 600 }}>{p.id} · {p.name}</Link>
                        </TableCell>
                        <TableCell>{p.type}</TableCell>
                        <TableCell>{person(p.ownerId)}</TableCell>
                        <TableCell>
                          <Chip size="small" label={p.status} sx={{ height: 19, color: '#fff', bgcolor: statusColour(p.status), fontWeight: 600 }} />
                        </TableCell>
                        <TableCell>
                          {t.elapsed} of {t.planned} days ({t.percent} %)
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: t.percent > g.percent + 10 ? COLORS.attention : undefined }}>
                          {g.percent} %
                          <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, fontWeight: 400 }}>
                            {g.complete} of {g.total} items
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {o.tasks.length + o.deliverables.length} open
                          {od > 0 && (
                            <Chip size="small" label={`${od} overdue`} sx={{ ml: 0.5, height: 18, fontSize: '0.65rem', bgcolor: '#FDECEA', color: COLORS.bad, fontWeight: 700 }} />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          );
        })}
        <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary }}>
          Progress carries its basis on every row, and is shown against the timeline position, so a project behind
          plan is visible without arithmetic.
        </Typography>
      </SectionCard>

      {/* ---------------------------------------------- overdue by project */}
      <SectionCard title="Overdue tasks and deliverables by project">
        {overdue.length === 0 ? (
          <Alert severity="success" sx={{ fontSize: '0.82rem' }}>Nothing is overdue.</Alert>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Project', 'Item', 'Description', 'Owner', 'Due', 'Days overdue'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {overdue.map((o, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Link to={`/s08/project/${o.project}`} style={{ color: COLORS.primary }}>{o.project}</Link>
                  </TableCell>
                  <TableCell>{o.kind}</TableCell>
                  <TableCell>{o.description}</TableCell>
                  <TableCell>{o.owner}</TableCell>
                  <TableCell>{o.due}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: COLORS.bad }}>{o.days}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      {/* ---------------------------------------------- overdue by assignee */}
      <SectionCard title="Overdue by assignee — the view no single project screen gives you">
        {byAssignee.length === 0 ? (
          <Alert severity="success" sx={{ fontSize: '0.82rem' }}>Nothing is overdue.</Alert>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Assignee', 'Overdue items', 'Across projects', 'Oldest overdue', 'Items'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {byAssignee.map((a) => (
                  <TableRow key={a.owner}>
                    <TableCell sx={{ fontWeight: 600 }}>{a.owner}</TableCell>
                    <TableCell align="right">{a.items.length}</TableCell>
                    <TableCell align="right">{a.projects}</TableCell>
                    <TableCell align="right">{Math.max(...a.items.map((i) => i.days))} days</TableCell>
                    <TableCell>
                      {a.items.map((i) => (
                        <Typography key={i.description} variant="caption" sx={{ display: 'block', color: COLORS.textSecondary }}>
                          · {i.project} — {i.description}
                        </Typography>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
              The overdue report is <b>by assignee as well as by project</b>, because a person carrying overdue items
              across several projects is invisible on any single project screen — and that person is usually the
              finding.
            </Alert>
          </>
        )}
      </SectionCard>

      {/* ---------------------------------------------- completed */}
      <SectionCard title="Completed projects with duration against plan">
        {completed.length === 0 ? (
          <Alert severity="info" sx={{ fontSize: '0.82rem' }}>No project has been completed yet.</Alert>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Project', 'Country', 'Type', 'Planned', 'Actual', 'Planned days', 'Actual days', 'Variance'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {completed.map((p) => {
                  const planned = daysBetween(p.start, p.plannedEnd);
                  const actual = daysBetween(p.start, p.actualEnd!);
                  const variance = actual - planned;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link to={`/s08/project/${p.id}`} style={{ color: COLORS.primary, fontWeight: 600 }}>{p.id} · {p.name}</Link>
                      </TableCell>
                      <TableCell>{p.country}</TableCell>
                      <TableCell>{p.type}</TableCell>
                      <TableCell>{p.plannedEnd}</TableCell>
                      <TableCell>{p.actualEnd}</TableCell>
                      <TableCell align="right">{planned}</TableCell>
                      <TableCell align="right">{actual}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: variance > 0 ? COLORS.attention : COLORS.good }}>
                        {variance > 0 ? `+${variance} days` : `${variance} days`}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mt: 0.5 }}>
              Reported by country, <i>so that delivery performance is visible per country</i> — the source's stated
              reason for this report.
            </Typography>
          </>
        )}
      </SectionCard>

      <PrototypeNote>
        All three are Core C11 report definitions in the built system; here they are computed from the prototype's mock
        data as at {TODAY}, so a status change on a task moves these figures immediately.
      </PrototypeNote>

      <BottomBar>
        <Button variant="outlined" component={Link} to="/s08">Back to the portfolio</Button>
      </BottomBar>
    </AppShell>
  );
}
