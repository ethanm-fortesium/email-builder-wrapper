/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';

import { BREAK_OPPORTUNITY, ZWSP } from './breakLongTokens.js';
import { DEFAULT_TYPOGRAPHY, resolveTypography } from './emailTypography.js';
import { EmailHtmlMode, EmailHtmlOptions, effectiveLinkColor, normaliseEmailHtml } from './emailHtmlNormaliser.js';

const T = DEFAULT_TYPOGRAPHY;
const options = (mode: EmailHtmlMode, extra: Partial<EmailHtmlOptions> = {}): EmailHtmlOptions => ({
  mode,
  typography: T,
  width: 552,
  background: '#FFFFFF',
  ...extra,
});
const normalise = (html: string, mode: EmailHtmlMode, extra: Partial<EmailHtmlOptions> = {}) => normaliseEmailHtml(html, options(mode, extra));
const parse = (html: string) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
};
const styleOf = (el: Element | null) => el?.getAttribute('style') ?? '';

const URL = 'https://example.com/a/really/long/path/with-many-segments/and_underscores/that-never-ends?query=string&another=parameter';
const ADDRESS = 'registrations.department.team@longsubdomainname.example-organisation.co.uk';

const QUILL = [
  '<p class="ql-align-center">Centred <span class="ql-size-large">large</span> and <span class="ql-font-serif">serif</span> E=mc<sup>2</sup></p>',
  '<p class="ql-indent-1">Indented {{RecipientFirstName}}</p>',
  '<div style="margin:0;padding:0;line-height:inherit;font-size:inherit">\u200B</div>',
  '<ol><li>one</li><li class="ql-indent-1">two</li><li>three</li></ol>',
  `<p><a href="${URL}" target="_blank">${URL}</a> <a href="{{LinkUrl}}"><span style="color: rgb(0, 128, 0);">green</span></a></p>`,
  '<p>Image <img src="https://example.com/i.png" width="48" height="48"> line</p>',
].join('');

const MARKDOWN = [
  '<h1>Title</h1><p>Para with <code>code</code> and <a href="https://example.com" target="_blank">link</a>.</p>',
  '<ol><li>First</li><li>Second<ul><li>nested</li><li>last nested</li></ul></li></ol>',
  '<blockquote><p>Quote</p></blockquote>',
  '<pre><code>line one\nline two\n</code></pre>',
  '<table width="100%"><thead><tr><th>H</th></tr></thead><tbody><tr><td>{{Cell}}</td></tr></tbody></table>',
  '<p><img src="https://example.com/i.png" width="800" height="400"></p>',
  '\n<img src="https://example.com/i.png" width="96" height="96" alt="logo">\n',
  '<ul><li>after the image</li></ul>',
  `<p>Write to ${ADDRESS} or ${URL}.</p>`,
  '<p><img src="https://example.com/w.png" width="900" height="300" style="width:100%;height:auto"></p>',
].join('');

const RAW = [
  '<p>Bare paragraph with a <a href="https://example.com">link</a> for {{RecipientFirstName}}.</p>',
  '<h2>Bare heading</h2>',
  "<ul><li>one</li><li>two</li></ul>",
  '<table width="100%" style="font-family:Georgia, serif;color:#175CD3"><tr><td style="background:#F2F4F7">A</td><td class="c" style=\'font-size:18px\'>B</td></tr></table>',
  '<div style="font-size:24px">Big</div>',
  '<!--[if mso]><p>only outlook</p><![endif]-->',
].join('');

describe('normaliseEmailHtml', () => {
  it.each([
    ['quill', QUILL],
    ['markdown', MARKDOWN],
    ['raw', RAW],
  ] as const)('is idempotent in %s mode', (mode, html) => {
    const once = normalise(html, mode);
    expect(normalise(once, mode)).toBe(once);
  });

  it.each([
    ['quill', QUILL],
    ['markdown', MARKDOWN],
    ['raw', RAW],
  ] as const)('preserves merge tokens in %s mode', (mode, html) => {
    const out = normalise(html, mode);
    for (const token of html.match(/\{\{[^}]*\}\}/g) ?? []) {
      expect(out.split(token).length).toBe(html.split(token).length);
    }
  });

  it('returns the input when there is nothing to normalise', () => {
    expect(normalise('', 'quill')).toBe('');
    expect(normalise('Plain text only.', 'raw')).toBe('Plain text only.');
  });
});

