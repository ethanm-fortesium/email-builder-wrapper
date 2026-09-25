#!/usr/bin/env node
/*
 * Generates src/documents/blocks/helpers/fontMetrics.generated.ts: the vertical
 * metrics and unkerned advance widths of the Windows fonts the preset font stacks
 * resolve to (see fontFamily.ts `msoFont`). textMetrics.ts reads the output to size
 * Outlook's VML buttons to the exact width of their label.
 *
 * Usage (on Windows, from the repo root):  npm run generate:font-metrics
 * Optional env: FONT_DIR (defaults to %WINDIR%\Fonts).
 *
 * Only Node built-ins are used. The parser reads just what is needed: head, hhea,
 * OS/2, hmtx, cmap (format 4 / 12), name (to pick a face out of a .ttc) and, for
 * variable fonts, fvar + avar + HVAR + MVAR so a named instance (e.g. Bahnschrift
 * Bold, Sitka Text Bold) gets its own advances and vertical metrics.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const FONT_DIR = process.env.FONT_DIR || path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts');
const OUT_FILE = path.resolve(__dirname, '..', 'src', 'documents', 'blocks', 'helpers', 'fontMetrics.generated.ts');

// Code points covered, as inclusive ranges. Keep in sync with nothing: the ranges are
// written into the generated module and textMetrics.ts indexes by them.
const CODE_POINT_RANGES = [
  [0x20, 0x7e], // Basic Latin
  [0xa0, 0x17f], // Latin-1 Supplement + Latin Extended-A
  [0x2013, 0x2014], // en dash, em dash
  [0x2018, 0x2019], // single quotes
  [0x201c, 0x201d], // double quotes
  [0x2022, 0x2022], // bullet
  [0x2026, 0x2026], // ellipsis
  [0x20ac, 0x20ac], // euro
  [0x2122, 0x2122], // trade mark
];

// Advances are written as two base-64 digits each (0..4095 font units); '!!' marks a
// code point the font has no glyph for.
const DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const MISSING = '!!';

// Each face lists candidate sources in order; the first whose file exists is used.
// `axes` selects a variable-font instance (unspecified axes stay at their default).
// `face` picks a member of a .ttc by its family name.
const FONTS = [
  { family: 'Arial', regular: [{ file: 'arial.ttf' }], bold: [{ file: 'arialbd.ttf' }] },
  { family: 'Candara', regular: [{ file: 'Candara.ttf' }], bold: [{ file: 'Candarab.ttf' }] },
  { family: 'Calibri', regular: [{ file: 'calibri.ttf' }], bold: [{ file: 'calibrib.ttf' }] },
  { family: 'Corbel', regular: [{ file: 'corbel.ttf' }], bold: [{ file: 'corbelb.ttf' }] },
  {
    family: 'Bahnschrift',
    regular: [{ file: 'bahnschrift.ttf', axes: { wght: 400, wdth: 100 } }],
    bold: [{ file: 'bahnschrift.ttf', axes: { wght: 700, wdth: 100 } }],
  },
  {
    family: 'Sitka Text',
    // Windows 11 ships one variable font (opsz 11 = the "Text" optical size);
    // Windows 10 ships per-weight collections with one member per optical size.
    regular: [
      { file: 'SitkaVF.ttf', axes: { opsz: 11, wght: 400 } },
      { file: 'Sitka.ttc', face: 'Sitka Text' },
    ],
    bold: [
      { file: 'SitkaVF.ttf', axes: { opsz: 11, wght: 700 } },
      { file: 'Sitkab.ttc', face: 'Sitka Text' },
    ],
  },
  { family: 'Palatino Linotype', regular: [{ file: 'pala.ttf' }], bold: [{ file: 'palab.ttf' }] },
  { family: 'Courier New', regular: [{ file: 'cour.ttf' }], bold: [{ file: 'courbd.ttf' }] },
];

// ---------------------------------------------------------------------------
// Font parsing

function tableDirectory(buf, offset) {
  const numTables = buf.readUInt16BE(offset + 4);
  const tables = {};
  for (let i = 0; i < numTables; i++) {
    const rec = offset + 12 + i * 16;
    tables[buf.toString('latin1', rec, rec + 4)] = { offset: buf.readUInt32BE(rec + 8), length: buf.readUInt32BE(rec + 12) };
  }
  return tables;
}

function fontOffsets(buf) {
  if (buf.toString('latin1', 0, 4) !== 'ttcf') return [0];
  const count = buf.readUInt32BE(8);
  const offsets = [];
  for (let i = 0; i < count; i++) offsets.push(buf.readUInt32BE(12 + 4 * i));
  return offsets;
}

function readNames(buf, tables) {
  const names = {};
  if (!tables.name) return names;
  const base = tables.name.offset;
  const count = buf.readUInt16BE(base + 2);
  const strings = base + buf.readUInt16BE(base + 4);
  for (let i = 0; i < count; i++) {
    const r = base + 6 + i * 12;
    const platform = buf.readUInt16BE(r);
    const language = buf.readUInt16BE(r + 4);
    const nameId = buf.readUInt16BE(r + 6);
    const length = buf.readUInt16BE(r + 8);
    const off = strings + buf.readUInt16BE(r + 10);
    if (platform !== 3 || (language !== 0x409 && names[nameId] !== undefined)) continue;
    let s = '';
    for (let j = 0; j < length; j += 2) s += String.fromCharCode(buf.readUInt16BE(off + j));
    names[nameId] = s;
  }
  return names;
}

function cmapLookup(buf, tables) {
  const base = tables.cmap.offset;
  const count = buf.readUInt16BE(base + 2);
  let fmt4 = -1;
  let fmt12 = -1;
  for (let i = 0; i < count; i++) {
    const platform = buf.readUInt16BE(base + 4 + i * 8);
    const encoding = buf.readUInt16BE(base + 6 + i * 8);
    const sub = base + buf.readUInt32BE(base + 8 + i * 8);
    const format = buf.readUInt16BE(sub);
    if (platform === 3 && encoding === 10 && format === 12) fmt12 = sub;
    if (platform === 3 && (encoding === 1 || encoding === 0) && format === 4 && fmt4 < 0) fmt4 = sub;
    if (platform === 0 && format === 4 && fmt4 < 0) fmt4 = sub;
  }
  if (fmt12 >= 0) {
    const groups = buf.readUInt32BE(fmt12 + 12);
    return (cp) => {
      for (let i = 0; i < groups; i++) {
        const g = fmt12 + 16 + i * 12;
        const start = buf.readUInt32BE(g);
        const end = buf.readUInt32BE(g + 4);
        if (cp >= start && cp <= end) return buf.readUInt32BE(g + 8) + (cp - start);
      }
      return 0;
    };
  }
  if (fmt4 < 0) throw new Error('no usable cmap subtable');
  const segCount = buf.readUInt16BE(fmt4 + 6) / 2;
  const ends = fmt4 + 14;
  const starts = ends + segCount * 2 + 2;
  const deltas = starts + segCount * 2;
  const rangeOffsets = deltas + segCount * 2;
  return (cp) => {
    if (cp > 0xffff) return 0;
    for (let i = 0; i < segCount; i++) {
      if (cp > buf.readUInt16BE(ends + 2 * i)) continue;
      const start = buf.readUInt16BE(starts + 2 * i);
      if (cp < start) return 0;
      const delta = buf.readInt16BE(deltas + 2 * i);
      const ro = buf.readUInt16BE(rangeOffsets + 2 * i);
      if (ro === 0) return (cp + delta) & 0xffff;
      const g = buf.readUInt16BE(rangeOffsets + 2 * i + ro + 2 * (cp - start));
      return g === 0 ? 0 : (g + delta) & 0xffff;
    }
    return 0;
  };
}

const f2dot14 = (buf, off) => buf.readInt16BE(off) / 16384;

// Normalized (and avar-mapped) coordinates for the requested axis values.
function normalizedCoords(buf, tables, axes) {
  const base = tables.fvar.offset;
  const axesOffset = base + buf.readUInt16BE(base + 4);
  const axisCount = buf.readUInt16BE(base + 8);
  const axisSize = buf.readUInt16BE(base + 10);
  const coords = [];
  const tags = [];
  for (let i = 0; i < axisCount; i++) {
    const a = axesOffset + i * axisSize;
    const tag = buf.toString('latin1', a, a + 4);
    const min = buf.readInt32BE(a + 4) / 65536;
    const def = buf.readInt32BE(a + 8) / 65536;
    const max = buf.readInt32BE(a + 12) / 65536;
    tags.push(tag);
    let v = axes[tag] === undefined ? def : Math.min(max, Math.max(min, axes[tag]));
    let n = 0;
    if (v < def) n = (v - def) / (def - min);
    else if (v > def) n = (v - def) / (max - def);
    coords.push(n);
  }
  for (const tag of Object.keys(axes)) if (!tags.includes(tag)) throw new Error(`font has no '${tag}' axis`);
  if (tables.avar) {
    let p = tables.avar.offset + 8;
    for (let i = 0; i < axisCount; i++) {
      const pairs = buf.readUInt16BE(p);
      p += 2;
      const map = [];
      for (let j = 0; j < pairs; j++) map.push([f2dot14(buf, p + j * 4), f2dot14(buf, p + j * 4 + 2)]);
      p += pairs * 4;
      if (map.length < 2) continue;
      const n = coords[i];
      for (let j = 1; j < map.length; j++) {
        if (n <= map[j][0]) {
          const [x0, y0] = map[j - 1];
          const [x1, y1] = map[j];
          coords[i] = x1 === x0 ? y1 : y0 + ((y1 - y0) * (n - x0)) / (x1 - x0);
          break;
        }
      }
    }
  }
  // Coordinates are F2Dot14 values once normalized.
  return coords.map((c) => Math.round(c * 16384) / 16384);
}

// ItemVariationStore: returns (outer, inner) => interpolated delta at `coords`.
function itemVariationStore(buf, base, coords) {
  const regionList = base + buf.readUInt32BE(base + 2);
  const dataCount = buf.readUInt16BE(base + 6);
  const axisCount = buf.readUInt16BE(regionList);
  const regionCount = buf.readUInt16BE(regionList + 2);
  const scalars = [];
  for (let r = 0; r < regionCount; r++) {
    let s = 1;
    for (let a = 0; a < axisCount; a++) {
      const rec = regionList + 4 + (r * axisCount + a) * 6;
      const start = f2dot14(buf, rec);
      const peak = f2dot14(buf, rec + 2);
      const end = f2dot14(buf, rec + 4);
      const c = coords[a];
      if (peak === 0 || start > peak || peak > end || (start < 0 && end > 0)) continue;
      if (c === peak) continue;
      if (c <= start || c >= end) {
        s = 0;
        break;
      }
      s *= c < peak ? (c - start) / (peak - start) : (end - c) / (end - peak);
    }
    scalars.push(s);
  }
  const data = [];
  for (let i = 0; i < dataCount; i++) data.push(base + buf.readUInt32BE(base + 8 + i * 4));
  return (outer, inner) => {
    const d = data[outer];
    const itemCount = buf.readUInt16BE(d);
    if (inner >= itemCount) return 0;
    const wordDeltaCount = buf.readUInt16BE(d + 2);
    const longWords = (wordDeltaCount & 0x8000) !== 0;
    const wordCount = wordDeltaCount & 0x7fff;
    const regionIndexCount = buf.readUInt16BE(d + 4);
    const bigSize = longWords ? 4 : 2;
    const smallSize = longWords ? 2 : 1;
    const rowSize = wordCount * bigSize + (regionIndexCount - wordCount) * smallSize;
    let p = d + 6 + regionIndexCount * 2 + inner * rowSize;
    let delta = 0;
    for (let k = 0; k < regionIndexCount; k++) {
      let v;
      if (k < wordCount) {
        v = longWords ? buf.readInt32BE(p) : buf.readInt16BE(p);
        p += bigSize;
      } else {
        v = longWords ? buf.readInt16BE(p) : buf.readInt8(p);
        p += smallSize;
      }
      delta += v * scalars[buf.readUInt16BE(d + 6 + k * 2)];
    }
    return delta;
  };
}

// DeltaSetIndexMap: glyph id -> [outer, inner]
function deltaSetIndexMap(buf, off) {
  const format = buf.readUInt8(off);
  const entryFormat = buf.readUInt8(off + 1);
  const mapCount = format === 0 ? buf.readUInt16BE(off + 2) : buf.readUInt32BE(off + 2);
  const data = off + (format === 0 ? 4 : 6);
  const innerBits = (entryFormat & 0x0f) + 1;
  const entrySize = ((entryFormat & 0x30) >> 4) + 1;
  return (glyph) => {
    const i = Math.min(glyph, mapCount - 1);
    let entry = 0;
    for (let b = 0; b < entrySize; b++) entry = entry * 256 + buf.readUInt8(data + i * entrySize + b);
    return [Math.floor(entry / 2 ** innerBits), entry % 2 ** innerBits];
  };
}

function readFace(buf, offset, axes) {
  const tables = tableDirectory(buf, offset);
  const head = tables.head.offset;
  const hhea = tables.hhea.offset;
  const os2 = tables['OS/2'].offset;
  const hmtx = tables.hmtx.offset;
  const numHMetrics = buf.readUInt16BE(hhea + 34);
  const metrics = {
    unitsPerEm: buf.readUInt16BE(head + 18),
    winAscent: buf.readUInt16BE(os2 + 74),
    winDescent: buf.readUInt16BE(os2 + 76),
    hheaAscender: buf.readInt16BE(hhea + 4),
    hheaDescender: buf.readInt16BE(hhea + 6),
    hheaLineGap: buf.readInt16BE(hhea + 8),
  };
  let advanceDelta = () => 0;
  if (axes) {
    if (!tables.fvar) throw new Error('axes given for a font without fvar');
    const coords = normalizedCoords(buf, tables, axes);
    if (tables.HVAR) {
      const h = tables.HVAR.offset;
      const store = itemVariationStore(buf, h + buf.readUInt32BE(h + 4), coords);
      const mapOffset = buf.readUInt32BE(h + 8);
      const map = mapOffset ? deltaSetIndexMap(buf, h + mapOffset) : (g) => [0, g];
      advanceDelta = (g) => store(...map(g));
    } else if (coords.some((c) => c !== 0)) {
      throw new Error('variable font without HVAR: non-default instances are not supported');
    }
    if (tables.MVAR) {
      const m = tables.MVAR.offset;
      const recordSize = buf.readUInt16BE(m + 6);
      const recordCount = buf.readUInt16BE(m + 8);
      const storeOffset = buf.readUInt16BE(m + 10);
      if (storeOffset) {
        const store = itemVariationStore(buf, m + storeOffset, coords);
        const fields = { hasc: 'hheaAscender', hdsc: 'hheaDescender', hlgp: 'hheaLineGap', hcla: 'winAscent', hcld: 'winDescent' };
        for (let i = 0; i < recordCount; i++) {
          const r = m + 12 + i * recordSize;
          const field = fields[buf.toString('latin1', r, r + 4)];
          if (field) metrics[field] += Math.round(store(buf.readUInt16BE(r + 4), buf.readUInt16BE(r + 6)));
        }
      }
    }
  }
  const glyphOf = cmapLookup(buf, tables);
  const advanceOf = (g) => buf.readUInt16BE(hmtx + 4 * Math.min(g, numHMetrics - 1)) + advanceDelta(g);
  return { tables, metrics, glyphOf, advanceOf };
}

function loadFace(sources) {
  for (const src of sources) {
    const file = path.join(FONT_DIR, src.file);
    if (!fs.existsSync(file)) continue;
    const buf = fs.readFileSync(file);
    const offsets = fontOffsets(buf);
    let offset = offsets[0];
    if (src.face) {
      offset = offsets.find((o) => {
        const names = readNames(buf, tableDirectory(buf, o));
        return names[16] === src.face || names[1] === src.face;
      });
      if (offset === undefined) throw new Error(`${src.file} has no face named '${src.face}'`);
    }
    return { source: src, ...readFace(buf, offset, src.axes) };
  }
  throw new Error(`none of ${sources.map((s) => s.file).join(', ')} found in ${FONT_DIR}`);
}

// ---------------------------------------------------------------------------
// Encoding

function codePoints() {
  const cps = [];
  for (const [a, b] of CODE_POINT_RANGES) for (let c = a; c <= b; c++) cps.push(c);
  return cps;
}

function encodeFace(face, label) {
  const missing = [];
  let s = '';
  for (const cp of codePoints()) {
    const g = face.glyphOf(cp);
    if (g === 0) {
      missing.push(cp);
      s += MISSING;
      continue;
    }
    const adv = Math.round(face.advanceOf(g));
    if (adv < 0 || adv >= 4096) throw new Error(`${label}: advance ${adv} for U+${cp.toString(16)} does not fit two digits`);
    s += DIGITS[adv >> 6] + DIGITS[adv & 63];
  }
  return { s, missing };
}

const hex = (n) => '0x' + n.toString(16);

function main() {
  const lines = [];
  const report = [];
  for (const font of FONTS) {
    const faces = {};
    for (const style of ['regular', 'bold']) {
      const face = loadFace(font[style]);
      const { s, missing } = encodeFace(face, `${font.family} ${style}`);
      faces[style] = { ...face.metrics, advances: s };
      const src = face.source.file + (face.source.axes ? ` ${JSON.stringify(face.source.axes)}` : '') + (face.source.face ? ` [${face.source.face}]` : '');
      report.push(
        `${font.family} ${style}: ${src}` +
          (missing.length ? `, missing ${missing.map((c) => 'U+' + c.toString(16).toUpperCase().padStart(4, '0')).join(' ')}` : '')
      );
    }
    const face = (m) =>
      ['{', ...Object.entries(m).map(([k, v]) => `      ${k}:${typeof v === 'string' ? `\n        '${v}'` : ` ${v}`},`), '    }'].join('\n');
    const key = /^[A-Za-z_$][\w$]*$/.test(font.family) ? font.family : `'${font.family}'`;
    lines.push(`  ${key}: {\n    regular: ${face(faces.regular)},\n    bold: ${face(faces.bold)},\n  },`);
  }

  const out = `// GENERATED FILE - do not edit by hand.
// Regenerate on Windows with: npm run generate:font-metrics  (scripts/generate-font-metrics.cjs)
//
// Metrics of the Windows fonts the preset font stacks resolve to, read from the font
// files: vertical metrics in font units and the unkerned advance width of every code
// point in ADVANCE_CODE_POINT_RANGES. Advances are two base-64 digits (DIGITS) each,
// in range order; '${MISSING}' marks a code point the font has no glyph for.

export type FaceMetrics = {
  unitsPerEm: number;
  winAscent: number;
  winDescent: number;
  hheaAscender: number;
  hheaDescender: number;
  hheaLineGap: number;
  advances: string;
};

export type FontMetricsEntry = { regular: FaceMetrics; bold: FaceMetrics };

export const ADVANCE_CODE_POINT_RANGES: ReadonlyArray<readonly [number, number]> = [
${CODE_POINT_RANGES.map(([a, b]) => `  [${hex(a)}, ${hex(b)}],`).join('\n')}
];

export const ADVANCE_DIGITS = '${DIGITS}';

export const ADVANCE_MISSING = '${MISSING}';

export const FONT_METRICS: Readonly<Record<string, FontMetricsEntry>> = {
${lines.join('\n')}
};
`;
  fs.writeFileSync(OUT_FILE, out);
  for (const line of report) console.log(line);
  console.log(`wrote ${path.relative(process.cwd(), OUT_FILE)} (${Buffer.byteLength(out)} bytes)`);
}

main();
