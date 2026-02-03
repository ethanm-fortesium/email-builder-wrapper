import React from 'react';
import { z } from 'zod';

import { Spacer as BaseSpacer, SpacerPropsSchema } from '@usewaypoint/block-spacer';

import { EmailTable } from '../helpers/emailTable.js';

export type SpacerProps = z.infer<typeof SpacerPropsSchema>;

/**
 * Wraps a spacer inside an EmailTable so table-level padding and background are applied while the spacer receives the remaining style.
 *
 * The function extracts `padding` and `backgroundColor` from `style` and applies them to the surrounding `EmailTable`, while passing a copy of `style` with `padding` removed to the `BaseSpacer`. Any additional `props` are forwarded to the `BaseSpacer`.
 *
 * @param style - Optional style object; `padding` and `backgroundColor` (if present) are applied to the wrapper table.
 * @param props - Props forwarded to the underlying spacer component.
 * @returns A React element containing an `EmailTable` wrapping a `BaseSpacer`.
 */
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