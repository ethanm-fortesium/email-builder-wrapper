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
              const width = fixedWidths ? fixedWidths[index] ?? undefined : undefined;

              return (
                <td
                  key={index}
                  valign={contentAlignment}
                  style={{
                    paddingTop: 0,
                    paddingBottom: 0,
                    paddingLeft,
                    paddingRight,
                    width: width ? `${width}px` : undefined,
                    boxSizing: 'border-box',
                  }}
                  width={width ?? undefined}
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
