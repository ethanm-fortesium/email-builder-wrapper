import React from 'react';
import { renderToStaticMarkup as baseRenderToStaticMarkup } from 'react-dom/server';

import Reader, { TReaderDocument } from '../Reader/core.js';

type TOptions = {
  rootBlockId: string;
};
export default function renderToStaticMarkup(document: TReaderDocument, { rootBlockId }: TOptions) {
  const html = baseRenderToStaticMarkup(
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <Reader document={document} rootBlockId={rootBlockId} />
      </body>
    </html>
  );

  const openingBody = /<body[^>]*>/i;
  const baseBodyTag = '<body style="margin:0;padding:0;background-color:#ffffff;">';
  const msoWrapperOpen = '<!--[if mso]>\n<div class="mso-email-body">\n<![endif]-->';
  const modernWrapperOpen = '<!--[if !mso]><!-->\n<div class="modern-email-body">\n<!--<![endif]-->';
  const wrappersOpen = `${msoWrapperOpen}\n${modernWrapperOpen}`;
  const wrappersClose =
    '<!--[if mso]>\n</div>\n<![endif]-->\n<!--[if !mso]><!-->\n</div>\n<!--<![endif]-->';

  const withConditionals = html
    .replace(openingBody, () => `${baseBodyTag}\n${wrappersOpen}`)
    .replace('</body>', `${wrappersClose}\n</body>`);

  return `<!DOCTYPE html>${withConditionals}`;
}
