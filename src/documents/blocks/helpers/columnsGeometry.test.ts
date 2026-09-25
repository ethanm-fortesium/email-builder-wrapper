import { describe, expect, it } from 'vitest';

import { MIN_AUTO_COLUMN_WIDTH, columnPercentages, computeColumns } from './columnsGeometry.js';

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const outers = (count: number, gap: number, fixed: (number | null)[] | null, available: number) =>
  computeColumns(count, gap, fixed, available).map((c) => c.outer);

/** Every visible gap (right pad of a column + left pad of the next). */
function gaps(count: number, gap: number, fixed: (number | null)[] | null, available: number) {
  const cols = computeColumns(count, gap, fixed, available);
  return cols.slice(1).map((c, i) => cols[i].paddingRight + c.paddingLeft);
}

describe('computeColumns', () => {
  it('splits evenly without gaps', () => {
    expect(computeColumns(2, 0, null, 552)).toEqual([
      { content: 276, paddingLeft: 0, paddingRight: 0, outer: 276, fixed: false },
      { content: 276, paddingLeft: 0, paddingRight: 0, outer: 276, fixed: false },
    ]);
  });

  it('gives the rounding remainder to the last auto column', () => {
    expect(computeColumns(3, 0, null, 553).map((c) => c.content)).toEqual([184, 184, 185]);
  });

  it('keeps the gutters at the edges at zero and splits a 2-column gap in half', () => {
    expect(computeColumns(2, 16, null, 552)).toEqual([
      { content: 268, paddingLeft: 0, paddingRight: 8, outer: 276, fixed: false },
      { content: 268, paddingLeft: 8, paddingRight: 0, outer: 276, fixed: false },
    ]);
  });

  it('rounds fractional 3-column gutters so every gap is exactly the gap', () => {
    const cols = computeColumns(3, 16, null, 552);
    expect(cols.map((c) => [c.paddingLeft, c.paddingRight])).toEqual([
      [0, 11],
      [5, 5],
      [11, 0],
    ]);
    expect(gaps(3, 16, null, 552)).toEqual([16, 16]);
    expect(sum(cols.map((c) => c.outer))).toBe(552);
    for (const gap of [1, 2, 4, 5, 7, 10, 12, 13, 25, 80]) {
      expect(gaps(3, gap, null, 552)).toEqual([gap, gap]);
      expect(sum(outers(3, gap, null, 552))).toBe(552);
    }
  });

  it('rounds an odd 2-column gap without growing it', () => {
    expect(gaps(2, 5, null, 552)).toEqual([5]);
    expect(sum(outers(2, 5, null, 552))).toBe(552);
  });

  it('rounds a fractional gap to whole pixels', () => {
    expect(gaps(2, 9.6, null, 500)).toEqual([10]);
  });

  it('treats fixed widths as content widths and gives the rest to the auto column', () => {
    expect(computeColumns(2, 0, [180, null], 552)).toEqual([
      { content: 180, paddingLeft: 0, paddingRight: 0, outer: 180, fixed: true },
      { content: 372, paddingLeft: 0, paddingRight: 0, outer: 372, fixed: false },
    ]);
    const withGap = computeColumns(3, 12, [120, null, null], 552);
    expect(withGap[0].content).toBe(120);
    expect(withGap[1].content + withGap[2].content).toBe(552 - 24 - 120);
    expect(sum(withGap.map((c) => c.outer))).toBe(552);
  });

  it('scales narrow fixed columns up proportionally when every column is fixed, like the editor', () => {
    expect(computeColumns(2, 0, [100, 200], 552).map((c) => c.content)).toEqual([184, 368]);
    expect(computeColumns(3, 12, [100, 100, 100], 552).map((c) => c.content)).toEqual([176, 176, 176]);
    expect(computeColumns(2, 16, [200, 200], 552).map((c) => c.content)).toEqual([268, 268]);
  });

  it('scales over-wide fixed columns down to keep a minimum auto width', () => {
    const cols = computeColumns(2, 16, [500, null], 432);
    expect(cols[1].content).toBe(MIN_AUTO_COLUMN_WIDTH);
    expect(cols[0].content).toBe(432 - 16 - MIN_AUTO_COLUMN_WIDTH);
    expect(sum(cols.map((c) => c.outer))).toBe(432);

    const three = computeColumns(3, 12, [300, 300, null], 432);
    expect(three[0].content).toBe(three[1].content);
    expect(three[2].content).toBeGreaterThanOrEqual(MIN_AUTO_COLUMN_WIDTH);
    expect(sum(three.map((c) => c.outer))).toBe(432);
  });

  it('scales over-wide fixed columns proportionally when every column is fixed', () => {
    const cols = computeColumns(2, 0, [400, 200], 432);
    expect(cols.map((c) => c.content)).toEqual([288, 144]);
  });

  it('narrows a gap wider than the row instead of producing negative widths', () => {
    const cols = computeColumns(3, 80, null, 100);
    cols.forEach((c) => expect(c.content).toBeGreaterThanOrEqual(0));
    expect(sum(cols.map((c) => c.outer))).toBe(100);
  });

  it('ignores missing, null and non-positive fixed widths', () => {
    expect(outers(2, 0, [null, 0], 552)).toEqual([276, 276]);
    expect(outers(3, 0, [], 552)).toEqual([184, 184, 184]);
    expect(outers(2, 0, [Number.NaN, -5], 552)).toEqual([276, 276]);
  });

  it('always sums to the available width with non-negative whole-px parts', () => {
    const fixedCases: ((number | null)[] | null)[] = [null, [180, null, null], [null, 90, null], [200, 200, 200], [700, null, null], [1, 1, 1]];
    for (const count of [2, 3]) {
      for (const gap of [0, 1, 3, 8, 16, 24, 48, 80]) {
        for (const fixed of fixedCases) {
          for (const available of [0, 50, 137, 264, 432, 552, 598, 852]) {
            const cols = computeColumns(count, gap, fixed, available);
            expect(sum(cols.map((c) => c.outer))).toBe(available);
            for (const c of cols) {
              expect(Number.isInteger(c.content) && c.content >= 0).toBe(true);
              expect(c.paddingLeft).toBeGreaterThanOrEqual(0);
              expect(c.paddingRight).toBeGreaterThanOrEqual(0);
              expect(c.outer).toBe(c.content + c.paddingLeft + c.paddingRight);
            }
          }
        }
      }
    }
  });
});

describe('columnPercentages', () => {
  const total = (values: string[]) => values.reduce((a, v) => a + Math.round(parseFloat(v) * 10_000), 0);

  it('expresses outer widths as shares of the row', () => {
    expect(columnPercentages(computeColumns(2, 16, null, 552), 552)).toEqual(['50.0000%', '50.0000%']);
    expect(columnPercentages(computeColumns(2, 0, [180, null], 552), 552)).toEqual(['32.6087%', '67.3913%']);
  });

  it('always sums to exactly 100%, the remainder going to the last column', () => {
    expect(columnPercentages(computeColumns(3, 0, null, 552), 552)).toEqual(['33.3333%', '33.3333%', '33.3334%']);
    for (const available of [100, 137, 431, 552, 598, 852]) {
      for (const gap of [0, 7, 16]) {
        expect(total(columnPercentages(computeColumns(3, gap, [null, 90, null], available), available))).toBe(1_000_000);
      }
    }
  });

  it('gives the whole row to the last column when the row has no width', () => {
    expect(columnPercentages(computeColumns(2, 0, null, 0), 0)).toEqual(['0.0000%', '100.0000%']);
  });
});
