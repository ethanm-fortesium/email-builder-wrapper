import React from 'react';

import { FONT_FAMILIES } from './fontFamily.js';

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
};

type FontKey = string | null | undefined;

/**
 * Resolve a font key to its corresponding font-family string.
 *
 * @param fontKey - The font identifier to resolve; may be a predefined key or a literal font-family value.
 * @returns The matching font-family string from `FONT_FAMILIES` if present, the original `fontKey` when truthy, or `undefined` when `fontKey` is falsy or no mapping exists.
 */
export function resolveFontFamily(fontKey: FontKey) {
  if (!fontKey) {
    return undefined;
  }
  return FONT_FAMILIES.find((item) => item.key === fontKey)?.value ?? fontKey ?? undefined;
}

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
 * @param children - Content rendered inside the table cell
 * @param align - Horizontal alignment for the cell: `'left' | 'center' | 'right'`
 * @param verticalAlign - Vertical alignment for the cell: `'top' | 'middle' | 'bottom'`
 * @param backgroundColor - Optional background color applied to the cell
 * @param padding - Optional padding values for top/right/bottom/left; converted to a CSS padding string
 * @param width - Table width (number interpreted as pixels, or a CSS string) used when `fullWidth` is false
 * @param fullWidth - If true, table width is forced to 100%; otherwise `width` is used
 * @param extraCellStyle - Additional CSS properties merged into the cell's style
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
}: EmailTableProps) {
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
            {children}
          </td>
        </tr>
      </tbody>
    </table>
  );
}