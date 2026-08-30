import React from 'react';
import {
  AppBar, Box, Toolbar, IconButton, Typography, Menu, MenuItem, Badge, Drawer, List, ListItemButton,
  ListItemText, ListItemIcon, Divider, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Select, FormControl, Paper, Stack, Snackbar, Alert, Tooltip, ListSubheader, Tabs, Tab,
  InputLabel, Table, TableBody, TableRow, TableCell
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PublicIcon from '@mui/icons-material/Public';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import BadgeIcon from '@mui/icons-material/Badge';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorageIcon from '@mui/icons-material/Storage';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import CampaignIcon from '@mui/icons-material/Campaign';
import ForumIcon from '@mui/icons-material/Forum';
import FolderIcon from '@mui/icons-material/Folder';
import HistoryIcon from '@mui/icons-material/History';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import SettingsIcon from '@mui/icons-material/Settings';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import InventoryIcon from '@mui/icons-material/Inventory2';
import { Outlet, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { COUNTRIES } from '../mockData';
import { COUNTRY_CONTEXT, INFO_OBJECTS, MODULE_HELP, SUB_MODULES, InfoObject } from '../mockData/c2';
import { CommentThread } from '../components/CommentThread';
import { tokens } from '../theme';
import { StatusChip, EmptyState, HandOffBanner, PlaceholderNote } from '../components/shared';

const MODULE_TILES = [
  { code: 'C1', label: 'Identity and Access', icon: <BadgeIcon fontSize="large" />, route: '/c1/access-requests', enabled: true },
  { code: 'C2', label: 'Shell, Navigation and Inbox', icon: <DashboardIcon fontSize="large" />, route: '/inbox', enabled: true },
  { code: 'C3', label: 'Master Data', icon: <StorageIcon fontSize="large" />, route: '/c3/domains', enabled: true },
  { code: 'C4', label: 'Approval Workflow', icon: <FactCheckIcon fontSize="large" />, route: '/c4/approvals', enabled: true },
  { code: 'C5', label: 'Notifications and Alerts', icon: <CampaignIcon fontSize="large" />, route: '/c5/rules', enabled: true },
  { code: 'C6', label: 'Comments and Collaboration', icon: <ForumIcon fontSize="large" />, route: '/c6/discussions', enabled: true },
  { code: 'C7', label: 'Documents', icon: <FolderIcon fontSize="large" />, route: '/c7/register', enabled: true },
  { code: 'C8', label: 'Audit Trail', icon: <HistoryIcon fontSize="large" />, route: '/c8/search', enabled: true },
  { code: 'C9', label: 'Logging and Monitoring', icon: <MonitorHeartIcon fontSize="large" />, route: '/c9', enabled: true },
  { code: 'C10', label: 'Configuration', icon: <SettingsIcon fontSize="large" />, route: '/c10/countries', enabled: true },
  { code: 'C11', label: 'Reporting and Dashboards', icon: <AssessmentIcon fontSize="large" />, route: '/c11/reports', enabled: true },
  { code: 'C12', label: 'Integration Layer', icon: <SyncAltIcon fontSize="large" />, route: '/c12/interfaces', enabled: true }
];

/* Shared context so any page can open the infocard on an object reference — C2 / WF-C2-04 / Step 1 */
interface ShellApi { openInfocard: (id: string) => void; openHelp: (moduleCode?: string) => void }
const ShellCtx = React.createContext<ShellApi>({ openInfocard: () => {}, openHelp: () => {} });
export const useShell = () => React.useContext(ShellCtx);

/* ---------------------------------------------------------------------------------------------
 * Optional extension point — v1.2.
 *
 * The integrated mockup makes this shell the only navigation in the system, which means the shell
 * has to show things it cannot know about on its own: the other module sets, a few cross-module
 * entries in the profile menu, and which Core tiles the signed-in account may see.
 *
 * Everything below renders ONLY when a `ShellExtensionsProvider` is present above the shell. With no
 * provider — the standalone CoreModules prototype — the defaults are empty and the shell behaves
 * exactly as it did before.
 * ------------------------------------------------------------------------------------------- */
/**
 * One tile inside a module set — the peer of a Core module tile.
 *
 * `children` decides what a click does, and the rule is the same as the Core tiles': a tile with
 * children expands to show them in the strip at the foot of the menu; a tile without children
 * navigates. A module set whose own prototype has no sub-module tier — Shared is one — supplies
 * tiles with no children, and they behave as the direct links they are.
 */
export interface ShellModuleTile {
  code: string;
  label: string;
  hint?: string;
  route: string;
  enabled?: boolean;
  children?: { label: string; route?: string }[];
}

export interface ShellModuleSet {
  code: string;
  label: string;
  hint?: string;
  route: string;
  enabled: boolean;
  /**
   * v1.3 — the set's own tiles, so it is a peer of the Core twelve rather than a single tile that
   * navigates away.
   *
   * Until now this menu was a Core menu with the other module sets appended underneath as small dim
   * tiles: Export, with twenty-three phases, got one tile and no way to expand it, and only Core
   * tiles had a sub-module tier. A set that supplies `tiles` is rendered as its own band, with the
   * same grid and the same expand behaviour as Core's. A set that supplies none keeps the old
   * single-tile rendering, which is what an unbuilt module set wants.
   */
  tiles?: ShellModuleTile[];
}
export interface ShellMenuEntry {
  label: string;
  route: string;
}
export interface ShellExtensions {
  /** Title shown on the module screen. Defaults to 'CoreModules'. */
  menuTitle?: string;
  /** Whether the account may see a Core tile — WF-C2-01 / Step 5, WF-C1-03. Defaults to all. */
  canSeeModule?: (code: string) => boolean;
  /** A second tier of tiles beneath the Core twelve — the other module sets. */
  moduleSets?: ShellModuleSet[];
  /** Extra entries in the profile menu. */
  menuEntries?: ShellMenuEntry[];
}
const ShellExtensionsCtx = React.createContext<ShellExtensions>({});
export const ShellExtensionsProvider = ShellExtensionsCtx.Provider;
export const useShellExtensions = () => React.useContext(ShellExtensionsCtx);

export const AppShell: React.FC = () => {
  const s = useStore();
  const ext = useShellExtensions();
  const navigate = useNavigate();
  const [tiles, setTiles] = React.useState(false);
  const [openTier, setOpenTier] = React.useState<string | null>('C1');
  const [profile, setProfile] = React.useState<null | HTMLElement>(null);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [helpModule, setHelpModule] = React.useState('C1');
  const [countryDialog, setCountryDialog] = React.useState(false);
  const [pendingCountry, setPendingCountry] = React.useState('');
  const [infocard, setInfocard] = React.useState<string | null>(null);
  const [infoTab, setInfoTab] = React.useState(0);
  const [query, setQuery] = React.useState('');
  const [kindFilter, setKindFilter] = React.useState<string>('All');

  const user = s.currentUser!;
  const unread = s.notifications.filter((n) => !n.read).length;
  const multiCountry = user.countryScope.length > 1;
  const ctx = COUNTRY_CONTEXT[s.activeCountry];

  const api = React.useMemo<ShellApi>(() => ({
    openInfocard: (id: string) => { setInfoTab(0); setInfocard(id); },
    openHelp: (m?: string) => { if (m) setHelpModule(m); setHelpOpen(true); }
  }), []);

  const requestCountrySwitch = (c: string) => { setPendingCountry(c); setCountryDialog(true); };

  /* ---------------- global search across object types — WF-C2-04 / Steps 5–6 ---------------- */
  const q = query.trim().toLowerCase();
  const objectHits = q.length >= 2
    ? INFO_OBJECTS.filter((o) =>
        o.country === s.activeCountry &&
        (o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q) || o.kind.toLowerCase().includes(q)) &&
        (kindFilter === 'All' || o.kind === kindFilter))
    : [];
  const userHits = q.length >= 2
    ? s.users.filter((u) => u.name.toLowerCase().includes(q) && u.countryScope.includes(s.activeCountry) && (kindFilter === 'All' || kindFilter === 'User'))
    : [];
  const requestHits = q.length >= 2
    ? s.requests.filter((r) => (r.id + r.requestedForName).toLowerCase().includes(q) && (kindFilter === 'All' || kindFilter === 'Access request'))
    : [];
  // C6 / WF-C6-01 / Step 10 — comments are searchable within permission and country scope
  const commentSearch = q.length >= 2 && (kindFilter === 'All' || kindFilter === 'Comment')
    ? s.searchComments(q)
    : { results: [], hiddenByScope: 0 };
  const commentHits = commentSearch.results.filter((c) => c.country === s.activeCountry);
  /* C11 — a report and a saved view are searchable, because "where is that number
   * from?" usually starts from the report name. */
  const reportHits = q.length >= 2 && (kindFilter === 'All' || kindFilter === 'Report')
    ? [
      ...s.reports.filter((r) => (r.id + r.name + r.module + r.question).toLowerCase().includes(q))
        .map((r) => ({ key: r.id, primary: `${r.id} ${r.name}`, secondary: `${r.module} · ${r.source}`, route: `/c11/reports/${r.id}` })),
      ...s.viewsFor().filter((v) => (v.name + v.report).toLowerCase().includes(q))
        .map((v) => ({ key: v.id, primary: v.name, secondary: `Saved view · ${v.report} · ${v.visibility.toLowerCase()}`, route: `/c11/views` }))
    ]
    : [];

  /* C10 — a country, a parameter and a change request are searchable, because a
   * configuration question usually starts from one of those three. */
  const configHits = q.length >= 2 && (kindFilter === 'All' || kindFilter === 'Configuration')
    ? [
      ...s.countryConfigs.filter((c) => (c.country + c.iso + c.localCurrency).toLowerCase().includes(q))
        .map((c) => ({ key: c.code, primary: c.country, secondary: `${c.status} · version ${c.version || '—'} · ${c.localCurrency}`, route: `/c10/countries/${c.country}` })),
      ...s.changeRequests.filter((r) => (r.id + r.parameter + r.cls).toLowerCase().includes(q))
        .map((r) => ({ key: r.id, primary: `${r.id} — ${r.parameter}`, secondary: `${r.cls} · ${r.status} · effective ${r.effectiveFrom}`, route: `/c10/changes/${r.id}` }))
    ]
    : [];

  /* C12 / WF-C12-02 — an interface is found by its name, its external system or its business owner.
   * A support call about integration quotes one of those three, not a correlation reference. */
  const integrationHits = q.length >= 2 && (kindFilter === 'All' || kindFilter === 'Integration')
    ? s.interfaces.filter((i) => (i.id + i.name + i.externalSystem + i.businessOwner + i.purpose).toLowerCase().includes(q))
      .map((i) => ({
        key: i.id,
        primary: `${i.id} — ${i.name}`,
        secondary: `${i.externalSystem} · ${i.direction} · ${i.active ? 'active' : 'not active'} · owner ${i.businessOwner}`,
        route: `/c12/interfaces/${i.id}`
      }))
    : [];

  /* C9 / WF-C9-01, WF-C9-02 — an incident is found by its error reference and an exchange by its
   * correlation reference. These are the two strings a support call actually quotes. */
  const technicalHits = q.length >= 2 && (kindFilter === 'All' || kindFilter === 'Technical')
    ? [
      ...s.incidents.filter((i) => (i.errorRef + i.operation + i.component).toLowerCase().includes(q))
        .map((i) => ({ key: i.id, primary: i.errorRef, secondary: `${i.classification} · ${i.component} · ${i.status}`, route: `/c9/incidents/${i.id}` })),
      ...s.exchanges.filter((e) => (e.correlation + e.interfaceName).toLowerCase().includes(q))
        .map((e) => ({ key: e.id, primary: e.correlation, secondary: `${e.interfaceName} · ${e.direction} · ${e.outcome}`, route: `/c9/exchanges/${e.correlation}` }))
    ]
    : [];
  const grouped = objectHits.reduce<Record<string, InfoObject[]>>((acc, o) => {
    (acc[o.kind] = acc[o.kind] || []).push(o);
    return acc;
  }, {});
  const totalHits = objectHits.length + userHits.length + requestHits.length + commentHits.length + technicalHits.length + configHits.length + reportHits.length + integrationHits.length;

  /* C10 / WF-C10-01 / Steps 3 and 9 — the effective configuration drives the menu.
   * Entries whose process step does not apply in the active country are absent. */
  const hiddenForCountry = s.hiddenRoutes(s.activeCountry);
  /**
   * The sub-entries of whichever tile is open.
   *
   * `openTier` is a namespaced key so tiles from different module sets cannot collide: a Core tile
   * is its own code (`C1`), and a supplied tile is `<setCode>:<tileCode>`. Core's entries come from
   * SUB_MODULES as they always have; a supplied tile carries its own.
   */
  /* v1.2 — the menu appears by privilege. With no provider every tile is shown, as before. */
  const visibleTiles = React.useMemo(
    () => (ext.canSeeModule ? MODULE_TILES.filter((t) => ext.canSeeModule!(t.code)) : MODULE_TILES),
    [ext],
  );

  const suppliedTiles = React.useMemo(() => {
    const out = new Map<string, ShellModuleTile>();
    for (const set of ext.moduleSets ?? []) {
      for (const tile of set.tiles ?? []) out.set(`${set.code}:${tile.code}`, tile);
    }
    return out;
  }, [ext.moduleSets]);

  /**
   * The tier that is actually open, which is not always the one in state.
   *
   * `openTier` starts at C1 so the menu opens with something showing. C1 is Identity and Access, and
   * an account without Administration scope may not see it — but the strip was rendering its
   * sub-modules anyway, because the entries were read straight from SUB_MODULES with no reference to
   * what the account may see. Access Requests, User Register, Role Catalogue and the rest were listed
   * to every account. The tile was correctly hidden, so the leak was only in the strip beneath it.
   *
   * A tier is open only if the account can see the tile it belongs to.
   */
  const effectiveOpenTier = React.useMemo(() => {
    if (!openTier) return null;
    if (openTier.includes(':')) return suppliedTiles.has(openTier) ? openTier : null;
    return visibleTiles.some((t) => t.code === openTier) ? openTier : null;
  }, [openTier, suppliedTiles, visibleTiles]);

  const allTierEntries = effectiveOpenTier
    ? suppliedTiles.get(effectiveOpenTier)?.children ?? SUB_MODULES[effectiveOpenTier] ?? []
    : [];

  /** What the strip calls the open tile — its name, with its code beside it where it has one. */
  const openTierLabel = React.useMemo(() => {
    if (!effectiveOpenTier) return null;
    const supplied = suppliedTiles.get(effectiveOpenTier!);
    if (supplied) return supplied.label;
    const core = MODULE_TILES.find((t) => t.code === effectiveOpenTier);
    return core ? `${core.label} (${core.code})` : effectiveOpenTier;
  }, [effectiveOpenTier, suppliedTiles]);
  const tierEntries = allTierEntries.filter((i) => !i.route || !hiddenForCountry.includes(i.route));
  const hiddenHere = allTierEntries.filter((i) => i.route && hiddenForCountry.includes(i.route));

  const obj = INFO_OBJECTS.find((o) => o.id === infocard);
  const infoUser = s.users.find((u) => u.id === infocard);
  const help = MODULE_HELP.find((m) => m.code === helpModule)!;

  const INFO_TABS = (o: InfoObject) =>
    ['Summary', 'Current status', 'Related documents', 'Recent activity', 'Related transactions', 'Comments']
      .filter((t) => !(o.restrictedTabs ?? []).includes(t));

  /**
   * The open tile's screens, rendered directly beneath the band that owns the tile.
   *
   * It used to be one strip at the foot of the menu. That was fine when the menu held one band of
   * Core tiles; with a band per module set the foot of the menu is a long way down, and clicking a
   * tile put its screens several hundred pixels below the fold — the click appeared to do nothing.
   * So the strip goes where the click was.
   */
  const tierStrip = (
    <Box sx={{ mt: 1.5 }}>
      <Typography sx={{ color: '#fff', opacity: 0.8, fontSize: 12.5, mb: 1 }}>
        {openTierLabel} — its screens
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {tierEntries.map((i) => (
          <Chip
            key={i.label} label={i.label} variant="outlined"
            onClick={() => { if (i.route) { navigate(i.route); setTiles(false); } }}
            sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}
          />
        ))}
      </Box>
      {/* C10 / WF-C10-01 / Steps 3 and 9 — the effective country configuration drives the menu.
          A step that does not apply is absent, and the menu says so rather than leaving a gap. */}
      {hiddenHere.length > 0 && (
        <Box sx={{ mt: 1.5, p: 1.25, border: '1px dashed rgba(255,255,255,0.4)', borderRadius: 1 }}>
          <Typography sx={{ color: '#fff', fontSize: 12 }}>
            {hiddenHere.length} entr{hiddenHere.length === 1 ? 'y is' : 'ies are'} hidden in {s.activeCountry}:{' '}
            {hiddenHere.map((h) => h.label).join(', ')} — the process step does not apply in this country
            (C10 / WF-C10-01 / Step 3).
          </Typography>
          <Chip
            size="small" label="Open process configuration" variant="outlined"
            onClick={() => { navigate(`/c10/countries/${s.activeCountry}/steps`); setTiles(false); }}
            sx={{ mt: 1, color: '#fff', borderColor: 'rgba(255,255,255,0.6)' }}
          />
        </Box>
      )}
    </Box>
  );

  return (
    <ShellCtx.Provider value={api}>
      <Box sx={{ minHeight: '100%', bgcolor: tokens.background, pb: 6 }}>
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: tokens.primary }}>
          <Toolbar variant="dense" sx={{ gap: 1 }}>
            <IconButton edge="start" color="inherit" onClick={() => setTiles(true)} aria-label="menu"><MenuIcon /></IconButton>
            <Typography sx={{ fontWeight: 700, letterSpacing: 1, cursor: 'pointer' }} onClick={() => navigate('/home')}>COTS</Typography>
            <Box sx={{ flex: 1 }} />

            {s.dirty && (
              <Tooltip disableInteractive title={`Unsaved changes on this screen: ${s.dirty}`}>
                <Chip size="small" label="Unsaved changes" sx={{ bgcolor: '#D9660B', color: '#fff', height: 22 }} />
              </Tooltip>
            )}

            <Tooltip disableInteractive title={multiCountry
              ? `Active country — ${ctx?.currency}, ${ctx?.calendar}. Switching reloads the context (C2 / WF-C2-01 / Step 8)`
              : 'You are scoped to a single country, so the selector is read-only (Step 2)'}>
              <Box>
                {multiCountry ? (
                  <FormControl size="small" variant="standard" sx={{ minWidth: 130 }}>
                    <Select
                      value={s.activeCountry}
                      onChange={(e) => requestCountrySwitch(e.target.value)}
                      disableUnderline
                      sx={{ color: '#fff', fontSize: 13.5, '& .MuiSelect-icon': { color: '#fff' } }}
                      startAdornment={<PublicIcon sx={{ fontSize: 18, mr: 0.5 }} />}
                    >
                      {COUNTRIES.filter((c) => user.countryScope.includes(c)).map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                  </FormControl>
                ) : (
                  <Chip size="small" icon={<PublicIcon sx={{ fontSize: 16, color: '#fff !important' }} />} label={s.activeCountry} sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff' }} />
                )}
              </Box>
            </Tooltip>

            <IconButton color="inherit" onClick={() => setSearchOpen(true)} aria-label="search"><SearchIcon /></IconButton>
            <IconButton color="inherit" onClick={() => { setNotifOpen(true); s.markNotificationsRead(); }} aria-label="notifications">
              <Badge badgeContent={unread} color="error"><NotificationsNoneIcon /></Badge>
            </IconButton>
            <IconButton color="inherit" onClick={() => setHelpOpen(true)} aria-label="help"><HelpOutlineIcon /></IconButton>
            <IconButton color="inherit" onClick={(e) => setProfile(e.currentTarget)} aria-label="profile"><AccountCircleIcon /></IconButton>
          </Toolbar>
        </AppBar>

        <Menu anchorEl={profile} open={!!profile} onClose={() => setProfile(null)}>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 500 }}>{user.name}</Typography>
            <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>{user.userType}</Typography>
            <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>{user.assignments.filter((a) => a.status === 'Active').map((a) => a.role).join(', ') || '—'}</Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => { setProfile(null); api.openInfocard(user.id); }}>My profile (infocard)</MenuItem>
          <MenuItem onClick={() => { setProfile(null); navigate('/c1/delegations'); }}>My delegations</MenuItem>
          <MenuItem onClick={() => { setProfile(null); navigate('/c5/preferences'); }}>My notification preferences</MenuItem>
          <MenuItem onClick={() => { setProfile(null); navigate('/c5/subscriptions'); }}>My subscriptions</MenuItem>
          {/* v1.2 — the integrated screens, supplied from outside. Absent in the standalone prototype. */}
          {(ext.menuEntries ?? []).length > 0 && <Divider />}
          {(ext.menuEntries ?? []).map((e) => (
            <MenuItem key={e.route} onClick={() => { setProfile(null); navigate(e.route); }}>{e.label}</MenuItem>
          ))}
          <Divider />
          <MenuItem onClick={() => { setProfile(null); s.signOut(); navigate('/login'); }}>Sign out</MenuItem>
        </Menu>

        {/* Full-screen module tile menu with the sub-module tier — WF-C2-01 / Steps 5–6 */}
        <Dialog fullScreen open={tiles} onClose={() => setTiles(false)}>
          {/*
            `flexShrink: 0` is doing real work here, and it is easy to delete by accident.

            MUI's dialog paper is a flex column with a definite height — the viewport, on a fullScreen
            dialog. This box asks for `minHeight: 100%`, which resolves against that definite height,
            but as a flex item it still defaults to `flex-shrink: 1`, so once the menu's content grew
            past one screen the box was squashed back to viewport height and its content spilled out
            of it. The visible result was a menu that stopped dead partway down the last row with
            white below it: the *content* scrolled, but the dark background did not follow it.

            That only became visible at v1.4, when the menu gained a band per module set and its
            content stopped fitting on one screen — which is why it looked like a responsive bug and
            went away when the window was made smaller (fewer columns, but also a shorter page at
            browser zoom-out).

            With `flexShrink: 0` the box keeps its content height, the paper scrolls it, and the
            background covers every pixel of it. `pb` gives the last row room to breathe above the
            bottom edge rather than sitting flush against it.
          */}
          <Box
            sx={{
              bgcolor: 'rgba(11,40,60,0.97)',
              minHeight: '100%',
              flexShrink: 0,
              p: { xs: 2, md: 5 },
              pb: { xs: 3, md: 4 },
            }}
          >
            {/*
              Sticky, because the menu scrolls.
              Once its content passed one screen, scrolling down took the close button off the top of
              the window with it — leaving Escape as the only way out of a full-screen dialog, which
              is not a way most people know. The header now stays where it is.
            */}
            <Stack
              direction="row"
              alignItems="center"
              sx={{
                mb: 3,
                position: 'sticky',
                top: 0,
                zIndex: 2,
                bgcolor: 'rgba(11,40,60,0.97)',
                mx: { xs: -2, md: -5 },
                px: { xs: 2, md: 5 },
                pt: { xs: 2, md: 5 },
                mt: { xs: -2, md: -5 },
                pb: 1.5,
              }}
            >
              <IconButton onClick={() => setTiles(false)} sx={{ color: '#fff' }} aria-label="Close the menu"><CloseIcon /></IconButton>
              <Typography sx={{ color: '#fff', ml: 1, fontSize: 18 }}>{ext.menuTitle ?? 'CoreModules'} — {s.activeCountry}</Typography>
              <Box sx={{ flex: 1 }} />
              <Typography sx={{ color: '#fff', opacity: 0.7, fontSize: 12.5, display: { xs: 'none', md: 'block' } }}>
                Items the user has no permission for are not rendered — C2 / WF-C2-01 / Step 5
              </Typography>
            </Stack>
            {/* v1.3 — Core is a named band too, once there are other bands for it to be a peer of. */}
            {(ext.moduleSets ?? []).length > 0 && (
              <Typography sx={{ color: '#fff', opacity: 0.8, fontSize: 12.5, mb: 1 }}>Core Modules</Typography>
            )}
            {/* six across at wide widths, matching the other bands: the twelve Core tiles fit two
                rows instead of three. Four across is kept below `lg`, which is the layout the Core
                prototype was designed at. */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 0.5 }}>
              {visibleTiles.map((t) => (
                <Box
                  key={t.code}
                  onClick={() => { if (t.enabled) setOpenTier(openTier === t.code ? null : t.code); }}
                  sx={{
                    p: { xs: 2, lg: 2.25 }, textAlign: 'center', color: '#fff', cursor: t.enabled ? 'pointer' : 'not-allowed',
                    bgcolor: effectiveOpenTier === t.code ? tokens.primary : t.enabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                    opacity: t.enabled ? 1 : 0.35,
                    outline: '1px solid rgba(255,255,255,0.08)',
                    '&:hover': t.enabled ? { bgcolor: tokens.primary } : {}
                  }}
                >
                  {t.icon}
                  <Typography sx={{ fontSize: 13.5, mt: 1 }}>{t.label}</Typography>
                  <Typography sx={{ fontSize: 11, opacity: 0.7 }}>{t.code}{t.enabled ? '' : ' — later phase'}</Typography>
                </Box>
              ))}
            </Box>

            {/* a Core tile is open — its screens belong here, under the Core band */}
            {effectiveOpenTier && !effectiveOpenTier.includes(':') && tierStrip}

            {/*
              v1.3 — every module set is a band of tiles, and they are peers.

              v1.2 put the other sets underneath the Core twelve as three small dim tiles labelled
              "Other module sets". That made the burger a Core menu with the rest of the product
              appended to it: Export had twenty-three phases behind a single tile that could not be
              expanded, and only Core tiles had a sub-module tier. Each set that supplies its own
              tiles now gets the same grid and the same expand-on-click behaviour as Core's, so one
              menu reaches every module.

              Sets with no tiles of their own — an unbuilt module set — keep the single-tile
              rendering, and are grouped after the rest.
            */}
            {(ext.moduleSets ?? []).filter((m) => (m.tiles ?? []).length > 0).map((set) => (
              <Box key={set.code}>
                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.15)' }} />
                <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1 }}>
                  <Typography sx={{ color: '#fff', opacity: 0.8, fontSize: 12.5 }}>{set.label}</Typography>
                  {set.hint && (
                    <Typography sx={{ color: '#fff', opacity: 0.55, fontSize: 11.5 }}>{set.hint}</Typography>
                  )}
                </Stack>
                {/* six across at wide widths rather than four: eleven Shared tiles fit two rows
                    instead of three, which is most of what made the menu overflow. */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 0.5 }}>
                  {(set.tiles ?? []).map((tile) => {
                    const key = `${set.code}:${tile.code}`;
                    const enabled = tile.enabled !== false;
                    const expandable = (tile.children ?? []).length > 0;
                    return (
                      <Box
                        key={key}
                        onClick={() => {
                          if (!enabled) return;
                          // the Core rule, applied to every set: children expand, no children navigates
                          if (expandable) setOpenTier(openTier === key ? null : key);
                          else { navigate(tile.route); setTiles(false); }
                        }}
                        sx={{
                          p: 1.75, textAlign: 'center', color: '#fff', cursor: enabled ? 'pointer' : 'not-allowed',
                          bgcolor: effectiveOpenTier === key ? tokens.primary : enabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                          opacity: enabled ? 1 : 0.35,
                          outline: '1px solid rgba(255,255,255,0.08)',
                          '&:hover': enabled ? { bgcolor: tokens.primary } : {}
                        }}
                      >
                        <Typography sx={{ fontSize: 13.5 }}>{tile.label}</Typography>
                        <Typography sx={{ fontSize: 11, opacity: 0.7 }}>
                          {tile.hint ?? tile.code}{expandable ? ` · ${tile.children!.length}` : ''}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>

                {/* this set's tile is the open one — its screens belong under this band */}
                {effectiveOpenTier?.startsWith(`${set.code}:`) && tierStrip}
              </Box>
            ))}

            {/* Module sets with no tiles of their own — named in the navigation, not built. */}
            {(ext.moduleSets ?? []).filter((m) => (m.tiles ?? []).length === 0).length > 0 && (
              <>
                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.15)' }} />
                <Typography sx={{ color: '#fff', opacity: 0.8, fontSize: 12.5, mb: 1 }}>Later phases</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 0.5 }}>
                  {(ext.moduleSets ?? []).filter((m) => (m.tiles ?? []).length === 0).map((m) => (
                    <Box
                      key={m.code}
                      onClick={() => { if (m.enabled) { navigate(m.route); setTiles(false); } }}
                      sx={{
                        p: 1.75, textAlign: 'center', color: '#fff', cursor: m.enabled ? 'pointer' : 'not-allowed',
                        bgcolor: m.enabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                        opacity: m.enabled ? 1 : 0.35,
                        outline: '1px solid rgba(255,255,255,0.08)',
                        '&:hover': m.enabled ? { bgcolor: tokens.primary } : {}
                      }}
                    >
                      {/* no large icon: an unbuilt module set does not need to be the tallest thing
                          in the menu, and it was adding a row's worth of height on its own. */}
                      <Typography sx={{ fontSize: 13.5 }}>{m.label}</Typography>
                      <Typography sx={{ fontSize: 11, opacity: 0.7 }}>{m.hint ?? m.code}</Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}

            <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.15)' }} />
            <Typography sx={{ color: '#fff', opacity: 0.55, fontSize: 11.5, mt: 2 }}>
              Each main module expands to its sub-modules, and each sub-module to its process screens — Step 6.
              What appears here is the effective configuration for {s.activeCountry}, not a fixed menu.
            </Typography>
          </Box>
        </Dialog>

        {/* Country switch — real dirty state drives the warning (WF-C2-01 / Step 8) */}
        <Dialog open={countryDialog} onClose={() => setCountryDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontSize: 18 }}>Switch country context</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: 14 }}>
              Switching to <b>{pendingCountry}</b> reloads the session context and re-applies that country's configuration.
            </Typography>
            {COUNTRY_CONTEXT[pendingCountry] && (
              <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5, bgcolor: '#FAFBFC' }}>
                <Typography sx={{ fontSize: 12.5 }}><b>Currency:</b> {COUNTRY_CONTEXT[pendingCountry].currency} · reporting in {COUNTRY_CONTEXT[pendingCountry].reportingCurrency}</Typography>
                <Typography sx={{ fontSize: 12.5 }}><b>Calendar:</b> {COUNTRY_CONTEXT[pendingCountry].calendar}</Typography>
                <Typography sx={{ fontSize: 12.5 }}><b>Season:</b> {COUNTRY_CONTEXT[pendingCountry].season}</Typography>
                {COUNTRY_CONTEXT[pendingCountry].stepsNotApplicable.length > 0 && (
                  <Typography sx={{ fontSize: 12.5 }}><b>Hidden in this country:</b> {COUNTRY_CONTEXT[pendingCountry].stepsNotApplicable.join(', ')}</Typography>
                )}
              </Paper>
            )}
            {s.dirty ? (
              <Alert severity="warning" sx={{ mt: 2, fontSize: 13 }}>
                <b>Unsaved work will be lost.</b>
                <Typography sx={{ fontSize: 13, mt: 0.5 }}>{s.dirty}</Typography>
              </Alert>
            ) : (
              <Alert severity="success" sx={{ mt: 2, fontSize: 12.5 }}>
                No unsaved work on this screen, so nothing will be lost.
              </Alert>
            )}
            <HandOffBanner label="DEPENDENCY" target="C10 / WF-C10-01 Configuring a Country" passed="New active country" returned="Effective configuration version for that country" resumes="C2 / WF-C2-01 / Step 5" />
          </DialogContent>
          <DialogActions>
            <Button variant="outlined" onClick={() => setCountryDialog(false)}>Stay on this screen</Button>
            <Button
              variant="contained" color={s.dirty ? 'warning' : 'primary'}
              onClick={() => { s.setDirty(null); s.setActiveCountry(pendingCountry); setCountryDialog(false); }}
            >
              {s.dirty ? 'Discard and switch' : 'Switch country'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Notification centre — C5 */}
        <Drawer anchor="right" open={notifOpen} onClose={() => setNotifOpen(false)} PaperProps={{ sx: { width: 460 } }}>
          <Box sx={{ bgcolor: tokens.primary, color: '#fff', px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Notifications</Typography>
            <IconButton size="small" sx={{ color: '#fff' }} onClick={() => setNotifOpen(false)}><CloseIcon /></IconButton>
          </Box>
          <List>
            {s.notifications.map((n) => {
              // C5 / WF-C5-01 — the centre line is one notification; the engine's rows sit behind it
              const rows = s.deliveries.filter((d) => d.notificationId === n.id);
              const held = rows.find((d) => d.status === 'Held — quiet hours');
              const needsAck = rows.find((d) => d.requiresAck && !d.acknowledgedAt);
              const acked = rows.find((d) => d.acknowledgedAt);
              const link = n.route ?? rows.find((d) => d.deepLink)?.deepLink;
              return (
                <React.Fragment key={n.id}>
                  <ListItemButton alignItems="flex-start" onClick={() => { if (link) { setNotifOpen(false); navigate(link); } }}>
                    <ListItemText
                      primary={<Typography sx={{ fontSize: 13.5, fontWeight: n.read ? 400 : 600 }}>{n.subject}</Typography>}
                      secondary={
                        <>
                          <Stack direction="row" spacing={0.75} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                            <Chip size="small" label={n.event} sx={{ height: 18, fontSize: 10.5 }} />
                            {n.channels.map((c) => <Chip key={c} size="small" variant="outlined" label={c} sx={{ height: 18, fontSize: 10.5 }} />)}
                            <StatusChip status={n.status} />
                            <Typography sx={{ fontSize: 11, color: tokens.textSecondary }}>{n.at}</Typography>
                          </Stack>
                          {held && (
                            <Typography sx={{ fontSize: 11, color: tokens.amber, mt: 0.5 }}>{held.note}</Typography>
                          )}
                          <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                            {link && (
                              <Button size="small" sx={{ fontSize: 11, p: 0, minWidth: 0 }}
                                      onClick={(e) => { e.stopPropagation(); setNotifOpen(false); navigate(link); }}>
                                Open the record
                              </Button>
                            )}
                            {needsAck && (
                              <Button size="small" sx={{ fontSize: 11, p: 0, minWidth: 0 }}
                                      onClick={(e) => { e.stopPropagation(); s.acknowledgeDelivery(needsAck.id); }}>
                                Acknowledge receipt
                              </Button>
                            )}
                            {!needsAck && acked && (
                              <Typography sx={{ fontSize: 11, color: tokens.green }}>Acknowledged {acked.acknowledgedAt}</Typography>
                            )}
                            {rows.length > 0 && (
                              <Button size="small" sx={{ fontSize: 11, p: 0, minWidth: 0 }}
                                      onClick={(e) => { e.stopPropagation(); setNotifOpen(false); navigate('/c5/deliveries'); }}>
                                Delivery detail ({rows.length} row{rows.length === 1 ? '' : 's'})
                              </Button>
                            )}
                          </Stack>
                        </>
                      }
                    />
                  </ListItemButton>
                  <Divider />
                </React.Fragment>
              );
            })}
          </List>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>
              External recipients receive email or messaging only, never in-app — C5 / WF-C5-01 / Step 4.
              A permanently failed message is surfaced here so it is never silently lost — Step 6.
              Each line is one notification; the delivery log holds a row per recipient per channel behind it.
            </Typography>
            <Button size="small" sx={{ mt: 1 }} onClick={() => { setNotifOpen(false); navigate('/c5/deliveries'); }}>
              Open the delivery log
            </Button>
            <Button size="small" sx={{ mt: 1 }} onClick={() => { setNotifOpen(false); navigate('/c5/preferences'); }}>
              My preferences
            </Button>
          </Box>
        </Drawer>

        {/* Global search grouped by object type — WF-C2-04 / Steps 5–6 */}
        <Drawer anchor="right" open={searchOpen} onClose={() => setSearchOpen(false)} PaperProps={{ sx: { width: 520 } }}>
          <Box sx={{ bgcolor: tokens.primary, color: '#fff', px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Global search</Typography>
            <IconButton size="small" sx={{ color: '#fff' }} onClick={() => setSearchOpen(false)}><CloseIcon /></IconButton>
          </Box>
          <Box sx={{ p: 2 }}>
            <TextField fullWidth size="small" autoFocus placeholder="Reference, name or code" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: 'wrap' }} useFlexGap>
              {['All', 'Contract', 'Supplier', 'Commodity', 'Warehouse', 'Facility', 'Truck', 'Container', 'Vessel', 'Batch', 'User', 'Access request', 'Comment', 'Technical', 'Configuration', 'Report', 'Integration'].map((k) => (
                <Chip
                  key={k} label={k} size="small"
                  variant={kindFilter === k ? 'filled' : 'outlined'}
                  color={kindFilter === k ? 'primary' : 'default'}
                  onClick={() => setKindFilter(k)}
                />
              ))}
            </Stack>
            <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mt: 1.5 }}>
              Results are restricted to <b>{s.activeCountry}</b> and to your permission scope, and are grouped by object type — Step 5.
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap' }} useFlexGap>
              {['contract', 'warehouse', 'sesame', 'container', 'agrotem'].map((ex) => (
                <Chip key={ex} size="small" label={`try "${ex}"`} onClick={() => setQuery(ex)} sx={{ height: 20, fontSize: 10.5 }} />
              ))}
            </Stack>
          </Box>
          <Divider />
          {q.length < 2 ? (
            <EmptyState message="Enter at least two characters" />
          ) : totalHits === 0 ? (
            <EmptyState
              message={`No matches in ${s.activeCountry}`}
              hint="Nothing found within the active country and your permission scope. A record you cannot see is not reported as missing — it is simply outside your scope."
            />
          ) : (
            <List dense>
              {Object.entries(grouped).map(([kind, list]) => (
                <React.Fragment key={kind}>
                  <ListSubheader>{kind} ({list.length})</ListSubheader>
                  {list.map((o) => (
                    <ListItemButton key={o.id} onClick={() => { setSearchOpen(false); api.openInfocard(o.id); }}>
                      <ListItemIcon><InventoryIcon fontSize="small" /></ListItemIcon>
                      <ListItemText
                        primaryTypographyProps={{ fontSize: 13.5 }}
                        primary={o.name}
                        secondary={`${o.id} · ${o.status} · opens the infocard`}
                      />
                    </ListItemButton>
                  ))}
                </React.Fragment>
              ))}
              {userHits.length > 0 && <ListSubheader>User ({userHits.length})</ListSubheader>}
              {userHits.map((u) => (
                <ListItemButton key={u.id} onClick={() => { setSearchOpen(false); navigate(`/c1/users/${u.id}`); }}>
                  <ListItemIcon><BadgeIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primaryTypographyProps={{ fontSize: 13.5 }} primary={u.name} secondary={`${u.userType} · ${u.id}`} />
                </ListItemButton>
              ))}
              {commentHits.length > 0 && <ListSubheader>Comment ({commentHits.length})</ListSubheader>}
              {commentHits.map((c) => (
                <ListItemButton key={c.id} onClick={() => {
                  setSearchOpen(false);
                  if (c.route) navigate(c.route); else navigate('/c6/discussions');
                }}>
                  <ListItemIcon><ForumIcon fontSize="small" /></ListItemIcon>
                  <ListItemText
                    primaryTypographyProps={{ fontSize: 13.5 }}
                    secondaryTypographyProps={{ fontSize: 12 }}
                    primary={c.text.length > 90 ? c.text.slice(0, 89) + '…' : c.text}
                    secondary={`${c.recordName} · ${c.author} · ${c.at}${c.isDecision ? ' · decision comment' : ''}`}
                  />
                </ListItemButton>
              ))}
              {reportHits.length > 0 && <ListSubheader>Report ({reportHits.length})</ListSubheader>}
              {reportHits.map((r) => (
                <ListItemButton key={r.key} onClick={() => { setSearchOpen(false); navigate(r.route); }}>
                  <ListItemIcon><AssessmentIcon fontSize="small" /></ListItemIcon>
                  <ListItemText
                    primaryTypographyProps={{ fontSize: 13.5 }}
                    secondaryTypographyProps={{ fontSize: 12 }}
                    primary={r.primary} secondary={r.secondary}
                  />
                </ListItemButton>
              ))}
              {configHits.length > 0 && <ListSubheader>Configuration ({configHits.length})</ListSubheader>}
              {configHits.map((cf) => (
                <ListItemButton key={cf.key} onClick={() => { setSearchOpen(false); navigate(cf.route); }}>
                  <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                  <ListItemText
                    primaryTypographyProps={{ fontSize: 13.5 }}
                    secondaryTypographyProps={{ fontSize: 12 }}
                    primary={cf.primary} secondary={cf.secondary}
                  />
                </ListItemButton>
              ))}
              {integrationHits.length > 0 && <ListSubheader>Integration ({integrationHits.length})</ListSubheader>}
              {integrationHits.map((i) => (
                <ListItemButton key={i.key} onClick={() => { setSearchOpen(false); navigate(i.route); }}>
                  <ListItemIcon><SyncAltIcon fontSize="small" /></ListItemIcon>
                  <ListItemText
                    primaryTypographyProps={{ fontSize: 13.5 }}
                    secondaryTypographyProps={{ fontSize: 12 }}
                    primary={i.primary} secondary={i.secondary}
                  />
                </ListItemButton>
              ))}
              {technicalHits.length > 0 && <ListSubheader>Technical ({technicalHits.length})</ListSubheader>}
              {technicalHits.map((t) => (
                <ListItemButton key={t.key} onClick={() => { setSearchOpen(false); navigate(t.route); }}>
                  <ListItemIcon><MonitorHeartIcon fontSize="small" /></ListItemIcon>
                  <ListItemText
                    primaryTypographyProps={{ fontSize: 13.5, fontFamily: 'monospace' }}
                    secondaryTypographyProps={{ fontSize: 12 }}
                    primary={t.primary}
                    secondary={t.secondary}
                  />
                </ListItemButton>
              ))}
              {requestHits.length > 0 && <ListSubheader>Access request ({requestHits.length})</ListSubheader>}
              {requestHits.map((r) => (
                <ListItemButton key={r.id} onClick={() => { setSearchOpen(false); navigate(`/c1/access-requests/${r.id}`); }}>
                  <ListItemIcon><FactCheckIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primaryTypographyProps={{ fontSize: 13.5 }} primary={`${r.id} — ${r.requestedForName}`} secondary={r.status} />
                </ListItemButton>
              ))}
            </List>
          )}
        </Drawer>

        {/* Module help, all twelve modules — WF-C2-04 / Step 7 */}
        <Drawer anchor="right" open={helpOpen} onClose={() => setHelpOpen(false)} PaperProps={{ sx: { width: 500 } }}>
          <Box sx={{ bgcolor: tokens.primary, color: '#fff', px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Module help</Typography>
            <IconButton size="small" sx={{ color: '#fff' }} onClick={() => setHelpOpen(false)}><CloseIcon /></IconButton>
          </Box>
          <Box sx={{ p: 2 }}>
            <FormControl size="small" fullWidth sx={{ mb: 2 }}>
              <InputLabel>Module</InputLabel>
              <Select label="Module" value={helpModule} onChange={(e) => setHelpModule(e.target.value)}>
                {MODULE_HELP.map((m) => <MenuItem key={m.code} value={m.code}>{m.code} — {m.title}</MenuItem>)}
              </Select>
            </FormControl>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{help.code} — {help.title}</Typography>
            <Typography sx={{ fontSize: 13.5, mb: 2 }}>{help.description}</Typography>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Functions in this module</Typography>
            <List dense disablePadding>
              {help.functions.map((f) => (
                <ListItemText key={f} primaryTypographyProps={{ fontSize: 13 }} primary={`• ${f}`} sx={{ my: 0.25 }} />
              ))}
            </List>
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>Content last updated {help.updated}</Typography>
              <Box sx={{ flex: 1 }} />
              <Button size="small" disabled>Edit content</Button>
            </Stack>
            <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mt: 1 }}>
              Help is maintained as content rather than code, so it can be updated without a release — Step 7.
              Editing is reserved to the administrator and is a C10 configuration change.
            </Typography>
          </Box>
        </Drawer>

        {/* Infocard — nine object types plus users, six tabs, restricted tabs absent — WF-C2-04 / Steps 1–4 */}
        <Drawer anchor="right" open={!!infocard} onClose={() => setInfocard(null)} PaperProps={{ sx: { width: 560 } }}>
          {obj && (
            <>
              <Box sx={{ bgcolor: tokens.primary, color: '#fff', px: 2, py: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="h6" sx={{ flex: 1 }}>{obj.name}</Typography>
                  <IconButton size="small" sx={{ color: '#fff' }} onClick={() => setInfocard(null)}><CloseIcon /></IconButton>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <Chip size="small" label={obj.kind} sx={{ height: 19, fontSize: 10.5, bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
                  <Typography sx={{ fontSize: 12.5, opacity: 0.9 }}>{obj.id} · {obj.country}</Typography>
                  <Box sx={{ flex: 1 }} />
                  <StatusChip status={obj.status} />
                </Stack>
              </Box>
              <Tabs
                value={infoTab} onChange={(_, v) => setInfoTab(v)} variant="scrollable" scrollButtons="auto"
                sx={{ borderBottom: `1px solid ${tokens.border}`, minHeight: 40 }}
              >
                {INFO_TABS(obj).map((t) => <Tab key={t} label={t} sx={{ minHeight: 40, fontSize: 12.5 }} />)}
              </Tabs>
              <Box sx={{ p: 2, overflowY: 'auto' }}>
                {(() => {
                  const tabs = INFO_TABS(obj);
                  const name = tabs[infoTab] ?? tabs[0];
                  if (name === 'Summary' || name === 'Current status') {
                    const items = name === 'Summary' ? obj.summary : obj.statusDetail;
                    return (
                      <Table size="small">
                        <TableBody>
                          {items.map(([k, v]) => (
                            <TableRow key={k}>
                              <TableCell sx={{ color: tokens.textSecondary, width: 180, border: 0, verticalAlign: 'top' }}>{k}</TableCell>
                              <TableCell sx={{ border: 0 }}>{v}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    );
                  }
                  if (name === 'Related documents') {
                    // C7 / WF-C7-02 — the documents C07 holds for this object, with its access rules
                    const held = s.docsFor(obj.id);
                    return held.length === 0 ? (
                      <>
                        <EmptyState message="No documents on this object" />
                        <HandOffBanner target="C7 / WF-C7-02 Access, Retrieval and Document Register" passed="Object reference" returned="Documents the user is entitled to see" />
                      </>
                    ) : (
                      <>
                        {held.map((d) => {
                          const verdict = s.canOpenDoc(d);
                          return (
                            <Paper key={d.id} variant="outlined" sx={{ p: 1.25, mb: 1 }}>
                              <Typography sx={{ fontSize: 13, color: tokens.primary }}>{d.name}</Typography>
                              <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }} useFlexGap>
                                <Chip size="small" variant="outlined" label={d.docType} sx={{ height: 18, fontSize: 10.5 }} />
                                <Chip size="small" variant="outlined" label={`${d.systemRef} · v${d.version}`} sx={{ height: 18, fontSize: 10.5 }} />
                                {d.validTo && <Chip size="small" variant="outlined" label={`Valid to ${d.validTo}`} sx={{ height: 18, fontSize: 10.5 }} />}
                                {!verdict.ok && <Chip size="small" label="Nominated roles only" sx={{ height: 18, fontSize: 10.5, bgcolor: '#B3261E', color: '#fff' }} />}
                              </Stack>
                              {!verdict.ok && (
                                <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary, mt: 0.5 }}>{verdict.why}</Typography>
                              )}
                            </Paper>
                          );
                        })}
                        <Button size="small" onClick={() => { setInfocard(null); navigate('/c7/register'); }}>Open the document register</Button>
                        <HandOffBanner target="C7 / WF-C7-02 Access, Retrieval and Document Register" passed="Object reference" returned="Documents the user is entitled to see" />
                      </>
                    );
                  }
                  if (name === 'Recent activity') {
                    return (
                      <>
                        {obj.activity.map((a, i) => (
                          <Box key={i} sx={{ mb: 1.25 }}>
                            <Typography sx={{ fontSize: 13 }}>{a.what}</Typography>
                            <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>{a.who} · {a.at}</Typography>
                          </Box>
                        ))}
                        <HandOffBanner target="C8 / WF-C8-02 Using the Audit Trail" passed="Object reference" returned="Business-language activity timeline" />
                      </>
                    );
                  }
                  if (name === 'Related transactions') {
                    return obj.transactions.length === 0 ? <EmptyState message="No related transactions" /> : (
                      <Table size="small">
                        <TableBody>
                          {obj.transactions.map((t) => (
                            <TableRow key={t.ref} hover>
                              <TableCell sx={{ color: tokens.primary, width: 160 }}>{t.ref}</TableCell>
                              <TableCell>{t.what}</TableCell>
                              <TableCell align="right"><StatusChip status={t.status} /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    );
                  }
                  return (
                    <>
                      {/* C6 / WF-C6-01 / Step 1 — the same panel, in the same position, on every record */}
                      <CommentThread
                        recordKey={obj.id} recordName={obj.name} objectType={obj.kind}
                        country={obj.country}
                      />
                      <HandOffBanner target="C6 / WF-C6-01 Commenting on Records" passed="Object reference" returned="Threaded discussion with visibility control" />
                    </>
                  );
                })()}

                {(obj.restrictedTabs ?? []).length > 0 && (
                  <PlaceholderNote>
                    this object has {obj.restrictedTabs!.length} tab(s) your permissions do not cover, so they are
                    absent rather than disabled — the existence of restricted content is not advertised (Step 4).
                  </PlaceholderNote>
                )}
                <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mt: 1.5 }}>
                  The infocard opens over the current screen. Nothing is navigated away from — Step 2.
                </Typography>
              </Box>
            </>
          )}

          {!obj && infoUser && (
            <>
              <Box sx={{ bgcolor: tokens.primary, color: '#fff', px: 2, py: 1.5 }}>
                <Stack direction="row" alignItems="center">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6">{infoUser.name}</Typography>
                    <Typography sx={{ fontSize: 12.5, opacity: 0.85 }}>{infoUser.userType} · {infoUser.id}</Typography>
                  </Box>
                  <IconButton size="small" sx={{ color: '#fff' }} onClick={() => setInfocard(null)}><CloseIcon /></IconButton>
                </Stack>
              </Box>
              <Box sx={{ p: 2 }}>
                <Stack spacing={1}>
                  <Typography sx={{ fontSize: 13 }}><b>Status:</b> {infoUser.status}</Typography>
                  <Typography sx={{ fontSize: 13 }}><b>Organisation unit:</b> {infoUser.orgUnit}</Typography>
                  <Typography sx={{ fontSize: 13 }}><b>Default country:</b> {infoUser.defaultCountry}</Typography>
                  <Typography sx={{ fontSize: 13 }}><b>Country scope:</b> {infoUser.countryScope.join(', ')}</Typography>
                  <Typography sx={{ fontSize: 13 }}><b>Module scope:</b> {infoUser.moduleScope.join(', ')}</Typography>
                  <Typography sx={{ fontSize: 13 }}><b>Roles:</b> {infoUser.assignments.filter((a) => a.status === 'Active').map((a) => a.role).join(', ') || '—'}</Typography>
                  {infoUser.partyRecord && <Typography sx={{ fontSize: 13 }}><b>Linked party:</b> {infoUser.partyRecord}</Typography>}
                  <Typography sx={{ fontSize: 13 }}><b>Last login:</b> {infoUser.lastLogin ?? 'Never'}</Typography>
                </Stack>
                <Button sx={{ mt: 1.5 }} size="small" onClick={() => { setInfocard(null); navigate(`/c1/users/${infoUser.id}`); }}>Open full record</Button>
              </Box>
            </>
          )}
        </Drawer>

        <Outlet />

        <IconButton
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          sx={{ position: 'fixed', right: 20, bottom: 20, bgcolor: tokens.primary, color: '#fff', '&:hover': { bgcolor: tokens.primaryDark } }}
        >
          <KeyboardArrowUpIcon />
        </IconButton>

        <Snackbar
          open={!!s.toast} autoHideDuration={7000} onClose={() => s.setToast(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          {s.toast ? <Alert severity={s.toast.severity} onClose={() => s.setToast(null)} sx={{ maxWidth: 720 }}>{s.toast.message}</Alert> : undefined}
        </Snackbar>
      </Box>
    </ShellCtx.Provider>
  );
};

export const ShellFooterNote: React.FC = () => (
  <Paper variant="outlined" sx={{ mt: 3, p: 1.5, bgcolor: '#FAFBFC' }}>
    <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>
      Prototype for workflow review. All data is static mock data and all behaviour is simulated in the browser — no backend,
      no database, no API, no production authentication. Refreshing the page resets the data.
    </Typography>
  </Paper>
);
