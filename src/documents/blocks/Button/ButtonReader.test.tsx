import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { EmailBoxProvider } from '../helpers/emailBox.js';
import { DEFAULT_TYPOGRAPHY, resolveTypography, TypographyProvider } from '../helpers/emailTypography.js';
import { stripRawHtmlWrappers } from '../helpers/rawHtml.js';
import { countLines, measureText } from '../helpers/textMetrics.js';

import ButtonReader, { normaliseButtonLabel, type ButtonProps } from './ButtonReader.js';

const ARIAL_BOLD_16 = { font: 'Arial', bold: true, sizePx: 16 };

function render(data: ButtonProps, { width = 600, fontFamily }: { width?: number; fontFamily?: string } = {}) {
    const typography = resolveTypography(DEFAULT_TYPOGRAPHY, { fontFamily });
    return stripRawHtmlWrappers(
        renderToStaticMarkup(
            <TypographyProvider value={typography}>
                <EmailBoxProvider width={width}>
                    <ButtonReader {...data} />
                </EmailBoxProvider>
            </TypographyProvider>
        )
    );
}

function button(props: NonNullable<ButtonProps['props']>, style: ButtonProps['style'] = {}): ButtonProps {
    return { style: { padding: { top: 16, right: 24, bottom: 16, left: 24 }, ...style }, props: { url: 'https://example.com', ...props } };
}

/** The VML shape's width, height and arcsize, the text box insets and the label paragraph. */
function vml(html: string) {
    const shape = /<v:roundrect[^>]*style="width:(\d+)px;height:(\d+)px[^"]*" arcsize="([\d.]+)%"/.exec(html);
    const inset = /<v:textbox inset="([^"]*)"/.exec(html);
    const label = /<p align="(\w+)" style="([^"]*)">([^<]*)<\/p>/.exec(html);
    if (!shape || !inset || !label) {
        return undefined;
    }
    return {
        width: Number(shape[1]),
        height: Number(shape[2]),
        arcsize: Number(shape[3]),
        insets: inset[1].split(',').map((value) => parseFloat(value)),
        align: label[1],
        labelStyle: label[2],
        label: label[3],
    };
}

/** The browser anchor's style and label. */
function anchor(html: string) {
    const match = /<!--\[if !mso\]><!--><div [^>]*><a [^>]*style="([^"]*)">([^<]*)<\/a><\/div><!--<!\[endif\]-->/.exec(html);
    return match ? { style: match[1], label: match[2] } : undefined;
}

