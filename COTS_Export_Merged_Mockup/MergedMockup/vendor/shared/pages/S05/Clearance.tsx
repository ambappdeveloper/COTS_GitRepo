import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import {
  BottomBar, BusinessConfirmation, HandOffBanner, PrototypeNote, ReadOnlyField, SectionCard, StatusChip,
  TraceNote, FieldGrid, RequiredLabel,
} from '../../components/shared';
import { useStore } from '../../state/store';
import { useS05 } from '../../state/s05store';
import { CLEARANCE_TEMPLATES } from '../../mockData/s05';
import { KnowledgePanel } from '../../components/KnowledgePanel';
import { COLORS } from '../../theme';

export default function Clearance() {
  const { country, say } = useStore();
  const { clearances, updateClearance } = useS05();
  const [sel, setSel] = React.useState(clearances[0]?.id ?? '');
  const [tpl, setTpl] = React.useState(false);
  const [chosen, setChosen] = React.useState(CLEARANCE_TEMPLATES[0].name);
  const c = clearances.find((x) => x.id === sel);
  const template = CLEARANCE_TEMPLATES.find((t) => t.name === chosen)!;

  return (
    <AppShell title="Clearance Information Management" breadcrumb={[country, 'Logistics', 'Clearance']} showSeason={false}>
      <KnowledgePanel type="Matrix" country={country} contextLabel="Execution contract requirements for this country" />
      <KnowledgePanel type="Template" country={country} contextLabel="Clearance report templates" />
      <SectionCard title="Clearance records">
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Clearance', 'Shipment', 'Declaration reference', 'Lodged', 'Cleared', 'Status', 'Documents', ''].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {clearances.map((x) => (
              <TableRow key={x.id} hover selected={x.id === sel}>
                <TableCell sx={{ fontWeight: 600, color: COLORS.primary }}>{x.id}</TableCell>
                <TableCell>{x.shipment}</TableCell>
                <TableCell>{x.declarationRef}</TableCell>
                <TableCell>{x.lodgedDate}</TableCell>
                <TableCell>{x.clearedDate || '—'}</TableCell>
                <TableCell><StatusChip status={x.status === 'Cleared' ? 'Approved' : 'Open'} /></TableCell>
                <TableCell>{x.documents.length}</TableCell>
                <TableCell align="right"><Button size="small" onClick={() => setSel(x.id)}>Open</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      {c && (
        <>
          <SectionCard title={`S05-SC-11 — Clearance record · ${c.id}`}>
            <TraceNote workflow="WF-S05-05 / Steps 1–2 — the clearance team enters the information through structured forms rather than maintaining separate spreadsheets" />
            <FieldGrid columns={3}>
              <Box>
                <RequiredLabel label="Shipment" required />
                <TextField fullWidth variant="standard" value={c.shipment} onChange={(e) => updateClearance(c.id, { shipment: e.target.value })} />
              </Box>
              <Box>
                <RequiredLabel label="Declaration reference" required />
                <TextField fullWidth variant="standard" value={c.declarationRef} onChange={(e) => updateClearance(c.id, { declarationRef: e.target.value })} />
              </Box>
              <ReadOnlyField label="Status" value={<StatusChip status={c.status === 'Cleared' ? 'Approved' : 'Open'} />} />
              <Box sx={{ mt: 1 }}>
                <RequiredLabel label="Lodged date" required />
                <TextField fullWidth variant="standard" value={c.lodgedDate} onChange={(e) => updateClearance(c.id, { lodgedDate: e.target.value })} />
              </Box>
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">Cleared date</Typography>
                <TextField
                  fullWidth variant="standard" value={c.clearedDate}
                  onChange={(e) => updateClearance(c.id, { clearedDate: e.target.value, status: e.target.value ? 'Cleared' : 'In progress' })}
                />
              </Box>
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">Additional references</Typography>
                <TextField
                  fullWidth variant="standard" value={c.additionalRefs.join(', ')}
                  onChange={(e) => updateClearance(c.id, { additionalRefs: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                />
              </Box>
            </FieldGrid>

            <Alert severity="info" icon={false} sx={{ mt: 2, fontSize: '0.8rem' }}>
              Data entered once, presented in whatever format the authority or partner expects — that is the practical
              requirement this screen serves.
            </Alert>

            <SectionCard title="Documents obtained during clearance — C7 shared pattern">
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {c.documents.map((d) => <Chip key={d} size="small" label={d} />)}
                {c.documents.length === 0 && <Typography variant="body2" color="text.secondary">No documents attached</Typography>}
              </Stack>
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: COLORS.textSecondary }}>
                Attached through the document module and linked to the shipment; they remain on the shipment record.
              </Typography>
              <Button size="small" sx={{ mt: 1 }} onClick={() => say('Core C7 upload dialog (S-15) would open here')}>Attach document</Button>
            </SectionCard>

            <Button variant="outlined" onClick={() => setTpl(true)}>Export in required template</Button>
          </SectionCard>

          <SectionCard title={`S05-SC-13 — Clearance status on the shipment · ${c.shipment}`}>
            <TraceNote workflow="WF-S05-05 / Steps 4–5 — clearance status is visible on the shipment, so execution can see where a consignment stands without contacting the clearance team" />
            <FieldGrid columns={3}>
              <ReadOnlyField label="Clearance status" value={<StatusChip status={c.status === 'Cleared' ? 'Approved' : 'Open'} />} />
              <ReadOnlyField label="Declaration reference" value={c.declarationRef} />
              <ReadOnlyField label="Lodged · cleared" value={`${c.lodgedDate} · ${c.clearedDate || 'not yet cleared'}`} />
              <ReadOnlyField label="Documents" value={`${c.documents.length} linked to the shipment`} />
              <ReadOnlyField label="Last updated" value={c.lastUpdated} />
            </FieldGrid>
            <HandOffBanner
              to="Export module — shipment record"
              passes="clearance status, declaration reference, dates and linked documents"
              returns="nothing"
              resumes="execution reads the status from the shipment"
              linkLabel="Open Export stub"
              linkTo="/stub/export"
            />
          </SectionCard>
        </>
      )}

      <BottomBar>
        <Button component={Link} to="/s05" variant="outlined">Back to movements</Button>
        <Button variant="contained" onClick={() => say('Clearance record saved (front-end state only)')}>Save</Button>
      </BottomBar>

      {/* S05-SC-12 */}
      <Dialog open={tpl} onClose={() => setTpl(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: COLORS.primary, color: '#fff', py: 1.25 }}>
          Clearance export templates
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.85 }}>WF-S05-05 / Step 3</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box>
            <RequiredLabel label="Template" required />
            <Select fullWidth variant="standard" value={chosen} onChange={(e) => setChosen(e.target.value)}>
              {CLEARANCE_TEMPLATES.map((t) => <MenuItem key={t.name} value={t.name}>{t.name}</MenuItem>)}
            </Select>
          </Box>
          <Box sx={{ mt: 2 }}>
            <ReadOnlyField label="Receiving party" value={template.party} />
            <ReadOnlyField label="Fields included" value={template.fields.join(' · ')} />
          </Box>
          <BusinessConfirmation>
            Confirm the clearance report templates required per country with the logistics team.
            <PrototypeNote>two placeholder templates are listed so the pattern is visible; no template content is invented.</PrototypeNote>
          </BusinessConfirmation>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTpl(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => { setTpl(false); say(`Exported in “${chosen}” (simulated)`); }}>
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
