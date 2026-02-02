import React from 'react';
import ReaderBlockWrapper from '../helpers/block-wrappers/ReaderBlockWrapper.js';
import { SignatureProps } from './SignaturePropsSchema.js';
import SignatureEditor from './SignatureEditor.js';
import { useCurrentBlockId } from '../../editor/EditorBlock.js';

export default function SignatureReader({ style, props }: SignatureProps) {
  const blockId = useCurrentBlockId();
  const safeStyle = style ?? {};
  return (
    <ReaderBlockWrapper style={safeStyle} blockId={blockId}>
      <SignatureEditor style={style} props={props} />
    </ReaderBlockWrapper>
  );
}
