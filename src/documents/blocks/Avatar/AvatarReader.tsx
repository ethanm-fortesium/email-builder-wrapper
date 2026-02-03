import React from 'react';
import { z } from 'zod';

import { Avatar as BaseAvatar, AvatarPropsSchema } from '@usewaypoint/block-avatar';

import { EmailTable } from '../helpers/emailTable.js';

export type AvatarProps = z.infer<typeof AvatarPropsSchema>;

export default function AvatarReader({ style, props }: AvatarProps) {
  const cellPadding = style?.padding ?? undefined;
  const innerStyle = style ? { ...style, padding: undefined } : undefined;

  return (
    <EmailTable padding={cellPadding as any}>
      <BaseAvatar style={innerStyle as any} props={props} />
    </EmailTable>
  );
}
