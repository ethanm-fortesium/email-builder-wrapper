import React, { CSSProperties, useState } from 'react';

import { Box } from '@mui/material';

import { useCurrentBlockId } from '../../../editor/EditorBlock.js';
import { setSelectedBlockId, useSelectedBlockId, useDocument } from '../../../editor/EditorContext.js';
import { usePreviewMode } from '../../../../App/TemplatePanel/PreviewModeContext.js';

import TuneMenu from './TuneMenu.js';

type TEditorBlockWrapperProps = {
  children: JSX.Element;
};

export default function EditorBlockWrapper({ children }: TEditorBlockWrapperProps) {
  const document = useDocument();
  const selectedBlockId = useSelectedBlockId();
  const [mouseInside, setMouseInside] = useState(false);
  const blockId = useCurrentBlockId();
  const preview = usePreviewMode();

  // Root layout data
  const rootData = document.root?.data;
  const rootChildren: string[] = rootData?.childrenIds || [];
  const rootRadius: number = rootData?.borderRadius ?? 0;

  const isRootChild = rootChildren.includes(blockId);
  const isFirst = isRootChild && rootChildren[0] === blockId;
  const isLast = isRootChild && rootChildren[rootChildren.length - 1] === blockId;
  const applyRadius = rootRadius > 0 && (isFirst || isLast);

  // When preview: disable outlines / interactions
  let outline: CSSProperties['outline'];
  if (!preview) {
    if (selectedBlockId === blockId) {
      outline = '2px solid rgba(0,121,204, 1)';
    } else if (mouseInside) {
      outline = '2px solid rgba(0,121,204, 0.3)';
    }
  }
  
  const cornerStyles: CSSProperties = {};
  if (applyRadius) {
    if (isFirst) {
      cornerStyles.borderTopLeftRadius = rootRadius;
      cornerStyles.borderTopRightRadius = rootRadius;
    }
    if (isLast) {
      cornerStyles.borderBottomLeftRadius = rootRadius;
      cornerStyles.borderBottomRightRadius = rootRadius;
    }
  }

  const renderMenu = () => {
    if (preview) return null;
    if (selectedBlockId !== blockId) return null;
    return <TuneMenu blockId={blockId} />;
  };

  return (
    <Box
      sx={{
        position: 'relative',
        maxWidth: '100%',
        outlineOffset: '-1px',
        outline,
        pointerEvents: preview ? 'none' : 'auto',
      }}
      onMouseEnter={(ev) => {
        if (preview) return;
        setMouseInside(true);
        ev.stopPropagation();
      }}
      onMouseLeave={() => {
        if (preview) return;
        setMouseInside(false);
      }}
      onClick={(ev) => {
        if (preview) return;
        setSelectedBlockId(blockId);
        ev.stopPropagation();
        ev.preventDefault();
      }}
    >
      <Box
        sx={{
          ...cornerStyles,
          overflow: applyRadius ? 'hidden' : undefined,
          backgroundClip: applyRadius ? 'padding-box' : undefined,
        }}
      >
        {children}
      </Box>

      {renderMenu()}
    </Box>
  );
}