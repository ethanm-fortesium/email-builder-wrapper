import { MAX_TABLE_COLUMNS, MAX_TABLE_ROWS, TableColumn } from './TablePropsSchema.js';
import { normaliseRows } from './tableGeometry.js';

// Grid edits for the Table block's sidebar editor. Every function returns a new table and keeps
// the per-column settings lined up with the cells, so an inserted, moved or removed column takes
// its alignment and width with it. A table always keeps at least one row and one column.

export type TableCells = {
  rows: string[][];
  columns: (TableColumn | null)[];
};

/**
 * The block's rows as a rectangular grid (at least 1x1) with one settings entry per column.
 *
 * @param rows - Cell text by row, as stored (may be ragged, null or undefined).
 * @param columns - Per-column settings, as stored.
 */
export function tableCells(rows: readonly (readonly string[])[] | null | undefined, columns?: readonly (TableColumn | null)[] | null): TableCells {
  let grid = normaliseRows(rows);
  if (grid.length === 0) {
    grid = [['']];
  } else if (grid[0].length === 0) {
    grid = grid.map(() => ['']);
  }
  return { rows: grid, columns: grid[0].map((_, c) => columns?.[c] ?? null) };
}

const emptyRow = (table: TableCells) => table.columns.map(() => '');

function move<T>(list: readonly T[], from: number, to: number) {
  const copy = [...list];
  if (from < 0 || from >= copy.length || to < 0 || to >= copy.length) {
    return copy;
  }
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function setCell(table: TableCells, row: number, column: number, value: string): TableCells {
  return { ...table, rows: table.rows.map((cells, r) => (r === row ? cells.map((cell, c) => (c === column ? value : cell)) : cells)) };
}

/** Insert an empty row before `index` (the row count when appending). */
export function insertRow(table: TableCells, index: number): TableCells {
  if (table.rows.length >= MAX_TABLE_ROWS) {
    return table;
  }
  const rows = [...table.rows];
  rows.splice(Math.max(0, Math.min(index, rows.length)), 0, emptyRow(table));
  return { ...table, rows };
}

export function removeRow(table: TableCells, index: number): TableCells {
  if (table.rows.length <= 1) {
    return { ...table, rows: [emptyRow(table)] };
  }
  return { ...table, rows: table.rows.filter((_, r) => r !== index) };
}

export function moveRow(table: TableCells, from: number, to: number): TableCells {
  return { ...table, rows: move(table.rows, from, to) };
}

/** Insert an empty column before `index` (the column count when appending). */
export function insertColumn(table: TableCells, index: number): TableCells {
  if (table.columns.length >= MAX_TABLE_COLUMNS) {
    return table;
  }
  const at = Math.max(0, Math.min(index, table.columns.length));
  const insert = <T>(list: readonly T[], item: T) => [...list.slice(0, at), item, ...list.slice(at)];
  return { rows: table.rows.map((cells) => insert(cells, '')), columns: insert(table.columns, null) };
}

export function removeColumn(table: TableCells, index: number): TableCells {
  if (table.columns.length <= 1) {
    return { rows: table.rows.map(() => ['']), columns: [null] };
  }
  return { rows: table.rows.map((cells) => cells.filter((_, c) => c !== index)), columns: table.columns.filter((_, c) => c !== index) };
}

export function moveColumn(table: TableCells, from: number, to: number): TableCells {
  return { rows: table.rows.map((cells) => move(cells, from, to)), columns: move(table.columns, from, to) };
}

/** Change one column's settings (a null value clears that setting). */
export function setColumn(table: TableCells, index: number, patch: Partial<TableColumn>): TableCells {
  return { ...table, columns: table.columns.map((column, c) => (c === index ? { ...column, ...patch } : column)) };
}

/**
 * Whether pasted clipboard content is spreadsheet cells (Excel, Google Sheets, a table copied
 * from a web page or Word) rather than text for the focused cell: it comes with an HTML table,
 * holds tabs, or ends in a line break (Excel ends every copy, even of one cell, with one).
 */
export function isClipboardGrid(text: string, html = '') {
  return /<table[\s>]/i.test(html) || text.includes('\t') || /[\r\n]$/.test(text);
}

/**
 * Parse spreadsheet clipboard text: cells separated by tabs, rows by line breaks, and cells
 * holding tabs, line breaks or quotes wrapped in double quotes (with quotes doubled), as Excel
 * and Google Sheets copy them. The line break after the last row is dropped.
 */
export function parseClipboardGrid(text: string): string[][] {
  const s = text.replace(/\r\n?/g, '\n');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let fieldStart = true;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"' && fieldStart) {
      quoted = true;
      fieldStart = false;
    } else if (ch === '\t' || ch === '\n') {
      row.push(field);
      field = '';
      fieldStart = true;
      if (ch === '\n') {
        rows.push(row);
        row = [];
      }
    } else {
      field += ch;
      fieldStart = false;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Write pasted cells into the table with their top-left cell at (row, column), adding rows
 * and columns as needed up to the table limits (cells beyond them are dropped).
 */
export function pasteGrid(table: TableCells, row: number, column: number, grid: readonly (readonly string[])[]): TableCells {
  const pastedWidth = Math.max(0, ...grid.map((cells) => cells.length));
  const width = Math.min(MAX_TABLE_COLUMNS, Math.max(table.columns.length, column + pastedWidth));
  const height = Math.min(MAX_TABLE_ROWS, Math.max(table.rows.length, row + grid.length));
  const rows = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => {
      const pasted = grid[r - row]?.[c - column];
      return r >= row && c >= column && pasted !== undefined ? pasted : table.rows[r]?.[c] ?? '';
    })
  );
  return { rows, columns: Array.from({ length: width }, (_, c) => table.columns[c] ?? null) };
}
