import { describe, it, expect } from 'vitest';

import type { TEditorBlock, TEditorConfiguration } from '../../editor/core.js';

import {
  buildClipboardPayload,
  collectDescendants,
  isClipboardPayload,
  materialiseClipboardPayload,
  parseClipboardPayload,
} from './blockClipboard.js';

// Minimal block constructors. The clipboard helpers care about block.type and the structural
// fields (props.childrenIds for Container, props.columns[].childrenIds for ColumnsContainer);
// we don't need a fully-validated zod tree for these tests.

function leafBlock(type: string, extra: Record<string, unknown> = {}): TEditorBlock {
  return { type, data: { props: extra, style: {} } } as unknown as TEditorBlock;
}

function containerBlock(childrenIds: string[]): TEditorBlock {
  return {
    type: 'Container',
    data: { props: { childrenIds }, style: {} },
  } as unknown as TEditorBlock;
}

function columnsBlock(columns: Array<{ childrenIds: string[] }>): TEditorBlock {
  return {
    type: 'ColumnsContainer',
    data: {
      props: { columnsCount: columns.length, columnsGap: 16, columns },
      style: {},
    },
  } as unknown as TEditorBlock;
}

describe('isClipboardPayload', () => {
  it('accepts a well-formed payload', () => {
    const payload = {
      v: 1,
      marker: 'emailbuilder-block',
      block: { type: 'Text', data: { props: {}, style: {} } },
      descendants: {},
    };
    expect(isClipboardPayload(payload)).toBe(true);
  });

  it('rejects null and primitives', () => {
    expect(isClipboardPayload(null)).toBe(false);
    expect(isClipboardPayload('hello')).toBe(false);
    expect(isClipboardPayload(42)).toBe(false);
  });

  it('rejects payloads without our marker (so we do not paste arbitrary clipboard JSON)', () => {
    const fake = { v: 1, marker: 'something-else', block: {}, descendants: {} };
    expect(isClipboardPayload(fake)).toBe(false);
  });

  it('rejects payloads missing the block field', () => {
    const fake = { v: 1, marker: 'emailbuilder-block', descendants: {} };
    expect(isClipboardPayload(fake)).toBe(false);
  });
});

describe('parseClipboardPayload', () => {
  it('parses a valid stringified payload', () => {
    const stringified = JSON.stringify({
      v: 1,
      marker: 'emailbuilder-block',
      block: { type: 'Text', data: { props: {}, style: {} } },
      descendants: {},
    });
    expect(parseClipboardPayload(stringified)).not.toBeNull();
  });

  it('returns null for non-JSON text (random clipboard content)', () => {
    expect(parseClipboardPayload('hello world')).toBeNull();
  });

  it('returns null for valid JSON that is not our payload shape', () => {
    expect(parseClipboardPayload('{"foo":"bar"}')).toBeNull();
  });
});

describe('collectDescendants', () => {
  it('returns nothing for a leaf block', () => {
    const document: TEditorConfiguration = {
      a: leafBlock('Text'),
    } as unknown as TEditorConfiguration;
    expect(collectDescendants('a', document)).toEqual({});
  });

  it('collects direct children of a Container', () => {
    const document = {
      parent: containerBlock(['child1', 'child2']),
      child1: leafBlock('Text'),
      child2: leafBlock('Heading'),
    } as unknown as TEditorConfiguration;
    const descendants = collectDescendants('parent', document);
    expect(Object.keys(descendants).sort()).toEqual(['child1', 'child2']);
  });

  it('walks recursively through nested Containers', () => {
    const document = {
      outer: containerBlock(['inner']),
      inner: containerBlock(['leaf']),
      leaf: leafBlock('Text'),
    } as unknown as TEditorConfiguration;
    const descendants = collectDescendants('outer', document);
    expect(Object.keys(descendants).sort()).toEqual(['inner', 'leaf']);
  });

  it('walks across all columns of a ColumnsContainer', () => {
    const document = {
      cols: columnsBlock([
        { childrenIds: ['a', 'b'] },
        { childrenIds: ['c'] },
      ]),
      a: leafBlock('Text'),
      b: leafBlock('Heading'),
      c: leafBlock('Image'),
    } as unknown as TEditorConfiguration;
    const descendants = collectDescendants('cols', document);
    expect(Object.keys(descendants).sort()).toEqual(['a', 'b', 'c']);
  });

  it('skips dangling references gracefully (id present in childrenIds but not in document)', () => {
    const document = {
      parent: containerBlock(['present', 'missing']),
      present: leafBlock('Text'),
    } as unknown as TEditorConfiguration;
    const descendants = collectDescendants('parent', document);
    expect(Object.keys(descendants)).toEqual(['present']);
  });
});

