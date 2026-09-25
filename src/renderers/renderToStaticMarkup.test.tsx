// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import type { TReaderDocument } from '../Reader/core.js';

import renderToStaticMarkup, { MAX_LINE_LENGTH, foldLongLines } from './renderToStaticMarkup.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LOREM =
  'Classic Outlook renders HTML with the Microsoft Word engine, so every layout decision here has to survive a word processor. ';
const P = { top: 16, right: 24, bottom: 16, left: 24 };
const NO_PADDING = { top: 0, right: 0, bottom: 0, left: 0 };

function layout(childrenIds: string[], extra: Record<string, unknown> = {}) {
  return {
    type: 'EmailLayout',
    data: { backdropColor: '#F2F4F7', canvasColor: '#FFFFFF', textColor: '#262626', fontFamily: 'MODERN_SANS', childrenIds, ...extra },
  };
}
const text = (value: string, props: Record<string, unknown> = {}) => ({
  type: 'Text',
  data: { style: { padding: P }, props: { text: value, ...props } },
});
const columns = (left: string, right: string) => ({
  type: 'ColumnsContainer',
  data: {
    style: { padding: P },
    props: { columnsCount: 2, columnsGap: 16, columns: [{ childrenIds: [left] }, { childrenIds: [right] }, { childrenIds: [] }] },
  },
});

function doc(blocks: Record<string, unknown>) {
  return blocks as unknown as TReaderDocument;
}

function render(document: TReaderDocument, options: { lang?: string; dir?: 'ltr' | 'rtl'; title?: string } = {}) {
  return renderToStaticMarkup(document, { rootBlockId: 'root', ...options });
}

const count = (html: string, needle: string) => html.split(needle).length - 1;

