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
/**
 * Render an add-block control that opens a blocks menu and forwards the chosen block.
 *
 * Renders nothing when preview mode is active.
 *
 * @param onSelect - Callback invoked with the selected editor block
 * @param placeholder - If `true`, render a placeholder-styled button; otherwise render a divider-styled button
 * @returns The component tree for the add-block control, or `null` when in preview mode
 */
export default function AddBlockButton({ onSelect, placeholder }: Props) {
  const preview = usePreviewMode();
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [buttonElement, setButtonElement] = useState<HTMLElement | null>(null);
  if (preview) {
    return null; // no add button in preview
  }

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