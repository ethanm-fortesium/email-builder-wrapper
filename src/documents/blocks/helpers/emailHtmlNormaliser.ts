import { breakLongTokensInTree, isBoldWeight, splitLongUrls } from './breakLongTokens.js';
import { relativeLuminance } from './emailBox.js';
import {
  Typography,
  cssText,
  quoteFontName,
  resolveFontFamily,
  textStyle,
  toHalfPoints,
  wordBaselineOffsetPx,
} from './emailTypography.js';
import { DEFAULT_FONT_FAMILY_KEY, getFontFamilyEntry } from './fontFamily.js';
import { FONT_METRICS } from './fontMetrics.generated.js';
import { measureText } from './textMetrics.js';

// Normalises HTML fragments rendered inside text blocks so classic Outlook (Word)
// renders them like browsers do. Word does not apply the browser's user-agent
// stylesheet: it maps p, li and h1-h6 to its own paragraph styles, ignores ul/ol
// padding and margins, places list text 48px in with a 24px marker hang, gives links
// its own Hyperlink blue, resets typography in every table cell and never grows an
// exact line for images or larger text. Everything added here either equals what
// browsers already compute (explicit UA defaults) or is Word-only (mso-* properties,
// conditional comments, classes styled only in the Outlook stylesheet), except break
// opportunities in too-wide tokens (see breakLongTokens.ts) and, in the DOM modes, links
// for too-wide bare URLs and email addresses and fluid sizes for images.
//
// Modes:
// - 'quill':    RichText output (sanitised, paragraphs decorated by sanitiseRichText).
// - 'markdown': markdown Text output (renderMarkdown), which relies on UA defaults.
// - 'raw':      user HTML (Html block, re-imported emails). Conservative and byte-preserving:
//               Word-only additions, plus explicit UA defaults and link colours only when
//               the fragment has no <style> of its own. Table cells its stylesheet may style
//               get no Word-only typography (the Outlook-only class would override it in Word).
//
// Every mode is idempotent (normalising twice equals normalising once), because
// previously exported HTML is re-imported, and never alters {{...}} merge tokens.

export type EmailHtmlMode = 'quill' | 'markdown' | 'raw';

export type EmailHtmlContext = {
  /** Resolved typography of the element the fragment is rendered into. */
  typography: Typography;
  /** Content width in px available to the fragment. */
  width: number;
  /** Nearest opaque background colour behind the fragment. */
  background: string;
};

export type EmailHtmlOptions = EmailHtmlContext & {
  mode: EmailHtmlMode;
  /** 'raw' mode: receives rules for the Outlook-only stylesheet (classes put on user table cells). */
  addMsoRule?: (css: string) => void;
};

/** Word places list text at the list's margin + 0.5in; browsers at the list's padding. */
const WORD_LIST_INDENT = 48;
const UA_LIST_INDENT = 40;
const BLOCKQUOTE_INDENT = 40;
const BULLETS = ['disc', 'circle', 'square'];
/** The face Windows Chromium uses for the generic 'monospace' family (code, pre, kbd). */
const MONOSPACE_MSO_FONT = 'Consolas';
/**
 * Word baseline term (raiseB, see wordBaselineOffsetPx) for Consolas lines, measured at 16/24px.
 * Not the MONOSPACE preset's value: that preset's Windows font is Courier New.
 */
