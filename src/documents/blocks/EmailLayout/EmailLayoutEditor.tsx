import React from 'react';

import { useCurrentBlockId } from '../../editor/EditorBlock.js';
import { setDocument, setSelectedBlockId, useDocument } from '../../editor/EditorContext.js';
import EditorChildrenIds from '../helpers/EditorChildrenIds/index.js';

import { EmailLayoutProps } from './EmailLayoutPropsSchema.js';

function getFontFamily(fontFamily: EmailLayoutProps['fontFamily']) {
  const f = fontFamily ?? 'MODERN_SANS';
  switch (f) {
    case 'MODERN_SANS':
      return '"Helvetica Neue", "Arial Nova", "Nimbus Sans", Arial, sans-serif';
    case 'BOOK_SANS':
      return 'Optima, Candara, "Noto Sans", source-sans-pro, sans-serif';
    case 'ORGANIC_SANS':
      return 'Seravek, "Gill Sans Nova", Ubuntu, Calibri, "DejaVu Sans", source-sans-pro, sans-serif';
    case 'GEOMETRIC_SANS':
      return 'Avenir, "Avenir Next LT Pro", Montserrat, Corbel, "URW Gothic", source-sans-pro, sans-serif';
    case 'HEAVY_SANS':
      return 'Bahnschrift, "DIN Alternate", "Franklin Gothic Medium", "Nimbus Sans Narrow", sans-serif-condensed, sans-serif';
    case 'ROUNDED_SANS':
      return 'ui-rounded, "Hiragino Maru Gothic ProN", Quicksand, Comfortaa, Manjari, "Arial Rounded MT Bold", Calibri, source-sans-pro, sans-serif';
    case 'MODERN_SERIF':
      return 'Charter, "Bitstream Charter", "Sitka Text", Cambria, serif';
    case 'BOOK_SERIF':
      return '"Iowan Old Style", "Palatino Linotype", "URW Palladio L", P052, serif';
    case 'MONOSPACE':
      return '"Nimbus Mono PS", "Courier New", "Cutive Mono", monospace';
  }
}

export default function EmailLayoutEditor(props: EmailLayoutProps) {
  const childrenIds = props.childrenIds ?? [];
  const document = useDocument();
  const currentBlockId = useCurrentBlockId();
  const radius = props.borderRadius ?? 0;

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
          maxWidth: '600px',
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