import { TEditorBlock, TEditorConfiguration } from '../../editor/core.js';

const PAYLOAD_VERSION = 1;
const PAYLOAD_MARKER = 'emailbuilder-block';

export type BlockClipboardPayload = {
  v: number;
  marker: typeof PAYLOAD_MARKER;
  block: TEditorBlock;
  descendants: Record<string, TEditorBlock>;
};

let idCounter = 0;
function newBlockId() {
  idCounter += 1;
  return `block-${Date.now()}-${idCounter}`;
}

function getChildIds(block: TEditorBlock): string[] {
  if (block.type === 'Container') {
    return (block.data?.props as any)?.childrenIds ?? [];
  }
  if (block.type === 'ColumnsContainer') {
    const cols = (block.data?.props as any)?.columns ?? [];
    return cols.flatMap((c: any) => c?.childrenIds ?? []);
  }
  return [];
}

function withRewrittenChildIds(block: TEditorBlock, mapId: (oldId: string) => string): TEditorBlock {
  if (block.type === 'Container') {
    const ids: string[] = (block.data?.props as any)?.childrenIds ?? [];
    return {
      ...block,
      data: {
        ...block.data,
        props: {
          ...(block.data as any).props,
          childrenIds: ids.map(mapId),
        },
      },
    } as TEditorBlock;
  }
  if (block.type === 'ColumnsContainer') {
    const cols: Array<{ childrenIds?: string[] }> = (block.data?.props as any)?.columns ?? [];
    return {
      ...block,
      data: {
        ...block.data,
        props: {
          ...(block.data as any).props,
          columns: cols.map((c) => ({ ...c, childrenIds: (c?.childrenIds ?? []).map(mapId) })),
        },
      },
    } as TEditorBlock;
  }
  return block;
}

export function collectDescendants(blockId: string, document: TEditorConfiguration): Record<string, TEditorBlock> {
  const result: Record<string, TEditorBlock> = {};
  const block = document[blockId];
  if (!block) return result;

  const queue = [...getChildIds(block)];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (result[id]) continue;
    const child = document[id];
    if (!child) continue;
    result[id] = child;
    queue.push(...getChildIds(child));
  }
  return result;
}

export function buildClipboardPayload(blockId: string, document: TEditorConfiguration): BlockClipboardPayload | null {
  const block = document[blockId];
  if (!block) return null;
  return {
    v: PAYLOAD_VERSION,
    marker: PAYLOAD_MARKER,
    block,
    descendants: collectDescendants(blockId, document),
  };
}

export function isClipboardPayload(value: unknown): value is BlockClipboardPayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<BlockClipboardPayload>;
  return (
    v.marker === PAYLOAD_MARKER &&
    typeof v.v === 'number' &&
    typeof v.block === 'object' &&
    v.block !== null &&
    typeof v.descendants === 'object' &&
    v.descendants !== null
  );
}

export function parseClipboardPayload(text: string): BlockClipboardPayload | null {
  try {
    const parsed = JSON.parse(text);
    return isClipboardPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Generate a new id for the block and every descendant, rewriting the parent->child references
 * so the cloned subtree is internally consistent and can be inserted into the document.
 */
export function materialiseClipboardPayload(
  payload: BlockClipboardPayload
): { block: TEditorBlock; descendants: Record<string, TEditorBlock> } {
  const idMap = new Map<string, string>();
  for (const oldId of Object.keys(payload.descendants)) {
    idMap.set(oldId, newBlockId());
  }
  const mapId = (oldId: string) => idMap.get(oldId) ?? oldId;

  const newDescendants: Record<string, TEditorBlock> = {};
  for (const [oldId, child] of Object.entries(payload.descendants)) {
    newDescendants[idMap.get(oldId)!] = withRewrittenChildIds(child, mapId);
  }

  return {
    block: withRewrittenChildIds(payload.block, mapId),
    descendants: newDescendants,
  };
}

export async function writeBlockToClipboard(payload: BlockClipboardPayload): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(JSON.stringify(payload));
    return true;
  } catch (e) {
    console.warn('[EmailBuilder] copy to clipboard failed', e);
    return false;
  }
}

export async function tryReadBlockFromClipboard(): Promise<BlockClipboardPayload | null> {
  try {
    const text = await navigator.clipboard.readText();
    return parseClipboardPayload(text);
  } catch (e) {
    console.warn('[EmailBuilder] read clipboard failed', e);
    return null;
  }
}
