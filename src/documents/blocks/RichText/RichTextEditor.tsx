import React from 'react';
import { RichTextProps } from './RichTextPropsSchema.js';
import { FONT_FAMILIES } from '../helpers/fontFamily.js';
import { sanitizeRichText } from './sanitiseRichText.js';

/**
 * Renders sanitized rich-text HTML inside a styled wrapper element.
 *
 * The component computes inline styles from `style` (color, backgroundColor, fontFamily,
 * fontSize interpreted as pixels, fontWeight, textAlign, and padding using top/right/bottom/left)
 * and resolves `fontFamily` via the `FONT_FAMILIES` mapping when available. It selects HTML content
 * from `props.html` then `props.initial`, falling back to a small placeholder, sanitizes the HTML
 * with link decoration enabled, and injects it into the wrapper via `dangerouslySetInnerHTML`.
 *
 * @param style - Optional style overrides applied to the wrapper; supports color, backgroundColor,
 *   fontFamily (key resolved with fallback), fontSize (number → px), fontWeight, textAlign, and
 *   a padding object with top/right/bottom/left numeric values.
 * @param props - Rich text properties providing `html` or `initial` content used as the rendered HTML.
 * @returns A <div> element containing the sanitized HTML with the computed inline styles.
 */
export default function RichTextEditor({ style, props }: RichTextProps) {
  const wrapperStyle: React.CSSProperties = {};
  if (style) {
    if (style.color) wrapperStyle.color = style.color as string;
    if (style.backgroundColor) wrapperStyle.backgroundColor = style.backgroundColor as string;
    if (style.fontFamily) {
      const resolved = FONT_FAMILIES.find((f) => f.key === style.fontFamily)?.value;
      wrapperStyle.fontFamily = resolved || style.fontFamily;
    }
    if (style.fontSize) wrapperStyle.fontSize = `${style.fontSize}px`;
    if (style.fontWeight) wrapperStyle.fontWeight = style.fontWeight as any;
    if (style.lineHeight) wrapperStyle.lineHeight = style.lineHeight;
    if (style.textAlign) wrapperStyle.textAlign = style.textAlign as any;
    if (style.padding) {
      const { top = 0, right = 0, bottom = 0, left = 0 } = style.padding as any;
      wrapperStyle.padding = `${top}px ${right}px ${bottom}px ${left}px`;
    }
  }
  const html = props?.html || props?.initial || '<p><em>Empty rich text block</em></p>';
  const sanitisedHtml = sanitizeRichText(html, { decorateLinks: true });
  return <div style={wrapperStyle} dangerouslySetInnerHTML={{ __html: sanitisedHtml }} />;
}