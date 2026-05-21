import React from 'react';

import { ReaderBlock } from '../../../Reader/core.js';
import { EmailTable } from '../helpers/emailTable.js';

import { ColumnsContainerProps } from './ColumnsContainerPropsSchema.js';

type ColumnDefinition = {
  childrenIds: string[];
};

const DEFAULTS = {
  columnsCount: 2 as 2 | 3,
  columnsGap: 0,
  contentAlignment: 'middle' as 'top' | 'middle' | 'bottom',
};

/**
 * Render a table-based multi-column container driven by the provided columns configuration.
 *
 * The component renders an EmailTable containing a single row with `columnsCount` cells.
 * Each cell receives left/right padding computed from `columnsGap`, an optional fixed width
 * from `fixedWidths`, and vertical alignment from `contentAlignment`. Children IDs from
 * each column definition are rendered as `ReaderBlock` elements inside their respective cell.
 *
 * @param style - Optional style object; `padding` and `backgroundColor` (if present) are applied to the EmailTable.
 * @param props - Container configuration:
 *   - `columns`: array of column definitions (each with `childrenIds`)
 *   - `columnsCount`: number of columns to render
 *   - `columnsGap`: gap between columns (used to compute cell paddings)
 *   - `contentAlignment`: vertical alignment for cell content (`'top' | 'middle' | 'bottom'`)
 *   - `fixedWidths`: optional array of per-column fixed widths in pixels
 * @returns The rendered JSX tree for the multi-column container.
 */
export default function ColumnsContainerReader({ style, props }: ColumnsContainerProps) {
  const columnsConfig = props?.columns ?? [];
  const columnsCount = props?.columnsCount ?? DEFAULTS.columnsCount;
  const columnsGap = props?.columnsGap ?? DEFAULTS.columnsGap;
  const contentAlignment = props?.contentAlignment ?? DEFAULTS.contentAlignment;
  const fixedWidths = props?.fixedWidths ?? null;

  const effectiveColumns = columnsConfig.slice(0, columnsCount);

  const padding = style?.padding ?? undefined;
  const backgroundColor = style?.backgroundColor ?? undefined;

  return (
    <EmailTable backgroundColor={backgroundColor} padding={padding as any}>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            {Array.from({ length: columnsCount }).map((_, index) => {
              const column = effectiveColumns[index] as ColumnDefinition | undefined;
              const children = column?.childrenIds ?? [];
              const paddingLeft = getPaddingBefore(index, columnsGap, columnsCount);
              const paddingRight = getPaddingAfter(index, columnsGap, columnsCount);
              const rawWidth = fixedWidths ? fixedWidths[index] ?? undefined : undefined;
              const adjustedWidth = rawWidth ? rawWidth - paddingLeft - paddingRight : undefined;

              return (
                <td
                  key={index}
                  valign={contentAlignment}
                  style={{
                    paddingTop: 0,
                    paddingBottom: 0,
                    paddingLeft,
                    paddingRight,
                    width: adjustedWidth ? `${adjustedWidth}px` : undefined,
                    backgroundColor: backgroundColor ?? undefined,
                  }}
                  width={adjustedWidth ?? undefined}
                  {...(backgroundColor ? { bgColor: backgroundColor } : undefined)}
                >
                  {children.map((childId) => (
                    <ReaderBlock key={childId} id={childId} />
                  ))}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </EmailTable>
  );
}

/**
 * Compute the left padding for a column based on its position, total columns, and the desired gap.
 *
 * @param index - Zero-based index of the column
 * @param columnsGap - Desired total gap between adjacent columns
 * @param columnsCount - Total number of columns in the layout
 * @returns The padding-left value for the specified column: `0` for the first column; when `columnsCount` is `2` returns `columnsGap / 2`; for multi-column layouts returns `columnsGap / 3` for the second column and `(2 * columnsGap) / 3` for subsequent columns
 */
function getPaddingBefore(index: number, columnsGap: number, columnsCount: number) {
  if (index === 0) {
    return 0;
  }
  if (columnsCount === 2) {
    return columnsGap / 2;
  }
  if (index === 1) {
    return columnsGap / 3;
  }
  return (2 * columnsGap) / 3;
}

/**
 * Computes the right padding (padding-right) for a column cell based on its zero-based index, the total gap between columns, and the number of columns.
 *
 * @param index - Zero-based index of the column
 * @param columnsGap - Total gap value used to distribute spacing between columns
 * @param columnsCount - Total number of columns in the layout
 * @returns The computed padding-right value for the column index
 */
function getPaddingAfter(index: number, columnsGap: number, columnsCount: number) {
  if (columnsCount === 2) {
    if (index === 0) {
      return columnsGap / 2;
    }
    return 0;
  }
  if (index === 0) {
    return (2 * columnsGap) / 3;
  }
  if (index === 1) {
    return columnsGap / 3;
  }
  return 0;
}