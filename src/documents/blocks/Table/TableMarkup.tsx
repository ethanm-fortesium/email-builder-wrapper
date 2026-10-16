import React from 'react';

import { isBoldWeight, splitLongUrls, withBreakOpportunities } from '../helpers/breakLongTokens.js';
import { columnPercentages } from '../helpers/columnsGeometry.js';
import { effectiveLinkColor, normaliseEmailHtml } from '../helpers/emailHtmlNormaliser.js';
import { Typography, linkStyle, resolveTypography, textStyle } from '../helpers/emailTypography.js';
import { renderInlineMarkdown } from '../helpers/markdown.js';

import { TableBorderStyle, TableProps, TablePropsDefaults } from './TablePropsSchema.js';
import { ColumnContent, cellContent, normaliseRows, tableColumnWidths, visibleCellText } from './tableGeometry.js';

// Table markup shared by the export (TableReader) and the editor canvas (TableEditor).
//
// A real data table, not role="presentation": header cells are <th> with a scope, so screen
// readers announce them. Classic Outlook (Word) resets typography in every table cell and
// ignores unitless line heights, so every cell carries its complete typography inline. Every
// column has an explicit width (see tableGeometry.ts): the `width` attribute is the content
// width in px for Word, the CSS width the column's share of the table in % for browsers, so
// the table still shrinks on phones. Borders are 1px solid cell borders in the collapsed
// border model, which Word draws like browsers.

const BORDER_WIDTH = 1;

type CellBorders = Pick<React.CSSProperties, 'borderTop' | 'borderRight' | 'borderBottom' | 'borderLeft'>;

/**
 * The borders of one cell. Neighbouring cells' borders collapse into a single line.
 *
 * - 'rows': a line between rows;
 * - 'framed': a line between rows and a frame round the table;
 * - 'grid': a line round every cell;
 * - 'none': no lines.
 */
export function cellBorders(
  borderStyle: TableBorderStyle,
  color: string,
  row: number,
  column: number,
  rowCount: number,
  columnCount: number
): CellBorders {
  const line = `${BORDER_WIDTH}px solid ${color}`;
  switch (borderStyle) {
    case 'grid':
      return { borderTop: line, borderRight: line, borderBottom: line, borderLeft: line };
    case 'framed':
      return {
        borderTop: line,
        ...(row === rowCount - 1 ? { borderBottom: line } : {}),
        ...(column === 0 ? { borderLeft: line } : {}),
        ...(column === columnCount - 1 ? { borderRight: line } : {}),
      };
    case 'rows':
      return row > 0 ? { borderTop: line } : {};
    default:
      return {};
  }
}

export type TableMarkupProps = TableProps & {
  /** Typography the table's own font settings apply on top of (the email layout's). */
  baseTypography: Typography;
  /** Nearest opaque colour behind the table (for link colours on dark backgrounds). */
  background: string;
  /** Width in px available to the table. */
  width: number;
};

/**
 * Render the table: an optional header row, then the body rows. Padding and background of the
 * block belong to the caller's cell.
 *
 * @returns The table, or null when it has no cells (callers handle an empty table, see isTableEmpty).
 */