describe('lists', () => {
  it('keeps the browser geometry and gives Word its indent, spacing and hang', () => {
    const root = parse(normalise('<ul><li>a</li><li>b</li></ul><p>after</p>', 'quill'));
    const ul = root.querySelector('ul')!;
    expect(styleOf(ul)).toContain('list-style-type:disc');
    expect(styleOf(ul)).toContain('margin-top:0;margin-bottom:0;padding-left:24px');
    expect(ul.previousSibling?.nodeType).toBe(8);
    expect((ul.previousSibling as Comment).data).toBe('[if mso]><div style="margin-left:-24px"><![endif]');
    expect((ul.nextSibling as Comment).data).toBe('[if mso]></div><![endif]');
    const [first, last] = Array.from(root.querySelectorAll('li'));
    // Quill: li gap 0.5em; the last item carries max(gap, the list's 1em bottom margin).
    expect(styleOf(first)).toContain('margin-top:0px;margin-bottom:8px');
    expect(styleOf(last)).toContain('margin-bottom:16px');
    expect(styleOf(first)).toMatch(/mso-text-indent-alt:-\d+(\.\d)?px/);
  });

  it('uses markdown UA spacing and indent, with nested lists at 0', () => {
    const root = parse(normalise('<ul><li>a<ol><li>x</li></ol></li><li>b</li></ul>', 'markdown'));
    const [outer, inner] = Array.from(root.querySelectorAll('ul,ol'));
    expect(styleOf(outer)).toContain('padding-left:40px');
    expect((outer.previousSibling as Comment).data).toContain('margin-left:-8px');
    expect(styleOf(inner)).toContain('list-style-type:decimal');
    const items = Array.from(root.querySelectorAll('li'));
    expect(styleOf(items[0])).toContain('margin-top:16px');
    expect(styleOf(items[1])).toContain('margin-top:0px;margin-bottom:0px');
    expect(styleOf(items[2])).toContain('margin-bottom:16px');
  });

  it('chooses markers by depth counting ul and ol ancestors', () => {
    const root = parse(normalise('<ol><li>a<ul><li>b<ul><li>c</li></ul></li></ul></li></ol>', 'markdown'));
    const [, ul1, ul2] = Array.from(root.querySelectorAll('ul,ol'));
    expect(styleOf(ul1)).toContain('list-style-type:circle');
    expect(styleOf(ul2)).toContain('list-style-type:square');
  });

  it('moves an item bottom margin onto the nested list it ends with (where Word puts the gap)', () => {
    const root = parse(normalise('<ul><li>a</li><li>b<ol><li>x</li><li>y</li></ol></li></ul>', 'markdown'));
    const items = Array.from(root.querySelectorAll('li'));
    const b = items[1];
    const y = items[3];
    expect(styleOf(b)).toContain('margin-bottom:0px');
    expect(styleOf(y)).toContain('margin-bottom:16px');
  });

  it('sizes the ordered-list hang for the widest number and converts ql-indent to px', () => {
    const items = Array.from({ length: 12 }, (_, i) => `<li${i === 1 ? ' class="ql-indent-2"' : ''}>${i}</li>`).join('');
    const root = parse(normalise(`<ol>${items}</ol><ol><li>x</li></ol>`, 'quill'));
    const hang = (li: Element) => Number(/mso-text-indent-alt:-([\d.]+)px/.exec(styleOf(li))![1]);
    const [twelve, one] = Array.from(root.querySelectorAll('ol')).map((ol) => ol.querySelector('li')!);
    expect(hang(twelve) - hang(one)).toBeCloseTo(0.55 * 16, 0);
    expect(styleOf(root.querySelectorAll('li')[1])).toContain('margin-left:96px');
  });

  it('drops color:inherit but keeps an item colour promoted from its text', () => {
    const root = parse(normalise('<ul><li style="color:inherit">a</li><li style="color: rgb(230, 0, 0)">b</li></ul>', 'quill'));
    const [a, b] = Array.from(root.querySelectorAll('li'));
    expect(styleOf(a)).not.toContain('inherit');
    expect(styleOf(b)).toContain('color:rgb(230, 0, 0)');
  });
});

