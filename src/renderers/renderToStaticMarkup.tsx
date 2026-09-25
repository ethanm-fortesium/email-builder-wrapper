import React from 'react';
import { renderToStaticMarkup as baseRenderToStaticMarkup } from 'react-dom/server';

import Reader, { TReaderDocument } from '../Reader/core.js';
import { clampCanvasWidth, getLayoutTypography } from '../documents/blocks/EmailLayout/emailLayoutShared.js';
import type { EmailLayoutProps } from '../documents/blocks/EmailLayout/EmailLayoutPropsSchema.js';
import { escapeAttr, escapeHtml, stripRawHtmlWrappers } from '../documents/blocks/helpers/rawHtml.js';
import { StyleRegistryContext, createStyleRegistry } from '../documents/blocks/helpers/styleRegistry.js';
import { quoteFontName, type Typography } from '../documents/blocks/helpers/emailTypography.js';

type EmailLayoutBlock = {
  type: 'EmailLayout';
  data: EmailLayoutProps;
};

type LayoutAppearance = {
  backdropColor: string;
  canvasWidth: number;
  typography: Typography;
};

/**
 * Derives the document-level appearance from the document's EmailLayout block or sensible defaults.
 *
 * @param document - Reader document containing blocks indexed by id
 * @param rootBlockId - Id of the root block to read for EmailLayout props
 * @returns The backdrop colour, clamped canvas width and resolved layout typography
 */
function getLayoutAppearance(document: TReaderDocument, rootBlockId: string): LayoutAppearance {
  const block = document[rootBlockId] as EmailLayoutBlock | undefined;
  const props: EmailLayoutProps = block && block.type === 'EmailLayout' ? block.data : {};
  return {
    backdropColor: props.backdropColor ?? '#F5F5F5',
    canvasWidth: clampCanvasWidth(props.canvasWidth ?? undefined),
    typography: getLayoutTypography(props),
  };
}

/**
 * Viewport width at which fluid columns stack. It follows the canvas width so the
 * stack rules switch at the same point the fluid columns would start wrapping.
 */
function responsiveBreakpoint(canvasWidth: number) {
  return Math.max(600, canvasWidth - 1);
}

/**
 * Classic Outlook (Word) only: table spacing resets, the layout typography as the
 * default for every table cell (Word does not inherit it through nested tables),
 * and browser-default paragraph/list/heading spacing, which Word replaces with its
 * own. Inline styles still override all of these. One rule per line.
 */
function msoStyleSheet(typography: Typography, extraRules: string[]) {
  const family = typography.msoFont ? quoteFontName(typography.msoFont) : typography.fontFamily;
  return [
    'table,td,th{mso-table-lspace:0pt;mso-table-rspace:0pt;}',
    `td,th{font-family:${family};color:${typography.color};font-size:${typography.fontSize}px;letter-spacing:${typography.letterSpacing}px;}`,
    'p{margin-top:1em;margin-bottom:1em;}',
    'ul,ol{margin-top:1em;margin-bottom:1em;}',
    'li{margin-top:0;margin-bottom:0;}',
    'h1{margin-top:.67em;margin-bottom:.67em;}',
    'h2{margin-top:.83em;margin-bottom:.83em;}',
    'h3{margin-top:1em;margin-bottom:1em;}',
    ...extraRules,
  ].join('\n');
}

/** SMTP's limit on the length of a line (RFC 5322), excluding the CRLF. */
export const MAX_LINE_LENGTH = 998;

/**
 * Elements never folded: raw text, text whose whitespace matters, and links. A link stays on
 * one line (start tag, text and end tag) because plain-text converters such as the host's
 * match `<a href="...">text</a>` line by line.
 */
const UNFOLDED_ELEMENTS = new Set(['style', 'script', 'xml', 'title', 'textarea', 'pre', 'a']);

const CONDITIONAL_MARKER = /^(?:<!--\[if [^\]]+\]>(?:<!-->)?|<!--<!\[endif\]-->|<!\[endif\]-->)/;

/** A {{merge token}}: closed nearby, without crossing markup or a line. */
const MERGE_TOKEN_AT = /\{\{[^{}<\n]{0,200}\}\}/y;

/** End index of the merge token starting at `at`, or -1 when there is none (e.g. a stray '{{'). */
function mergeTokenEnd(html: string, at: number) {
  MERGE_TOKEN_AT.lastIndex = at;
  return MERGE_TOKEN_AT.test(html) ? MERGE_TOKEN_AT.lastIndex : -1;
}