describe('ButtonReader – VML geometry', () => {
    it('sizes the shape from the measured label plus 1px of slack and the padding', () => {
        const html = render(button({ text: 'Medium rounded' }));
        const textWidth = measureText('Medium rounded', ARIAL_BOLD_16)!;
        expect(vml(html)).toMatchObject({ width: Math.ceil(textWidth + 1) + 40, height: 40, align: 'center' });
    });

    it.each([
        ['rectangle', 0],
        ['rounded', 10],
        ['pill', 50],
    ] as const)('draws %s corners with arcsize = radius / shorter side', (buttonStyle, arcsize) => {
        expect(vml(render(button({ text: 'Corners', buttonStyle })))?.arcsize).toBe(arcsize);
    });

    it('makes full-width buttons exactly as wide as the cell content', () => {
        const html = render(button({ text: 'Full width', fullWidth: true }, { textAlign: 'right' }), { width: 480 });
        expect(vml(html)).toMatchObject({ width: 480 - 48, align: 'right' });
    });

    it('caps the width at the content width and wraps the label onto exact lines', () => {
        const text = 'Download the complete annual report and accompanying data tables';
        const html = render(button({ text, size: 'small' }, { padding: { top: 0, right: 0, bottom: 0, left: 0 } }), { width: 176 });
        const lines = countLines(text, 176 - 24, ARIAL_BOLD_16);
        expect(lines).toBeGreaterThan(1);
        const shape = vml(html)!;
        expect(shape).toMatchObject({ width: 176, height: lines * 16 + 16 });
        expect(shape.labelStyle).toContain('mso-line-height-rule:exactly;line-height:16px');
    });

    it('decides single versus multi-line with the VML width, slack included', () => {
        const textWidth = measureText('Tight fit', ARIAL_BOLD_16)!;
        // Room for the text but not for the slack: the shape is clamped to the cell and stays on one line.
        const width = Math.ceil(textWidth) + 40;
        const shape = vml(render(button({ text: 'Tight fit' }, { padding: { top: 0, right: 0, bottom: 0, left: 0 } }), { width }))!;
        expect(shape).toMatchObject({ width, height: 40 });
    });

    it('keeps negative text box insets on small pills instead of clamping them', () => {
        const serif = vml(render(button({ text: 'XS pill', size: 'x-small', buttonStyle: 'pill' }, { fontFamily: 'BOOK_SERIF', fontSize: 20 })))!;
        expect(serif.height).toBe(28);
        // Bottom: 4 - 0.29289 * 14 + Word's baseline drop (-1.4px for Palatino at 20px).
        expect(serif.insets[3]).toBeCloseTo(4 - 0.29289 * 14 - 1.4, 1);
        const large = vml(render(button({ text: 'XS', size: 'x-small', buttonStyle: 'pill' }, { fontSize: 48 })))!;
        // Horizontal: 8 - 0.29289 * 28 < 0.
        expect(large.insets[0]).toBeCloseTo(8 - 0.29289 * 28, 1);
        expect(large.insets[0]).toBeLessThan(0);
    });

    it('lays the label out in exact lines with room for accents taken back from the top inset', () => {
        const shape = vml(render(button({ text: 'Rectangle', buttonStyle: 'rectangle' })))!;
        // Rectangle: no corner inset, top = 12 - drop - 8 and bottom = 12 + drop, so the text box holds one 16px line.
        const [left, top, right, bottom] = shape.insets;
        expect([left, right]).toEqual([20, 20]);
        expect(top + bottom).toBeCloseTo(24 - 8, 1);
        expect(shape.labelStyle).toMatch(/^margin:8px 0 0 0;/);
    });

    it('gives Word the half pixel it drops under an inline VML shape', () => {
        const html = render(button({ text: 'Row' }));
        expect(html).toContain('mso-padding-alt:16px 24px 16.5px 24px');
    });
});

describe('ButtonReader – typography', () => {
    it('inherits the layout font: the browser stack in the anchor and the Windows font first in VML', () => {
        const html = render(button({ text: 'Serif' }), { fontFamily: 'BOOK_SERIF' });
        expect(anchor(html)?.style).toContain('font-family:&quot;Iowan Old Style&quot;, &quot;Palatino Linotype&quot;');
        expect(vml(html)?.labelStyle).toContain('font-family:&quot;Palatino Linotype&quot;, serif');
    });

    it('prefers the block font over the layout font', () => {
        const html = render(button({ text: 'Mono' }, { fontFamily: 'MONOSPACE' }), { fontFamily: 'BOOK_SERIF' });
        expect(vml(html)?.labelStyle).toContain('font-family:&quot;Courier New&quot;, monospace');
    });

    it('snaps the font size to the half-point grid in both outputs', () => {
        const html = render(button({ text: 'Thirteen' }, { fontSize: 13 }));
        expect(anchor(html)?.style).toContain('font-size:13.33px');
        expect(vml(html)?.labelStyle).toContain('font-size:13.33px');
        expect(vml(html)?.height).toBe(13 + 24);
    });

    it('turns off kerning and ligatures in the browser, whose width the metrics predict', () => {
        const style = anchor(render(button({ text: 'AVAWAY fi' })))!.style;
        expect(style).toContain('letter-spacing:0;font-kerning:none;font-variant-ligatures:none');
        expect(style).toContain('display:inline-block');
    });
});

