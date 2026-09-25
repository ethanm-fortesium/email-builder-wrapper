// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import renderToStaticMarkup from '../../../renderers/renderToStaticMarkup.js';
import type { TReaderDocument } from '../../../Reader/core.js';
import { BREAK_OPPORTUNITY, ZWSP, breakLongTokens } from '../helpers/breakLongTokens.js';

function render(text: string) {
  const document = {
    root: {
      type: 'EmailLayout',
      data: { backdropColor: '#F2F4F7', canvasColor: '#FFFFFF', textColor: '#262626', fontFamily: 'MODERN_SANS', canvasWidth: 480, childrenIds: ['h'] },
    },
    h: { type: 'Heading', data: { style: { padding: { top: 16, right: 24, bottom: 16, left: 24 } }, props: { text, level: 'h1' } } },
  };
  return renderToStaticMarkup(document as unknown as TReaderDocument, { rootBlockId: 'root' }).replace(/\n/g, ' ');
}

describe('HeadingReader', () => {
  it('breaks too-wide words with <wbr> and a zero width space only Word sees', () => {
    const word = 'SUPERCALIFRAGILISTICEXPIALIDOCIOUSLY';
    const pieces = breakLongTokens(word, { width: 432, fontSize: 32, bold: true });
    expect(pieces.length).toBeGreaterThan(1);
    const html = render(`${word} {{RecipientFirstName}}`);
    expect(html).toContain(`>${pieces.join(BREAK_OPPORTUNITY)} {{RecipientFirstName}}</h1>`);
    expect(html.replace(/<!--\[if mso\]>.*?<!\[endif\]-->/g, '')).not.toContain(ZWSP);
  });

  it('leaves headings that fit unchanged', () => {
    expect(render('Your monthly update')).toMatch(/<h1 [^>]*>Your monthly update<\/h1>/);
  });
});