/**
 * Keep every line within SMTP's line-length limit. A relay that does not re-encode the
 * message hard-wraps longer lines wherever the limit falls, which can split a tag, a
 * conditional comment or a {{merge token}}.
 *
 * Only lines over the limit change, and only by turning an existing space or tab into a
 * newline where that cannot change the layout in any client, Word included: between the
 * attributes of a tag, or, when a line has no such point, between two words of text
 * (Word may then position the glyphs of the following word a fraction of a pixel
 * differently). Text is never folded inside a {{merge token}}, a plain comment or a
 * raw-text element, nor anywhere when the document contains whitespace-preserving
 * content. Conditional-comment markers stay intact; the markup between them is folded
 * like any other.
 *
 * Lengths are measured in UTF-8 octets, as SMTP counts them: characters in non-Latin text
 * take two to four octets each.
 *
 * A link is never folded (see UNFOLDED_ELEMENTS), so a link whose text carries many long-token
 * break opportunities can exceed the limit; senders that base64- or quoted-printable-encode
 * the body (as RegulatorOnline's do) are unaffected.
 *
 * @param html - The document to fold.
 * @param maxLength - Longest allowed line in octets, default MAX_LINE_LENGTH.
 * @returns The folded document (unchanged when every line already fits).
 */
export function foldLongLines(html: string, maxLength = MAX_LINE_LENGTH) {
  const foldText = !/<pre[\s>]|white-space:\s*(?:pre|break-spaces)/i.test(html);
  // octets[k] = UTF-8 length of html.slice(0, k).
  const octets = new Uint32Array(html.length + 1);
  for (let k = 0; k < html.length; k++) {
    const code = html.charCodeAt(k);
    // A surrogate pair is 4 octets in total: 2 for each half.
    octets[k + 1] = octets[k] + (code < 0x80 ? 1 : code < 0x800 || (code >= 0xd800 && code <= 0xdfff) ? 2 : 3);
  }
  const breaks: number[] = [];
  let lineStart = 0;
  // Latest fold points on the current line, inside a tag and in text.
  let inTag = -1;
  let inText = -1;

  const fold = (at: number) => {
    breaks.push(at);
    lineStart = at + 1;
    inTag = inTag > at ? inTag : -1;
    inText = inText > at ? inText : -1;
  };
  // Fold the current line until it is short enough to reach `at`, preferring tag points.
  const fit = (at: number) => {
    while (octets[at] - octets[lineStart] > maxLength) {
      const best = inTag >= 0 ? inTag : inText;
      if (best < 0) {
        return false;
      }
      fold(best);
    }
    return true;
  };
  const candidate = (at: number, isTag: boolean) => {
    if (!fit(at)) {
      // Nothing earlier fits (e.g. after a long data: URI); start afresh from here.
      fold(at);
      return;
    }
    if (isTag) {
      inTag = at;
    } else {
      inText = at;
    }
  };
  const lineEnd = (at: number) => {
    fit(at);
    lineStart = at + 1;
    inTag = -1;
    inText = -1;
  };
  // Advance over a region that offers no fold points, still tracking its newlines.
  const skipTo = (from: number, to: number) => {
    for (let k = html.indexOf('\n', from); k >= 0 && k < to; k = html.indexOf('\n', k + 1)) {
      lineEnd(k);
    }
    return to;
  };

  const lower = html.toLowerCase();
  let i = 0;
  while (i < html.length) {
    const ch = html[i];
    if (ch === '\n') {
      lineEnd(i);
      i++;
    } else if (ch === '<' && html.startsWith('<!', i)) {
      const marker = CONDITIONAL_MARKER.exec(html.slice(i, i + 64));
      if (marker) {
        i += marker[0].length;
      } else {
        const close = html.startsWith('<!--', i) ? '-->' : '>';
        const end = html.indexOf(close, i + 2);
        i = skipTo(i, end < 0 ? html.length : end + close.length);
      }
    } else if (ch === '<' && /[a-zA-Z/]/.test(html[i + 1] ?? '')) {
      const isEndTag = html[i + 1] === '/';
      const name = /^<\/?([a-zA-Z][\w:-]*)/.exec(html.slice(i, i + 64))?.[1]?.toLowerCase() ?? '';
      let quote = '';
      let j = i + 1;
      for (; j < html.length; j++) {
        const c = html[j];
        if (quote) {
          quote = c === quote ? '' : quote;
        } else if (c === '"' || c === "'") {
          quote = c;
        } else if (c === '>') {
          break;
        } else if ((c === ' ' || c === '\t') && !UNFOLDED_ELEMENTS.has(name)) {
          candidate(j, true);
        } else if (c === '\n') {
          lineEnd(j);
        }
      }
      i = j + 1;
      if (!isEndTag && html[j - 1] !== '/' && UNFOLDED_ELEMENTS.has(name)) {
        // '</a' alone would also match '</abbr' or '</address'.
        const end = lower.indexOf(name === 'a' ? '</a>' : `</${name}`, i);
        i = skipTo(i, end < 0 ? html.length : end);
      }
    } else if (ch === '{' && mergeTokenEnd(html, i) > 0) {
      // A merge token is never folded. A stray '{{' with no nearby '}}' is ordinary text.
      i = mergeTokenEnd(html, i);
    } else {
      if (foldText && (ch === ' ' || ch === '\t')) {
        candidate(i, false);
      }
      i++;
    }
  }
  lineEnd(html.length);

  if (!breaks.length) {
    return html;
  }
  const chars = html.split('');
  breaks.forEach((at) => {
    chars[at] = '\n';
  });
  return chars.join('');
}

