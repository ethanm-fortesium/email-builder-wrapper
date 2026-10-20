// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TNaturalDimensions } from '../blocks/helpers/imageDimensions.js';

import type { TEditorBlock, TEditorConfiguration } from './core.js';
import {
  beginBackgroundDocumentUpdate,
  getEditorState,
  hydrateDocumentImageDimensions,
  loadDocument,
  recordImageDimensions,
  resetDocument,
  setBackgroundUpdateScheduler,
  setDocument,
  setSelectedBlockId,
  TDocumentCommit,
} from './EditorContext.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function block(type: string, props: Record<string, unknown>): TEditorBlock {
  return { type, data: { props, style: {} } } as unknown as TEditorBlock;
}

function propsOf(id: string): Record<string, unknown> {
  return ((getEditorState().document[id]?.data as any)?.props ?? {}) as Record<string, unknown>;
}

function loadLegacyDocument() {
  resetDocument({
    root: { type: 'EmailLayout', data: { childrenIds: ['hero', 'logo'] } },
    hero: block('Image', { url: 'https://cdn.test/hero.png', alt: 'Hero' }),
    logo: block('Signature', { fullName: 'Ada', logoUrl: 'https://cdn.test/logo.png' }),
  } as unknown as TEditorConfiguration);
}

const HERO = { naturalWidth: 1200, naturalHeight: 400 };
const LOGO = { naturalWidth: 560, naturalHeight: 260 };

/** A probe whose results are released manually, to simulate edits made while probing. */
function deferredProbe() {
  const pending = new Map<string, (d: TNaturalDimensions | null) => void>();
  const probe = vi.fn(
    (url: string) => new Promise<TNaturalDimensions | null>((resolve) => pending.set(url, resolve))
  );
  return { probe, release: (url: string, d: TNaturalDimensions | null) => pending.get(url)?.(d) };
}

const commitNow: TDocumentCommit = (apply) => apply();

afterEach(() => {
  setBackgroundUpdateScheduler(null);
});

// ---------------------------------------------------------------------------
// recordImageDimensions
// ---------------------------------------------------------------------------

describe('recordImageDimensions', () => {
  it('writes the size onto the block when its URL still matches', () => {
    loadLegacyDocument();
    expect(recordImageDimensions([{ blockId: 'hero', url: 'https://cdn.test/hero.png', dimensions: HERO }])).toBe(true);
    expect(propsOf('hero')).toEqual({ url: 'https://cdn.test/hero.png', alt: 'Hero', ...HERO });
  });

  it('ignores a stale result after the image was replaced', () => {
    loadLegacyDocument();
    setDocument({ hero: block('Image', { url: 'https://cdn.test/replaced.png' }) });
    expect(recordImageDimensions([{ blockId: 'hero', url: 'https://cdn.test/hero.png', dimensions: HERO }])).toBe(false);
    expect(propsOf('hero')).not.toHaveProperty('naturalWidth');
  });

  it('applies through the given commit', () => {
    loadLegacyDocument();
    const commit = vi.fn<TDocumentCommit>((apply) => apply());
    recordImageDimensions([{ blockId: 'hero', url: 'https://cdn.test/hero.png', dimensions: HERO }], commit);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(propsOf('hero')).toMatchObject(HERO);
  });

  it('reports no change when the commit drops the update', () => {
    loadLegacyDocument();
    const dropped = recordImageDimensions([{ blockId: 'hero', url: 'https://cdn.test/hero.png', dimensions: HERO }], () => {});
    expect(dropped).toBe(false);
    expect(propsOf('hero')).not.toHaveProperty('naturalWidth');
  });
});

// ---------------------------------------------------------------------------
// Background updates
// ---------------------------------------------------------------------------

