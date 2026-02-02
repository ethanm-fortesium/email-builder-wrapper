import DOMPurify from 'dompurify';

type SanitizeOptions = Parameters<typeof DOMPurify.sanitize>[1];

export type RichTextDecorateOptions = {
  decorateLinks?: boolean;
  decorateParagraphs?: boolean;
  decorateLists?: boolean;
  promoteListItemColors?: boolean;
};

const BASE_CONFIG = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ['style', 'class'],
} satisfies SanitizeOptions;

const FRAGMENT_CONFIG = {
  USE_PROFILES: { html: true },
  RETURN_DOM_FRAGMENT: true,
  ADD_ATTR: ['style', 'class'],
} satisfies SanitizeOptions;

const STYLE_TRAILING_SEMICOLON = /;\s*$/;

const getStyleAttribute = (node: Element): string => node.getAttribute('style') || '';

const hasCssProperty = (style: string, propertyName: string): boolean => {
  const escaped = propertyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escaped}\\s*:`, 'i').test(style);
};

const getLastCssValue = (style: string, propertyName: string): string | null => {
  const escaped = propertyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?:^|;)\\s*${escaped}\\s*:\\s*([^;]+)`, 'gi');
  let last: string | null = null;

  while (true) {
    const match = regex.exec(style);
    if (!match) break;
    last = match[1]?.trim() ?? null;
  }

  return last;
};

const appendStyle = (node: Element, style: string) => {
  const existing = getStyleAttribute(node);
  const trimmed = existing ? existing.trim().replace(STYLE_TRAILING_SEMICOLON, '') : '';
  node.setAttribute('style', trimmed ? `${trimmed}; ${style}` : style);
};

const appendStyleIfMissing = (node: Element, propertyName: string, declaration: string) => {
  const style = getStyleAttribute(node);
  if (!hasCssProperty(style, propertyName)) {
    appendStyle(node, declaration);
  }
};

const appendStyleIfMissingMany = (node: Element, declarations: Array<{ property: string; declaration: string }>) => {
  for (const { property, declaration } of declarations) {
    appendStyleIfMissing(node, property, declaration);
  }
};

const promoteUniformInlineColorToListItem = (li: HTMLLIElement) => {
  const liStyle = getStyleAttribute(li);
  const liColor = getLastCssValue(liStyle, 'color')?.toLowerCase() || null;
  if (liColor && liColor !== 'inherit') return;

  const coloredNodes = Array.from(li.querySelectorAll<HTMLElement>('[style]')).filter((n) => {
    const s = getStyleAttribute(n);
    return hasCssProperty(s, 'color');
  });

  if (coloredNodes.length !== 1) return;
  const colored = coloredNodes[0];
  const colorValue = getLastCssValue(getStyleAttribute(colored), 'color');
  if (!colorValue) return;

  const liText = (li.textContent || '').replace(/\u200B/g, '').trim();
  const coloredText = (colored.textContent || '').replace(/\u200B/g, '').trim();
  if (!liText || liText !== coloredText) return;

  appendStyle(li, `color:${colorValue}`);
};

/**
 * Mutates the DOM in-place to improve list marker (bullet/number) coloring.
 *
 * This is intended for the live editor preview (Quill), where we want markers to
 * visually match uniformly colored list item text.
 */
export const decorateRichTextListMarkerColorsInPlace = (root: ParentNode) => {
  root.querySelectorAll?.('li').forEach((item) => {
    const element = item as HTMLLIElement;
    appendStyleIfMissing(element, 'color', 'color:inherit');
    promoteUniformInlineColorToListItem(element);
  });
};

