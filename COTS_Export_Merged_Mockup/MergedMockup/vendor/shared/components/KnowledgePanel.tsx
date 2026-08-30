import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody,
  TableCell, TableRow, Typography,
} from '@mui/material';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import { Link } from 'react-router-dom';
import { useS11 } from '../state/s11store';
import { useS10 } from '../state/s10store';
import { TODAY, reviewStatus, type MaterialType } from '../mockData/s11';
import { COLORS } from '../theme';

/**
 * S11-SC-06 — the point-of-work panel.
 *
 * S11 owns this component; OTHER MODULES host it. Surfacing the material where the work happens,
 * rather than only storing it in a library, is what distinguishes a knowledge portal from a
 * document store — so this panel is the module's whole thesis, and it lives on their screens.
 *
 * The version shown is the version IN FORCE on the date, never simply the latest.
 * Where nothing is published for the context, the panel STILL RENDERS and names what is missing.
 */
export function KnowledgePanel({
  type,
  country,
  commodity,
  contextLabel,
}: {
  type: MaterialType;
  country: string;
  commodity?: string;
  contextLabel: string;
}) {
  const { items, consult, inForce } = useS11();
  const { people } = useS10();
  const [open, setOpen] = React.useState<string | null>(null);

  const candidates = items.filter(
    (i) =>
      i.type === type &&
      (i.country === country || i.country === 'All countries') &&
      (!commodity || !i.commodity || i.commodity === commodity) &&
      (i.status === 'Published' || i.status === 'Superseded'),
  );
  const codes = Array.from(new Set(candidates.map((c) => c.code)));
  const current = codes.map((c) => inForce(c, TODAY)).filter((x) => x && x.status === 'Published');

  const owner = (id: string) => people.find((p) => p.id === id)?.name ?? '—';
  const item = open ? items.find((i) => i.id === open) : null;

  return (
    <Box
      sx={{
        border: `1px solid ${COLORS.primary}`, bgcolor: '#F5FAFD', borderRadius: 1,
        px: 1.5, py: 1.2, my: 1.5,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
        <MenuBookOutlinedIcon sx={{ fontSize: 17, color: COLORS.primary }} />
        <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.primaryDark }}>
          S11 KNOWLEDGE — {contextLabel.toUpperCase()}
        </Typography>
        <Chip size="small" label="PROPOSAL" sx={{ height: 17, fontSize: '0.6rem', bgcolor: COLORS.attention, color: '#fff', fontWeight: 700 }} />
      </Stack>

      {current.length === 0 ? (
        <Alert severity="warning" sx={{ fontSize: '0.78rem', py: 0.3 }}>
          <b>No {type.toLowerCase()} is published for {commodity ? `${commodity} in ` : ''}{country}.</b> The panel
          still renders and names what is missing — a library gap should be visible to the people who feel it, not
          only to the owner. Published by the {type.toLowerCase()} owner in S11.
        </Alert>
      ) : (
        current.map((c) => {
          const rs = reviewStatus(c!.reviewDate);
          return (
            <Stack key={c!.id} direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', py: 0.3 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{c!.title}</Typography>
              <Chip size="small" label={`${c!.version} · in force since ${c!.effectiveFrom}`} sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#fff', color: COLORS.primaryDark, fontWeight: 600 }} />
              {rs.state !== 'Current' && (
                <Chip
                  size="small"
                  label={rs.state === 'Overdue for review' ? `Overdue for review by ${rs.days} days` : `Due for review in ${rs.days} days`}
                  sx={{ height: 18, fontSize: '0.65rem', bgcolor: rs.state === 'Overdue for review' ? '#FDECEA' : '#FFF4E5', color: rs.state === 'Overdue for review' ? COLORS.bad : COLORS.attention, fontWeight: 700 }}
                />
              )}
              <Button size="small" onClick={() => { setOpen(c!.id); consult(c!.id); }}>Open</Button>
            </Stack>
          );
        })
      )}

      <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mt: 0.3 }}>
        The version shown is the one <b>in force today</b>, not simply the latest published. Surfacing material here
        rather than only storing it is what distinguishes this from a document store.
      </Typography>

      <Dialog open={!!item} onClose={() => setOpen(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{item?.title}</DialogTitle>
        <DialogContent>
          {item && (
            <>
              {item.status === 'Superseded' && (
                <Alert severity="warning" sx={{ mb: 1.5, fontSize: '0.82rem' }}>
                  You are viewing <b>{item.version}</b>, superseded on {item.effectiveTo}. The version in force is{' '}
                  <b>{inForce(item.code)?.version}</b>.
                </Alert>
              )}
              <Table size="small">
                <TableBody>
                  {[
                    ['Type', item.type],
                    ['Country · module', `${item.country} · ${item.module}`],
                    ['Owner', owner(item.ownerId)],
                    ['Version · effective from', `${item.version} · ${item.effectiveFrom}`],
                    ['Review date', `${item.reviewDate} — ${reviewStatus(item.reviewDate).state}`],
                    ['File (served from C7)', item.file],
                  ].map((r) => (
                    <TableRow key={r[0]}>
                      <TableCell sx={{ fontWeight: 600, width: 200 }}>{r[0]}</TableCell>
                      <TableCell>{r[1]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                The underlying file is stored and versioned in <b>Core C7</b>. S11 holds the classification, the
                placement and the publication state. No file is actually served in the prototype.
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button component={Link} to="/s11">Open the knowledge library</Button>
          <Button variant="contained" onClick={() => setOpen(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
