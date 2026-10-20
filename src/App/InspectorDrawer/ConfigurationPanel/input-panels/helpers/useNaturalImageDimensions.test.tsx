// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TNaturalDimensions } from '../../../../../documents/blocks/helpers/imageDimensions.js';
import { probeImageDimensions } from '../../../../../documents/blocks/helpers/imageDimensions.js';
import type { TEditorConfiguration } from '../../../../../documents/editor/core.js';
import {
  getEditorState,
  resetDocument,
  setBackgroundUpdateScheduler,
  setDocument,
  setSelectedBlockId,
  TDocumentCommit,
  useDocument,
} from '../../../../../documents/editor/EditorContext.js';

import useNaturalImageDimensions, { URL_CHANGE_DEBOUNCE_MS } from './useNaturalImageDimensions.js';

vi.mock('../../../../../documents/blocks/helpers/imageDimensions.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../documents/blocks/helpers/imageDimensions.js')>();
  return { ...actual, probeImageDimensions: vi.fn() };
});

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// ---------------------------------------------------------------------------
// Harness: behaves like the Image sidebar panel for block "img"
// ---------------------------------------------------------------------------

function Harness() {
  const props = ((useDocument().img?.data as any)?.props ?? {}) as Record<string, any>;
  useNaturalImageDimensions(props.url, Boolean(props.naturalWidth && props.naturalHeight));
  return null;
}

function imgProps(): Record<string, unknown> {
  return ((getEditorState().document.img?.data as any)?.props ?? {}) as Record<string, unknown>;
}

function setImgProps(props: Record<string, unknown>) {
  setDocument({ img: { type: 'Image', data: { props } } } as unknown as TEditorConfiguration);
}

const probe = vi.mocked(probeImageDimensions);
let pending: Map<string, (d: TNaturalDimensions | null) => void>;
let root: Root;
let backgroundCommits: number;

async function release(url: string, d: TNaturalDimensions | null) {
  await act(async () => {
    pending.get(url)?.(d);
  });
}

async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

async function mount(props: Record<string, unknown>) {
  resetDocument({
    root: { type: 'EmailLayout', data: { childrenIds: ['img'] } },
    img: { type: 'Image', data: { props } },
  } as unknown as TEditorConfiguration);
  setSelectedBlockId('img');
  root = createRoot(document.createElement('div'));
  await act(async () => {
    root.render(<Harness />);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  pending = new Map();
  probe.mockReset();
  probe.mockImplementation((url: string) => new Promise((resolve) => pending.set(url, resolve)));
  backgroundCommits = 0;
  setBackgroundUpdateScheduler(() => {
    const commit: TDocumentCommit = (apply) => {
      backgroundCommits += 1;
      apply();
    };
    return commit;
  });
});

afterEach(() => {
  act(() => root.unmount());
  setBackgroundUpdateScheduler(null);
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useNaturalImageDimensions', () => {
  it('backfills a missing size on open, as a background (non-user) update', async () => {
    await mount({ url: 'https://cdn.test/a.png' });
    await advance(0);
    expect(probe).toHaveBeenCalledWith('https://cdn.test/a.png');

    await release('https://cdn.test/a.png', { naturalWidth: 100, naturalHeight: 50 });
    expect(imgProps()).toMatchObject({ naturalWidth: 100, naturalHeight: 50 });
    expect(backgroundCommits).toBe(1);
  });

  it('does not probe an image whose size is already recorded', async () => {
    await mount({ url: 'https://cdn.test/a.png', naturalWidth: 100, naturalHeight: 50 });
    await advance(URL_CHANGE_DEBOUNCE_MS * 2);
    expect(probe).not.toHaveBeenCalled();
  });

  it('probes a changed URL after the debounce, as part of the user edit', async () => {
    await mount({ url: 'https://cdn.test/a.png', naturalWidth: 100, naturalHeight: 50 });
    await act(async () => setImgProps({ url: 'https://cdn.test/b.png', naturalWidth: null, naturalHeight: null }));

    await advance(URL_CHANGE_DEBOUNCE_MS - 1);
    expect(probe).not.toHaveBeenCalled();
    await advance(1);
    expect(probe).toHaveBeenCalledWith('https://cdn.test/b.png');

    await release('https://cdn.test/b.png', { naturalWidth: 30, naturalHeight: 20 });
    expect(imgProps()).toMatchObject({ url: 'https://cdn.test/b.png', naturalWidth: 30, naturalHeight: 20 });
    expect(backgroundCommits).toBe(0);
  });

  it('only probes the last of several quick URL changes (typing)', async () => {
    await mount({ url: 'https://cdn.test/a.png', naturalWidth: 100, naturalHeight: 50 });
    await act(async () => setImgProps({ url: 'https://cdn.test/b' }));
    await advance(100);
    await act(async () => setImgProps({ url: 'https://cdn.test/b.png' }));
    await advance(URL_CHANGE_DEBOUNCE_MS);

    expect(probe).toHaveBeenCalledTimes(1);
    expect(probe).toHaveBeenCalledWith('https://cdn.test/b.png');
  });

  it('ignores a probe result that arrives after the URL changed again', async () => {
    await mount({ url: 'https://cdn.test/a.png', naturalWidth: 100, naturalHeight: 50 });
    await act(async () => setImgProps({ url: 'https://cdn.test/b.png' }));
    await advance(URL_CHANGE_DEBOUNCE_MS);
    await act(async () => setImgProps({ url: 'https://cdn.test/c.png' }));
    await advance(URL_CHANGE_DEBOUNCE_MS);

    await release('https://cdn.test/c.png', { naturalWidth: 7, naturalHeight: 8 });
    await release('https://cdn.test/b.png', { naturalWidth: 1, naturalHeight: 2 }); // stale, resolves last
    expect(imgProps()).toMatchObject({ url: 'https://cdn.test/c.png', naturalWidth: 7, naturalHeight: 8 });
  });

  it('clears the recorded size when the new image fails to load', async () => {
    await mount({ url: 'https://cdn.test/a.png', naturalWidth: 100, naturalHeight: 50 });
    await act(async () => setImgProps({ url: 'https://cdn.test/broken.png', naturalWidth: 100, naturalHeight: 50 }));
    await advance(URL_CHANGE_DEBOUNCE_MS);
    await release('https://cdn.test/broken.png', null);
    expect(imgProps()).toMatchObject({ naturalWidth: null, naturalHeight: null });
  });

  it('clears the recorded size when the URL is cleared', async () => {
    await mount({ url: 'https://cdn.test/a.png', naturalWidth: 100, naturalHeight: 50 });
    await act(async () => setImgProps({ url: '', naturalWidth: 100, naturalHeight: 50 }));
    expect(probe).not.toHaveBeenCalled();
    expect(imgProps()).toMatchObject({ naturalWidth: null, naturalHeight: null });
  });

  it('still records the size if the panel closes before the probe resolves', async () => {
    await mount({ url: 'https://cdn.test/a.png' });
    await advance(0);
    act(() => root.unmount());
    root = createRoot(document.createElement('div'));

    await release('https://cdn.test/a.png', { naturalWidth: 100, naturalHeight: 50 });
    expect(imgProps()).toMatchObject({ naturalWidth: 100, naturalHeight: 50 });
  });
});
