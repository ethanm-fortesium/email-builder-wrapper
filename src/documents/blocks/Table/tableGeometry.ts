import { estimateTokenWidth } from '../helpers/breakLongTokens.js';
import type { Typography } from '../helpers/emailTypography.js';
import { measureText } from '../helpers/textMetrics.js';

// Grid shape and column widths for the Table block (export and canvas).
//
// Browsers and classic Outlook (Word) each size the columns of a table without widths with
// their own auto layout, and the two disagree, so the same table would get different columns
// in Outlook. Every column gets an explicit width instead: the author's % share, or for an
// auto column the share CSS auto layout gives it, computed here from the cells' text measured
// in the Windows font both engines use (textMetrics.ts). Widths are whole px that sum exactly
// to the table width (Word redistributes any difference).

/** Smallest content width of an auto column, in px. */
export const MIN_COLUMN_CONTENT = 24;
/**
 * Room added to measured text widths, in px: whole px columns, Chromium's 1/64px layout
 * units and Word's twips can each put a line that fits exactly a fraction of a px over.
 */
const TEXT_SLACK = 2;

/** Widest content of a column in px: its longest word (min) and its longest line (max). */
export type ColumnContent = { min: number; max: number };

/**
 * The rows as a rectangular grid: every row padded with empty cells to the widest row.
 *
 * @param rows - Cell text by row (may be ragged, null or undefined).
 * @returns A new grid; [] when there are no rows.
 */
export function normaliseRows(rows: readonly (readonly string[])[] | null | undefined): string[][] {
  const list = rows ?? [];
  const count = Math.max(0, ...list.map((row) => row.length));
  return list.map((row) => Array.from({ length: count }, (_, i) => row[i] ?? ''));
}

/** True when the table has no cell with visible text (the export then renders nothing). */
export function isTableEmpty(rows: readonly (readonly string[])[] | null | undefined) {
  return normaliseRows(rows).every((row) => row.every((cell) => !cell.trim()));
}

/**
 * The text a cell shows, near enough to measure: for markdown, link targets and emphasis
 * markers are dropped (underscores inside words, as in merge tokens, are kept).
 */
export function visibleCellText(text: string, markdown: boolean) {
  if (!markdown) {
    return text;
  }
  return text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*`~]|(?<!\w)_+|_+(?!\w)/g, '');
}

/** Width in px of one line of text: measured in Word's font, or conservatively estimated. */
function lineWidth(text: string, typography: Typography, bold: boolean) {
  if (!text) {
    return 0;
  }
  const measured = typography.msoFont ? measureText(text, { font: typography.msoFont, bold, sizePx: typography.fontSize }) : undefined;
  if (measured === undefined) {
    return estimateTokenWidth(text, { fontSize: typography.fontSize, bold, letterSpacing: typography.letterSpacing });
  }
  return measured + typography.letterSpacing * Array.from(text).length;
}

/**
 * Min- and max-content width of a cell's text.
 *
 * @param text - The visible text (see visibleCellText); line breaks start new lines.
 * @param typography - The cell's typography.
 * @param bold - Whether the cell renders bold (header cells).
 */
export function cellContent(text: string, typography: Typography, bold: boolean): ColumnContent {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, ' ').trim());
  const words = text.split(/\s+/).filter(Boolean);
  return {
    min: Math.max(0, ...words.map((word) => lineWidth(word, typography, bold))),
    max: Math.max(0, ...lines.map((line) => lineWidth(line, typography, bold))),
  };
}

/** Spread fractional widths into whole px summing exactly to `total` (largest remainders first). */
function wholePixels(widths: number[], total: number) {
  const floors = widths.map((w) => Math.max(0, Math.floor(w)));
  let rest = total - floors.reduce((a, b) => a + b, 0);
  const order = widths.map((w, i) => ({ fraction: w - Math.floor(w), i })).sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  for (let k = 0; rest > 0 && order.length > 0; k = (k + 1) % order.length, rest--) {
    floors[order[k].i]++;
  }
  return floors;
}

/**
 * Whole-px outer widths of the columns, summing exactly to `available`.
 *
 * - A column with a % share gets that share of the table. When every column has one, they
 *   are scaled to fill the table, as browsers do.
 * - Auto columns share what is left the way CSS auto table layout does: in proportion to
 *   their max-content when everything fits on one line, otherwise from their min-content up
 *   in proportion to how much more they need. A min-content above an even share is capped
 *   at it: such a word gets break opportunities at the final width instead (see TableMarkup).
 * - Shares that would leave an auto column less than MIN_COLUMN_CONTENT are scaled down.
 *
 * @param available - Table width in px.
 * @param shares - Per-column % share of the table, or null/undefined for an auto column.
 * @param contents - Per-column content widths (see cellContent), excluding padding and borders.
 * @param overhead - Per-column px outside the content: horizontal cell padding and border.
 * @returns One outer width per column.
 */
export function tableColumnWidths(
  available: number,
  shares: readonly (number | null | undefined)[],
  contents: readonly ColumnContent[],
  overhead: number
): number[] {
  const n = contents.length;
  if (n === 0) {
    return [];
  }
  const fixed = contents.map((_, i) => {
    const share = shares[i];
    return typeof share === 'number' && share > 0 ? share : null;
  });
  const auto = fixed.flatMap((share, i) => (share === null ? [i] : []));
  const widths = new Array<number>(n).fill(0);

  if (auto.length === 0) {
    const total = fixed.reduce<number>((sum, share) => sum + (share ?? 0), 0);
    fixed.forEach((share, i) => {
      widths[i] = (available * (share ?? 0)) / total;
    });
    return wholePixels(widths, available);
  }

  const floor = MIN_COLUMN_CONTENT + overhead;
  const room = Math.max(0, available - auto.length * floor);
  let fixedPx = fixed.map((share) => (share === null ? 0 : (available * share) / 100));
  const fixedSum = fixedPx.reduce((a, b) => a + b, 0);
  if (fixedSum > room) {
    fixedPx = fixedPx.map((w) => (w * room) / fixedSum);
  }
  fixedPx.forEach((w, i) => {
    widths[i] = w;
  });

  const remaining = available - fixedPx.reduce((a, b) => a + b, 0);
  const cap = Math.max(floor, remaining / auto.length);
  const need = (px: number) => (px > 0 ? Math.ceil(px) + TEXT_SLACK : 0) + overhead;
  const mins = auto.map((i) => Math.max(floor, Math.min(need(contents[i].min), cap)));
  const maxs = auto.map((i, k) => Math.max(mins[k], need(contents[i].max)));
  const sumMin = mins.reduce((a, b) => a + b, 0);
  const sumMax = maxs.reduce((a, b) => a + b, 0);
  auto.forEach((i, k) => {
    if (sumMax <= remaining) {
      widths[i] = (maxs[k] * remaining) / sumMax;
    } else if (sumMin <= remaining) {
      widths[i] = mins[k] + ((maxs[k] - mins[k]) * (remaining - sumMin)) / (sumMax - sumMin);
    } else {
      widths[i] = (mins[k] * remaining) / sumMin;
    }
  });
  return wholePixels(widths, available);
}