describe('buildClipboardPayload', () => {
  it('produces a payload with the expected marker and version', () => {
    const document = { a: leafBlock('Text') } as unknown as TEditorConfiguration;
    const payload = buildClipboardPayload('a', document);
    expect(payload).not.toBeNull();
    expect(payload!.marker).toBe('emailbuilder-block');
    expect(payload!.v).toBe(1);
  });

  it('returns null for a missing block id', () => {
    const document = {} as TEditorConfiguration;
    expect(buildClipboardPayload('nope', document)).toBeNull();
  });

  it('embeds descendants alongside the parent block', () => {
    const document = {
      parent: containerBlock(['child']),
      child: leafBlock('Text'),
    } as unknown as TEditorConfiguration;
    const payload = buildClipboardPayload('parent', document);
    expect(payload!.descendants.child).toBeDefined();
  });
});

describe('materialiseClipboardPayload', () => {
  it('returns the original block unchanged for leaf payloads', () => {
    const block = leafBlock('Text', { text: 'hello' });
    const result = materialiseClipboardPayload({
      v: 1,
      marker: 'emailbuilder-block',
      block,
      descendants: {},
    });
    expect(result.block).toEqual(block);
    expect(result.descendants).toEqual({});
  });

  it('rewrites Container childrenIds and assigns each descendant a new id', () => {
    const original = {
      v: 1 as const,
      marker: 'emailbuilder-block' as const,
      block: containerBlock(['old1', 'old2']),
      descendants: {
        old1: leafBlock('Text'),
        old2: leafBlock('Heading'),
      },
    };
    const result = materialiseClipboardPayload(original);

    const newChildIds = (result.block as any).data.props.childrenIds as string[];
    expect(newChildIds).toHaveLength(2);
    // None of the new ids should match the originals — the whole subtree is freshly identified.
    expect(newChildIds).not.toContain('old1');
    expect(newChildIds).not.toContain('old2');
    // The descendants map keys exactly match the new child ids referenced by the parent.
    expect(Object.keys(result.descendants).sort()).toEqual([...newChildIds].sort());
  });

  it('rewrites ColumnsContainer columns[].childrenIds preserving column structure', () => {
    const original = {
      v: 1 as const,
      marker: 'emailbuilder-block' as const,
      block: columnsBlock([
        { childrenIds: ['a', 'b'] },
        { childrenIds: ['c'] },
      ]),
      descendants: {
        a: leafBlock('Text'),
        b: leafBlock('Heading'),
        c: leafBlock('Image'),
      },
    };
    const result = materialiseClipboardPayload(original);
    const cols = (result.block as any).data.props.columns;
    expect(cols).toHaveLength(2);
    expect(cols[0].childrenIds).toHaveLength(2);
    expect(cols[1].childrenIds).toHaveLength(1);

    // All ids should be new, and every referenced id should exist in the descendants map.
    const allReferenced = [...cols[0].childrenIds, ...cols[1].childrenIds];
    expect(new Set(allReferenced).size).toBe(3); // unique
    for (const id of allReferenced) {
      expect(result.descendants[id]).toBeDefined();
    }
  });

  it('keeps grandchild references consistent through nested containers', () => {
    // outer -> inner -> leaf. After rewriting, outer should point to a new inner id,
    // inner (the rewritten one) should point to a new leaf id, and both should be in
    // the descendants map. The original ids should not appear anywhere in the output.
    const original = {
      v: 1 as const,
      marker: 'emailbuilder-block' as const,
      block: containerBlock(['oldInner']),
      descendants: {
        oldInner: containerBlock(['oldLeaf']),
        oldLeaf: leafBlock('Text'),
      },
    };
    const result = materialiseClipboardPayload(original);

    const outerChildren = (result.block as any).data.props.childrenIds as string[];
    expect(outerChildren).toHaveLength(1);
    const newInnerId = outerChildren[0];
    expect(newInnerId).not.toBe('oldInner');

    const newInner = result.descendants[newInnerId] as any;
    expect(newInner).toBeDefined();
    const innerChildren = newInner.data.props.childrenIds as string[];
    expect(innerChildren).toHaveLength(1);
    const newLeafId = innerChildren[0];
    expect(newLeafId).not.toBe('oldLeaf');

    expect(result.descendants[newLeafId]).toBeDefined();

    // Sanity: no old ids leak through into the new tree.
    const serialised = JSON.stringify(result);
    expect(serialised).not.toContain('oldInner');
    expect(serialised).not.toContain('oldLeaf');
  });
});
