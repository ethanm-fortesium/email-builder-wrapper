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
export default function renderToStaticMarkup(document: TReaderDocument, { rootBlockId }: TOptions) {
  const bodyContent = baseRenderToStaticMarkup(<Reader document={document} rootBlockId={rootBlockId} />);
  const layout = getLayoutAppearance(document, rootBlockId);

  const bodyStyle = `margin:0;padding:0;background-color:${layout.backdropColor};`;
  const wrapperStyle = `background-color:${layout.backdropColor};margin:0;padding:0;width:100%;`;
  const msoTdStyle = `margin:0;padding:0;color:${layout.textColor};font-family:${layout.fontFamily};font-size:16px;line-height:1.5;letter-spacing:0.15008px;word-break:break-word;overflow-wrap:break-word;`;

  function escapeAttr(value: string | number): string {
    return String(value).replace(/"/g, '&quot;');
  }

  const dataAttributes: string[] = [
    `data-email-backdrop="${escapeAttr(layout.backdropColor)}"`,
    `data-email-canvas-bg="${escapeAttr(layout.canvasColor)}"`,
    `data-email-canvas-width="${escapeAttr(layout.canvasWidth)}"`,
    `data-email-border-radius="${escapeAttr(layout.borderRadius)}"`,
  ];
  if (layout.borderColor) {
    dataAttributes.push(`data-email-border-color="${escapeAttr(layout.borderColor)}"`);
  } const dataAttributeString = dataAttributes.length > 0 ? `${dataAttributes.join(' ')} ` : '';

  const msoWrapperOpen = `<!--[if mso]><div class="mso-email-body" ${dataAttributeString}style="${wrapperStyle}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${layout.backdropColor}" style="background-color:${layout.backdropColor};margin:0;"><tbody><tr><td align="center" valign="top" style="${msoTdStyle}"><![endif]-->`;
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
