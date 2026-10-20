/**
 * @vitest-environment happy-dom
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  BREAK_OPPORTUNITY,
  ZWSP,
  breakLongTokens,
  breakLongTokensInTree,
  estimateTokenWidth,
  splitLongUrls,
  withBreakOpportunities,
} from './breakLongTokens.js';
import { stripRawHtmlWrappers } from './rawHtml.js';

const BODY = { width: 432, fontSize: 16 };
const URL = 'https://example.com/a/really/long/path/with-many-segments/and_underscores/that-never-ends?query=string&another=parameter#fragment';
const ADDRESS = 'registrations.department.team@longsubdomainname.example-organisation.co.uk';

/** Pieces joined with a visible marker, to assert where the breaks are. */
const marked = (pieces: string[]) => pieces.join('|');

describe('estimateTokenWidth', () => {
  it('is generous for wide glyphs, bold and letter spacing', () => {
    const lower = estimateTokenWidth('abcdefghij', { fontSize: 16 });
    const upper = estimateTokenWidth('ABCDEFGHIJ', { fontSize: 16 });
    const bold = estimateTokenWidth('ABCDEFGHIJ', { fontSize: 16, bold: true });
    const wide = estimateTokenWidth('WWWWWWWWWW', { fontSize: 16 });
    const spaced = estimateTokenWidth('abcdefghij', { fontSize: 16, letterSpacing: 1 });
    expect(upper).toBeGreaterThan(lower);
    expect(bold).toBeGreaterThan(upper);
    expect(wide).toBeGreaterThan(upper);
    expect(spaced).toBeCloseTo(lower + 10 * 1.1, 5);
    // Arial renders 10 lowercase letters at 16px in about 80px; the estimate must not be below it.
    expect(lower).toBeGreaterThan(80);
  });
});

