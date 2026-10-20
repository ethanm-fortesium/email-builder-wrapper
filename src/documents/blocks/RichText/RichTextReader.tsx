import React from 'react';

import { insetWidth, useEmailBox } from '../helpers/emailBox.js';
import { EmailTable } from '../helpers/emailTable.js';
import { resolveTypography, textStyle, useTypography } from '../helpers/emailTypography.js';

import { RichTextProps } from './RichTextPropsSchema.js';
import { sanitizeRichText } from './sanitiseRichText.js';

/**
 * Render sanitized rich text into a styled container for the exported email.
 *
 * The wrapper carries the complete resolved typography (layout defaults plus the block's colour,
 * font family - a FONT_FAMILIES key or a literal stack -, font size, weight and unitless line-height
 * ratio), because classic Outlook (Word) does not inherit it into nested tables. The HTML is
 * sanitised and normalised for Word: lists, links (readable on dark backgrounds), images, tall
 * lines, Quill class formats and tokens too wide for the block.
 *
 * @param style - Optional block style; `padding` and `backgroundColor` apply to the table cell, the rest to the wrapper.
 * @param props - Rich-text source; `props.html` is used if present, otherwise `props.initial`, falling back to an empty string.
 * @returns The sanitized, normalised HTML inside an EmailTable.
 */
export default function RichTextReader({ style, props }: RichTextProps) {
  const layoutTypography = useTypography();
  const box = useEmailBox();
  const typography = resolveTypography(layoutTypography, {
    fontFamily: style?.fontFamily,
    fontSize: style?.fontSize,
    lineHeight: style?.lineHeight,
    color: style?.color,
    fontWeight: style?.fontWeight,
  });
  const padding = style?.padding ?? undefined;
  const backgroundColor = style?.backgroundColor ?? undefined;
  const html = sanitizeRichText(props?.html || props?.initial || '', {
    decorateLinks: true,
    email: { typography, width: insetWidth(box.width, padding), background: backgroundColor ?? box.background },
  });

  return (
    <EmailTable backgroundColor={backgroundColor} padding={padding}>
      <div
        style={{ ...textStyle(typography), textAlign: style?.textAlign ?? undefined }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </EmailTable>
  );
}
