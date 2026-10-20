import { describe, it, expect } from 'vitest';

import { FONT_METRICS } from './fontMetrics.generated.js';
import { countLines, measureText } from './textMetrics.js';

const ARIAL_16 = { font: 'Arial', bold: false, sizePx: 16 };

// Chromium (Edge 153, Windows 11) canvas measureText with ctx.fontKerning = 'none'.
const CHROMIUM_WIDTHS: Array<[font: string, text: string, sizePx: number, bold: boolean, width: number]> = [
  ['Arial', 'Read the full update', 16, false, 143.22],
  ['Arial', 'X-small rounded', 20, true, 156.69],
  ['Arial', 'Café – €9.99', 16, false, 91.63],
  ['Arial', 'AVAWAY Te', 20, true, 117.78],
  ['Candara', 'Read the full update', 16, false, 136.97],
  ['Candara', 'X-small rounded', 20, true, 139.23],
  ['Calibri', 'Read the full update', 16, false, 132.13],
  ['Calibri', 'X-small rounded', 20, true, 136.46],
  ['Corbel', 'Café – €9.99', 16, false, 82.13],
  ['Corbel', 'AVAWAY Te', 20, true, 108.86],
  ['Bahnschrift', 'Read the full update', 16, false, 143.55],
  ['Bahnschrift', 'X-small rounded', 20, true, 150.05],
  ['Sitka Text', 'Read the full update', 16, false, 151.28],
  ['Sitka Text', 'X-small rounded', 20, true, 164.03],
  ['Palatino Linotype', 'Café – €9.99', 16, false, 84.34],
  ['Palatino Linotype', 'AVAWAY Te', 20, true, 123.91],
  ['Courier New', 'Read the full update', 16, false, 192.03],
  ['Courier New', 'X-small rounded', 20, true, 180.03],
];

describe('measureText', () => {
  it.each(CHROMIUM_WIDTHS)('%s "%s" at %dpx (bold %s) matches Chromium', (font, text, sizePx, bold, width) => {
    const measured = measureText(text, { font, bold, sizePx });
    expect(measured).toBeDefined();
    expect(Math.abs(measured! - width)).toBeLessThanOrEqual(0.5);
  });

  it('covers every family in regular and bold', () => {
    for (const font of Object.keys(FONT_METRICS)) {
      expect(measureText('Hello', { font, bold: false, sizePx: 16 })).toBeGreaterThan(0);
      expect(measureText('Hello', { font, bold: true, sizePx: 16 })).toBeGreaterThan(0);
    }
  });

  it('is the sum of unkerned advances, linear in size', () => {
    const av = measureText('AV', ARIAL_16)!;
    expect(av).toBeCloseTo(measureText('A', ARIAL_16)! + measureText('V', ARIAL_16)!, 10);
    expect(measureText('AV', { ...ARIAL_16, sizePx: 32 })).toBeCloseTo(2 * av, 10);
    // Arial 'a' is 1139 units of a 2048 em.
    expect(measureText('a', ARIAL_16)).toBeCloseTo((1139 * 16) / 2048, 10);
  });

  it('uses the bold face for bold', () => {
    expect(measureText('n', { ...ARIAL_16, bold: true })).toBeCloseTo((1251 * 16) / 2048, 10);
  });

  it('returns 0 for empty text', () => {
    expect(measureText('', ARIAL_16)).toBe(0);
  });

  it('measures U+00A0 as its own glyph and U+200B / U+00AD as zero width', () => {
    expect(measureText(' ', ARIAL_16)).toBeCloseTo((569 * 16) / 2048, 10);
    expect(measureText('a​b', ARIAL_16)).toBe(measureText('ab', ARIAL_16));
    expect(measureText('a­b', ARIAL_16)).toBe(measureText('ab', ARIAL_16));
  });

  it('returns undefined when any character has no glyph in the table', () => {
    expect(measureText('Go 漢字', ARIAL_16)).toBeUndefined();
    expect(measureText('Go 🚀', ARIAL_16)).toBeUndefined();
    expect(measureText('Line\nbreak', ARIAL_16)).toBeUndefined();
    // Bahnschrift has no Ĉ (U+0108); Sitka has no macron (U+00AF).
    expect(measureText('Ĉu', { font: 'Bahnschrift', bold: false, sizePx: 16 })).toBeUndefined();
    expect(measureText('Cu', { font: 'Bahnschrift', bold: false, sizePx: 16 })).toBeDefined();
    expect(measureText('¯', { font: 'Sitka Text', bold: true, sizePx: 16 })).toBeUndefined();
  });

  it('knows the preset Windows fonts', () => {
    for (const font of ['Arial', 'Candara', 'Calibri', 'Corbel', 'Bahnschrift', 'Sitka Text', 'Palatino Linotype', 'Courier New']) {
      expect(measureText('Hello', { font, bold: false, sizePx: 16 })).toBeDefined();
    }
  });

  it('looks the font up ignoring case and surrounding quotes', () => {
    expect(measureText('Hello', { font: '"Palatino Linotype"', bold: false, sizePx: 16 })).toBe(
      measureText('Hello', { font: 'Palatino Linotype', bold: false, sizePx: 16 })
    );
    expect(measureText('Hello', { font: 'courier new', bold: false, sizePx: 16 })).toBe(
      measureText('Hello', { font: 'Courier New', bold: false, sizePx: 16 })
    );
  });

  it('returns undefined for an unknown font', () => {
    for (const font of ['Comic Sans MS', '', 'Helvetica Neue', 'Arial, sans-serif', 'toString']) {
      expect(measureText('Hello', { font, bold: false, sizePx: 16 })).toBeUndefined();
    }
  });
});

