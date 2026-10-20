import React from 'react';

import { EmailBoxProvider, insetWidth, useEmailBox } from './emailBox.js';

export type PaddingBox = {
  top?: number | null;
  right?: number | null;
  bottom?: number | null;
  left?: number | null;
} | null | undefined;

type EmailTableProps = {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  backgroundColor?: string | null;
  padding?: PaddingBox;
  width?: number | string | null;
  fullWidth?: boolean;
  extraCellStyle?: React.CSSProperties;
  /** Width in px of any border drawn on the cell via extraCellStyle (narrows the box for children). */
  borderWidth?: number;
};

/**
 * Convert a PaddingBox into a CSS padding string.
 *
 * Missing or undefined sides are treated as 0. If `padding` is null or undefined, the function returns `undefined`.
 *
 * @param padding - Optional padding values for top, right, bottom, and left
 * @returns The padding formatted as `"toppx rightpx bottompx leftpx"`, or `undefined` when `padding` is falsy
 */
export function formatPadding(padding: PaddingBox) {
  if (!padding) {
    return undefined;
  }
  const top = padding.top ?? 0;
  const right = padding.right ?? 0;
  const bottom = padding.bottom ?? 0;
  const left = padding.left ?? 0;
  return `${top}px ${right}px ${bottom}px ${left}px`;
}

/**
 * Render a single-cell, email-friendly table that wraps `children` with configurable alignment, padding, width, and background.
 *
 * The cell re-provides the email box to its children: the parent width minus the
 * cell's horizontal padding and border, and the cell background (when set).
 *
 * @param children - Content rendered inside the table cell
 * @param align - Horizontal alignment for the cell: `'left' | 'center' | 'right'`
 * @param verticalAlign - Vertical alignment for the cell: `'top' | 'middle' | 'bottom'`
 * @param backgroundColor - Optional background color applied to the cell
 * @param padding - Optional padding values for top/right/bottom/left; converted to a CSS padding string
 * @param width - Table width (number interpreted as pixels, or a CSS string) used when `fullWidth` is false
 * @param fullWidth - If true, table width is forced to 100%; otherwise `width` is used
 * @param extraCellStyle - Additional CSS properties merged into the cell's style
 * @param borderWidth - Width of a border set through `extraCellStyle`, subtracted from the children's width
 * @returns A JSX table element (single row, single cell) with the provided children and styles applied
 */
export function EmailTable({
  children,
  align = 'left',
  verticalAlign = 'top',
  backgroundColor,
  padding,
  width,
  fullWidth = true,
  extraCellStyle,
  borderWidth = 0,
}: EmailTableProps) {
  const box = useEmailBox();

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
  };

  const tableWidthAttr = fullWidth ? '100%' : width ?? undefined;
  if (!fullWidth && width) {
    if (typeof width === 'number') {
      tableStyle.width = `${width}px`;
    } else {
      tableStyle.width = width;
    }
  }

  const cellStyle: React.CSSProperties = {
    padding: formatPadding(padding),
    backgroundColor: backgroundColor ?? undefined,
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
  };

  if (extraCellStyle) {
    Object.assign(cellStyle, extraCellStyle);
  }

  const cellColorProps = backgroundColor ? { bgColor: backgroundColor } : undefined;

  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width={tableWidthAttr} style={tableStyle}>
      <tbody>
        <tr>
          <td align={align} valign={verticalAlign} style={cellStyle} {...cellColorProps}>
            <EmailBoxProvider width={insetWidth(box.width, padding, borderWidth)} background={backgroundColor}>
              {children}
            </EmailBoxProvider>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
