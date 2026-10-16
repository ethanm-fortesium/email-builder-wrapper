// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  INSPECTOR_DRAWER_WIDTH,
  clampInspectorDrawerWidth,
  getEditorState,
  setInspectorDrawerWidth,
} from '../../documents/editor/EditorContext.js';

import InspectorDrawer from './index.js';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const STORAGE_KEY = 'emailBuilder.inspectorDrawerWidth';

let root: Root | null = null;
let container: HTMLDivElement;

/** Render the drawer in a container `containerWidth` px wide. */
async function renderDrawer(containerWidth = 1400) {
  container = document.createElement('div');
  document.body.appendChild(container);
  vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, containerWidth, 900));
  root = createRoot(container);
  await act(async () => {
    root!.render(<InspectorDrawer apiBaseUrl="" />);
  });
}

const handle = () => container.querySelector<HTMLElement>('[role="separator"]')!;
const width = () => getEditorState().inspectorDrawerWidth;

function pointer(type: string, clientX: number) {
  act(() => {
    handle().dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX, button: 0, pointerId: 1 }));
  });
}

function key(key: string, shiftKey = false) {
  act(() => {
    handle().dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, shiftKey }));
  });
}

describe('inspector drawer width', () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setInspectorDrawerWidth(INSPECTOR_DRAWER_WIDTH.default, { persist: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    act(() => root?.unmount());
    root = null;
    container?.remove();
    window.localStorage.removeItem(STORAGE_KEY);
    setInspectorDrawerWidth(INSPECTOR_DRAWER_WIDTH.default, { persist: false });
  });

  it('clamps widths to whole px within the draggable range', () => {
    expect(clampInspectorDrawerWidth(100)).toBe(INSPECTOR_DRAWER_WIDTH.min);
    expect(clampInspectorDrawerWidth(5000)).toBe(INSPECTOR_DRAWER_WIDTH.max);
    expect(clampInspectorDrawerWidth(480.6)).toBe(481);
    expect(clampInspectorDrawerWidth(700, 500)).toBe(500);
    expect(clampInspectorDrawerWidth(700, 100)).toBe(INSPECTOR_DRAWER_WIDTH.min);
  });

  it('remembers the width in this browser unless asked not to', () => {
    setInspectorDrawerWidth(400, { persist: false });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    setInspectorDrawerWidth(480);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('480');
  });

  it('widens as its edge is dragged left, and remembers the width on release', async () => {
    await renderDrawer();
    expect(handle().getAttribute('aria-valuenow')).toBe('320');

    pointer('pointerdown', 1080);
    expect(getEditorState().inspectorDrawerResizing).toBe(true);
    pointer('pointermove', 880);
    expect(width()).toBe(520);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(handle().getAttribute('aria-valuenow')).toBe('520');

    pointer('pointerup', 880);
    expect(getEditorState().inspectorDrawerResizing).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('520');
  });

  it('leaves the canvas room when dragged far left, and never gets narrower than the default', async () => {
    await renderDrawer(1000);
    pointer('pointerdown', 680);
    pointer('pointermove', 0);
    expect(width()).toBe(1000 - 360);
    pointer('pointermove', 2000);
    expect(width()).toBe(INSPECTOR_DRAWER_WIDTH.min);
    pointer('pointerup', 2000);
  });

  it('ignores pointer moves when no drag is in progress', async () => {
    await renderDrawer();
    pointer('pointermove', 100);
    expect(width()).toBe(INSPECTOR_DRAWER_WIDTH.default);
  });

  it('resizes from the keyboard and resets on Enter or double-click', async () => {
    await renderDrawer();
    key('ArrowLeft');
    expect(width()).toBe(336);
    key('ArrowLeft', true);
    expect(width()).toBe(400);
    key('ArrowRight');
    expect(width()).toBe(384);
    key('End');
    expect(width()).toBe(INSPECTOR_DRAWER_WIDTH.max);
    key('Enter');
    expect(width()).toBe(INSPECTOR_DRAWER_WIDTH.default);

    setInspectorDrawerWidth(600);
    act(() => {
      handle().dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });
    expect(width()).toBe(INSPECTOR_DRAWER_WIDTH.default);
  });
});
