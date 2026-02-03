import React, { useMemo } from 'react';

import { EmailTable, resolveFontFamily } from '../helpers/emailTable.js';

import { RichTextProps } from './RichTextPropsSchema.js';
import { sanitizeRichText } from './sanitizeRichText.js';

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
    textAlign: style?.textAlign ?? undefined,
  };

  return (
    <EmailTable backgroundColor={backgroundColor} padding={cellPadding as any}>
      <div style={contentStyle} dangerouslySetInnerHTML={{ __html: sanitisedHtml }} />
    </EmailTable>
  );
}