describe('breakLongTokens', () => {
  it('leaves text whose tokens fit whole', () => {
    const text = 'Plain prose with ordinary words and a short https://example.com link.';
    expect(breakLongTokens(text, BODY)).toEqual([text]);
  });

  it('breaks a too-wide URL after its separators only', () => {
    const pieces = breakLongTokens(`Visit ${URL} now`, BODY);
    expect(pieces.join('')).toBe(`Visit ${URL} now`);
    expect(marked(pieces)).toContain('Visit https://|example.|com/|a/');
    expect(marked(pieces)).toContain('and_|underscores');
    expect(marked(pieces)).toContain('?|query=|string&|another');
    // No break inside the words between separators.
    expect(marked(pieces)).toContain('|segments/|');
  });

  it('splits long separator-free runs into pieces of at most 8 characters', () => {
    const token = 'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGH';
    const pieces = breakLongTokens(token, BODY);
    expect(pieces.join('')).toBe(token);
    expect(pieces.length).toBeGreaterThan(1);
    expect(Math.max(...pieces.map((p) => p.length))).toBeLessThanOrEqual(8);
  });

  it('uses smaller pieces when even 8 characters do not fit', () => {
    const pieces = breakLongTokens('WWWWWWWWWWWWWWWW', { width: 100, fontSize: 32, bold: true });
    expect(pieces.every((p) => estimateTokenWidth(p, { fontSize: 32, bold: true }) <= 100)).toBe(true);
  });

  it('catches bold all-caps heading words the old 0.55em estimate missed', () => {
    const word = 'SUPERCALIFRAGILISTICEXPIALIDOCIOUSLY';
    expect(word.length * 0.55 * 32).toBeLessThan(700);
    expect(breakLongTokens(word, { width: 432, fontSize: 32, bold: true }).length).toBeGreaterThan(1);
  });

  it('is idempotent: every piece is left whole by a second pass', () => {
    const text = `See ${URL} and ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ, {{RecipientFirstName}}.`;
    const pieces = breakLongTokens(text, BODY);
    expect(pieces.length).toBeGreaterThan(1);
    for (const piece of pieces) {
      expect(breakLongTokens(piece, BODY)).toEqual([piece]);
    }
  });

  it('never splits or alters merge tokens', () => {
    const tokens = ['{{RecipientFirstName}}', '{{VeryLongMergeTokenNameForTestingThatIsReallyLongIndeedAndMore}}'];
    const text = `Dear ${tokens[0]}, ref:${tokens[1]}/${'x'.repeat(80)} and ${tokens[1]}`;
    const pieces = breakLongTokens(text, { width: 200, fontSize: 16 });
    expect(pieces.join('')).toBe(text);
    for (const token of tokens) {
      expect(marked(pieces).split(token).length).toBe(text.split(token).length);
    }
    expect(marked(pieces)).not.toMatch(/\{\{[^}]*\|/);
  });

  it('never splits merge tokens that contain spaces, even in narrow columns', () => {
    const tokens = ['{{Email Address}}', '{{ First Name }}', '{{Registration Number}}'];
    const text = `Hello ${tokens[0]} ${tokens[1]}, ref:${tokens[2]} sent to ${tokens[2]}`;
    for (const options of [{ width: 120, fontSize: 16 }, { width: 150, fontSize: 32, bold: true }]) {
      const pieces = breakLongTokens(text, options);
      expect(pieces.join('')).toBe(text);
      for (const token of tokens) {
        expect(marked(pieces).split(token).length).toBe(text.split(token).length);
      }
      expect(marked(pieces)).not.toMatch(/\{\{[^}]*\|/);
    }
  });

  it('leaves scripts without spaces between words to the engines', () => {
    const thai = 'ภาษาไทยเป็นภาษาที่ไม่มีการเว้นวรรคระหว่างคำภาษาไทยเป็นภาษาที่ไม่มีการเว้นวรรคระหว่างคำ';
    const cjk = '日本語の文章は単語の間に空白を入れません日本語の文章は単語の間に空白を入れません日本語の文章は単語の間に空白を入れません';
    expect(breakLongTokens(thai, { width: 100, fontSize: 16 })).toEqual([thai]);
    expect(breakLongTokens(cjk, { width: 100, fontSize: 16 })).toEqual([cjk]);
  });

  it('treats non-breaking spaces as part of a token', () => {
    const joined = Array(12).fill('word').join('\u00A0');
    expect(breakLongTokens(joined, { width: 150, fontSize: 16 }).length).toBeGreaterThan(1);
  });
});

describe('withBreakOpportunities', () => {
  const render = (children: React.ReactNode[]) => stripRawHtmlWrappers(renderToStaticMarkup(React.createElement('div', null, children)));

  it('puts a <wbr> and a zero width space only Word sees between the pieces', () => {
    expect(BREAK_OPPORTUNITY).toBe(`<wbr><!--[if mso]>${ZWSP}<![endif]-->`);
    const pieces = breakLongTokens(URL, BODY);
    const html = render(withBreakOpportunities(URL, BODY));
    expect(html).toBe(`<div>${pieces.join(BREAK_OPPORTUNITY).replace(/&/g, '&amp;')}</div>`);
    // Every client but Outlook ignores the conditional comments: no invisible character to copy or cut auto-linking.
    expect(html.replace(/<!--\[if mso\]>.*?<!\[endif\]-->/g, '')).not.toContain(ZWSP);
  });

  it('renders text that fits as it is', () => {
    expect(withBreakOpportunities('Short text.', BODY)).toEqual(['Short text.']);
  });
});

describe('splitLongUrls', () => {
  it('turns only too-wide bare URLs into links, without trailing punctuation', () => {
    expect(splitLongUrls('See https://example.com/short.', BODY)).toEqual([{ text: 'See https://example.com/short.' }]);
    expect(splitLongUrls(`See ${URL}. Then www.${'x'.repeat(90)}.com, ok`, BODY)).toEqual([
      { text: 'See ' },
      { text: URL, href: URL },
      { text: '. Then ' },
      { text: `www.${'x'.repeat(90)}.com`, href: `http://www.${'x'.repeat(90)}.com` },
      { text: ', ok' },
    ]);
  });

  it('keeps merge tokens in the link and its text', () => {
    const url = `${URL}&id={{RecipientId}}`;
    expect(splitLongUrls(url, BODY)).toEqual([{ text: url, href: url }]);
  });

  it('keeps a merge token that ends a URL whole, before trailing punctuation too', () => {
    const narrow = { width: 300, fontSize: 16 };
    const https = 'https://portal.example.org.uk/applications/verify-account/confirm?ref={{Ref}}';
    const www = 'www.portal.example.org.uk/applications/verify-account/confirm?ref={{Ref}}';
    expect(splitLongUrls(`Go ${https} now`, narrow)).toEqual([{ text: 'Go ' }, { text: https, href: https }, { text: ' now' }]);
    expect(splitLongUrls(`Go ${https}. Thanks`, narrow)).toEqual([{ text: 'Go ' }, { text: https, href: https }, { text: '. Thanks' }]);
    expect(splitLongUrls(`Go ${www}, ok`, narrow)).toEqual([{ text: 'Go ' }, { text: www, href: `http://${www}` }, { text: ', ok' }]);
  });

  it('keeps merge tokens that contain spaces in the link', () => {
    const end = `${URL}&email={{Email Address}}`;
    const middle = `https://portal.example.org.uk/{{Process Code}}/applications/verify-account/confirm?step=final&source=email`;
    expect(splitLongUrls(`Verify at ${end} today`, BODY)).toEqual([
      { text: 'Verify at ' },
      { text: end, href: end },
      { text: ' today' },
    ]);
    expect(splitLongUrls(middle, BODY)).toEqual([{ text: middle, href: middle }]);
  });

  it('turns too-wide bare email addresses into mailto links with the address intact', () => {
    const narrow = { width: 300, fontSize: 16 };
    expect(splitLongUrls(`Write to ${ADDRESS}. Thanks`, narrow)).toEqual([
      { text: 'Write to ' },
      { text: ADDRESS, href: `mailto:${ADDRESS}` },
      { text: '. Thanks' },
    ]);
    expect(splitLongUrls(`(${ADDRESS})`, narrow)).toEqual([{ text: '(' }, { text: ADDRESS, href: `mailto:${ADDRESS}` }, { text: ')' }]);
    const withToken = `support+{{Ref}}@longsubdomainname.example-organisation.co.uk`;
    expect(splitLongUrls(withToken, narrow)).toEqual([{ text: withToken, href: `mailto:${withToken}` }]);
  });

  it('leaves email addresses that fit, and addresses inside URLs, alone', () => {
    expect(splitLongUrls('Mail info@example.com today.', BODY)).toEqual([{ text: 'Mail info@example.com today.' }]);
    const url = `https://example.com/profile/@someone/${'x'.repeat(60)}?from=${ADDRESS}`;
    expect(splitLongUrls(url, BODY)).toEqual([{ text: url, href: url }]);
  });
});

describe('breakLongTokensInTree', () => {
  it('breaks text nodes only, never attributes or code', () => {
    const root = document.createElement('div');
    root.innerHTML = `<p><a href="${URL}" title="${URL}">${URL}</a></p><pre>${URL}</pre><code>${URL}</code><style>.x{background:url(${URL})}</style>`;
    breakLongTokensInTree(root, () => BODY);
    const a = root.querySelector('a')!;
    expect(a.getAttribute('href')).toBe(URL);
    expect(a.getAttribute('title')).toBe(URL);
    expect(a.innerHTML).toBe(breakLongTokens(URL, BODY).join(BREAK_OPPORTUNITY).replace(/&/g, '&amp;'));
    expect(a.textContent).toBe(URL);
    expect(root.querySelectorAll('pre wbr, code wbr, style wbr')).toHaveLength(0);
    expect(root.querySelector('pre')!.textContent).toBe(URL);
    expect(root.querySelector('style')!.textContent).not.toContain(ZWSP);
  });

  it('uses the options of the element holding each text node', () => {
    const root = document.createElement('div');
    root.innerHTML = `<p>${URL}</p><h1>${URL}</h1>`;
    breakLongTokensInTree(root, (parent) => (parent.tagName === 'H1' ? null : BODY));
    expect(root.querySelectorAll('p wbr').length).toBeGreaterThan(0);
    expect(root.querySelector('h1')!.innerHTML).toBe(URL.replace(/&/g, '&amp;'));
  });

  it('breaks every text node of an element, and is idempotent', () => {
    const root = document.createElement('div');
    root.innerHTML = `<p>${URL} <b>and</b> ${URL}</p>`;
    breakLongTokensInTree(root, () => BODY);
    const once = root.innerHTML;
    expect(once.split(BREAK_OPPORTUNITY)).toHaveLength(2 * (breakLongTokens(URL, BODY).length - 1) + 1);
    breakLongTokensInTree(root, () => BODY);
    expect(root.innerHTML).toBe(once);
  });
});
