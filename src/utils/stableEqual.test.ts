import { describe, it, expect } from 'vitest';

import { stableEqual, stableStringify } from './stableEqual.js';

// stableEqual underpins the "matches default" indicator on the Signature TuneMenu and the
// EmailLayout sidebar's save-default button. False positives or false negatives there mean
// the user sees the wrong icon state, so the comparison rules need to be rock solid.
describe('stableEqual', () => {
  describe('primitives', () => {
    it('treats identical primitives as equal', () => {
      expect(stableEqual(1, 1)).toBe(true);
      expect(stableEqual('a', 'a')).toBe(true);
      expect(stableEqual(true, true)).toBe(true);
    });

    it('treats different primitives as not equal', () => {
      expect(stableEqual(1, 2)).toBe(false);
      expect(stableEqual('a', 'b')).toBe(false);
      expect(stableEqual(true, false)).toBe(false);
    });

    it('treats null and undefined as equivalent (both serialise to null)', () => {
      // JSON has no undefined; we canonicalise both to null so a missing field
      // and an explicitly-null field compare equal — this is what the TuneMenu wants.
      expect(stableEqual(null, undefined)).toBe(true);
      expect(stableEqual(undefined, null)).toBe(true);
    });

    it('treats numeric strings and numbers as not equal', () => {
      expect(stableEqual('1', 1)).toBe(false);
    });
  });

  describe('objects', () => {
    it('treats objects with the same keys/values as equal regardless of key order', () => {
      const a = { fontFamilyKey: 'MODERN_SANS', fontSizePx: 14, textColor: '#000' };
      const b = { textColor: '#000', fontSizePx: 14, fontFamilyKey: 'MODERN_SANS' };
      expect(stableEqual(a, b)).toBe(true);
    });

    it('treats objects differing in any value as not equal', () => {
      const a = { fontFamilyKey: 'MODERN_SANS', fontSizePx: 14 };
      const b = { fontFamilyKey: 'MODERN_SANS', fontSizePx: 16 };
      expect(stableEqual(a, b)).toBe(false);
    });

    it('treats absent and explicit-undefined fields as equivalent', () => {
      // Saved signature defaults round-trip through JSON, which strips undefined fields.
      // Editor data may carry undefined for unset fields. They must compare equal.
      const a = { fontSizePx: 14 };
      const b = { fontSizePx: 14, textColor: undefined };
      expect(stableEqual(a, b)).toBe(true);
    });

    it('does NOT treat absent and explicit-null fields as different', () => {
      // Both null and undefined canonicalise to null, so absent vs null also collapse.
      const a = { fontSizePx: 14 };
      const b = { fontSizePx: 14, textColor: null };
      expect(stableEqual(a, b)).toBe(true);
    });

    it('treats null and a real value as not equal', () => {
      const a = { textColor: null };
      const b = { textColor: '#000000' };
      expect(stableEqual(a, b)).toBe(false);
    });
  });

  describe('nested', () => {
    it('compares nested signature objects deeply', () => {
      const a = {
        props: { fullName: 'Jane Doe', social: { linkedIn: 'https://x', twitter: null } },
        style: { padding: { top: 16, right: 24, bottom: 24, left: 24 } },
      };
      const b = {
        style: { padding: { left: 24, top: 16, bottom: 24, right: 24 } },
        props: { social: { twitter: undefined, linkedIn: 'https://x' }, fullName: 'Jane Doe' },
      };
      expect(stableEqual(a, b)).toBe(true);
    });

    it('detects a single nested-field difference', () => {
      const a = { props: { fullName: 'Jane Doe' } };
      const b = { props: { fullName: 'Jane Smith' } };
      expect(stableEqual(a, b)).toBe(false);
    });
  });

  describe('arrays', () => {
    it('treats arrays as equal when ordered the same', () => {
      expect(stableEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    });

    it('treats arrays in different order as NOT equal (preserves array semantics)', () => {
      // Arrays are positional — childrenIds order matters in our blocks model.
      expect(stableEqual([1, 2, 3], [3, 2, 1])).toBe(false);
    });

    it('compares arrays of objects deeply', () => {
      const a = [{ id: 'a', n: 1 }, { id: 'b', n: 2 }];
      const b = [{ n: 1, id: 'a' }, { n: 2, id: 'b' }];
      expect(stableEqual(a, b)).toBe(true);
    });
  });
});

describe('stableStringify', () => {
  it('produces the same string for objects regardless of key order', () => {
    const a = { b: 2, a: 1 };
    const b = { a: 1, b: 2 };
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it('omits undefined values from output', () => {
    const out = stableStringify({ a: 1, b: undefined });
    expect(out).toBe('{"a":1}');
  });

  it('emits null for top-level undefined or null', () => {
    expect(stableStringify(undefined)).toBe('null');
    expect(stableStringify(null)).toBe('null');
  });
});
