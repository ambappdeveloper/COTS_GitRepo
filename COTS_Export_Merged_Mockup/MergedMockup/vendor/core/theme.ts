import { createTheme } from '@mui/material/styles';

export const tokens = {
  primary: '#0F79C4',
  primaryDark: '#0E4C6B',
  background: '#F4F6F8',
  border: '#E0E4E8',
  textPrimary: '#1B2733',
  textSecondary: '#5A6B7B',
  amber: '#C77700',
  green: '#1E7B4F',
  red: '#B3261E',
  grey: '#5A6B7B',
  orange: '#D9660B'
};

/**
 * Status vocabulary consolidated from all twelve workflow documents.
 * See coremodules-shared-shell.md section 2.
 */
export const statusColour = (status: string): string => {
  const s = status.toLowerCase();
  if (['draft', 'returned for amendment', 'returned', 'held — quiet hours', 'held', 'ready with conditions'].includes(s)) return tokens.amber;
  if (['pending approval', 'queued', 'retrying', 'in progress', 'open', 'accepted'].includes(s)) return tokens.primary;
  if (['approved', 'active', 'confirmed', 'delivered', 'matched', 'closed', 'valid', 'complete',
    'released', 'within period', 'acknowledged', 'ready'].includes(s)) return tokens.green;
  if (['rejected', 'refused', 'failed', 'locked', 'expired', 'unmatched', 'permanently failed', 'not ready'].includes(s)) return tokens.red;
  if (['inactive', 'deactivated', 'superseded', 'archived', 'lapsed', 'withdrawn', 'metadata only'].includes(s)) return tokens.grey;
  if (['overdue', 'escalated', 'approaching expiry', 'differing', 'suspended', 'urgent',
    'overdue — notified', 'transient failure, retrying'].includes(s)) return tokens.orange;
  return tokens.grey;
};

export const theme = createTheme({
  palette: {
    primary: { main: tokens.primary, dark: tokens.primaryDark },
    background: { default: tokens.background, paper: '#FFFFFF' },
    text: { primary: tokens.textPrimary, secondary: tokens.textSecondary },
    divider: tokens.border
  },
  typography: {
    fontFamily: 'Roboto, "Segoe UI", Arial, sans-serif',
    h5: { fontWeight: 500 },
    h6: { fontWeight: 500 },
    subtitle2: { fontWeight: 500 },
    body2: { fontSize: 13.5 }
  },
  shape: { borderRadius: 4 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { textTransform: 'none', fontWeight: 500 } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiTableCell: { styleOverrides: { root: { fontSize: 13.5, paddingTop: 8, paddingBottom: 8 }, head: { fontWeight: 500, color: tokens.textSecondary, backgroundColor: '#FAFBFC' } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 500, minHeight: 44 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 500 } } }
  }
});
