import React from 'react';

import { DEFAULT_FONT_FAMILY_KEY, getFontFamilyEntry } from './fontFamily.js';

// Resolved typography for exported email HTML.
//
// Classic Outlook renders with Word, which does NOT inherit font, colour, size,
// line-height or letter-spacing from a table cell into a nested table, and every
// block is a nested table. So each text-bearing element must carry the complete,
// resolved typography inline. EmailLayoutReader provides the layout defaults;
// blocks resolve their own overrides on top with resolveTypography().
//
// Line height: browsers get the unitless ratio (so descendants with their own
// font-size keep scaling, exactly as with inheritance today). Word ignores
// unitless and % line-heights, so it also gets mso-line-height-alt in px with
// mso-line-height-rule, plus mso-text-raise because Word sits text lower in an
// exact line box than the browser's half-leading does.
export type Typography = {
  /** Preset key (MODERN_SANS, ...) when the family came from the registry. */
  fontKey: string | null;
  /** CSS font stack for browsers. */
  fontFamily: string;
  /** Windows font Word must use (mso-ascii/hansi-font-family), when known. */
  msoFont: string | null;
  /** Font size in px, snapped to Word's half-point grid. */
  fontSize: number;
  /** Unitless line-height ratio. */
  lineHeight: number;
  color: string;
  fontWeight: number | string;
  /** Letter spacing in px. */
  letterSpacing: number;
  linkColor: string;
};

export type TypographyOverrides = {
  fontFamily?: string | null;
  fontSize?: number | null;
  lineHeight?: number | null;
  color?: string | null;
  fontWeight?: number | string | null;
  letterSpacing?: number | null;
  linkColor?: string | null;
};

export const DEFAULT_LINE_HEIGHT = 1.5;
export const DEFAULT_LETTER_SPACING = 0.15008;
export const DEFAULT_LINK_COLOR = '#0000EE';

export function resolveFontFamily(fontFamily: string | null | undefined) {
  const entry = getFontFamilyEntry(fontFamily);
  if (entry) {
    return { fontKey: entry.key as string, fontFamily: entry.value, msoFont: entry.msoFont };
  }
  if (fontFamily) {
    // A literal CSS stack (Signature/RichText accept free text): let Word pick from it.
    return { fontKey: null, fontFamily, msoFont: null };
  }
  const fallback = getFontFamilyEntry(DEFAULT_FONT_FAMILY_KEY)!;
  return { fontKey: fallback.key as string, fontFamily: fallback.value, msoFont: fallback.msoFont };
}

export const DEFAULT_TYPOGRAPHY: Typography = {
  ...resolveFontFamily(DEFAULT_FONT_FAMILY_KEY),
  fontSize: 16,
  lineHeight: DEFAULT_LINE_HEIGHT,
  color: '#262626',
  fontWeight: 400,
  letterSpacing: DEFAULT_LETTER_SPACING,
  linkColor: DEFAULT_LINK_COLOR,
};

/**
 * Word stores font sizes in half points and rounds every px size to that grid
 * (15px renders as 11.5pt = 15.33px). Snapping the exported size makes browsers
 * render the same size Outlook does.
 */
export function snapFontSize(px: number) {
  return Math.round(Math.round(px * 1.5) / 1.5 * 100) / 100;
}

