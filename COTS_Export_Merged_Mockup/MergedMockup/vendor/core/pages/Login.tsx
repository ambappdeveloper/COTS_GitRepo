import React from 'react';
import {
  Box, Paper, Typography, TextField, Button, Stack, Alert,
  Divider, MenuItem, Select, FormControl, InputLabel, Checkbox, FormControlLabel, Chip, Collapse
} from '@mui/material';
import WindowIcon from '@mui/icons-material/Window';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { tokens } from '../theme';
import { FormSectionCard, PlaceholderNote, HandOffBanner, ActionBar } from '../components/shared';
import { FAILED_LOGIN_THRESHOLD, LANGUAGES, SESSION_TIMEOUT_MINUTES } from '../mockData';

/**
 * WF-C1-01 Login and Session Establishment.
 *
 * TWO SCREENS, NOT ONE SCREEN WITH TWO TABS
 * -----------------------------------------
 * Step 1 of WF-C1-01 is "COTS presents the appropriate login route". Until now that was a toggle at
 * the top of one form, which made the reader choose the route and then re-read a form that changed
 * under them: the field became an email address, a second factor appeared, the Windows-authentication
 * button vanished, and the session note came and went.
 *
 * The two routes are not two modes of one form. They authenticate against different identity stores,
 * they collect different credentials, and they serve different people — an employee at a workstation,
 * and a supplier or customer on the public internet. So each has its own screen and its own address:
 *
 *   · `/login`           — internal users. Windows authentication first, Active Directory credentials
 *                          below it.
 *   · `/login/external`  — suppliers, customers and partners. External identity store, with a second
 *                          factor where it is enabled for that party type.
 *
 * **Neither screen links to the other, deliberately.** Each audience is given its own address, and an
 * employee is not offered a supplier's sign-in. It also means the demonstration accounts belong to
 * the screen that can actually sign them in — the external account sits on the external screen rather
 * than on a chip that would have to switch route to work.
 *
 * Everything else is unchanged: the failed-attempt count, the lockout threshold and its notification
 * hand-off, the first-login redirect, and the country selector on landing.
 */

