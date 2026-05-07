import React from 'react';
import { z } from 'zod';

import { Text as BaseText, TextPropsSchema } from '@usewaypoint/block-text';

import { EmailTable } from '../helpers/emailTable.js';

export type TextProps = z.infer<typeof TextPropsSchema>;

/**
 * Render a text block wrapped in an email-compatible table, applying outer style while removing inner padding.
 *
 * @param style - Optional style applied to the outer table; `padding` (if present) is used for the table cell and removed from the inner text style.
 * @param props - Props forwarded to the underlying text block component.
 * @returns A React element containing the text block inside an EmailTable with the provided outer styling.
 */
export default function TextReader({ style, props }: TextProps) {
  const cellPadding = style?.padding ?? undefined;
  const backgroundColor = style?.backgroundColor ?? undefined;

  const innerStyle = style ? { ...style, padding: undefined, backgroundColor: undefined } : undefined;

  return (
    <EmailTable backgroundColor={backgroundColor} padding={cellPadding as any}>
      <BaseText style={innerStyle as any} props={props} />
    </EmailTable>
  );
}