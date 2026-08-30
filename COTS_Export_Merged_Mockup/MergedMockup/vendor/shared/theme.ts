import { createTheme } from '@mui/material/styles';

// Palette sampled from the CTRM reference application (visual reference only).
export const COLORS = {
  primary: '#0084C7',
  primaryDark: '#0E4C6B',
  surface: '#FFFFFF',
  background: '#F3F3F3',
  border: '#E0E4E8',
  textPrimary: '#1B2733',
  textSecondary: '#5A6B7B',
  required: '#C4400B',
  // status groups — fixed once, used identically in every module
  draft: '#C77700',
  progress: '#0F79C4',
  good: '#1E7B4F',
  bad: '#B3261E',
  neutral: '#5A6B7B',
  attention: '#D9660B',
};

export const theme = createTheme({
  palette: {
    primary: { main: COLORS.primary },
    background: { default: COLORS.background, paper: COLORS.surface },
    text: { primary: COLORS.textPrimary, secondary: COLORS.textSecondary },
    divider: COLORS.border,
  },
  typography: {
    fontFamily: 'Roboto, "Segoe UI", Arial, sans-serif',
    fontSize: 13.5,
    h6: { fontSize: '1.05rem', fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
  },
  shape: { borderRadius: 4 },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { textTransform: 'none' } } },
    MuiTableCell: { styleOverrides: { root: { fontSize: '0.82rem', padding: '6px 10px' } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', minHeight: 40 } } },
  },
});
