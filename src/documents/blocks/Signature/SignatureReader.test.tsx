// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';

import renderToStaticMarkup from '../../../renderers/renderToStaticMarkup.js';
import type { TReaderDocument } from '../../../Reader/core.js';
import { setApiBaseUrl } from '../../editor/EditorContext.js';

const P = { top: 16, right: 24, bottom: 16, left: 24 };

const FULL = {
  fullName: 'Alex Example',
  title: 'Head of Things',
  company: 'Example Ltd',
  email: 'alex@example.com',
  phone: '+44 20 7946 0000',
  website: 'https://example.com',
  address: '1 Example Street\nLondon',
  logoUrl: 'https://cdn.test/logo.png',
  logoWidth: 140,
  logoNaturalWidth: 330,
  logoNaturalHeight: 49,
  social: { linkedIn: 'https://linkedin.com/in/x', twitter: 'https://twitter.com/x' },
  disclaimerHtml: '<p>Confidential.</p>',
};

function render(props: Record<string, unknown>, style: Record<string, unknown> = { padding: P, fontSize: 14 }, layout: Record<string, unknown> = {}) {
  const document = {
    root: { type: 'EmailLayout', data: { canvasColor: '#FFFFFF', textColor: '#262626', fontFamily: 'MODERN_SANS', childrenIds: ['s'], ...layout } },
    s: { type: 'Signature', data: { style, props } },
  } as unknown as TReaderDocument;
  // Undo the SMTP line folding (it only turns spaces into newlines) so markup can be matched as strings.
  return renderToStaticMarkup(document, { rootBlockId: 'root' }).replace(/\n/g, ' ');
}

function parse(html: string) {
  return new DOMParser().parseFromString(html, 'text/html');
}

/** The innermost cell whose whole text is `text`. */
function cellOf(doc: Document, text: string) {
  return Array.from(doc.querySelectorAll('td'))
    .filter((td) => td.textContent === text)
    .pop()!;
}

afterEach(() => setApiBaseUrl(null));

