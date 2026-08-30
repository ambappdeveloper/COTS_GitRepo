import React from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, FormControlLabel, Paper, Stack, Switch, Table, TableBody,
  TableCell, TableHead, TableRow, Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import { HandOffBanner, PageBanner, PlaceholderNote, SectionBand, StatusChip, WhiteButton } from '../../components/shared';
import { CHANNELS, Channel } from '../../mockData/c5';
import { ShellFooterNote } from '../../layouts/AppShell';

/** 3.3 Channel and Priority Settings — WF-C5-03 / Steps 2 and 4 */
export const Channels: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();

  const toggleChannel = (priority: string, channel: Channel, list: 'permitted' | 'urgentOnly') => {
    const p = s.channelPolicy.find((x) => x.priority === priority);
    if (!p) return;
    const current = p[list];
    const next = current.includes(channel) ? current.filter((c) => c !== channel) : [...current, channel];
    s.saveChannelPolicy(p.priority, { [list]: next } as any);
  };

  return (
    <>
      <PageBanner
        title="Channels and quiet hours"
        breadcrumb={['Global', 'C5 Notifications and Alerts', 'Channels and quiet hours']}
        subtitle="WF-C5-03 / Steps 2 and 4 — SMS and messaging carry cost, so channels are permitted per class and some are reserved for urgent items"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c5/rules')}>Notification rules</WhiteButton>
            <WhiteButton onClick={() => navigate('/c5/deliveries')}>Delivery log</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Paper variant="outlined">
          <SectionBand>Permitted channels per priority class — Step 2</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Priority class</TableCell>
                {CHANNELS.map((c) => <TableCell key={c} sx={{ fontSize: 12 }} align="center">{c}</TableCell>)}
                <TableCell sx={{ fontSize: 12 }}>Reserved for urgent items</TableCell>
                <TableCell sx={{ fontSize: 12 }}>User may re-channel</TableCell>
                <TableCell sx={{ fontSize: 12 }}>User may disable</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Daily digest</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {s.channelPolicy.map((p) => (
                <TableRow key={p.priority}>
                  <TableCell sx={{ fontSize: 12.5, fontWeight: 500 }}>{p.priority}</TableCell>
                  {CHANNELS.map((c) => (
                    <TableCell key={c} align="center">
                      <Checkbox
                        size="small"
                        checked={p.permitted.includes(c)}
                        onChange={() => toggleChannel(p.priority, c, 'permitted')}
                      />
                    </TableCell>
                  ))}
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {CHANNELS.filter((c) => c === 'SMS' || c === 'Messaging').map((c) => (
                        <FormControlLabel
                          key={c}
                          control={
                            <Checkbox size="small" checked={p.urgentOnly.includes(c)}
                                      onChange={() => toggleChannel(p.priority, c, 'urgentOnly')} />
                          }
                          label={<Typography sx={{ fontSize: 11.5 }}>{c}</Typography>}
                        />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Switch size="small" checked={p.userMayRechannel}
                            onChange={(e) => s.saveChannelPolicy(p.priority, { userMayRechannel: e.target.checked })} />
                  </TableCell>
                  <TableCell>
                    <Switch size="small" checked={p.userMayDisable}
                            onChange={(e) => s.saveChannelPolicy(p.priority, { userMayDisable: e.target.checked })} />
                  </TableCell>
                  <TableCell>
                    <Switch size="small" checked={p.digestAvailable}
                            onChange={(e) => s.saveChannelPolicy(p.priority, { digestAvailable: e.target.checked })} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
              A channel reserved for urgent items is dropped from any rule of a lower class, and the delivery log
              records the reason on the row rather than leaving the recipient wondering. An operational or approval
              notification can be re-channelled but never disabled — WF-C5-03 / Step 3.
            </Typography>
            <PlaceholderNote>
              Business confirmation required: selection and commercial approval of the SMS and messaging providers,
              which the project plan notes require separate confirmation of cost, licensing and feasibility
              (WF-C5-03 / Step 2). The prototype names no provider.
            </PlaceholderNote>
            <PlaceholderNote kind="consistency">
              Integration consistency issue — urgent-flag channels. C4 / WF-C4-03 / Step 4 places "which channels the
              urgent flag activates" in route configuration, while this screen holds channel permission and
              urgent-channel reservation in notification administration (C5 / WF-C5-03 / Step 2). Both screens show
              the setting and both carry this flag; today a route could permit a channel that this screen reserves,
              and nothing resolves the disagreement. A decision is needed before development.
            </PlaceholderNote>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ mt: 2 }}>
          <SectionBand>Quiet hours and the country working calendar — Step 4</SectionBand>
          <Box sx={{ px: 2, pt: 1.5 }}>
            <HandOffBanner
              label="DEPENDENCY"
              target="C10 / WF-C10-01 Configuring a Country"
              passed="The working calendar and the public holidays are defined once per country in C10 and read here — this screen should not hold its own copy"
              to={`/c10/countries/${s.activeCountry}`}
              goLabel="Open the country calendar"
            />
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Country</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Quiet from</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Quiet until</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Working calendar</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Position now</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Next working period</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {s.quietHours.map((q) => (
                <TableRow key={q.country}>
                  <TableCell sx={{ fontSize: 12.5 }}>{q.country}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{q.from}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{q.to}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{q.workingCalendar}</TableCell>
                  <TableCell>
                    {q.insideWorkingTime
                      ? <Chip size="small" label="Inside working time" sx={{ height: 19, fontSize: 10.5, bgcolor: '#E3F2E8', color: tokens.green }} />
                      : <StatusChip status="Held" />}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{q.nextWorkingPeriod}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ p: 2 }}>
            <Alert severity="info" sx={{ fontSize: 13, mb: 1.5 }}>
              A non-urgent message raised outside working time is <b>held until the next working period</b>; an urgent
              message is dispatched immediately regardless of quiet hours. Mozambique is outside working time in this
              prototype, so a non-urgent message to a Mozambique recipient appears on the delivery log as
              <i> Held — quiet hours</i> with the release time stated.
            </Alert>
            <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
              The same working calendars drive C04's approval service levels, so a service level and a quiet-hours
              hold never disagree about what a working day is.
            </Typography>
            <HandOffBanner target="C8 / WF-C8-01 Capturing an Audit Entry" passed="Changes to rules, templates and channels, as configuration changes and sensitive actions" />
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button size="small" variant="outlined" onClick={() => navigate('/c4/sla')}>See the C04 service-level monitor</Button>
              <Button size="small" variant="outlined" onClick={() => navigate('/c4/routes')}>See the C04 route builder's urgent setting</Button>
            </Stack>
          </Box>
        </Paper>

        <ShellFooterNote />
      </Box>
    </>
  );
};
