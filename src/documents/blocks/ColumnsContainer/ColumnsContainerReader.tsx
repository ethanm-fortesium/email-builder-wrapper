import React from 'react';

import { ReaderBlock } from '../../../Reader/core.js';
import { ColumnBox, columnPercentages, computeColumns } from '../helpers/columnsGeometry.js';
import { EmailBoxProvider, insetWidth, useEmailBox } from '../helpers/emailBox.js';
import { EmailTable, PaddingBox } from '../helpers/emailTable.js';
import { useTypography } from '../helpers/emailTypography.js';
import { RawHtml, escapeAttr, msoOnly } from '../helpers/rawHtml.js';
import { COLUMN_PAD_CLASS, STACK_COLUMN_CLASS, stackGapClass, stackRules } from '../helpers/responsive.js';
import { useStyleRegistry } from '../helpers/styleRegistry.js';

import { ColumnsContainerProps } from './ColumnsContainerPropsSchema.js';

type Alignment = 'top' | 'middle' | 'bottom';

const DEFAULTS = {
  columnsCount: 2 as 2 | 3,
  columnsGap: 0,
  contentAlignment: 'middle' as Alignment,
};

type LayoutProps = {
  /** Integer geometry of every column; outer widths sum exactly to `available`. */
  columns: ColumnBox[];
  /** Width of the row (the container's content box) in px. */
  available: number;
  columnsGap: number;
  contentAlignment: Alignment;
  childrenIds: string[][];
  padding: PaddingBox;
  backgroundColor: string | undefined;
};

/**
 * Render a table-based multi-column container.
 *
 * Column widths are whole pixels computed from the width actually available to the
 * block (its email box minus its own padding, so nested and bordered containers are
 * respected), with `fixedWidths` treated as content widths like the editor does.
 * Each column's children get the column's content width as their email box.
 *
 * By default (`stackOnMobile` on) the columns use a fluid/hybrid layout that
 * collapses to a single stacked column on narrow viewports, while Outlook is kept
 * side-by-side via a ghost table. When `stackOnMobile` is explicitly `false` a
 * rigid table row keeps the columns side-by-side on every client including mobile.
 *
 * @param style - Optional style object; `padding` and `backgroundColor` (if present) are applied to the container.
 * @param props - Container configuration (`columns`, `columnsCount`, `columnsGap`, `contentAlignment`, `fixedWidths`, `stackOnMobile`).
 * @returns The rendered JSX tree for the multi-column container.
 */
export default function ColumnsContainerReader({ style, props }: ColumnsContainerProps) {
  const columnsCount = props?.columnsCount ?? DEFAULTS.columnsCount;
  const columnsGap = props?.columnsGap ?? DEFAULTS.columnsGap;
  // Default to stacking on mobile; only an explicit `false` opts out.
  const stackOnMobile = props?.stackOnMobile !== false;
  const padding = (style?.padding ?? undefined) as PaddingBox;

  const available = insetWidth(useEmailBox().width, padding);
  const columns = computeColumns(columnsCount, columnsGap, props?.fixedWidths, available);

  const layout: LayoutProps = {
    columns,
    available,
    columnsGap,
    contentAlignment: props?.contentAlignment ?? DEFAULTS.contentAlignment,
    childrenIds: columns.map((_, index) => props?.columns?.[index]?.childrenIds ?? []),
    padding,
    backgroundColor: style?.backgroundColor ?? undefined,
  };

  return stackOnMobile ? <FluidColumns {...layout} /> : <RigidColumns {...layout} />;
}

/** A column's blocks, sized to the column's content width. */
function ColumnChildren({ childrenIds, width }: { childrenIds: string[]; width: number }) {
  return (
    <EmailBoxProvider width={width}>
      {childrenIds.map((childId) => (
        <ReaderBlock key={childId} id={childId} />
      ))}
    </EmailBoxProvider>
  );
}

/**
 * Rigid, always-side-by-side layout: a single table row of cells.
 *
 * Every cell has a width in every engine: the `width` attribute is the content width
 * in px, and the CSS width is the column's share of the row in % (fixed columns keep
 * their px content width). Auto table layout (no `table-layout:fixed`) lets a column
 * grow to fit min-width content such as a button on a narrow phone instead of
 * overflowing the screen.
 */
