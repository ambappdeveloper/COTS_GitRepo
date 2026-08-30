/**
 * What a Shared screen shows when it cannot render for the country the session is in — v1.5.
 *
 * WHY A BOUNDARY, AND WHY HERE
 * ----------------------------
 * The Shared prototype was written against its own country selector, so several screens reach into a
 * country-keyed table with a non-null assertion and read the result without checking:
 *
 *     const cm = COUNTRY_MODELS.find((c) => c.country === country)!;   // S05
 *     const season = SEASONS.find(…) ?? SEASONS.find((s) => s.country === country)!;   // S01
 *
 * Standalone those hold. Integrated, the country comes from the Core session, which offers countries
 * the Shared tables were never seeded for — and an unguarded `undefined` in a React render does not
 * fail politely. It unmounts the whole tree: a white page, and every screen visited afterwards blank
 * until the browser is reloaded. One missing table row took the application down.
 *
 * `SharedCountryModels.ts` supplies the row S05 was missing, from the configuration that owns it, and
 * `CountrySync` stops a country inheriting the previous country's season. Between them the known
 * cases are answered. This boundary is for the ones that are not: it holds the failure inside the one
 * screen, keeps the shell, the menu and the session alive, and says what happened in words a reviewer
 * can act on.
 *
 * WHAT IT SAYS, AND WHAT IT REFUSES TO SAY
 * ----------------------------------------
 * It reports the country, the screen and the underlying error, and it names the likely cause — that
 * this prototype holds no records for that country — as the *probable* reading rather than a verdict.
 * It does not retry, does not substitute another country's data, and does not present an empty screen
 * as though it had rendered. A screen that cannot answer for a country is a question for the business
 * about whether that country is in scope, and it should reach the reviewer looking like one.
 *
 * This is deliberately not a general-purpose error screen. It is scoped to the Shared frame, it says
 * "for {country}" because that is overwhelmingly what breaks here, and it says "probably" because it
 * cannot prove it.
 */

import React from 'react';
import { Alert, AlertTitle, Box, Button, Stack, Typography } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '@shared/state/store';
import { useCountryAlignment } from '../integration/CountrySync';

interface Props {
  /** what to call the screen in the message — its address, since the title is inside the throw */
  title: string;
  /** the country the session is in when the failure happens */
  country: string;
  /** false when this prototype holds no records for that country — the likely cause */
  seeded: boolean;
  children: React.ReactNode;
}

interface State {
  error: Error | null;
  /** the country the caught error belongs to, so switching country clears it */
  errorCountry: string | null;
}

export class SharedScreenBoundary extends React.Component<Props, State> {
  state: State = { error: null, errorCountry: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    /* A failure belongs to the country it happened in. Switch country and the screen tries again. */
    if (state.error && state.errorCountry === null) return { errorCountry: props.country };
    if (state.error && state.errorCountry !== props.country) return { error: null, errorCountry: null };
    return null;
  }

  componentDidCatch(error: Error) {
    /* Left in the console on purpose: the stack is how the real cause gets found. */
    console.error(`[cots] a Shared screen failed to render for ${this.props.country}:`, error);
  }

  render() {
    const { error } = this.state;
    const { title, country, seeded, children } = this.props;
    if (!error) return children;

    return (
      <Box sx={{ px: 3, py: 2 }}>
        <Alert severity="warning">
          <AlertTitle sx={{ fontSize: 14 }}>
            This screen cannot be shown for {country}
          </AlertTitle>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <b>{title}</b> stopped while rendering.{' '}
            {seeded ? (
              <>The Shared modules prototype does hold records for {country}, so this is a fault in the screen
              rather than missing data.</>
            ) : (
              <>The Shared modules prototype holds no records for {country}, and this screen reads its country
              table without allowing for that — so it is very probably the cause.</>
            )}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Nothing has been substituted from another country, and nothing is shown as though it had loaded.
            Whether {country} is in scope for this module is a <b>business confirmation</b>; until it is
            answered this screen has nothing to show for it.
          </Typography>
          <Typography
            variant="caption"
            component="pre"
            sx={{
              display: 'block',
              m: 0,
              mb: 1.5,
              p: 1,
              bgcolor: 'rgba(0,0,0,0.05)',
              borderRadius: 1,
              whiteSpace: 'pre-wrap',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            }}
          >
            {error.message || String(error)}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button size="small" variant="outlined" component={Link} to="/modules">
              All modules
            </Button>
            <Button size="small" variant="text" onClick={() => this.setState({ error: null, errorCountry: null })}>
              Try this screen again
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Switching the country in the header clears this automatically — the rest of the application is
            unaffected.
          </Typography>
        </Alert>
      </Box>
    );
  }
}

/**
 * The boundary with its arguments filled in from the session — what `App.tsx` actually mounts.
 *
 * It has to be above the Shared page component rather than inside `SharedPageFrame`, because the
 * throws worth catching happen in the page's own body, before the frame is reached. Mounting it on
 * the `SharedArea` route element puts it above every `/s01…/s11` screen at once, so no page needs to
 * opt in and none can be forgotten.
 *
 * The address is used as the screen's name: the title lives inside the component that threw.
 */
export function SharedScreenGuard({ children }: { children: React.ReactNode }) {
  const { country } = useStore();
  const alignment = useCountryAlignment();
  const { pathname } = useLocation();
  return (
    <SharedScreenBoundary
      /* Remounting on the address means an old failure never shows over a new screen. */
      key={pathname}
      title={pathname}
      country={country}
      seeded={alignment?.seeded ?? true}
    >
      {children}
    </SharedScreenBoundary>
  );
}

export default SharedScreenBoundary;
