// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import linkedinIconFallback from '../../../assets/social/linkedin.png';
import renderEmail from '../../../renderers/renderToStaticMarkup.js';
import type { TReaderDocument } from '../../../Reader/core.js';
import type { TEditorConfiguration } from '../../editor/core.js';
import { getEditorState, resetDocument, setApiBaseUrl } from '../../editor/EditorContext.js';
import { DEFAULT_TYPOGRAPHY } from '../helpers/emailTypography.js';

import SignatureEditor from './SignatureEditor.js';
import { dimColor, normalizeFontWeight, prepareDisclaimerHtml, toHexColor } from './SignatureMarkup.js';
import type { SignatureProps } from './SignaturePropsSchema.js';

// Server rendering reads a zustand store's initial state (its server snapshot); make the canvas read
// the editor store's current document, as it does in the browser.
vi.mock('../../editor/EditorContext.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../editor/EditorContext.js')>();
  return { ...actual, useDocument: () => actual.getEditorState().document };
});

const OPTIONS = { typography: { ...DEFAULT_TYPOGRAPHY, fontSize: 10, lineHeight: 1.5 }, width: 552, background: '#FFFFFF' };

function fragment(html: string) {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

describe('prepareDisclaimerHtml', () => {
  it('gives paragraphs their default 1em margins explicitly', () => {
    const { html, rule } = prepareDisclaimerHtml('<p>One</p><p style="font-size:12px">Two</p>', OPTIONS);
    const [one, two] = Array.from(fragment(html).querySelectorAll('p'));
    expect([one.style.marginTop, one.style.marginBottom]).toEqual(['10px', '10px']);
    expect([two.style.marginTop, two.style.marginBottom]).toEqual(['12px', '12px']);
    expect(rule).toBe('at-least');
  });

  it('keeps margins the user set', () => {
    const p = fragment(prepareDisclaimerHtml('<p style="margin:0">Tight</p>', OPTIONS).html).querySelector('p')!;
    expect([p.style.marginTop, p.style.marginBottom]).toEqual(['0px', '0px']);
  });

  it("moves a list's spacing onto its first and last items (Word ignores ul/ol margins)", () => {
    const root = fragment(prepareDisclaimerHtml('<ul><li>A</li><li>B<ul><li>C</li></ul></li></ul>', OPTIONS).html);
    const [outer, inner] = Array.from(root.querySelectorAll('ul'));
    const [a, b, c] = Array.from(root.querySelectorAll('li'));
    expect([outer.style.marginTop, outer.style.marginBottom]).toEqual(['0px', '0px']);
    expect(a.style.marginTop).toBe('10px');
    // B ends with the nested list, so its bottom margin goes on the list's last item (where Word puts it).
    expect([b.style.marginBottom, c.style.marginBottom]).toEqual(['0px', '10px']);
    expect([inner.style.marginTop, inner.style.marginBottom]).toEqual(['0px', '0px']);
    expect(inner.style.listStyleType).toBe('circle');
  });

  it("gives lists Word's geometry: an Outlook-only indent wrapper and the browser's marker hang", () => {
    const { html } = prepareDisclaimerHtml('<ul><li>One</li><li>Two</li></ul>', OPTIONS);
    // Word puts list text 48px in, browsers 40px: the wrapper takes the difference back in Outlook only.
    expect(html).toContain('<!--[if mso]><div style="margin-left:-8px"><![endif]--><ul');
    expect(html).toContain('</ul><!--[if mso]></div><![endif]-->');
    const items = Array.from(fragment(html).querySelectorAll('li'));
    expect(items).toHaveLength(2);
    for (const li of items) {
      expect(li.getAttribute('style')).toMatch(/mso-text-indent-alt:-\d+(\.\d+)?px/);
    }
  });

  it('colours and underlines links, dimmed like the text', () => {
    const a = fragment(prepareDisclaimerHtml('<p><a href="https://example.com">Privacy</a></p>', OPTIONS).html).querySelector('a')!;
    expect(toHexColor(a.style.color)).toBe('#6666F5');
    expect(a.style.textDecoration).toBe('underline');
  });

  it('dims explicit colours the way the old opacity did', () => {
    const span = fragment(prepareDisclaimerHtml('<p><span style="color: rgb(180, 35, 24)">Red</span></p>', OPTIONS).html).querySelector('span')!;
    expect(toHexColor(span.style.color)).toBe('#D27B74');
  });

  it('uses the exact line rule only for plain text at one size', () => {
    expect(prepareDisclaimerHtml('<p>Plain <b>text</b></p>', OPTIONS).rule).toBe('exactly');
    // Inline code keeps the disclaimer's size, even though the normaliser writes it out explicitly.
    expect(prepareDisclaimerHtml('<p>Reference <code>A-1</code></p>', OPTIONS).rule).toBe('exactly');
    expect(prepareDisclaimerHtml('<p>Logo <img src="https://cdn.test/x.png"></p>', OPTIONS).rule).toBe('at-least');
  });

  it('sanitises the HTML and keeps merge tokens', () => {
    const { html } = prepareDisclaimerHtml('<p onclick="x()">{{Company}} <script>alert(1)</script></p>', OPTIONS);
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('<script');
    expect(html).toContain('{{Company}}');
  });
});

describe('colour and weight helpers', () => {
  it('normalises CSS colours to #RRGGBB', () => {
    expect(toHexColor('#abc')).toBe('#AABBCC');
    expect(toHexColor('#1d2939')).toBe('#1D2939');
    expect(toHexColor('rgba(16, 24, 40, 0.5)')).toBe('#101828');
    expect(toHexColor('red')).toBeNull();
  });

  it('blends at the disclaimer alpha and leaves unparseable colours alone', () => {
    expect(dimColor('#262626', '#FFFFFF')).toBe('#7D7D7D');
    expect(dimColor('red', '#FFFFFF')).toBe('red');
  });

  it('turns keyword weights into numbers', () => {
    expect(normalizeFontWeight('bold')).toBe(700);
    expect(normalizeFontWeight('normal')).toBe(400);
    expect(normalizeFontWeight('600')).toBe(600);
    expect(normalizeFontWeight(500)).toBe(500);
    expect(normalizeFontWeight(null)).toBeUndefined();
    expect(normalizeFontWeight('')).toBeUndefined();
  });
});

describe('SignatureEditor', () => {
  const initialDocument = getEditorState().document;

  afterEach(() => {
    setApiBaseUrl(null);
    resetDocument(initialDocument);
  });

  it('shows a placeholder for an empty signature on the canvas', () => {
    expect(renderToStaticMarkup(<SignatureEditor style={null} props={{}} />)).toContain('Signature (empty)');
  });

  it("sets the placeholder's font only when the signature has one (otherwise the layout's is inherited)", () => {
    expect(renderToStaticMarkup(<SignatureEditor style={null} props={{}} />)).not.toContain('font-family');
    const placeholder = fragment(renderToStaticMarkup(<SignatureEditor style={{ fontFamily: 'MONOSPACE' }} props={{}} />)).querySelector('div')!;
    expect(placeholder.getAttribute('style')).toContain('Courier New');
  });

  it('shows the bundled icons on the canvas when no API base URL is configured', () => {
    const html = renderToStaticMarkup(<SignatureEditor style={null} props={{ social: { linkedIn: 'https://linkedin.com/in/x' } }} />);
    const icon = fragment(html).querySelector('img[alt="LinkedIn"]')!;
    expect(icon.getAttribute('src')).toBe(linkedinIconFallback);
  });

  describe('renders the same signature markup as the export', () => {
    const PADDING = { top: 16, right: 24, bottom: 16, left: 24 };
    const SIGNATURE = {
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
      disclaimerHtml:
        '<p>Confidential. See our <a href="https://example.com/privacy">privacy policy</a>.</p><p style="color:#B42318">Red note.</p><ul><li>One</li><li>Two</li></ul>',
    };
    const LAYOUT = { canvasColor: '#FFFFFF', textColor: '#262626', fontFamily: 'BOOK_SERIF', linkColor: '#0B6BCB', childrenIds: ['s'] };

    /** The SignatureMarkup table: the nearest table around the name. */
    function signatureTable(html: string) {
      return new DOMParser().parseFromString(html, 'text/html').querySelector('strong')!.closest('table')!.outerHTML;
    }

    const STYLES: Array<[string, SignatureProps['style']]> = [
      ['on the canvas colour', { padding: PADDING, fontSize: 14 }],
      ['tinted, centred, in its own font', { padding: PADDING, backgroundColor: '#EFF8FF', color: '#1D2939', fontFamily: 'MODERN_SANS', textAlign: 'center' }],
    ];

    it.each(STYLES)('%s', (_, style) => {
      setApiBaseUrl('https://api.test');
      const document = { root: { type: 'EmailLayout', data: LAYOUT }, s: { type: 'Signature', data: { style, props: SIGNATURE } } };
      resetDocument(document as unknown as TEditorConfiguration);

      // Undo the export's SMTP line folding (it only turns spaces into newlines).
      const exported = renderEmail(document as unknown as TReaderDocument, { rootBlockId: 'root' }).replace(/\n/g, ' ');
      const canvas = renderToStaticMarkup(<SignatureEditor style={style} props={SIGNATURE} />);

      expect(signatureTable(canvas)).toBe(signatureTable(exported));
      expect(signatureTable(canvas)).toContain('src="https://api.test/Content/email-builder/social/linkedin.png"');
      expect(canvas).toContain('padding:16px 24px 16px 24px');
    });
  });
});
