import React from 'react';

import { AppRegistrationOutlined, LastPageOutlined } from '@mui/icons-material';
import { IconButton } from '@mui/material';

import { toggleInspectorDrawerOpen, useInspectorDrawerOpen, useReadOnlyMode } from '../../documents/editor/EditorContext.js';

export default function ToggleInspectorPanelButton() {
  const inspectorDrawerOpen = useInspectorDrawerOpen();
  const readOnly = useReadOnlyMode();

  if (readOnly) {
    return null;
  }

  const handleClick = () => {
    toggleInspectorDrawerOpen();
  };
  if (inspectorDrawerOpen) {
    return (
      <IconButton onClick={handleClick}>
        <LastPageOutlined fontSize="small" />
      </IconButton>
    );
  }
  return (
    <IconButton onClick={handleClick}>
      <AppRegistrationOutlined fontSize="small" />
    </IconButton>
  );
}
