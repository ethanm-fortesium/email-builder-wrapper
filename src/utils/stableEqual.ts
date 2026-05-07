/**
 * Stable-key JSON serialisation: object keys are sorted, undefined values omitted,
 * arrays preserved in order. Two values produce the same string iff they are
 * structurally equal modulo key order and absent-vs-undefined fields.
 *
 * Suitable for cheap deep-equality checks on small block-shaped objects (signature
 * props/style, layout font/size/colour). Not safe for cyclic graphs.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalise(value));
}

export function stableEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

function canonicalise(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalise);

  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const out: Record<string, unknown> = {};
  for (const k of sortedKeys) {
    const v = obj[k];
    if (v === undefined) continue;
    out[k] = canonicalise(v);
  }
  return out;
}
