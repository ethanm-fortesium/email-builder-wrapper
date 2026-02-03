import React from 'react';
import { z } from 'zod';

import { Html as BaseHtml, HtmlPropsSchema } from '@usewaypoint/block-html';

import { EmailTable } from '../helpers/emailTable.js';

export type HtmlProps = z.infer<typeof HtmlPropsSchema>;

/**
 * Render HTML content inside an email-friendly table, applying padding and backgroundColor from the provided block style.
 *
 * @param style - Optional block style whose `padding` is used for the outer table cell and whose `backgroundColor` is applied to the table. The padding is removed before the style is forwarded to the inner HTML component.
 * @param props - Props to pass through to the underlying HTML renderer.
 * @returns A React element containing an EmailTable that applies the block's padding and background and renders the HTML content.
 */
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