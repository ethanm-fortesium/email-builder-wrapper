import React, { CSSProperties } from 'react';

import { useDocument } from '../../../editor/EditorContext.js';

import { EmailTable } from '../emailTable.js';
import { TStyle } from '../TStyle.js';

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

  const padding = (style as any)?.padding;
  const backgroundColor = (style as any)?.backgroundColor;
  const borderColor = (style as any)?.borderColor;

  const cellStyle: CSSProperties = {};
  if (borderColor) {
    cellStyle.border = `1px solid ${borderColor}`;
  }
  cellStyle.maxWidth = '100%';
  cellStyle.position = 'relative';

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
    <EmailTable
      backgroundColor={backgroundColor}
      padding={padding as any}
      extraCellStyle={{ ...cellStyle, ...corner, overflow: applyRadius ? 'hidden' : undefined }}
    >
      {children}
    </EmailTable>
  );
}