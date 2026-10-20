// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import renderToStaticMarkup from '../../../renderers/renderToStaticMarkup.js';
import { ReaderBlockSchema, type TReaderDocument } from '../../../Reader/core.js';
import { BREAK_OPPORTUNITY } from '../helpers/breakLongTokens.js';

const P = { top: 16, right: 24, bottom: 16, left: 24 };
const FEES = [
  ['Fee', 'Amount'],
  ['Annual renewal', '£120.00'],
  ['Late renewal', '£160.00'],
  ['Restoration', '£250.00'],
];

/** Render a document with one Table block in a 600px canvas (552px for the table), folded lines joined again. */
function render(props: Record<string, unknown>, style: Record<string, unknown> = {}) {
  const document = {
    root: { type: 'EmailLayout', data: { canvasColor: '#FFFFFF', textColor: '#262626', fontFamily: 'MODERN_SANS', childrenIds: ['t'] } },
    t: { type: 'Table', data: { style: { padding: P, ...style }, props } },
  };
  return renderToStaticMarkup(document as unknown as TReaderDocument, { rootBlockId: 'root' }).replace(/\n/g, ' ');
}

/** The data table (the only table that is not role="presentation") of rendered HTML. */
function dataTable(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.querySelectorAll('table')).find((table) => table.getAttribute('role') !== 'presentation') ?? null;
}

const cellsOf = (table: Element) => Array.from(table.querySelectorAll('tr')).map((tr) => Array.from(tr.children) as HTMLElement[]);

