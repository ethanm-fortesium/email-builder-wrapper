import React from 'react';

import { ReaderBlock } from '../../../Reader/core.js';

import { EmailLayoutProps } from './EmailLayoutPropsSchema.js';
import { EmailLayoutContext } from './EmailLayoutContext.js';
import { clampCanvasWidth, getFontFamily } from './emailLayoutShared.js';

/**
 * Produce a CSS border string using the provided border color.
 *
 * @returns The string "`1px solid {color}`" when `borderColor` is provided, `undefined` otherwise.
 */
function getBorder({ borderColor }: EmailLayoutProps) {
  if (!borderColor) {
    return undefined;
  }
  return `1px solid ${borderColor}`;
}

/**
 * Render a reader-facing email layout as a responsive table structure using the provided layout props.
 *
 * Renders a full-width outer table (backdrop) that centers an inner "canvas" table sized to a clamped canvasWidth.
 * The canvas applies background, border, and radius from props and provides `canvasWidth` to descendants via EmailLayoutContext.
 *
 * @param props - Configuration for the email layout (canvas and backdrop colors, text/font settings, border/radius, and child block IDs).
 * @returns The table-based React element representing the composed email layout ready for reader rendering.
 */
export default function EmailLayoutReader(props: EmailLayoutProps) {
  const childrenIds = props.childrenIds ?? [];
  const effectiveCanvasWidth = clampCanvasWidth(props.canvasWidth);

  const rootBackground = props.backdropColor ?? '#F5F5F5';
  const canvasBackground = props.canvasColor ?? '#FFFFFF';
  const textColor = props.textColor ?? '#262626';
  const fontFamily = getFontFamily(props.fontFamily);
  const baseFontSize = props.baseFontSize ?? 16;
  const canvasBorder = getBorder(props);
  const canvasBorderAttr = canvasBorder ? 1 : 0;
  const canvasBorderColor = props.borderColor ?? undefined;
  const canvasRadius = props.borderRadius ?? undefined;

  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      bgColor={rootBackground}
      style={{
        backgroundColor: rootBackground,
        margin: 0,
        width: '100%',
      }}
    >
      <tbody>
        <tr>
          <td
            align="center"
            valign="top"
            style={{
              padding: '32px 0',
              margin: 0,
              color: textColor,
              fontFamily,
              fontSize: `${baseFontSize}px`,
              fontWeight: 400,
              letterSpacing: '0.15008px',
              lineHeight: '1.5',
            }}
          >
            <table
              role="presentation"
              cellPadding={0}
              cellSpacing={0}
              border={canvasBorderAttr}
              width={effectiveCanvasWidth}
              bgColor={canvasBackground}
              style={{
                margin: 0,
                width: '100%',
                maxWidth: `${effectiveCanvasWidth}px`,
                tableLayout: 'fixed',
                backgroundColor: canvasBackground,
                borderRadius: canvasRadius,
                border: canvasBorder,
                borderColor: canvasBorderColor,
              }}
              {...(canvasBorderColor ? { borderColor: canvasBorderColor } : {})}
            >
              <tbody>
                <tr>
                  <td style={{ padding: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                    <EmailLayoutContext.Provider value={{ canvasWidth: effectiveCanvasWidth }}>
                      {childrenIds.map((childId) => (
                        <ReaderBlock key={childId} id={childId} />
                      ))}
                    </EmailLayoutContext.Provider>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}