describe('links', () => {
  it('adds colour and underline independently, keeping existing values', () => {
    const root = parse(
      normalise(
        '<a href="x">plain</a><a href="x" style="color:#FF0000">red</a><a href="x" style="text-decoration:none">bare</a><a href="x"><span style="color: rgb(0, 128, 0);">green</span></a>',
        'quill'
      )
    );
    const [plain, red, bare, green] = Array.from(root.querySelectorAll('a'));
    expect(styleOf(plain)).toBe('color:#0000EE;text-decoration:underline');
    expect(styleOf(red)).toBe('color:#FF0000;text-decoration:underline');
    expect(styleOf(bare)).toBe('text-decoration:none;color:#0000EE');
    expect(styleOf(green)).toContain('color:rgb(0, 128, 0)');
  });

  it('does not underline image-only links', () => {
    const root = parse(normalise('<a href="x"><img src="i.png" width="10" height="10"></a>', 'markdown'));
    expect(styleOf(root.querySelector('a'))).toBe('text-decoration:none');
  });

  it('uses the text colour on dark backgrounds when the link colour is unreadable', () => {
    const typography = resolveTypography(T, { color: '#FFFFFF' });
    expect(effectiveLinkColor({ typography, background: '#101828' })).toBe('#FFFFFF');
    expect(effectiveLinkColor({ typography: resolveTypography(T, { linkColor: '#9EC5FF' }), background: '#101828' })).toBe('#9EC5FF');
    expect(effectiveLinkColor({ typography, background: '#FFFFFF' })).toBe('#0000EE');
    const root = parse(normalise('<p><a href="x">link</a></p>', 'quill', { typography, background: '#101828' }));
    expect(styleOf(root.querySelector('a'))).toContain('color:#FFFFFF');
  });

  it('raw mode styles only bare links, and none when the fragment has a stylesheet', () => {
    const bare = normalise('<p><a href="x">a</a> <a class="btn" href="y">b</a> <a href="z" style="color:red">c</a></p>', 'raw');
    expect(bare).toContain('<a href="x" style="color:#0000EE;text-decoration:underline">a</a>');
    expect(bare).toContain('<a class="btn" href="y">b</a>');
    expect(bare).toContain('<a href="z" style="color:red">c</a>');
    const styled = '<style>.btn{color:#fff}</style><p><a href="x">a</a></p>';
    expect(normalise(styled, 'raw')).toBe(styled);
  });
});

describe('markdown defaults', () => {
  it('makes UA paragraph, heading, quote and code styles explicit', () => {
    const root = parse(normalise(MARKDOWN, 'markdown'));
    expect(styleOf(root.querySelector('p'))).toBe('margin:16px 0');
    const h1 = styleOf(root.querySelector('h1'));
    expect(h1).toContain('margin:21.44px 0');
    expect(h1).toContain('font-size:32px');
    expect(h1).toContain('mso-line-height-alt:48px');
    expect(h1).toContain('mso-font-kerning:0pt');
    expect(styleOf(root.querySelector('blockquote'))).toBe('margin:16px 40px');
    const code = styleOf(root.querySelector('p code'));
    expect(code).toContain('font-family:monospace;font-size:16px');
    expect(code).toContain('mso-ascii-font-family:Consolas');
  });

  it('turns pre newlines into line breaks without a trailing one', () => {
    const pre = parse(normalise('<pre><code>a\nb\n</code></pre>', 'markdown')).querySelector('pre')!;
    expect(pre.innerHTML).toMatch(/<code[^>]*>a<br>b<\/code>/);
    expect(styleOf(pre)).toContain('mso-line-height-alt:24px');
  });

  it('gives table cells the inherited typography', () => {
    const root = parse(normalise(MARKDOWN, 'markdown'));
    expect(styleOf(root.querySelector('td'))).toContain('mso-ascii-font-family:Arial');
    expect(styleOf(root.querySelector('td'))).toContain('mso-line-height-rule:at-least');
    expect(styleOf(root.querySelector('th'))).toContain('font-weight:bold');
  });
});

