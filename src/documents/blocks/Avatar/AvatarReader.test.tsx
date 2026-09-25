// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import renderToStaticMarkup from '../../../renderers/renderToStaticMarkup.js';
import type { TReaderDocument } from '../../../Reader/core.js';

const P = { top: 16, right: 24, bottom: 16, left: 24 };

function render(props: Record<string, unknown>, style: Record<string, unknown> = { padding: P }) {
  const document = {
    root: { type: 'EmailLayout', data: { canvasColor: '#FFFFFF', textColor: '#262626', childrenIds: ['a'] } },
    a: { type: 'Avatar', data: { style, props } },
  } as unknown as TReaderDocument;
  // Undo the SMTP line folding (it only turns spaces into newlines) so markup can be matched as strings.
  return renderToStaticMarkup(document, { rootBlockId: 'root' }).replace(/\n/g, ' ');
}

const URL = 'https://cdn.test/face.png?w=1&h=1';

describe('AvatarReader', () => {
  it('draws a circle in Outlook with a VML oval filled with the image', () => {
    const html = render({ imageUrl: URL, size: 64, shape: 'circle', alt: 'Jane' });
    expect(html).toContain(
      '<!--[if mso]><v:oval xmlns:v="urn:schemas-microsoft-com:vml" alt="Jane" stroked="f" filled="t" style="width:64px;height:64px;">' +
        '<v:fill type="frame" src="https://cdn.test/face.png?w=1&amp;h=1" color="#E4E7EC" /></v:oval><![endif]-->'
    );
    // Every other client gets the img with border-radius, hidden from Word.
    expect(html).toMatch(/<!--\[if !mso\]><!--><img src="https:\/\/cdn\.test\/face\.png\?w=1&amp;h=1" alt="Jane" width="64" height="64" border="0" style="[^"]*border-radius:64px[^"]*" \/><!--<!\[endif\]-->/);
  });

  it('draws a rounded square with a VML roundrect using the shorter-side arcsize', () => {
    const html = render({ imageUrl: URL, size: 80, shape: 'rounded' });
    expect(html).toContain('<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" alt="" arcsize="12.5%" stroked="f" filled="t" style="width:80px;height:80px;">');
    expect(html).toContain('border-radius:10px');
  });

  it('keeps a fixed square box (object-fit needs it) with alt text typography', () => {
    const img = new DOMParser().parseFromString(render({ imageUrl: URL, size: 48, shape: 'square', alt: 'Sq' }), 'text/html').querySelector('img')!;
    expect(img.getAttribute('width')).toBe('48');
    expect(img.getAttribute('height')).toBe('48');
    const style = img.getAttribute('style')!;
    expect(style).toContain('width:48px;height:48px;max-width:100%;object-fit:cover');
    expect(style).not.toContain('height:auto');
    expect(style).toContain('font-size:14px');
  });

  it('renders a square avatar as a plain image that Word sees too', () => {
    const html = render({ imageUrl: URL, size: 48, shape: 'square' }, { padding: P, textAlign: 'center' });
    expect(html).not.toContain('v:');
    expect(html).not.toContain('[if !mso]');
    expect(html).toContain('<div style="text-align:center;font-size:0;line-height:100%;mso-line-height-rule:at-least"><img');
  });

  it('clamps the avatar to the cell so Word does not widen it and browsers keep it round', () => {
    const html = render({ imageUrl: URL, size: 700, shape: 'circle' });
    expect(html).toContain('style="width:551px;height:551px;"');
    expect(html).toContain('width="551" height="551"');
    expect(html).toContain('border-radius:551px');
  });

  it('renders nothing without an image URL', () => {
    const html = render({ imageUrl: '', size: 64, shape: 'circle' });
    expect(html).not.toContain('<img');
    expect(html).not.toContain('v:oval');
    expect(html).not.toContain('padding:16px 24px 16px 24px');
  });
});
