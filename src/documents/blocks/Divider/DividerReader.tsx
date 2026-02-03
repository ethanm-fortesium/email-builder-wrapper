import React from 'react';
import { z } from 'zod';

import { Divider as BaseDivider, DividerPropsSchema } from '@usewaypoint/block-divider';

import { EmailTable } from '../helpers/emailTable.js';

export type DividerProps = z.infer<typeof DividerPropsSchema>;

export default function DividerReader({ style, props }: DividerProps) {
  const cellPadding = style?.padding ?? undefined;
  const backgroundColor = style?.backgroundColor ?? undefined;

  const innerStyle = style ? { ...style, padding: undefined } : undefined;

  return (
    <EmailTable backgroundColor={backgroundColor} padding={cellPadding as any}>
      <BaseDivider style={innerStyle as any} props={props} />
    </EmailTable>
  );
}
