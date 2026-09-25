// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TEditorBlock, TEditorConfiguration } from '../../editor/core.js';

import { parseClipboardPayload } from './blockClipboard.js';
import {
  applyProbedImageDimensions,
  collectImagesMissingDimensions,
  probeImageDimensions,
  probeMissingImageDimensions,
  PROBE_TIMEOUT_MS,
  TImageDimensionProbe,
  TNaturalDimensions,
} from './imageDimensions.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function block(type: string, props: Record<string, unknown>): TEditorBlock {
  return { type, data: { props, style: {} } } as unknown as TEditorBlock;
}

function propsOf(doc: TEditorConfiguration | null, id: string): Record<string, unknown> {
  return ((doc?.[id]?.data as any)?.props ?? {}) as Record<string, unknown>;
}

function legacyDocument(): TEditorConfiguration {
  return {
    root: {
      type: 'EmailLayout',
      data: { childrenIds: ['hero', 'sig', 'text', 'done', 'empty'] },
    },
    hero: block('Image', { url: 'https://cdn.test/hero.png', width: 600 }),
    sig: block('Signature', { fullName: 'Ada', logoUrl: 'https://cdn.test/logo.png', logoWidth: 140 }),
    text: block('Text', { text: 'Hello' }),
    done: block('Image', { url: 'https://cdn.test/done.png', naturalWidth: 10, naturalHeight: 20 }),
    empty: block('Image', { url: '' }),
  } as unknown as TEditorConfiguration;
}

const SIZES: Record<string, TNaturalDimensions> = {
  'https://cdn.test/hero.png': { naturalWidth: 1200, naturalHeight: 400 },
  'https://cdn.test/logo.png': { naturalWidth: 560, naturalHeight: 260 },
};

const mockProbe = () => vi.fn(async (url: string) => SIZES[url] ?? null);

/** The load-time backfill as EditorContext composes it: probe what is missing, then apply the results. */
async function backfill(doc: TEditorConfiguration, probe: TImageDimensionProbe) {
  return applyProbedImageDimensions(doc, await probeMissingImageDimensions(doc, probe));
}

// ---------------------------------------------------------------------------
// probeImageDimensions
// ---------------------------------------------------------------------------

type FakeImage = {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  onload: (() => void) | null;
  onerror: (() => void) | null;
};

