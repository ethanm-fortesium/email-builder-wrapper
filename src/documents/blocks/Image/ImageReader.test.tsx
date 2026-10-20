// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import renderToStaticMarkup from '../../../renderers/renderToStaticMarkup.js';
import type { TReaderDocument } from '../../../Reader/core.js';

const P = { top: 16, right: 24, bottom: 16, left: 24 };

function render(blocks: Record<string, unknown>, childrenIds = Object.keys(blocks)) {
  const document = {
    root: { type: 'EmailLayout', data: { canvasColor: '#FFFFFF', textColor: '#262626', fontFamily: 'MODERN_SANS', childrenIds } },
    ...blocks,
  } as unknown as TReaderDocument;
  // Undo the SMTP line folding (it only turns spaces into newlines) so markup can be matched as strings.
  return renderToStaticMarkup(document, { rootBlockId: 'root' }).replace(/\n/g, ' ');
}

function image(props: Record<string, unknown>, style: Record<string, unknown> = { padding: P }) {
  return { type: 'Image', data: { style, props } };
}

function images(html: string) {
  return Array.from(new DOMParser().parseFromString(html, 'text/html').querySelectorAll('img'));
}

describe('ImageReader', () => {
  it('emits width and height attributes from the natural size, with fluid CSS for other clients', () => {
    const [img] = images(render({ i: image({ url: 'https://cdn.test/a.png', alt: 'A', width: 300, naturalWidth: 400, naturalHeight: 200 }) }));
    expect(img.getAttribute('width')).toBe('300');
    expect(img.getAttribute('height')).toBe('150');
    expect(img.getAttribute('border')).toBe('0');
    expect(img.getAttribute('alt')).toBe('A');
    const style = img.getAttribute('style');
    expect(style).toContain('width:300px;max-width:100%;height:auto');
    expect(style).toContain('display:inline-block;vertical-align:middle');
    // Alt text stays readable when images are blocked (the container is font-size:0).
    expect(style).toContain('font-size:14px');
    expect(style).toContain('color:#262626');
    expect(style).toContain('font-family:');
  });

  it('never clips or struts the image: a font-size:0, at-least container that carries the alignment', () => {
    const html = render({ i: image({ url: 'https://cdn.test/a.png', width: 96, naturalWidth: 128, naturalHeight: 128 }, { padding: P, textAlign: 'right' }) });
    const img = images(html)[0];
    const container = img.parentElement!;
    expect(container.tagName).toBe('DIV');
    expect(container.getAttribute('style')).toBe('text-align:right;font-size:0;line-height:100%;mso-line-height-rule:at-least');
    expect(container.parentElement!.getAttribute('align')).toBe('right');
  });

  it('clamps the attributes to the padded cell (less 1px of slack for Word) but keeps the CSS width up to the canvas', () => {
    const [img] = images(render({ i: image({ url: 'https://cdn.test/a.png', width: 700, naturalWidth: 1400, naturalHeight: 700 }) }));
    expect(img.getAttribute('width')).toBe('551');
    expect(img.getAttribute('height')).toBe('276');
    expect(img.getAttribute('style')).toContain('width:600px;max-width:100%;height:auto');
  });

  it('keeps the width attribute inside the Outlook column so Word never widens the row', () => {
    const html = render(
      {
        cols: {
          type: 'ColumnsContainer',
          data: {
            style: { padding: P },
            props: { columnsCount: 2, columnsGap: 16, columns: [{ childrenIds: ['i'] }, { childrenIds: [] }, { childrenIds: [] }] },
          },
        },
        i: image({ url: 'https://cdn.test/a.png', width: 400, naturalWidth: 400, naturalHeight: 200 }, { padding: { top: 0, right: 0, bottom: 0, left: 0 } }),
      },
      ['cols']
    );
    const [img] = images(html);
    const ghostWidths = Array.from(html.matchAll(/<!--\[if mso\]><td width="(\d+)"/g)).map((m) => Number(m[1]));
    expect(ghostWidths.length).toBeGreaterThan(0);
    const width = Number(img.getAttribute('width'));
    expect(width).toBeLessThanOrEqual(Math.min(...ghostWidths));
    expect(Number(img.getAttribute('height'))).toBe(Math.round(width / 2));
    // The CSS keeps the intended width so the image fills a stacked column on mobile.
    expect(img.getAttribute('style')).toContain('width:400px;max-width:100%');
  });

  it('keeps a fixed CSS height only when the box differs from the natural aspect ratio', () => {
    const [fluid, fixed] = images(
      render({
        a: image({ url: 'https://cdn.test/a.png', width: 200, height: 100, naturalWidth: 400, naturalHeight: 200 }),
        b: image({ url: 'https://cdn.test/a.png', width: 200, height: 200, naturalWidth: 400, naturalHeight: 200 }),
      })
    );
    expect(fluid.getAttribute('style')).toContain('height:auto');
    expect(fixed.getAttribute('style')).toContain('height:200px');
    expect(fixed.getAttribute('height')).toBe('200');
  });

  it('falls back to the width attribute alone when the natural size is unknown', () => {
    const [img] = images(render({ i: image({ url: 'https://cdn.test/a.png', width: 96 }) }));
    expect(img.getAttribute('width')).toBe('96');
    expect(img.hasAttribute('height')).toBe(false);
  });

  it('wraps a linked image in an undecorated link', () => {
    const [img] = images(render({ i: image({ url: 'https://cdn.test/a.png', linkHref: 'https://example.com/{{Id}}', naturalWidth: 10, naturalHeight: 10 }) }));
    const link = img.parentElement!;
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('https://example.com/{{Id}}');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('style')).toBe('text-decoration:none');
  });

  it('renders nothing for an image without a URL', () => {
    const html = render({ i: image({ url: '', alt: 'EMPTY_IMAGE' }), j: image({ url: '   ' }) });
    expect(images(html)).toHaveLength(0);
    expect(html).not.toContain('EMPTY_IMAGE');
    expect(html).not.toContain('padding:16px 24px 16px 24px');
  });
});