/** Every block type, long text, merge tokens, columns, VML buttons and a rounded canvas. */
function representative(extra: Record<string, unknown> = {}) {
  return doc({
    root: layout(['h', 't', 'md', 'r', 'b', 'i', 'k', 'c', 'd', 's', 'x', 'sig'], {
      borderRadius: 16,
      borderColor: '#D0D5DD',
      ...extra,
    }),
    h: { type: 'Heading', data: { style: { padding: P }, props: { text: 'Your monthly update', level: 'h1' } } },
    t: text('Dear {{RecipientFirstName}}, ' + LOREM.repeat(30)),
    md: text('**Markdown** with a [link](https://example.com/{{CaseId}}) and a list:\n\n- first\n- second', { markdown: true }),
    r: {
      type: 'RichText',
      data: { style: { padding: P }, props: { html: `<p>${LOREM.repeat(12)}<a href="https://example.com/{{CaseId}}">case link</a></p><ul><li>One</li><li>Two</li></ul>` } },
    },
    b: {
      type: 'Button',
      data: { style: { padding: P, textAlign: 'center' }, props: { text: 'Read the full update', url: 'https://example.com', buttonBackgroundColor: '#1F6FEB' } },
    },
    i: { type: 'Image', data: { style: { padding: NO_PADDING }, props: { url: 'https://cdn.example.com/images/hero.png', alt: 'Hero', width: 600 } } },
    k: columns('kl', 'kr'),
    kl: text(LOREM.repeat(3), { padding: NO_PADDING }),
    kr: { type: 'Button', data: { style: { padding: NO_PADDING }, props: { text: 'Column button', url: 'https://example.com', fullWidth: true } } },
    c: { type: 'Container', data: { style: { padding: P, backgroundColor: '#EFF8FF' }, props: { childrenIds: ['ct'] } } },
    ct: text('Inside a container.', { padding: NO_PADDING }),
    d: { type: 'Divider', data: { style: { padding: P }, props: { lineColor: '#EAECF0', lineHeight: 1 } } },
    s: { type: 'Spacer', data: { props: { height: 24 } } },
    x: {
      type: 'Html',
      data: { style: { padding: P }, props: { contents: '<table width="100%"><tr><td style="background:#F2F4F7">Cell A</td><td>Cell B</td></tr></table>' } },
    },
    sig: {
      type: 'Signature',
      data: {
        style: { padding: P, fontSize: 14 },
        props: {
          fullName: 'Alex Example',
          title: 'Head of Things',
          company: 'Example Ltd',
          email: 'alex@example.com',
          phone: '+44 20 7946 0000',
          website: 'https://example.com',
          logoUrl: 'https://cdn.example.com/logo.png',
          logoWidth: 140,
          disclaimerHtml: `<p>${LOREM.repeat(4)}</p>`,
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Document shell
// ---------------------------------------------------------------------------

describe('renderToStaticMarkup – head', () => {
  const html = render(representative());

  it.each([
    '<!DOCTYPE html>',
    '<html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<meta http-equiv="X-UA-Compatible" content="IE=edge" />',
    '<meta name="color-scheme" content="light only" />',
    '<o:PixelsPerInch>96</o:PixelsPerInch>',
    '<!--[if mso]><style>',
    'a[x-apple-data-detectors]',
    '<div role="article" aria-roledescription="email"',
  ])('contains %s exactly once', (needle) => {
    expect(count(html, needle)).toBe(1);
  });

  it('gives the body the backdrop colour', () => {
    expect(html).toContain('<body style="margin:0;padding:0;word-spacing:normal;');
    expect(html).toContain('background-color:#F2F4F7;" bgcolor="#F2F4F7">');
  });

  it('sets Word’s default cell typography from the layout', () => {
    const custom = render(doc({ root: layout([], { fontFamily: 'BOOK_SERIF', baseFontSize: 14, textColor: '#344054' }) }));
    const mso = /<!--\[if mso\]><style>([\s\S]*?)<\/style><!\[endif\]-->/.exec(custom)![1];
    expect(mso).toContain('table,td,th{mso-table-lspace:0pt;mso-table-rspace:0pt;}');
    expect(mso).toContain('td,th{font-family:"Palatino Linotype";color:#344054;font-size:14px;letter-spacing:0.15008px;}');
    expect(mso).toContain('p{margin-top:1em;margin-bottom:1em;}');
  });

  it('uses defaults when the root is not an EmailLayout', () => {
    const other = render(doc({ root: text('Bare text') }));
    expect(other).toContain('td,th{font-family:Arial;color:#262626;font-size:16px;');
    expect(other).toContain('bgcolor="#F5F5F5"');
  });

  it('escapes the title and uses it as the article name', () => {
    const titled = render(doc({ root: layout([]) }), { title: 'Q&A <draft> "one"' });
    expect(titled).toContain('<title>Q&amp;A &lt;draft&gt; &quot;one&quot;</title>');
    expect(titled).toContain('aria-label="Q&amp;A &lt;draft&gt; &quot;one&quot;"');
  });

  it('omits the title when none is given', () => {
    const plain = render(doc({ root: layout([]) }));
    expect(plain).not.toContain('<title');
    expect(plain).not.toContain('aria-label=');
  });

  it('sets lang and dir on html and on the article wrapper', () => {
    const rtl = render(doc({ root: layout([]) }), { lang: 'ar', dir: 'rtl' });
    expect(rtl).toContain('<html lang="ar" dir="rtl" ');
    expect(rtl).toContain('<div role="article" aria-roledescription="email" lang="ar" dir="rtl"');
    // No language is claimed when none is given.
    expect(render(doc({ root: layout([]) }))).not.toContain(' lang=');
  });
});

describe('renderToStaticMarkup – responsive styles', () => {
  it('emits no media query when no block needs one', () => {
    expect(render(doc({ root: layout(['t']), t: text('Hello') }))).not.toContain('@media');
  });

  it.each([
    [480, 600],
    [600, 600],
    [900, 899],
  ])('stacks columns below max(600, canvas - 1) for a %ipx canvas', (canvasWidth, breakpoint) => {
    const html = render(doc({ root: layout(['k'], { canvasWidth }), k: columns('a', 'b'), a: text('A'), b: text('B') }));
    expect(count(html, '@media')).toBe(1);
    expect(html).toContain(`@media only screen and (max-width:${breakpoint}px){`);
  });
});

describe('renderToStaticMarkup – body', () => {
  it('leaves no raw-HTML placeholders or span-wrapped conditional comments', () => {
    const html = render(representative());
    expect(html).not.toContain('<eb-raw');
    expect(html).not.toContain('</eb-raw');
    expect(html).not.toMatch(/<span><!--\[if/);
  });

  it('keeps merge tokens byte for byte', () => {
    const html = render(representative());
    expect(html).toContain('Dear {{RecipientFirstName}},');
    expect(count(html, 'https://example.com/{{CaseId}}')).toBeGreaterThanOrEqual(2);
  });

  it('stays well under Gmail’s 102KB clipping limit for a long email', () => {
    const blocks: Record<string, unknown> = { ...representative() };
    const ids: string[] = [];
    for (let n = 0; n < 4; n++) {
      for (const id of ['h', 't', 'md', 'r', 'b', 'i', 'k', 'c', 'd', 's']) {
        ids.push(id);
      }
    }
    blocks.root = layout(ids, { borderRadius: 16 });
    expect(render(doc(blocks)).length).toBeLessThan(90_000);
  });
});

describe('renderToStaticMarkup – rounded canvas', () => {
  it('rounds and clips the canvas in browsers; Outlook keeps square corners without VML', () => {
    const html = render(doc({ root: layout(['t'], { borderRadius: 16 }), t: text('Hi') }));
    expect(html).toContain('border-radius:16px;overflow-x:auto;overflow-y:hidden');
    expect(html).not.toContain('<v:shape');
  });

  it('does not clip a square canvas', () => {
    const html = render(doc({ root: layout(['t']), t: text('Hi') }));
    expect(html).not.toContain('overflow-x:auto');
  });
});

describe('renderToStaticMarkup – link colour', () => {
  const LONG_URL = 'https://example.com/' + 'segment/'.repeat(20);
  const LONG_EMAIL = 'mailbox'.repeat(10) + '@example.com';

  /** One link from every source that colours links: rich text, markdown, plain-text addresses and Html blocks. */
  function linksDocument(extra: Record<string, unknown> = {}) {
    return doc({
      root: layout(['r', 'own', 'md', 't', 'x', 'dark'], extra),
      r: { type: 'RichText', data: { style: { padding: P }, props: { html: '<p>Read the <a href="https://example.com/rich">terms</a>.</p>' } } },
      own: {
        type: 'RichText',
        data: { style: { padding: P }, props: { html: '<p><a href="https://example.com/own" style="color:#067647">own colour</a></p>' } },
      },
      md: text('See [our site](https://example.com/markdown).', { markdown: true }),
      t: text(`Visit ${LONG_URL} or write to ${LONG_EMAIL}.`),
      x: {
        type: 'Html',
        data: {
          style: { padding: P },
          props: { contents: '<p><a href="https://example.com/html">bare link</a> <a href="https://example.com/styled" style="color:#6941C6">styled link</a></p>' },
        },
      },
      dark: {
        type: 'RichText',
        data: {
          style: { padding: P, backgroundColor: '#101828', color: '#FFFFFF' },
          props: { html: '<p>On dark: <a href="https://example.com/dark">link</a>.</p>' },
        },
      },
    });
  }

  /** The inline `color` of the exported link to `href`. */
  function colourOf(html: string, href: string) {
    const a = new DOMParser().parseFromString(html, 'text/html').querySelector(`a[href="${href}"]`);
    expect(a, `link to ${href}`).not.toBeNull();
    return /(?:^|;)\s*color:\s*([^;]+)/.exec(a!.getAttribute('style') ?? '')?.[1].trim();
  }

  const SOURCES = [
    ['rich text', 'https://example.com/rich'],
    ['markdown', 'https://example.com/markdown'],
    ['a too-wide plain-text URL', LONG_URL],
    ['a too-wide plain-text email address', `mailto:${LONG_EMAIL}`],
    ['an unstyled Html-block link', 'https://example.com/html'],
  ];

  it.each(SOURCES)('gives %s the layout link colour', (_, href) => {
    expect(colourOf(render(linksDocument({ linkColor: '#B42318' })), href)).toBe('#B42318');
  });

  it.each(SOURCES)('gives %s the default #0000EE when no link colour is set', (_, href) => {
    expect(colourOf(render(linksDocument()), href)).toBe('#0000EE');
  });

  it('keeps a colour the author set on the link', () => {
    const html = render(linksDocument({ linkColor: '#B42318' }));
    expect(colourOf(html, 'https://example.com/own')).toBe('#067647');
    expect(colourOf(html, 'https://example.com/styled')).toBe('#6941C6');
  });

  it('uses the text colour for links a layout link colour would leave unreadable on a dark background', () => {
    const html = render(linksDocument({ linkColor: '#B42318' }));
    expect(colourOf(html, 'https://example.com/dark')).toBe('#FFFFFF');
  });

  it('keeps a light link colour on a dark background', () => {
    const html = render(linksDocument({ linkColor: '#84CAFF' }));
    expect(colourOf(html, 'https://example.com/dark')).toBe('#84CAFF');
  });
});

// ---------------------------------------------------------------------------
// Line folding
// ---------------------------------------------------------------------------

describe('foldLongLines', () => {
  it('keeps every line of a representative email within the SMTP limit', () => {
    for (const html of [render(representative()), render(representative({ canvasWidth: 900, borderColor: null }))]) {
      const longest = Math.max(...html.split('\n').map((line) => line.length));
      expect(longest).toBeLessThanOrEqual(MAX_LINE_LENGTH);
    }
  });

  it('returns short documents unchanged', () => {
    const html = '<p style="margin:0">Short</p>\n<p>Also short</p>';
    expect(foldLongLines(html)).toBe(html);
  });

  it('only turns existing spaces into newlines', () => {
    const html = render(representative());
    const unfolded = html.replace(/\n/g, ' ');
    const refolded = foldLongLines(unfolded, 80);
    expect(refolded.length).toBe(unfolded.length);
    expect(refolded.replace(/\n/g, ' ')).toBe(unfolded);
  });

  it('prefers the space between attributes over the space between words', () => {
    const html = `<td style="padding:0" class="cell">${'word '.repeat(20)}</td>`;
    const folded = foldLongLines(html, 60);
    expect(folded.startsWith('<td style="padding:0"\nclass="cell">')).toBe(true);
  });

  it('folds text between words when a line has no tag to fold', () => {
    const folded = foldLongLines('word '.repeat(40), 50);
    folded.split('\n').forEach((line) => expect(line.length).toBeLessThanOrEqual(50));
  });

  it('never folds attribute values, merge tokens, conditional markers or raw-text elements', () => {
    const html =
      '<!--[if mso]><table role="presentation" style="width:600px; border:0"><tr><td>{{ First Name }} and {{Last Name}} with more words</td></tr></table><![endif]-->' +
      '<!--[if !mso]><!--><div title="a long title with spaces">x</div><!--<![endif]-->' +
      '<style>td { color: red; font-family: "Palatino Linotype"; }</style><title>A long subject line</title>';
    const folded = foldLongLines(html, 10);
    for (const kept of [
      '<!--[if mso]>',
      '<![endif]-->',
      '<!--[if !mso]><!-->',
      '<!--<![endif]-->',
      'style="width:600px; border:0"',
      '{{ First Name }}',
      'title="a long title with spaces"',
      '<style>td { color: red; font-family: "Palatino Linotype"; }</style>',
      '<title>A long subject line</title>',
    ]) {
      expect(folded).toContain(kept);
    }
    expect(folded).toContain('<table\nrole="presentation"');
  });

  it('never folds plain comments', () => {
    const html = `<!-- ${'a comment '.repeat(20)}-->`;
    expect(foldLongLines(html, 20)).toBe(html);
  });

  it('leaves text alone when the document preserves whitespace', () => {
    const html = `<pre>${'x '.repeat(40)}</pre><p>${'word '.repeat(40)}</p>`;
    expect(foldLongLines(html, 30)).toBe(html);
  });

  it('treats a stray {{ as text instead of skipping the rest of the document', () => {
    const html = `<p>Dear {{FirstName}, welcome.</p>${'<p>word word word word</p> '.repeat(20)}`;
    const folded = foldLongLines(html, 80);
    folded.split('\n').forEach((line) => expect(line.length).toBeLessThanOrEqual(80));
  });

  it('measures lines in UTF-8 octets', () => {
    const greek = 'καλημέρα '.repeat(30);
    const folded = foldLongLines(`<p>${greek}</p>`, 100);
    folded.split('\n').forEach((line) => expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(100));
  });

  it('keeps each link on one line and folds around it', () => {
    const link = '<a href="https://example.com/{{Case Code}}" style="color:#0000EE; text-decoration:underline">Open the case record</a>';
    const html = `<p style="margin:0">${'word '.repeat(12)}${link} ${'word '.repeat(12)}</p>`;
    const folded = foldLongLines(html, 60);
    expect(folded).toContain(link);
    expect(folded).not.toBe(html);
  });
});
