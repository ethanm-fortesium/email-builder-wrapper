// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EmailLayoutProps } from '../../../../documents/blocks/EmailLayout/EmailLayoutPropsSchema.js';
import { setDefaults, setHostEventDispatcher } from '../../../../documents/editor/EditorContext.js';

import EmailLayoutSidebarFields from './EmailLayoutSidebarPanel.js';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const LAYOUT: EmailLayoutProps = { canvasColor: '#FFFFFF', textColor: '#262626', childrenIds: ['a'] };

let root: Root | null = null;
let container: HTMLDivElement;

async function renderFields(data: EmailLayoutProps) {
  const setData = vi.fn();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<EmailLayoutSidebarFields data={data} setData={setData} />);
  });
  return setData;
}

/** The open and reset buttons next to the "Link colour" label. */
function linkColourButtons() {
  const label = Array.from(container.querySelectorAll('label')).find((l) => l.textContent === 'Link colour');
  expect(label, 'Link colour label').toBeDefined();
  return Array.from(label!.nextElementSibling!.querySelectorAll('button'));
}

async function click(el: Element) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

/** Type a hex value into the open colour picker's text input. */
async function typeHex(value: string) {
  const input = document.body.querySelector<HTMLInputElement>('.MuiMenu-paper input')!;
  expect(input, 'picker hex input').not.toBeNull();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('EmailLayoutSidebarFields – link colour', () => {
  beforeEach(() => {
    // happy-dom has no layout; MUI's Menu wants an anchor with a size.
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 32, 32));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    act(() => root?.unmount());
    root = null;
    container.remove();
    document.body.innerHTML = '';
    setDefaults(null);
    setHostEventDispatcher(null);
  });

  it('shows an empty control when the email has no link colour', async () => {
    await renderFields(LAYOUT);
    const buttons = linkColourButtons();
    // Only the open button (with its + icon); no reset button.
    expect(buttons).toHaveLength(1);
    expect(buttons[0].querySelector('svg')).not.toBeNull();
  });

  it('sets the link colour from the picker, keeping the other layout fields', async () => {
    const setData = await renderFields(LAYOUT);
    await click(linkColourButtons()[0]);
    await typeHex('B42318');
    expect(setData).toHaveBeenLastCalledWith({ ...LAYOUT, linkColor: '#B42318' });
  });

  it('sets the link colour from a swatch', async () => {
    const setData = await renderFields(LAYOUT);
    await click(linkColourButtons()[0]);
    // The first preset swatch is #E11D48.
    const swatch = document.body.querySelector('.MuiMenu-paper .MuiButton-root')!;
    await click(swatch);
    expect(setData).toHaveBeenLastCalledWith({ ...LAYOUT, linkColor: '#E11D48' });
  });

  it('clears the link colour back to the default with the reset button', async () => {
    const setData = await renderFields({ ...LAYOUT, linkColor: '#B42318' });
    const buttons = linkColourButtons();
    expect(buttons).toHaveLength(2);
    await click(buttons[1]);
    expect(setData).toHaveBeenLastCalledWith({ ...LAYOUT, linkColor: null });
    expect(linkColourButtons()).toHaveLength(1);
  });

  it('never stores a shorthand hex value', async () => {
    const setData = await renderFields(LAYOUT);
    await click(linkColourButtons()[0]);
    // The picker passes #B42 on, but the layout schema only accepts six-digit colours.
    await typeHex('B42');
    expect(setData).not.toHaveBeenCalled();
  });

  it('leaves the link colour out of the saved layout default', async () => {
    const dispatch = vi.fn();
    setHostEventDispatcher(dispatch);
    await renderFields({ ...LAYOUT, linkColor: '#B42318' });
    const save = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Save layout as default')!;
    await click(save);
    expect(dispatch).toHaveBeenCalledTimes(1);
    const [name, detail] = dispatch.mock.calls[0];
    expect(name).toBe('emailBuilderSaveAsDefault');
    expect(detail.layout).not.toHaveProperty('linkColor');
  });
});
