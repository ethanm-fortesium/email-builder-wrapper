// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import renderEmail from '../../../renderers/renderToStaticMarkup.js';
import type { TReaderDocument } from '../../../Reader/core.js';
import { EditorConfigurationSchema, type TEditorConfiguration } from '../../editor/core.js';
import EditorBlock from '../../editor/EditorBlock.js';
import { getEditorState, resetDocument } from '../../editor/EditorContext.js';
import { emailBoxWidth } from '../helpers/editorEmailBox.js';

// Server rendering reads a zustand store's initial state (its server snapshot); make the canvas read
// the editor store's current document, as it does in the browser.
vi.mock('../../editor/EditorContext.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../editor/EditorContext.js')>();
  return { ...actual, useDocument: () => actual.getEditorState().document };
});

const P = { top: 16, right: 24, bottom: 16, left: 24 };

const table = (props: Record<string, unknown> = {}) => ({
  type: 'Table',
  data: {
    style: { padding: P, fontSize: 14 },
    props: {
      rows: [
        ['Fee', 'When', 'Amount'],
        ['Annual renewal', 'By 31 October', '£120.00'],
        ['Restoration to the register', 'Any time', '£250.00'],
      ],
      columns: [null, null, { align: 'right' }],
      headerBackgroundColor: '#F2F4F7',
      ...props,
    },
  },
});

/** A table in the second column of a padded 2-column row, inside a bordered, padded container. */
const nested = (tableBlock: Record<string, unknown>) => ({
  root: { type: 'EmailLayout', data: { canvasWidth: 640, borderColor: '#D0D5DD', fontFamily: 'MODERN_SANS', childrenIds: ['box'] } },
  box: { type: 'Container', data: { style: { padding: { top: 8, right: 20, bottom: 8, left: 20 }, borderColor: '#EAECF0' }, props: { childrenIds: ['cols'] } } },
  cols: {
    type: 'ColumnsContainer',
    data: {
      style: { padding: { top: 0, right: 10, bottom: 0, left: 10 } },
      props: { columnsCount: 2, columnsGap: 16, fixedWidths: [200, null, null], columns: [{ childrenIds: [] }, { childrenIds: ['t'] }, { childrenIds: [] }] },
    },
  },
  t: tableBlock,
});

/** The data table's cell attributes in some HTML: [tag, width attribute, CSS width] per cell. */
function cells(html: string) {
  const doc = new DOMParser().parseFromString(html.replace(/\n/g, ' '), 'text/html');
  const dataTable = Array.from(doc.querySelectorAll('table')).find((t) => t.getAttribute('role') !== 'presentation');
  return Array.from(dataTable?.querySelectorAll('th,td') ?? []).map((cell) => [cell.tagName, cell.getAttribute('width'), (cell as HTMLElement).style.width]);
}

function canvasAndExport(document: Record<string, unknown>) {
  resetDocument(document as unknown as TEditorConfiguration);
  return {
    canvas: renderToStaticMarkup(<EditorBlock id="t" />),
    exported: renderEmail(document as unknown as TReaderDocument, { rootBlockId: 'root' }),
  };
}

describe('TableEditor', () => {
  const initialDocument = getEditorState().document;

  afterEach(() => {
    resetDocument(initialDocument);
  });

  it('shows the exported columns for a table directly on the canvas', () => {
    const { canvas, exported } = canvasAndExport({ root: { type: 'EmailLayout', data: { childrenIds: ['t'] } }, t: table() });
    expect(cells(canvas)).toHaveLength(9);
    expect(cells(canvas)).toEqual(cells(exported));
  });

  it('lays the table out for the width it gets in the export inside containers and columns', () => {
    const document = nested(table({ columns: [{ width: 30 }, null, { align: 'right' }] }));
    const { canvas, exported } = canvasAndExport(document);
    expect(cells(canvas)).toEqual(cells(exported));
  });

  it('shows a placeholder for a table without text (the export renders nothing)', () => {
    const { canvas, exported } = canvasAndExport({ root: { type: 'EmailLayout', data: { childrenIds: ['t'] } }, t: table({ rows: [['', '']] }) });
    expect(canvas).toContain('Table (empty)');
    expect(cells(exported)).toEqual([]);
  });

  it('is part of the editor document schema', () => {
    const block = table({ borderStyle: 'grid', cellPadding: { vertical: 4, horizontal: 8 }, stripeColor: '#F9FAFB' });
    const res = EditorConfigurationSchema.safeParse({ t: block });
    expect(res.success).toBe(true);
    expect(res.data?.t).toEqual(block);
  });
});

describe('emailBoxWidth', () => {
  it('is the canvas width less its border for a block on the canvas', () => {
    const document = { root: { type: 'EmailLayout', data: { canvasWidth: 640, borderColor: '#D0D5DD', childrenIds: ['t'] } }, t: table() };
    expect(emailBoxWidth(document as unknown as TEditorConfiguration, 't')).toBe(638);
  });

  it('narrows the width through containers and columns as the readers do', () => {
    // 638 canvas content - 2x20 padding - 2x1 border = 596; - 2x10 padding = 576 for the columns;
    // the fixed 200px first column and the 16px gap leave 576 - 200 - 16 = 360 for the second.
    expect(emailBoxWidth(nested(table()) as unknown as TEditorConfiguration, 't')).toBe(360);
  });
});