/** The state and the submit rule, shared by both screens. `route` decides which accounts are offered. */
function useLoginForm(route: 'Internal' | 'External') {
  const s = useStore();
  const navigate = useNavigate();
  const [selected, setSelected] = React.useState('');
  const [password, setPassword] = React.useState('demo');
  const [secondFactor, setSecondFactor] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [locked, setLocked] = React.useState(false);
  const [attempts, setAttempts] = React.useState(0);

  const candidates = s.users.filter((u) => u.route === route && u.status !== 'Deactivated');
  const chosen = s.users.find((u) => u.id === selected);

  /* The first account of this route, once the store has them. Each screen is fixed to one route, so
     unlike the tabbed version this runs once rather than on every toggle. */
  React.useEffect(() => {
    if (!selected || !candidates.some((u) => u.id === selected)) {
      const first = candidates[0];
      if (first) setSelected(first.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates.length]);

  const submit = () => {
    setError(null); setLocked(false);
    if (!chosen) return;
    if (password !== 'demo') {
      const n = s.recordFailedAttempt(chosen.id);
      setAttempts(n);
      if (n >= FAILED_LOGIN_THRESHOLD) {
        setLocked(true);
        setError(null);
      } else {
        setError('Sign-in was not successful. The attempt has been logged.');
      }
      return;
    }
    const outcome = s.signIn(chosen.id);
    if (outcome === 'locked') { setLocked(true); return; }
    if (outcome === 'refused') {
      setError('Sign-in was not successful. The attempt has been logged.');
      return;
    }
    if (outcome === 'first-login') { navigate('/first-login'); return; }
    // C2 / WF-C2-01 / Steps 2–3 — several countries in scope means the selector is presented on landing
    navigate(chosen.countryScope.length > 1 ? '/select-country' : '/home');
  };

  const reset = () => { setPassword('demo'); setError(null); setLocked(false); };

  return {
    candidates, chosen, selected, setSelected,
    password, setPassword, secondFactor, setSecondFactor,
    error, locked, attempts, submit, reset,
  };
}

/** The card both screens sit in — the same chrome, so the two routes read as one product. */
const LoginCard: React.FC<{ subtitle: string; children: React.ReactNode; footer: React.ReactNode; onReset: () => void; onSubmit: () => void }> = ({
  subtitle, children, footer, onReset, onSubmit,
}) => (
  <Box sx={{ minHeight: '100vh', bgcolor: tokens.primaryDark, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
    <Paper sx={{ width: 620, maxWidth: '100%', overflow: 'hidden' }}>
      <Box sx={{ bgcolor: tokens.primary, color: '#fff', px: 3, py: 2.5 }}>
        <Typography component="h1" sx={{ fontSize: 26, fontWeight: 700, letterSpacing: 2 }}>COTS</Typography>
        <Typography sx={{ fontSize: 13, opacity: 0.9 }}>Commodity Operations and Trade System</Typography>
        <Typography sx={{ fontSize: 11.5, opacity: 0.75, mt: 0.5 }}>CoreModules prototype — WF-C1-01 Login and Session Establishment</Typography>
      </Box>

      <Box sx={{ p: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>{subtitle}</Typography>
        {children}
      </Box>

      <ActionBar
        left={<Button variant="outlined" onClick={onReset}>Reset</Button>}
        right={<Button variant="contained" onClick={onSubmit}>Sign in</Button>}
      />

      <Box sx={{ px: 3, pb: 3 }}>
        <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mb: 1 }}>Demonstration accounts</Typography>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>{footer}</Stack>
      </Box>
    </Paper>
  </Box>
);

/** The failure states, identical on both routes — the message is neutral by design (Step 3). */
const LoginFeedback: React.FC<{ error: string | null; locked: boolean; attempts: number }> = ({ error, locked, attempts }) => (
  <>
    {error && (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
        <Typography sx={{ fontSize: 12, mt: 0.5 }}>
          Failed attempt {attempts} of {FAILED_LOGIN_THRESHOLD}. A neutral message is shown deliberately — WF-C1-01 / Step 3.
        </Typography>
      </Alert>
    )}

    <Collapse in={locked}>
      <Alert severity="error" sx={{ mt: 2 }}>
        <b>Access refused — the account is locked.</b>
        <Typography sx={{ fontSize: 13, mt: 0.5 }}>
          The configured failed-login threshold of {FAILED_LOGIN_THRESHOLD} has been reached. The account has been locked,
          the attempt has been logged, and the system administrator has been notified.
        </Typography>
        <HandOffBanner
          target="C5 / WF-C5-01 Event-Driven Notifications"
          passed="User, account, lockout event, system administrator recipient role"
          returned="Dispatch outcome per channel"
          resumes="No return — access is refused and the login attempt ends"
        />
      </Alert>
    </Collapse>
  </>
);

/** WF-C1-01 — the internal login route. Employees, at `/login`. */
export const Login: React.FC = () => {
  const f = useLoginForm('Internal');

  return (
    <LoginCard
      subtitle="Internal user — Active Directory"
      onReset={f.reset}
      onSubmit={f.submit}
      footer={
        <>
          <Chip size="small" label="Nasreen Sayed — administrator, three countries" onClick={() => f.setSelected('U-001')} />
          <Chip size="small" label="Ahmed Osman — single country" onClick={() => f.setSelected('U-002')} />
          <Chip size="small" label="Joseph Mwangi — locked account" onClick={() => f.setSelected('U-004')} />
          <Chip size="small" label="Salma Bakri — first login" onClick={() => f.setSelected('U-009')} />
          <Chip size="small" label="Fatima Idris — internal stakeholder" onClick={() => f.setSelected('U-005')} />
        </>
      }
    >
      <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
        Integrated Windows authentication is attempted first. Where it is unavailable, Active Directory credentials are entered below.
      </Alert>
      <Button fullWidth variant="outlined" startIcon={<WindowIcon />} sx={{ mb: 2 }} onClick={f.submit}>
        Sign in with Windows authentication
      </Button>
      <Divider sx={{ mb: 2 }}><Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>or enter credentials</Typography></Divider>

      <Stack spacing={2}>
        <FormControl size="small" fullWidth>
          <InputLabel>User name</InputLabel>
          <Select label="User name" value={f.selected} onChange={(e) => f.setSelected(e.target.value)}>
            {f.candidates.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.email.split('@')[0]} — {u.name}
                {u.status !== 'Active' && ` (${u.status})`}
                {u.firstLogin && ' (first login)'}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField size="small" fullWidth type="password" label="Password" value={f.password} onChange={(e) => f.setPassword(e.target.value)} helperText={'Type "demo" to succeed, anything else to demonstrate a failed attempt.'} />
      </Stack>

      <LoginFeedback error={f.error} locked={f.locked} attempts={f.attempts} />

      <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mt: 2 }}>
        A session is created with a {SESSION_TIMEOUT_MINUTES}-minute inactivity timeout and a configured absolute length,
        the login event is written to the audit trail (C8), and the user's country and module scope is passed to C2.
      </Typography>
    </LoginCard>
  );
};

/** WF-C1-01 — the external login route. Suppliers, customers and partners, at `/login/external`. */
export const ExternalLogin: React.FC = () => {
  const f = useLoginForm('External');

  return (
    <LoginCard
      subtitle="External user — supplier, customer or partner"
      onReset={f.reset}
      onSubmit={f.submit}
      footer={<Chip size="small" label="Agrotem Trading — external portal" onClick={() => f.setSelected('U-006')} />}
    >
      <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
        Credentials are validated against the external identity store, with a second factor where it is enabled for that party type.
      </Alert>

      <Stack spacing={2}>
        <FormControl size="small" fullWidth>
          <InputLabel>Email address</InputLabel>
          <Select label="Email address" value={f.selected} onChange={(e) => f.setSelected(e.target.value)}>
            {f.candidates.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.email} — {u.name}
                {u.status !== 'Active' && ` (${u.status})`}
                {u.firstLogin && ' (first login)'}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField size="small" fullWidth type="password" label="Password" value={f.password} onChange={(e) => f.setPassword(e.target.value)} helperText={'Type "demo" to succeed, anything else to demonstrate a failed attempt.'} />
        <TextField size="small" fullWidth label="Second factor code" value={f.secondFactor} onChange={(e) => f.setSecondFactor(e.target.value)} placeholder="481920" />
        <PlaceholderNote>is a second authentication factor required for external users, and who bears the cost of the channel? (WF-C1-01 / Step 2)</PlaceholderNote>
      </Stack>

      <LoginFeedback error={f.error} locked={f.locked} attempts={f.attempts} />
    </LoginCard>
  );
};

/** WF-C1-01 / Step 6 — first-login profile confirmation and acceptance of usage terms */
export const FirstLogin: React.FC = () => {
  const s = useStore();
  const navigate = useNavigate();
  const u = s.pendingFirstLogin;
  const [name, setName] = React.useState(u?.name ?? '');
  const [email, setEmail] = React.useState(u?.email ?? '');
  const [tel, setTel] = React.useState('');
  const [language, setLanguage] = React.useState(u?.language ?? 'English');
  const [country, setCountry] = React.useState(u?.defaultCountry ?? '');
  const [accepted, setAccepted] = React.useState(false);
  const [showTerms, setShowTerms] = React.useState(false);

  React.useEffect(() => { if (!u) navigate('/login'); }, [u]);
  if (!u) return null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: tokens.background, p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        <Paper sx={{ overflow: 'hidden', mb: 2 }}>
          <Box sx={{ bgcolor: tokens.primary, color: '#fff', px: 3, py: 2 }}>
            <Typography variant="h6">Confirm your profile and accept the system usage terms</Typography>
            <Typography sx={{ fontSize: 12.5, opacity: 0.85 }}>WF-C1-01 / Step 6 — mandatory on first login. No navigation is available until this is completed.</Typography>
          </Box>
        </Paper>

        <FormSectionCard
          title="Profile"
          note={<PlaceholderNote>which Active Directory attributes are authoritative (department, manager, country) and which are maintained in COTS? Fields shown read-only assume Active Directory is authoritative.</PlaceholderNote>}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <TextField size="small" label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
            <TextField size="small" label="Contact email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <TextField size="small" label="Contact telephone" value={tel} onChange={(e) => setTel(e.target.value)} />
            <TextField size="small" label="Organisation unit" value={u.orgUnit} InputProps={{ readOnly: true }} helperText="From Active Directory" />
            <FormControl size="small">
              <InputLabel>Preferred language</InputLabel>
              <Select label="Preferred language" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small">
              <InputLabel>Default country</InputLabel>
              <Select label="Default country" value={country} onChange={(e) => setCountry(e.target.value)}>
                {u.countryScope.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </FormSectionCard>

        <FormSectionCard title="System usage terms">
          <FormControlLabel
            control={<Checkbox checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />}
            label={<Typography sx={{ fontSize: 13.5 }}>I accept the COTS system usage terms</Typography>}
          />
          <Button size="small" onClick={() => setShowTerms(!showTerms)}>{showTerms ? 'Hide' : 'Read'} the terms</Button>
          <Collapse in={showTerms}>
            <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: '#FAFBFC' }}>
              <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
                Placeholder text. Access is granted for authorised business use within the countries and modules assigned to your account.
                All activity is recorded in the audit trail. Credentials must not be shared. Authority may only be delegated within your own permission ceiling.
              </Typography>
            </Paper>
          </Collapse>
        </FormSectionCard>

        <ActionBar
          left={<Button variant="outlined" onClick={() => navigate('/login')}>Sign out</Button>}
          right={
            <Button
              variant="contained"
              disabled={!accepted || !name || !email || !country}
              onClick={() => {
                s.completeFirstLogin({ name, email, telephone: tel, language, defaultCountry: country });
                navigate(u.countryScope.length > 1 ? '/select-country' : '/home');
              }}
            >
              Confirm and continue
            </Button>
          }
        />
      </Box>
    </Box>
  );
};