describe('Word line guards', () => {
  it('gives paragraphs with images or larger text their own at-least line', () => {
    const root = parse(
      normalise('<p>a <img src="i.png" width="48" height="48"> b</p><p>x <span style="font-size:24px">big</span> y</p><p>plain</p>', 'quill')
    );
    const [image, big, plain] = Array.from(root.querySelectorAll('p'));
    // Single image line: the browser's line box (48px image + the strut below the baseline).
    expect(styleOf(image)).toContain('mso-line-height-alt:55px;mso-line-height-rule:at-least;mso-text-raise:0pt');
    expect(styleOf(big)).toContain('mso-line-height-alt:24px;mso-line-height-rule:at-least;mso-text-raise:0pt');
    expect(styleOf(plain)).not.toContain('mso-line-height');
  });

  it('keeps sup and sub from growing the line', () => {
    const root = parse(normalise('<p>x<sup>2</sup>H<sub>2</sub></p>', 'quill'));
    expect(styleOf(root.querySelector('sup'))).toBe('line-height:0');
    expect(styleOf(root.querySelector('sub'))).toBe('line-height:0');
  });

  it('clamps image attributes to the available width', () => {
    const img = parse(normalise(MARKDOWN, 'markdown')).querySelector('p img')!;
    expect(img.getAttribute('width')).toBe('552');
    expect(img.getAttribute('height')).toBe('276');
    expect(img.getAttribute('border')).toBe('0');
  });

  it('keeps fluid image sizes fluid and scales declared lengths with the attributes', () => {
    const images = (html: string) => Array.from(parse(normalise(html, 'markdown')).querySelectorAll('img'));
    const [fluid, fixed, bare, capped, heightOnly, unsized] = images(
      [
        '<img src="a.png" width="800" height="400" style="width:100%;height:auto">',
        '<img src="a.png" width="800" height="400" style="width:800px;height:400px">',
        '<img src="a.png" width="800" height="400">',
        '<img src="a.png" width="800" height="400" style="max-width:300px">',
        '<img src="a.png" width="64" height="64" style="height:64px">',
        '<img src="a.png">',
      ]
        .map((img) => `<p>${img}</p>`)
        .join('')
    );
    for (const img of [fluid, fixed, bare, capped]) {
      expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['552', '276']);
    }
    expect(styleOf(fluid)).toBe('width:100%;height:auto');
    expect(styleOf(fixed)).toBe('width:552px;height:276px');
    // Without a CSS width of their own, images shrink to the column in browsers (keeping their aspect ratio).
    expect(styleOf(bare)).toBe('max-width:100%;height:auto');
    expect(styleOf(capped)).toBe('max-width:300px');
    expect(styleOf(heightOnly)).toBe('height:64px;max-width:100%');
    expect(styleOf(unsized)).toBe('max-width:100%;height:auto');
  });

  it('wraps root-level inline runs holding images or larger text in a div with its own at-least line', () => {
    const html = [
      '<p>Intro.</p>\n',
      '<img src="a.png" width="96" height="96" alt="logo">\n\n',
      '<p>Middle.</p>\n',
      'Plain root text\n',
      '<p>Then.</p>',
      'Root text with <span style="font-size:24px">larger</span> words',
      '<img src="b.png" width="32" height="32"><ul><li>list</li></ul>',
    ].join('');
    const root = parse(normalise(html, 'markdown'));
    const wrappers = Array.from(root.children).filter((el) => el.tagName === 'DIV');
    expect(wrappers).toHaveLength(2);
    const [image, larger] = wrappers;
    expect(image.querySelector('img[alt="logo"]')).not.toBeNull();
    expect(image.textContent!.trim()).toBe('');
    expect(styleOf(image)).toContain('mso-line-height-rule:at-least;mso-text-raise:0pt');
    expect(larger.textContent).toBe('Root text with larger words');
    expect(larger.querySelector('img')).not.toBeNull();
    expect(styleOf(larger)).toContain('mso-line-height-rule:at-least');
    // Text without images or larger text stays where it is, and the list's Word-only wrapper stays whole.
    expect(Array.from(root.childNodes).some((node) => node.nodeType === 3 && node.nodeValue!.includes('Plain root text'))).toBe(true);
    expect(larger.nextSibling?.nodeType).toBe(8);
    expect(root.querySelector('ul')!.parentElement).toBe(root);
  });
});

