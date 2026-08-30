import React from 'react';
import { Box, Paper, Typography, Button, Stack, Chip, Divider } from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { tokens } from '../../theme';
import { COUNTRY_CONTEXT } from '../../mockData/c2';
import { HandOffBanner, PlaceholderNote } from '../../components/shared';

/** WF-C2-01 / Steps 1–3 — country selector presented on landing when the user is scoped to several countries. */
export const CountrySelect: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const user = s.currentUser;
  const [chosen, setChosen] = React.useState<string | null>(null);

  React.useEffect(() => { if (!user) navigate('/login'); }, [user]);
  if (!user) return null;

  const scope = user.countryScope;
  const lastUsed = user.defaultCountry;

  const go = (c: string) => { s.setActiveCountry(c); navigate('/home'); };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: tokens.primaryDark, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Paper sx={{ width: 940, maxWidth: '100%', overflow: 'hidden' }}>
        <Box sx={{ bgcolor: tokens.primary, color: '#fff', px: 3, py: 2.5 }}>
          <Typography variant="h6">Select your country context</Typography>
          <Typography sx={{ fontSize: 13, opacity: 0.9 }}>
            Country is the primary context. It is selected before any module and it filters data, master data,
            configuration and reports for the whole session.
          </Typography>
          <Typography sx={{ fontSize: 11.5, opacity: 0.75, mt: 0.5 }}>
            {user.name} · {user.userType} · scoped to {scope.length} countr{scope.length === 1 ? 'y' : 'ies'} · WF-C2-01 / Steps 1–3
          </Typography>
        </Box>

        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            {scope.map((c) => {
              const ctx = COUNTRY_CONTEXT[c];
              const selected = chosen === c;
              return (
                <Paper
                  key={c} variant="outlined"
                  onClick={() => setChosen(c)}
                  onDoubleClick={() => go(c)}
                  sx={{
                    p: 2, cursor: 'pointer',
                    borderColor: selected ? tokens.primary : tokens.border,
                    borderWidth: selected ? 2 : 1,
                    bgcolor: selected ? '#F2F8FD' : '#fff'
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <PublicIcon sx={{ color: tokens.primary }} />
                    <Typography sx={{ fontSize: 17, fontWeight: 500 }}>{c}</Typography>
                    {c === lastUsed && <Chip size="small" label="Last used" sx={{ height: 19, fontSize: 10.5 }} />}
                  </Stack>
                  <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
                    Local currency {ctx?.currency} · reporting in {ctx?.reportingCurrency}
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>{ctx?.calendar}</Typography>
                  <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>{ctx?.season}</Typography>
                  {ctx && ctx.stepsNotApplicable.length > 0 && (
                    <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary, mt: 0.75, fontStyle: 'italic' }}>
                      Not applicable in this country: {ctx.stepsNotApplicable.join(', ')}
                    </Typography>
                  )}
                </Paper>
              );
            })}
          </Box>

          <Divider sx={{ my: 2.5 }} />

          <HandOffBanner
            label="DEPENDENCY"
            target="C10 / WF-C10-01 Configuring a Country"
            passed="Selected country"
            returned="Effective configuration version — applicable process steps, mandatory fields, local currency, season definition, numbering series"
            resumes="C2 / WF-C2-01 / Step 5"
          />
          <PlaceholderNote>
            how regional and group-level users work where their responsibility genuinely spans countries — a
            reporting-only consolidated view is proposed (WF-C2-01 / Step 9). Transactional screens always operate
            within a single country.
          </PlaceholderNote>

          <Stack direction="row" spacing={1} sx={{ mt: 2 }} justifyContent="space-between">
            <Button variant="outlined" onClick={() => { s.signOut(); navigate('/login'); }}>Sign out</Button>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => go(lastUsed)}>Continue with {lastUsed}</Button>
              <Button variant="contained" disabled={!chosen} onClick={() => chosen && go(chosen)}>Continue</Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
};
