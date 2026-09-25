import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Text } from '@usewaypoint/block-text';

import { renderMarkdown } from './markdown.js';

/** The upstream markdown Text block's inner HTML (its wrapper div has no style when none is given). */
function upstream(markdown: string) {
  const html = renderToStaticMarkup(React.createElement(Text, { props: { markdown: true, text: markdown } }));
  return html.replace(/^<div[^>]*>/, '').replace(/<\/div>$/, '');
}

const SAMPLE = [
  '# Heading one',
  'A paragraph with **bold**, *italic*, `code` and a [link](https://example.com "Title").',
  'A second line after a single newline.',
  '',
  '1. one',
  '2. two',
  '   - nested',
  '',
  '> quote',
  '',
  '```',
  'const x = 1;',
  '```',
  '',
  '| a | b |',
  '|---|:-:|',
  '| 1 | 2 |',
  '',
  '<img src="https://example.com/i.png" width="10" height="10" onerror="alert(1)"> <script>alert(1)</script>',
  '<span style="color:red" class="x">styled</span> ![alt](https://example.com/a.png)',
  'Hi {{RecipientFirstName}}, see [{{Link}}]({{LinkUrl}}).',
].join('\n');

describe('renderMarkdown', () => {
  it('matches the upstream markdown Text block output', () => {
    expect(renderMarkdown(SAMPLE)).toBe(upstream(SAMPLE));
  });

  it('opens links in a new tab and renders full-width tables', () => {
    const html = renderMarkdown('[x](https://example.com)\n\n| a |\n|---|\n| 1 |');
    expect(html).toContain('<a href="https://example.com" target="_blank">x</a>');
    expect(html).toContain('<table width="100%">');
  });

  it('keeps merge tokens intact', () => {
    const html = renderMarkdown('Hi {{RecipientFirstName}}, see [{{Link}}]({{LinkUrl}}).');
    expect(html).toContain('Hi {{RecipientFirstName}}');
    expect(html).toContain('href="{{LinkUrl}}"');
  });

  it('leaves a raw HTML image line at the root, outside any paragraph (the normaliser wraps it for Word)', () => {
    const html = renderMarkdown('Intro.\n\n<img src="https://example.com/a.png" width="96" height="96">\n\nAfter.');
    expect(html).toMatch(/^<p>Intro\.<\/p>\n<img [^>]*>\n\n<p>After\.<\/p>/);
  });

  it('drops disallowed tags and attributes', () => {
    const html = renderMarkdown('<script>alert(1)</script><img src="https://e.com/a.png" onerror="alert(1)"><span class="x">s</span>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('class=');
  });
});
