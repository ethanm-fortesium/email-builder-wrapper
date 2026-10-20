// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';

import renderToStaticMarkup from '../../../renderers/renderToStaticMarkup.js';
import type { TReaderDocument } from '../../../Reader/core.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const pad = (top: number, right: number, bottom: number, left: number) => ({ top, right, bottom, left });

function layout(childrenIds: string[], extra: Record<string, unknown> = {}) {
  return {
    type: 'EmailLayout',
    data: { backdropColor: '#F5F5F5', canvasColor: '#FFFFFF', textColor: '#262626', fontFamily: 'MODERN_SANS', childrenIds, ...extra },
  };
}

function columns(childrenIds: string[][], props: Record<string, unknown> = {}, style: Record<string, unknown> = {}) {
  return {
    type: 'ColumnsContainer',
    data: {
      style,
      props: { columnsCount: 2, columns: [0, 1, 2].map((i) => ({ childrenIds: childrenIds[i] ?? [] })), ...props },
    },
  };
}

const text = (value: string) => ({ type: 'Text', data: { props: { text: value } } });

function buildDocument(columnsProps: Record<string, unknown>, columnsStyle: Record<string, unknown> = {}, layoutProps: Record<string, unknown> = {}) {
  return {
    root: layout(['cols'], layoutProps),
    cols: columns([['t1'], ['t2']], columnsProps, columnsStyle),
    t1: text('LEFT_COLUMN'),
    t2: text('RIGHT_COLUMN'),
  };
}

/**
 * Render a document to one line. Long output lines are folded by turning a space between
 * attributes (or words) into a newline, so turning newlines back into spaces undoes it.
 */
function renderDocument(document: Record<string, unknown>) {
  return renderToStaticMarkup(document as unknown as TReaderDocument, { rootBlockId: 'root' }).replace(/\n/g, ' ');
}

function render(columnsProps: Record<string, unknown>, columnsStyle: Record<string, unknown> = {}, layoutProps: Record<string, unknown> = {}) {
  return renderDocument(buildDocument(columnsProps, columnsStyle, layoutProps));
}

const GHOST_TABLE = /<!--\[if mso\]><table role="presentation" width="(\d+)"[^>]*><tr><!\[endif\]-->/g;
const GHOST_CELL = /<!--\[if mso\]><td width="(\d+)"[^>]*><!\[endif\]-->/g;
const GHOST_TABLE_END = /<!--\[if mso\]><\/tr><\/table><!\[endif\]-->/g;

type GhostTable = { width: number; cells: number[] };