type TOptions = {
  rootBlockId: string;
  /** Language of the email content (html lang and the article wrapper). */
  lang?: string;
  dir?: 'ltr' | 'rtl';
  /** Document title (usually the subject). Omitted when not provided. */
  title?: string;
};
/**
 * Render a reader document to a complete, layout-aware static HTML email.
 *
 * The output is a full HTML document built for parity between classic Outlook
 * (Word engine) and browser-based clients: Outlook namespaces and 96-PPI settings,
 * an Outlook-only stylesheet, client resets in separate <style> blocks (a client
 * that rejects one block keeps the others), the mobile media query collected from
 * the rendered blocks, and the body without wrapper tables or raw-HTML placeholders,
 * with lines folded to SMTP's length limit.
 *
 * @param document - The reader document to render.
 * @param rootBlockId - Root block id used to derive layout appearance values.
 * @param lang - Content language. Omitted when not given: an unknown language is better unstated than wrong.
 * @param dir - Text direction, default 'ltr'.
 * @param title - Optional document title (also the article wrapper's accessible name).
 * @returns The assembled HTML document as a string.
 */
export default function renderToStaticMarkup(document: TReaderDocument, { rootBlockId, lang, dir = 'ltr', title }: TOptions) {
  const registry = createStyleRegistry();
  const renderedBody = baseRenderToStaticMarkup(
    <StyleRegistryContext.Provider value={registry}>
      <Reader document={document} rootBlockId={rootBlockId} />
    </StyleRegistryContext.Provider>
  );
  const layout = getLayoutAppearance(document, rootBlockId);
  const backdrop = escapeAttr(layout.backdropColor);
  const textSizeAdjust = '-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;';
  const langAttr = lang ? ` lang="${escapeAttr(lang)}"` : '';

  const responsiveRules = registry.get('responsive');
  const responsiveCss = responsiveRules.length
    ? `<style>@media only screen and (max-width:${responsiveBreakpoint(layout.canvasWidth)}px){\n${responsiveRules.join('\n')}\n}</style>`
    : null;

  const segments = [
    '<!DOCTYPE html>',
    `<html${langAttr} dir="${dir}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">`,
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<meta http-equiv="X-UA-Compatible" content="IE=edge" />',
    '<meta name="color-scheme" content="light only" />',
    '<meta name="supported-color-schemes" content="light only" />',
    title ? `<title>${escapeHtml(title)}</title>` : null,
    '<!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->',
    `<!--[if mso]><style>${msoStyleSheet(layout.typography, registry.get('mso'))}</style><![endif]-->`,
    '<style>:root{color-scheme:light only;supported-color-schemes:light only;}</style>',
    `<style>body{margin:0;padding:0;${textSizeAdjust}}</style>`,
    '<style>a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important;font-size:inherit!important;font-family:inherit!important;font-weight:inherit!important;line-height:inherit!important;}</style>',
    responsiveCss,
    '</head>',
    `<body style="margin:0;padding:0;word-spacing:normal;${textSizeAdjust}background-color:${backdrop};" bgcolor="${backdrop}">`,
    `<div role="article" aria-roledescription="email"${title ? ` aria-label="${escapeAttr(title)}"` : ''}${langAttr} dir="${dir}" style="${textSizeAdjust}">`,
    stripRawHtmlWrappers(renderedBody),
    '</div>',
    '</body>',
    '</html>',
  ];

  return foldLongLines(segments.filter((segment) => segment !== null).join('\n'));
}