const MONOSPACE_RAISE_B = 0.225;
/** UA heading sizes and vertical margins, in em of the parent and of the heading. */
const HEADING_UA: Record<string, [size: number, margin: number]> = {
  H1: [2, 0.67],
  H2: [1.5, 0.83],
  H3: [1.17, 1],
  H4: [1, 1.33],
  H5: [0.83, 1.67],
  H6: [0.67, 2.33],
};
const KEYWORD_FONT_SIZES: Record<string, number> = {
  'xx-small': 9,
  'x-small': 10,
  small: 13,
  medium: 16,
  large: 18,
  'x-large': 24,
  'xx-large': 32,
  'xxx-large': 48,
};
// The editor's list defaults, in em of the list's font size (richTextContent.css uses the same
// values): written inline by applyListStyling and reproduced here for the export.
/** List padding-left, which positions the item text. */
export const QUILL_LIST_INDENT_EM = 1.5;
/** List bottom margin, at every nesting level (lists have no top margin). */
export const QUILL_LIST_MARGIN_BOTTOM_EM = 1;
/** Bottom margin of each list item. */
export const QUILL_ITEM_GAP_EM = 0.5;
/** Left margin per Quill indent level (ql-indent-N). */
export const QUILL_INDENT_STEP_EM = 3;
const QUILL_SIZES: Record<string, number> = { small: 0.75, large: 1.5, huge: 2.5 };
const QUILL_FONTS: Record<string, string> = { serif: 'MODERN_SERIF', monospace: 'MONOSPACE' };
/** Inherited properties for which `inherit` (unsupported by Word) is what browsers do anyway. */
const INHERITED_PROPS = new Set(['color', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing']);
/** Elements Word lays out as paragraphs (each has its own line spacing). */
const PARAGRAPH_SELECTOR = 'p,li,div,h1,h2,h3,h4,h5,h6,blockquote,td,th,pre';
/** Elements that may set a font size (declared, or a heading's UA size). */
const SIZED_SELECTOR = '[style*="font"],h1,h2,h3,h4,h5,h6';
/** Block elements: inline content between them at the fragment root sits in an anonymous block. */
const BLOCK_TAG = /^(ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|CENTER|DD|DETAILS|DIV|DL|DT|FIELDSET|FIGCAPTION|FIGURE|FOOTER|FORM|H[1-6]|HEADER|HR|LI|MAIN|NAV|OL|P|PRE|SECTION|SUMMARY|TABLE|UL)$/;

const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------
// CSS values
// ---------------------------------------------------------------------------

type Declaration = { prop: string; value: string };

/** Split an inline style into declarations (semicolons inside quotes or parentheses are kept). */
function parseDeclarations(style: string): Declaration[] {
  const declarations: Declaration[] = [];
  const push = (chunk: string) => {
    const colon = chunk.indexOf(':');
    if (colon > 0) {
      declarations.push({ prop: chunk.slice(0, colon).trim().toLowerCase(), value: chunk.slice(colon + 1).trim() });
    }
  };
  let chunk = '';
  let depth = 0;
  let quote: string | null = null;
  for (const ch of style) {
    if (quote) {
      quote = ch === quote ? null : quote;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth = Math.max(0, depth - 1);
    } else if (ch === ';' && depth === 0) {
      push(chunk);
      chunk = '';
      continue;
    }
    chunk += ch;
  }
  push(chunk);
  return declarations;
}

function lastValue(declarations: Declaration[], prop: string) {
  for (let i = declarations.length - 1; i >= 0; i--) {
    if (declarations[i].prop === prop) {
      return declarations[i].value;
    }
  }
  return null;
}

const declares = (declarations: Declaration[], pattern: RegExp) => declarations.some((d) => pattern.test(d.prop));

const serialise = (declarations: Declaration[]) => declarations.map(({ prop, value }) => `${prop}:${value}`).join(';');

/** Declarations of a style object built with the emailTypography helpers. */
const toDeclarations = (style: object) => parseDeclarations(cssText(style as Record<string, string>));

/** Size, line height and family set by the `font` shorthand ([style] [weight] size[/line-height] family). */
function fontShorthand(value: string | null) {
  const match = value?.match(
    /(?:^|\s)(\d*\.?\d+(?:px|pt|em|rem|%)|xx-small|x-small|small|medium|large|x-large|xx-large|smaller|larger)(?:\s*\/\s*(\S+))?\s+(.+)$/i
  );
  return match ? { size: match[1], lineHeight: match[2] ?? 'normal', family: match[3] } : null;
}

/** A CSS font-size in px, relative to the parent's size; null when unknown ({{...}}, calc(), inherit). */
function parseFontSize(value: string, parentPx: number | null): number | null {
  const v = value.trim().toLowerCase().replace(/\s*!important$/, '');
  if (KEYWORD_FONT_SIZES[v]) {
    return KEYWORD_FONT_SIZES[v];
  }
  if (parentPx !== null && (v === 'smaller' || v === 'larger')) {
    return round2(v === 'smaller' ? parentPx / 1.2 : parentPx * 1.2);
  }
  const match = /^(\d*\.?\d+)(px|pt|em|rem|%)$/.exec(v);
  if (!match) {
    return null;
  }
  const n = Number(match[1]);
  switch (match[2]) {
    case 'px':
      return n;
    case 'pt':
      return round2((n * 4) / 3);
    case 'rem':
      return n * 16;
    case 'em':
      return parentPx === null ? null : round2(n * parentPx);
    default:
      return parentPx === null ? null : round2((n / 100) * parentPx);
  }
}

/** Unitless line heights inherit as ratios; every other form as a computed length. */
type LineHeight = { ratio: number } | { px: number } | 'normal';

function parseLineHeight(value: string, fontSize: number | null): LineHeight | null {
  const v = value.trim().toLowerCase().replace(/\s*!important$/, '');
  if (v === 'normal') {
    return 'normal';
  }
  const match = /^(\d*\.?\d+)(px|pt|em|%)?$/.exec(v);
  if (!match) {
    return null;
  }
  const n = Number(match[1]);
  switch (match[2]) {
    case undefined:
      return { ratio: n };
    case 'px':
      return { px: n };
    case 'pt':
      return { px: (n * 4) / 3 };
    default:
      if (fontSize === null) {
        return null;
      }
      return { px: match[2] === '%' ? (n / 100) * fontSize : n * fontSize };
  }
}

/** Line box height in px for a font size; null for 'normal' (font dependent). */
function lineHeightPxFor(lineHeight: LineHeight, fontSize: number) {
  if (lineHeight === 'normal') {
    return null;
  }
  return round1('ratio' in lineHeight ? lineHeight.ratio * fontSize : lineHeight.px);
}

/** A length in px (px, pt, or em of `fontSize`; unitless 0); null otherwise. */
function parseLengthPx(value: string | null | undefined, fontSize: number) {
  const match = /^(-?\d*\.?\d+)(px|pt|em)?$/.exec((value ?? '').trim().toLowerCase());
  if (!match) {
    return null;
  }
  const n = Number(match[1]);
  if (match[2] === 'pt') {
    return (n * 4) / 3;
  }
  if (match[2] === 'em') {
    return n * fontSize;
  }
  return match[2] === 'px' || n === 0 ? n : null;
}

/** Declared box side (0 top, 1 right, 2 bottom, 3 left) in px from a longhand or shorthand, whichever is last. */
function declaredSide(declarations: Declaration[], box: 'margin' | 'padding', side: 0 | 1 | 2 | 3, fontSize: number) {
  const longhand = `${box}-${['top', 'right', 'bottom', 'left'][side]}`;
  for (let i = declarations.length - 1; i >= 0; i--) {
    const { prop, value } = declarations[i];
    if (prop === longhand) {
      return parseLengthPx(value, fontSize);
    }
    if (prop === box) {
      const [top, right = top, bottom = top, left = right] = value.trim().split(/\s+/);
      return parseLengthPx([top, right, bottom, left][side], fontSize);
    }
  }
  return null;
}

const isAbsoluteColour = (value: string | null): value is string =>
  !!value &&
  /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i.test(value.trim()) &&
  !/^(inherit|initial|unset|currentcolor|transparent)$/i.test(value.trim());

/** Values copied into the Outlook stylesheet must not be able to break out of their rule. */
const isSafeCssValue = (value: string | null): value is string => !!value && !/[<>{};\\]/.test(value) && !/inherit/i.test(value);

function contrastRatio(a: number, b: number) {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * Link colour for a fragment: the typography's link colour, or the text colour (links
 * are always underlined) when that link colour is unreadable on a dark background.
 */
export function effectiveLinkColor({ typography, background }: Pick<EmailHtmlContext, 'typography' | 'background'>) {
  const bg = relativeLuminance(background);
  const link = relativeLuminance(typography.linkColor);
  if (bg !== null && bg < 0.4 && (link === null || contrastRatio(bg, link) < 3)) {
    return typography.color;
  }
  return typography.linkColor;
}

/** Chromium's list marker hang in px (a + b * size per font), for Word's mso-text-indent-alt. */
function listHangPx(fontKey: string | null, type: 'ul' | 'ol', fontSize: number, digits: number) {
  const entry = getFontFamilyEntry(fontKey) ?? getFontFamilyEntry(DEFAULT_FONT_FAMILY_KEY)!;
  const [a, b] = entry.hang[type];
  const numberWidth = type === 'ol' ? 0.08 * fontSize + (digits - 1) * 0.55 * fontSize : 0;
  return round1(a + b * fontSize + numberWidth);
}

const MSO_LIST_WRAPPER_PREFIX = '[if mso]><div style="margin-left:';
const MSO_LIST_WRAPPER_CLOSE = '[if mso]></div><![endif]';
const msoListWrapperOpen = (indent: number) => `${MSO_LIST_WRAPPER_PREFIX}${round2(indent - WORD_LIST_INDENT)}px"><![endif]`;

// ---------------------------------------------------------------------------
// DOM modes ('quill', 'markdown')
// ---------------------------------------------------------------------------

const styleOf = (el: Element) => parseDeclarations(el.getAttribute('style') || '');

function writeStyle(el: Element, declarations: Declaration[]) {
  el.setAttribute('style', serialise(declarations));
}

/** Append declarations for the properties the element does not declare yet. */
function addMissing(el: Element, declarations: Declaration[]) {
  const existing = styleOf(el);
  const missing = declarations.filter(({ prop }) => lastValue(existing, prop) === null);
  if (missing.length) {
    writeStyle(el, [...existing, ...missing]);
  }
}

/**
 * Set declarations: an existing value is replaced where it stands (so repeated runs give the
 * same order) unless a later shorthand would override it; new properties are appended.
 */
function setDeclarations(el: Element, declarations: Declaration[]) {
  if (!declarations.length) {
    return;
  }
  let result = styleOf(el);
  for (const declaration of declarations) {
    const index = result.findIndex((d) => d.prop === declaration.prop);
    const shorthand = declaration.prop.split('-')[0];
    const inPlace = index >= 0 && !result.slice(index + 1).some((d) => d.prop === declaration.prop || d.prop === shorthand);
    if (inPlace) {
      result[index] = declaration;
    } else {
      result = [...result.filter((d) => d.prop !== declaration.prop), declaration];
    }
  }
  writeStyle(el, result);
}

const tagOf = (el: Element) => el.tagName.toUpperCase();

/** The last item of the deepest list a list item ends with (the item itself when it ends with text). */
function trailingItem(li: Element): Element {
  const last = li.lastElementChild;
  let after = last?.nextSibling ?? null;
  while (after && !(after.nodeType === 3 && /\S/.test(after.nodeValue || ''))) {
    after = after.nextSibling;
  }
  if (!last || after || !/^(UL|OL)$/.test(tagOf(last))) {
    return li;
  }
  const items = Array.from(last.children).filter((child) => tagOf(child) === 'LI');
  return items.length ? trailingItem(items[items.length - 1]) : li;
}

/**
 * Word drops the whitespace that starts the text after an inline image (also when the image
 * is the end of a link). A space in its own span survives and is still a normal, breakable
 * space in browsers.
 */
function keepSpaceAfter(img: Element, root: Element) {
  let node: Node = img;
  while (!node.nextSibling && node.parentElement && node.parentElement !== root && /^(A|SPAN|B|STRONG|I|EM|U|S)$/.test(tagOf(node.parentElement))) {
    node = node.parentElement;
  }
  const next = node.nextSibling;
  const space = next?.nodeType === 3 ? /^[ \t\n\r\f]+/.exec(next.nodeValue || '') : null;
  if (!next || !space) {
    return;
  }
  const span = img.ownerDocument.createElement('span');
  span.textContent = ' ';
  next.nodeValue = next.nodeValue!.slice(space[0].length);
  next.parentNode!.insertBefore(span, next);
}

/** Word turns each line of a pre into a paragraph with the pre's margins: use line breaks instead. */
function preLineBreaks(pre: Element) {
  const texts: Text[] = [];
  const collect = (node: Node) =>
    node.childNodes.forEach((child) => (child.nodeType === 3 ? texts.push(child as Text) : collect(child)));
  collect(pre);
  texts.forEach((text, i) => {
    let value = text.nodeValue || '';
    if (i === texts.length - 1) {
      // A final newline adds no line in browsers, but a final <br> would in Word.
      value = value.replace(/\n$/, '');
    }
    if (!value.includes('\n')) {
      if (value !== text.nodeValue) {
        text.nodeValue = value;
      }
      return;
    }
    const doc = text.ownerDocument;
    const parts = value.split('\n');
    text.replaceWith(...parts.flatMap((part, j) => (j === 0 ? [doc.createTextNode(part)] : [doc.createElement('br'), doc.createTextNode(part)])));
  });
}

const classValue = (el: Element, prefix: string) =>
  Array.from(el.classList)
    .find((c) => c.startsWith(prefix))
    ?.slice(prefix.length);

class DomFragment {
  private readonly typography: Typography;

  constructor(
    private readonly root: Element,
    private readonly options: EmailHtmlOptions
  ) {
    this.typography = options.typography;
  }

  /** Elements from the root's child down to `el` (inclusive). */
  private chain(el: Element) {
    const chain: Element[] = [];
    for (let e: Element | null = el; e && e !== this.root; e = e.parentElement) {
      chain.unshift(e);
    }
    return chain;
  }

  private all(selector: string) {
    return Array.from(this.root.querySelectorAll(selector));
  }

  private fontSizeOf(el: Element) {
    let px = this.typography.fontSize;
    for (const e of this.chain(el)) {
      const declarations = styleOf(e);
      const declared = lastValue(declarations, 'font-size') ?? fontShorthand(lastValue(declarations, 'font'))?.size;
      const size = declared ? parseFontSize(declared, px) : null;
      if (size !== null) {
        px = size;
      } else if (!declared && HEADING_UA[tagOf(e)]) {
        px = round2(px * HEADING_UA[tagOf(e)][0]);
      }
    }
    return px;
  }

  /** The line height browsers give `el`, in px. */
  private lineHeightOf(el: Element) {
    const fontSize = this.fontSizeOf(el);
    for (const e of this.chain(el).reverse()) {
      const declared = lastValue(styleOf(e), 'line-height');
      const lineHeight = declared ? parseLineHeight(declared, this.fontSizeOf(e)) : null;
      if (lineHeight) {
        return lineHeightPxFor(lineHeight, fontSize) ?? round1(fontSize * 1.15);
      }
    }
    return round1(fontSize * this.typography.lineHeight);
  }

  private colourOf(el: Element) {
    for (const e of this.chain(el).reverse()) {
      const colour = lastValue(styleOf(e), 'color');
      if (isAbsoluteColour(colour)) {
        return colour;
      }
    }
    return this.typography.color;
  }

  private isBold(el: Element) {
    for (const e of this.chain(el).reverse()) {
      const weight = lastValue(styleOf(e), 'font-weight');
      if (weight) {
        return isBoldWeight(weight);
      }
      if (/^(B|STRONG|TH|H[1-6])$/.test(tagOf(e))) {
        return true;
      }
    }
    return isBoldWeight(this.typography.fontWeight);
  }

  private listIndent(fontSize: number) {
    return this.options.mode === 'quill' ? round2(QUILL_LIST_INDENT_EM * fontSize) : UA_LIST_INDENT;
  }

  /** Content width left inside `el` after ancestor list indents, quote margins and px spacing. */
  private widthOf(el: Element) {
    let width = this.options.width;
    for (const e of this.chain(el)) {
      const declarations = styleOf(e);
      const fontSize = this.fontSizeOf(e);
      for (const side of [1, 3] as const) {
        width -= (declaredSide(declarations, 'margin', side, fontSize) ?? 0) + (declaredSide(declarations, 'padding', side, fontSize) ?? 0);
      }
      const tag = tagOf(e);
      if ((tag === 'UL' || tag === 'OL') && declaredSide(declarations, 'padding', 3, fontSize) === null) {
        width -= this.listIndent(fontSize);
      }
      if (tag === 'BLOCKQUOTE' && declaredSide(declarations, 'margin', 3, fontSize) === null) {
        width -= 2 * BLOCKQUOTE_INDENT;
      }
    }
    return Math.max(0, Math.floor(width));
  }

  normalise() {
    if (this.options.mode === 'quill') {
      this.quillClasses();
      this.dropInherit();
    } else {
      this.paragraphMargins();
    }
    this.wrapRootInlineRuns();
    this.headings();
    this.quotesAndCode();
    this.tableCells();
    this.lists();
    this.linkLongUrls();
    this.links();
    this.supSub();
    this.images();
    this.tallContent();
    breakLongTokensInTree(this.root, (parent) => this.tokenOptions(parent));
  }

  private tokenOptions(parent: Element) {
    return {
      width: this.widthOf(parent),
      fontSize: this.fontSizeOf(parent),
      bold: this.isBold(parent),
      letterSpacing: this.typography.letterSpacing,
    };
  }

  /** Bare URLs and email addresses too wide for their line become explicit links before they get break opportunities. */
  private linkLongUrls() {
    const texts: Text[] = [];
    const collect = (node: Node) =>
      node.childNodes.forEach((child) => {
        if (child.nodeType === 3) {
          texts.push(child as Text);
        } else if (child.nodeType === 1 && !/^(A|STYLE|SCRIPT|PRE|CODE|TEXTAREA|TITLE)$/.test(tagOf(child as Element))) {
          collect(child);
        }
      });
    collect(this.root);
    texts.forEach((text) => {
      const segments = splitLongUrls(text.nodeValue || '', this.tokenOptions(text.parentElement!));
      if (!segments.some((segment) => segment.href)) {
        return;
      }
      const doc = text.ownerDocument;
      text.replaceWith(
        ...segments.map(({ text: value, href }) => {
          if (!href) {
            return doc.createTextNode(value);
          }
          const a = doc.createElement('a');
          a.setAttribute('href', href);
          a.setAttribute('target', '_blank');
          a.textContent = value;
          return a;
        })
      );
    });
  }

  /** Quill class formats (styled only by Quill's own stylesheet) as inline styles. */
  private quillClasses() {
    this.all('[class*="ql-"]').forEach((el) => {
      const align = classValue(el, 'ql-align-');
      if (align && ['center', 'right', 'justify'].includes(align)) {
        addMissing(el, [{ prop: 'text-align', value: align }]);
      }
      if (classValue(el, 'ql-direction-') === 'rtl') {
        el.setAttribute('dir', 'rtl');
        addMissing(el, [{ prop: 'text-align', value: 'right' }]);
      }
      const size = QUILL_SIZES[classValue(el, 'ql-size-') ?? ''];
      if (size) {
        const parentSize = el.parentElement ? this.fontSizeOf(el.parentElement) : this.typography.fontSize;
        addMissing(el, [{ prop: 'font-size', value: `${round2(size * parentSize)}px` }]);
      }
      const fontKey = QUILL_FONTS[classValue(el, 'ql-font-') ?? ''];
      if (fontKey) {
        const { fontFamily, msoFont } = resolveFontFamily(fontKey);
        addMissing(el, toDeclarations({ fontFamily, msoAsciiFontFamily: msoFont && quoteFontName(msoFont), msoHansiFontFamily: msoFont && quoteFontName(msoFont) }));
      }
      const indent = Number(classValue(el, 'ql-indent-'));
      if (indent > 0 && tagOf(el) !== 'LI') {
        setDeclarations(el, [{ prop: 'margin-left', value: `${round2(indent * QUILL_INDENT_STEP_EM * this.fontSizeOf(el))}px` }]);
      }
    });
  }

  /** `inherit` means nothing to Word, and browsers inherit these properties anyway (links excepted). */
  private dropInherit() {
    this.all('[style*="inherit"]').forEach((el) => {
      if (tagOf(el) === 'A') {
        return;
      }
      const declarations = styleOf(el);
      const kept = declarations.filter((d) => !(d.value === 'inherit' && INHERITED_PROPS.has(d.prop)));
      if (kept.length !== declarations.length) {
        writeStyle(el, kept);
      }
    });
  }

  /** Markdown paragraphs: the UA's 1em vertical margins, explicit so Word does not use its own spacing. */
  private paragraphMargins() {
    this.all('p').forEach((p) => {
      if (!declares(styleOf(p), /^margin/)) {
        addMissing(p, [{ prop: 'margin', value: `${round2(this.fontSizeOf(p))}px 0` }]);
      }
    });
  }

  /**
   * Inline content at the fragment root (markdown leaves a raw HTML line such as an <img>
   * unwrapped) shares the text element's exact Word line, which clips images and larger
   * text. Each run of it holding them goes into a div, which browsers render like the
   * anonymous block they already put around it, and which gets its own at-least line
   * (see tallContent). Comments end a run: they may open or close Outlook-only wrappers.
   */
  private wrapRootInlineRuns() {
    const runs: ChildNode[][] = [[]];
    this.root.childNodes.forEach((node) => {
      if (node.nodeType === 8 || (node.nodeType === 1 && BLOCK_TAG.test(tagOf(node as Element)))) {
        runs.push([]);
      } else {
        runs[runs.length - 1].push(node);
      }
    });
    runs.forEach((run) => {
      const elements = run.filter((node): node is Element => node.nodeType === 1);
      const { images, largerText } = this.tallContentOf(elements, this.typography.fontSize);
      if (images.length || largerText) {
        const div = this.root.ownerDocument.createElement('div');
        run[0].before(div);
        div.append(...run);
      }
    });
  }

  /**
   * h1-h6 at their UA size and margins, bold, with their own Word line height and no
   * Word kerning (Word's Heading styles kern, browsers effectively do not). Family, colour
   * and letter spacing are inherited in Word too (same table cell), so they are not repeated.
   */
  private headings() {
    const inherited = ['font-family', 'mso-ascii-font-family', 'mso-hansi-font-family', 'color', 'letter-spacing'];
    this.all('h1,h2,h3,h4,h5,h6').forEach((h) => {
      const fontSize = this.fontSizeOf(h);
      const additions = toDeclarations(textStyle({ ...this.typography, fontSize, fontWeight: 'bold' }, { heading: true })).filter(
        (d) => !inherited.includes(d.prop)
      );
      if (!declares(styleOf(h), /^margin/)) {
        additions.unshift({ prop: 'margin', value: `${round2(fontSize * HEADING_UA[tagOf(h)][1])}px 0` });
      }
      addMissing(h, additions);
    });
  }

  /**
   * Block quotes get the UA margins. code, kbd and pre keep the browser's monospace face,
   * at an explicit size (Word would apply its 10pt 'HTML Code' style), with Word pinned to
   * the face Windows browsers use for it.
   */
  private quotesAndCode() {
    this.all('blockquote').forEach((quote) => {
      if (!declares(styleOf(quote), /^margin/)) {
        addMissing(quote, [{ prop: 'margin', value: `${round2(this.fontSizeOf(quote))}px ${BLOCKQUOTE_INDENT}px` }]);
      }
    });
    this.all('pre,code,kbd').forEach((el) => {
      const fontSize = this.fontSizeOf(el);
      const additions: Declaration[] = [
        { prop: 'font-family', value: 'monospace' },
        { prop: 'font-size', value: `${round2(fontSize)}px` },
        { prop: 'mso-ascii-font-family', value: MONOSPACE_MSO_FONT },
        { prop: 'mso-hansi-font-family', value: MONOSPACE_MSO_FONT },
      ];
      if (tagOf(el) === 'PRE') {
        preLineBreaks(el);
        if (!declares(styleOf(el), /^margin/)) {
          additions.push({ prop: 'margin', value: `${round2(fontSize)}px 0` });
        }
        const lineHeight = this.lineHeightOf(el);
        const raise = toHalfPoints(wordBaselineOffsetPx(MONOSPACE_RAISE_B, fontSize, lineHeight));
        additions.push({ prop: 'mso-line-height-alt', value: `${lineHeight}px` }, { prop: 'mso-text-raise', value: `${Math.max(0, raise)}pt` });
      }
      addMissing(el, additions);
    });
  }

  /** Word resets typography in every table cell: give cells the values browsers inherit. */
  private tableCells() {
    this.all('td,th').forEach((cell) => {
      const typography = { ...this.typography, fontSize: this.fontSizeOf(cell), color: this.colourOf(cell) };
      const additions = toDeclarations(textStyle(typography, { weight: false, rule: 'at-least' }));
      if (tagOf(cell) === 'TH') {
        additions.push({ prop: 'font-weight', value: 'bold' });
      }
      addMissing(cell, additions);
    });
  }

  /**
   * Lists look the same in browsers (same indent, markers and spacing) and Word gets:
   * - the indent through an Outlook-only wrapper div (Word ignores ul/ol padding and puts
   *   text at margin + 48px; an inline negative margin would break webmail);
   * - the list's vertical margins on its first and last item (Word ignores ul/ol margins),
   *   mirroring margin collapsing: the last item keeps max(its own gap, the list margin);
   * - the browser's marker hang (mso-text-indent-alt), sized for the widest number;
   * - marker types by nesting depth (ul and ol ancestors both count, as in the UA sheet).
   */
  private lists() {
    const quill = this.options.mode === 'quill';
    // Innermost lists first: an item's bottom margin can then move onto its nested list's last item.
    this.all('ul,ol').reverse().forEach((list) => {
      const type = tagOf(list) === 'UL' ? 'ul' : 'ol';
      const fontSize = this.fontSizeOf(list);
      const declarations = styleOf(list);
      let depth = 0;
      for (let e = list.parentElement; e && e !== this.root; e = e.parentElement) {
        depth += /^(UL|OL)$/.test(tagOf(e)) ? 1 : 0;
      }
      // Quill lists get the editor's list defaults (margin 0 0 1em at every level, see
      // applyListStyling); UA lists 1em 0, nested lists 0.
      const defaultTop = quill || depth > 0 ? 0 : fontSize;
      const defaultBottom = quill ? QUILL_LIST_MARGIN_BOTTOM_EM * fontSize : depth === 0 ? fontSize : 0;
      const listTop = declaredSide(declarations, 'margin', 0, fontSize) ?? defaultTop;
      const listBottom = declaredSide(declarations, 'margin', 2, fontSize) ?? defaultBottom;
      const indent = declaredSide(declarations, 'padding', 3, fontSize) ?? this.listIndent(fontSize);
      const hasMarkerType = lastValue(declarations, 'list-style-type') !== null || lastValue(declarations, 'list-style') !== null;
      const kept = declarations.filter(
        (d) => !['margin', 'margin-top', 'margin-bottom', 'padding', 'padding-left'].includes(d.prop) && !(d.prop === 'color' && d.value === 'inherit')
      );
      writeStyle(list, [
        ...kept,
        ...(hasMarkerType ? [] : [{ prop: 'list-style-type', value: type === 'ul' ? BULLETS[Math.min(depth, BULLETS.length - 1)] : 'decimal' }]),
        { prop: 'margin-top', value: '0' },
        { prop: 'margin-bottom', value: '0' },
        { prop: 'padding-left', value: `${round2(indent)}px` },
      ]);
      this.msoListWrapper(list, indent);

      const items = Array.from(list.children).filter((child) => tagOf(child) === 'LI');
      const start = Number(list.getAttribute('start')) || 1;
      const hang = listHangPx(this.typography.fontKey, type, fontSize, String(start + items.length - 1).length);
      items.forEach((li, i) => {
        const liDeclarations = styleOf(li);
        const ownTop = declaredSide(liDeclarations, 'margin', 0, fontSize) ?? 0;
        const gap = declaredSide(liDeclarations, 'margin', 2, fontSize) ?? (quill ? round2(QUILL_ITEM_GAP_EM * fontSize) : 0);
        const top = Math.max(ownTop, i === 0 ? listTop : 0);
        const bottom = Math.max(gap, i === items.length - 1 ? listBottom : 0);
        const indentLevel = quill ? Number(classValue(li, 'ql-indent-')) || 0 : 0;
        // Word applies an item's bottom margin to the item's own line, before any nested list
        // it ends with; browsers collapse it with the nested list's last item. Put it there.
        const trailing = trailingItem(li);
        if (trailing !== li && bottom > 0) {
          const trailingBottom = declaredSide(styleOf(trailing), 'margin', 2, fontSize) ?? 0;
          setDeclarations(trailing, [{ prop: 'margin-bottom', value: `${round2(Math.max(trailingBottom, bottom))}px` }]);
        }
        writeStyle(
          li,
          liDeclarations.filter((d) => d.prop !== 'list-style-position' && !(d.prop === 'color' && d.value === 'inherit'))
        );
        setDeclarations(li, [
          { prop: 'margin-top', value: `${round2(top)}px` },
          { prop: 'margin-bottom', value: `${trailing === li ? round2(bottom) : 0}px` },
          ...(indentLevel ? [{ prop: 'margin-left', value: `${round2(indentLevel * QUILL_INDENT_STEP_EM * fontSize)}px` }] : []),
          { prop: 'mso-text-indent-alt', value: `-${hang}px` },
        ]);
      });
    });
  }

  private msoListWrapper(list: Element, indent: number) {
    const open = msoListWrapperOpen(indent);
    const before = list.previousSibling;
    if (before?.nodeType === 8 && (before as Comment).data.startsWith(MSO_LIST_WRAPPER_PREFIX)) {
      (before as Comment).data = open;
    } else {
      list.before(list.ownerDocument.createComment(open));
    }
    const after = list.nextSibling;
    if (!(after?.nodeType === 8 && (after as Comment).data === MSO_LIST_WRAPPER_CLOSE)) {
      list.after(list.ownerDocument.createComment(MSO_LIST_WRAPPER_CLOSE));
    }
  }

  /**
   * An explicit colour and underline on every text link (each only when missing), so
   * Word (Hyperlink blue), Gmail (#1155CC) and browsers agree. A colour carried by the
   * link's only child moves onto the link so the underline matches it; `inherit`
   * resolves to the inherited colour. Links that only wrap images get no underline.
   */
  private links() {
    const linkColor = effectiveLinkColor(this.options);
    const visibleText = (el: Element) => (el.textContent || '').replace(/[\s\u200B]/g, '');
    this.all('a').forEach((a) => {
      if (!visibleText(a) && a.querySelector('img')) {
        addMissing(a, [{ prop: 'text-decoration', value: 'none' }]);
        return;
      }
      const colour = lastValue(styleOf(a), 'color');
      if (!isAbsoluteColour(colour)) {
        const only = a.children.length === 1 && visibleText(a.children[0]) === visibleText(a) ? a.children[0] : null;
        const childColour = only ? lastValue(styleOf(only), 'color') : null;
        let resolved = linkColor;
        if (colour === 'inherit' && a.parentElement) {
          resolved = this.colourOf(a.parentElement);
        } else if (isAbsoluteColour(childColour)) {
          resolved = childColour;
        }
        setDeclarations(a, [{ prop: 'color', value: resolved }]);
      }
      addMissing(a, [{ prop: 'text-decoration', value: 'underline' }]);
    });
  }

  /** sup/sub would grow the browser's line box; Word keeps the exact pitch. */
  private supSub() {
    this.all('sup,sub').forEach((el) => addMissing(el, [{ prop: 'line-height', value: '0' }]));
  }

  /**
   * Images: border=0, the space after them kept for Word, and width/height attributes when
   * the size is known (Word sizes images without them by DPI), clamped to the available
   * width (Word would widen the email to fit). A declared width or height scales with them
   * when it is a length; fluid ones (%, auto) are left to browsers. Images without a CSS
   * width or max-width of their own shrink to their column in browsers (max-width:100%, with
   * height:auto keeping the aspect ratio); Word uses the attributes.
   */
  private images() {
    this.all('img').forEach((img) => {
      if (!img.hasAttribute('border')) {
        img.setAttribute('border', '0');
      }
      keepSpaceAfter(img, this.root);
      const declarations = styleOf(img);
      const cssWidth = lastValue(declarations, 'width');
      const cssHeight = lastValue(declarations, 'height');
      if (cssWidth === null && lastValue(declarations, 'max-width') === null) {
        addMissing(img, [
          { prop: 'max-width', value: '100%' },
          { prop: 'height', value: 'auto' },
        ]);
      }
      const width = Number(img.getAttribute('width')) || parseLengthPx(cssWidth, 16);
      if (!width || width <= 0) {
        return;
      }
      const height = Number(img.getAttribute('height')) || parseLengthPx(cssHeight, 16);
      const available = this.widthOf(img);
      const scale = available > 0 && width > available ? available / width : 1;
      const w = Math.round(width * scale);
      const h = height ? Math.round(height * scale) : null;
      img.setAttribute('width', String(w));
      if (h) {
        img.setAttribute('height', String(h));
      }
      if (scale < 1) {
        setDeclarations(img, [
          ...(parseLengthPx(cssWidth, 16) !== null ? [{ prop: 'width', value: `${w}px` }] : []),
          ...(h && parseLengthPx(cssHeight, 16) !== null ? [{ prop: 'height', value: `${h}px` }] : []),
        ]);
      }
    });
  }

  /**
   * Word never grows an exact line, so images and larger text in one are clipped.
   * Paragraphs holding them get their own at-least line (the browser line height as
   * the minimum, no raise).
   */
  private tallContent() {
    this.all(PARAGRAPH_SELECTOR).forEach((el) => {
      const fontSize = this.fontSizeOf(el);
      const { images, largerText } = this.tallContentOf([el], fontSize);
      if (!images.length && !largerText) {
        return;
      }
      const lineHeight = this.lineHeightOf(el);
      const imageLine = largerText ? null : this.singleImageLine(el, images, fontSize, lineHeight);
      setDeclarations(el, [
        { prop: 'mso-line-height-alt', value: `${imageLine ?? lineHeight}px` },
        { prop: 'mso-line-height-rule', value: 'at-least' },
        { prop: 'mso-text-raise', value: '0pt' },
      ]);
    });
  }

  /** The images in and under `elements`, and whether they hold text larger than `fontSize`. */
  private tallContentOf(elements: Element[], fontSize: number) {
    const within = (selector: string) => elements.flatMap((el) => [...(el.matches(selector) ? [el] : []), ...Array.from(el.querySelectorAll(selector))]);
    return {
      images: within('img'),
      largerText: within(SIZED_SELECTOR).some((el) => this.fontSizeOf(el) > fontSize + 0.01),
    };
  }

  /**
   * The browser's line box height for a paragraph that is a single line holding images,
   * or null when that is unknown (unmeasurable text, images without a height, several lines).
   * Word's minimum line height then equals it: an image line is taller than Word's natural
   * one by the strut's half leading below the baseline.
   */
  private singleImageLine(el: Element, images: Element[], fontSize: number, lineHeight: number) {
    const font = this.typography.msoFont;
    const face = font ? FONT_METRICS[font]?.regular : undefined;
    const heights = images.map((img) => Number(img.getAttribute('height')));
    if (!font || !face || heights.some((h) => !(h > 0)) || images.some((img) => lastValue(styleOf(img), 'vertical-align'))) {
      return null;
    }
    const text = (el.textContent || '').replace(/\u200B/g, '').replace(/\s+/g, ' ');
    const textWidth = measureText(text, { font, bold: true, sizePx: fontSize });
    const imagesWidth = images.reduce((sum, img) => sum + (Number(img.getAttribute('width')) || Infinity), 0);
    if (textWidth === undefined || textWidth + text.length * this.typography.letterSpacing + imagesWidth > this.widthOf(el)) {
      return null;
    }
    const ascent = Math.round((face.winAscent / face.unitsPerEm) * fontSize);
    const descent = Math.round((face.winDescent / face.unitsPerEm) * fontSize);
    const leading = lineHeight - ascent - descent;
    const above = Math.max(ascent + Math.floor(leading / 2), ...heights);
    return round1(above + descent + leading - Math.floor(leading / 2));
  }
}

/**
 * Normalise a parsed fragment in place ('quill' and 'markdown' modes).
 *
 * @param root - Element whose children are the fragment (the root's own style is left alone).
 * @param options - Mode, and the typography, width and background of the element the fragment renders into.
 */
export function normaliseEmailElement(root: Element, options: EmailHtmlOptions) {
  new DomFragment(root, options).normalise();
}

// ---------------------------------------------------------------------------
// Raw mode (Html block): a byte-preserving tag scanner
// ---------------------------------------------------------------------------

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW_TEXT_TAGS = new Set(['style', 'script', 'textarea', 'title', 'xmp']);
const CLOSES_P = new Set(['address', 'article', 'aside', 'blockquote', 'center', 'div', 'dl', 'fieldset', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul']);
const LINE_BOX_TAGS = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre', 'center', 'dd', 'dt', 'address']);
const MSO_CLASS_PREFIX = 'eb-mso-';

type Attribute = { name: string; value: string; valueStart: number; valueEnd: number; quote: string };

type StartTag = {
  name: string;
  start: number;
  end: number;
  text: string;
  nameEnd: number;
  attributes: Attribute[];
  declarations: Declaration[];
  /** Declarations appended to the style attribute. */
  addStyle: Declaration[];
  /** New class attribute value. */
  classValue?: string;
  /** Markup inserted before the tag. */
  before?: string;
};

type Frame = {
  tag: StartTag;
  fontSize: number | null;
  lineHeight: LineHeight | null;
  fontFamily: string | null;
  color: string | null;
  letterSpacing: number | null;
  bold: boolean;
  listDepth: number;
  /** Bare lists: their items, for Word-only spacing and hang. */
  listItems?: StartTag[];
  linkHasText?: boolean;
};

function decodeEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|quot|amp|apos|lt|gt|nbsp);/gi, (entity, code: string) => {
    const lower = code.toLowerCase();
    if (lower[0] === '#') {
      const codePoint = lower[1] === 'x' ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
      // Out-of-range code points render as U+FFFD in browsers; fromCodePoint would throw.
      return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : '�';
    }
    return ({ quot: '"', amp: '&', apos: "'", lt: '<', gt: '>', nbsp: '\u00A0' } as Record<string, string>)[lower] ?? entity;
  });
}

const START_TAG = /<([a-zA-Z][^\s/>]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/y;
const ATTRIBUTE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function parseStartTag(html: string, start: number): StartTag | null {
  START_TAG.lastIndex = start;
  const match = START_TAG.exec(html);
  if (!match) {
    return null;
  }
  const nameEnd = 1 + match[1].length;
  const attributes: Attribute[] = [];
  for (const m of match[2].matchAll(ATTRIBUTE)) {
    const raw = m[2] ?? m[3] ?? m[4];
    const quote = m[2] !== undefined ? '"' : m[3] !== undefined ? "'" : '';
    const valueEnd = nameEnd + m.index! + m[0].length - (quote ? 1 : 0);
    attributes.push({ name: m[1].toLowerCase(), value: raw ?? '', valueStart: raw === undefined ? -1 : valueEnd - raw.length, valueEnd, quote });
  }
  const style = attributes.find((a) => a.name === 'style');
  return {
    name: match[1].toLowerCase(),
    start,
    end: start + match[0].length,
    text: match[0],
    nameEnd,
    attributes,
    declarations: parseDeclarations(style ? decodeEntities(style.value) : ''),
    addStyle: [],
  };
}

const attributeOf = (tag: StartTag, name: string) => tag.attributes.find((a) => a.name === name);

function escapeFor(value: string, quote: string) {
  const escaped = value.replace(/&/g, '&amp;');
  return quote === "'" ? escaped.replace(/'/g, '&#39;') : escaped.replace(/"/g, '&quot;');
}

/** The start tag with its additions. Only the style and class attribute values change. */
function rebuildTag(tag: StartTag) {
  const replacements: Array<{ start: number; end: number; text: string }> = [];
  let insertion = '';
  const setAttribute = (name: string, rawValue: (existing: Attribute) => string, value: string) => {
    const attribute = attributeOf(tag, name);
    if (!attribute || attribute.valueStart < 0) {
      insertion += ` ${name}="${escapeFor(value, '"')}"`;
    } else if (attribute.quote) {
      replacements.push({ start: attribute.valueStart, end: attribute.valueEnd, text: rawValue(attribute) });
    } else {
      replacements.push({ start: attribute.valueStart, end: attribute.valueEnd, text: `"${escapeFor(value, '"')}"` });
    }
  };
  if (tag.addStyle.length) {
    const addition = serialise(tag.addStyle);
    const style = attributeOf(tag, 'style');
    const existing = style ? decodeEntities(style.value).replace(/;?\s*$/, '') : '';
    setAttribute(
      'style',
      // Append to the raw value so the author's declarations stay byte for byte.
      ({ value, quote }) => {
        const raw = value.replace(/;?\s*$/, '');
        return `${raw}${raw ? ';' : ''}${escapeFor(addition, quote)}`;
      },
      `${existing}${existing ? ';' : ''}${addition}`
    );
  }
  if (tag.classValue !== undefined) {
    const value = tag.classValue;
    setAttribute('class', ({ quote }) => escapeFor(value, quote), value);
  }
  let text = tag.text;
  const insertAt = text.length - (text.endsWith('/>') ? 2 : 1);
  replacements
    .sort((a, b) => b.start - a.start)
    .forEach(({ start, end, text: replacement }) => {
      text = text.slice(0, start) + replacement + text.slice(end);
    });
  if (insertion) {
    const end = insertAt + (text.length - tag.text.length);
    text = text.slice(0, end).replace(/\s*$/, '') + insertion + text.slice(end);
  }
  return (tag.before ?? '') + text;
}

function hashCss(css: string) {
  let hash = 5381;
  for (let i = 0; i < css.length; i++) {
    hash = ((hash << 5) + hash + css.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

class RawFragment {
  private readonly edited = new Set<StartTag>();
  private readonly insertions: Array<{ at: number; text: string }> = [];
  private readonly hasStyleSheet: boolean;
  /** Names in the fragment's own stylesheets (types, .classes, #ids and *), lower case. */
  private readonly styleSheetNames: Set<string>;
  private readonly linkColor: string;

  constructor(
    private readonly html: string,
    private readonly options: EmailHtmlOptions
  ) {
    this.hasStyleSheet = /<style[\s>]/i.test(html);
    const css = Array.from(html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi), (match) => match[1]).join('\n');
    this.styleSheetNames = new Set(css.replace(/\/\*[\s\S]*?\*\//g, '').toLowerCase().match(/[.#]?-?[_a-z][\w-]*|\*/g));
    this.linkColor = effectiveLinkColor(options);
  }

  private rootFrame(): Frame {
    const t = this.options.typography;
    return {
      tag: { name: '#root', start: 0, end: 0, text: '', nameEnd: 0, attributes: [], declarations: [], addStyle: [] },
      fontSize: t.fontSize,
      lineHeight: { ratio: t.lineHeight },
      fontFamily: t.msoFont ? quoteFontName(t.msoFont) : t.fontFamily,
      color: t.color,
      letterSpacing: t.letterSpacing,
      bold: isBoldWeight(t.fontWeight),
      listDepth: 0,
    };
  }

  /** Computed (inherited) typography of an element from its parent and its own declarations. */
  private frameFor(tag: StartTag, parent: Frame): Frame {
    const declarations = tag.declarations;
    const shorthand = fontShorthand(lastValue(declarations, 'font'));
    const sizeValue = lastValue(declarations, 'font-size') ?? shorthand?.size ?? null;
    const heading = HEADING_UA[tag.name.toUpperCase()];
    let fontSize = parent.fontSize;
    if (sizeValue) {
      fontSize = parseFontSize(sizeValue, parent.fontSize);
    } else if (heading && parent.fontSize !== null) {
      fontSize = round2(parent.fontSize * heading[0]);
    }
    const lineHeightValue = lastValue(declarations, 'line-height') ?? shorthand?.lineHeight ?? null;
    const familyValue = lastValue(declarations, 'font-family') ?? shorthand?.family ?? null;
    const colourValue = lastValue(declarations, 'color');
    const spacingValue = lastValue(declarations, 'letter-spacing');
    const weightValue = lastValue(declarations, 'font-weight');
    let letterSpacing = parent.letterSpacing;
    if (spacingValue) {
      letterSpacing = spacingValue === 'normal' ? 0 : fontSize === null ? null : parseLengthPx(spacingValue, fontSize);
    }
    return {
      tag,
      fontSize,
      lineHeight: lineHeightValue ? parseLineHeight(lineHeightValue, fontSize) : parent.lineHeight,
      fontFamily: familyValue ? (isSafeCssValue(familyValue) ? familyValue : null) : parent.fontFamily,
      color: colourValue ? (isAbsoluteColour(colourValue) ? colourValue : null) : parent.color,
      letterSpacing,
      bold: weightValue ? isBoldWeight(weightValue) : parent.bold || /^(b|strong|th|h[1-6])$/.test(tag.name),
      listDepth: parent.listDepth + (tag.name === 'ul' || tag.name === 'ol' ? 1 : 0),
    };
  }

  private addStyle(tag: StartTag, declarations: Declaration[]) {
    const missing = declarations.filter(({ prop }) => lastValue(tag.declarations, prop) === null && !tag.addStyle.some((d) => d.prop === prop));
    if (missing.length) {
      tag.addStyle.push(...missing);
      this.edited.add(tag);
    }
  }

  private static wordLineHeight(frame: Frame) {
    return frame.fontSize === null || frame.lineHeight === null ? null : lineHeightPxFor(frame.lineHeight, frame.fontSize);
  }

  /** Called for every element start tag once its frame is known. */
  private onStart(frame: Frame) {
    const { tag } = frame;
    const declarations = tag.declarations;
    const lineHeight = RawFragment.wordLineHeight(frame);
    const ownSize = lastValue(declarations, 'font-size') ?? fontShorthand(lastValue(declarations, 'font'))?.size;

    if (tag.name === 'td' || tag.name === 'th') {
      if (!this.styleSheetMayStyle(tag)) {
        this.cellClass(frame, lineHeight);
      }
    } else if (LINE_BOX_TAGS.has(tag.name) && ownSize && lineHeight !== null) {
      this.addStyle(tag, [{ prop: 'mso-line-height-alt', value: `${lineHeight}px` }]);
    }

    // Explicit UA defaults (visible CSS, equal to what browsers compute) only for bare
    // elements in fragments without their own stylesheet.
    if (this.hasStyleSheet || declares(declarations, /^margin/) || frame.fontSize === null) {
      return;
    }
    const heading = HEADING_UA[tag.name.toUpperCase()];
    if (tag.name === 'p') {
      this.addStyle(tag, [{ prop: 'margin', value: `${round2(frame.fontSize)}px 0` }]);
    } else if (heading) {
      const additions: Declaration[] = [{ prop: 'margin', value: `${round2(frame.fontSize * heading[1])}px 0` }];
      if (!ownSize) {
        additions.push({ prop: 'font-size', value: `${round2(frame.fontSize)}px` });
        if (lineHeight !== null) {
          additions.push({ prop: 'mso-line-height-alt', value: `${lineHeight}px` });
        }
      }
      additions.push({ prop: 'mso-font-kerning', value: '0pt' });
      this.addStyle(tag, additions);
    } else if ((tag.name === 'ul' || tag.name === 'ol') && !declares(declarations, /^padding/)) {
      frame.listItems = [];
      const open = `<!--${msoListWrapperOpen(UA_LIST_INDENT)}-->`;
      if (!this.html.slice(0, tag.start).endsWith(open)) {
        tag.before = open;
        this.edited.add(tag);
      }
    }
  }

  /**
   * Whether the fragment's own stylesheet may style this cell: it names td, th or * (as in
   * `td{...}`, `.wrapper td{...}`), or the cell's class or id. Such a cell gets no Outlook-only
   * class, which would override those rules in Word.
   */
  private styleSheetMayStyle(tag: StartTag) {
    const names = this.styleSheetNames;
    const classes = decodeEntities(attributeOf(tag, 'class')?.value ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    const id = attributeOf(tag, 'id');
    return (
      ['td', 'th', '*'].some((name) => names.has(name)) ||
      classes.some((name) => names.has(`.${name}`)) ||
      (!!id && names.has(`#${decodeEntities(id.value).toLowerCase()}`))
    );
  }

  /** Word-only typography for a user table cell: a class styled only in the Outlook stylesheet. */
  private cellClass(frame: Frame, lineHeight: number | null) {
    const { tag } = frame;
    const own = (prop: string) => lastValue(tag.declarations, prop) !== null;
    if ((own('font') || (own('font-family') && own('font-size'))) && own('color') && own('mso-line-height-alt')) {
      return;
    }
    const rule = [
      frame.fontFamily ? `font-family:${frame.fontFamily}` : '',
      frame.fontSize !== null ? `font-size:${round2(frame.fontSize)}px` : '',
      frame.color ? `color:${frame.color}` : '',
      frame.letterSpacing !== null ? `letter-spacing:${frame.letterSpacing}px` : '',
      frame.bold && tag.name === 'td' ? 'font-weight:bold' : '',
      lineHeight !== null ? `mso-line-height-alt:${lineHeight}px;mso-line-height-rule:at-least` : '',
    ]
      .filter(Boolean)
      .join(';');
    if (!rule) {
      return;
    }
    const className = `${MSO_CLASS_PREFIX}${hashCss(rule)}`;
    this.options.addMsoRule?.(`.${className}{${rule};}`);
    const current = attributeOf(tag, 'class');
    const others = (current ? decodeEntities(current.value) : '').split(/\s+/).filter((c) => c && !c.startsWith(MSO_CLASS_PREFIX));
    const value = [...others, className].join(' ');
    if (!current || decodeEntities(current.value) !== value) {
      tag.classValue = value;
      this.edited.add(tag);
    }
  }

  /** Called when an element closes; `at` is where markup following it goes. */
  private onEnd(frame: Frame, at: number) {
    const { tag } = frame;
    if (tag.name === 'a' && frame.linkHasText && !this.hasStyleSheet && attributeOf(tag, 'href') && !attributeOf(tag, 'class') && !attributeOf(tag, 'style')) {
      this.addStyle(tag, [
        { prop: 'color', value: this.linkColor },
        { prop: 'text-decoration', value: 'underline' },
      ]);
    }
    if (frame.listItems && frame.fontSize !== null) {
      const close = `<!--${MSO_LIST_WRAPPER_CLOSE}-->`;
      if (!this.html.startsWith(close, at)) {
        this.insertions.push({ at, text: close });
      }
      const items = frame.listItems;
      const nested = frame.listDepth > 1;
      const start = Number(attributeOf(tag, 'start')?.value) || 1;
      const hang = listHangPx(this.options.typography.fontKey, tag.name === 'ul' ? 'ul' : 'ol', frame.fontSize, String(start + items.length - 1).length);
      items.forEach((li, i) => {
        this.addStyle(li, [
          ...(!nested && i === 0 ? [{ prop: 'mso-margin-top-alt', value: `${round2(frame.fontSize!)}px` }] : []),
          ...(!nested && i === items.length - 1 ? [{ prop: 'mso-margin-bottom-alt', value: `${round2(frame.fontSize!)}px` }] : []),
          { prop: 'mso-text-indent-alt', value: `-${hang}px` },
        ]);
      });
    }
  }

  normalise() {
    const html = this.html;
    const stack: Frame[] = [this.rootFrame()];
    /** Close frames above `index`: the one at `index` ends at `explicitEnd`, the rest implicitly at `implicitAt`. */
    const closeTo = (index: number, implicitAt: number, explicitEnd = implicitAt) => {
      while (stack.length > index) {
        const at = stack.length - 1 === index ? explicitEnd : implicitAt;
        this.onEnd(stack.pop()!, at);
      }
    };
    const openIndex = (names: string[], stopAt: string[] = []) => {
      for (let i = stack.length - 1; i > 0; i--) {
        const name = stack[i].tag.name;
        if (names.includes(name)) {
          return i;
        }
        if (stopAt.includes(name)) {
          return -1;
        }
      }
      return -1;
    };

    let pos = 0;
    while (pos < html.length) {
      const lt = html.indexOf('<', pos);
      const textEnd = lt === -1 ? html.length : lt;
      if (textEnd > pos && /[^\s\u00A0\u200B]/.test(decodeEntities(html.slice(pos, textEnd)))) {
        const link = openIndex(['a']);
        if (link > 0) {
          stack[link].linkHasText = true;
        }
      }
      if (lt === -1) {
        break;
      }
      if (html.startsWith('<!--', lt)) {
        const end = html.indexOf('-->', lt + 4);
        pos = end === -1 ? html.length : end + 3;
        continue;
      }
      if (html[lt + 1] === '/' || html[lt + 1] === '!' || html[lt + 1] === '?') {
        const end = html.indexOf('>', lt);
        if (end === -1) {
          break;
        }
        if (html[lt + 1] === '/') {
          const index = openIndex([html.slice(lt + 2, end).trim().toLowerCase()]);
          if (index > 0) {
            closeTo(index, lt, end + 1);
          }
        }
        pos = end + 1;
        continue;
      }
      const tag = parseStartTag(html, lt);
      if (!tag) {
        pos = lt + 1;
        continue;
      }
      pos = tag.end;
      if (RAW_TEXT_TAGS.has(tag.name)) {
        const close = html.toLowerCase().indexOf(`</${tag.name}`, pos);
        pos = close === -1 ? html.length : close;
        continue;
      }
      // Implied end tags: enough of the HTML parsing rules to keep the context right.
      let implied = -1;
      if (tag.name === 'li') {
        implied = openIndex(['li'], ['ul', 'ol']);
      } else if (tag.name === 'td' || tag.name === 'th') {
        implied = openIndex(['td', 'th'], ['tr', 'table']);
      } else if (tag.name === 'tr') {
        implied = openIndex(['tr'], ['table']);
      } else if (CLOSES_P.has(tag.name)) {
        implied = openIndex(['p'], ['td', 'th', 'li', 'div', 'blockquote', 'table']);
      }
      if (implied > 0) {
        closeTo(implied, lt);
      }
      const frame = this.frameFor(tag, stack[stack.length - 1]);
      if (tag.name === 'li') {
        const list = openIndex(['ul', 'ol']);
        stack[list]?.listItems?.push(tag);
      }
      this.onStart(frame);
      if (!VOID_TAGS.has(tag.name) && !tag.text.endsWith('/>')) {
        stack.push(frame);
      }
    }
    closeTo(1, html.length);

    const edits = [
      ...Array.from(this.edited).map((tag) => ({ start: tag.start, end: tag.end, text: rebuildTag(tag) })),
      ...this.insertions.map(({ at, text }) => ({ start: at, end: at, text })),
    ].sort((a, b) => b.start - a.start || b.end - a.end);
    let out = html;
    for (const { start, end, text } of edits) {
      out = out.slice(0, start) + text + out.slice(end);
    }
    return out;
  }
}

/**
 * Normalise an HTML fragment for email (see the modes above).
 *
 * @param html - The fragment.
 * @param options - Mode, the typography, width and background of the element it renders
 *   into and, for 'raw' mode, a sink for Outlook-only stylesheet rules.
 * @returns The normalised HTML. DOM modes return the input unchanged when no DOM is available.
 */
export function normaliseEmailHtml(html: string, options: EmailHtmlOptions) {
  if (!html) {
    return html;
  }
  if (options.mode === 'raw') {
    return new RawFragment(html, options).normalise();
  }
  if (typeof document === 'undefined') {
    return html;
  }
  const container = document.createElement('div');
  container.innerHTML = html;
  normaliseEmailElement(container, options);
  return container.innerHTML;
}