describe('beginBackgroundDocumentUpdate', () => {
  it('drops an update begun before another document was loaded', () => {
    loadLegacyDocument();
    const commit = beginBackgroundDocumentUpdate();
    // A document is loaded (it starts its own backfill) before the update is applied.
    loadLegacyDocument();
    void hydrateDocumentImageDimensions(async () => null);

    const apply = vi.fn();
    commit(apply);
    expect(apply).not.toHaveBeenCalled();
  });

  it('unregisters a scheduler only while it is still the registered one', () => {
    const first = vi.fn(() => commitNow);
    const second = vi.fn(() => commitNow);
    const unregisterFirst = setBackgroundUpdateScheduler(first);
    const unregisterSecond = setBackgroundUpdateScheduler(second);

    unregisterFirst(); // already replaced: the second stays registered
    beginBackgroundDocumentUpdate();
    expect(second).toHaveBeenCalledTimes(1);

    unregisterSecond();
    beginBackgroundDocumentUpdate();
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// hydrateDocumentImageDimensions
// ---------------------------------------------------------------------------

describe('hydrateDocumentImageDimensions', () => {
  it('backfills missing sizes without touching the selection', async () => {
    loadLegacyDocument();
    setSelectedBlockId('logo');
    const probe = vi.fn(async (url: string) => (url.endsWith('hero.png') ? HERO : LOGO));

    expect(await hydrateDocumentImageDimensions(probe)).toBe(true);
    expect(propsOf('hero')).toMatchObject(HERO);
    expect(propsOf('logo')).toMatchObject({ logoNaturalWidth: 560, logoNaturalHeight: 260 });
    expect(getEditorState().selectedBlockId).toBe('logo');
  });

  it('does nothing when no image needs a size', async () => {
    loadLegacyDocument();
    const before = getEditorState().document;
    expect(await hydrateDocumentImageDimensions(async () => null)).toBe(false);
    expect(getEditorState().document).toBe(before);
  });

  it('applies the result as a background update, via a commit taken when probing started', async () => {
    loadLegacyDocument();
    const commit = vi.fn<TDocumentCommit>((apply) => apply());
    const scheduler = vi.fn(() => commit);
    setBackgroundUpdateScheduler(scheduler);
    const { probe, release } = deferredProbe();

    const done = hydrateDocumentImageDimensions(probe);
    expect(scheduler).toHaveBeenCalledTimes(1); // taken before any probe resolves
    release('https://cdn.test/hero.png', HERO);
    release('https://cdn.test/logo.png', LOGO);
    expect(await done).toBe(true);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('keeps user edits made while probing and ignores results for replaced images', async () => {
    loadLegacyDocument();
    const { probe, release } = deferredProbe();
    const done = hydrateDocumentImageDimensions(probe);

    // The user edits while the probes are in flight.
    setDocument({
      hero: block('Image', { url: 'https://cdn.test/hero.png', alt: 'Edited alt' }),
      logo: block('Signature', { fullName: 'Ada', logoUrl: 'https://cdn.test/new-logo.png' }),
    });
    release('https://cdn.test/hero.png', HERO);
    release('https://cdn.test/logo.png', LOGO);
    await done;

    expect(propsOf('hero')).toEqual({ url: 'https://cdn.test/hero.png', alt: 'Edited alt', ...HERO });
    expect(propsOf('logo')).toEqual({ fullName: 'Ada', logoUrl: 'https://cdn.test/new-logo.png' });
  });

  it('leaves a document loaded while probing to its own backfill', async () => {
    loadLegacyDocument();
    const stale = deferredProbe();
    const staleDone = hydrateDocumentImageDimensions(stale.probe);
    // Another copy of the document (same block ids and image URLs) is loaded and backfilled.
    loadLegacyDocument();
    const current = deferredProbe();
    const currentDone = hydrateDocumentImageDimensions(current.probe);

    stale.release('https://cdn.test/hero.png', HERO);
    stale.release('https://cdn.test/logo.png', LOGO);
    expect(await staleDone).toBe(false);
    expect(propsOf('hero')).not.toHaveProperty('naturalWidth');

    current.release('https://cdn.test/hero.png', HERO);
    current.release('https://cdn.test/logo.png', LOGO);
    expect(await currentDone).toBe(true);
    expect(propsOf('hero')).toMatchObject(HERO);
  });
});

// ---------------------------------------------------------------------------
// loadDocument
// ---------------------------------------------------------------------------

describe('loadDocument', () => {
  const doc = { root: { type: 'EmailLayout', data: { childrenIds: [] } } } as unknown as TEditorConfiguration;

  it('replaces the document, clears the selection and counts the load', () => {
    setSelectedBlockId('hero');
    const before = getEditorState().documentLoads;
    loadDocument(doc);
    const state = getEditorState();
    expect(state.document).toBe(doc);
    expect(state.selectedBlockId).toBeNull();
    expect(state.selectedSidebarTab).toBe('styles');
    expect(state.documentLoads).toBe(before + 1);
  });

  it('does not count block moves and deletes, which reset the document too', () => {
    const before = getEditorState().documentLoads;
    resetDocument(doc);
    expect(getEditorState().documentLoads).toBe(before);
  });
});
