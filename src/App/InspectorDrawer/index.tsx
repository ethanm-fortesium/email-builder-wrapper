import React, { useRef } from 'react';

import { Box, Drawer, Tab, Tabs } from '@mui/material';

import {
  setSidebarTab,
  useInspectorDrawerOpen,
  useInspectorDrawerWidth,
  useSelectedSidebarTab,
} from '../../documents/editor/EditorContext.js';

import ConfigurationPanel from './ConfigurationPanel/index.js';
import InspectorResizeHandle from './InspectorResizeHandle.js';
import StylesPanel from './StylesPanel.js';

/** Room in px the drawer always leaves for the canvas when dragged wider. */
const MIN_CANVAS_AREA = 360;

export default function InspectorDrawer({ apiBaseUrl }: { apiBaseUrl: string }) {
  const selectedSidebarTab = useSelectedSidebarTab();
  const inspectorDrawerOpen = useInspectorDrawerOpen();
  const width = useInspectorDrawerWidth();
  const rootRef = useRef<HTMLDivElement>(null);

  // The drawer is fixed within the editor's container (the web component, or the page): it may
  // grow until the canvas next to it has MIN_CANVAS_AREA left.
  const maxWidth = () => {
    const containerWidth = rootRef.current?.parentElement?.getBoundingClientRect().width ?? 0;
    return containerWidth > 0 ? containerWidth - MIN_CANVAS_AREA : Infinity;
  };

  const renderCurrentSidebarPanel = () => {
    switch (selectedSidebarTab) {
      case 'block-configuration':
        return <ConfigurationPanel apiBaseUrl={apiBaseUrl} />;
      case 'styles':
        return <StylesPanel />;
    }
  };

  return (
    <Drawer
      ref={rootRef}
      variant="persistent"
      anchor="right"
      open={inspectorDrawerOpen}
      sx={{
        width: inspectorDrawerOpen ? width : 0,
        // Visible overflow lets the resize handle straddle the drawer's edge; the panel below scrolls.
        '& .MuiDrawer-paper': { width, overflow: 'visible' },
      }}
    >
      <InspectorResizeHandle width={width} maxWidth={maxWidth} />
      <Box sx={{ height: 49, borderBottom: 1, borderColor: 'divider' }}>
        <Box px={2}>
          <Tabs value={selectedSidebarTab} onChange={(_, v) => setSidebarTab(v)}>
            <Tab value="styles" label="Styles" />
            <Tab value="block-configuration" label="Inspect" />
          </Tabs>
        </Box>
      </Box>
      <Box sx={{ height: 'calc(100% - 49px)', overflow: 'auto' }}>{renderCurrentSidebarPanel()}</Box>
    </Drawer>
  );
}
