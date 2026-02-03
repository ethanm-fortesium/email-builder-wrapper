import React from 'react';
import { z } from 'zod';

import { Heading as BaseHeading, HeadingPropsSchema } from '@usewaypoint/block-heading';

import { EmailTable } from '../helpers/emailTable.js';

export type HeadingProps = z.infer<typeof HeadingPropsSchema>;

export default function HeadingReader({ style, props }: HeadingProps) {
  const cellPadding = style?.padding ?? undefined;
  const backgroundColor = style?.backgroundColor ?? undefined;

  const innerStyle = style ? { ...style, padding: undefined } : undefined;

  return (
    <EmailTable backgroundColor={backgroundColor} padding={cellPadding as any}>
      <BaseHeading style={innerStyle as any} props={props} />
    </EmailTable>
  );
}
