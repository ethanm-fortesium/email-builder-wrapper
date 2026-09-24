import React from 'react';

import { ReaderBlock } from '../../../Reader/core.js';
import { EmailTable, PaddingBox } from '../helpers/emailTable.js';
import { STACK_COLUMN_CLASS } from '../helpers/responsive.js';
import { useEmailLayoutContext } from '../EmailLayout/EmailLayoutContext.js';

import { ColumnsContainerProps } from './ColumnsContainerPropsSchema.js';

type ColumnDefinition = {
  childrenIds: string[];
};

const DEFAULTS = {
  columnsCount: 2 as 2 | 3,
  columnsGap: 0,
  contentAlignment: 'middle' as 'top' | 'middle' | 'bottom',
};

type SharedLayoutProps = {
  columnsCount: number;
  columnsGap: number;
  contentAlignment: 'top' | 'middle' | 'bottom';
  fixedWidths: (number | null | undefined)[] | null;
  effectiveColumns: (ColumnDefinition | undefined)[];
  padding: PaddingBox;
  backgroundColor: string | undefined;
};

/**
 * Escape a value for safe interpolation into an HTML attribute inside the
 * raw (Outlook-only) conditional-comment markup.
 */
function escapeAttr(value: string | number): string {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/**
 * Render a table-based multi-column container.
 *
 * By default (`stackOnMobile` on) the columns use a fluid/hybrid layout that
 * collapses to a single stacked column on narrow viewports without relying on
 * media queries, while Outlook is kept side-by-side via ghost tables. When
 * `stackOnMobile` is explicitly `false` the previous rigid table layout is used,
 * which keeps the columns side-by-side on every client including mobile.
 *
 * @param style - Optional style object; `padding` and `backgroundColor` (if present) are applied to the container.
 * @param props - Container configuration (`columns`, `columnsCount`, `columnsGap`, `contentAlignment`, `fixedWidths`, `stackOnMobile`).
 * @returns The rendered JSX tree for the multi-column container.
 */
export default function ColumnsContainerReader({ style, props }: ColumnsContainerProps) {
  const columnsConfig = props?.columns ?? [];
  const columnsCount = props?.columnsCount ?? DEFAULTS.columnsCount;
  const columnsGap = props?.columnsGap ?? DEFAULTS.columnsGap;
  const contentAlignment = props?.contentAlignment ?? DEFAULTS.contentAlignment;
  const fixedWidths = props?.fixedWidths ?? null;
  // Default to stacking on mobile; only an explicit `false` opts out.
  const stackOnMobile = props?.stackOnMobile !== false;

  const padding = (style?.padding ?? undefined) as PaddingBox;
  const backgroundColor = style?.backgroundColor ?? undefined;

  const effectiveColumns = columnsConfig.slice(0, columnsCount) as (ColumnDefinition | undefined)[];

  const { canvasWidth } = useEmailLayoutContext();

  const shared: SharedLayoutProps = {
    columnsCount,
    columnsGap,
    contentAlignment,
    fixedWidths,
    effectiveColumns,
    padding,
    backgroundColor,
  };

  if (!stackOnMobile) {
    return <RigidColumns {...shared} />;
  }
  return <FluidColumns {...shared} canvasWidth={canvasWidth} />;
}

/**
 * Rigid, always-side-by-side layout: a single table row of cells. This is the
 * historical behaviour, used when `stackOnMobile` is turned off.
 */
function RigidColumns({
  columnsCount,
  columnsGap,
  contentAlignment,
  fixedWidths,
  effectiveColumns,
  padding,
  backgroundColor,
}: SharedLayoutProps) {
  return (
    <EmailTable backgroundColor={backgroundColor} padding={padding}>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            {Array.from({ length: columnsCount }).map((_, index) => {
              const column = effectiveColumns[index];
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
 * Fluid/hybrid layout that stacks on mobile.
 *
 * Each column is an inline-block `<div>` sized `width:100%` capped by a
 * per-column pixel `max-width`. While the combined max-widths fit the available
 * width the columns sit side-by-side; once the viewport is narrower they wrap
 * into a vertical stack — no media query required. Outlook (which ignores
 * inline-block widths) is held side-by-side by the surrounding ghost table
 * emitted inside `[if mso]` conditional comments.
 */
function FluidColumns({
  columnsCount,
  columnsGap,
  contentAlignment,
  fixedWidths,
  effectiveColumns,
  padding,
  backgroundColor,
  canvasWidth,
}: SharedLayoutProps & { canvasWidth: number }) {
  const horizontalPadding = (padding?.left ?? 0) + (padding?.right ?? 0);
  const available = Math.max(1, canvasWidth - horizontalPadding);
  const evenSlot = Math.floor(available / columnsCount);
  const valign = contentAlignment;

  const columns = Array.from({ length: columnsCount }).map((_, index) => {
    const column = effectiveColumns[index];
    const children = column?.childrenIds ?? [];
    const paddingLeft = Math.round(getPaddingBefore(index, columnsGap, columnsCount));
    const paddingRight = Math.round(getPaddingAfter(index, columnsGap, columnsCount));
    const slot = (fixedWidths ? fixedWidths[index] : undefined) ?? evenSlot;
    const contentWidth = Math.max(0, slot - paddingLeft - paddingRight);

    // Outlook ghost cell: fixed-width table cell so the column stays side-by-side.
    const ghostCellOpen =
      `<!--[if mso]><td width="${contentWidth}" valign="${valign}" ` +
      `style="width:${contentWidth}px;padding-left:${paddingLeft}px;padding-right:${paddingRight}px;` +
      `vertical-align:${valign};${backgroundColor ? `background-color:${escapeAttr(backgroundColor)};` : ''}">` +
      `<![endif]-->`;
    const ghostCellClose = `<!--[if mso]></td><![endif]-->`;

    return (
      <React.Fragment key={index}>
        <span dangerouslySetInnerHTML={{ __html: ghostCellOpen }} />
        <div
          className={STACK_COLUMN_CLASS}
          style={{
            display: 'inline-block',
            width: '100%',
            maxWidth: `${slot}px`,
            verticalAlign: valign,
            paddingLeft,
            paddingRight,
            boxSizing: 'border-box',
            // Reset the font-size zeroed on the wrapper (used to kill inline-block gaps).
            fontSize: '16px',
            textAlign: 'left',
            backgroundColor: backgroundColor ?? undefined,
          }}
        >
          {children.map((childId) => (
            <ReaderBlock key={childId} id={childId} />
          ))}
        </div>
        <span dangerouslySetInnerHTML={{ __html: ghostCellClose }} />
      </React.Fragment>
    );
  });

  const ghostTableOpen =
    `<!--[if mso]><table role="presentation" width="${available}" cellpadding="0" cellspacing="0" border="0" ` +
    `style="width:${available}px;border-collapse:collapse;"><tr><![endif]-->`;
  const ghostTableClose = `<!--[if mso]></tr></table><![endif]-->`;

  return (
    <EmailTable backgroundColor={backgroundColor} padding={padding}>
      <div style={{ fontSize: 0, width: '100%' }}>
        <span dangerouslySetInnerHTML={{ __html: ghostTableOpen }} />
        {columns}
        <span dangerouslySetInnerHTML={{ __html: ghostTableClose }} />
      </div>
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
