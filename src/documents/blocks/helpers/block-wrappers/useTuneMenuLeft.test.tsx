// @vitest-environment happy-dom
import React, { act, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import useTuneMenuLeft, { TUNE_MENU_OFFSET } from './useTuneMenuLeft.js';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/** A menu inside a block inside a scroll area, as on the editor canvas. */
function Canvas() {
  const ref = useRef<HTMLDivElement>(null);
  const left = useTuneMenuLeft(ref);
  return (
    <div data-role="area" style={{ overflow: 'auto' }}>
      <div>
        <div data-role="block" style={{ position: 'relative' }}>
          <div ref={ref} data-role="menu" data-left={left} />
        </div>
      </div>
    </div>
  );
}

let root: Root | null = null;
let container: HTMLDivElement;
/** Room in px between the scroll area's left edge (at x = 100) and the block's. */
let room = 0;

async function render(initialRoom: number) {
  room = initialRoom;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const role = this.getAttribute('data-role');
    return new DOMRect(role === 'block' ? 100 + room : 100, 0, 600, 100);
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<Canvas />);
  });
}

const menuLeft = () => Number(container.querySelector('[data-role="menu"]')!.getAttribute('data-left'));

describe('useTuneMenuLeft', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    act(() => root?.unmount());
    root = null;
    container.remove();
  });

  it('keeps the menu outside the block when there is room to its left', async () => {
    await render(150);
    expect(menuLeft()).toBe(-TUNE_MENU_OFFSET);
  });

  it('moves the menu right just enough to stay inside the scroll area', async () => {
    await render(30);
    expect(menuLeft()).toBe(-26);
  });

  it('overlaps the block when the block touches the edge of the scroll area (a 900px canvas)', async () => {
    await render(0);
    expect(menuLeft()).toBe(0);
  });

  it('measures again when the window resizes', async () => {
    await render(150);
    room = 10;
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(menuLeft()).toBe(-6);
  });

  it('measures again when the scroll area scrolls', async () => {
    await render(0);
    room = 80;
    act(() => {
      container.querySelector('[data-role="area"]')!.dispatchEvent(new Event('scroll'));
    });
    expect(menuLeft()).toBe(-TUNE_MENU_OFFSET);
  });
});
