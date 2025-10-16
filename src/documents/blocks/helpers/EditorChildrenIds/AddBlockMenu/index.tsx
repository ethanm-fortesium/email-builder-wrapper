import React, { useState } from 'react';

import { TEditorBlock } from '../../../../editor/core.js';

import BlocksMenu from './BlocksMenu.js';
import DividerButton from './DividerButton.js';
import PlaceholderButton from './PlaceholderButton.js';
import { usePreviewMode } from '../../../../../App/TemplatePanel/PreviewModeContext.js';

type Props = {
  placeholder?: boolean;
  onSelect: (block: TEditorBlock) => void;
};
export default function AddBlockButton({ onSelect, placeholder }: Props) {
  const preview = usePreviewMode();
  if (preview) {
    return null; // no add button in preview
  }
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [buttonElement, setButtonElement] = useState<HTMLElement | null>(null);

  const handleButtonClick = () => {
    setMenuAnchorEl(buttonElement);
  };

  const renderButton = () => {
    if (placeholder) {
      return <PlaceholderButton onClick={handleButtonClick} />;
    } else {
      return <DividerButton buttonElement={buttonElement} onClick={handleButtonClick} />;
    }
  };

  return (
    <>
      <div ref={setButtonElement} style={{ position: 'relative' }}>
        {renderButton()}
      </div>
      <BlocksMenu anchorEl={menuAnchorEl} setAnchorEl={setMenuAnchorEl} onSelect={onSelect} />
    </>
  );
}