export function resolveTypography(base: Typography, overrides: TypographyOverrides = {}): Typography {
  const family = overrides.fontFamily ? resolveFontFamily(overrides.fontFamily) : null;
  return {
    fontKey: family ? family.fontKey : base.fontKey,
    fontFamily: family ? family.fontFamily : base.fontFamily,
    msoFont: family ? family.msoFont : base.msoFont,
    fontSize: overrides.fontSize ? snapFontSize(overrides.fontSize) : base.fontSize,
    lineHeight: overrides.lineHeight ?? base.lineHeight,
    color: overrides.color ?? base.color,
    fontWeight: overrides.fontWeight ?? base.fontWeight,
    letterSpacing: overrides.letterSpacing ?? base.letterSpacing,
    linkColor: overrides.linkColor ?? base.linkColor,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Line box height in px that browsers compute from the unitless ratio. */
export function lineHeightPx(t: Pick<Typography, 'fontSize' | 'lineHeight'>) {
  return round1(t.fontSize * t.lineHeight);
}

/**
 * How far below the browser's baseline Word sets text in an exact line (negative: above it).
 * Word's exact line spacing puts the baseline lower than CSS half-leading. Measured model
 * (Word vs Chromium, 9 fonts x 21 size/ratio pairs, residual <= 1px):
 * offset = 0.30 * (line height - font size) + raiseB[font] * font size.
 *
 * @param raiseB - The font's baseline term (FontFamilyEntry.raiseB)
 * @param fontSize - Font size in px
 * @param linePx - Exact line height in px
 * @returns The offset in px
 */
export function wordBaselineOffsetPx(raiseB: number, fontSize: number, linePx: number) {
  return 0.3 * (linePx - fontSize) + raiseB * fontSize;
}

/** A px length in points, rounded to the half points Word stores (e.g. mso-text-raise) in. */
export function toHalfPoints(px: number) {
  return Math.round(px * 1.5) / 2;
}

/**
 * The mso-text-raise, in pt, that moves Word's text onto the browser's baseline
 * (see wordBaselineOffsetPx). Returns 0 when no raise is needed.
 */
export function textRaisePt(t: Pick<Typography, 'fontKey' | 'fontSize' | 'lineHeight'>) {
  if (t.lineHeight < 1.15) {
    return 0;
  }
  const raiseB = getFontFamilyEntry(t.fontKey)?.raiseB ?? -0.03;
  const pt = toHalfPoints(wordBaselineOffsetPx(raiseB, t.fontSize, lineHeightPx(t)));
  return pt > 0 ? pt : 0;
}

/** A font name as a CSS font-family value: quoted when it contains whitespace ("Palatino Linotype"). */
export function quoteFontName(name: string) {
  return /\s/.test(name) ? `"${name}"` : name;
}

/** mso-* font properties that pin Word to the Windows font browsers resolve to. */
export function msoFontStyle(t: Pick<Typography, 'msoFont'>): React.CSSProperties {
  if (!t.msoFont) {
    return {};
  }
  const name = quoteFontName(t.msoFont);
  return { msoAsciiFontFamily: name, msoHansiFontFamily: name } as React.CSSProperties;
}

/**
 * How Word should treat the line box of an element:
 * - 'exactly': plain text at one font size (Text, Heading, list items, signature lines).
 *   Matches browser line positions pixel for pixel.
 * - 'at-least': the element holds images, inline-blocks or larger text. An exact line
 *   would clip them in Word, so let lines grow and drop the raise.
 */
export type LineRule = 'exactly' | 'at-least';

type TextStyleOptions = {
  rule?: LineRule;
  /** Emit font-weight (default true). */
  weight?: boolean;
  /** Headings: Word maps h1-h3 to its Heading styles, which kern; browsers effectively don't. */
  heading?: boolean;
};

/**
 * Complete inline typography for a text-bearing element, for both browsers and Word.
 * The browser-visible values equal what the element would inherit, so this changes
 * nothing in browsers; it makes Word (which does not inherit through tables) match.
 */
export function textStyle(t: Typography, { rule = 'exactly', weight = true, heading = false }: TextStyleOptions = {}) {
  const style: Record<string, string | number> = {
    fontFamily: t.fontFamily,
    ...(msoFontStyle(t) as Record<string, string>),
    fontSize: `${t.fontSize}px`,
    msoLineHeightRule: rule,
    lineHeight: t.lineHeight,
    msoLineHeightAlt: `${lineHeightPx(t)}px`,
    color: t.color,
    letterSpacing: `${t.letterSpacing}px`,
  };
  if (rule === 'exactly') {
    const raise = textRaisePt(t);
    if (raise) {
      style.msoTextRaise = `${raise}pt`;
    }
  } else {
    style.msoTextRaise = '0pt';
  }
  if (weight) {
    style.fontWeight = t.fontWeight;
  }
  if (heading) {
    style.msoFontKerning = '0pt';
  }
  return style as React.CSSProperties;
}

/** Link styling: an explicit colour and decoration so every client (and Word) agrees. */
export function linkStyle(t: Pick<Typography, 'linkColor'>, decoration: 'underline' | 'none' = 'underline') {
  return { color: t.linkColor, textDecoration: decoration } as React.CSSProperties;
}

const UNITLESS = new Set(['lineHeight', 'fontWeight', 'opacity', 'zIndex', 'flex', 'flexGrow', 'flexShrink']);

/**
 * Serialise a React style object to an inline CSS string for raw HTML strings
 * (VML, conditional comments, normalised rich text). Mirrors React's own rules:
 * camelCase -> kebab-case (msoFoo -> mso-foo), numbers get px except unitless keys.
 */
export function cssText(style: React.CSSProperties | Record<string, string | number | undefined | null>) {
  return Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      const prop = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      const v = typeof value === 'number' && !UNITLESS.has(key) && value !== 0 ? `${value}px` : String(value);
      return `${prop}:${v}`;
    })
    .join(';');
}

export const TypographyContext = React.createContext<Typography>(DEFAULT_TYPOGRAPHY);

export function useTypography() {
  return React.useContext(TypographyContext);
}

export function TypographyProvider({ value, children }: { value: Typography; children: React.ReactNode }) {
  return <TypographyContext.Provider value={value}>{children}</TypographyContext.Provider>;
}
