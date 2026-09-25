import React from 'react';

// React cannot emit HTML comments or unbalanced markup, but Outlook-only code
// (conditional comments, ghost tables, VML) needs both. RawHtml renders its html
// inside a placeholder element that renderToStaticMarkup removes afterwards, so
// no stray wrapper (e.g. a <span> around <table><tr>) reaches the email.
// The Reader tree is only ever rendered through renderToStaticMarkup.
export const RAW_HTML_TAG = 'eb-raw';

const RAW_HTML_TAG_PATTERN = new RegExp(`</?${RAW_HTML_TAG}>`, 'g');

export function RawHtml({ html }: { html: string }) {
  return React.createElement(RAW_HTML_TAG, { dangerouslySetInnerHTML: { __html: html } });
}

export function stripRawHtmlWrappers(html: string) {
  return html.replace(RAW_HTML_TAG_PATTERN, '');
}

/** Markup only classic Outlook (Word) sees. */
export function msoOnly(html: string) {
  return `<!--[if mso]>${html}<![endif]-->`;
}

/** Markup every client except classic Outlook sees (downlevel-revealed). */
export function notMso(html: string) {
  return `<!--[if !mso]><!-->${html}<!--<![endif]-->`;
}

export function escapeHtml(value: string | number) {
  return String(value).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

/**
 * Escape a value for a double-quoted attribute. < and > are encoded too: attributes inside
 * conditional comments (VML hrefs, alt text) must never contain '-->', which would end the
 * comment early in every client except Outlook.
 */
export function escapeAttr(value: string | number) {
  return String(value).replace(/[&"<>]/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '"':
        return '&quot;';
      case '<':
        return '&lt;';
      default:
        return '&gt;';
    }
  });
}