export default function TableMarkup({ style, props, baseTypography, background, width }: TableMarkupProps) {
  const p = props ?? {};
  const rows = normaliseRows(p.rows);
  const columnCount = rows[0]?.length ?? 0;
  if (columnCount === 0) {
    return null;
  }

  const headerRow = p.headerRow ?? TablePropsDefaults.headerRow;
  const headerColumn = p.headerColumn ?? TablePropsDefaults.headerColumn;
  const markdown = p.markdown ?? TablePropsDefaults.markdown;
  const borderStyle = p.borderStyle ?? TablePropsDefaults.borderStyle;
  const borderColor = p.borderColor ?? TablePropsDefaults.borderColor;
  const { vertical: paddingY, horizontal: paddingX } = p.cellPadding ?? TablePropsDefaults.cellPadding;
  const columns = Array.from({ length: columnCount }, (_, c) => p.columns?.[c] ?? null);

  const typography = resolveTypography(baseTypography, { fontFamily: style?.fontFamily, fontSize: style?.fontSize, color: style?.color });
  const headerTypography: Typography = { ...typography, fontWeight: 700, color: p.headerTextColor ?? typography.color };
  const isHeader = (r: number, c: number) => (headerRow && r === 0) || (headerColumn && c === 0);
  const typographyOf = (r: number, c: number) => (isHeader(r, c) ? headerTypography : typography);

  const overhead = 2 * paddingX + (borderStyle === 'grid' || borderStyle === 'framed' ? BORDER_WIDTH : 0);
  const measured = rows.map((row, r) =>
    row.map((text, c) => {
      const t = typographyOf(r, c);
      return cellContent(visibleCellText(text, markdown), t, isBoldWeight(t.fontWeight));
    })
  );
  const contents = Array.from({ length: columnCount }, (_, c) =>
    measured.reduce<ColumnContent>((widest, row) => ({ min: Math.max(widest.min, row[c].min), max: Math.max(widest.max, row[c].max) }), {
      min: 0,
      max: 0,
    })
  );
  const outerWidths = tableColumnWidths(width, columns.map((column) => column?.width), contents, overhead);
  const percentages = columnPercentages(outerWidths.map((outer) => ({ outer })), width);

  const renderCell = (text: string, r: number, c: number) => {
    const header = isHeader(r, c);
    const t = typographyOf(r, c);
    const align = columns[c]?.align ?? 'left';
    const bodyIndex = headerRow ? r - 1 : r;
    const fill = (header ? p.headerBackgroundColor : null) ?? (bodyIndex >= 0 && bodyIndex % 2 === 1 ? p.stripeColor : null) ?? null;
    const contentWidth = Math.max(0, outerWidths[c] - overhead);
    // Break opportunities only where a word measurably does not fit. The conservative estimate
    // breakLongTokens uses on its own would also split words that do (a short header in a tight
    // column), and a phone, narrowing the column, would then break them mid-word.
    const breakWidth = measured[r][c].min <= contentWidth ? Infinity : contentWidth;
    const cellBackground = fill ?? background;

    const cellStyle: React.CSSProperties = {
      ...textStyle(t),
      width: percentages[c],
      padding: `${paddingY}px ${paddingX}px`,
      textAlign: align,
      verticalAlign: 'top',
      // The block cell's `word-break: break-word` would let a phone squeeze a column below its
      // longest word and break words mid-way ("Amo/unt"); the column grows to fit it instead.
      wordBreak: 'normal',
      ...(fill ? { backgroundColor: fill } : {}),
      ...cellBorders(borderStyle, borderColor, r, c, rows.length, columnCount),
    };
    const attributes = {
      align,
      valign: 'top' as const,
      width: Math.max(0, outerWidths[c] - 2 * paddingX),
      style: cellStyle,
      // Lowercase: React passes it through as is (`bgColor` draws a dev warning on the live canvas).
      ...(fill ? { bgcolor: fill } : {}),
    };

    let content: { children: React.ReactNode } | { dangerouslySetInnerHTML: { __html: string } };
    if (!text.trim()) {
      content = { children: ' ' };
    } else if (markdown) {
      content = {
        dangerouslySetInnerHTML: {
          __html: normaliseEmailHtml(renderInlineMarkdown(text), { mode: 'markdown', typography: t, width: breakWidth, background: cellBackground }),
        },
      };
    } else {
      const tokenOptions = { width: breakWidth, fontSize: t.fontSize, bold: isBoldWeight(t.fontWeight), letterSpacing: t.letterSpacing };
      const anchorStyle = linkStyle({ linkColor: effectiveLinkColor({ typography: t, background: cellBackground }) });
      content = {
        children: text.split(/\r?\n/).map((line, i) => (
          <React.Fragment key={i}>
            {i > 0 && <br />}
            {splitLongUrls(line, tokenOptions).map(({ text: segment, href }, j) =>
              href ? (
                <a key={j} href={href} target="_blank" style={anchorStyle}>
                  {withBreakOpportunities(segment, tokenOptions)}
                </a>
              ) : (
                <React.Fragment key={j}>{withBreakOpportunities(segment, tokenOptions)}</React.Fragment>
              )
            )}
          </React.Fragment>
        )),
      };
    }

    if (header) {
      return <th key={c} scope={headerRow && r === 0 ? 'col' : 'row'} {...attributes} {...content} />;
    }
    return <td key={c} {...attributes} {...content} />;
  };

  const bodyRows = rows.slice(headerRow ? 1 : 0);
  const bodyStart = headerRow ? 1 : 0;
  return (
    <table width="100%" cellPadding={0} cellSpacing={0} border={0} style={{ width: '100%', borderCollapse: 'collapse' }}>
      {headerRow && (
        <thead>
          <tr>{rows[0].map((text, c) => renderCell(text, 0, c))}</tr>
        </thead>
      )}
      {bodyRows.length > 0 && (
        <tbody>
          {bodyRows.map((row, i) => (
            <tr key={i}>{row.map((text, c) => renderCell(text, bodyStart + i, c))}</tr>
          ))}
        </tbody>
      )}
    </table>
  );
}
