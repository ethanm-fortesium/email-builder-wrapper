// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TEditorConfiguration } from '../../documents/editor/core.js';
import { getEditorState, loadDocument, resetDocument, setDocument } from '../../documents/editor/EditorContext.js';

import StylesPanel from './StylesPanel.js';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const layout = (data: Record<string, unknown>) =>
  ({ root: { type: 'EmailLayout', data: { childrenIds: [], ...data } } }) as unknown as TEditorConfiguration;

let root: Root | null = null;
let container: HTMLDivElement;

async function renderPanel() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<StylesPanel />);
  });
}

/** The buttons next to a colour control's label: open, plus reset when a colour is set. */
function colourButtons(label: string) {
  const el = Array.from(container.querySelectorAll('label')).find((l) => l.textContent === label);
  expect(el, `${label} label`).toBeDefined();
  return Array.from(el!.nextElementSibling!.querySelectorAll('button'));
}

describe('StylesPanel', () => {
  const initialDocument = getEditorState().document;

  beforeEach(() => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 32, 32));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    act(() => root?.unmount());
    root = null;
    container.remove();
    resetDocument(initialDocument);
  });

  it('shows the settings of a newly loaded document, not the previous one', async () => {
    loadDocument(layout({}));
    await renderPanel();
    expect(colourButtons('Link colour')).toHaveLength(1);
    expect(container.textContent).toContain('0px');

    await act(async () => {
      loadDocument(layout({ linkColor: '#175CD3', borderColor: '#D0D5DD', borderRadius: 12 }));
    });
    expect(colourButtons('Link colour')).toHaveLength(2);
    expect(colourButtons('Canvas border colour')).toHaveLength(2);
    expect(container.textContent).toContain('12px');
  });

  it('keeps its inputs while the user edits the document', async () => {
    loadDocument(layout({ borderRadius: 12 }));
    await renderPanel();
    const slider = container.querySelector('input[type="range"]');
    await act(async () => {
      setDocument(layout({ borderRadius: 12, linkColor: '#175CD3' }));
    });
    // Same panel instance: an edit does not remount the inputs.
    expect(container.querySelector('input[type="range"]')).toBe(slider);
  });
});