describe('SignatureReader', () => {
  it('renders nothing at all for an empty signature', () => {
    const html = render({});
    expect(html).not.toContain('Signature (empty)');
    expect(html).not.toContain('padding:16px 24px 16px 24px');
  });

  it('puts the padding and background on the block cell', () => {
    const doc = parse(render({ fullName: 'A' }, { padding: P, backgroundColor: '#EFF8FF' }));
    const cell = doc.querySelector('strong')!.closest('table')!.parentElement!;
    expect(cell.getAttribute('bgcolor')).toBe('#EFF8FF');
    expect(cell.getAttribute('style')).toContain('padding:16px 24px 16px 24px;background-color:#EFF8FF');
  });

  it('gives every text cell its complete typography with a whole-px line pitch', () => {
    const doc = parse(render(FULL));
    for (const text of ['Head of Things', 'Example Ltd']) {
      const style = cellOf(doc, text).getAttribute('style')!;
      expect(style).toContain('mso-ascii-font-family:Arial');
      expect(style).toContain('font-size:14px');
      expect(style).toContain('mso-line-height-rule:exactly');
      expect(style).toContain('mso-line-height-alt:20px');
      expect(style).toMatch(/line-height:1\.428/);
      expect(style).toContain('color:#262626');
      expect(style).toContain('font-weight:400');
    }
  });

  it('uses the layout typography when the signature sets no font size or colour', () => {
    const doc = parse(render({ company: 'Example Ltd' }, { padding: P }, { baseFontSize: 18, textColor: '#101828' }));
    const style = cellOf(doc, 'Example Ltd').getAttribute('style')!;
    expect(style).toContain('font-size:18px');
    expect(style).toContain('mso-line-height-alt:25px');
    expect(style).toContain('color:#101828');
  });

  it('renders the name and labels at weight 700, never as relative (bolder) weights', () => {
    const html = render(FULL, { padding: P, fontWeight: 'bold' });
    expect(html).toContain('<strong style="font-weight:700">Alex Example</strong>');
    expect(html).toContain('<strong style="font-weight:700">Email: </strong>');
    expect(html).not.toContain('font-weight:600');
    expect(html).not.toContain('font-weight:bold');
  });

  it('styles links like the text, with an explicit colour, and links the phone number', () => {
    const doc = parse(render(FULL));
    const email = doc.querySelector('a[href="mailto:alex@example.com"]')!;
    expect(email.getAttribute('style')).toBe('color:#262626;text-decoration:none');
    expect(doc.querySelector('a[href="tel:+442079460000"]')!.getAttribute('style')).toBe('color:#262626;text-decoration:none');
    expect(doc.querySelector('a[href="https://example.com"]')!.textContent).toBe('example.com');
  });

  it('keeps merge tokens intact', () => {
    const html = render({ fullName: '{{FullName}}', phone: '{{Phone}}', email: '{{Email}}' });
    expect(html).toContain('>{{FullName}}</strong>');
    expect(html).toContain('<strong style="font-weight:700">Phone: </strong>{{Phone}}');
    expect(html).toContain('href="mailto:{{Email}}"');
  });

  it('links a literal phone number', () => {
    const doc = parse(render({ phone: '+44 20 7946 0000' }));
    const link = doc.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('tel:+442079460000');
    expect(link.innerHTML).toBe('<strong style="font-weight:700">Phone: </strong>+44 20 7946 0000');
  });

  it('does not link a phone number with merge tokens, but styles it the same', () => {
    // The host substitutes raw values (possibly empty or with spaces): a tel: link could end up bare or broken.
    for (const phone of ['{{Phone}}', '+44 {{Extension}}']) {
      const doc = parse(render({ phone }));
      expect(doc.querySelector('a')).toBeNull();
      const cell = cellOf(doc, `Phone: ${phone}`);
      expect(cell.innerHTML).toBe(`<strong style="font-weight:700">Phone: </strong>${phone}`);
      // The link was styled like the text (colour and no underline), so the cell's typography is all that shows.
      expect(cell.getAttribute('style')).toBe(cellOf(parse(render({ phone: '+44 20 7946 0000' })), 'Phone: +44 20 7946 0000').getAttribute('style'));
    }
  });

  it('gives the logo width and height attributes and keeps its cell free of the exact line rule', () => {
    const doc = parse(render(FULL));
    const logo = doc.querySelector('img[alt="Example Ltd"]')!;
    expect(logo.getAttribute('width')).toBe('140');
    expect(logo.getAttribute('height')).toBe('21');
    expect(logo.getAttribute('style')).toContain('width:140px;max-width:100%;height:auto');
    expect(logo.parentElement!.getAttribute('style')).toContain('font-size:0;line-height:100%;mso-line-height-rule:at-least');
  });

  it('never exports data: URIs', () => {
    expect(render({ ...FULL, logoUrl: 'data:image/png;base64,AAAA' })).not.toContain('data:');
  });

  it('renders social links as text links when no hosted icon base URL is configured', () => {
    const doc = parse(render(FULL));
    expect(doc.querySelectorAll('img[alt="LinkedIn"]')).toHaveLength(0);
    const linkedIn = doc.querySelector('a[href="https://linkedin.com/in/x"]')!;
    expect(linkedIn.textContent).toBe('LinkedIn');
    expect(linkedIn.getAttribute('style')).toBe('color:#262626;text-decoration:none');
    expect(linkedIn.parentElement!.textContent).toBe('LinkedIn \u00B7 X');
  });

  it('uses the hosted social icons when a base URL is configured', () => {
    setApiBaseUrl('https://api.test');
    const doc = parse(render(FULL, { padding: P, textAlign: 'center' }));
    const icon = doc.querySelector('img[alt="X"]')!;
    expect(icon.getAttribute('src')).toBe('https://api.test/Content/email-builder/social/twitter.png');
    expect(icon.getAttribute('width')).toBe('25');
    expect(icon.getAttribute('height')).toBe('25');
    expect(icon.getAttribute('border')).toBe('0');
    expect(icon.parentElement!.getAttribute('style')).toBe('display:inline-block;text-decoration:none;vertical-align:top');
    // A centred signature centres the icon table with its align attribute (inline text-align cannot).
    expect(icon.closest('table')!.getAttribute('align')).toBe('center');
  });

  it('pre-blends the dimmed disclaimer colour over the background behind the signature', () => {
    const onWhite = parse(render(FULL));
    const cell = onWhite.querySelector('p')!.parentElement!;
    expect(cell.getAttribute('style')).toContain('color:#7D7D7D');
    expect(cell.getAttribute('style')).toContain('font-size:10px');
    expect(cell.getAttribute('style')).toContain('mso-line-height-alt:15px');
    expect(cell.getAttribute('style')).not.toContain('opacity');

    const tinted = parse(render(FULL, { padding: P, backgroundColor: '#101828', color: '#FFFFFF' }));
    expect(tinted.querySelector('p')!.parentElement!.getAttribute('style')).toContain('color:#9FA3A9');
  });

  it('gives the disclaimer paragraphs explicit margins', () => {
    const doc = parse(render(FULL));
    const p = doc.querySelector('p')!;
    expect(p.style.marginTop).toBe('10px');
    expect(p.style.marginBottom).toBe('10px');
  });
});
