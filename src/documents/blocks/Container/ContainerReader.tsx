import React from 'react';

import { ReaderBlock } from '../../../Reader/core.js';
import { EmailTable } from '../helpers/emailTable.js';

import { ContainerProps } from './ContainerPropsSchema.js';

/**
 * Compute a CSS border declaration from the provided container style's borderColor.
 *
 * @param style - Container style object; the function uses `style.borderColor` if present.
 * @returns A CSS border string in the form `"1px solid {color}"` when `borderColor` is set, `undefined` otherwise.
 */
function getBorder(style?: ContainerProps['style']) {
  const color = style?.borderColor ?? undefined;
  if (!color) {
    return undefined;
  }
  return `1px solid ${color}`;
}

/**
 * Renders a container that wraps and lays out child ReaderBlock components using EmailTable,
 * applying styling from the provided ContainerProps.
 *
 * @param style - Optional layout and visual settings (reads backgroundColor, padding, borderRadius, borderColor).
 * @param props - Container props that may include `childrenIds`, an array of child block IDs to render.
 * @returns The element that renders the styled container and its child ReaderBlock components.
 */
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
            <td style={{ padding: 0, backgroundColor: backgroundColor ?? undefined }} {...(backgroundColor ? { bgColor: backgroundColor } : undefined)}>
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