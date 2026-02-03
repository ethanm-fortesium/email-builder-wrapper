import React from 'react';
import { z } from 'zod';

import { Heading as BaseHeading, HeadingPropsSchema } from '@usewaypoint/block-heading';

import { EmailTable } from '../helpers/emailTable.js';

export type HeadingProps = z.infer<typeof HeadingPropsSchema>;

/**
 * Renders a heading wrapped in an email-friendly table, moving any padding and background color from the heading style to the table.
 *
 * @param style - Optional visual style for the heading; `backgroundColor` and `padding` (if present) are applied to the surrounding table and the heading's padding is removed.
 * @param props - Props forwarded to the underlying BaseHeading component.
 * @returns The JSX element that renders the heading inside an EmailTable with background color and padding applied to the table and padding removed from the inner heading.
 */
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