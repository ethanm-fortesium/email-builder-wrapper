// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import renderEmail from '../../../renderers/renderToStaticMarkup.js';
import type { TReaderDocument } from '../../../Reader/core.js';
import type { TEditorConfiguration } from '../../editor/core.js';
import EditorBlock from '../../editor/EditorBlock.js';
import { getEditorState, resetDocument } from '../../editor/EditorContext.js';

import { dimColor } from './SignatureMarkup.js';

// Server rendering reads a zustand store's initial state (its server snapshot); make the canvas read
// the editor store's current document, as it does in the browser.
vi.mock('../../editor/EditorContext.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../editor/EditorContext.js')>();
  return { ...actual, useDocument: () => actual.getEditorState().document };
});

const CANVAS = '#FFFFFF';
const DARK = '#1D2939';
const TINT = '#EFF8FF';
const PADDING = { top: 16, right: 24, bottom: 16, left: 24 };

/** A white-text signature with a disclaimer (the disclaimer is dimmed against what is behind it). */
const signature = (style: Record<string, unknown> = {}) => ({
  type: 'Signature',
  data: { style: { color: '#FFFFFF', padding: PADDING, ...style }, props: { fullName: 'Alex Example', disclaimerHtml: '<p>Confidential.</p>' } },
});

const layout = (childrenIds: string[]) => ({
  type: 'EmailLayout',
  data: { canvasColor: CANVAS, textColor: '#262626', fontFamily: 'MODERN_SANS', childrenIds },
});

/** The colour of the disclaimer cell in the given markup. */
function disclaimerColor(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const cell = Array.from(doc.querySelectorAll('td')).find((td) => td.firstElementChild?.textContent === 'Confidential.');
  return (cell as HTMLElement | undefined)?.style.color;
}

/** Load the document and return the disclaimer colour on the canvas and in the export. */
function disclaimerColors(document: Record<string, unknown>) {
  resetDocument(document as unknown as TEditorConfiguration);
  return {
    canvas: disclaimerColor(renderToStaticMarkup(<EditorBlock id="sig" />)),
    exported: disclaimerColor(renderEmail(document as unknown as TReaderDocument, { rootBlockId: 'root' }).replace(/\n/g, ' ')),
  };
}

describe('SignatureEditor – disclaimer dimmed against the background behind it', () => {
  const initialDocument = getEditorState().document;

  afterEach(() => {
    resetDocument(initialDocument);
  });

  it('uses the canvas colour for a signature directly on the canvas', () => {
    const { canvas, exported } = disclaimerColors({ root: layout(['sig']), sig: signature() });
    expect(canvas).toBe(dimColor('#FFFFFF', CANVAS));
    expect(canvas).toBe(exported);
  });

  it("uses the enclosing Container's background", () => {
    const { canvas, exported } = disclaimerColors({
      root: layout(['box']),
      box: { type: 'Container', data: { style: { backgroundColor: DARK, padding: PADDING }, props: { childrenIds: ['sig'] } } },
      sig: signature(),
    });
    expect(canvas).toBe(dimColor('#FFFFFF', DARK));
    expect(canvas).toBe(exported);
  });

  it("looks past a Container without a background to the enclosing ColumnsContainer's", () => {
    const { canvas, exported } = disclaimerColors({
      root: layout(['columns']),
      columns: {
        type: 'ColumnsContainer',
        data: {
          style: { backgroundColor: DARK, padding: PADDING },
          props: { columnsCount: 2, columns: [{ childrenIds: [] }, { childrenIds: ['box'] }, { childrenIds: [] }] },
        },
      },
      box: { type: 'Container', data: { style: { padding: PADDING }, props: { childrenIds: ['sig'] } } },
      sig: signature(),
    });
    expect(canvas).toBe(dimColor('#FFFFFF', DARK));
    expect(canvas).toBe(exported);
  });

  it("prefers the signature's own background", () => {
    const { canvas, exported } = disclaimerColors({
      root: layout(['box']),
      box: { type: 'Container', data: { style: { backgroundColor: DARK }, props: { childrenIds: ['sig'] } } },
      sig: signature({ backgroundColor: TINT, color: '#1D2939' }),
    });
    expect(canvas).toBe(dimColor('#1D2939', TINT));
    expect(canvas).toBe(exported);
  });
});
