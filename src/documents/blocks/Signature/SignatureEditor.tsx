import React from 'react';

import { SignatureProps } from './SignaturePropsSchema.js';
import { FONT_FAMILIES } from '../helpers/fontFamily.js';
import linkedinIcon from '../../../assets/social/linkedin.png';
import facebookIcon from '../../../assets/social/facebook.png';
import twitterIcon from '../../../assets/social/twitter.png';
import instagramIcon from '../../../assets/social/instagram.png';

/**
 * Renders its children as a link when a URL is provided, otherwise renders the children unchanged.
 *
 * @param href - The destination URL to link to; if falsy, no anchor is rendered.
 * @param children - The content to render inside the link or directly when no `href` is given.
 * @returns An anchor element wrapping `children` when `href` is provided, otherwise the `children` node itself.
 */
function InlineLink({ href, children }: { href?: string | null; children: React.ReactNode }) {
  if (!href) return <>{children}</>;
  return (
    <a href={href} style={{ color: 'inherit', textDecoration: 'none' }}>
      {children}
    </a>
  );
}

/**
 * Renders a formatted email signature from provided signature data and optional style overrides.
 *
 * Renders name, title, company, contact lines (email, phone, website, address), optional logo, social icons, and an optional disclaimer. If no content is provided, renders a small "Signature (empty)" placeholder.
 *
 * @param style - Optional visual overrides (color, backgroundColor, fontFamily, fontSize applied to main content, fontWeight, textAlign, padding).
 * @param props - Signature data (may include `fullName`, `title`, `company`, `email`, `phone`, `address`, `website`, `logoUrl`, `logoWidth`, `social`, `disclaimerHtml`).
 * @returns A React element representing the composed signature block.
 */
export default function SignatureEditor({ style, props }: SignatureProps) {
  const { fullName, title, company, email, phone, address, website, logoUrl, logoWidth, social, disclaimerHtml } = props || {};

  // wrapperStyle holds shared styles except fontSize; fontSize applied only to main content to avoid impacting disclaimer.
  const wrapperStyle: React.CSSProperties = {};
  let contentFontSize: number | undefined = undefined;
  if (style) {
    if (style.color) wrapperStyle.color = style.color as string;
    if (style.backgroundColor) wrapperStyle.backgroundColor = style.backgroundColor as string;
    if (style.fontFamily) {
      const resolved = FONT_FAMILIES.find((f) => f.key === style.fontFamily)?.value;
      wrapperStyle.fontFamily = resolved || style.fontFamily;
    }
    if (style.fontSize) contentFontSize = style.fontSize as number;
    if (style.fontWeight) wrapperStyle.fontWeight = style.fontWeight as any;
    if (style.textAlign) wrapperStyle.textAlign = style.textAlign as any;
    if (style.padding) {
      const { top = 0, right = 0, bottom = 0, left = 0 } = style.padding as any;
      wrapperStyle.padding = `${top}px ${right}px ${bottom}px ${left}px`;
    }
  }

  const headerLines: Array<React.ReactNode> = [];
  const otherLines: Array<React.ReactNode> = [];
  if (fullName) {
    const nameStyle: React.CSSProperties = {};
    if (!style?.fontWeight) nameStyle.fontWeight = 600;
    headerLines.push(
      <span key="fullName" style={nameStyle}>
        <strong>{fullName}</strong>
      </span>
    );
  }
  if (title) headerLines.push(<span key="title">{title}</span>);
  if (company) otherLines.push(<span key="company">{company}</span>);
  if (email) otherLines.push(<InlineLink key="email" href={`mailto:${email}`}><strong>{'Email: '}</strong>{email}</InlineLink>);
  if (phone) otherLines.push(<span key="phone"><strong>{'Phone: '}</strong>{phone}</span>);
  if (website) otherLines.push(<InlineLink key="web" href={website}><strong>{website.replace(/^https?:\/\//, '')}</strong></InlineLink>);
  if (address) {
    const lines = address.split(/\r?\n/).filter((l) => l.trim().length > 0);
    otherLines.push(
      <span key="address">
        {lines.map((line, idx) => (
          <React.Fragment key={idx}>
            {line}
            {idx < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </span>
    );
  }

  const socialParts: Array<React.ReactNode> = [];
  const iconStyle: React.CSSProperties = { width: 25, height: 25, display: 'inline-block', verticalAlign: 'middle' };
  const wrapIcon = (href: string | null | undefined, iconSrc: string, alt: string) => {
    if (!href) return null;
    return (
      <a key={alt} href={href} style={{ display: 'inline-block', marginRight: 8 }}>
        <img src={iconSrc} alt={alt} style={iconStyle} />
      </a>
    );
  };
  if (social?.linkedIn) socialParts.push(wrapIcon(social.linkedIn, linkedinIcon, 'LinkedIn'));
  if (social?.facebook) socialParts.push(wrapIcon(social.facebook, facebookIcon, 'Facebook'));
  if (social?.twitter) socialParts.push(wrapIcon(social.twitter, twitterIcon, 'Twitter'));
  if (social?.instagram) socialParts.push(wrapIcon(social.instagram, instagramIcon, 'Instagram'));

  const hasAnyContact = headerLines.length > 0 || otherLines.length > 0;
  const isEmpty = !logoUrl && !hasAnyContact && socialParts.length === 0 && !disclaimerHtml;

  return (
    <div style={wrapperStyle}>
      {headerLines.length > 0 && (
        <div style={{ fontSize: contentFontSize ?? 12, lineHeight: 1.4, marginBottom: logoUrl ? 8 : 0 }}>
          {headerLines.map((c, i) => (
            <div key={`h-${i}`}>{c}</div>
          ))}
        </div>
      )}
      {logoUrl && (
        <div style={{ marginBottom: otherLines.length > 0 ? 8 : 0 }}>
          <img
            src={logoUrl}
            alt={company || 'Logo'}
            style={{
              width: logoWidth || 160,
              maxWidth: '100%',
              height: 'auto',
              display: style?.textAlign && style.textAlign !== 'left' ? 'block' : 'inline-block',
              ...(style?.textAlign === 'center'
                ? { marginLeft: 'auto', marginRight: 'auto' }
                : style?.textAlign === 'right'
                ? { marginLeft: 'auto' }
                : {}),
            }}
          />
        </div>
      )}
      
      {otherLines.length > 0 && (
        <div style={{ fontSize: contentFontSize ?? 12, lineHeight: 1.4 }}>
          {otherLines.map((c, i) => (
            <div key={`o-${i}`}>{c}</div>
          ))}
        </div>
      )}
      {socialParts.length > 0 && (
        <div style={{ marginTop: 10 }}>{socialParts}</div>
      )}
      {disclaimerHtml && (
        <div style={{ fontSize: '10px', opacity: 0.6, marginTop: 8 }} dangerouslySetInnerHTML={{ __html: disclaimerHtml }} />
      )}
      {isEmpty && (
        <div style={{ fontSize: 11, fontStyle: 'italic', opacity: 0.5 }}>Signature (empty)</div>
      )}
    </div>
  );
}