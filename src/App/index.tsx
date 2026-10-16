import React from 'react';

import { Alert, Snackbar, Stack, useTheme } from '@mui/material';

import {
  dismissToast,
  useInspectorDrawerOpen,
  useInspectorDrawerResizing,
  useInspectorDrawerWidth,
  useToast,
} from '../documents/editor/EditorContext.js';

import InspectorDrawer from './InspectorDrawer/index.js';
import TemplatePanel from './TemplatePanel/index.js';

function useDrawerTransition(cssProperty: 'margin-left' | 'margin-right', open: boolean) {
  const { transitions } = useTheme();
  return transitions.create(cssProperty, {
    easing: !open ? transitions.easing.sharp : transitions.easing.easeOut,
    duration: !open ? transitions.duration.leavingScreen : transitions.duration.enteringScreen,
  });
}

interface AppProps {
  apiBaseUrl: string;
}

export default function App({ apiBaseUrl }: AppProps) {
  const inspectorDrawerOpen = useInspectorDrawerOpen();
  const inspectorDrawerWidth = useInspectorDrawerWidth();
  const inspectorDrawerResizing = useInspectorDrawerResizing();
  const toast = useToast();

  const marginRightTransition = useDrawerTransition('margin-right', inspectorDrawerOpen);

  return (
    <>
      <InspectorDrawer apiBaseUrl={apiBaseUrl} />

      <Stack
        sx={{
          marginRight: inspectorDrawerOpen ? `${inspectorDrawerWidth}px` : 0,
          // No easing while the drawer's edge is dragged: the canvas follows the pointer.
          transition: inspectorDrawerResizing ? 'none' : marginRightTransition,
        }}
      >
        <TemplatePanel />
      </Stack>

      {toast !== null && (
        <Snackbar
          key={toast.id}
          open
          autoHideDuration={3500}
          onClose={() => dismissToast()}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={toast.severity} variant="filled" onClose={() => dismissToast()}>
            {toast.message}
          </Alert>
        </Snackbar>
      )}
    </>
  );
}