describe('quill classes', () => {
  it('become inline styles', () => {
    const root = parse(normalise(QUILL, 'quill'));
    const [centred, indented] = Array.from(root.querySelectorAll('p'));
    expect(styleOf(centred)).toContain('text-align:center');
    expect(styleOf(root.querySelector('.ql-size-large'))).toContain('font-size:24px');
    expect(styleOf(root.querySelector('.ql-font-serif'))).toContain('mso-ascii-font-family:"Sitka Text"');
    expect(styleOf(indented)).toContain('margin-left:48px');
    expect(styleOf(root.querySelector('div'))).toBe('margin:0;padding:0');
  });
});

describe('long tokens', () => {
  it('break in text but not in attributes', () => {
    const out = normalise(`<p><a href="${URL}">${URL}</a></p>`, 'quill', { width: 300 });
    const a = parse(out).querySelector('a')!;
    expect(a.getAttribute('href')).toBe(URL);
    expect(a.innerHTML).toContain(`/${BREAK_OPPORTUNITY}`);
    // The text every client but Outlook shows has no invisible characters.
    expect(a.textContent).toBe(URL);
    expect(out.replace(/<!--\[if mso\]>.*?<!\[endif\]-->/g, '')).not.toContain(ZWSP);
  });

  it('turn too-wide bare URLs into styled links first, so auto-linking cannot cut them', () => {
    const root = parse(normalise(`<p>Visit ${URL} now, or https://example.com.</p>`, 'quill', { width: 300 }));
    const links = Array.from(root.querySelectorAll('a'));
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe(URL);
    expect(styleOf(links[0])).toBe('color:#0000EE;text-decoration:underline');
    expect(links[0].textContent).toBe(URL);
    expect(root.textContent).toContain('or https://example.com.');
  });

  it('turn too-wide bare email addresses into styled mailto links, address intact', () => {
    const root = parse(normalise(`<p>Write to ${ADDRESS}, or info@example.com.</p>`, 'quill', { width: 300 }));
    const links = Array.from(root.querySelectorAll('a'));
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe(`mailto:${ADDRESS}`);
    expect(styleOf(links[0])).toBe('color:#0000EE;text-decoration:underline');
    expect(links[0].textContent).toBe(ADDRESS);
    expect(links[0].querySelectorAll('wbr').length).toBeGreaterThan(0);
    expect(root.textContent).toContain(', or info@example.com.');
  });

  it('are left alone in raw mode', () => {
    expect(normalise(`<p style="margin:0">${URL}</p>`, 'raw', { width: 100 })).toBe(`<p style="margin:0">${URL}</p>`);
  });
});

