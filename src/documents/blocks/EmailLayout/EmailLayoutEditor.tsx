import React from 'react';

import { useCurrentBlockId } from '../../editor/EditorBlock.js';
import { setDocument, setSelectedBlockId, useDocument } from '../../editor/EditorContext.js';
import EditorChildrenIds from '../helpers/EditorChildrenIds/index.js';
import { clampCanvasWidth, getFontFamily } from './emailLayoutShared.js';

import { EmailLayoutProps } from './EmailLayoutPropsSchema.js';

// The layout's link colour, for links on the canvas that do not set their own (markdown text, rich
// text, HTML), as the export colours them. The colour is passed in a custom property, so the rule
// itself is static; a colour set on the link itself (e.g. a button's) still wins.
const LINK_COLOR_CLASS = 'email-builder-canvas-links';
const LINK_COLOR_PROPERTY = '--email-builder-link-color';
const LINK_COLOR_RULE = `.${LINK_COLOR_CLASS} a { color: var(${LINK_COLOR_PROPERTY}); }`;

export default function EmailLayoutEditor(props: EmailLayoutProps) {
  const childrenIds = props.childrenIds ?? [];
  const document = useDocument();
  const currentBlockId = useCurrentBlockId();
  const radius = props.borderRadius ?? 0;
  const effectiveCanvasWidth = clampCanvasWidth(props.canvasWidth);
  const linkColor = props.linkColor ?? undefined;

  return (
    <div
      onClick={() => { setSelectedBlockId(null); }}
      style={{
        backgroundColor: props.backdropColor ?? '#F5F5F5',
        color: props.textColor ?? '#262626',
        fontFamily: getFontFamily(props.fontFamily),
        fontSize: `${props.baseFontSize ?? 16}px`,
        lineHeight: 1.5,
        padding: '32px 0',
        width: '100%',
        minHeight: '100%',
      }}
    >
      <div
        className={linkColor ? LINK_COLOR_CLASS : undefined}
        style={{
          '--canvas-radius': radius ? `${radius}px` : '0px',
          [LINK_COLOR_PROPERTY]: linkColor,
          margin: '0 auto',
          maxWidth: `${effectiveCanvasWidth}px`,
          backgroundColor: props.canvasColor ?? '#FFFFFF',
          border: props.borderColor ? `1px solid ${props.borderColor}` : undefined,
          borderRadius: radius || undefined,
          boxSizing: 'border-box',
        } as React.CSSProperties}
      >
        {linkColor && <style>{LINK_COLOR_RULE}</style>}
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
              {/* A word too long for the canvas (a long URL or reference) wraps, as it does in the
                  exported email, instead of stretching this table and every block past the canvas. */}
              <td style={{ padding: 0, overflowWrap: 'anywhere' }}>
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