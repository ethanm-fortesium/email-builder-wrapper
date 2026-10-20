import type { EmailLayoutProps } from './EmailLayoutPropsSchema.js';
import { DEFAULT_TYPOGRAPHY, resolveTypography } from '../helpers/emailTypography.js';
import { DEFAULT_FONT_FAMILY_KEY, getFontFamilyEntry } from '../helpers/fontFamily.js';

export const DEFAULT_CANVAS_WIDTH = 600;
export const MIN_CANVAS_WIDTH = 480;
export const MAX_CANVAS_WIDTH = 900;

export function clampCanvasWidth(n: number | null | undefined) {
  if (n == null) return DEFAULT_CANVAS_WIDTH;
  return Math.min(MAX_CANVAS_WIDTH, Math.max(MIN_CANVAS_WIDTH, n));
}

/** CSS font stack for a layout font key (single source of truth: helpers/fontFamily.ts). */
export function getFontFamily(fontFamily: EmailLayoutProps['fontFamily']) {
  return (getFontFamilyEntry(fontFamily) ?? getFontFamilyEntry(DEFAULT_FONT_FAMILY_KEY)!).value;
}

/**
 * Resolve the layout-level typography every block starts from.
 *
 * Lives here rather than in EmailLayoutReader so the editor (and the renderer) can use it
 * without importing the Reader tree.
 *
 * @param props - EmailLayout props (font family key, base font size, text and link colours).
 * @returns The resolved Typography provided to all blocks.
 */
export function getLayoutTypography(props: EmailLayoutProps) {
  return resolveTypography(DEFAULT_TYPOGRAPHY, {
    fontFamily: props.fontFamily ?? DEFAULT_FONT_FAMILY_KEY,
    fontSize: props.baseFontSize ?? 16,
    color: props.textColor ?? '#262626',
    linkColor: props.linkColor,
  });
}
