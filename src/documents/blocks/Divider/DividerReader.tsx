import React from 'react';
import { z } from 'zod';

import { Divider as BaseDivider, DividerPropsSchema } from '@usewaypoint/block-divider';

import { EmailTable } from '../helpers/emailTable.js';

export type DividerProps = z.infer<typeof DividerPropsSchema>;

/**
 * Render a divider wrapped in an EmailTable for email-compatible layout.
 *
 * The wrapper uses the provided `style` to set the table background and cell padding; the divider receives the same style with padding removed and the provided `props`.
 *
 * @param style - CSS-like style for the wrapper and divider; `padding` (if present) is used for table cell padding and not forwarded to the inner divider.
 * @param props - Divider-specific properties forwarded to the underlying divider component.
 * @returns A React element containing the divider wrapped in an EmailTable for email rendering.
 */
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