describe('probeImageDimensions', () => {
  let created: FakeImage[];

  beforeEach(() => {
    created = [];
    vi.stubGlobal(
      'Image',
      class {
        src = '';
        naturalWidth = 0;
        naturalHeight = 0;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor() {
          created.push(this as unknown as FakeImage);
        }
      }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('resolves null for blank URLs without loading anything', async () => {
    expect(await probeImageDimensions('')).toBeNull();
    expect(await probeImageDimensions('   ')).toBeNull();
    expect(await probeImageDimensions(undefined as unknown as string)).toBeNull();
    expect(created).toHaveLength(0);
  });

  it('resolves the natural size once the image loads', async () => {
    const pending = probeImageDimensions(' https://cdn.test/a.png ');
    const img = created[0];
    expect(img.src).toBe('https://cdn.test/a.png');
    img.naturalWidth = 640;
    img.naturalHeight = 480;
    img.onload?.();
    expect(await pending).toEqual({ naturalWidth: 640, naturalHeight: 480 });
  });

  it('resolves null when the image fails to load', async () => {
    const pending = probeImageDimensions('https://cdn.test/broken.png');
    created[0].onerror?.();
    expect(await pending).toBeNull();
  });

  it('resolves null when the image has no intrinsic size', async () => {
    const pending = probeImageDimensions('https://cdn.test/sizeless.svg');
    created[0].onload?.();
    expect(await pending).toBeNull();
  });

  it('resolves null when the image does not load before the timeout', async () => {
    vi.useFakeTimers();
    const pending = probeImageDimensions('https://cdn.test/slow.png');
    vi.advanceTimersByTime(PROBE_TIMEOUT_MS);
    expect(await pending).toBeNull();
  });

  it('shares one load between concurrent probes of the same URL', async () => {
    const a = probeImageDimensions('https://cdn.test/shared.png');
    const b = probeImageDimensions('https://cdn.test/shared.png');
    expect(created).toHaveLength(1);
    created[0].naturalWidth = 3;
    created[0].naturalHeight = 4;
    created[0].onload?.();
    expect(await a).toEqual({ naturalWidth: 3, naturalHeight: 4 });
    expect(await b).toEqual({ naturalWidth: 3, naturalHeight: 4 });

    // Once settled, the next probe loads again (results are not cached).
    void probeImageDimensions('https://cdn.test/shared.png');
    expect(created).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// collectImagesMissingDimensions / probeMissingImageDimensions + applyProbedImageDimensions
// ---------------------------------------------------------------------------

describe('collectImagesMissingDimensions', () => {
  it('lists Image and Signature blocks with a URL but no recorded size', () => {
    expect(collectImagesMissingDimensions(legacyDocument())).toEqual([
      { blockId: 'hero', url: 'https://cdn.test/hero.png' },
      { blockId: 'sig', url: 'https://cdn.test/logo.png' },
    ]);
  });

  it('treats a half-recorded size as missing', () => {
    const doc = { a: block('Image', { url: 'https://cdn.test/a.png', naturalWidth: 10 }) } as TEditorConfiguration;
    expect(collectImagesMissingDimensions(doc)).toHaveLength(1);
  });
});

describe('probeMissingImageDimensions + applyProbedImageDimensions (load-time backfill)', () => {
  it('fills in the natural size of every image missing it', async () => {
    const probe = mockProbe();
    const doc = legacyDocument();
    const next = await backfill(doc, probe);

    expect(propsOf(next, 'hero')).toMatchObject({ width: 600, naturalWidth: 1200, naturalHeight: 400 });
    expect(propsOf(next, 'sig')).toMatchObject({ logoWidth: 140, logoNaturalWidth: 560, logoNaturalHeight: 260 });
    expect(propsOf(next, 'sig')).not.toHaveProperty('naturalWidth');

    // Blocks that did not need anything are passed through untouched.
    expect(next?.done).toBe(doc.done);
    expect(next?.text).toBe(doc.text);
    expect(next?.root).toBe(doc.root);
    expect(probe).toHaveBeenCalledTimes(2);
  });

  it('does not mutate the input document', async () => {
    const doc = legacyDocument();
    const snapshot = JSON.parse(JSON.stringify(doc));
    await backfill(doc, mockProbe());
    expect(doc).toEqual(snapshot);
  });

  it('returns null when every image already has its size', async () => {
    const probe = mockProbe();
    const doc = { done: legacyDocument().done } as TEditorConfiguration;
    expect(await backfill(doc, probe)).toBeNull();
    expect(probe).not.toHaveBeenCalled();
  });

  it('returns null when probes fail, leaving the images as they are', async () => {
    const probe = vi.fn(async () => null);
    expect(await probeMissingImageDimensions(legacyDocument(), probe)).toEqual([]);
    expect(await backfill(legacyDocument(), probe)).toBeNull();
  });

  it('treats a rejected probe like a failed one', async () => {
    const probe = vi.fn(async (url: string) => {
      if (url.endsWith('hero.png')) throw new Error('boom');
      return SIZES[url] ?? null;
    });
    const next = await backfill(legacyDocument(), probe);
    expect(propsOf(next, 'hero')).not.toHaveProperty('naturalWidth');
    expect(propsOf(next, 'sig')).toMatchObject({ logoNaturalWidth: 560 });
  });

  it('probes an image used by several blocks only once', async () => {
    const probe = mockProbe();
    const doc = {
      a: block('Image', { url: 'https://cdn.test/hero.png' }),
      b: block('Image', { url: 'https://cdn.test/hero.png' }),
    } as TEditorConfiguration;
    const next = await backfill(doc, probe);
    expect(probe).toHaveBeenCalledTimes(1);
    expect(propsOf(next, 'a')).toMatchObject({ naturalWidth: 1200, naturalHeight: 400 });
    expect(propsOf(next, 'b')).toMatchObject({ naturalWidth: 1200, naturalHeight: 400 });
  });
});

// ---------------------------------------------------------------------------
// applyProbedImageDimensions (stale results)
// ---------------------------------------------------------------------------

describe('applyProbedImageDimensions', () => {
  const size = { naturalWidth: 100, naturalHeight: 50 };

  it('ignores a result for a URL the block no longer shows', () => {
    const doc = { a: block('Image', { url: 'https://cdn.test/new.png' }) } as TEditorConfiguration;
    expect(applyProbedImageDimensions(doc, [{ blockId: 'a', url: 'https://cdn.test/old.png', dimensions: size }])).toBeNull();
  });

  it('ignores results for deleted blocks and non-image blocks', () => {
    const doc = { t: block('Text', { text: 'x' }) } as TEditorConfiguration;
    expect(
      applyProbedImageDimensions(doc, [
        { blockId: 'gone', url: 'https://cdn.test/a.png', dimensions: size },
        { blockId: 't', url: '', dimensions: size },
      ])
    ).toBeNull();
  });

  it('keeps other props, including edits made while the probe was running', () => {
    const doc = { a: block('Image', { url: 'https://cdn.test/a.png', alt: 'edited meanwhile' }) } as TEditorConfiguration;
    const next = applyProbedImageDimensions(doc, [{ blockId: 'a', url: 'https://cdn.test/a.png', dimensions: size }]);
    expect(propsOf(next, 'a')).toEqual({ url: 'https://cdn.test/a.png', alt: 'edited meanwhile', ...size });
  });

  it('clears a recorded size when the result is null (image failed to load / URL cleared)', () => {
    const doc = {
      a: block('Image', { url: 'https://cdn.test/a.png', ...size }),
      s: block('Signature', { logoUrl: null, logoNaturalWidth: 1, logoNaturalHeight: 1 }),
    } as TEditorConfiguration;
    const next = applyProbedImageDimensions(doc, [
      { blockId: 'a', url: 'https://cdn.test/a.png', dimensions: null },
      { blockId: 's', url: '', dimensions: null },
    ]);
    expect(propsOf(next, 'a')).toMatchObject({ naturalWidth: null, naturalHeight: null });
    expect(propsOf(next, 's')).toMatchObject({ logoNaturalWidth: null, logoNaturalHeight: null });
  });

  it('returns null when nothing changes', () => {
    const doc = { a: block('Image', { url: 'https://cdn.test/a.png', ...size }), b: block('Image', { url: 'x' }) } as TEditorConfiguration;
    expect(
      applyProbedImageDimensions(doc, [
        { blockId: 'a', url: 'https://cdn.test/a.png', dimensions: size },
        { blockId: 'b', url: 'x', dimensions: null },
      ])
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Clipboard (copy/paste does not go through zod, so the fields must survive as-is)
// ---------------------------------------------------------------------------

describe('block clipboard round-trip', () => {
  it('keeps recorded natural sizes', () => {
    const payload = {
      v: 1,
      marker: 'emailbuilder-block',
      block: block('Image', { url: 'https://cdn.test/a.png', naturalWidth: 100, naturalHeight: 50 }),
      descendants: {},
    };
    const parsed = parseClipboardPayload(JSON.stringify(payload));
    expect((parsed?.block.data as any).props).toMatchObject({ naturalWidth: 100, naturalHeight: 50 });
  });
});
