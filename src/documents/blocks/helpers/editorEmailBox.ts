import type { TEditorBlock, TEditorConfiguration } from '../../editor/core.js';
import type { EmailLayoutProps } from '../EmailLayout/EmailLayoutPropsSchema.js';
import { clampCanvasWidth } from '../EmailLayout/emailLayoutShared.js';

import { computeColumns } from './columnsGeometry.js';
import { insetWidth } from './emailBox.js';

// The email box (see emailBox.ts) a block gets in the export, resolved from the editor
// document, for canvas blocks that render the export's own markup (Signature, Table).

type Ancestor = { block: TEditorBlock; column: number | null };

/** The Containers and ColumnsContainers enclosing a block, innermost first. */
function ancestorsOf(document: TEditorConfiguration, blockId: string | null): Ancestor[] {
  const parents = new Map<string, { id: string; column: number | null }>();
  for (const [id, block] of Object.entries(document)) {
    if (block.type === 'Container') {
      (block.data.props?.childrenIds ?? []).forEach((childId) => parents.set(childId, { id, column: null }));
    } else if (block.type === 'ColumnsContainer') {
      (block.data.props?.columns ?? []).forEach((column, index) =>
        column.childrenIds.forEach((childId) => parents.set(childId, { id, column: index }))
      );
    }
  }
  const ancestors: Ancestor[] = [];
  const visited = new Set<string>();
  for (let parent = blockId ? parents.get(blockId) : undefined; parent && !visited.has(parent.id); parent = parents.get(parent.id)) {
    visited.add(parent.id);
    ancestors.push({ block: document[parent.id], column: parent.column });
  }
  return ancestors;
}

/**
 * The background colour behind a block as the export resolves it (its email box): that of the
 * closest enclosing Container or ColumnsContainer that sets one.
 *
 * @param document - The editor document.
 * @param blockId - The block, or null outside a block.
 * @returns The colour, or null when no enclosing container sets one (the canvas colour shows through).
 */
export function enclosingBackground(document: TEditorConfiguration, blockId: string | null) {
  for (const { block } of ancestorsOf(document, blockId)) {
    if ((block.type === 'Container' || block.type === 'ColumnsContainer') && block.data.style?.backgroundColor) {
      return block.data.style.backgroundColor;
    }
  }
  return null;
}

/**
 * The width in px of the cell a block's own EmailTable occupies in the export (its email box):
 * the canvas width less its border, narrowed by every enclosing Container's padding and border
 * and ColumnsContainer column, as the readers compute it.
 *
 * @param document - The editor document.
 * @param blockId - The block, or null outside a block.
 */
export function emailBoxWidth(document: TEditorConfiguration, blockId: string | null) {
  const layout = (document.root?.data ?? {}) as EmailLayoutProps;
  let width = clampCanvasWidth(layout.canvasWidth) - (layout.borderColor ? 2 : 0);
  for (const { block, column } of ancestorsOf(document, blockId).reverse()) {
    if (block.type === 'Container') {
      width = insetWidth(width, block.data.style?.padding, block.data.style?.borderColor ? 1 : 0);
    } else if (block.type === 'ColumnsContainer') {
      const props = block.data.props;
      // ColumnsContainerReader's defaults: 2 columns, no gap.
      const columns = computeColumns(props?.columnsCount ?? 2, props?.columnsGap ?? 0, props?.fixedWidths, insetWidth(width, block.data.style?.padding));
      width = columns[column ?? 0]?.content ?? width;
    }
  }
  return width;
}
