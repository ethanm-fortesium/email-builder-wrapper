import { describe, expect, it } from 'vitest';

import { DEFAULT_TYPOGRAPHY } from '../helpers/emailTypography.js';
import { measureText } from '../helpers/textMetrics.js';

import { MIN_COLUMN_CONTENT, cellContent, isTableEmpty, normaliseRows, tableColumnWidths, visibleCellText } from './tableGeometry.js';

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe('normaliseRows / isTableEmpty', () => {
  it('pads ragged rows to the widest row', () => {
    expect(normaliseRows([['a'], ['b', 'c', 'd'], []])).toEqual([
      ['a', '', ''],
      ['b', 'c', 'd'],
      ['', '', ''],
    ]);
  });

  it('treats missing rows as an empty grid', () => {
    expect(normaliseRows(null)).toEqual([]);
    expect(normaliseRows(undefined)).toEqual([]);
  });

  it('is empty when no cell has visible text', () => {
    expect(isTableEmpty(null)).toBe(true);
    expect(isTableEmpty([[' ', ''], ['\n', '']])).toBe(true);
    expect(isTableEmpty([['', ''], ['', '{{Token}}']])).toBe(false);
  });
});

describe('visibleCellText', () => {
  it('leaves plain cells as they are', () => {
    expect(visibleCellText('**not bold** [x](y)', false)).toBe('**not bold** [x](y)');
  });

  it('drops markdown link targets and emphasis markers but keeps underscores inside words', () => {
    expect(visibleCellText('See **the** [CPD guidance](https://example.org/cpd), _now_ `REF_1`', true)).toBe(
      'See the CPD guidance, now REF_1'
    );
    expect(visibleCellText('{{Recipient_Name}}', true)).toBe('{{Recipient_Name}}');
  });
});

describe('cellContent', () => {
  const t = DEFAULT_TYPOGRAPHY;
  const width = (text: string, bold = false) => measureText(text, { font: t.msoFont!, bold, sizePx: t.fontSize })! + t.letterSpacing * text.length;

  it('measures the longest word (min) and the longest line (max) in the layout font', () => {
    const content = cellContent('Annual renewal\nfee', t, false);
    expect(content.min).toBeCloseTo(width('renewal'), 5);
    expect(content.max).toBeCloseTo(width('Annual renewal'), 5);
  });

  it('measures bold text bold', () => {
    expect(cellContent('Amount', t, true).max).toBeCloseTo(width('Amount', true), 5);
    expect(cellContent('Amount', t, true).max).toBeGreaterThan(cellContent('Amount', t, false).max);
  });

  it('is zero for an empty cell', () => {
    expect(cellContent('', t, false)).toEqual({ min: 0, max: 0 });
  });
});

describe('tableColumnWidths', () => {
  it('always returns whole px summing exactly to the table width', () => {
    const cases: [number, (number | null)[], { min: number; max: number }[], number][] = [
      [552, [null, null, null], [{ min: 40, max: 120.4 }, { min: 30, max: 33.3 }, { min: 50, max: 61.7 }], 24],
      [553, [30, null], [{ min: 10, max: 10 }, { min: 10, max: 10 }], 0],
      [268, [null, null], [{ min: 400, max: 900 }, { min: 30, max: 60 }], 25],
      [100, [60, 60, 60], [{ min: 1, max: 1 }, { min: 1, max: 1 }, { min: 1, max: 1 }], 0],
    ];
    for (const [available, shares, contents, overhead] of cases) {
      const widths = tableColumnWidths(available, shares, contents, overhead);
      expect(widths.every(Number.isInteger)).toBe(true);
      expect(sum(widths)).toBe(available);
    }
  });

  it('shares the width in proportion to max-content when every column fits on one line', () => {
    // Needs: 100+2+20 = 122 and 50+2+20 = 72 (max-content, slack, padding).
    const widths = tableColumnWidths(552, [], [{ min: 60, max: 100 }, { min: 40, max: 50 }], 20);
    expect(widths[0] / widths[1]).toBeCloseTo(122 / 72, 1);
  });

  it('gives each column its min-content plus a share of the rest when not everything fits', () => {
    const contents = [
      { min: 60, max: 600 },
      { min: 40, max: 40 },
    ];
    const [wide, narrow] = tableColumnWidths(300, [], contents, 0);
    expect(narrow).toBe(42); // min-content + slack: a column that is all one word keeps exactly that
    expect(wide).toBe(258);
  });

  it('caps a min-content wider than an even share (it gets break opportunities instead)', () => {
    const [url, label] = tableColumnWidths(300, [], [{ min: 900, max: 900 }, { min: 60, max: 80 }], 0);
    expect(label).toBeGreaterThanOrEqual(62);
    expect(url).toBeGreaterThanOrEqual(150);
  });

  it('gives a column with a % share that share, and the rest to the auto columns', () => {
    const widths = tableColumnWidths(500, [30, null], [{ min: 400, max: 400 }, { min: 10, max: 10 }], 0);
    expect(widths).toEqual([150, 350]);
  });

  it('scales shares to fill the table when every column has one', () => {
    expect(tableColumnWidths(400, [10, 30], [{ min: 0, max: 0 }, { min: 0, max: 0 }], 0)).toEqual([100, 300]);
    expect(tableColumnWidths(400, [60, 140], [{ min: 0, max: 0 }, { min: 0, max: 0 }], 0)).toEqual([120, 280]);
  });

  it('scales shares down so every auto column keeps its minimum width', () => {
    const widths = tableColumnWidths(400, [100, null], [{ min: 0, max: 0 }, { min: 0, max: 0 }], 10);
    expect(widths[1]).toBe(MIN_COLUMN_CONTENT + 10);
    expect(widths[0]).toBe(400 - MIN_COLUMN_CONTENT - 10);
  });

  it('gives empty auto columns the minimum width', () => {
    const widths = tableColumnWidths(552, [], [{ min: 0, max: 0 }, { min: 0, max: 0 }], 24);
    expect(widths).toEqual([276, 276]);
  });

  it('returns no widths for no columns', () => {
    expect(tableColumnWidths(552, [], [], 0)).toEqual([]);
  });
});
