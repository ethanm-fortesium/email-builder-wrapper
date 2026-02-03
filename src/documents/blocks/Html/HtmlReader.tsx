import React from 'react';
import { z } from 'zod';

import { Html as BaseHtml, HtmlPropsSchema } from '@usewaypoint/block-html';

import { EmailTable } from '../helpers/emailTable.js';

export type HtmlProps = z.infer<typeof HtmlPropsSchema>;

export default function HtmlReader({ style, props }: HtmlProps) {
  const cellPadding = style?.padding ?? undefined;
  const backgroundColor = style?.backgroundColor ?? undefined;
  const innerStyle = style ? { ...style, padding: undefined } : undefined;

  return (
    <EmailTable backgroundColor={backgroundColor} padding={cellPadding as any}>
      <BaseHtml style={innerStyle as any} props={props} />
    </EmailTable>
  );
}
