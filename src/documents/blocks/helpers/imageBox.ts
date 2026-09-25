// Sizes for an exported <img>, computed separately for classic Outlook and for everything else.
//
// Classic Outlook (Word) sizes an image ONLY from its width/height attributes: it ignores CSS
// width, max-width and height:auto, never derives the height from the width (a missing height
// falls back to the image's DPI-dependent natural height) and grows the cell to fit an image wider
// than it. So the attributes must be the exact box Word should draw, clamped to the cell.
//
// Every other client honours the inline CSS, which keeps the intended width (not clamped to the
// column, so an image in a column that stacks on mobile still fills the wider stacked column) with
// max-width:100% and height:auto; height:auto also overrides the height attribute.
import type React from 'react';

import type { Typography } from './emailTypography.js';

/**
 * Style for an element that holds only an image (or VML shape): font-size:0 removes the text strut
 * browsers add around inline images, and the at-least rule lets Word grow the line to the image
 * instead of clipping it to an inherited exact line height.
 */
export const IMAGE_CONTAINER_STYLE = {
  fontSize: 0,
  lineHeight: '100%',
  msoLineHeightRule: 'at-least',
} as React.CSSProperties;

/** No border, outline or underline on images in any client (including inside links). */
export const IMAGE_RESET_STYLE: React.CSSProperties = { border: 0, outline: 'none', textDecoration: 'none' };

/**
 * Alt text typography for an <img>. Its container is font-size:0, so without its own font the
 * alt text shown for blocked images (Gmail, Apple Mail, Outlook.com) would be invisible.
 */
export function imageAltStyle(t: Pick<Typography, 'fontFamily' | 'color'>, fontSizePx = 14): React.CSSProperties {
  return { fontFamily: t.fontFamily, fontSize: `${fontSizePx}px`, color: t.color };
}

/**
 * Widest picture Word can place in a cell `cellWidth` px wide without growing the cell.
 *
 * Word widens a cell by 1-2px when an inline picture exactly fills a cell that has horizontal
 * padding (its own or an ancestor's, such as a column gutter), which shifts the whole email. So an
 * image narrower than the canvas keeps 1px of slack; a full-bleed image (as wide as the canvas
 * content, so no padding around it) is drawn exactly.
 */
export function wordImageLimit(cellWidth: number, canvasContentWidth: number) {
  return cellWidth < canvasContentWidth ? cellWidth - 1 : cellWidth;
}

export type ImageBoxInput = {
  /** Width set by the user, in px. */
  width?: number | null;
  /** Height set by the user, in px. */
  height?: number | null;
  /** Intrinsic size of the image, when recorded in the document. */
  naturalWidth?: number | null;
  naturalHeight?: number | null;
  /** Width available to the image in its cell (after padding): the most Word may draw. */
  attrMaxWidth: number;
  /** Widest the image may be in any client (the canvas content width). */
  cssMaxWidth: number;
};

export type ImageBox = {
  /** width attribute; undefined when neither a width nor the natural size is known. */
  attrWidth?: number;
  /** height attribute; undefined when the aspect ratio is unknown (Word then uses the natural height). */
  attrHeight?: number;
  /** CSS width in px; undefined leaves the image at its natural width (capped by max-width:100%). */
  cssWidth?: number;
  /** CSS height: 'auto' keeps the image fluid; a number is a fixed box the user asked for. */
  cssHeight: 'auto' | number;
};

/** Aspect ratios within this relative difference are treated as the same (rounded user input). */
const ASPECT_TOLERANCE = 0.01;

const isPositive = (value: number | null | undefined): value is number => typeof value === 'number' && value > 0;

/**
 * Compute the width/height attributes (for Word) and the CSS size (for every other client) of an image.
 *
 * - Natural size known: the box keeps the natural aspect ratio. A missing width is derived from the
 *   height, or else the natural width is used.
 * - Width and height both set with an aspect ratio that differs from the natural one (or with the
 *   natural size unknown): a fixed box with a CSS px height, as the user asked for.
 * - Only a width set and the natural size unknown: width attribute only (the height is unknowable).
 * - Only a height set and the natural size unknown: the user's height, in the attribute and the CSS.
 *
 * The width attribute is clamped to `attrMaxWidth` and the height attribute scaled by the same
 * factor (a fixed box keeps its height, as it does in browsers); the CSS width is only capped by
 * `cssMaxWidth`. All values are whole pixels.
 */
export function computeImageBox({
  width,
  height,
  naturalWidth,
  naturalHeight,
  attrMaxWidth,
  cssMaxWidth,
}: ImageBoxInput): ImageBox {
  const attrLimit = Math.max(1, Math.floor(attrMaxWidth));
  const cssLimit = Math.max(1, Math.floor(cssMaxWidth));
  const w = isPositive(width) ? width : null;
  const h = isPositive(height) ? height : null;
  const naturalAspect = isPositive(naturalWidth) && isPositive(naturalHeight) ? naturalHeight / naturalWidth : null;

  if (w !== null && h !== null) {
    const aspect = h / w;
    const cssWidth = Math.round(Math.min(w, cssLimit));
    const attrWidth = Math.min(cssWidth, attrLimit);
    if (naturalAspect !== null && Math.abs(aspect / naturalAspect - 1) <= ASPECT_TOLERANCE) {
      return { attrWidth, attrHeight: Math.max(1, Math.round(attrWidth * aspect)), cssWidth, cssHeight: 'auto' };
    }
    // Fixed box: browsers keep the px height when max-width narrows the image, so Word does too.
    return { attrWidth, attrHeight: Math.round(h), cssWidth, cssHeight: Math.round(h) };
  }

  if (naturalAspect === null) {
    if (w !== null) {
      const cssWidth = Math.round(Math.min(w, cssLimit));
      return { attrWidth: Math.min(cssWidth, attrLimit), cssWidth, cssHeight: 'auto' };
    }
    if (h !== null) {
      return { attrHeight: Math.round(h), cssHeight: Math.round(h) };
    }
    return { cssHeight: 'auto' };
  }

  const desired = w ?? (h !== null ? h / naturalAspect : naturalWidth!);
  const cssWidth = Math.round(Math.min(desired, cssLimit));
  const attrWidth = Math.min(cssWidth, attrLimit);
  return {
    attrWidth,
    attrHeight: Math.max(1, Math.round(attrWidth * naturalAspect)),
    cssWidth,
    cssHeight: 'auto',
  };
}
