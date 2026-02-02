import React from 'react';

import { CodeOutlined, DataObjectOutlined, EditOutlined, PreviewOutlined } from '@mui/icons-material';
import { Tab, Tabs, Tooltip } from '@mui/material';

import { setSelectedMainTab, useReadOnlyMode, useSelectedMainTab } from '../../documents/editor/EditorContext.js';

export default function MainTabsGroup() {
  const selectedMainTab = useSelectedMainTab();
  const readOnly = useReadOnlyMode();
  const handleChange = (_: unknown, v: unknown) => {
    if (readOnly) return;
    switch (v) {
      case 'json':
      case 'preview':
      case 'editor':
      case 'html':
        setSelectedMainTab(v);
        return;
      default:
        setSelectedMainTab('editor');
    }
  };

  return (
    <Tabs value={selectedMainTab} onChange={handleChange}>
      <Tab
        value="editor"
        label={
          <Tooltip title="Edit">
            <EditOutlined fontSize="small" />
          </Tooltip>
        }
      />
      <Tab
        value="preview"
        label={
          <Tooltip title="Preview">
            <PreviewOutlined fontSize="small" />
          </Tooltip>
        }
      />
      <Tab
        value="html"
        label={
          <Tooltip title="HTML output">
            <CodeOutlined fontSize="small" />
          </Tooltip>
        }
      />
      <Tab
        value="json"
        label={
          <Tooltip title="JSON output">
            <DataObjectOutlined fontSize="small" />
          </Tooltip>
        }
      />
    </Tabs>
  );
}
