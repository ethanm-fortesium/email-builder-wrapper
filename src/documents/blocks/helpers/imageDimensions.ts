import type { TEditorBlock, TEditorConfiguration } from '../../editor/core.js';

/**
 * Natural (intrinsic) image size recording.
 *
 * Classic Outlook for Windows (Word engine) sizes an <img> ONLY from its width/height attributes:
 * it ignores CSS width/max-width/height:auto and never derives a height from the width, drawing
 * any image without a height attribute at its DPI-dependent natural height. The export is rendered
 * synchronously and cannot measure images, so the document itself carries each image's intrinsic
 * size, recorded here when an image URL is set and backfilled for older documents on load.
 */

export type TNaturalDimensions = { naturalWidth: number; naturalHeight: number };

/** A probe result for one block: `dimensions: null` means "size unknown", which clears any recorded size. */
export type TProbedImage = { blockId: string; url: string; dimensions: TNaturalDimensions | null };

export type TImageDimensionProbe = (url: string) => Promise<TNaturalDimensions | null>;

/** Which props hold the image URL and its recorded natural size, per block type. */
export const IMAGE_DIMENSION_FIELDS = {
  Image: { url: 'url', width: 'naturalWidth', height: 'naturalHeight' },
  Signature: { url: 'logoUrl', width: 'logoNaturalWidth', height: 'logoNaturalHeight' },
} as const;

type TImageBlockType = keyof typeof IMAGE_DIMENSION_FIELDS;
type TFields = (typeof IMAGE_DIMENSION_FIELDS)[TImageBlockType];
type TLooseProps = Record<string, unknown>;

export const PROBE_TIMEOUT_MS = 8000;

// Concurrent probes of the same URL (sidebar + load-time hydration, or one image used many times)
// share a single request. Settled results are not cached: the file behind a URL can change.
const inFlightProbes = new Map<string, Promise<TNaturalDimensions | null>>();

/**
 * Load an image off-screen and report its intrinsic pixel size.
 *
 * @param url - Image URL; blank or non-string values resolve to null without loading anything.
 * @returns The natural size, or null when the URL is blank, fails to load, has no intrinsic size
 *   (e.g. an SVG without width/height), or does not load within {@link PROBE_TIMEOUT_MS}.
 */
export function probeImageDimensions(url: string): Promise<TNaturalDimensions | null> {
  const src = typeof url === 'string' ? url.trim() : '';
  if (!src || typeof Image === 'undefined') return Promise.resolve(null);

  const existing = inFlightProbes.get(src);
  if (existing) return existing;

  const probe = new Promise<TNaturalDimensions | null>((resolve) => {
    const img = new Image();
    const finish = (result: TNaturalDimensions | null) => {
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      resolve(result);
    };
    const timer = setTimeout(() => finish(null), PROBE_TIMEOUT_MS);
    img.onload = () => {
      const naturalWidth = Math.round(img.naturalWidth);
      const naturalHeight = Math.round(img.naturalHeight);
      finish(naturalWidth > 0 && naturalHeight > 0 ? { naturalWidth, naturalHeight } : null);
    };
    img.onerror = () => finish(null);
    img.src = src;
  }).finally(() => inFlightProbes.delete(src));

  inFlightProbes.set(src, probe);
  return probe;
}

function fieldsFor(block: TEditorBlock | undefined): TFields | null {
  if (!block) return null;
  return (IMAGE_DIMENSION_FIELDS as Record<string, TFields>)[block.type] ?? null;
}

function propsOf(block: TEditorBlock): TLooseProps {
  return ((block.data as { props?: TLooseProps | null } | undefined)?.props ?? {}) as TLooseProps;
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/** True when the block records a usable natural size for its current image. */
export function hasImageDimensions(block: TEditorBlock | undefined): boolean {
  const fields = fieldsFor(block);
  if (!block || !fields) return false;
  const props = propsOf(block);
  return isPositiveInt(props[fields.width]) && isPositiveInt(props[fields.height]);
}

/** The block's image URL ('' when unset), or null for block types that have no image. */
export function getImageUrl(block: TEditorBlock | undefined): string | null {
  const fields = fieldsFor(block);
  if (!block || !fields) return null;
  const url = propsOf(block)[fields.url];
  return typeof url === 'string' ? url : '';
}

/** Image and Signature blocks that have an image URL but no recorded natural size. */
export function collectImagesMissingDimensions(doc: TEditorConfiguration): Array<{ blockId: string; url: string }> {
  const targets: Array<{ blockId: string; url: string }> = [];
  for (const [blockId, block] of Object.entries(doc)) {
    const url = getImageUrl(block);
    if (!url || !url.trim() || hasImageDimensions(block)) continue;
    targets.push({ blockId, url });
  }
  return targets;
}

/**
 * Probe every image in the document that is missing its natural size (each distinct URL once).
 * Only successful probes are returned; images that fail to load are left as they are.
 */
export async function probeMissingImageDimensions(
  doc: TEditorConfiguration,
  probe: TImageDimensionProbe = probeImageDimensions
): Promise<TProbedImage[]> {
  const targets = collectImagesMissingDimensions(doc);
  const byUrl = new Map<string, Promise<TNaturalDimensions | null>>();
  for (const { url } of targets) {
    if (!byUrl.has(url)) byUrl.set(url, probe(url).catch(() => null));
  }
  const results = await Promise.all(
    targets.map(async ({ blockId, url }) => ({ blockId, url, dimensions: await byUrl.get(url)! }))
  );
  return results.filter((r) => r.dimensions !== null);
}

/**
 * Write probed natural sizes into a document, returning an updated copy (or null if nothing changed).
 *
 * A result is only applied while the block still shows the image that was probed: if the block was
 * removed, changed type, or its URL changed since the probe started (the user replaced the image),
 * the result is stale and ignored. Only the size fields are touched, so other edits made while the
 * probe was in flight are kept.
 */
export function applyProbedImageDimensions(
  doc: TEditorConfiguration,
  results: TProbedImage[]
): TEditorConfiguration | null {
  let next: TEditorConfiguration | null = null;
  for (const { blockId, url, dimensions } of results) {
    const block = (next ?? doc)[blockId];
    const fields = fieldsFor(block);
    if (!block || !fields || getImageUrl(block) !== (url ?? '')) continue;

    const props = propsOf(block);
    const width = dimensions?.naturalWidth ?? null;
    const height = dimensions?.naturalHeight ?? null;
    if ((props[fields.width] ?? null) === width && (props[fields.height] ?? null) === height) continue;

    next = next ?? { ...doc };
    next[blockId] = {
      ...block,
      data: {
        ...block.data,
        props: { ...props, [fields.width]: width, [fields.height]: height },
      },
    } as TEditorBlock;
  }
  return next;
}
