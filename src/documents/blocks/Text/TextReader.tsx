import React from 'react';
import { z } from 'zod';

import { Text as BaseText, TextPropsSchema } from '@usewaypoint/block-text';

import { EmailTable } from '../helpers/emailTable.js';

export type TextProps = z.infer<typeof TextPropsSchema>;

export default function TextReader({ style, props }: TextProps) {
  const cellPadding = style?.padding ?? undefined;
  const backgroundColor = style?.backgroundColor ?? undefined;

  const innerStyle = style ? { ...style, padding: undefined } : undefined;

  return (
    <EmailTable backgroundColor={backgroundColor} padding={cellPadding as any}>
      <BaseText style={innerStyle as any} props={props} />
    </EmailTable>
  );
}
