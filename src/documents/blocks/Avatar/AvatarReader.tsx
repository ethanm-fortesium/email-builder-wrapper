import React from 'react';
import { z } from 'zod';

import { Avatar as BaseAvatar, AvatarPropsSchema } from '@usewaypoint/block-avatar';

import { EmailTable } from '../helpers/emailTable.js';

export type AvatarProps = z.infer<typeof AvatarPropsSchema>;

/**
 * Render an avatar wrapped in an EmailTable using the provided style and avatar props.
 *
 * The `style.padding`, if present, is extracted and applied as the EmailTable cell padding; the rest
 * of the style (with `padding` removed) is forwarded to the avatar component.
 *
 * @param style - Optional style object; `style.padding` becomes the table padding and is not passed to the avatar.
 * @param props - Avatar configuration forwarded to the underlying avatar component.
 * @returns A React element containing the avatar inside an EmailTable.
 */
export default function AvatarReader({ style, props }: AvatarProps) {
  const cellPadding = style?.padding ?? undefined;
  const innerStyle = style ? { ...style, padding: undefined } : undefined;

  return (
    <EmailTable padding={cellPadding as any}>
      <BaseAvatar style={innerStyle as any} props={props} />
    </EmailTable>
  );
}