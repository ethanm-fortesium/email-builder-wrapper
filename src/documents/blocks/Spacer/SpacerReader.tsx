import React from 'react';
import { z } from 'zod';

import { SpacerPropsSchema } from '@usewaypoint/block-spacer';

import { EmailTable } from '../helpers/emailTable.js';

export type SpacerProps = z.infer<typeof SpacerPropsSchema>;

const DEFAULT_HEIGHT = 16;

/**
 * Render a Spacer block as Outlook-safe markup.
 *
 * The default `Spacer` from @usewaypoint/block-spacer emits an empty `<div style="height:16px">`,
 * which classic Outlook collapses to 0px because it strips empty inline
 * elements. We replace it with a non-empty `&nbsp;` element using `font-size:0;line-height:Npx;
 * mso-line-height-rule:exactly;` — the standard "spacer that survives Outlook" idiom.
 */
export default function SpacerReader({ style, props }: SpacerProps & { style?: any }) {
  const cellPadding = style?.padding ?? undefined;
  const backgroundColor = style?.backgroundColor ?? undefined;
  const height = props?.height ?? DEFAULT_HEIGHT;

  const spacerStyle: React.CSSProperties = {
    height: `${height}px`,
    lineHeight: `${height}px`,
    fontSize: 0,
    // mso-* properties aren't typed on React.CSSProperties; cast via any to attach.
    ...({ msoLineHeightRule: 'exactly' } as any),
  };

  return (
    <EmailTable backgroundColor={backgroundColor} padding={cellPadding as any}>
      {/* Non-breaking space ensures the div has rendered content. Outlook strips/collapses
          inline elements that are empty or contain only ordinary whitespace. */}
      <div style={spacerStyle} dangerouslySetInnerHTML={{ __html: '&nbsp;' }} />
    </EmailTable>
  );
}