/** Every Outlook ghost table in the output with the widths of its own cells, innermost first. */
function ghostTables(html: string): GhostTable[] {
  const tokens = [
    ...Array.from(html.matchAll(GHOST_TABLE), (m) => ({ at: m.index ?? 0, kind: 'open' as const, width: Number(m[1]) })),
    ...Array.from(html.matchAll(GHOST_CELL), (m) => ({ at: m.index ?? 0, kind: 'cell' as const, width: Number(m[1]) })),
    ...Array.from(html.matchAll(GHOST_TABLE_END), (m) => ({ at: m.index ?? 0, kind: 'close' as const, width: 0 })),
  ].sort((a, b) => a.at - b.at);
  const open: GhostTable[] = [];
  const done: GhostTable[] = [];
  for (const token of tokens) {
    if (token.kind === 'open') {
      open.push({ width: token.width, cells: [] });
    } else if (token.kind === 'cell') {
      open[open.length - 1].cells.push(token.width);
    } else {
      done.push(open.pop() as GhostTable);
    }
  }
  expect(open).toEqual([]);
  return done;
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

/** max-width of every fluid column, in document order. */
const fluidMaxWidths = (html: string) => Array.from(html.matchAll(/class="email-col-stack[^"]*" style="[^"]*max-width:(\d+)px/g), (m) => Number(m[1]));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ColumnsContainerReader responsive behaviour', () => {
  it('registers the stacking rules in the mobile media query', () => {
    const html = render({ columnsGap: 16 });
    expect(html).toContain('@media only screen and (max-width:600px)');
    expect(html).toContain('.email-col-stack{max-width:100%!important;}');
    expect(html).toContain('.email-col-pad{padding-left:0!important;padding-right:0!important;}');
    expect(html).toContain('.email-col-gap-16{padding-top:16px!important;}');
  });

  it('adds no vertical gap rule without a gap', () => {
    expect(render({})).not.toContain('email-col-gap-');
  });

  it('switches to the stack at the canvas width on wide canvases', () => {
    expect(render({}, {}, { canvasWidth: 900 })).toContain('@media only screen and (max-width:899px)');
  });

  describe('stack on mobile (default)', () => {
    it('renders fluid inline-block columns sized from the available width', () => {
      const html = render({}, { padding: pad(0, 24, 0, 24) });
      expect(html).toContain('display:inline-block');
      // 600px canvas minus 24px padding either side, split evenly.
      expect(fluidMaxWidths(html)).toEqual([276, 276]);
      expect(html).toContain('LEFT_COLUMN');
      expect(html).toContain('RIGHT_COLUMN');
    });

    it('puts the gutter on an inner cell and the vertical gap class on later columns', () => {
      const html = render({ columnsGap: 16 });
      expect(html).toContain('class="email-col-stack" style=');
      expect(html).toContain('class="email-col-stack email-col-gap-16"');
      expect(html).toContain('<td class="email-col-pad" style="padding:0 8px 0 0px">');
      expect(html).toContain('<td class="email-col-pad" style="padding:0 0px 0 8px">');
    });

    it('restores the layout font size inside the columns', () => {
      expect(render({}, {}, { baseFontSize: 18 })).toMatch(/max-width:300px;[^"]*font-size:18px;line-height:1.5/);
    });

    it('wraps the columns in an Outlook ghost table whose cells add up to its width', () => {
      const html = render({ columnsGap: 16 }, { padding: pad(0, 24, 0, 24) });
      expect(ghostTables(html)).toEqual([{ width: 552, cells: [276, 276] }]);
    });

    it('gives the auto column the rest of the row next to a fixed content width', () => {
      const html = render({ fixedWidths: [180, null, null] }, { padding: pad(0, 24, 0, 24) });
      expect(fluidMaxWidths(html)).toEqual([180, 372]);
      expect(ghostTables(html)).toEqual([{ width: 552, cells: [180, 372] }]);
    });

    it('treats a missing stackOnMobile prop the same as true', () => {
      expect(render({})).toContain('class="email-col-stack"');
      expect(render({ stackOnMobile: true })).toContain('class="email-col-stack"');
    });
  });

  describe('stack on mobile disabled', () => {
    it('falls back to the rigid side-by-side table without stack hooks', () => {
      const html = render({ stackOnMobile: false });
      expect(html).not.toContain('class="email-col-stack');
      expect(ghostTables(html)).toEqual([]);
      expect(html).toContain('LEFT_COLUMN');
      expect(html).toContain('RIGHT_COLUMN');
    });

    it('gives every cell a px width attribute and a percentage CSS width', () => {
      const html = render({ stackOnMobile: false, columnsCount: 3, columnsGap: 12 }, { padding: pad(0, 24, 0, 24) });
      const cells = Array.from(html.matchAll(/<td width="(\d+)" valign="middle" style="width:([\d.]+)%;padding:0 (\d+)px 0 (\d+)px/g));
      expect(cells.map((m) => Number(m[1]))).toEqual([176, 176, 176]);
      expect(sum(cells.map((m) => Math.round(Number(m[2]) * 10_000)))).toBe(1_000_000);
      expect(sum(cells.map((m) => Number(m[1]) + Number(m[3]) + Number(m[4])))).toBe(552);
    });

    it('keeps fixed columns in px and does not use table-layout:fixed', () => {
      const html = render({ stackOnMobile: false, fixedWidths: [140, null, null] });
      const firstCell = html.indexOf('<td width="140" valign="middle" style="width:140px;');
      expect(firstCell).toBeGreaterThan(0);
      expect(html).toContain('<td width="460" valign="middle" style="width:76.6667%;');
      const rowTable = html.slice(html.lastIndexOf('<table', firstCell), firstCell);
      expect(rowTable).toContain('style="width:100%;border-collapse:collapse"');
      expect(rowTable).not.toContain('table-layout');
    });
  });
});

describe('ColumnsContainerReader widths', () => {
  it('sizes the row from the canvas content box when the canvas has a border', () => {
    const html = render({ columnsGap: 16 }, { padding: pad(0, 24, 0, 24) }, { borderColor: '#D0D5DD' });
    expect(ghostTables(html)).toEqual([{ width: 550, cells: [275, 275] }]);
    expect(sum(fluidMaxWidths(html))).toBe(550);
  });

  it('keeps ghost cells summing to the ghost table width at every nesting level', () => {
    const html = renderDocument({
      root: layout(['outer'], { borderColor: '#D0D5DD' }),
      outer: columns([['box'], ['t1']], { columnsGap: 16, columnsCount: 2 }, { padding: pad(16, 24, 16, 24) }),
      box: { type: 'Container', data: { style: { padding: pad(16, 16, 16, 16), borderColor: '#84CAFF', backgroundColor: '#EFF8FF' }, props: { childrenIds: ['inner'] } } },
      inner: columns([['t2'], ['t3'], ['deep']], { columnsGap: 7, columnsCount: 3 }),
      deep: columns([['t4'], ['t5']], { columnsGap: 5 }),
      t1: text('one'),
      t2: text('two'),
      t3: text('three'),
      t4: text('four'),
      t5: text('five'),
    });
    const tables = ghostTables(html);
    for (const table of tables) {
      expect(sum(table.cells)).toBe(table.width);
    }
    // Innermost first. Canvas 600 - border 2 - padding 48 = 550: two 275px columns of 267px content.
    // The container in the first column leaves 267 - padding 32 - border 2 = 233 for three columns
    // with a 7px gap (pads 0/5, 2/2, 5/0), whose last column holds 73px of content for the deepest row.
    expect(tables).toEqual([
      { width: 73, cells: [36, 37] },
      { width: 233, cells: [78, 77, 78] },
      { width: 550, cells: [275, 275] },
    ]);
  });

  it('never relies on box-sizing and leaves no raw-html placeholders', () => {
    const html = renderDocument({
      root: layout(['a', 'b', 'c', 'd', 'e']),
      a: columns([['t1'], ['t2']], { columnsGap: 16 }),
      b: columns([['t1'], ['t2']], { columnsGap: 16, stackOnMobile: false }),
      c: { type: 'Container', data: { style: { padding: pad(24, 24, 24, 24), borderColor: '#D0D5DD', borderRadius: 12 }, props: { childrenIds: ['t1'] } } },
      d: { type: 'Divider', data: { style: { padding: pad(16, 24, 16, 24) }, props: { lineHeight: 2, lineColor: '#EAECF0' } } },
      e: { type: 'Spacer', data: { props: { height: 16 } } },
      t1: text('one'),
      t2: text('two'),
    });
    expect(html).not.toContain('box-sizing');
    expect(html).not.toContain('<eb-raw');
  });
});
