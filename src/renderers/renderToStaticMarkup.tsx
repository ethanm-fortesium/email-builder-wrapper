import React from 'react';
import { renderToStaticMarkup as baseRenderToStaticMarkup } from 'react-dom/server';

import Reader, { TReaderDocument } from '../Reader/core.js';
import { clampCanvasWidth, getFontFamily } from '../documents/blocks/EmailLayout/emailLayoutShared.js';
import type { EmailLayoutProps } from '../documents/blocks/EmailLayout/EmailLayoutPropsSchema.js';

type EmailLayoutBlock = {
  type: 'EmailLayout';
  data: EmailLayoutProps;
};

type LayoutAppearance = {
  backdropColor: string;
  canvasColor: string;
  borderColor: string | null;
  borderRadius: number;
  canvasWidth: number;
  textColor: string;
  fontFamily: string;
};

/**
 * Derives visual layout properties for an email from the document's EmailLayout block or sensible defaults.
 *
 * @param document - Reader document containing blocks indexed by id
 * @param rootBlockId - Id of the root block to read for EmailLayout props
 * @returns A LayoutAppearance containing `backdropColor`, `canvasColor`, `borderColor` (or `null`), `borderRadius`, `canvasWidth`, `textColor`, and `fontFamily`; values are taken from the EmailLayout block when present and fall back to defaults otherwise
 */
function getLayoutAppearance(document: TReaderDocument, rootBlockId: string): LayoutAppearance {
  const block = document[rootBlockId] as EmailLayoutBlock | undefined;
  if (!block || block.type !== 'EmailLayout') {
    return {
      backdropColor: '#F5F5F5',
      canvasColor: '#FFFFFF',
      borderColor: null,
      borderRadius: 0,
      canvasWidth: clampCanvasWidth(undefined),
      textColor: '#262626',
      fontFamily: getFontFamily(undefined),
    };
  }

  const props = block.data;
  return {
    backdropColor: props.backdropColor ?? '#F5F5F5',
    canvasColor: props.canvasColor ?? '#FFFFFF',
    borderColor: props.borderColor ?? null,
    borderRadius: props.borderRadius ?? 0,
    canvasWidth: clampCanvasWidth(props.canvasWidth ?? undefined),
    textColor: props.textColor ?? '#262626',
    fontFamily: getFontFamily(props.fontFamily),
  };
}

type TOptions = {
  rootBlockId: string;
};
/**
 * Render a reader document to a complete, layout-aware static HTML string.
 *
 * The output is a full HTML document that embeds the rendered reader content and
 * applies layout appearance (backdrop, canvas, border, radius, width, text color, font)
 * via inline styles and data attributes for both MSO (Outlook) and modern email clients.
 *
 * @param document - The reader document to render.
 * @param rootBlockId - Root block id used to derive layout appearance values.
 * @returns The assembled HTML document as a string.
 */
export default function renderToStaticMarkup(document: TReaderDocument, { rootBlockId }: TOptions) {
  const bodyContent = baseRenderToStaticMarkup(<Reader document={document} rootBlockId={rootBlockId} />);
  const layout = getLayoutAppearance(document, rootBlockId);

  function escapeAttr(value: string | number): string {
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  const bodyStyle = `margin:0;padding:0;background-color:${escapeAttr(layout.backdropColor)};`;
  const wrapperStyle = `background-color:${escapeAttr(layout.backdropColor)};margin:0;padding:0;width:100%;`;
  const msoTdStyle = `margin:0;padding:0;color:${escapeAttr(layout.textColor)};font-family:${escapeAttr(layout.fontFamily)};font-size:16px;line-height:1.5;letter-spacing:0.15008px;word-break:break-word;overflow-wrap:break-word;`;

  const dataAttributes: string[] = [
    `data-email-backdrop="${escapeAttr(layout.backdropColor)}"`,
    `data-email-canvas-bg="${escapeAttr(layout.canvasColor)}"`,
    `data-email-canvas-width="${escapeAttr(layout.canvasWidth)}"`,
    `data-email-border-radius="${escapeAttr(layout.borderRadius)}"`,
  ];
  if (layout.borderColor) {
    dataAttributes.push(`data-email-border-color="${escapeAttr(layout.borderColor)}"`);
  } const dataAttributeString = dataAttributes.length > 0 ? `${dataAttributes.join(' ')} ` : '';

  const msoWrapperOpen = `<!--[if mso]><div class="mso-email-body" ${dataAttributeString}style="${wrapperStyle}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${escapeAttr(layout.backdropColor)}" style="background-color:${escapeAttr(layout.backdropColor)};margin:0;"><tbody><tr><td align="center" valign="top" style="${msoTdStyle}"><![endif]-->`;
  const msoWrapperClose = '<!--[if mso]></td></tr></tbody></table></div><![endif]-->';
  const modernWrapperOpen = `<!--[if !mso]><!--><div class="modern-email-body" ${dataAttributeString}style="${wrapperStyle}"><!--<![endif]-->`;
  const modernWrapperClose = '<!--[if !mso]><!--></div><!--<![endif]-->';

  const segments = [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '</head>',
    `<body style="${bodyStyle}">`,
    msoWrapperOpen,
    modernWrapperOpen,
    bodyContent,
    modernWrapperClose,
    msoWrapperClose,
    '</body>',
    '</html>',
  ];

  return segments.join('\n');
}