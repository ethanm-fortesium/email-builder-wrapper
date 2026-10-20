import React from 'react';
import { z } from 'zod';

import { TextPropsSchema } from '@usewaypoint/block-text';

import { isBoldWeight, splitLongUrls, withBreakOpportunities } from '../helpers/breakLongTokens.js';
import { insetWidth, useEmailBox } from '../helpers/emailBox.js';
import { effectiveLinkColor, normaliseEmailHtml } from '../helpers/emailHtmlNormaliser.js';
import { EmailTable } from '../helpers/emailTable.js';
import { linkStyle, resolveTypography, textStyle, useTypography } from '../helpers/emailTypography.js';
import { renderMarkdown } from '../helpers/markdown.js';

export type TextProps = z.infer<typeof TextPropsSchema>;

/**
 * Render a text block wrapped in an email-compatible table: padding and background go on the table cell,
 * the complete resolved typography (layout defaults plus block overrides) on the text element itself.
 *
 * Classic Outlook (Word) does not inherit typography into nested tables, so the text element carries
 * font, size, colour, letter-spacing and Word's own line height. Plain text gets break opportunities in
 * tokens too wide for the block (Word would widen the email instead of wrapping them); a bare URL or email
 * address that needs them becomes an explicit link first, so clients that auto-link them do not cut it short.
 * Markdown is rendered with the upstream pipeline and normalised so Word matches the browser's defaults.
 *
 * @param style - Optional block style; `padding` and `backgroundColor` apply to the table cell, the rest to the text.
 * @param props - `text`, rendered as plain text or, when `markdown` is set, as markdown.
 * @returns The text block inside an EmailTable.
 */
export default function TextReader({ style, props }: TextProps) {
  const layoutTypography = useTypography();
  const box = useEmailBox();
  const typography = resolveTypography(layoutTypography, {
    fontFamily: style?.fontFamily,
    fontSize: style?.fontSize,
    color: style?.color,
    fontWeight: style?.fontWeight,
  });
  const padding = style?.padding ?? undefined;
  const backgroundColor = style?.backgroundColor ?? undefined;
  const width = insetWidth(box.width, padding);
  const background = backgroundColor ?? box.background;
  const text = props?.text ?? '';
  const textElementStyle = { ...textStyle(typography), textAlign: style?.textAlign ?? undefined };

  if (props?.markdown) {
    return (
      <EmailTable backgroundColor={backgroundColor} padding={padding}>
        <div
          style={textElementStyle}
          dangerouslySetInnerHTML={{
            __html: normaliseEmailHtml(renderMarkdown(text), { mode: 'markdown', typography, width, background }),
          }}
        />
      </EmailTable>
    );
  }

  const tokenOptions = {
    width,
    fontSize: typography.fontSize,
    bold: isBoldWeight(typography.fontWeight),
    letterSpacing: typography.letterSpacing,
  };
  const anchorStyle = linkStyle({ linkColor: effectiveLinkColor({ typography, background }) });

  return (
    <EmailTable backgroundColor={backgroundColor} padding={padding}>
      <div style={textElementStyle}>
        {splitLongUrls(text, tokenOptions).map(({ text: segment, href }, i) =>
          href ? (
            <a key={i} href={href} target="_blank" style={anchorStyle}>
              {withBreakOpportunities(segment, tokenOptions)}
            </a>
          ) : (
            <React.Fragment key={i}>{withBreakOpportunities(segment, tokenOptions)}</React.Fragment>
          )
        )}
      </div>
    </EmailTable>
  );
}
