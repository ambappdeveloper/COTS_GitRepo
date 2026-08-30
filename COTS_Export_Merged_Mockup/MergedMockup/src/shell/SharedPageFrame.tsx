/**
 * v1.2 — the Shared screens inside the one Core shell.
 *
 * Each Shared page renders its own `AppShell`, which in the standalone Shared prototype draws a blue
 * bar with a menu, a country selector, an inbox and a season chip. Inside the integrated mockup that
 * is a second navigation on top of the Core one, and the review asked for a single menu.
 *
 * This component replaces that layout **without changing a single Shared file**: `vite.config.ts`
 * redirects the resolved module `COTS_SharedModules_mockup_src_4/src/layouts/AppShell` to this file,
 * so every Shared page — including the ones that import it relatively — renders here instead. The
 * props are the same, so no page changed:
 *
 *     <AppShell title breadcrumb showSeason banner>{children}</AppShell>
 *
 * What is kept: the page title, the breadcrumb, the banner slot, the season selector (which is real
 * Shared state, not navigation) and the toast. What is dropped: the second app bar, the second module
 * menu, the second country selector and the second inbox — all of which the Core shell already
 * provides.
 */

import React from 'react';
import { Alert, Box, Breadcrumbs, Chip, MenuItem, Select, Snackbar, Stack, Typography } from '@mui/material';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { COLORS } from '@shared/theme';
import { useStore } from '@shared/state/store';
import { SEASONS } from '@shared/mockData/master';
import { useCountryAlignment } from '../integration/CountrySync';

export function AppShell({
  title,
  breadcrumb,
  children,
  showSeason = true,
  banner,
}: {
  title: string;
  breadcrumb: string[];
  children: React.ReactNode;
  showSeason?: boolean;
  banner?: React.ReactNode;
}) {
  const { country, seasonId, setSeasonId, toast, clearToast } = useStore();
  const seasons = SEASONS.filter((s) => s.country === country);

  /*
    v1.4 — the country these screens are in, which is always the session's.

    `CountrySync` mirrors the Core session into the Shared store unconditionally, so the two never
    disagree. What can differ is whether this prototype was seeded with any records for that country;
    where it was not, the screens are correctly scoped and empty, and the banner says that in as many
    words rather than leaving an empty table to be read as a defect.
  */
  const alignment = useCountryAlignment();

  return (
    <Box sx={{ minHeight: '100%', bgcolor: COLORS.background }}>
      <Box sx={{ bgcolor: COLORS.primary, color: '#fff', px: 3, pt: 1.5, pb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: '1.05rem', fontWeight: 500 }}>{title}</Typography>
            <Breadcrumbs
              separator=">"
              sx={{ '& .MuiBreadcrumbs-separator': { color: 'rgba(255,255,255,0.7)', mx: 0.5 } }}
            >
              {breadcrumb.map((b, i) => (
                <Typography key={i} variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                  {b}
                </Typography>
              ))}
            </Breadcrumbs>
          </Box>
          {/* the country these screens are in, beside the season — both are Shared state */}
          <Chip
            size="small"
            label={country}
            sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', height: 26, mr: 0.5 }}
          />
          {showSeason && seasons.length > 0 && (
            <Chip
              icon={<EventNoteIcon sx={{ fontSize: 15, color: '#fff !important' }} />}
              size="small"
              label={
                <Select
                  variant="standard"
                  disableUnderline
                  value={seasons.some((s) => s.id === seasonId) ? seasonId : seasons[0]?.id ?? ''}
                  onChange={(e) => setSeasonId(e.target.value)}
                  sx={{ color: '#fff', fontSize: '0.74rem', '& .MuiSvgIcon-root': { color: '#fff' } }}
                >
                  {seasons.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>
                  ))}
                </Select>
              }
              sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', height: 26 }}
            />
          )}
        </Stack>
      </Box>

      {/*
        Shown only when the session's country and these screens' country genuinely differ. Silence is
        the normal state; a banner on every screen would be noise.
      */}
      {alignment && !alignment.seeded && alignment.noDataReason && (
        <Alert severity="info" sx={{ borderRadius: 0 }}>
          <b>No Shared module records for {alignment.session}.</b> {alignment.noDataReason}
        </Alert>
      )}

      {banner}

      {/*
        The boundary that catches a screen failing for the active country is **not** here. It sits at
        `SharedArea` in `App.tsx`, above the page component — because the failures worth catching
        happen in the page's own body, before it ever renders this frame:

            export default function Landing() {
              const season = SEASONS.find(…) ?? SEASONS.find((s) => s.country === country)!;  // throws
              return <AppShell …>                                                             // never reached

        A boundary inside this file would sit below the throw and catch nothing. Recorded here because
        putting it in the frame is the obvious first guess, and it silently does not work.
      */}
      <Box sx={{ px: 3, py: 2 }}>{children}</Box>

      <Box sx={{ px: 3, pb: 2 }}>
        <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
          Shared Modules prototype — mock data only, front-end state, resets on refresh. Not production software.
        </Typography>
      </Box>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={clearToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={clearToast} sx={{ fontSize: '0.8rem' }}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}

export default AppShell;
