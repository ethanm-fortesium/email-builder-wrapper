import React from 'react';

import { ReaderBlock } from '../../../Reader/core.js';
import { EmailTable } from '../helpers/emailTable.js';

import { ContainerProps } from './ContainerPropsSchema.js';

function getBorder(style?: ContainerProps['style']) {
  const color = style?.borderColor ?? undefined;
  if (!color) {
    return undefined;
  }
  return `1px solid ${color}`;
}

export default function ContainerReader({ style, props }: ContainerProps) {
  const childrenIds = props?.childrenIds ?? [];
  const backgroundColor = style?.backgroundColor ?? undefined;
  const padding = style?.padding ?? undefined;
  const borderRadius = style?.borderRadius ?? undefined;
  const border = getBorder(style);

  return (
    <EmailTable
      backgroundColor={backgroundColor}
      padding={padding as any}
      extraCellStyle={{ borderRadius: borderRadius ?? undefined, border: border ?? undefined }}
    >
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ padding: 0 }}>
              {childrenIds.map((childId) => (
                <ReaderBlock key={childId} id={childId} />
              ))}
            </td>
          </tr>
        </tbody>
      </table>
    </EmailTable>
  );
}
