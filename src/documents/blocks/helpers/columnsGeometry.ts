// Integer column geometry for the ColumnsContainer export.
//
// Classic Outlook (Word) lays columns out in a ghost table whose cells must add up
// EXACTLY to the table width: Word redistributes any difference proportionally,
// and grows the table (and the whole email) when the cells are wider. Browsers put
// fluid columns side by side only while their max-widths fit, so the same exact
// sum keeps both engines on the same geometry.

/** Smallest content width a column without a fixed width is squeezed to by over-wide fixed columns. */
export const MIN_AUTO_COLUMN_WIDTH = 48;

export type ColumnBox = {
  /** Content width in px (what the column's children get). */
  content: number;
  /** Gutter padding on the column's left, in px. */
  paddingLeft: number;
  /** Gutter padding on the column's right, in px. */
  paddingRight: number;
  /** content + paddingLeft + paddingRight. */
  outer: number;
  /** Whether the width came from fixedWidths (possibly scaled down to fit). */
  fixed: boolean;
};

type FixedWidths = readonly (number | null | undefined)[] | null | undefined;

/**
 * Gutter split used by the editor (upstream block-columns-container): the gap is
 * shared between the two cells either side of it, a third/two thirds for 3 columns.
 */
function gutterShares(index: number, gap: number, count: number): [number, number] {
  if (count === 2) {
    return index === 0 ? [0, gap / 2] : [gap / 2, 0];
  }
  if (index === 0) {
    return [0, (2 * gap) / 3];
  }
  if (index === 1) {
    return [gap / 3, gap / 3];
  }
  return [(2 * gap) / 3, 0];
}

/**
 * Whole-px gutters: each share is rounded, then the left column of every pair is
 * corrected so the two pads either side of a gap sum exactly to the gap.
 */
function integerGutters(count: number, gap: number) {
  const pads = Array.from({ length: count }, (_, i) => gutterShares(i, gap, count).map(Math.round));
  for (let i = 0; i < count - 1; i++) {
    pads[i][1] += gap - (pads[i][1] + pads[i + 1][0]);
  }
  return pads;
}

/** Spread `total` px over `weights` proportionally (floored), the remainder going to the last entry. */
function distribute(total: number, weights: number[]) {
  const sum = weights.reduce((a, b) => a + b, 0);
  const shares = weights.map((w) => (sum > 0 ? Math.floor((total * w) / sum) : 0));
  shares[shares.length - 1] += total - shares.reduce((a, b) => a + b, 0);
  return shares;
}

/**
 * Compute whole-px column boxes whose outer widths always sum exactly to `available`.
 *
 * - `fixedWidths[i]` is column i's CONTENT width, as in the editor (the upstream cell's
 *   content-box CSS width, with the gutter padding added around it). Missing, null or
 *   non-positive entries mean "share the rest".
 * - Columns without a fixed width share the remaining width evenly; the rounding
 *   remainder goes to the last of them.
 * - When every column is fixed, they are scaled proportionally to fill `available`, as
 *   the editor's fixed table layout does (up when they are narrower, down when wider).
 * - Fixed widths that leave less than MIN_AUTO_COLUMN_WIDTH per other column are scaled
 *   down proportionally.
 * - A gap too wide for the row is narrowed so no column goes negative.
 *
 * @param count - Number of columns (2 or 3).
 * @param gap - Horizontal gap between adjacent columns in px (rounded to whole px).
 * @param fixedWidths - Optional per-column fixed content widths in px.
 * @param available - Width of the row in px (the content box the columns fill).
 * @returns One box per column; every gap is exactly the (possibly narrowed) gap.
 */
export function computeColumns(count: number, gap: number, fixedWidths: FixedWidths, available: number): ColumnBox[] {
  const width = Math.max(0, Math.floor(available));
  const effectiveGap = Math.min(Math.max(0, Math.round(gap)), count > 1 ? Math.floor(width / (count - 1)) : 0);
  const pads = integerGutters(count, effectiveGap);
  const space = width - effectiveGap * (count - 1);

  const fixed = Array.from({ length: count }, (_, i) => {
    const value = fixedWidths?.[i];
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  });
  const autoIndexes = fixed.flatMap((value, i) => (value === null ? [i] : []));
  const fixedIndexes = fixed.flatMap((value, i) => (value === null ? [] : [i]));
  const fixedTotal = fixedIndexes.reduce((sum, i) => sum + (fixed[i] as number), 0);

  const content: number[] = fixed.map((value) => value ?? 0);
  if (autoIndexes.length === 0) {
    // Like the editor's fixed table layout: every fixed column grows or shrinks in proportion.
    distribute(space, fixedIndexes.map((i) => fixed[i] as number)).forEach((w, k) => (content[fixedIndexes[k]] = w));
  } else {
    const fixedRoom = Math.max(0, space - MIN_AUTO_COLUMN_WIDTH * autoIndexes.length);
    if (fixedTotal > fixedRoom) {
      const scaled = distribute(fixedRoom, fixedIndexes.map((i) => fixed[i] as number));
      fixedIndexes.forEach((i, k) => (content[i] = scaled[k]));
    }
    const usedByFixed = fixedIndexes.reduce((sum, i) => sum + content[i], 0);
    distribute(space - usedByFixed, autoIndexes.map(() => 1)).forEach((w, k) => (content[autoIndexes[k]] = w));
  }

  return content.map((c, i) => ({
    content: c,
    paddingLeft: pads[i][0],
    paddingRight: pads[i][1],
    outer: c + pads[i][0] + pads[i][1],
    fixed: fixed[i] !== null,
  }));
}

/**
 * Each column's outer width as a CSS percentage of the row (4 decimals). The
 * rounding remainder goes to the last column so the shares sum to exactly 100%.
 *
 * @param columns - Column boxes from computeColumns.
 * @param available - The row width the boxes were computed for.
 * @returns One percentage string per column, e.g. "33.3333%".
 */
export function columnPercentages(columns: ColumnBox[], available: number) {
  const whole = 1_000_000; // 100% in units of 0.0001%
  const units = columns.map((c) => (available > 0 ? Math.round((c.outer / available) * whole) : 0));
  units[units.length - 1] += whole - units.reduce((a, b) => a + b, 0);
  return units.map((u) => `${(u / 10_000).toFixed(4)}%`);
}
