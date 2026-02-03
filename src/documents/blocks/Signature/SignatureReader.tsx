import React from 'react';
import ReaderBlockWrapper from '../helpers/block-wrappers/ReaderBlockWrapper.js';
import { SignatureProps } from './SignaturePropsSchema.js';
import SignatureEditor from './SignatureEditor.js';
import { useCurrentBlockId } from '../../editor/EditorBlock.js';

/**
 * Render a SignatureEditor wrapped by a ReaderBlockWrapper and associated with the current editor block.
 *
 * The wrapper receives a safe style object (defaults to an empty object when `style` is undefined) and the
 * current block ID from editor context; the inner SignatureEditor receives the original `style` and `props`.
 *
 * @param style - Inline style applied to the reader wrapper and forwarded to the editor
 * @param props - SignatureEditor-specific properties forwarded to the editor
 * @returns A React element that renders SignatureEditor inside ReaderBlockWrapper bound to the current block ID
 */
export default function SignatureReader({ style, props }: SignatureProps) {
  const blockId = useCurrentBlockId();
  const safeStyle = style ?? {};
  return (
    <ReaderBlockWrapper style={safeStyle} blockId={blockId}>
      <SignatureEditor style={style} props={props} />
    </ReaderBlockWrapper>
  );
}