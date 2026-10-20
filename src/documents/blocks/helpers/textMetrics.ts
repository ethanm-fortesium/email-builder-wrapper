// Text measurement against the baked metrics of the Windows fonts the preset stacks
// resolve to (fontMetrics.generated.ts). Widths are the plain sum of glyph advances:
// no kerning, no ligatures, no hinting - what Chromium renders with
// font-kerning:none and what Word (classic Outlook) lays out, so a VML shape sized from
// it matches the browser's auto-width box.

import {
  ADVANCE_CODE_POINT_RANGES,
  ADVANCE_DIGITS,
  ADVANCE_MISSING,
  FONT_METRICS,
  type FaceMetrics,
} from './fontMetrics.generated.js';

export type TextMetricsOptions = { font: string; bold: boolean; sizePx: number };

// Rendered with no width: zero width space, and the soft hyphen (only drawn, as a hyphen,
// when a line breaks at it - countLines does not break there).
const ZERO_WIDTH = new Set([0x200b, 0x00ad]);

const SPACE = 0x20;
const HYPHEN = 0x2d;
const LETTER = /\p{L}/u;

// Offset of each range's first code point within a face's advance string (in advances).
const RANGE_OFFSETS: number[] = [];
{
  let offset = 0;
  for (const [first, last] of ADVANCE_CODE_POINT_RANGES) {
    RANGE_OFFSETS.push(offset);
    offset += last - first + 1;
  }
}

function tableIndex(cp: number): number {
  for (let i = 0; i < ADVANCE_CODE_POINT_RANGES.length; i++) {
    const [first, last] = ADVANCE_CODE_POINT_RANGES[i];
    if (cp >= first && cp <= last) {
      return RANGE_OFFSETS[i] + cp - first;
    }
  }
  return -1;
}

const FACES_BY_NAME = new Map(Object.entries(FONT_METRICS).map(([name, entry]) => [name.toLowerCase(), entry]));

function lookupFace(font: string, bold: boolean): FaceMetrics | undefined {
  const entry = FACES_BY_NAME.get(font.trim().replace(/^(["'])(.*)\1$/, '$2').toLowerCase());
  return entry ? (bold ? entry.bold : entry.regular) : undefined;
}

// Decoded advances (font units) per face; -1 marks a missing glyph.
const decoded = new WeakMap<FaceMetrics, Int16Array>();

function advancesOf(face: FaceMetrics): Int16Array {
  let table = decoded.get(face);
  if (!table) {
    const s = face.advances;
    table = new Int16Array(s.length / 2);
    for (let i = 0; i < table.length; i++) {
      const digits = s.slice(2 * i, 2 * i + 2);
      table[i] =
        digits === ADVANCE_MISSING ? -1 : ADVANCE_DIGITS.indexOf(digits[0]) * 64 + ADVANCE_DIGITS.indexOf(digits[1]);
    }
    decoded.set(face, table);
  }
  return table;
}

// Advance of one code point in font units, or undefined when the face has no glyph.
function advanceUnits(face: FaceMetrics, cp: number): number | undefined {
  if (ZERO_WIDTH.has(cp)) {
    return 0;
  }
  const i = tableIndex(cp);
  const advance = i < 0 ? -1 : advancesOf(face)[i];
  return advance < 0 ? undefined : advance;
}

function unitsOf(face: FaceMetrics, text: string): number | undefined {
  let total = 0;
  for (const ch of text) {
    const advance = advanceUnits(face, ch.codePointAt(0)!);
    if (advance === undefined) {
      return undefined;
    }
    total += advance;
  }
  return total;
}

/**
 * Width in px of `text` set on one line in `font`: the sum of its unkerned glyph
 * advances. Undefined when the font is not in the table or any character has no
 * glyph in it (the browser would fall back to another font), so the caller can fall
 * back to a layout that does not need the width.
 */
export function measureText(text: string, opts: TextMetricsOptions): number | undefined {
  const face = lookupFace(opts.font, opts.bold);
  if (!face) {
    return undefined;
  }
  const units = unitsOf(face, text);
  return units === undefined ? undefined : (units * opts.sizePx) / face.unitsPerEm;
}

/**
 * Number of lines `text` wraps to in a box `maxWidthPx` wide, greedily like browsers
 * and Word: lines break at spaces (runs collapse to one space, which is dropped at the
 * break) and after a '-' followed by a letter ("X-|small", not "COVID-19"); never at
 * '/'. A word wider than the box starts a new line and is broken between characters.
 * Returns 1 for empty text, and NaN when the text cannot be measured (see measureText),
 * so check measureText first.
 */
export function countLines(text: string, maxWidthPx: number, opts: TextMetricsOptions): number {
  const face = lookupFace(opts.font, opts.bold);
  const space = face && advanceUnits(face, SPACE);
  if (!face || space === undefined) {
    return NaN;
  }
  const scale = opts.sizePx / face.unitsPerEm;
  // Widths are compared in font units. A line may overshoot by up to 1/64px, Chromium's
  // layout unit, and still fit.
  const max = (maxWidthPx + 1 / 64) / scale;

  let lines = 1;
  let lineWidth = 0;
  let lineEmpty = true;

  const placeByCharacter = (piece: string): boolean => {
    for (const ch of piece) {
      const w = advanceUnits(face, ch.codePointAt(0)!);
      if (w === undefined) {
        return false;
      }
      if (!lineEmpty && lineWidth + w > max) {
        lines++;
        lineWidth = 0;
      }
      lineWidth += w;
      lineEmpty = false;
    }
    return true;
  };

  for (const word of text.split(/ +/)) {
    if (!word) {
      continue;
    }
    const pieces = splitAtHyphens(word);
    for (let p = 0; p < pieces.length; p++) {
      const w = unitsOf(face, pieces[p]);
      if (w === undefined) {
        return NaN;
      }
      const gap = p === 0 && !lineEmpty ? space : 0;
      if (!lineEmpty && lineWidth + gap + w <= max) {
        lineWidth += gap + w;
        continue;
      }
      if (!lineEmpty) {
        lines++;
        lineWidth = 0;
        lineEmpty = true;
      }
      if (w <= max) {
        lineWidth = w;
        lineEmpty = false;
      } else if (!placeByCharacter(pieces[p])) {
        return NaN;
      }
    }
  }
  return lines;
}

// "X-small-ish" -> ["X-", "small-", "ish"]: a break opportunity after each hyphen that
// is followed by a letter.
function splitAtHyphens(word: string): string[] {
  const chars = Array.from(word);
  const pieces: string[] = [];
  let start = 0;
  for (let i = 0; i < chars.length - 1; i++) {
    if (chars[i].codePointAt(0) === HYPHEN && LETTER.test(chars[i + 1])) {
      pieces.push(chars.slice(start, i + 1).join(''));
      start = i + 1;
    }
  }
  pieces.push(chars.slice(start).join(''));
  return pieces;
}
