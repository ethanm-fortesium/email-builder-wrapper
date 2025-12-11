import DOMPurify from 'dompurify';

type SanitizeOptions = Parameters<typeof DOMPurify.sanitize>[1];

const BASE_CONFIG = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ['style'],
} as SanitizeOptions;
const FRAGMENT_CONFIG = {
  USE_PROFILES: { html: true },
  RETURN_DOM_FRAGMENT: true,
  ADD_ATTR: ['style'],
} as SanitizeOptions;

const appendStyle = (node: Element, style: string) => {
  const existing = node.getAttribute('style');
  const trimmed = existing ? existing.trim().replace(/;\s*$/, '') : '';
  node.setAttribute('style', trimmed ? `${trimmed}; ${style}` : style);
};

const applyListStyling = (root: ParentNode) => {
  root.querySelectorAll?.('ul').forEach((list) => {
    appendStyle(list as Element, 'list-style:disc;margin:0 0 1em;padding-left:1.5em');
  });

  root.querySelectorAll?.('ol').forEach((list) => {
    appendStyle(list as Element, 'list-style:decimal;margin:0 0 1em;padding-left:1.5em');
  });

  root.querySelectorAll?.('li').forEach((item) => {
    appendStyle(item as Element, 'list-style-position:outside;margin-bottom:0.5em');
  });

  root.querySelectorAll?.('[class*="ql-indent-"]').forEach((node) => {
    const element = node as Element;
    const matches = element.className.match(/ql-indent-(\d+)/);
    if (matches) {
      const level = Number(matches[1]) || 0;
      appendStyle(element, `margin-left:${level * 3}em`);
    }
  });
};

const applyLinkStyling = (root: ParentNode) => {
  root.querySelectorAll?.('a').forEach((anchor) => {
    appendStyle(anchor as Element, 'text-decoration:none;color:inherit');
    const element = anchor as HTMLAnchorElement;
    const currentRel = element.getAttribute('rel') || '';
    if (element.getAttribute('target') === '_blank') {
      const relTokens = new Set<string>(currentRel.split(' ').filter(Boolean));
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

    appendStyle(element, 'margin:0 0 12px;line-height:1.0');
  });
};

export const sanitizeRichText = (html: string, options?: { decorateLinks?: boolean }): string => {
  if (!html) return '';

  if (typeof window === 'undefined') {
    return DOMPurify.sanitize(html, BASE_CONFIG);
  }

  const fragment = DOMPurify.sanitize(html, FRAGMENT_CONFIG) as unknown as DocumentFragment;

  applyParagraphStyling(fragment);
  applyListStyling(fragment);
  if (options?.decorateLinks) {
    applyLinkStyling(fragment);
  }

  const container = document.createElement('div');
  container.appendChild(fragment);
  return container.innerHTML;
};
