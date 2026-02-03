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

export function resolveFontFamily(fontKey: FontKey) {
  if (!fontKey) {
    return undefined;
  }
  return FONT_FAMILIES.find((item) => item.key === fontKey)?.value ?? fontKey ?? undefined;
}

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
