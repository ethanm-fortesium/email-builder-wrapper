import { describe, expect, it } from 'vitest';

import { escapeAttr, msoOnly } from './rawHtml.js';

describe('escapeAttr', () => {
  it('escapes quotes, ampersands and angle brackets but leaves merge tokens intact', () => {
    expect(escapeAttr('https://x.test/?a=1&b="2"&c={{Email Address}}')).toBe(
      'https://x.test/?a=1&amp;b=&quot;2&quot;&amp;c={{Email Address}}'
    );
    expect(escapeAttr('<b>')).toBe('&lt;b&gt;');
  });

  it("keeps '-->' in a value from ending an Outlook-only comment early", () => {
    const html = msoOnly(`<v:roundrect href="${escapeAttr('https://x.test/?next=-->')}"></v:roundrect>`);
    // The only comment terminator is the one closing the conditional comment.
    expect(html.indexOf('-->')).toBe(html.length - '-->'.length);
  });
});
