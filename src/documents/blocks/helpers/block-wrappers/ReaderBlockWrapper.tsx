import React, { CSSProperties } from 'react';
import { TStyle } from '../TStyle.js';
import { useDocument } from '../../../editor/EditorContext.js';

type TReaderBlockWrapperProps = {
  style: TStyle;
  blockId: string;
  children: JSX.Element;
};

export default function ReaderBlockWrapper({ style, blockId, children }: TReaderBlockWrapperProps) {
  const document = useDocument?.() as any;
  const rootData = document?.root?.data;
  const rootChildren: string[] = rootData?.childrenIds || [];
  const rootRadius: number = rootData?.borderRadius ?? 0;

  const cssStyle: CSSProperties = { ...style } as any;
  const padding = (style as any).padding;
  if (padding) {
    const { top, bottom, left, right } = padding;
    cssStyle.padding = `${top}px ${right}px ${bottom}px ${left}px`;
    delete (cssStyle as any).padding;
  }
  if ((style as any).borderColor) {
    cssStyle.border = `1px solid ${(style as any).borderColor}`;
    delete (cssStyle as any).borderColor;
  }

  // Determine if this block is a direct root child and first / last
  const isRootChild = rootChildren.includes(blockId);
  const isFirst = isRootChild && rootChildren[0] === blockId;
  const isLast = isRootChild && rootChildren[rootChildren.length - 1] === blockId;
  const applyRadius = rootRadius > 0 && (isFirst || isLast);

  const corner: CSSProperties = {};
  if (applyRadius) {
    if (isFirst) {
      corner.borderTopLeftRadius = rootRadius;
      corner.borderTopRightRadius = rootRadius;
    }
    if (isLast) {
      corner.borderBottomLeftRadius = rootRadius;
      corner.borderBottomRightRadius = rootRadius;
    }
  }

  return (
    <div style={{ maxWidth: '100%', position: 'relative' }}>
      <div
        style={{
          ...cssStyle,
          ...corner,
          overflow: applyRadius ? 'hidden' : undefined, 
        }}
      >
        {children}
      </div>
    </div>
  );
}