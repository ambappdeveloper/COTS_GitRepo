import React from 'react';
import ReactDOM from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { theme } from './theme';
import { StoreProvider } from './state/store';
import { S03Provider } from './state/s03store';
import { S05Provider } from './state/s05store';
import { S04Provider } from './state/s04store';
import { S06Provider } from './state/s06store';
import { S02Provider } from './state/s02store';
import { S07Provider } from './state/s07store';
import { S09Provider } from './state/s09store';
import { S10Provider } from './state/s10store';
import { S08Provider } from './state/s08store';
import { S11Provider } from './state/s11store';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <StoreProvider>
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
                              <App />
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
        </StoreProvider>
      </HashRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
