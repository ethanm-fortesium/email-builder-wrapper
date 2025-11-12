import React, { useMemo } from 'react';
import { RichTextProps } from './RichTextPropsSchema.js';
import { FONT_FAMILIES } from '../helpers/fontFamily.js';
import DOMPurify from 'dompurify';

export default function RichTextReader({ style, props }: RichTextProps) {
  const wrapperStyle: React.CSSProperties = {};
  if (style) {
    if (style.color) wrapperStyle.color = style.color as string;
    if (style.backgroundColor) wrapperStyle.backgroundColor = style.backgroundColor as string;
    if (style.fontFamily) {
      const resolved = FONT_FAMILIES.find((f) => f.key === style.fontFamily)?.value;
      wrapperStyle.fontFamily = resolved || style.fontFamily;
    }
    if (style.fontSize) wrapperStyle.fontSize = `${style.fontSize}px`;
    if (style.fontWeight) wrapperStyle.fontWeight = style.fontWeight as any;
    if (style.textAlign) wrapperStyle.textAlign = style.textAlign as any;
    if (style.padding) {
      const { top = 0, right = 0, bottom = 0, left = 0 } = style.padding as any;
      wrapperStyle.padding = `${top}px ${right}px ${bottom}px ${left}px`;
    }
  }
  const html = props?.html || props?.initial || '';
  const sanitisedHtml = useMemo(() => {
    if (!html) return '';
    const isServer = typeof window === 'undefined';
    const fragment = DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      RETURN_DOM_FRAGMENT: !isServer,
    }) as unknown as DocumentFragment;
    if (isServer) {
      return fragment as unknown as string;
    }

    const parentFragment = fragment as unknown as ParentNode;
    if (parentFragment.querySelectorAll) {
      const anchors = parentFragment.querySelectorAll('a');
      anchors.forEach((anchor) => {
        anchor.removeAttribute('style');
        anchor.setAttribute('style', 'text-decoration:none;color:inherit');
        const currentRel = anchor.getAttribute('rel');
        if (anchor.getAttribute('target') === '_blank') {
          const relTokens = new Set<string>((currentRel || '').split(' ').filter(Boolean));
          relTokens.add('noopener');
          relTokens.add('noreferrer');
          anchor.setAttribute('rel', Array.from(relTokens).join(' '));
        } else if (!currentRel) {
          anchor.removeAttribute('rel');
        }
      });
    }
    const container = document.createElement('div');
    container.appendChild(fragment);
    return container.innerHTML;
  }, [html]);
  return <div style={wrapperStyle} dangerouslySetInnerHTML={{ __html: sanitisedHtml }} />;
}