const applyListStyling = (root: ParentNode, options?: { promoteListItemColors?: boolean }) => {
  const promoteListItemColors = options?.promoteListItemColors ?? true;

  root.querySelectorAll?.('ul').forEach((list) => {
    const element = list as Element;
    appendStyleIfMissingMany(element, [
      { property: 'list-style', declaration: 'list-style:disc' },
      { property: 'margin', declaration: 'margin:0 0 1em' },
      { property: 'padding-left', declaration: 'padding-left:1.5em' },
      { property: 'color', declaration: 'color:inherit' },
    ]);
  });

  root.querySelectorAll?.('ol').forEach((list) => {
    const element = list as Element;
    appendStyleIfMissingMany(element, [
      { property: 'list-style', declaration: 'list-style:decimal' },
      { property: 'margin', declaration: 'margin:0 0 1em' },
      { property: 'padding-left', declaration: 'padding-left:1.5em' },
      { property: 'color', declaration: 'color:inherit' },
    ]);
  });

  root.querySelectorAll?.('li').forEach((item) => {
    const element = item as HTMLLIElement;
    appendStyleIfMissingMany(element, [
      { property: 'list-style-position', declaration: 'list-style-position:outside' },
      { property: 'margin-bottom', declaration: 'margin-bottom:0.5em' },
      { property: 'color', declaration: 'color:inherit' },
    ]);
    if (promoteListItemColors) {
      promoteUniformInlineColorToListItem(element);
    }
  });

  root.querySelectorAll?.('[class*="ql-indent-"]').forEach((node) => {
    const element = node as Element;
    const matches = element.className.match(/ql-indent-(\d+)/);
    if (!matches) return;
    const level = Number(matches[1]) || 0;
    appendStyle(element, `margin-left:${level * 3}em`);
  });
};

const applyLinkStyling = (root: ParentNode) => {
  root.querySelectorAll?.('a').forEach((anchor) => {
    const element = anchor as Element;
    const htmlElement = anchor as HTMLAnchorElement;
    const currentRel = htmlElement.getAttribute('rel') || '';
    if (htmlElement.getAttribute('target') === '_blank') {
      const relTokens = new Set(currentRel.split(' ').filter(Boolean));
      relTokens.add('noopener');
      relTokens.add('noreferrer');
      element.setAttribute('rel', Array.from(relTokens).join(' '));
    } else if (!currentRel) {
      element.removeAttribute('rel');
    }
  });
};

const applyParagraphStyling = (root: ParentNode) => {
  root.querySelectorAll?.('p').forEach((paragraph) => {
    const element = paragraph as HTMLParagraphElement;
    const textContent = element.textContent?.replace(/\u200B/g, '').trim();

    if (!textContent && !element.querySelector('img, br')) {
      element.remove();
      return;
    }

    appendStyleIfMissingMany(element, [
      { property: 'margin', declaration: 'margin:0 0 12px' },
      { property: 'line-height', declaration: 'line-height:1.4' },
    ]);
  });
};

/**
 * Fast, security-focused sanitization.
 *
 * Use this on every keystroke / state update.
 * Apply email-client decorations at render/export time via `decorateRichTextForEmail`.
 */
export const sanitizeRichTextHtml = (html: string): string => {
  if (!html) return '';
  return DOMPurify.sanitize(html, BASE_CONFIG);
};

/**
 * Email-client-friendly HTML decoration (lists/paragraph spacing/link rel/style).
 *
 * Expects already-sanitized HTML.
 * In non-browser environments, this is a no-op.
 */
export const decorateRichTextForEmail = (sanitizedHtml: string, options?: RichTextDecorateOptions): string => {
  if (!sanitizedHtml) return '';
  if (typeof window === 'undefined') return sanitizedHtml;

  const {
    decorateLinks = false,
    decorateParagraphs = true,
    decorateLists = true,
    promoteListItemColors = true,
  } = options || {};

  // `sanitizedHtml` is already DOMPurify-sanitized; we only need DOM parsing here.
  const container = document.createElement('div');
  container.innerHTML = sanitizedHtml;

  if (decorateParagraphs) applyParagraphStyling(container);
  if (decorateLists) applyListStyling(container, { promoteListItemColors });
  if (decorateLinks) applyLinkStyling(container);

  return container.innerHTML;
};

/**
 * Backwards-compatible API: sanitize + decorate (lists/paragraphs always; links optional).
 * Prefer `sanitizeRichTextHtml` + `decorateRichTextForEmail` for better performance.
 */
export const sanitizeRichText = (html: string, options?: { decorateLinks?: boolean }): string => {
  const sanitized = sanitizeRichTextHtml(html);
  return decorateRichTextForEmail(sanitized, {
    decorateLinks: Boolean(options?.decorateLinks),
    decorateParagraphs: true,
    decorateLists: true,
    promoteListItemColors: true,
  });
};