describe('ButtonReader – labels', () => {
    it('normalises whitespace for display and measurement', () => {
        expect(normaliseButtonLabel('  Untidy \n\t label  ')).toBe('Untidy label');
        const nbsp = String.fromCharCode(0xa0);
        expect(normaliseButtonLabel(` Keeps${nbsp}nbsp `)).toBe(`Keeps${nbsp}nbsp`);
        const html = render(button({ text: '  Untidy \n\t label  ' }));
        expect(vml(html)?.label).toBe('Untidy label');
        expect(anchor(html)?.label).toBe('Untidy label');
    });

    it('renders an empty label as a non-breaking space of one line height', () => {
        const html = render(button({ text: '   ' }));
        expect(vml(html)).toMatchObject({ label: '&nbsp;', height: 40 });
        expect(anchor(html)?.label).toBe('&nbsp;');
    });

    it('escapes the label and the url', () => {
        const html = render(button({ text: 'Fish & <chips>', url: 'https://example.com/?a=1&b="2"' }));
        expect(vml(html)?.label).toBe('Fish &amp; &lt;chips&gt;');
        expect(html).toContain('href="https://example.com/?a=1&amp;b=&quot;2&quot;"');
    });
});

describe('ButtonReader – table-cell fallback', () => {
    it.each([
        ['an unknown glyph', 'Symbols ✓ here'],
        ['a merge token', 'Hello {{FirstName}}'],
    ])('uses a padded table cell for a label with %s', (_, text) => {
        const html = render(button({ text, url: '{{OfferUrl}}' }));
        expect(html).not.toContain('v:roundrect');
        expect(html).toContain('mso-padding-alt:0 20px 12px 20px');
        expect(html).toContain('<p style="margin:0;mso-margin-top-alt:12px"><a ');
        expect(html).toContain('href="{{OfferUrl}}"');
        const [, style, label] = /<a [^>]*style="([^"]*)">([^<]*)<\/a>/.exec(html)!;
        expect(label).toBe(text);
        expect(style).toContain('padding:12px 20px');
        expect(style).toContain('letter-spacing:0;font-kerning:none');
        expect(style).toContain('mso-ascii-font-family:Arial');
    });

    it.each([
        ['rounded', 'border-radius:4px'],
        ['pill', 'border-radius:999px'],
    ] as const)('rounds the anchor like its cell for a %s button, so browsers show the corners', (buttonStyle, radius) => {
        const html = render(button({ text: 'Renew {{Ref}} now', buttonStyle }));
        const cellStyle = /<td [^>]*bgcolor="[^"]*" style="([^"]*)"/.exec(html)![1];
        const anchorStyle = /<a [^>]*style="([^"]*)"/.exec(html)![1];
        expect(cellStyle).toContain(radius);
        expect(anchorStyle).toContain(radius);
    });

    it('keeps rectangle fallback buttons square', () => {
        const html = render(button({ text: 'Renew {{Ref}} now', buttonStyle: 'rectangle' }));
        expect(html).not.toContain('border-radius');
    });

    it('stretches the fallback table for full-width buttons', () => {
        const html = render(button({ text: 'Merge {{Token}}', fullWidth: true }));
        expect(html).toMatch(/<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"/);
        expect(/<a [^>]*style="([^"]*)"/.exec(html)![1]).toContain('display:block');
    });
});

describe('ButtonReader – no fixed widths in browsers', () => {
    it.each([
        ['a measured label', button({ text: 'A much longer call to action label that is quite wide' })],
        ['a full-width button', button({ text: 'Full', fullWidth: true })],
        ['the fallback', button({ text: 'Hi {{Name}}' })],
    ])('emits no min-width, width:100% or box-sizing for %s', (_, data) => {
        const html = render(data);
        expect(html).not.toMatch(/min-width|box-sizing|width:100%;box/);
        expect(anchor(html)?.style ?? /<a [^>]*style="([^"]*)"/.exec(html)![1]).not.toMatch(/(^|;)width:/);
    });
});

describe('ButtonReader browser branch', () => {
    it('puts the browser anchor in its own block sized to the label', () => {
        const html = render(button({ text: 'Read more' }, { fontSize: 20 }));
        // Visible to Word if an editor disables the conditional comments; a bare anchor in the
        // zero line box of the block cell would be invisible there.
        expect(html).toMatch(/<!--\[if !mso\]><!--><div style="font-size:20px;line-height:20px"><a [^>]*>Read more<\/a><\/div><!--<!\[endif\]-->/);
    });
});