describe('TableReader', () => {
  it('renders a data table with a header row of <th scope="col"> cells', () => {
    const table = dataTable(render({ rows: FEES }))!;
    expect(table).not.toBeNull();
    const rows = cellsOf(table);
    expect(table.querySelector('thead tr')?.children).toHaveLength(2);
    expect(rows[0].map((cell) => [cell.tagName, cell.getAttribute('scope'), cell.textContent])).toEqual([
      ['TH', 'col', 'Fee'],
      ['TH', 'col', 'Amount'],
    ]);
    expect(rows[1].map((cell) => cell.tagName)).toEqual(['TD', 'TD']);
    expect(rows[0][0].style.fontWeight).toBe('700');
  });

  it('makes the first column <th scope="row"> cells for a header column', () => {
    const table = dataTable(render({ rows: FEES, headerRow: false, headerColumn: true }))!;
    expect(table.querySelector('thead')).toBeNull();
    expect(cellsOf(table).map((row) => [row[0].tagName, row[0].getAttribute('scope'), row[1].tagName])).toEqual(
      FEES.map(() => ['TH', 'row', 'TD'])
    );
  });

  it('gives every cell a px width for Word and a % width for browsers, summing to the table', () => {
    const table = dataTable(render({ rows: FEES, cellPadding: { vertical: 8, horizontal: 12 } }))!;
    for (const row of cellsOf(table)) {
      const percentages = row.map((cell) => parseFloat(cell.style.width));
      expect(percentages.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 3);
      const outers = row.map((cell) => Number(cell.getAttribute('width')) + 24);
      expect(outers.reduce((a, b) => a + b, 0)).toBe(552);
      row.forEach((cell, i) => expect(parseFloat(cell.style.width)).toBeCloseTo((outers[i] / 552) * 100, 3));
    }
  });

  it('sizes auto columns to their content and keeps % shares', () => {
    const auto = cellsOf(dataTable(render({ rows: FEES }))!)[0].map((cell) => Number(cell.getAttribute('width')));
    expect(auto[0]).toBeGreaterThan(auto[1]);
    const shared = cellsOf(dataTable(render({ rows: FEES, columns: [{ width: 25 }, null] }))!)[0].map((cell) => parseFloat(cell.style.width));
    expect(shared[0]).toBeCloseTo(25, 3);
  });

  it('aligns cells by their column', () => {
    const rows = cellsOf(dataTable(render({ rows: FEES, columns: [null, { align: 'right' }] }))!);
    for (const row of rows) {
      expect(row.map((cell) => [cell.getAttribute('align'), cell.style.textAlign])).toEqual([
        ['left', 'left'],
        ['right', 'right'],
      ]);
    }
  });

  it('carries the complete typography on every cell (Word does not inherit it into tables)', () => {
    const html = render({ rows: FEES }, { fontSize: 14, color: '#475467', fontFamily: 'BOOK_SERIF' });
    for (const cell of cellsOf(dataTable(html)!).flat()) {
      const style = cell.getAttribute('style')!;
      expect(style).toContain('font-family:');
      expect(style).toContain('mso-ascii-font-family:"Palatino Linotype"');
      expect(style).toContain('font-size:14px');
      expect(style).toContain('color:#475467');
      expect(style).toContain('mso-line-height-alt:21px');
      expect(style).toContain('mso-line-height-rule:exactly');
      expect(style).toContain('word-break:normal');
    }
  });

  it.each([
    ['none', [[], [], [], []]],
    ['rows', [[], ['top'], ['top'], ['top']]],
    ['framed', [['top', 'left'], ['top', 'left'], ['top', 'left'], ['top', 'bottom', 'left']]],
    ['grid', [['top', 'right', 'bottom', 'left'], ['top', 'right', 'bottom', 'left'], ['top', 'right', 'bottom', 'left'], ['top', 'right', 'bottom', 'left']]],
  ])('draws %s borders', (borderStyle, firstColumnSides) => {
    const rows = cellsOf(dataTable(render({ rows: FEES, borderStyle, borderColor: '#D0D5DD' }))!);
    const sides = rows.map(([cell]) =>
      ['top', 'right', 'bottom', 'left'].filter((side) => cell.getAttribute('style')!.includes(`border-${side}:1px solid #D0D5DD`))
    );
    expect(sides).toEqual(firstColumnSides);
  });

  it('fills the header and every second body row', () => {
    const rows = cellsOf(dataTable(render({ rows: FEES, headerBackgroundColor: '#F2F4F7', stripeColor: '#F9FAFB' }))!);
    expect(rows.map(([cell]) => cell.getAttribute('bgColor'))).toEqual(['#F2F4F7', null, '#F9FAFB', null]);
    expect(rows[2][1].style.backgroundColor).toBeTruthy();
  });

  it('uses the header text colour for header cells only', () => {
    const rows = cellsOf(dataTable(render({ rows: FEES, headerTextColor: '#FFFFFF', headerBackgroundColor: '#175CD3' }))!);
    expect(rows[0][0].getAttribute('style')).toContain('color:#FFFFFF');
    expect(rows[1][0].getAttribute('style')).toContain('color:#262626');
  });

  it('keeps merge tokens and line breaks in plain cells', () => {
    const table = dataTable(render({ rows: [['Name', '{{RecipientFullName}}'], ['Address', '{{Line1}}\n{{Postcode}}']], headerRow: false }))!;
    const rows = cellsOf(table);
    expect(rows[0][1].innerHTML).toBe('{{RecipientFullName}}');
    expect(rows[1][1].innerHTML).toBe('{{Line1}}<br>{{Postcode}}');
  });

  it('does not format plain cells as markdown', () => {
    const rows = cellsOf(dataTable(render({ rows: [['**Fee**', '[x](https://example.org)']] , headerRow: false }))!);
    expect(rows[0][0].innerHTML).toBe('**Fee**');
    expect(rows[0][1].querySelector('a')).toBeNull();
  });

  it('renders markdown cells inline, with the layout link colour and merge tokens kept', () => {
    const html = render({
      rows: [['**Renew** {{RecipientRegistrationNumber}}', '[Guidance](https://example.org/?ref={{RecipientRegistrationNumber}}) <img src=x onerror=alert(1)>']],
      headerRow: false,
      markdown: true,
    });
    const [first, second] = cellsOf(dataTable(html)!)[0];
    expect(first.innerHTML).toBe('<strong>Renew</strong> {{RecipientRegistrationNumber}}');
    const link = second.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('https://example.org/?ref={{RecipientRegistrationNumber}}');
    expect(link.getAttribute('style')).toContain('color:#0000EE');
    expect(second.querySelector('img')).toBeNull();
    expect(second.querySelector('p')).toBeNull();
  });

  it('breaks a token too wide for its column, and links a too-wide bare URL first', () => {
    const url = 'https://portal.example.org/profile/details/personal-information-and-contact-preferences';
    const html = render({ rows: [['Step', 'Link'], ['1', url]], columns: [{ width: 80 }, null] });
    const cell = cellsOf(dataTable(html)!)[1][1];
    expect(cell.innerHTML).toContain('<wbr>');
    expect(cell.querySelector('a')?.getAttribute('href')).toBe(url);
  });

  it('does not break words that fit their column, even in a tight one', () => {
    const html = render({ rows: [['Item', 'Qty', 'Price'], ['Gadget with a long name that has to wrap onto more lines than one', '10', '£120.00']], cellPadding: { vertical: 4, horizontal: 0 } });
    expect(html).not.toContain(BREAK_OPPORTUNITY);
  });

  it('gives links on a dark background the text colour', () => {
    const html = render(
      { rows: [['[Contact us](https://example.org/contact)']], headerRow: false, markdown: true },
      { backgroundColor: '#101828', color: '#D0D5DD' }
    );
    expect(cellsOf(dataTable(html)!)[0][0].querySelector('a')!.getAttribute('style')).toContain('color:#D0D5DD');
  });

  it('fills an empty cell with a no-break space so its row keeps its height', () => {
    const rows = cellsOf(dataTable(render({ rows: [['Total', ''], ['x', 'y']] }))!);
    expect(rows[0][1].textContent).toBe(' ');
  });

  it('pads ragged rows with empty cells', () => {
    const rows = cellsOf(dataTable(render({ rows: [['a', 'b', 'c'], ['d']] }))!);
    expect(rows.map((row) => row.length)).toEqual([3, 3]);
  });

  it('exports nothing for a table without text', () => {
    const html = render({ rows: [['', ' '], ['', '']] }, { backgroundColor: '#ABCDEF' });
    expect(dataTable(html)).toBeNull();
    expect(html).not.toContain('#ABCDEF');
  });
});

describe('Table block schema', () => {
  it('keeps every Table setting through a parse', () => {
    const block = {
      type: 'Table',
      data: {
        style: { padding: P, fontSize: 14, color: '#475467', backgroundColor: '#FFFFFF', fontFamily: 'BOOK_SERIF' },
        props: {
          rows: FEES,
          columns: [null, { align: 'right', width: 30 }],
          headerRow: true,
          headerColumn: false,
          markdown: true,
          borderStyle: 'framed',
          borderColor: '#D0D5DD',
          headerBackgroundColor: '#F2F4F7',
          headerTextColor: '#101828',
          stripeColor: '#F9FAFB',
          cellPadding: { vertical: 6, horizontal: 10 },
        },
      },
    };
    const res = ReaderBlockSchema.safeParse(block);
    expect(res.success).toBe(true);
    expect(res.data).toEqual(block);
  });

  it('rejects an unknown border style', () => {
    expect(ReaderBlockSchema.safeParse({ type: 'Table', data: { props: { rows: FEES, borderStyle: 'dotted' } } }).success).toBe(false);
  });
});
