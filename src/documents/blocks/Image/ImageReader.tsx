import React from 'react';
import { z } from 'zod';

import { Image as BaseImage, ImagePropsSchema } from '@usewaypoint/block-image';

import { EmailTable } from '../helpers/emailTable.js';

export type ImageProps = z.infer<typeof ImagePropsSchema>;

/**
 * Render an image inside an email-compatible table, applying wrapper padding and background to the table while forwarding remaining style to the inner image.
 *
 * @param style - Optional style object; if `padding` is present it is applied to the table cell and removed from the inner image style. `backgroundColor`, if present, is applied to the table background.
 * @param props - Image properties forwarded to the underlying `BaseImage`.
 * @returns A React element containing an `EmailTable` that wraps a `BaseImage` with adjusted styles.
 */
export default function ImageReader({ style, props }: ImageProps) {
  const cellPadding = style?.padding ?? undefined;
  const backgroundColor = style?.backgroundColor ?? undefined;
  const innerStyle = style ? { ...style, padding: undefined } : undefined;

  return (
    <EmailTable backgroundColor={backgroundColor} padding={cellPadding as any}>
      <BaseImage style={innerStyle as any} props={props} />
    </EmailTable>
  );
}