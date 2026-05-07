import React from 'react';
import { z } from 'zod';

import { Image as BaseImage, ImagePropsSchema } from '@usewaypoint/block-image';

import { EmailTable } from '../helpers/emailTable.js';

export type ImageProps = z.infer<typeof ImagePropsSchema>;

export default function ImageReader({ style, props }: ImageProps) {
  const cellPadding = style?.padding ?? undefined;
  const backgroundColor = style?.backgroundColor ?? undefined;
  const innerStyle = style ? { ...style, padding: undefined, backgroundColor: undefined } : undefined;

  return (
    <EmailTable backgroundColor={backgroundColor} padding={cellPadding as any}>
      <BaseImage style={innerStyle as any} props={props} />
    </EmailTable>
  );
}
