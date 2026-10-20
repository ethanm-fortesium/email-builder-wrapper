import React from 'react';

import { ReaderBlock } from '../../../Reader/core.js';
import { EmailBoxProvider } from '../helpers/emailBox.js';
import { TypographyProvider, textStyle } from '../helpers/emailTypography.js';

import { EmailLayoutProps } from './EmailLayoutPropsSchema.js';
import { EmailLayoutContext } from './EmailLayoutContext.js';
import { clampCanvasWidth, getLayoutTypography } from './emailLayoutShared.js';

/**
 * Render a reader-facing email layout as a responsive table structure using the provided layout props.
 *
 * Renders a full-width outer table (backdrop) that centers an inner "canvas" table sized to a clamped canvasWidth.
 * The canvas cell carries background, border and radius (on the cell with separate borders, so the radius
 * renders and clips its content in browsers; classic Outlook shows square corners). Descendants receive the
 * canvas width via EmailLayoutContext, the canvas content box via EmailBoxProvider and the layout typography
 * via TypographyProvider.
 *
 * @param props - Configuration for the email layout (canvas and backdrop colors, text/font settings, border/radius, and child block IDs).
 * @returns The table-based React element representing the composed email layout ready for reader rendering.
 */
export default function EmailLayoutReader(props: EmailLayoutProps) {
  const childrenIds = props.childrenIds ?? [];
  const effectiveCanvasWidth = clampCanvasWidth(props.canvasWidth);

  const rootBackground = props.backdropColor ?? '#F5F5F5';
  const canvasBackground = props.canvasColor ?? '#FFFFFF';
  const borderColor = props.borderColor ?? null;
  const borderWidth = borderColor ? 1 : 0;
  const canvasRadius = props.borderRadius ?? 0;
  const typography = getLayoutTypography(props);

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
              ...textStyle(typography),
            }}
          >
            <table
              role="presentation"
              cellPadding={0}
              cellSpacing={0}
              border={0}
              width={effectiveCanvasWidth}
              style={{
                margin: 0,
                width: '100%',
                maxWidth: `${effectiveCanvasWidth}px`,
                tableLayout: 'fixed',
                borderCollapse: 'separate',
                borderSpacing: 0,
              }}
            >
              <tbody>
                <tr>
                  <td
                    bgColor={canvasBackground}
                    style={{
                      padding: 0,
                      backgroundColor: canvasBackground,
                      border: borderColor ? `${borderWidth}px solid ${borderColor}` : undefined,
                      borderRadius: canvasRadius > 0 ? canvasRadius : undefined,
                      // Clip content to the rounded corners, but let anything wider than the
                      // canvas (e.g. a fixed-width table pasted into an Html block) scroll
                      // sideways on a phone instead of being cut off.
                      overflowX: canvasRadius > 0 ? 'auto' : undefined,
                      overflowY: canvasRadius > 0 ? 'hidden' : undefined,
                      overflowWrap: 'break-word',
                      wordBreak: 'break-word',
                    }}
                  >
                    <EmailLayoutContext.Provider value={{ canvasWidth: effectiveCanvasWidth }}>
                      <EmailBoxProvider width={effectiveCanvasWidth - 2 * borderWidth} background={canvasBackground}>
                        <TypographyProvider value={typography}>
                          {childrenIds.map((childId) => (
                            <ReaderBlock key={childId} id={childId} />
                          ))}
                        </TypographyProvider>
                      </EmailBoxProvider>
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
