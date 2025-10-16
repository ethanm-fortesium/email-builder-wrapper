import React from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';

import App from './App';
import theme from './theme';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element with id "root" not found. Check your index.html.');
}

createRoot(rootEl).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);