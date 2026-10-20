import React from 'react';
import { z } from 'zod';

import { HtmlPropsSchema } from '@usewaypoint/block-html';

import { insetWidth, useEmailBox } from '../helpers/emailBox.js';
import { normaliseEmailHtml } from '../helpers/emailHtmlNormaliser.js';
import { EmailTable } from '../helpers/emailTable.js';
import { resolveTypography, textStyle, useTypography } from '../helpers/emailTypography.js';
import { useStyleRegistry } from '../helpers/styleRegistry.js';

export type HtmlProps = z.infer<typeof HtmlPropsSchema>;

/**
 * Render HTML content inside an email-friendly table, applying padding and backgroundColor from the block style
 * to the table cell and the resolved typography to the wrapper.
 *
 * User HTML is left as authored for browsers. The wrapper's Word line height is a minimum ('at least'), so
 * images and larger text in the HTML are never clipped in classic Outlook, and the HTML only gets Word-only
 * additions (typography for table cells its own stylesheet does not style, via Outlook-only classes; Word
 * line heights; list geometry) plus,
 * when it has no <style> of its own, explicit browser-default margins and link colours.
 *
 * @param style - Optional block style: `padding` and `backgroundColor` apply to the table cell, the rest to the wrapper.
 * @param props - `contents`, the HTML to render.
 * @returns The HTML inside an EmailTable.
 */
export default function HtmlReader({ style, props }: HtmlProps) {
  const layoutTypography = useTypography();
  const box = useEmailBox();
  const registry = useStyleRegistry();
  const typography = resolveTypography(layoutTypography, {
    fontFamily: style?.fontFamily,
    fontSize: style?.fontSize,
    color: style?.color,
  });
  const padding = style?.padding ?? undefined;
  const backgroundColor = style?.backgroundColor ?? undefined;

  // User HTML can be anything. If normalising it ever fails, export it as authored rather
  // than breaking the whole email (and the editor, which renders the export on every change).
  const normaliseContents = (html: string) => {
    try {
      return normaliseEmailHtml(html, {
        mode: 'raw',
        typography,
        width: insetWidth(box.width, padding),
        background: backgroundColor ?? box.background,
        addMsoRule: (css) => registry?.add('mso', css),
      });
    } catch (error) {
      console.warn('[EmailBuilder] could not normalise Html block contents', error);
      return html;
    }
  };
  const contents = props?.contents ? normaliseContents(props.contents) : null;
  const wrapperStyle = { ...textStyle(typography, { rule: 'at-least' }), textAlign: style?.textAlign ?? undefined };

  return (
    <EmailTable backgroundColor={backgroundColor} padding={padding}>
      {contents ? <div style={wrapperStyle} dangerouslySetInnerHTML={{ __html: contents }} /> : <div style={wrapperStyle} />}
    </EmailTable>
  );
}
