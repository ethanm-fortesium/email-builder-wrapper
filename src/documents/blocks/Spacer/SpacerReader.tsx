import React from 'react';
import { z } from 'zod';

import { Spacer as BaseSpacer, SpacerPropsSchema } from '@usewaypoint/block-spacer';

import { EmailTable } from '../helpers/emailTable.js';

export type SpacerProps = z.infer<typeof SpacerPropsSchema>;

export default function SpacerReader({ style, props }: SpacerProps) {
  const cellPadding = style?.padding ?? undefined;
  const backgroundColor = style?.backgroundColor ?? undefined;

  const innerStyle = style ? { ...style, padding: undefined } : undefined;

  return (
    <EmailTable backgroundColor={backgroundColor} padding={cellPadding as any}>
      <BaseSpacer style={innerStyle as any} props={props} />
    </EmailTable>
  );
}
