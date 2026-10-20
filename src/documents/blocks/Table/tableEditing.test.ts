import { describe, expect, it } from 'vitest';

import { MAX_TABLE_COLUMNS, MAX_TABLE_ROWS } from './TablePropsSchema.js';
import {
  TableCells,
  insertColumn,
  insertRow,
  isClipboardGrid,
  moveColumn,
  moveRow,
  parseClipboardGrid,
  pasteGrid,
  removeColumn,
  removeRow,
  setCell,
  setColumn,
  tableCells,
} from './tableEditing.js';

const TABLE: TableCells = {
  rows: [
    ['Fee', 'Amount'],
    ['Renewal', '£120'],
  ],
  columns: [null, { align: 'right' }],
};

describe('tableCells', () => {
  it('makes the stored rows rectangular, with one settings entry per column', () => {
    expect(tableCells([['a'], ['b', 'c']], [{ align: 'center' }, null, { width: 20 }])).toEqual({
      rows: [
        ['a', ''],
        ['b', 'c'],
      ],
      columns: [{ align: 'center' }, null],
    });
  });

  it('always has at least one cell', () => {
    expect(tableCells(null)).toEqual({ rows: [['']], columns: [null] });
    expect(tableCells([[], []])).toEqual({ rows: [[''], ['']], columns: [null] });
  });
});

describe('row and column edits', () => {
  it('sets one cell without touching the others', () => {
    const next = setCell(TABLE, 1, 0, 'Late');
    expect(next.rows).toEqual([
      ['Fee', 'Amount'],
      ['Late', '£120'],
    ]);
    expect(TABLE.rows[1][0]).toBe('Renewal');
  });

  it('inserts, moves and removes rows', () => {
    expect(insertRow(TABLE, 1).rows).toEqual([['Fee', 'Amount'], ['', ''], ['Renewal', '£120']]);
    expect(insertRow(TABLE, 2).rows).toEqual([['Fee', 'Amount'], ['Renewal', '£120'], ['', '']]);
    expect(moveRow(TABLE, 1, 0).rows).toEqual([['Renewal', '£120'], ['Fee', 'Amount']]);
    expect(moveRow(TABLE, 1, 2).rows).toEqual(TABLE.rows);
    expect(removeRow(TABLE, 0).rows).toEqual([['Renewal', '£120']]);
  });

  it('keeps one empty row when the last row is removed', () => {
    expect(removeRow({ rows: [['a', 'b']], columns: [null, null] }, 0).rows).toEqual([['', '']]);
  });

  it('moves column settings with their column', () => {
    expect(insertColumn(TABLE, 1)).toEqual({ rows: [['Fee', '', 'Amount'], ['Renewal', '', '£120']], columns: [null, null, { align: 'right' }] });
    expect(moveColumn(TABLE, 1, 0)).toEqual({ rows: [['Amount', 'Fee'], ['£120', 'Renewal']], columns: [{ align: 'right' }, null] });
    expect(removeColumn(TABLE, 0)).toEqual({ rows: [['Amount'], ['£120']], columns: [{ align: 'right' }] });
  });

  it('keeps one empty column when the last column is removed', () => {
    expect(removeColumn({ rows: [['a'], ['b']], columns: [{ width: 50 }] }, 0)).toEqual({ rows: [[''], ['']], columns: [null] });
  });

  it('changes one column setting, keeping the others', () => {
    expect(setColumn(TABLE, 1, { width: 30 }).columns).toEqual([null, { align: 'right', width: 30 }]);
    expect(setColumn(TABLE, 0, { align: 'center' }).columns).toEqual([{ align: 'center' }, { align: 'right' }]);
  });

  it('stops at the row and column limits', () => {
    const wide = tableCells([Array.from({ length: MAX_TABLE_COLUMNS }, () => 'x')]);
    expect(insertColumn(wide, 0)).toBe(wide);
    const tall = tableCells(Array.from({ length: MAX_TABLE_ROWS }, () => ['x']));
    expect(insertRow(tall, 0)).toBe(tall);
  });
});

describe('clipboard', () => {
  it('recognises spreadsheet cells', () => {
    expect(isClipboardGrid('a\tb')).toBe(true);
    expect(isClipboardGrid('only cell\r\n')).toBe(true); // Excel ends every copy with a line break
    expect(isClipboardGrid('x', '<html><body><table><tr><td>x</td></tr></table></body></html>')).toBe(true); // Google Sheets
    expect(isClipboardGrid('plain text')).toBe(false);
    expect(isClipboardGrid('two lines\nof text')).toBe(false);
  });

  it('parses tab-separated rows and drops the final line break', () => {
    expect(parseClipboardGrid('Fee\tAmount\r\nRenewal\t£120\r\n')).toEqual([
      ['Fee', 'Amount'],
      ['Renewal', '£120'],
    ]);
  });

  it('keeps empty cells and rows', () => {
    expect(parseClipboardGrid('a\t\tc\n\t\t\nd\n')).toEqual([['a', '', 'c'], ['', '', ''], ['d']]);
  });

  it('unquotes cells holding line breaks, tabs or quotes, as Excel and Google Sheets copy them', () => {
    expect(parseClipboardGrid('"Line 1\nLine 2"\t"Say ""hi"""\t"a\tb"\r\nnext\t"x"\r\n')).toEqual([
      ['Line 1\nLine 2', 'Say "hi"', 'a\tb'],
      ['next', 'x'],
    ]);
  });

  it('keeps quotes that do not open a cell', () => {
    expect(parseClipboardGrid('5" screen\tok')).toEqual([['5" screen', 'ok']]);
  });

  it('pastes into the table from the focused cell, growing it as needed', () => {
    const next = pasteGrid(TABLE, 1, 1, [
      ['£160', 'note'],
      ['£40', ''],
    ]);
    expect(next).toEqual({
      rows: [
        ['Fee', 'Amount', ''],
        ['Renewal', '£160', 'note'],
        ['', '£40', ''],
      ],
      columns: [null, { align: 'right' }, null],
    });
  });

  it('drops pasted cells beyond the table limits', () => {
    const grid = [Array.from({ length: MAX_TABLE_COLUMNS + 3 }, (_, i) => String(i))];
    const next = pasteGrid(TABLE, 0, 0, grid);
    expect(next.columns).toHaveLength(MAX_TABLE_COLUMNS);
    expect(next.rows[0]).toEqual(grid[0].slice(0, MAX_TABLE_COLUMNS));
  });
});
