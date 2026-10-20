// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import renderToStaticMarkup from '../../../renderers/renderToStaticMarkup.js';
import type { TReaderDocument } from '../../../Reader/core.js';
import { BREAK_OPPORTUNITY, ZWSP, breakLongTokens } from '../helpers/breakLongTokens.js';

const P = { top: 16, right: 24, bottom: 16, left: 24 };
const URL = 'https://example.com/a/really/long/path/with-many-segments/and_underscores/that-never-ends?query=string&another=parameter';
const ADDRESS = 'registrations.department.team@longsubdomainname.example-organisation.co.uk';

/** Render a document with one block (Text unless given) in a 480px canvas, folded lines joined again. */
function render(block: Record<string, unknown>) {
  const document = {
    root: {
      type: 'EmailLayout',
      data: { backdropColor: '#F2F4F7', canvasColor: '#FFFFFF', textColor: '#262626', fontFamily: 'MODERN_SANS', canvasWidth: 480, childrenIds: ['b'] },
    },
    b: { type: 'Text', ...block },
  };
  return renderToStaticMarkup(document as unknown as TReaderDocument, { rootBlockId: 'root' }).replace(/\n/g, ' ');
}

/** What every client except classic Outlook sees: Outlook-only conditional comments removed. */
const withoutMso = (html: string) => html.replace(/<!--\[if mso\]>.*?<!\[endif\]-->/g, '');

describe('TextReader', () => {
  it('breaks too-wide tokens with <wbr> and a zero width space only Word sees', () => {
    const word = 'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGH';
    const html = render({ data: { style: { padding: P }, props: { text: `Reference ${word} ends here.` } } });
    const pieces = breakLongTokens(word, { width: 432, fontSize: 16 });
    expect(pieces.length).toBeGreaterThan(1);
    expect(html).toContain(`Reference ${pieces.join(BREAK_OPPORTUNITY)} ends here.`);
    expect(withoutMso(html)).not.toContain(ZWSP);
  });

  it('links too-wide bare URLs and email addresses before breaking them', () => {
    const html = render({ data: { style: { padding: P }, props: { text: `Visit ${URL} or write to ${ADDRESS}.` } } });
    const url = /<a href="([^"]*)" target="_blank" style="color:#0000EE;text-decoration:underline">(.*?)<\/a>/g;
    const links = Array.from(html.matchAll(url)).map(([, href, text]) => ({ href, text: text.split(BREAK_OPPORTUNITY) }));
    expect(links.map((link) => link.href)).toEqual([URL.replace(/&/g, '&amp;'), `mailto:${ADDRESS}`]);
    expect(links[1].text.join('')).toBe(ADDRESS);
    expect(links.every((link) => link.text.length > 1)).toBe(true);
    expect(withoutMso(html)).not.toContain(ZWSP);
  });

  it('gives a root-level markdown image its own at-least line in Word', () => {
    const text = 'Intro paragraph.\n\n<img src="https://example.com/logo.png" width="96" height="96" alt="logo">\n\nAfter the image.';
    const html = render({ data: { style: { padding: P }, props: { text, markdown: true } } });
    expect(html).toMatch(/<div style="[^"]*mso-line-height-rule:at-least[^"]*">\s*<img src="https:\/\/example.com\/logo.png"/);
  });
});
