// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TNaturalDimensions } from './documents/blocks/helpers/imageDimensions.js';
import { probeImageDimensions } from './documents/blocks/helpers/imageDimensions.js';
import { beginBackgroundDocumentUpdate, setDocument } from './documents/editor/EditorContext.js';
// Registers <emailbuilder-editor>.
import type { EmailBuilderEditor } from './web-component.js';
import './web-component.js';

vi.mock('./documents/blocks/helpers/imageDimensions.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./documents/blocks/helpers/imageDimensions.js')>();
  return { ...actual, probeImageDimensions: vi.fn() };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TChange = { html: string; document: any; origin: 'programmatic' | 'user' };

const legacyDocument = () => ({
  root: {
    type: 'EmailLayout',
    data: { backdropColor: '#F5F5F5', canvasColor: '#FFFFFF', textColor: '#262626', fontFamily: 'MODERN_SANS', childrenIds: ['hero'] },
  },
  hero: { type: 'Image', data: { props: { url: 'https://cdn.test/hero.png', alt: 'Hero', width: 600 } } },
});

const HERO_SIZE = { naturalWidth: 1200, naturalHeight: 400 };

const probe = vi.mocked(probeImageDimensions);
let release: (d: TNaturalDimensions | null) => void;
let element: EmailBuilderEditor;
let changes: TChange[];
const mounted: EmailBuilderEditor[] = [];

const lastChange = (): TChange => changes[changes.length - 1];

/** Probes stay pending until `release`; like the real probe, concurrent probes of a URL share one request. */
function holdProbes() {
  let pending: Promise<TNaturalDimensions | null> | null = null;
  probe.mockImplementation(() => (pending ??= new Promise((resolve) => (release = resolve))));
}

/** Connect a new editor; `element` and `changes` then refer to it. */
async function mountEditor() {
  element = document.createElement('emailbuilder-editor') as EmailBuilderEditor;
  changes = [];
  const log = changes;
  element.addEventListener('emailContentChange', (e) => log.push((e as CustomEvent<TChange>).detail));
  const ready = new Promise((resolve) => element.addEventListener('emailBuilderReady', resolve, { once: true }));
  document.body.appendChild(element);
  mounted.push(element);
  await ready;
}

async function loadLegacyDocument() {
  const before = changes.length;
  element.setDocumentConfig(legacyDocument());
  await vi.waitFor(() => expect(changes.length).toBeGreaterThan(before));
  expect(lastChange().origin).toBe('programmatic');
  expect(lastChange().document.hero.data.props.alt).toBe('Hero');
  expect(probe).toHaveBeenCalledWith('https://cdn.test/hero.png');
}

/** Release the held probe and return the content changes the editor reported after it. */
async function releaseProbe() {
  const before = changes.length;
  release(HERO_SIZE);
  await vi.waitFor(() => expect(changes.length).toBeGreaterThan(before));
  await new Promise((resolve) => setTimeout(resolve, 0)); // let any further update land
  return changes.slice(before);
}

afterEach(() => {
  mounted.splice(0).forEach((el) => el.remove());
  probe.mockReset();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EmailBuilderEditor – backfilling natural image sizes after a load', () => {
  it('reports the backfilled sizes to the host as a programmatic change', async () => {
    holdProbes();
    await mountEditor();
    await loadLegacyDocument();

    const after = await releaseProbe();

    expect(after.map((c) => c.origin)).toEqual(['programmatic']);
    expect(lastChange().document.hero.data.props).toMatchObject({ alt: 'Hero', ...HERO_SIZE });
    expect(element.getDocument().hero.data.props).toMatchObject(HERO_SIZE);
  });

  it('keeps a user edit made while probing and reports the sizes with it', async () => {
    holdProbes();
    await mountEditor();
    await loadLegacyDocument();

    // A user edit lands while the probe is still running.
    setDocument({ hero: { type: 'Image', data: { props: { url: 'https://cdn.test/hero.png', alt: 'Edited' } } } } as any);
    await vi.waitFor(() => expect(lastChange()?.document.hero.data.props.alt).toBe('Edited'));
    expect(lastChange()?.origin).toBe('user');

    const after = await releaseProbe();

    // The host ignores programmatic events, so after a user edit the sizes must arrive as 'user'.
    expect(after.map((c) => c.origin)).toEqual(['user']);
    expect(lastChange().document.hero.data.props).toMatchObject({ alt: 'Edited', ...HERO_SIZE });
  });

  it('does not report sizes probed for a previous load as a user change to the newly loaded document', async () => {
    holdProbes();
    await mountEditor();
    await loadLegacyDocument();
    // The user edits the draft while its image is probed, then the host loads another copy of the
    // template (same block ids and image URLs): the new load shares the in-flight probe.
    setDocument({ hero: { type: 'Image', data: { props: { url: 'https://cdn.test/hero.png', alt: 'Edited' } } } } as any);
    await vi.waitFor(() => expect(lastChange()?.origin).toBe('user'));
    await loadLegacyDocument();

    const after = await releaseProbe();

    expect(after.map((c) => c.origin)).toEqual(['programmatic']);
    expect(lastChange().document.hero.data.props).toMatchObject({ alt: 'Hero', ...HERO_SIZE });
  });

  it('does not let a probe begun by a removed editor reach the editor that replaced it as a user change', async () => {
    holdProbes();
    await mountEditor();
    await loadLegacyDocument();
    element.remove();
    await mountEditor();
    await loadLegacyDocument();

    const after = await releaseProbe();

    expect(after.map((c) => c.origin)).toEqual(['programmatic']);
    expect(lastChange().document.hero.data.props).toMatchObject(HERO_SIZE);
    expect(element.getDocument().hero.data.props).toMatchObject(HERO_SIZE);
  });

  it('applies nothing through a background update begun by an editor that has since been removed', async () => {
    await mountEditor();
    const commit = beginBackgroundDocumentUpdate();
    element.remove();

    const apply = vi.fn();
    commit(apply);
    expect(apply).not.toHaveBeenCalled();
  });

  it('keeps reporting background updates as programmatic when the old editor is removed after its replacement connected', async () => {
    await mountEditor();
    const replaced = element;
    await mountEditor();
    replaced.remove();
    holdProbes();
    await loadLegacyDocument();

    const after = await releaseProbe();

    expect(after.map((c) => c.origin)).toEqual(['programmatic']);
    expect(element.getDocument().hero.data.props).toMatchObject(HERO_SIZE);
  });
});
