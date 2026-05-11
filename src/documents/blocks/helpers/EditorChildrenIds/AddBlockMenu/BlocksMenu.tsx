import React, { useMemo, useState } from 'react';

import {
  Alert,
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
} from '@mui/material';
import { ContentPasteOutlined } from '@mui/icons-material';

import { TEditorBlock } from '../../../../editor/core.js';
import { useDefaults, setDocument, getEditorState } from '../../../../editor/EditorContext.js';
import { tryReadBlockFromClipboard, materialiseClipboardPayload } from '../../blockClipboard.js';

import BlockButton from './BlockButton.js';
import { getButtons } from './buttons.js';

type BlocksMenuProps = {
  anchorEl: HTMLElement | null;
  setAnchorEl: (v: HTMLElement | null) => void;
  onSelect: (block: TEditorBlock) => void;
};
export default function BlocksMenu({ anchorEl, setAnchorEl, onSelect }: BlocksMenuProps) {
  const defaults = useDefaults();
  const buttons = useMemo(() => getButtons(defaults), [defaults]);
  const [pasteError, setPasteError] = useState<string | null>(null);

  const onClose = () => {
    setAnchorEl(null);
  };

  const onClick = (block: TEditorBlock) => {
    onSelect(block);
    setAnchorEl(null);
  };

  const onPaste = async () => {
    const payload = await tryReadBlockFromClipboard();
    if (!payload) {
      setPasteError('No copied block found on the clipboard.');
      setAnchorEl(null);
      return;
    }
    const { block, descendants } = materialiseClipboardPayload(payload);
    if (Object.keys(descendants).length > 0) {
      const current = getEditorState().document;
      setDocument({ ...current, ...descendants });
    }
    onClick(block);
  };

  return (
    <>
      {anchorEl !== null && (
        <Menu
          open
          anchorEl={anchorEl}
          onClose={onClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Box sx={{ p: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
            {buttons.map((k, i) => (
              <BlockButton key={i} label={k.label} icon={k.icon} onClick={() => onClick(k.block())} />
            ))}
          </Box>
          <Divider />
          <MenuItem onClick={onPaste}>
            <ListItemIcon>
              <ContentPasteOutlined fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Paste block" secondary="From a previously copied block" />
          </MenuItem>
        </Menu>
      )}
      {pasteError !== null && (
        <Snackbar
          open
          autoHideDuration={3500}
          onClose={() => setPasteError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="warning" variant="filled" onClose={() => setPasteError(null)}>
            {pasteError}
          </Alert>
        </Snackbar>
      )}
    </>
  );
}
