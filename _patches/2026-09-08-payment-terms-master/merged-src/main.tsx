/**
 * Entry point for the integrated mockup.
 *
 * The Core store and the eleven Shared stores are mounted side by side, exactly as each prototype
 * mounts them on its own. They are separate React contexts, so neither module's state is changed or
 * shared by accident — what crosses the boundary is only what the journey context carries.
 *
 * Routing is on the hash, as in both source prototypes, so the built app also opens straight off a
 * folder with no server.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { HashRouter } from 'react-router-dom';

import { theme as coreTheme } from '@core/theme';
import { StoreProvider as CoreStoreProvider } from '@core/store';

import { StoreProvider as SharedStoreProvider } from '@shared/state/store';
import { S02Provider } from '@shared/state/s02store';
import { S03Provider } from '@shared/state/s03store';
import { S04Provider } from '@shared/state/s04store';
import { S05Provider } from '@shared/state/s05store';
import { S06Provider } from '@shared/state/s06store';
import { S07Provider } from '@shared/state/s07store';
import { S08Provider } from '@shared/state/s08store';
import { S09Provider } from '@shared/state/s09store';
import { S10Provider } from '@shared/state/s10store';
import { S11Provider } from '@shared/state/s11store';

import { JourneyProvider } from './integration/JourneyContext';
import { CountrySync } from './integration/CountrySync';
import { MasterDataSync } from './integration/MasterDataSync';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={coreTheme}>
      <CssBaseline />
      <HashRouter>
        <CoreStoreProvider>
          <SharedStoreProvider>
            <S03Provider>
              <S05Provider>
                <S04Provider>
                  <S06Provider>
                    <S02Provider>
                      <S07Provider>
                        <S09Provider>
                          <S10Provider>
                            <S08Provider>
                              <S11Provider>
                                <JourneyProvider>
                                  {/* v1.4 — one active country. Inside both stores, above the routes. */}
                                  <CountrySync>
                                    {/* v2.8 — payment terms read from the C03 domain that owns
                                        them, rather than from a list inside Export. */}
                                    <MasterDataSync>
                                      <App />
                                    </MasterDataSync>
                                  </CountrySync>
                                </JourneyProvider>
                              </S11Provider>
                            </S08Provider>
                          </S10Provider>
                        </S09Provider>
                      </S07Provider>
                    </S02Provider>
                  </S06Provider>
                </S04Provider>
              </S05Provider>
            </S03Provider>
          </SharedStoreProvider>
        </CoreStoreProvider>
      </HashRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