function RigidColumns({ columns, available, contentAlignment, childrenIds, padding, backgroundColor }: LayoutProps) {
  const percentages = columnPercentages(columns, available);
  return (
    <EmailTable backgroundColor={backgroundColor} padding={padding}>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            {columns.map((column, index) => (
              <td
                key={index}
                width={column.content}
                valign={contentAlignment}
                style={{
                  width: column.fixed ? `${column.content}px` : percentages[index],
                  padding: `0 ${column.paddingRight}px 0 ${column.paddingLeft}px`,
                  verticalAlign: contentAlignment,
                  backgroundColor,
                }}
                {...(backgroundColor ? { bgColor: backgroundColor } : undefined)}
              >
                <ColumnChildren childrenIds={childrenIds[index]} width={column.content} />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </EmailTable>
  );
}

/**
 * Fluid/hybrid layout that stacks on mobile.
 *
 * Each column is an inline-block `<div>` sized `width:100%` capped by its outer
 * width as `max-width`. While the combined max-widths fit the row the columns sit
 * side-by-side; once the viewport is narrower they wrap into a vertical stack, and
 * the registered media-query rules make the stack full width with vertical gaps.
 * Nothing depends on box-sizing (Yahoo/AOL strip it): the gutter padding sits on
 * an inner table cell, never on the width-capped div. The wrapper zeroes font-size
 * and line-height so no whitespace gap appears between the inline-blocks; each
 * column restores the inherited typography.
 *
 * Outlook (which ignores inline-block widths) is held side-by-side by a ghost table
 * emitted inside `[if mso]` conditional comments, whose cells add up exactly to the
 * row width (Word redistributes any difference).
 */
function FluidColumns({ columns, available, columnsGap, contentAlignment, childrenIds, padding, backgroundColor }: LayoutProps) {
  const registry = useStyleRegistry();
  stackRules(columnsGap).forEach((rule) => registry?.add('responsive', rule));
  const typography = useTypography();

  const ghostBackground = backgroundColor ? ` bgcolor="${escapeAttr(backgroundColor)}"` : '';
  const ghostBackgroundStyle = backgroundColor ? `background-color:${escapeAttr(backgroundColor)};` : '';
  const ghostTableOpen = msoOnly(
    `<table role="presentation" width="${available}" cellpadding="0" cellspacing="0" border="0" ` +
      `style="width:${available}px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;"><tr>`
  );
  const ghostCellOpen = (column: ColumnBox) =>
    msoOnly(
      `<td width="${column.outer}" valign="${contentAlignment}"${ghostBackground} ` +
        `style="width:${column.outer}px;padding:0;vertical-align:${contentAlignment};${ghostBackgroundStyle}">`
    );

  return (
    <EmailTable backgroundColor={backgroundColor} padding={padding}>
      <div style={{ fontSize: 0, lineHeight: 0, width: '100%' }}>
        <RawHtml html={ghostTableOpen} />
        {columns.map((column, index) => (
          <React.Fragment key={index}>
            <RawHtml html={ghostCellOpen(column)} />
            <div
              className={index > 0 && Math.round(columnsGap) > 0 ? `${STACK_COLUMN_CLASS} ${stackGapClass(columnsGap)}` : STACK_COLUMN_CLASS}
              style={{
                display: 'inline-block',
                width: '100%',
                maxWidth: `${column.outer}px`,
                verticalAlign: contentAlignment,
                textAlign: 'left',
                fontSize: `${typography.fontSize}px`,
                lineHeight: typography.lineHeight,
              }}
            >
              <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td className={COLUMN_PAD_CLASS} style={{ padding: `0 ${column.paddingRight}px 0 ${column.paddingLeft}px` }}>
                      <ColumnChildren childrenIds={childrenIds[index]} width={column.content} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <RawHtml html={msoOnly('</td>')} />
          </React.Fragment>
        ))}
        <RawHtml html={msoOnly('</tr></table>')} />
      </div>
    </EmailTable>
  );
}
