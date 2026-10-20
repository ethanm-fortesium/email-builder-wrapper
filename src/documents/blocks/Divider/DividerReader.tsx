import React from 'react';
import { z } from 'zod';

import { DividerPropsDefaults, DividerPropsSchema } from '@usewaypoint/block-divider';

import { EmailTable } from '../helpers/emailTable.js';

export type DividerProps = z.infer<typeof DividerPropsSchema>;

/**
 * Render a divider as a padded EmailTable cell holding a full-width line cell.
 *
 * The line is a table cell whose height and background ARE the line. The upstream
 * `<hr>` is not used: Word (classic Outlook) turns it into its own page-wide grey 3D
 * rule and ignores its colour, thickness and margins. A fixed px font-size and
 * line-height with `mso-line-height-rule:exactly` keep the cell at N px in Word and
 * in clients that enforce a minimum font size. A line height of 0 draws no line
 * (like the editor's zero-width border): only the padded cell remains.
 *
 * @param style - `padding` and `backgroundColor` for the outer cell.
 * @param props - `lineHeight` (px) and `lineColor` of the line.
 * @returns A React element containing the divider wrapped in an EmailTable for email rendering.
 */
export default function DividerReader({ style, props }: DividerProps) {
  const cellPadding = style?.padding ?? undefined;
  const backgroundColor = style?.backgroundColor ?? undefined;
  const lineHeight = Math.max(0, Math.round(props?.lineHeight ?? DividerPropsDefaults.lineHeight));
  const lineColor = props?.lineColor ?? DividerPropsDefaults.lineColor;

  const lineStyle = {
    height: `${lineHeight}px`,
    backgroundColor: lineColor,
    fontSize: `${lineHeight}px`,
    lineHeight: `${lineHeight}px`,
    msoLineHeightRule: 'exactly',
  } as React.CSSProperties;

  return (
    <EmailTable backgroundColor={backgroundColor} padding={cellPadding}>
      {lineHeight > 0 ? (
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td height={lineHeight} bgColor={lineColor} style={lineStyle} dangerouslySetInnerHTML={{ __html: '&nbsp;' }} />
            </tr>
          </tbody>
        </table>
      ) : null}
    </EmailTable>
  );
}
