import React from 'react';
import {
  Alert, Box, Button, Chip, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Switch, Table,
  TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import {
  ActionBar, EmptyState, FieldGrid, HandOffBanner, PageBanner, PlaceholderNote, RecordHeader,
  SectionBand, StatusChip, WhiteButton
} from '../../components/shared';
import { Direction, Trigger, rotationDue } from '../../mockData/c12';
import { APPROVER_REGISTER } from '../../mockData/c4';
import { ShellFooterNote } from '../../layouts/AppShell';

const OWNERS = Array.from(new Set(APPROVER_REGISTER.map((a) => a.user)));
const DIRECTIONS: Direction[] = ['Inbound', 'Outbound', 'Bidirectional'];
const TRIGGERS: Trigger[] = ['Real time', 'Scheduled', 'Business event'];

const confirmColour = (c: string) => (c === 'Agreed' ? tokens.green : tokens.amber);

/** 1.1 Interface Registry — WF-C12-01 / Step 1 */
export const InterfaceRegistry: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();

  return (
    <>
      <PageBanner
        title="Interface registry"
        breadcrumb={['Global', 'C12 Integration Layer', 'Interfaces']}
        subtitle="WF-C12-01 / Step 1 — direction, trigger, method, endpoints per environment, data scope, owners and retry policy"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c12/scope')}>Interfaces in scope</WhiteButton>
            <WhiteButton onClick={() => navigate('/c12/exchanges')}>Exchange log</WhiteButton>
            <WhiteButton onClick={() => navigate('/c12/health')}>Interface health</WhiteButton>
          </Stack>
        }
      />
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
          This is the twelfth and last module, and it is where two deferred questions come due. C09 built an exchange log
          and an error queue, said C12 describes the same things, and disclaimed ownership. <b>There is one exchange log
          and one error queue in this prototype, read from both modules</b> — C12 does not build a second. The ownership
          decision is stated on the error queue with what each reading costs, and it remains the client's.
        </Alert>

        <PlaceholderNote>{s.integrationNotes.credential}</PlaceholderNote>

        <Paper variant="outlined" sx={{ mb: 2, mt: 2 }}>
          <SectionBand>Registered interfaces — the nine attributes Step 1 requires</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Interface</TableCell>
                <TableCell sx={{ fontSize: 12 }}>External system</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Direction</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Trigger</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Owners</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Retry policy</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Credential</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Fallback</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Confirmation</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Active</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {s.interfaces.map((i) => {
                const rot = s.rotationStateOf(i.id);
                return (
                  <TableRow key={i.id} hover>
                    <TableCell>
                      <Button size="small" sx={{ fontSize: 12, textAlign: 'left' }}
                              onClick={() => navigate(`/c12/interfaces/${i.id}`)}>
                        {i.id} {i.name}
                      </Button>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{i.externalSystem}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {i.direction}
                      {i.directionLocked && (
                        <Chip size="small" label="locked" sx={{ ml: 0.5, height: 17, fontSize: 10, bgcolor: `${tokens.amber}1A`, color: tokens.amber }} />
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {i.trigger}
                      <Typography sx={{ fontSize: 11, color: tokens.textSecondary }}>{i.scheduleOrEvent}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>
                      {i.businessOwner}
                      <Typography sx={{ fontSize: 11, color: tokens.textSecondary }}>{i.technicalOwner} (technical)</Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>
                      {i.retryAttempts} × {i.retryIntervalSeconds}s {i.backoff.toLowerCase()}
                      <Typography sx={{ fontSize: 11, color: tokens.textSecondary }}>{i.onExhaustion}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>
                      <span style={{ fontFamily: 'monospace' }}>{i.credentialRef}</span>
                      <Typography sx={{ fontSize: 11, color: rot.overdue ? tokens.red : tokens.textSecondary }}>
                        rotated {i.lastRotated}{rot.overdue ? ` · overdue by ${rot.daysOver} days` : ` · next ${rot.nextDue}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {i.fallback
                        ? <Chip size="small" label="Documented" sx={{ fontSize: 10.5, bgcolor: `${tokens.green}1A`, color: tokens.green }} />
                        : <Chip size="small" label="Missing" sx={{ fontSize: 10.5, bgcolor: `${tokens.red}1A`, color: tokens.red }} />}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={i.confirmation}
                            sx={{ fontSize: 10.5, bgcolor: `${confirmColour(i.confirmation)}1A`, color: confirmColour(i.confirmation) }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{i.active ? 'Yes' : 'No'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
              A credential is shown as a <b>reference and a rotation date, never a value</b>. No field anywhere in this
              module accepts or displays a secret, which is the only way to honour Step 2. Endpoints per environment are
              configuration and live in C10.
            </Typography>
          </Box>
        </Paper>

        <HandOffBanner
          label="DEPENDENCY"
          target="C10 / WF-C10-03 Configuration Change Control"
          passed="Endpoints, credentials, schedules and retry policies per environment are configuration — changing one on the definition form raises a change request rather than saving"
          to="/c10/changes"
          goLabel="Open the change register"
        />
        <ShellFooterNote />
      </Box>
    </>
  );
};

/** 1.2 Interface Definition Form + 2.2 Fallback — WF-C12-01 / Step 1, WF-C12-02 / Step 9 */
export const InterfaceDefinition: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const i = s.interfaceById(id);
  const [blocked, setBlocked] = React.useState<string | null>(null);
  const [runMode, setRunMode] = React.useState<'normal' | 'invalid response'>('normal');

  if (!i) {
    return (
      <>
        <PageBanner title="Interface" breadcrumb={['Global', 'C12 Integration Layer', 'Interface']} />
        <Box sx={{ p: 3 }}><EmptyState message="That interface is not in the registry." /></Box>
      </>
    );
  }

  const rot = s.rotationStateOf(i.id);
  const exchanges = s.exchangesFor(i.id);
  const queue = s.queueFor(i.id);

  return (
    <>
      <PageBanner
        title={`${i.id} — ${i.name}`}
        breadcrumb={['Global', 'C12 Integration Layer', 'Interfaces', i.id]}
        subtitle="WF-C12-01 / Step 1 and WF-C12-02 / Step 9 — the definition, and the fallback that must exist before activation"
        actions={
          <Stack direction="row" spacing={1}>
            <WhiteButton onClick={() => navigate('/c12/interfaces')}>All interfaces</WhiteButton>
            <WhiteButton onClick={() => navigate('/c12/exchanges')}>Exchange log</WhiteButton>
          </Stack>
        }
      />
      <RecordHeader
        name={i.externalSystem}
        status={i.active ? 'Active' : 'Draft'}
        reference={i.id}
        date={i.lastRotated}
        meta={[['Direction', i.direction], ['Trigger', i.trigger], ['Business owner', i.businessOwner], ['Confirmation', i.confirmation]]}
      />
      <Box sx={{ p: 3 }}>
        {i.confirmationNote && <PlaceholderNote>{i.confirmationNote}</PlaceholderNote>}

        <Paper variant="outlined" sx={{ mb: 2, mt: 2 }}>
          <SectionBand>Definition — WF-C12-01 / Step 1</SectionBand>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 180 }} disabled={!!i.directionLocked}>
                <InputLabel>Direction</InputLabel>
                <Select label="Direction" value={i.direction} inputProps={{ 'aria-label': 'Direction' }}
                        onChange={(e) => {
                          const r = s.saveInterface(i.id, { direction: e.target.value as Direction });
                          setBlocked(r.ok ? null : (r.why ?? null));
                        }}>
                  {DIRECTIONS.map((d) => <MenuItem key={d} value={d} sx={{ fontSize: 13 }}>{d}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Trigger</InputLabel>
                <Select label="Trigger" value={i.trigger} inputProps={{ 'aria-label': 'Trigger' }}
                        onChange={(e) => s.saveInterface(i.id, { trigger: e.target.value as Trigger })}>
                  {TRIGGERS.map((t) => <MenuItem key={t} value={t} sx={{ fontSize: 13 }}>{t}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField size="small" label="Schedule or event" value={i.scheduleOrEvent} sx={{ minWidth: 280 }}
                         onChange={(e) => s.saveInterface(i.id, { scheduleOrEvent: e.target.value })} />
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Business owner</InputLabel>
                <Select label="Business owner" value={i.businessOwner}
                        onChange={(e) => s.saveInterface(i.id, { businessOwner: e.target.value })}>
                  {OWNERS.map((o) => <MenuItem key={o} value={o} sx={{ fontSize: 13 }}>{o}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField size="small" label="Retry attempts" value={i.retryAttempts} sx={{ width: 140 }}
                         inputProps={{ 'aria-label': 'Retry attempts' }}
                         onChange={(e) => s.saveInterface(i.id, { retryAttempts: Number(e.target.value) || 1 })} />
              <TextField size="small" label="Queue threshold" value={i.queueThreshold} sx={{ width: 150 }}
                         inputProps={{ 'aria-label': 'Queue threshold' }}
                         onChange={(e) => s.saveInterface(i.id, { queueThreshold: Number(e.target.value) || 1 })} />
            </Stack>
            {i.directionLocked && (
              <Alert severity="warning" sx={{ mt: 2, fontSize: 12.5 }}>
                <b>The direction cannot be changed.</b> {i.directionLocked}
              </Alert>
            )}
            {blocked && <Alert severity="error" sx={{ mt: 2, fontSize: 12.5 }}>{blocked}</Alert>}
            <FieldGrid items={[
              ['Method', i.method],
              ['Data scope', i.dataScope],
              ['Purpose, in the workflow’s own terms', i.purpose],
              ['Technical owner', i.technicalOwner],
              ['On exhaustion', i.onExhaustion],
              ['Credential', <><span style={{ fontFamily: 'monospace' }}>{i.credentialRef}</span> · rotated {i.lastRotated} · next due {rot.nextDue}{rot.overdue ? ' · overdue' : ''}</>],
              ['Endpoints per environment', 'Held as configuration in C10 — not stored on this form'],
              ['Exercised by', i.exercisedBy ?? 'No module built so far consumes this interface']
            ]} columns={2} />
          </Box>
        </Paper>

        {/* 2.2 the fallback, which activation depends on */}
        <Paper variant="outlined" sx={{ mb: 2, borderColor: i.fallback ? tokens.border : tokens.red }}>
          <SectionBand>Fallback — WF-C12-02 / Step 9</SectionBand>
          <Box sx={{ p: 2 }}>
            {i.fallback ? (
              <FieldGrid items={[
                ['While the interface is unavailable', i.fallback.whileUnavailable],
                ['Maximum tolerable outage', i.fallback.maxOutage],
                ['Who decides to invoke it', i.fallback.invokedBy],
                ['How data is caught up', i.fallback.catchUp],
                ['Last reviewed', i.fallback.lastReviewed]
              ]} columns={1} />
            ) : (
              <Alert severity="error" sx={{ fontSize: 12.5 }}>
                <b>No fallback is documented for this interface.</b> Every registered interface carries a documented
                fallback stating what the business does if the interface is unavailable, so that operations are not halted
                by an external dependency — WF-C12-02 / Step 9. Activation is refused until one exists.
              </Alert>
            )}
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary, mt: 1.5 }}>
              The catch-up question is the part most often forgotten: what happens to the backlog when the interface
              returns. A fallback written once and never reviewed is a document, not a plan, so the review date is a field.
            </Typography>
          </Box>
        </Paper>

        {/* the prototype control that runs the six stages for real */}
        <Paper variant="outlined" sx={{ mb: 2, borderStyle: 'dashed', borderWidth: 2, borderColor: tokens.orange }}>
          <Box sx={{ px: 2, py: 1, bgcolor: `${tokens.orange}12` }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: tokens.orange }}>
              Prototype control — not a product feature
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
              Running the exchange executes the six stages of Steps 2–7 for real: it authenticates with the credential
              reference, issues a correlation reference, validates, translates codes through the live C03 mapping tables,
              writes with the source system named, and logs to C09. An unmapped code raises a real C03 exception and holds
              a real record — and creates nothing.
            </Typography>
          </Box>
          <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel>Response</InputLabel>
              <Select label="Response" value={runMode} inputProps={{ 'aria-label': 'Response' }}
                      onChange={(e) => setRunMode(e.target.value as 'normal' | 'invalid response')}>
                <MenuItem value="normal" sx={{ fontSize: 13 }}>A normal response</MenuItem>
                <MenuItem value="invalid response" sx={{ fontSize: 13 }}>An incomplete response</MenuItem>
              </Select>
            </FormControl>
            <Button variant="outlined" color="warning" onClick={() => {
              const r = s.runExchange(i.id, runMode);
              navigate(`/c12/exchanges/${r.correlation}`);
            }}>
              Run the exchange now
            </Button>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>This interface in the shared stores</SectionBand>
          <FieldGrid items={[
            ['Exchanges recorded', `${exchanges.length} — in the C09 exchange log, read here from the integration side`],
            ['Records held in the error queue', `${queue.filter((q) => q.status === 'Held').length} against a threshold of ${i.queueThreshold}`],
            ['Reconciliation', i.reconcilable
              ? <Button size="small" onClick={() => navigate('/c12/reconciliation')}>This interface carries quantities, so reconciliation applies</Button>
              : 'This interface carries no quantities or values, so no reconciliation applies — WF-C12-03 / Step 1']
          ]} columns={1} />
        </Paper>

        <ActionBar
          left={<Button variant="outlined" onClick={() => navigate('/c12/interfaces')}>All interfaces</Button>}
          right={
            !i.active
              ? (
                <Button variant="contained" onClick={() => {
                  const r = s.activateInterface(i.id);
                  setBlocked(r.ok ? null : (r.why ?? null));
                }}>
                  Activate the interface
                </Button>
              )
              : <Chip label="Active" sx={{ fontSize: 12 }} />
          }
        />
        <ShellFooterNote />
      </Box>
    </>
  );
};

/** 2.1 Interfaces in Scope — WF-C12-02 / Steps 1–8 */
export const InterfacesInScope: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();

  return (
    <>
      <PageBanner
        title="Interfaces in scope"
        breadcrumb={['Global', 'C12 Integration Layer', 'Interfaces in scope']}
        subtitle="WF-C12-02 / Steps 1–8 — the seven external connections the workflow names, each with its confirmation state"
        actions={<WhiteButton onClick={() => navigate('/c12/interfaces')}>Interface registry</WhiteButton>}
      />
      <Box sx={{ p: 3 }}>
        <PlaceholderNote>{s.integrationNotes.scope}</PlaceholderNote>

        <Alert severity="info" sx={{ my: 2, fontSize: 12.5 }}>
          C12 carries more unconfirmed business detail than any other module, and that is itself the finding: the
          integration layer is where the project's external dependencies are, and most of them are not yet settled. Four
          of the eight rows have no confirmed commercial position, and <b>no vendor is named on any of them</b>.
        </Alert>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>What each interface is for, and where it stands</SectionBand>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12 }}>Interface</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Direction and trigger</TableCell>
                <TableCell sx={{ fontSize: 12 }}>What it is for</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Already exercised by</TableCell>
                <TableCell sx={{ fontSize: 12 }}>Confirmation state</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {s.interfaces.map((i) => (
                <TableRow key={i.id} hover>
                  <TableCell sx={{ fontSize: 12.5 }}>
                    <Button size="small" sx={{ fontSize: 12, textAlign: 'left' }}
                            onClick={() => navigate(`/c12/interfaces/${i.id}`)}>
                      {i.name}
                    </Button>
                    <Typography sx={{ fontSize: 11, color: tokens.textSecondary }}>{i.externalSystem}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    {i.direction} · {i.trigger}
                    <Typography sx={{ fontSize: 11, color: tokens.textSecondary }}>{i.scheduleOrEvent}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{i.purpose}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    {i.exercisedBy ?? (
                      <span style={{ color: tokens.amber }}>
                        No module built so far consumes it — a registry that looked uniformly ready would misrepresent the
                        state of the project
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={i.confirmation}
                          sx={{ fontSize: 10.5, bgcolor: `${confirmColour(i.confirmation)}1A`, color: confirmColour(i.confirmation) }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        <PlaceholderNote>{s.integrationNotes.sap}</PlaceholderNote>
        <PlaceholderNote>{s.integrationNotes.odoo}</PlaceholderNote>
        <PlaceholderNote>{s.integrationNotes.commercial}</PlaceholderNote>

        <Paper variant="outlined" sx={{ mb: 2 }}>
          <SectionBand>Where each interface already appears in the prototype</SectionBand>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              <Button size="small" variant="outlined" onClick={() => navigate('/c1/ad-mapping')}>C01 — Active Directory group mapping</Button>
              <Button size="small" variant="outlined" onClick={() => navigate('/c3/mapping')}>C03 — SAP and Odoo mapping tables</Button>
              <Button size="small" variant="outlined" onClick={() => navigate('/c5/deliveries')}>C05 — notification providers</Button>
              <Button size="small" variant="outlined" onClick={() => navigate('/c7/register')}>C07 — AI extraction</Button>
              <Button size="small" variant="outlined" onClick={() => navigate('/c9/exchanges')}>C09 — the exchange log</Button>
            </Stack>
          </Box>
        </Paper>

        <HandOffBanner
          label="HAND-OFF"
          target="C1 / WF-C1-01 Login and Session Establishment"
          passed="Real-time authentication at login and scheduled attribute synchronisation for provisioning — the interface C01 has been using since the first module"
          to="/c1/ad-mapping"
          goLabel="Open the group mapping"
        />
        <ShellFooterNote />
      </Box>
    </>
  );
};