// Line counts below match Chromium (div of that width, font-kerning:none,
// overflow-wrap:break-word) unless noted.
describe('countLines', () => {
  it('returns 1 for empty or blank text', () => {
    expect(countLines('', 100, ARIAL_16)).toBe(1);
    expect(countLines('   ', 100, ARIAL_16)).toBe(1);
  });

  it('keeps text that fits on one line, including an exact fit', () => {
    const width = measureText('X-small rounded', ARIAL_16)!; // 116.5px
    expect(countLines('X-small rounded', 220, ARIAL_16)).toBe(1);
    expect(countLines('X-small rounded', width, ARIAL_16)).toBe(1);
    expect(countLines('X-small rounded', width - 1, ARIAL_16)).toBe(2);
  });

  it('breaks at spaces, dropping the space at the break', () => {
    // "Read the full " | "update"
    expect(countLines('Read the full update', 100, ARIAL_16)).toBe(2);
    // "Read the " | "full " | "update"
    expect(countLines('Read the full update', 70, ARIAL_16)).toBe(3);
    // "Read the full " | "update": "Read the full" is 89.84px; the space at the break does not count.
    expect(countLines('Read the full update', 90, ARIAL_16)).toBe(2);
  });

  it('collapses runs of spaces', () => {
    expect(countLines('Download   the   report', 170, ARIAL_16)).toBe(1);
    expect(countLines('Download   the   report', 100, ARIAL_16)).toBe(2);
  });

  it('does not break at a no-break space', () => {
    // "Read the " | "full update"
    expect(countLines('Read the full update', 100, ARIAL_16)).toBe(2);
    expect(countLines('Read the full update', 100, ARIAL_16)).toBe(2);
    // "Read the f" | "ull": the unbreakable run is wider than 80px, so it breaks by character.
    expect(countLines('Read the full', 80, ARIAL_16)).toBe(2);
  });

  it('breaks after a hyphen followed by a letter', () => {
    // "X-small " | "rounded"
    expect(countLines('X-small rounded', 60, ARIAL_16)).toBe(2);
    // "X-" | "small " | "roun" | "ded"
    expect(countLines('X-small rounded', 40, ARIAL_16)).toBe(4);
    // "and/or " | "read-" | "only a/b " | "testing": never at '/'.
    expect(countLines('and/or read-only a/b testing', 60, ARIAL_16)).toBe(4);
    // "-" | "fo" | "o " | "ba" | "r": also after a word-initial hyphen.
    expect(countLines('-foo bar', 20, ARIAL_16)).toBe(5);
  });

  it('does not break after a hyphen followed by a digit', () => {
    const calibri = { font: 'Calibri', bold: false, sizePx: 16 };
    // "COVID-1" | "9 update" | "e-mail". (Chromium breaks "COVID-" | "19 " | "update " | "e-mail".)
    expect(countLines('COVID-19 update e-mail', 60, calibri)).toBe(3);
  });

  it('breaks a word wider than the box by character, starting it on a new line', () => {
    // "Go " | "Supercalifragilistic" | "expialidocious"
    expect(countLines('Go Supercalifragilisticexpialidocious', 130, ARIAL_16)).toBe(3);
    // "Go " | "Superca" | "lifragilist" | "icexpiali" | "docious"
    expect(countLines('Go Supercalifragilisticexpialidocious', 60, ARIAL_16)).toBe(5);
    // "Supercalifragilistic" | "expialidocious fun"
    expect(countLines('Supercalifragilisticexpialidocious fun', 130, ARIAL_16)).toBe(2);
  });

  it('matches Chromium for a long label across widths', () => {
    const label = 'A much longer call to action label that is quite wide';
    const expected: Array<[number, number]> = [
      [40, 12],
      [60, 8],
      [80, 6],
      [100, 5],
      [130, 3],
      [170, 3],
      [220, 2],
    ];
    for (const [width, lines] of expected) {
      expect(countLines(label, width, ARIAL_16)).toBe(lines);
    }
  });

  it('returns NaN when the text cannot be measured', () => {
    expect(countLines('Hello', 100, { font: 'Comic Sans MS', bold: false, sizePx: 16 })).toBeNaN();
    expect(countLines('Go 漢字', 100, ARIAL_16)).toBeNaN();
  });
});
