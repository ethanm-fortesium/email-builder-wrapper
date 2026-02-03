import React, { useMemo } from 'react';
import { RichTextProps } from './RichTextPropsSchema.js';
import { FONT_FAMILIES } from '../helpers/fontFamily.js';
import { sanitizeRichText } from './sanitizeRichText.js';

/**
 * Render sanitized rich text into a styled container.
 *
 * Applies provided style values (color, backgroundColor, fontFamily — resolved via FONT_FAMILIES when possible, fontSize in pixels, fontWeight, textAlign, and padding as top/right/bottom/left) to the wrapper element.
 *
 * @param style - Optional style overrides for the wrapper; padding may be an object with top/right/bottom/left numeric values.
 * @param props - Rich-text source; `props.html` is used if present, otherwise `props.initial` is used, falling back to an empty string.
 * @returns A JSX element containing the sanitized HTML with links decorated.
export default function RichTextReader({ style, props }: RichTextProps) {
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
    if (style.textAlign) wrapperStyle.textAlign = style.textAlign as any;
    if (style.padding) {
      const { top = 0, right = 0, bottom = 0, left = 0 } = style.padding as any;
      wrapperStyle.padding = `${top}px ${right}px ${bottom}px ${left}px`;
    }
  }
  const html = props?.html || props?.initial || '';
  const sanitisedHtml = useMemo(() => sanitizeRichText(html, { decorateLinks: true }), [html]);
  return <div style={wrapperStyle} dangerouslySetInnerHTML={{ __html: sanitisedHtml }} />;
}