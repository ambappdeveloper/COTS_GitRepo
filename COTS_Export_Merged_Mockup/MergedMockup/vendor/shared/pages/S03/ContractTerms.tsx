import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Radio,
  RadioGroup, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, IconButton,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import {
  BottomBar, HandOffBanner, PrototypeNote, ReadOnlyField, SectionCard, StatusChip, TraceNote, RequiredLabel,
  FieldGrid,
} from '../../components/shared';
import { useStore } from '../../state/store';
import { useS03 } from '../../state/s03store';
import { COLORS } from '../../theme';

export default function ContractTerms() {
  const { country, say } = useStore();
  const { contracts, updateContract } = useS03();
  const [sel, setSel] = React.useState(contracts[0]?.contract ?? '');
  const [tagOpen, setTagOpen] = React.useState(false);
  const [newTag, setNewTag] = React.useState({ option: '', note: '' });

  const c = contracts.find((x) => x.contract === sel);

  return (
    <AppShell title="Contract Quality Terms" breadcrumb={[country, 'Quality Assurance', 'Contract quality terms']} showSeason={false}>
      <SectionCard title="Contracts with quality terms">
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Contract', 'Buyer', 'Commodity', 'Alert raised', 'Quality review', 'Tags', ''].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {contracts.map((x) => (
              <TableRow key={x.contract} hover selected={x.contract === sel}>
                <TableCell sx={{ fontWeight: 600, color: COLORS.primary }}>{x.contract}</TableCell>
                <TableCell>{x.buyer}</TableCell>
                <TableCell>{x.commodity}</TableCell>
                <TableCell>{x.alertRaised}</TableCell>
                <TableCell>
                  {x.setupConfirmed
                    ? <StatusChip status={x.setupConfirmed === 'Confirmed' ? 'Approved' : 'Insufficient'} />
                    : <StatusChip status="Open" />}
                </TableCell>
                <TableCell>{x.tagsRequired ? `${x.tags.length} option(s)` : '—'}</TableCell>
                <TableCell align="right"><Button size="small" onClick={() => setSel(x.contract)}>Open</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      {c && (
        <>
          <SectionCard title={`S03-SC-14 — Contract quality terms · ${c.contract}`}>
            <TraceNote workflow="WF-S03-04 / Steps 1–2 — standard parameters retrieved automatically on contract creation; buyer variations recorded against the contract" />
            <FieldGrid columns={3}>
              <ReadOnlyField label="Contract" value={c.contract} />
              <ReadOnlyField label="Buyer" value={c.buyer} />
              <ReadOnlyField label="Commodity" value={c.commodity} />
            </FieldGrid>

            <Table size="small" sx={{ mt: 2 }}>
              <TableHead>
                <TableRow>
                  {['Parameter', 'Unit', 'Standard value', 'Agreed value', 'Varied', 'Variation reason'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {c.terms.map((t, i) => {
                  const varied = t.agreedValue !== t.standardValue;
                  return (
                    <TableRow key={t.parameter} sx={{ bgcolor: varied ? '#FFF7E6' : undefined }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: t.mandatory ? COLORS.required : undefined, fontWeight: t.mandatory ? 600 : 400 }}>
                          {t.parameter}{t.mandatory ? ' *' : ''}
                        </Typography>
                      </TableCell>
                      <TableCell>{t.unit}</TableCell>
                      <TableCell>{t.standardValue}</TableCell>
                      <TableCell>
                        <TextField
                          variant="standard" value={t.agreedValue} sx={{ width: 90 }}
                          onChange={(e) => {
                            const terms = [...c.terms];
                            terms[i] = { ...t, agreedValue: e.target.value };
                            updateContract(c.contract, { terms });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {varied
                          ? <Chip size="small" label="Varied" sx={{ height: 18, bgcolor: COLORS.attention, color: '#fff' }} />
                          : <Typography variant="caption" color="text.secondary">Standard</Typography>}
                      </TableCell>
                      <TableCell>
                        <TextField
                          variant="standard" fullWidth value={t.variationReason} error={varied && !t.variationReason}
                          placeholder={varied ? 'Required when varied' : ''}
                          onChange={(e) => {
                            const terms = [...c.terms];
                            terms[i] = { ...t, variationReason: e.target.value };
                            updateContract(c.contract, { terms });
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: COLORS.textSecondary }}>
              For sesame, moisture content is a mandatory parameter. Every variation is recorded against the contract
              and audited (C8).
            </Typography>

            <HandOffBanner
              to="S03 / WF-S03-01 Inspection and Quality Decision"
              passes="agreed contract quality terms"
              returns="inspection results evaluated against those terms"
              resumes="closing the loop between what was sold and what is tested"
              linkLabel="Open an inspection against this contract"
              linkTo="/s03/inspection/INS-00412"
            />
          </SectionCard>

          <SectionCard title="S03-SC-15 — Quality review of contract">
            <TraceNote workflow="WF-S03-04 / Steps 3–4 — an alert is sent to quality on contract creation; quality review the terms and confirm the setup is in place" />
            <FieldGrid columns={3}>
              <ReadOnlyField label="Alert raised (C5)" value={c.alertRaised} />
              <ReadOnlyField label="Reviewed by" value={c.reviewedBy || 'Not yet reviewed'} />
              <ReadOnlyField
                label="Setup confirmed"
                value={c.setupConfirmed ? <StatusChip status={c.setupConfirmed === 'Confirmed' ? 'Approved' : 'Insufficient'} /> : '—'}
              />
            </FieldGrid>
            <Box sx={{ mt: 2 }}>
              <RequiredLabel label="Setup in place to fulfil the terms" required />
              <RadioGroup
                row value={c.setupConfirmed ?? ''}
                onChange={(e) => updateContract(c.contract, { setupConfirmed: e.target.value as any, reviewedBy: 'S. Ali (Quality)' })}
              >
                <FormControlLabel value="Confirmed" control={<Radio size="small" />} label="Confirmed" />
                <FormControlLabel value="Not confirmed" control={<Radio size="small" />} label="Not confirmed" />
              </RadioGroup>
            </Box>
            <Box sx={{ mt: 1 }}>
              <RequiredLabel label="Quality feedback" required />
              <TextField
                fullWidth variant="standard" multiline value={c.feedback}
                onChange={(e) => updateContract(c.contract, { feedback: e.target.value })}
              />
            </Box>
            {c.setupConfirmed === 'Not confirmed' && (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                The feedback is recorded and the gap is visible on the contract. The source describes no escalation
                beyond this, and none is invented.
              </Alert>
            )}
          </SectionCard>

          <SectionCard
            title="S03-SC-16 — Tag specification"
            right={c.tagsRequired && <Button size="small" variant="outlined" onClick={() => setTagOpen(true)}>Add tag option</Button>}
          >
            <TraceNote workflow="WF-S03-04 / Step 5 — where the buyer requires custom tags, a tag specification flow is started after the contract is saved" />
            {!c.tagsRequired ? (
              <Typography variant="body2" color="text.secondary">
                The buyer does not require custom tags on this contract, so the tag specification flow does not start.
              </Typography>
            ) : (
              <>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Tag option', 'Specification note', ''].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {c.tags.map((t, i) => (
                      <TableRow key={t.option}>
                        <TableCell>{t.option}</TableCell>
                        <TableCell>{t.note || '—'}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => updateContract(c.contract, { tags: c.tags.filter((_, n) => n !== i) })}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {c.tags.length === 0 && (
                      <TableRow><TableCell colSpan={3}><Typography variant="body2" color="text.secondary">No tag options listed</Typography></TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
                <PrototypeNote>
                  the tag option set is entered freely; the source lists no fixed option catalogue and none is invented.
                </PrototypeNote>
              </>
            )}
          </SectionCard>
        </>
      )}

      <BottomBar>
        <Button component={Link} to="/s03" variant="outlined">Back to the control point board</Button>
        <Button variant="contained" onClick={() => say('Contract quality terms saved (front-end state only)')}>Save</Button>
      </BottomBar>

      <Dialog open={tagOpen} onClose={() => setTagOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add tag option</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <RequiredLabel label="Tag option" required />
            <TextField fullWidth variant="standard" value={newTag.option} onChange={(e) => setNewTag({ ...newTag, option: e.target.value })} />
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">Specification note</Typography>
            <TextField fullWidth variant="standard" value={newTag.note} onChange={(e) => setNewTag({ ...newTag, note: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTagOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!newTag.option.trim() || !c}
            onClick={() => {
              if (c) updateContract(c.contract, { tags: [...c.tags, newTag] });
              setNewTag({ option: '', note: '' });
              setTagOpen(false);
              say('Tag option added to the specification');
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
