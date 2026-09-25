import React from 'react';
import { z } from 'zod';

import { AvatarPropsSchema } from '@usewaypoint/block-avatar';

import { useEmailLayoutContext } from '../EmailLayout/EmailLayoutContext.js';
import { insetWidth, useEmailBox } from '../helpers/emailBox.js';
import { EmailTable } from '../helpers/emailTable.js';
import { cssText, useTypography } from '../helpers/emailTypography.js';
import { IMAGE_CONTAINER_STYLE, IMAGE_RESET_STYLE, imageAltStyle, wordImageLimit } from '../helpers/imageBox.js';
import { RawHtml, escapeAttr, msoOnly, notMso } from '../helpers/rawHtml.js';
import { VML_NS, vmlArcsize } from '../helpers/vml.js';

export type AvatarProps = z.infer<typeof AvatarPropsSchema>;

const DEFAULT_SIZE = 64;

/** VML fill behind the image: what Outlook shows in the shape until the image loads. */
const VML_PLACEHOLDER_COLOR = '#E4E7EC';

/**
 * Render an Avatar block for email: a square, rounded or circular image.
 *
 * Classic Outlook ignores border-radius and object-fit, so circle and rounded avatars are drawn
 * there as a VML oval / rounded rectangle filled with the image, while every other client gets
 * the <img> with border-radius and object-fit:cover. The avatar keeps a fixed square box (not
 * height:auto: object-fit needs it to crop non-square images), so its size is clamped to the cell
 * (see wordImageLimit): Word would widen the cell to fit it, and browsers would squash the square
 * into an oval.
 *
 * @param style - Block style: padding goes on the table cell, textAlign aligns the avatar.
 * @param props - Avatar props: imageUrl, alt, size (px) and shape.
 * @returns The avatar block, or nothing when no image URL is set (no broken image in the email).
 */
export default function AvatarReader({ style, props }: AvatarProps) {
  const emailBox = useEmailBox();
  const typography = useTypography();
  const { canvasWidth } = useEmailLayoutContext();

  const imageUrl = props?.imageUrl?.trim();
  if (!imageUrl) {
    return <></>;
  }

  const align = style?.textAlign ?? 'left';
  const alt = props?.alt ?? '';
  const shape = props?.shape ?? 'square';
  const maxSize = wordImageLimit(insetWidth(emailBox.width, style?.padding), canvasWidth);
  const size = Math.max(1, Math.min(Math.round(props?.size ?? DEFAULT_SIZE), maxSize));
  const radius = shape === 'circle' ? size : shape === 'rounded' ? size * 0.125 : 0;

  const imageStyle: React.CSSProperties = {
    display: 'inline-block',
    verticalAlign: 'middle',
    width: `${size}px`,
    height: `${size}px`,
    maxWidth: '100%',
    objectFit: 'cover',
    ...IMAGE_RESET_STYLE,
    borderRadius: radius ? `${radius}px` : undefined,
    ...imageAltStyle(typography),
  };

  let avatar: React.ReactNode;
  if (radius) {
    const tag = shape === 'circle' ? 'v:oval' : 'v:roundrect';
    const arcsize = shape === 'circle' ? '' : ` arcsize="${vmlArcsize(radius, size, size)}"`;
    const vml =
      `<${tag} ${VML_NS} alt="${escapeAttr(alt)}"${arcsize} stroked="f" filled="t" style="width:${size}px;height:${size}px;">` +
      `<v:fill type="frame" src="${escapeAttr(imageUrl)}" color="${VML_PLACEHOLDER_COLOR}" /></${tag}>`;
    const img =
      `<img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(alt)}" width="${size}" height="${size}" border="0" ` +
      `style="${escapeAttr(cssText(imageStyle))}" />`;
    avatar = <RawHtml html={msoOnly(vml) + notMso(img)} />;
  } else {
    avatar = <img src={imageUrl} alt={alt} width={size} height={size} border={0} style={imageStyle} />;
  }

  return (
    <EmailTable padding={style?.padding} align={align}>
      <div style={{ textAlign: align, ...IMAGE_CONTAINER_STYLE }}>{avatar}</div>
    </EmailTable>
  );
}
