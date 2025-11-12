import React from 'react';
import ReaderBlockWrapper from '../helpers/block-wrappers/ReaderBlockWrapper.js';
import { SignatureProps } from './SignaturePropsSchema.js';
import SignatureEditor from './SignatureEditor.js';
import { useCurrentBlockId } from '../../editor/EditorBlock.js';

export default function SignatureReader({ style, props }: SignatureProps) {
  const blockId = useCurrentBlockId();
  return (
    <ReaderBlockWrapper style={style as any} blockId={blockId}>
      <SignatureEditor style={style} props={props} />
    </ReaderBlockWrapper>
  );
}
