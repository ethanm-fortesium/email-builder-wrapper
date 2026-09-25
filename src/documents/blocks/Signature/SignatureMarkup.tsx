import DOMPurify from 'dompurify';
import React from 'react';

import { blendHex } from '../helpers/emailBox.js';
import { EmailHtmlContext, normaliseEmailElement } from '../helpers/emailHtmlNormaliser.js';
import { LineRule, Typography, resolveTypography, textStyle } from '../helpers/emailTypography.js';
import { IMAGE_CONTAINER_STYLE, IMAGE_RESET_STYLE, computeImageBox, imageAltStyle, wordImageLimit } from '../helpers/imageBox.js';

import { SignatureProps } from './SignaturePropsSchema.js';

// Signature markup shared by the export (SignatureReader) and the editor canvas (SignatureEditor).
//
// Classic Outlook (Word) does not inherit typography from an outer cell into a nested table and
// ignores unitless line heights, opacity and color:inherit, so every text cell carries its complete
// typography inline, lines have a whole-px pitch, links have an explicit colour and the dimmed
// disclaimer uses a pre-blended solid colour.

export const SOCIAL_NETWORKS = [
  { key: 'linkedIn', icon: 'linkedin', label: 'LinkedIn' },
  { key: 'facebook', icon: 'facebook', label: 'Facebook' },
  { key: 'twitter', icon: 'twitter', label: 'X' },
  { key: 'instagram', icon: 'instagram', label: 'Instagram' },
] as const;

export type SocialIcon = (typeof SOCIAL_NETWORKS)[number]['icon'];

/**
 * URL of the hosted copy of a social icon (the export never embeds images as data: URIs).
 *
 * @param apiBase - The configured API base URL, or null when none is configured.
 * @param icon - The social network's icon name.
 * @returns The icon URL, or null without an API base URL.
 */
export function hostedSocialIconSrc(apiBase: string | null, icon: SocialIcon) {
  return apiBase ? `${apiBase}/Content/email-builder/social/${icon}.png` : null;
}

type SignatureData = NonNullable<SignatureProps['props']>;

/** Line pitch of the signature lines, as a multiple of the font size (rounded to whole px). */
const LINE_PITCH = 1.4;
const DISCLAIMER_FONT_SIZE = 10;
/** The disclaimer keeps the layout's 1.5 pitch it has always inherited (10px text, 15px lines). */
const DISCLAIMER_LINE_PITCH = 1.5;
/** The disclaimer reads as secondary text: its colours are blended at this alpha over the background. */
const DISCLAIMER_ALPHA = 0.6;
const DEFAULT_LOGO_WIDTH = 160;
const SOCIAL_ICON_SIZE = 25;
const SOCIAL_ICON_GAP = 8;

const isSafeHref = (value: string) => /^(https?:|mailto:|tel:)/i.test(value.trim());

/** Logo to render: data: URIs are dropped (Gmail and Outlook strip them from <img src>). */
function logoSource(logoUrl: string | null | undefined) {
  const url = logoUrl?.trim();
  return url && !url.startsWith('data:') ? url : null;
}

function socialLinks(social: SignatureData['social']) {
  return SOCIAL_NETWORKS.flatMap((network) => {
    const href = social?.[network.key];
    return href && isSafeHref(href) ? [{ ...network, href }] : [];
  });
}

/** True when the signature has nothing to show (the export then renders nothing at all). */
export function isSignatureEmpty(props: SignatureProps['props']) {
  const p = props ?? {};
  const hasText = [p.fullName, p.title, p.company, p.email, p.phone, p.website, p.address].some(Boolean);
  return !hasText && !logoSource(p.logoUrl) && socialLinks(p.social).length === 0 && !p.disclaimerHtml;
}

/**
 * tel: link for a literal phone number. A phone with merge tokens ({{Phone}}) gets no link: the host
 * substitutes raw values, possibly empty or containing spaces, which would make a bare or broken tel: link.
 */
