import React from 'react';

import { useEmailLayoutContext } from '../EmailLayout/EmailLayoutContext.js';
import { insetWidth, useEmailBox } from '../helpers/emailBox.js';
import { EmailTable } from '../helpers/emailTable.js';
import { useTypography } from '../helpers/emailTypography.js';
import { IMAGE_CONTAINER_STYLE, IMAGE_RESET_STYLE, computeImageBox, imageAltStyle, wordImageLimit } from '../helpers/imageBox.js';

import { ImageProps } from './ImagePropsSchema.js';

export type { ImageProps };

/**
 * Render an Image block for email: an <img> inside an email-compatible table cell.
 *
 * The img carries width/height attributes for classic Outlook (which sizes images only from them),
 * clamped to the cell and keeping the image's aspect ratio, and a fluid CSS size for every other
 * client (see computeImageBox). The image sits in a font-size:0 container so no text strut is
 * added around it and Word never clips it to a line; its alt text carries its own typography.
 *
 * @param style - Block style: padding and background colour go on the table cell, textAlign aligns the image.
 * @param props - Image props: url, alt, linkHref, width/height, recorded natural size and vertical alignment.
 * @returns The image block, or nothing when no image URL is set (no broken image in the email).
 */
export default function ImageReader({ style, props }: ImageProps) {
  const emailBox = useEmailBox();
  const { canvasWidth } = useEmailLayoutContext();
  const typography = useTypography();

  const url = props?.url?.trim();
  if (!url) {
    return <></>;
  }

  const align = style?.textAlign ?? 'left';
  const box = computeImageBox({
    width: props?.width,
    height: props?.height,
    naturalWidth: props?.naturalWidth,
    naturalHeight: props?.naturalHeight,
    attrMaxWidth: wordImageLimit(insetWidth(emailBox.width, style?.padding), canvasWidth),
    cssMaxWidth: canvasWidth,
  });

  const image = (
    <img
      src={url}
      alt={props?.alt ?? ''}
      width={box.attrWidth}
      height={box.attrHeight}
      border={0}
      style={{
        display: 'inline-block',
        verticalAlign: props?.contentAlignment ?? 'middle',
        width: box.cssWidth !== undefined ? `${box.cssWidth}px` : undefined,
        maxWidth: '100%',
        height: box.cssHeight === 'auto' ? 'auto' : `${box.cssHeight}px`,
        ...IMAGE_RESET_STYLE,
        ...imageAltStyle(typography),
      }}
    />
  );

  return (
    <EmailTable backgroundColor={style?.backgroundColor} padding={style?.padding} align={align}>
      <div style={{ textAlign: align, ...IMAGE_CONTAINER_STYLE }}>
        {props?.linkHref ? (
          <a href={props.linkHref} target="_blank" style={{ textDecoration: 'none' }}>
            {image}
          </a>
        ) : (
          image
        )}
      </div>
    </EmailTable>
  );
}
