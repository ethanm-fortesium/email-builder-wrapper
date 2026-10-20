// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import type { TEditorConfiguration } from '../../editor/core.js';
import EditorBlock from '../../editor/EditorBlock.js';
import { getEditorState, resetDocument } from '../../editor/EditorContext.js';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const LINK_COLOR = '#0B6BCB';
const BUTTON_TEXT_COLOR = '#FFFFFF';

let root: Root | null = null;
let container: HTMLDivElement;

/** Render the editor canvas for a layout with a markdown link, a rich-text link and a button. */
async function renderCanvas(layout: Record<string, unknown>) {
  resetDocument({
    root: { type: 'EmailLayout', data: { canvasColor: '#FFFFFF', ...layout, childrenIds: ['text', 'rich', 'button'] } },
    text: { type: 'Text', data: { props: { markdown: true, text: 'See [our site](https://example.com).' } } },
    rich: { type: 'RichText', data: { props: { html: '<p>Read the <a href="https://example.com/terms">terms</a>.</p>' } } },
    button: { type: 'Button', data: { props: { text: 'Go', url: 'https://example.com', buttonTextColor: BUTTON_TEXT_COLOR } } },
  } as unknown as TEditorConfiguration);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<EditorBlock id="root" />);
  });
}

const link = (href: string) => container.querySelector<HTMLAnchorElement>(`a[href="${href}"]`)!;

describe('EmailLayoutEditor – link colour on the canvas', () => {
  const initialDocument = getEditorState().document;

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    container.remove();
    resetDocument(initialDocument);
  });

  it('shows markdown and rich-text links in the layout link colour', async () => {
    await renderCanvas({ linkColor: LINK_COLOR });
    expect(getComputedStyle(link('https://example.com')).color).toBe(LINK_COLOR);
    expect(getComputedStyle(link('https://example.com/terms')).color).toBe(LINK_COLOR);
  });

  it('keeps the colour a link sets itself (a button)', async () => {
    await renderCanvas({ linkColor: LINK_COLOR });
    const button = container.querySelector<HTMLAnchorElement>('a[target="_blank"][href="https://example.com"][style]')!;
    expect(button.textContent).toBe('Go');
    expect(getComputedStyle(button).color).toBe(BUTTON_TEXT_COLOR);
  });

  it('leaves the canvas unchanged without a link colour', async () => {
    await renderCanvas({});
    expect(container.querySelector('style')).toBeNull();
    // Nothing colours the link: it inherits the text colour (browsers show their default link colour).
    const markdownLink = link('https://example.com');
    expect(getComputedStyle(markdownLink).color).toBe(getComputedStyle(markdownLink.parentElement!).color);
  });
});

describe('EmailLayoutEditor – long words', () => {
  const initialDocument = getEditorState().document;

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    container.remove();
    resetDocument(initialDocument);
  });

  it('lets a word too long for the canvas wrap instead of stretching the canvas', async () => {
    await renderCanvas({});
    const cell = container.querySelector('table td')!;
    expect(getComputedStyle(cell).overflowWrap).toBe('anywhere');
  });
});