function telHref(phone: string) {
  if (phone.includes('{{')) {
    return null;
  }
  const digits = phone.replace(/[^\d+]/g, '');
  return /\d/.test(digits) ? `tel:${digits}` : null;
}

/** Numeric font weight for a style value ('bold' -> 700, 'normal' -> 400); relative weights are resolved too. */
export function normalizeFontWeight(weight: string | number | null | undefined) {
  if (typeof weight === 'number') {
    return weight;
  }
  if (weight === 'bold' || weight === 'bolder') {
    return 700;
  }
  if (weight === 'normal' || weight === 'lighter') {
    return 400;
  }
  const numeric = Number(weight);
  return weight && Number.isFinite(numeric) ? numeric : undefined;
}

/** Same typography with a line height of round(fontSize * pitch) px (Word rounds fractional px and drifts). */
function withLinePitch(t: Typography, pitch: number): Typography {
  return { ...t, lineHeight: Math.round(t.fontSize * pitch) / t.fontSize };
}

/** '#RRGGBB' for a CSS hex or rgb()/rgba() colour; null for anything else (e.g. named colours). */
export function toHexColor(value: string) {
  const v = value.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  if (hex) {
    const digits = hex[1].length === 3 ? hex[1].replace(/./g, '$&$&') : hex[1];
    return `#${digits.toUpperCase()}`;
  }
  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,[^)]*)?\)$/i.exec(v);
  if (rgb) {
    return `#${rgb.slice(1, 4).map((c) => Math.min(255, Number(c)).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  }
  return null;
}

/**
 * Solid colour that looks like `color` at the disclaimer alpha over `background` (replaces CSS
 * opacity, which Word ignores). Colours that cannot be parsed are returned unchanged.
 */
export function dimColor(color: string, background: string) {
  const fg = toHexColor(color);
  const bg = toHexColor(background);
  return fg && bg ? blendHex(fg, bg, DISCLAIMER_ALPHA) : color;
}

/** Elements whose content is not plain text at the disclaimer's size: Word must not clip their lines. */
const MIXED_CONTENT_SELECTOR = 'img, table, h1, h2, h3, h4, h5, h6, big, small, font[size], [style*="font-size"]';

/**
 * Sanitise the user's disclaimer HTML and make its styling explicit for Word, which ignores opacity,
 * inheritance through tables and the browser's default styles:
 * - every explicit colour is pre-blended at the disclaimer alpha over the background, which is what
 *   the old CSS opacity did;
 * - the email normaliser ('markdown' mode: the disclaimer relies on browser defaults too) then writes
 *   the browser-default margins, Word's list geometry, and link colours (the typography's link colour,
 *   dimmed like the text) and underlines.
 *
 * A dedicated post-process of the sanitised fragment, so no global DOMPurify hook changes other blocks.
 *
 * @param html - The user's disclaimer HTML.
 * @param context - The disclaimer's typography (its colour already dimmed), content width and background.
 * @returns The HTML, and the line rule its cell needs ('at-least' when it holds images or other sizes).
 */
export function prepareDisclaimerHtml(html: string, { typography, width, background }: EmailHtmlContext) {
  const sanitized = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  if (typeof window === 'undefined') {
    return { html: sanitized, rule: 'at-least' as LineRule };
  }

  const container = document.createElement('div');
  container.innerHTML = sanitized;
  container.querySelectorAll<HTMLElement>('[style*="color"]').forEach((el) => {
    if (el.style.color) {
      el.style.color = dimColor(el.style.color, background);
    }
  });
  // Decided by the user's content, before the normaliser gives code and table cells explicit sizes.
  const rule: LineRule = container.querySelector(MIXED_CONTENT_SELECTOR) ? 'at-least' : 'exactly';
  normaliseEmailElement(container, {
    mode: 'markdown',
    typography: { ...typography, linkColor: dimColor(typography.linkColor, background) },
    width,
    background,
  });
  return { html: container.innerHTML, rule };
}

export type SignatureMarkupProps = SignatureProps & {
  /** Typography the signature's own font settings apply on top of (the email layout's). */
  baseTypography: Typography;
  /** Nearest opaque colour behind the signature (for the pre-blended disclaimer colours). */
  background: string;
  /** Width available to the signature content in px: the widest Word may draw the logo. */
  contentWidth: number;
  /** Widest the logo may be in any client (the canvas width). */
  maxWidth: number;
  /** Image URL for a social icon, or null to show the social links as text links instead. */
  socialIconSrc: (icon: SocialIcon) => string | null;
};

/**
 * Render the signature content: name and title, logo, contact lines, social links and disclaimer,
 * as one row per line in a full-width table. Padding and background belong to the caller's cell.
 *
 * @returns The signature table (callers handle an empty signature, see isSignatureEmpty).
 */
export default function SignatureMarkup({
  style,
  props,
  baseTypography,
  background,
  contentWidth,
  maxWidth,
  socialIconSrc,
}: SignatureMarkupProps) {
  const p = props ?? {};
  const align = style?.textAlign ?? 'left';
  const typography = withLinePitch(
    resolveTypography(baseTypography, {
      fontFamily: style?.fontFamily,
      fontSize: style?.fontSize,
      color: style?.color,
      fontWeight: normalizeFontWeight(style?.fontWeight),
    }),
    LINE_PITCH
  );
  const linkStyle: React.CSSProperties = { color: typography.color, textDecoration: 'none' };

  const disclaimerTypography = withLinePitch(
    resolveTypography(typography, { fontSize: DISCLAIMER_FONT_SIZE, color: dimColor(typography.color, background) }),
    DISCLAIMER_LINE_PITCH
  );
  const disclaimer = p.disclaimerHtml
    ? prepareDisclaimerHtml(p.disclaimerHtml, { typography: disclaimerTypography, width: contentWidth, background })
    : null;

  const bold = (text: string) => <strong style={{ fontWeight: 700 }}>{text}</strong>;
  const link = (href: string | null, content: React.ReactNode) =>
    href && isSafeHref(href) ? (
      <a href={href} style={linkStyle}>
        {content}
      </a>
    ) : (
      content
    );
  const textRow = (key: string, content: React.ReactNode) => (
    <tr key={key}>
      <td align={align} style={{ ...textStyle(typography), textAlign: align }}>
        {content}
      </td>
    </tr>
  );
  const spacerRow = (key: string, height: number) => (
    <tr key={key}>
      <td
        height={height}
        style={{ height: `${height}px`, fontSize: 0, lineHeight: `${height}px`, msoLineHeightRule: 'exactly' } as React.CSSProperties}
      >
        {'\u00A0'}
      </td>
    </tr>
  );

  const headerRows: React.ReactNode[] = [];
  if (p.fullName) {
    headerRows.push(textRow('fullName', bold(p.fullName)));
  }
  if (p.title) {
    headerRows.push(textRow('title', p.title));
  }

  const contactRows: React.ReactNode[] = [];
  if (p.company) {
    contactRows.push(textRow('company', p.company));
  }
  if (p.email) {
    contactRows.push(textRow('email', link(`mailto:${p.email}`, <>{bold('Email: ')}{p.email}</>)));
  }
  if (p.phone) {
    contactRows.push(textRow('phone', link(telHref(p.phone), <>{bold('Phone: ')}{p.phone}</>)));
  }
  if (p.website) {
    contactRows.push(textRow('website', link(p.website, bold(p.website.replace(/^https?:\/\//, '')))));
  }
  if (p.address) {
    const lines = p.address.split(/\r?\n/).filter((line) => line.trim().length > 0);
    contactRows.push(
      textRow(
        'address',
        lines.map((line, i) => (
          <React.Fragment key={i}>
            {line}
            {i < lines.length - 1 && <br />}
          </React.Fragment>
        ))
      )
    );
  }

  const logoUrl = logoSource(p.logoUrl);
  let logoRow: React.ReactNode = null;
  if (logoUrl) {
    const box = computeImageBox({
      width: p.logoWidth || DEFAULT_LOGO_WIDTH,
      naturalWidth: p.logoNaturalWidth,
      naturalHeight: p.logoNaturalHeight,
      attrMaxWidth: wordImageLimit(contentWidth, maxWidth),
      cssMaxWidth: maxWidth,
    });
    logoRow = (
      <tr key="logo">
        <td align={align} style={{ ...IMAGE_CONTAINER_STYLE, textAlign: align }}>
          <img
            src={logoUrl}
            alt={p.company || 'Logo'}
            width={box.attrWidth}
            height={box.attrHeight}
            border={0}
            draggable={false}
            style={{
              display: 'inline-block',
              verticalAlign: 'middle',
              width: `${box.cssWidth}px`,
              maxWidth: '100%',
              height: 'auto',
              ...IMAGE_RESET_STYLE,
              ...imageAltStyle(typography),
            }}
          />
        </td>
      </tr>
    );
  }

  const social = socialLinks(p.social).map((network) => ({ ...network, src: socialIconSrc(network.icon) }));
  let socialRow: React.ReactNode = null;
  if (social.length > 0 && social.every((network) => network.src)) {
    socialRow = (
      <tr key="social">
        <td align={align} style={{ ...IMAGE_CONTAINER_STYLE, textAlign: align }}>
          <table
            role="presentation"
            cellPadding={0}
            cellSpacing={0}
            border={0}
            align={align === 'left' ? undefined : align}
            style={{ borderCollapse: 'collapse' }}
          >
            <tbody>
              <tr>
                {social.map((network, i) => (
                  <td
                    key={network.key}
                    valign="middle"
                    style={{ paddingRight: i < social.length - 1 ? SOCIAL_ICON_GAP : undefined, ...IMAGE_CONTAINER_STYLE }}
                  >
                    <a href={network.href} style={{ display: 'inline-block', textDecoration: 'none', verticalAlign: 'top' }}>
                      <img
                        src={network.src!}
                        alt={network.label}
                        width={SOCIAL_ICON_SIZE}
                        height={SOCIAL_ICON_SIZE}
                        border={0}
                        draggable={false}
                        style={{
                          display: 'block',
                          width: `${SOCIAL_ICON_SIZE}px`,
                          height: `${SOCIAL_ICON_SIZE}px`,
                          ...IMAGE_RESET_STYLE,
                          ...imageAltStyle(typography, DISCLAIMER_FONT_SIZE),
                        }}
                      />
                    </a>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    );
  } else if (social.length > 0) {
    socialRow = textRow(
      'social',
      social.map((network, i) => (
        <React.Fragment key={network.key}>
          {i > 0 && ' \u00B7 '}
          {link(network.href, network.label)}
        </React.Fragment>
      ))
    );
  }

  const rows: React.ReactNode[] = [...headerRows];
  if (logoRow) {
    if (headerRows.length > 0) {
      rows.push(spacerRow('logo-before', 8));
    }
    rows.push(logoRow);
    if (contactRows.length > 0) {
      rows.push(spacerRow('logo-after', 10));
    }
  }
  rows.push(...contactRows);
  if (socialRow) {
    rows.push(spacerRow('social-before', 10), socialRow);
  }
  if (disclaimer) {
    rows.push(
      spacerRow('disclaimer-before', 8),
      <tr key="disclaimer">
        <td
          align={align}
          style={{ ...textStyle(disclaimerTypography, { rule: disclaimer.rule }), textAlign: align }}
          dangerouslySetInnerHTML={{ __html: disclaimer.html }}
        />
      </tr>
    );
  }

  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>{rows}</tbody>
    </table>
  );
}
