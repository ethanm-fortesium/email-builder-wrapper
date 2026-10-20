import React from 'react';

import { EmailLayoutProps } from '../EmailLayout/EmailLayoutPropsSchema.js';
import { getLayoutTypography } from '../EmailLayout/emailLayoutShared.js';
import { emailBoxWidth, enclosingBackground } from '../helpers/editorEmailBox.js';
import { insetWidth } from '../helpers/emailBox.js';
import { formatPadding } from '../helpers/emailTable.js';
import { useCurrentBlockId } from '../../editor/EditorBlock.js';
import { useDocument } from '../../editor/EditorContext.js';

import TableMarkup from './TableMarkup.js';
import { TableProps } from './TablePropsSchema.js';
import { isTableEmpty } from './tableGeometry.js';

/**
 * Renders the Table block on the editor canvas: the same markup the email export uses (TableMarkup)
 * inside a padded, optionally tinted cell, typeset from the document's layout and laid out for the
 * width the block gets in the export, so the canvas shows the exported columns (also in the mobile view).
 *
 * If no cell has any text, renders a small "Table (empty)" placeholder instead (the export renders nothing).
 *
 * @param style - Padding and background colour of the cell; font family, size and colour of the cells.
 * @param props - Cell text, header row/column, column settings, borders and colours.
 * @returns A React element representing the table block.
 */
export default function TableEditor({ style, props }: TableProps) {
  const document = useDocument();
  const blockId = useCurrentBlockId();
  const layout = (document.root?.data ?? {}) as EmailLayoutProps;
  const padding = style?.padding ?? undefined;
  const backgroundColor = style?.backgroundColor ?? undefined;

  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        <tr>
          {/* overflow-wrap as in the export's block cell: the canvas's `anywhere` would let columns shrink below their longest word. */}
          <td style={{ padding: formatPadding(padding), backgroundColor, overflowWrap: 'break-word' }}>
            {isTableEmpty(props?.rows) ? (
              <div style={{ fontSize: 11, fontStyle: 'italic', color: style?.color ?? undefined, opacity: 0.5 }}>Table (empty)</div>
            ) : (
              <TableMarkup
                style={style}
                props={props}
                baseTypography={getLayoutTypography(layout)}
                background={backgroundColor ?? enclosingBackground(document, blockId) ?? layout.canvasColor ?? '#FFFFFF'}
                width={insetWidth(emailBoxWidth(document, blockId), padding)}
              />
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
