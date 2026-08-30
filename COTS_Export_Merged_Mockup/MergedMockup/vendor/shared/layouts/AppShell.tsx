import React from 'react';
import {
  AppBar, Badge, Box, Chip, Dialog, IconButton, MenuItem, Paper, Select, Stack, Toolbar,
  Tooltip, Typography, Snackbar, Alert, Breadcrumbs, Link as MuiLink,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import InboxIcon from '@mui/icons-material/Inbox';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { COLORS } from '../theme';
import { useStore } from '../state/store';
import { COUNTRIES, SEASONS } from '../mockData/master';

const TILES: { group: string; proposal?: boolean; items: { code: string; label: string; to: string; live?: boolean }[] }[] = [
  {
    group: 'Planning & Costing',
    items: [
      { code: 'S01', label: 'Planning', to: '/s01', live: true },
      { code: 'S02', label: 'Costing', to: '/s02', live: true },
    ],
  },
  {
    group: 'Operations Control',
    items: [
      { code: 'S03', label: 'Quality Assurance', to: '/s03', live: true },
      { code: 'S05', label: 'Logistics', to: '/s05', live: true },
    ],
  },
  {
    group: 'Position & Compliance',
    items: [
      { code: 'S06', label: 'SMA', to: '/s06', live: true },
      { code: 'S04', label: 'Compliance', to: '/s04', live: true },
      { code: 'S07', label: 'Claims', to: '/s07', live: true },
    ],
  },
  {
    group: 'Business Support',
    proposal: true,
    items: [
      { code: 'S08', label: 'Projects', to: '/s08', live: true },
      { code: 'S09', label: 'CRM and Customer Feedback', to: '/s09', live: true },
      { code: 'S10', label: 'Team Directory', to: '/s10', live: true },
      { code: 'S11', label: 'Knowledge Portal', to: '/s11', live: true },
    ],
  },
];

function ModuleTileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <Box sx={{ bgcolor: COLORS.primary, color: '#fff', px: 3, py: 1.5, display: 'flex', alignItems: 'center' }}>
        <IconButton onClick={onClose} sx={{ color: '#fff', mr: 2 }}><MenuIcon /></IconButton>
        <Typography variant="h6">COTS — Shared Modules</Typography>
      </Box>
      <Box sx={{ p: 4, bgcolor: COLORS.background, flex: 1 }}>
        {TILES.map((g) => (
          <Box key={g.group} sx={{ mb: 4 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ color: COLORS.textSecondary, letterSpacing: 0.5 }}>
                {g.group.toUpperCase()}
              </Typography>
              {g.proposal && (
                <Chip
                  size="small"
                  label="Proposal — business confirmation required"
                  sx={{ bgcolor: '#FFF7E6', color: '#6B4E00', border: '1px solid #F0D9A8', height: 20, fontSize: '0.68rem' }}
                />
              )}
            </Stack>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {g.items.map((it) => (
                <Paper
                  key={it.code}
                  variant="outlined"
                  onClick={() => { nav(it.to); onClose(); }}
                  sx={{
                    width: 190, p: 2, cursor: 'pointer', borderColor: it.live ? COLORS.primary : COLORS.border,
                    borderWidth: it.live ? 2 : 1, '&:hover': { bgcolor: '#EAF4FB' },
                  }}
                >
                  <Typography sx={{ fontWeight: 700, color: COLORS.primary }}>{it.code}</Typography>
                  <Typography variant="body2">{it.label}</Typography>
                  <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                    {it.live ? 'Mockup available' : 'Not yet mocked'}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Dialog>
  );
}

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
  const [menu, setMenu] = React.useState(false);
  const { country, setCountry, seasonId, setSeasonId, tasks, toast, clearToast } = useStore();
  const seasons = SEASONS.filter((s) => s.country === country);
  const loc = useLocation();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: COLORS.background }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: COLORS.primary }}>
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          <IconButton edge="start" sx={{ color: '#fff' }} onClick={() => setMenu(true)}><MenuIcon /></IconButton>
          <Box sx={{ flex: 1 }} />
          <Select
            size="small"
            variant="standard"
            disableUnderline
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            sx={{ color: '#fff', fontSize: '0.82rem', '& .MuiSvgIcon-root': { color: '#fff' } }}
          >
            {COUNTRIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
          {showSeason && (
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
                  {seasons.map((s) => <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>)}
                </Select>
              }
              sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', height: 26 }}
            />
          )}
          <Tooltip title="Global search (C2)"><IconButton sx={{ color: '#fff' }}><SearchIcon /></IconButton></Tooltip>
          <Tooltip title="Actions Inbox (C2)">
            <IconButton component={Link} to="/inbox" sx={{ color: '#fff' }}>
              <Badge badgeContent={tasks.length} color="error"><InboxIcon /></Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title="Notifications (C5)"><IconButton sx={{ color: '#fff' }}><NotificationsNoneIcon /></IconButton></Tooltip>
          <Tooltip title="Module help (C2 / S11)"><IconButton sx={{ color: '#fff' }}><HelpOutlineIcon /></IconButton></Tooltip>
          <Tooltip title="A. Osman (Planner)"><IconButton sx={{ color: '#fff' }}><PersonOutlineIcon /></IconButton></Tooltip>
          <IconButton sx={{ color: '#fff' }}><LogoutIcon /></IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ bgcolor: COLORS.primary, color: '#fff', px: 3, pt: 0.5, pb: 2 }}>
        <Typography sx={{ fontSize: '1.05rem', fontWeight: 500 }}>{title}</Typography>
        <Breadcrumbs
          separator=">"
          sx={{ '& .MuiBreadcrumbs-separator': { color: 'rgba(255,255,255,0.7)', mx: 0.5 } }}
        >
          {breadcrumb.map((b, i) => (
            <Typography key={i} variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>{b}</Typography>
          ))}
        </Breadcrumbs>
      </Box>

      {banner}

      <Box sx={{ px: 3, py: 2, mt: -1 }}>{children}</Box>

      <Box sx={{ px: 3, py: 2 }}>
        <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
          COTS Shared Modules prototype — mock data only, front-end state, resets on refresh. Not production software.
          {'  '}Route: {loc.pathname}
        </Typography>
      </Box>

      <ModuleTileMenu open={menu} onClose={() => setMenu(false)} />
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
