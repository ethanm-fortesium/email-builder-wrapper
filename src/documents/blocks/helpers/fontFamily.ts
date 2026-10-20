// Single source of truth for the preset font stacks.
//
// `value` is the CSS stack browsers use. Within each stack a Windows system font
// comes before any Office "cloud" font (Arial Nova, Gill Sans Nova, Avenir Next
// LT Pro, ...) or GDI-only family: classic Outlook (Word) can see cloud fonts and
// would otherwise pick a different face from the one Windows browsers render.
//
// `msoFont` is the Windows font a Windows browser resolves the stack to. It is
// emitted as mso-ascii/mso-hansi-font-family so Word uses exactly that face.
//
// `raiseB` and `hang` are calibrations measured in the Word engine against
// Chromium for that Windows font (see emailTypography.ts):
//   raiseB - baseline offset term of Word's exact-line-height text position.
//   hang   - list marker hang [a, b] in px = a + b * fontSize, for ul and ol.
export type FontFamilyEntry = {
  key: FontFamilyKey;
  label: string;
  value: string;
  msoFont: string;
  raiseB: number;
  hang: { ul: [number, number]; ol: [number, number] };
};

export const FONT_FAMILY_NAMES = [
  'MODERN_SANS',
  'BOOK_SANS',
  'ORGANIC_SANS',
  'GEOMETRIC_SANS',
  'HEAVY_SANS',
  'ROUNDED_SANS',
  'MODERN_SERIF',
  'BOOK_SERIF',
  'MONOSPACE',
] as const;

export type FontFamilyKey = (typeof FONT_FAMILY_NAMES)[number];

export const FONT_FAMILIES: FontFamilyEntry[] = [
  {
    key: 'MODERN_SANS',
    label: 'Modern sans',
    value: '"Helvetica Neue", Arial, "Nimbus Sans", sans-serif',
    msoFont: 'Arial',
    raiseB: -0.046,
    hang: { ul: [6.45, 0.609], ol: [1.0, 1.0] },
  },
  {
    key: 'BOOK_SANS',
    label: 'Book sans',
    value: 'Optima, Candara, "Noto Sans", source-sans-pro, sans-serif',
    msoFont: 'Candara',
    raiseB: -0.054,
    hang: { ul: [6.16, 0.653], ol: [0.58, 0.912] },
  },
  {
    key: 'ORGANIC_SANS',
    label: 'Organic sans',
    value: 'Seravek, Calibri, "Gill Sans Nova", Ubuntu, "DejaVu Sans", source-sans-pro, sans-serif',
    msoFont: 'Calibri',
    raiseB: -0.049,
    hang: { ul: [6.16, 0.653], ol: [-0.09, 0.938] },
  },
  {
    key: 'GEOMETRIC_SANS',
    label: 'Geometric sans',
    value: 'Avenir, Corbel, "Avenir Next LT Pro", Montserrat, "URW Gothic", source-sans-pro, sans-serif',
    msoFont: 'Corbel',
    raiseB: -0.082,
    hang: { ul: [6.16, 0.653], ol: [0.58, 0.912] },
  },
  {
    key: 'HEAVY_SANS',
    label: 'Heavy sans',
    value:
      'Bahnschrift, "DIN Alternate", "Franklin Gothic Medium", "Nimbus Sans Narrow", sans-serif-condensed, sans-serif',
    msoFont: 'Bahnschrift',
    raiseB: 0.004,
    hang: { ul: [7.0, 0.5], ol: [0.78, 0.916] },
  },
  {
    key: 'ROUNDED_SANS',
    label: 'Rounded sans',
    value:
      'ui-rounded, "Hiragino Maru Gothic ProN", Calibri, Quicksand, Comfortaa, Manjari, "Arial Rounded MT Bold", source-sans-pro, sans-serif',
    msoFont: 'Calibri',
    raiseB: -0.049,
    hang: { ul: [6.16, 0.653], ol: [-0.09, 0.938] },
  },
  {
    key: 'MODERN_SERIF',
    label: 'Modern serif',
    value: 'Charter, "Bitstream Charter", "Sitka Text", Cambria, serif',
    msoFont: 'Sitka Text',
    raiseB: 0.057,
    hang: { ul: [7.0, 0.5], ol: [0.08, 1.092] },
  },
  {
    key: 'BOOK_SERIF',
    label: 'Book serif',
    value: '"Iowan Old Style", "Palatino Linotype", "URW Palladio L", P052, serif',
    msoFont: 'Palatino Linotype',
    raiseB: -0.07,
    hang: { ul: [7.05, 0.681], ol: [0.91, 0.938] },
  },
  {
    key: 'MONOSPACE',
    label: 'Monospace',
    value: '"Nimbus Mono PS", "Courier New", "Cutive Mono", monospace',
    msoFont: 'Courier New',
    raiseB: 0.043,
    hang: { ul: [6.22, 0.584], ol: [0.43, 1.699] },
  },
];

export const DEFAULT_FONT_FAMILY_KEY: FontFamilyKey = 'MODERN_SANS';

export function getFontFamilyEntry(key: string | null | undefined): FontFamilyEntry | undefined {
  if (!key) {
    return undefined;
  }
  return FONT_FAMILIES.find((item) => item.key === key);
}
