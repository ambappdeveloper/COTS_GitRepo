import React from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography, Chip, Divider,
} from '@mui/material';
import { COLORS } from '../theme';
import { CITIES, COMMODITIES, LOCATIONS } from '../mockData/master';
import type { PlanRow } from '../mockData/s01';

type ParsedRow = {
  line: number;
  raw: string[];
  city: string;
  location: string;
  commodity: string;
  month: string;
  qty: string;
  errors: string[];
};

const EXPECTED = ['City', 'Location', 'Commodity', 'Month', 'Quantity'];

/**
 * WF-S01-01 / Step 5 — paste a block from a spreadsheet directly into the plan grid.
 * COTS validates every row and reports errors before anything is committed.
 * Direct grid entry is an explicit business requirement and is NOT reduced to a file upload.
 */
export function PasteFromExcelDialog({
  open,
  onClose,
  months,
  country,
  onCommit,
}: {
  open: boolean;
  onClose: () => void;
  months: string[];
  country: string;
  onCommit: (rows: PlanRow[]) => void;
}) {
  const [text, setText] = React.useState('');
  const [stage, setStage] = React.useState<1 | 2>(1);
  const [parsed, setParsed] = React.useState<ParsedRow[]>([]);
  const [showErrors, setShowErrors] = React.useState(false);
  const [copied, setCopied] = React.useState('');

  const reset = () => { setText(''); setStage(1); setParsed([]); setShowErrors(false); setCopied(''); };

  const validate = () => {
    const cityNames = CITIES.filter((c) => c.country === country).map((c) => c.name);
    const rows: ParsedRow[] = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((line, i) => {
        const cells = line.split('\t').map((c) => c.trim());
        const [city = '', location = '', commodity = '', month = '', qty = ''] = cells;
        const errors: string[] = [];
        if (cells.length < 5) errors.push(`Expected 5 columns (${EXPECTED.join(', ')}), found ${cells.length}`);
        if (city && !cityNames.includes(city)) errors.push(`City "${city}" is not master data for ${country}`);
        if (location && !LOCATIONS.some((l) => l.name === location && l.city === city))
          errors.push(`Location "${location}" does not belong to city "${city}"`);
        if (commodity && !COMMODITIES.some((c) => c.name === commodity))
          errors.push(`Commodity "${commodity}" is not master data`);
        if (month && !months.includes(month)) errors.push(`Month "${month}" is outside the season`);
        const n = Number(qty);
        if (qty === '' || !Number.isFinite(n)) errors.push(`Quantity "${qty}" is not numeric`);
        else if (n < 0) errors.push('Quantity cannot be negative');
        return { line: i + 1, raw: cells, city, location, commodity, month, qty, errors };
      });
    setParsed(rows);
    setStage(2);
  };

  const valid = parsed.filter((p) => p.errors.length === 0);
  const invalid = parsed.filter((p) => p.errors.length > 0);
  const errorCsv = ['Line,Pasted row,Errors']
    .concat(invalid.map((p) => `${p.line},"${p.raw.join(' ')}","${p.errors.join('; ')}"`))
    .join('\n');
  const canCommit = parsed.length > 0 && invalid.length === 0;

  const commit = () => {
    const byKey = new Map<string, PlanRow>();
    valid.forEach((p) => {
      const group = COMMODITIES.find((c) => c.name === p.commodity)?.group ?? '';
      const key = `${p.city}|${p.location}|${p.commodity}`;
      const existing = byKey.get(key);
      const qty = Number(p.qty);
      if (existing) existing.months[p.month] = qty;
      else
        byKey.set(key, {
          id: `paste-${key}`,
          city: p.city,
          location: p.location,
          commodityGroup: group,
          commodity: p.commodity,
          months: { [p.month]: qty },
          section: `${group} / ${p.city}`,
        });
    });
    onCommit(Array.from(byKey.values()));
    reset();
    onClose();
  };

  const sample = `Gedaref\tGedaref Central\tSesame\tMar\t900
Gedaref\tGedaref East\tGroundnut\tMar\t420
El Obeid\tEl Obeid Depot\tGum Arabic\tApr\t260`;

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ bgcolor: COLORS.primary, color: '#fff', py: 1.25 }}>
        <span style={{ fontSize: '0.72rem', opacity: 0.85, display: 'block' }}>S01-SC-04 · SM-03 paste grid</span>
        Paste planning information from Excel
        <Typography variant="caption" sx={{ display: 'block', opacity: 0.85 }}>
          WF-S01-01 / Step 5 — every pasted row is validated before anything is committed
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Alert severity="info" icon={false} sx={{ mb: 2, fontSize: '0.78rem' }}>
          Direct entry into the planning grid is an explicit business requirement and must not be reduced to a
          file upload only. Paste a block copied from a spreadsheet — a file chooser is deliberately not offered
          as the primary route.
        </Alert>

        {stage === 1 && (
          <>
            <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
              Expected columns, tab separated: <b>{EXPECTED.join(' · ')}</b>
            </Typography>
            <TextField
              multiline
              minRows={8}
              fullWidth
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={sample}
              sx={{ mt: 1, '& textarea': { fontFamily: 'monospace', fontSize: '0.78rem' } }}
            />
            <Button size="small" sx={{ mt: 1 }} onClick={() => setText(sample)}>
              Insert a sample block (one row contains a deliberate error)
            </Button>
            <Button
              size="small"
              sx={{ mt: 1, ml: 1 }}
              onClick={() => setText(sample.replace('Mar\t420', 'Sep\t420').replace('260', '-260'))}
            >
              Insert a block with errors
            </Button>
          </>
        )}

        {stage === 2 && (
          <>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Chip size="small" label={`${parsed.length} rows read`} />
              <Chip size="small" label={`${valid.length} valid`} sx={{ bgcolor: COLORS.good, color: '#fff' }} />
              <Chip
                size="small"
                label={`${invalid.length} errors`}
                sx={{ bgcolor: invalid.length ? COLORS.bad : COLORS.neutral, color: '#fff' }}
              />
            </Stack>

            {invalid.length > 0 && (
              <Alert severity="error" sx={{ mb: 1, fontSize: '0.78rem' }}>
                Validation failed. The errors are displayed below and <b>the affected data is not committed</b>.
                The plan grid has not been changed.
              </Alert>
            )}

            <Box sx={{ border: `1px solid ${COLORS.border}`, maxHeight: 320, overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Row</TableCell>
                    {EXPECTED.map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                    ))}
                    <TableCell sx={{ fontWeight: 600 }}>Outcome</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsed.map((p) => (
                    <TableRow key={p.line} sx={{ bgcolor: p.errors.length ? '#FDF3F2' : undefined }}>
                      <TableCell>{p.line}</TableCell>
                      <TableCell>{p.city}</TableCell>
                      <TableCell>{p.location}</TableCell>
                      <TableCell>{p.commodity}</TableCell>
                      <TableCell>{p.month}</TableCell>
                      <TableCell>{p.qty}</TableCell>
                      <TableCell>
                        {p.errors.length === 0 ? (
                          <Typography variant="caption" sx={{ color: COLORS.good, fontWeight: 600 }}>Valid</Typography>
                        ) : (
                          p.errors.map((e) => (
                            <Typography key={e} variant="caption" sx={{ color: COLORS.bad, display: 'block' }}>
                              {e}
                            </Typography>
                          ))
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            <Divider sx={{ my: 1.5 }} />
            <Typography variant="caption" sx={{ color: COLORS.textSecondary, fontStyle: 'italic' }}>
              Prototype assumption — the mockup validates four rules: the dimension exists in master data, the
              location belongs to the city, the month falls within the season, and the quantity is numeric and not
              negative. The full validation set follows the master data and configuration rules and is not invented here.
            </Typography>
          </>
        )}
      </DialogContent>
      {showErrors && (
        <Box sx={{ px: 3, pb: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.textSecondary, display: 'block' }}>
            THE {invalid.length} ERROR ROW{invalid.length === 1 ? '' : 'S'}, AS CSV — PASTE THEM BACK INTO EXCEL TO FIX
          </Typography>
          <TextField
            value={errorCsv}
            multiline
            minRows={3}
            maxRows={8}
            fullWidth
            size="small"
            InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.75rem' } }}
            sx={{ mt: 0.5 }}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                navigator.clipboard?.writeText(errorCsv).then(
                  () => setCopied('Copied to the clipboard.'),
                  () => setCopied('Copying was blocked — select the text above and copy it.'),
                );
              }}
            >
              Copy
            </Button>
            <Button size="small" onClick={() => { setShowErrors(false); setCopied(''); }}>Hide</Button>
            {copied && (
              <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>{copied}</Typography>
            )}
          </Stack>
        </Box>
      )}

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={() => { reset(); onClose(); }}>Cancel</Button>
        <Box sx={{ flex: 1 }} />
        {stage === 2 && <Button onClick={() => setStage(1)}>Back to paste</Button>}
        {stage === 2 && invalid.length > 0 && (
          <Button onClick={() => setShowErrors(true)}>
            Take out the {invalid.length} error row{invalid.length === 1 ? '' : 's'}
          </Button>
        )}
        {stage === 1 ? (
          <Button variant="contained" disabled={!text.trim()} onClick={validate}>Validate</Button>
        ) : (
          <Button variant="contained" disabled={!canCommit} onClick={commit}>Commit valid rows</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
