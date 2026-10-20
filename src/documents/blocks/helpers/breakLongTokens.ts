import React from 'react';

import { RawHtml, msoOnly } from './rawHtml.js';

// Break opportunities for tokens too wide for their column (long URLs, email addresses, long words).
//
// Classic Outlook (Word) ignores overflow-wrap and word-break. A token wider than its
// cell makes Word grow the cell, and with it the whole email, past the canvas width.
// A token that cannot fit gets break opportunities after URL separators and every few
// characters in long separator-free runs, so both engines break at the same points.
// Each is a <wbr> for browsers followed by a zero width space (U+200B) only Word sees:
// Word ignores <wbr> but breaks at U+200B, and no invisible character reaches the text
// other clients show, so copied text stays intact.
//
// Deliberately conservative:
// - only tokens whose (generously) estimated width exceeds the available width change;
// - merge tokens ({{...}}) are never split: the host replaces them by exact string match;
// - text in scripts that do not separate words with spaces (Thai, Lao, Khmer, Myanmar,
//   CJK) is left to the engines' own line breaking;
// - idempotent: the pieces between break opportunities fit, so breaking them again changes nothing.

export const ZWSP = '\u200B';

/** One break opportunity: <wbr> for browsers, a zero width space for Word (which ignores <wbr>). */
export const BREAK_OPPORTUNITY = `<wbr>${msoOnly(ZWSP)}`;

export type TokenBreakOptions = {
  /** Width in px available to the text. */
  width: number;
  /** Font size in px. */
  fontSize: number;
  bold?: boolean;
  /** Letter spacing in px. */
  letterSpacing?: number;
};

/** Whether a CSS font-weight renders bold (for TokenBreakOptions.bold). */
export const isBoldWeight = (weight: string | number | null | undefined) => /bold/i.test(String(weight)) || Number(weight) >= 600;

