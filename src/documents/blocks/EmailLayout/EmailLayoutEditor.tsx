import React from 'react';

import { useCurrentBlockId } from '../../editor/EditorBlock.js';
import { setDocument, setSelectedBlockId, useDocument } from '../../editor/EditorContext.js';
import EditorChildrenIds from '../helpers/EditorChildrenIds/index.js';
import { clampCanvasWidth, getFontFamily } from './emailLayoutShared.js';

import { EmailLayoutProps } from './EmailLayoutPropsSchema.js';

export default function EmailLayoutEditor(props: EmailLayoutProps) {
  const childrenIds = props.childrenIds ?? [];
  const document = useDocument();
  const currentBlockId = useCurrentBlockId();
  const radius = props.borderRadius ?? 0;
  const effectiveCanvasWidth = clampCanvasWidth(props.canvasWidth);

  return (
    <div
      onClick={() => { setSelectedBlockId(null); }}
      style={{
        backgroundColor: props.backdropColor ?? '#F5F5F5',
        color: props.textColor ?? '#262626',
        fontFamily: getFontFamily(props.fontFamily),
        fontSize: '16px',
        lineHeight: 1.5,
        padding: '32px 0',
        width: '100%',
        minHeight: '100%',
      }}
    >
      <div
        style={{
          '--canvas-radius': radius ? `${radius}px` : '0px',
          margin: '0 auto',
          maxWidth: `${effectiveCanvasWidth}px`,
          backgroundColor: props.canvasColor ?? '#FFFFFF',
          border: props.borderColor ? `1px solid ${props.borderColor}` : undefined,
          borderRadius: radius || undefined,
          boxSizing: 'border-box',
        } as React.CSSProperties}
      >
        <table
          role="presentation"
          width="100%"
          cellSpacing={0}
          cellPadding={0}
          border={0}
          style={{ borderCollapse: 'separate', width: '100%' }}
        >
          <tbody>
            <tr style={{ width: '100%' }}>
              <td style={{ padding: 0 }}>
                <EditorChildrenIds
                  childrenIds={childrenIds}
                  onChange={({ block, blockId, childrenIds }) => {
                    setDocument({
                      [blockId]: block,
                      [currentBlockId]: {
                        type: 'EmailLayout',
                        data: { ...document[currentBlockId].data, childrenIds },
                      },
                    });
                    setSelectedBlockId(blockId);
                  }}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}