describe('raw mode', () => {
  it('only appends to style and class attributes, preserving everything else byte for byte', () => {
    const rules: string[] = [];
    const out = normalise(RAW, 'raw', { addMsoRule: (css) => rules.push(css) });
    expect(out.replace(/ ?(style|class)="[^"]*"|;[^'"]*(?=')|<!--\[if mso\]>(<div[^>]*>|<\/div>)<!\[endif\]-->/g, '')).toBe(
      RAW.replace(/ ?(style|class)="[^"]*"|;[^'"]*(?=')/g, '')
    );
    expect(out).toContain("class=\"c eb-mso-");
    expect(out).toContain('<!--[if mso]><p>only outlook</p><![endif]-->');
  });

  it('gives user table cells Word-only typography through a class', () => {
    const rules: string[] = [];
    const out = normalise(RAW, 'raw', { addMsoRule: (css) => rules.push(css) });
    const [a, b] = Array.from(parse(out).querySelectorAll('td'));
    // Visible styles on the cells are untouched.
    expect(styleOf(a)).toBe('background:#F2F4F7');
    expect(styleOf(b)).toBe('font-size:18px');
    const ruleFor = (cell: Element) => rules.find((r) => r.startsWith(`.${Array.from(cell.classList).find((c) => c.startsWith('eb-mso-'))}{`))!;
    expect(ruleFor(a)).toContain('font-family:Georgia, serif;font-size:16px;color:#175CD3');
    expect(ruleFor(a)).toContain('mso-line-height-alt:24px;mso-line-height-rule:at-least');
    expect(ruleFor(b)).toContain('font-size:18px');
    expect(ruleFor(b)).toContain('mso-line-height-alt:27px');
  });

  it('makes bare element defaults explicit only without a stylesheet', () => {
    const out = normalise(RAW, 'raw');
    expect(out).toContain('<p style="margin:16px 0">');
    expect(out).toMatch(/<h2 style="margin:19.92px 0;font-size:24px;mso-line-height-alt:36px;mso-font-kerning:0pt">/);
    expect(out).toContain('<!--[if mso]><div style="margin-left:-8px"><![endif]--><ul>');
    expect(out).toContain('</ul><!--[if mso]></div><![endif]-->');
    expect(out).toMatch(/<li style="mso-margin-top-alt:16px;mso-text-indent-alt:-[\d.]+px">one/);
    expect(out).toContain('<div style="font-size:24px;mso-line-height-alt:36px">');

    const withStyle = `<style>p{margin:0}</style>${RAW}`;
    const styled = normalise(withStyle, 'raw');
    expect(styled).toContain('<p>Bare paragraph');
    expect(styled).toContain('<h2>Bare heading</h2>');
    expect(styled).toContain('<ul><li>one</li>');
  });

  it('leaves cells the fragment stylesheet may style to it (no Outlook-only class to override it)', () => {
    const rules: string[] = [];
    const run = (html: string) => normalise(html, 'raw', { addMsoRule: (css) => rules.push(css) });
    const table = '<table><tr><td>x</td></tr></table>';
    for (const css of ['td{color:#C00000;font-family:Georgia,serif;font-size:22px}', '.wrap TD, th{color:red}', '*{font-size:20px}']) {
      expect(run(`<style>${css}</style>${table}`)).toBe(`<style>${css}</style>${table}`);
    }
    expect(rules).toEqual([]);
    // Names in comments do not count.
    expect(run(`<style>/* td */ p{margin:0}</style>${table}`)).toContain('<td class="eb-mso-');
    const byClass = '<style>.cell{color:red}#only{color:blue}</style><table><tr><td class="cell">a</td><td id="only">b</td><td>c</td></tr></table>';
    const [a, b, c] = Array.from(parse(run(byClass)).querySelectorAll('td'));
    expect(a.className).toBe('cell');
    expect(b.hasAttribute('class')).toBe(false);
    expect(c.className).toMatch(/^eb-mso-/);
  });

  it('keeps Word typography for cells a fragment stylesheet does not style', () => {
    const rules: string[] = [];
    const out = normalise(`<style>.cta{color:#FFFFFF}</style>${RAW}`, 'raw', { addMsoRule: (css) => rules.push(css) });
    expect(parse(out).querySelectorAll('td[class*="eb-mso-"]')).toHaveLength(2);
    expect(rules[0]).toContain('font-family:Georgia, serif;font-size:16px;color:#175CD3');
  });

  it('respects margin longhands and the font shorthand', () => {
    const rules: string[] = [];
    const out = normalise('<p style="margin-bottom:0">x</p><table style="font:15px/1.4 Georgia"><tr><td>y</td></tr></table>', 'raw', {
      addMsoRule: (css) => rules.push(css),
    });
    expect(out).toContain('<p style="margin-bottom:0">x</p>');
    expect(rules[0]).toContain('font-family:Georgia;font-size:15px');
    expect(rules[0]).toContain('mso-line-height-alt:21px');
  });

  it('skips unknown relative sizes instead of guessing', () => {
    const rules: string[] = [];
    normalise('<table style="font-size:{{Size}}"><tr><td>y</td></tr></table>', 'raw', { addMsoRule: (css) => rules.push(css) });
    expect(rules[0]).not.toContain('font-size');
    expect(rules[0]).not.toContain('{{');
  });
});

describe('raw mode entity handling', () => {
  it('renders out-of-range numeric entities as U+FFFD instead of throwing', () => {
    const html = '<p style="font-size:14px">bad &#x110000; and &#9999999; entities</p>';
    expect(() => normalise(html, 'raw')).not.toThrow();
    expect(parse(normalise(html, 'raw')).textContent).toContain('bad \uFFFD and \uFFFD entities');
  });
});