const MERGE_TOKEN = /\{\{[^{}]*\}\}/g;
const NO_SPACE_SCRIPT = /[\u0E00-\u0EFF\u1000-\u109F\u1780-\u17FF\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFF00-\uFFEF]/;
const SEPARATOR_RUN = /([/.?&=_\-#]+)/;
// Words and the break opportunities between them (spaces browsers and Word both already
// honour; not &nbsp;, which never breaks). A merge token is part of its word even when it
// contains spaces ({{Email Address}}): splitting it would stop the host substituting it.
const WORDS_AND_SPACES = /(?:\{\{[^{}]*\}\}|[^ \t\n\r\f\u200B])+|[ \t\n\r\f\u200B]+/g;
const BREAKABLE_SPACE = /^[ \t\n\r\f\u200B]/;
const WIDEST_EM = 0.95;
const BOLD_FACTOR = 1.08;
const SAFETY = 1.1;
/** Longest separator-free run left intact inside a token that needs breaking. */
const MAX_RUN = 8;

/**
 * Advance of one character in em, generous for the preset fonts: the estimate must not
 * miss a token Word would widen the email for.
 */
function charEm(ch: string) {
  if (ch === 'W' || ch === 'M' || ch === '@' || ch === '%') {
    return WIDEST_EM;
  }
  if (ch === 'm' || ch === 'w') {
    return 0.83;
  }
  if (/\p{Lu}/u.test(ch)) {
    return 0.72;
  }
  if (/[0-9]/.test(ch)) {
    return 0.56;
  }
  if (/\p{Ll}/u.test(ch)) {
    return 0.5;
  }
  return 0.6;
}

/** Conservative estimate of a token's rendered width in px (never less than any preset font renders). */
export function estimateTokenWidth(token: string, { fontSize, bold = false, letterSpacing = 0 }: Omit<TokenBreakOptions, 'width'>) {
  const chars = Array.from(token);
  const em = chars.reduce((sum, ch) => sum + charEm(ch), 0);
  return (em * fontSize * (bold ? BOLD_FACTOR : 1) + Math.max(0, letterSpacing) * chars.length) * SAFETY;
}

function tooWide(text: string, options: TokenBreakOptions) {
  return estimateTokenWidth(text, options) > options.width;
}

/** Append `more` (pieces with a break between each two) to `pieces`: its first piece joins their last one. */
function append(pieces: string[], more: string[]) {
  pieces[pieces.length - 1] += more[0];
  pieces.push(...more.slice(1));
  return pieces;
}

/** Split a separator-free run into pieces that fit (at most MAX_RUN characters each). */
function breakRun(run: string, options: TokenBreakOptions) {
  if (!tooWide(run, options)) {
    return [run];
  }
  const widestChar = WIDEST_EM * options.fontSize * (options.bold ? BOLD_FACTOR : 1) * SAFETY;
  const size = Math.max(1, Math.min(MAX_RUN, Math.floor(options.width / widestChar)));
  const chars = Array.from(run);
  const pieces: string[] = [];
  for (let i = 0; i < chars.length; i += size) {
    pieces.push(chars.slice(i, i + size).join(''));
  }
  return pieces;
}

/** Break a piece of a token that holds no merge token: after each separator run. */
function breakPlain(text: string, options: TokenBreakOptions) {
  const parts = text.split(SEPARATOR_RUN);
  const pieces = [''];
  parts.forEach((part, i) => {
    append(pieces, breakRun(part, options));
    const isSeparatorRun = i % 2 === 1;
    if (isSeparatorRun && parts[i + 1]) {
      pieces.push('');
    }
  });
  return pieces;
}

function breakToken(token: string, options: TokenBreakOptions) {
  if (!tooWide(token, options) || NO_SPACE_SCRIPT.test(token)) {
    return [token];
  }
  const pieces = [''];
  let last = 0;
  for (const match of token.matchAll(MERGE_TOKEN)) {
    const before = token.slice(last, match.index);
    if (before) {
      append(pieces, breakPlain(before, options)).push('');
    }
    pieces[pieces.length - 1] += match[0];
    last = match.index! + match[0].length;
    if (last < token.length) {
      pieces.push('');
    }
  }
  return append(pieces, breakPlain(token.slice(last), options));
}

/**
 * Split `text` where its tokens too wide for `options.width` need break opportunities.
 * Text that fits, merge tokens and no-space scripts stay whole.
 *
 * @returns The pieces of `text`, to render with a BREAK_OPPORTUNITY between each two ([text] when none is needed).
 */
export function breakLongTokens(text: string, options: TokenBreakOptions) {
  if (!text || options.width <= 0) {
    return [text];
  }
  const pieces = [''];
  for (const part of text.match(WORDS_AND_SPACES) ?? []) {
    append(pieces, BREAKABLE_SPACE.test(part) ? [part] : breakToken(part, options));
  }
  return pieces;
}

/**
 * `text` as React children, with break opportunities in its too-wide tokens (see breakLongTokens).
 * The Word part is raw HTML, which renderToStaticMarkup unwraps (see RawHtml).
 */
export function withBreakOpportunities(text: string, options: TokenBreakOptions): React.ReactNode[] {
  return breakLongTokens(text, options).flatMap((piece, i) =>
    i === 0 ? [piece] : [React.createElement(RawHtml, { key: i, html: BREAK_OPPORTUNITY }), piece]
  );
}

export type TextSegment = {
  text: string;
  /** Set when the segment is a bare URL or email address to render as a link. */
  href?: string;
};

// http(s) and www. URLs, without trailing punctuation. Merge tokens, including ones with
// spaces, are part of the URL so the link keeps them for the host to substitute.
const BARE_URL = /\b(?:https?:\/\/|www\.)(?:\{\{[^{}]*\}\}|[^\s<>"'\u200B{}])*(?:\{\{[^{}]*\}\}|[^\s<>"'\u200B{}.,;:!?)\]])/;
// Email addresses: a local part, @ and a dotted domain, without trailing punctuation.
// Merge tokens can stand for any part of them.
const BARE_EMAIL = /(?:\{\{[^{}]*\}\}|[\w.%+-])+@(?:\{\{[^{}]*\}\}|[a-z0-9-])+(?:\.(?:\{\{[^{}]*\}\}|[a-z0-9-])+)+/;
/** A bare URL (group 1) or email address. */
const BARE_ADDRESS = new RegExp(`(${BARE_URL.source})|${BARE_EMAIL.source}`, 'gi');

/**
 * Split text into plain runs and the bare URLs and email addresses too wide for `options.width`.
 * Such an address is about to get break opportunities, which split its text into separate
 * runs, so clients that auto-link addresses (Gmail, Apple Mail, Outlook.com) could link it
 * cut short: it becomes an explicit link first, with the URL (or mailto: and the address)
 * intact. Addresses that fit are left to the clients' auto-linking as before.
 */
export function splitLongUrls(text: string, options: TokenBreakOptions): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(BARE_ADDRESS)) {
    const [address, url] = match;
    if (breakToken(address, options).length === 1) {
      continue;
    }
    if (match.index! > last) {
      segments.push({ text: text.slice(last, match.index) });
    }
    const href = url === undefined ? `mailto:${address}` : /^www\./i.test(url) ? `http://${url}` : url;
    segments.push({ text: address, href });
    last = match.index! + address.length;
  }
  if (last < text.length) {
    segments.push({ text: text.slice(last) });
  }
  return segments;
}

const SKIPPED_ELEMENTS = new Set(['STYLE', 'SCRIPT', 'PRE', 'CODE', 'TEXTAREA', 'TITLE']);

/** The DOM nodes of a BREAK_OPPORTUNITY. */
function breakOpportunityNodes(doc: Document) {
  return [doc.createElement('wbr'), doc.createComment(`[if mso]>${ZWSP}<![endif]`)];
}

/**
 * Apply breakLongTokens to every text node under `root`, skipping style, script, pre,
 * code, textarea and title content: a text node that needs breaks becomes its pieces with
 * the nodes of a BREAK_OPPORTUNITY between them. `optionsFor` returns the typography of the
 * element holding a text node (font size and weight vary inside rich text), or null to skip it.
 */
export function breakLongTokensInTree(root: Node, optionsFor: (parent: Element) => TokenBreakOptions | null) {
  Array.from(root.childNodes).forEach((node) => {
    if (node.nodeType === 3) {
      const parent = node.parentElement;
      const options = parent ? optionsFor(parent) : null;
      const pieces = options && node.nodeValue ? breakLongTokens(node.nodeValue, options) : [];
      if (pieces.length > 1) {
        const doc = node.ownerDocument!;
        node.replaceWith(...pieces.flatMap((piece, i) => [...(i === 0 ? [] : breakOpportunityNodes(doc)), doc.createTextNode(piece)]));
      }
    } else if (node.nodeType === 1 && !SKIPPED_ELEMENTS.has((node as Element).tagName.toUpperCase())) {
      breakLongTokensInTree(node, optionsFor);
    }
  });
}
