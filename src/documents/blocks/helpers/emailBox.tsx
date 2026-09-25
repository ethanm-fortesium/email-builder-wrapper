import React from 'react';

import type { PaddingBox } from './emailTable.js';

// The box a block renders into: the content width available to it in px and the
// nearest opaque background colour behind it.
//
// Browsers size fluid content themselves, but classic Outlook (Word) needs exact
// pixel widths for anything it cannot shrink: VML buttons and shapes, image
// width/height attributes and column ghost tables. Word grows a table cell to fit
// an over-wide child and ignores max-width, so one wrong width widens the whole
// email. EmailLayoutReader provides the canvas content width; every cell that adds
// horizontal padding or borders (EmailTable, Container, columns) re-provides what
// is left for its children.
//
// Convention: inside a block component, useEmailBox() is the width of the cell the
// block's own EmailTable occupies; subtract the block's padding with insetWidth().
export type EmailBox = {
  width: number;
  background: string;
};

export const DEFAULT_EMAIL_BOX: EmailBox = { width: 600, background: '#FFFFFF' };

export const EmailBoxContext = React.createContext<EmailBox>(DEFAULT_EMAIL_BOX);

export function useEmailBox() {
  return React.useContext(EmailBoxContext);
}

/** Width left for content after horizontal padding and borders (whole px, never negative). */
export function insetWidth(width: number, padding?: PaddingBox, borderWidth = 0) {
  return Math.max(0, Math.floor(width - (padding?.left ?? 0) - (padding?.right ?? 0) - 2 * borderWidth));
}

type EmailBoxProviderProps = {
  width?: number;
  background?: string | null;
  children: React.ReactNode;
};

/** Narrow the box for children; omitted values are inherited from the parent box. */
export function EmailBoxProvider({ width, background, children }: EmailBoxProviderProps) {
  const parent = useEmailBox();
  const value = React.useMemo(
    () => ({ width: width ?? parent.width, background: background ?? parent.background }),
    [width, background, parent.width, parent.background]
  );
  return <EmailBoxContext.Provider value={value}>{children}</EmailBoxContext.Provider>;
}

/** Relative luminance (0 dark .. 1 light) of a #RRGGBB colour; null when not parseable. */
export function relativeLuminance(hex: string | null | undefined) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '');
  if (!m) {
    return null;
  }
  const n = parseInt(m[1], 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** Solid colour equivalent of `fg` drawn at `alpha` over `bg` (replaces CSS opacity, which Word ignores). */
export function blendHex(fg: string, bg: string, alpha: number) {
  const parse = (hex: string) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    const n = m ? parseInt(m[1], 16) : 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const f = parse(fg);
  const b = parse(bg);
  const mixed = f.map((c, i) => Math.round(c * alpha + b[i] * (1 - alpha)));
  return `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}
