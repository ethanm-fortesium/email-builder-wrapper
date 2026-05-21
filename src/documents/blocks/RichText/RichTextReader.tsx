import React, { useMemo } from 'react';

import { EmailTable, resolveFontFamily } from '../helpers/emailTable.js';

import { RichTextProps } from './RichTextPropsSchema.js';
import { sanitizeRichText } from './sanitiseRichText.js';

/**
 * Render sanitized rich text into a styled container.
 *
 * Applies provided style values (color, backgroundColor, fontFamily — resolved via FONT_FAMILIES when possible, fontSize in pixels, fontWeight, textAlign, and padding as top/right/bottom/left) to the wrapper element.
 *
 * @param style - Optional style overrides for the wrapper; padding may be an object with top/right/bottom/left numeric values.
 * @param props - Rich-text source; `props.html` is used if present, otherwise `props.initial` is used, falling back to an empty string.
 * @returns A JSX element containing the sanitized HTML with links decorated.
 */
export default function RichTextReader({ style, props }: RichTextProps) {
  const html = props?.html || props?.initial || '';
  const sanitisedHtml = useMemo(() => sanitizeRichText(html, { decorateLinks: true }), [html]);

  const cellPadding = style?.padding ?? undefined;
  const backgroundColor = style?.backgroundColor ?? undefined;

  const contentStyle: React.CSSProperties = {
    color: style?.color ?? undefined,
    fontFamily: resolveFontFamily(style?.fontFamily ?? undefined),
    fontSize: style?.fontSize ? `${style.fontSize}px` : undefined,
    fontWeight: style?.fontWeight ?? undefined,
    lineHeight: style?.lineHeight ? `${Math.round(style.lineHeight * 100)}%` : undefined,
    textAlign: style?.textAlign ?? undefined,
  };

  // mso-line-height-rule is not a valid React CSS property so we inject it via
  // a wrapping <div> with a raw style string when lineHeight is set.
  const msoWrapper = style?.lineHeight
    ? { open: '<div style="mso-line-height-rule:exactly">', close: '</div>' }
    : null;

  const wrappedHtml = msoWrapper
    ? `${msoWrapper.open}${sanitisedHtml}${msoWrapper.close}`
    : sanitisedHtml;

  return (
    <EmailTable backgroundColor={backgroundColor} padding={cellPadding as any}>
      <div style={contentStyle} dangerouslySetInnerHTML={{ __html: wrappedHtml }} />
    </EmailTable>
  );
}