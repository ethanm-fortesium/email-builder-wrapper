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

  return (
    '<!DOCTYPE html>' +
      html
        .replace(
          '<body',
          '<body style="margin:0;padding:0;background-color:#ffffff;">\n<!--[if mso]>\n<body class="mso" style="margin:0;padding:0;background-color:#ffffff;">\n<![endif]-->' 
        )
        .replace('</body>', '<!--[if mso]>\n</body>\n<![endif]-->\n</body>')
  );
}
