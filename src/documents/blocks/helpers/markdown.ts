import insane from 'insane';
import { Renderer, marked } from 'marked';

// Markdown -> HTML for markdown Text blocks, identical to the upstream
// @usewaypoint/block-text EmailMarkdown pipeline (marked with GFM line breaks, links
// opening in a new tab, full-width tables; then the insane allow-list). The Text reader
// renders its own element so it can add the typography classic Outlook needs, and
// normalises this HTML afterwards (see emailHtmlNormaliser.ts).

const ALLOWED_TAGS = [
  'a',
  'article',
  'b',
  'blockquote',
  'br',
  'caption',
  'code',
  'del',
  'details',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'ins',
  'kbd',
  'li',
  'main',
  'ol',
  'p',
  'pre',
  'section',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
];

const GENERIC_ALLOWED_ATTRIBUTES = ['style', 'title'];

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  ...Object.fromEntries(ALLOWED_TAGS.map((tag) => [tag, [...GENERIC_ALLOWED_ATTRIBUTES]])),
  img: ['src', 'srcset', 'alt', 'width', 'height', ...GENERIC_ALLOWED_ATTRIBUTES],
  table: ['width', ...GENERIC_ALLOWED_ATTRIBUTES],
  td: ['align', 'width', ...GENERIC_ALLOWED_ATTRIBUTES],
  th: ['align', 'width', ...GENERIC_ALLOWED_ATTRIBUTES],
  a: ['href', 'target', ...GENERIC_ALLOWED_ATTRIBUTES],
  ol: ['start', ...GENERIC_ALLOWED_ATTRIBUTES],
  ul: ['start', ...GENERIC_ALLOWED_ATTRIBUTES],
};

class EmailMarkdownRenderer extends Renderer {
  table(header: string, body: string) {
    return `<table width="100%">\n<thead>\n${header}</thead>\n<tbody>\n${body}</tbody>\n</table>`;
  }

  link(href: string, title: string | null | undefined, text: string) {
    if (!title) {
      return `<a href="${href}" target="_blank">${text}</a>`;
    }
    return `<a href="${href}" title="${title}" target="_blank">${text}</a>`;
  }
}

/**
 * Render markdown to sanitised HTML exactly as the upstream markdown Text block does.
 *
 * @param markdown - Markdown source (GFM, single newlines become <br>).
 * @returns HTML restricted to the upstream allow-list of tags and attributes.
 */
export function renderMarkdown(markdown: string) {
  const html = marked.parse(markdown, {
    async: false,
    breaks: true,
    gfm: true,
    pedantic: false,
    silent: false,
    renderer: new EmailMarkdownRenderer(),
  });
  if (typeof html !== 'string') {
    throw new Error('marked.parse did not return a string');
  }
  return insane(html, { allowedTags: ALLOWED_TAGS, allowedAttributes: ALLOWED_ATTRIBUTES });
}
