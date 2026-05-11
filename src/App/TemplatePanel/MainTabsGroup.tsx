import React from 'react';

import { CodeOutlined, DataObjectOutlined, EditOutlined, PreviewOutlined } from '@mui/icons-material';
import { Tab, Tabs, Tooltip } from '@mui/material';

import { setSelectedMainTab, useReadOnlyMode, useSelectedMainTab } from '../../documents/editor/EditorContext.js';

/**
 * Render the main editor tabs allowing selection between Editor, Preview, HTML, and JSON views.
 *
 * The component reads the current selected tab and read-only mode from editor context.
 * When not in read-only mode, selecting a tab updates the selected main tab; unknown values default to `'editor'`.
 *
 * @returns A Material UI `Tabs` element containing four `Tab` items for the `editor`, `preview`, `html`, and `json` views, each shown with a small icon and tooltip.
 */
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
        disabled={readOnly}
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
        disabled={readOnly}
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
        disabled={readOnly}
      />
    </Tabs>
  );
}