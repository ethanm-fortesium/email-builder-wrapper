import { describe, expect, it } from 'vitest';

import { computeImageBox, wordImageLimit } from './imageBox.js';

describe('wordImageLimit', () => {
  it('keeps 1px of slack inside a padded cell, where Word would otherwise widen the cell', () => {
    expect(wordImageLimit(552, 600)).toBe(551);
    expect(wordImageLimit(268, 600)).toBe(267);
  });

  it('draws a full-bleed image exactly', () => {
    expect(wordImageLimit(600, 600)).toBe(600);
  });
});

const limits = { attrMaxWidth: 552, cssMaxWidth: 600 };

describe('computeImageBox', () => {
  describe('natural size known', () => {
    const natural = { naturalWidth: 400, naturalHeight: 200 };

    it('uses the natural size when neither width nor height is set', () => {
      expect(computeImageBox({ ...natural, ...limits })).toEqual({ attrWidth: 400, attrHeight: 200, cssWidth: 400, cssHeight: 'auto' });
    });

    it('caps a large natural size at the canvas (CSS) and the cell (attributes)', () => {
      expect(computeImageBox({ naturalWidth: 1200, naturalHeight: 800, ...limits })).toEqual({
        attrWidth: 552,
        attrHeight: 368,
        cssWidth: 600,
        cssHeight: 'auto',
      });
    });

    it('derives the height attribute from the width', () => {
      expect(computeImageBox({ width: 300, ...natural, ...limits })).toEqual({ attrWidth: 300, attrHeight: 150, cssWidth: 300, cssHeight: 'auto' });
    });

    it('clamps only the attributes to the cell, keeping the CSS width for stacked mobile columns', () => {
      expect(computeImageBox({ width: 400, ...natural, attrMaxWidth: 268, cssMaxWidth: 600 })).toEqual({
        attrWidth: 268,
        attrHeight: 134,
        cssWidth: 400,
        cssHeight: 'auto',
      });
    });

    it('derives the width from a height-only size', () => {
      expect(computeImageBox({ height: 100, ...natural, ...limits })).toEqual({ attrWidth: 200, attrHeight: 100, cssWidth: 200, cssHeight: 'auto' });
    });

    it('keeps the image fluid when width and height match the natural aspect ratio (within 1%)', () => {
      expect(computeImageBox({ width: 300, height: 151, ...natural, ...limits })).toEqual({
        attrWidth: 300,
        attrHeight: 151,
        cssWidth: 300,
        cssHeight: 'auto',
      });
    });

    it('keeps a fixed box when width and height differ from the natural aspect ratio', () => {
      expect(computeImageBox({ width: 200, height: 200, ...natural, ...limits })).toEqual({
        attrWidth: 200,
        attrHeight: 200,
        cssWidth: 200,
        cssHeight: 200,
      });
    });

    it('keeps the height of a clamped fixed box, as browsers do when max-width narrows it', () => {
      expect(computeImageBox({ width: 400, height: 300, ...natural, attrMaxWidth: 268, cssMaxWidth: 600 })).toEqual({
        attrWidth: 268,
        attrHeight: 300,
        cssWidth: 400,
        cssHeight: 300,
      });
    });
  });

  describe('natural size unknown (legacy documents)', () => {
    it('emits no size at all when nothing is known', () => {
      expect(computeImageBox({ ...limits })).toEqual({ cssHeight: 'auto' });
      expect(computeImageBox({ naturalWidth: 400, naturalHeight: null, ...limits })).toEqual({ cssHeight: 'auto' });
    });

    it('emits only the width when only the width is set', () => {
      expect(computeImageBox({ width: 700, ...limits })).toEqual({ attrWidth: 552, cssWidth: 600, cssHeight: 'auto' });
    });

    it("keeps the user's height when only the height is set", () => {
      expect(computeImageBox({ height: 120, ...limits })).toEqual({ attrHeight: 120, cssHeight: 120 });
    });

    it('keeps a fixed box when both are set (the aspect ratio cannot be checked)', () => {
      expect(computeImageBox({ width: 128, height: 128, ...limits })).toEqual({ attrWidth: 128, attrHeight: 128, cssWidth: 128, cssHeight: 128 });
    });
  });

  it('rounds to whole pixels', () => {
    expect(computeImageBox({ width: 140, naturalWidth: 330, naturalHeight: 49, ...limits })).toEqual({
      attrWidth: 140,
      attrHeight: 21,
      cssWidth: 140,
      cssHeight: 'auto',
    });
    expect(computeImageBox({ width: 99.6, height: 50.4, ...limits })).toEqual({ attrWidth: 100, attrHeight: 50, cssWidth: 100, cssHeight: 50 });
  });

  it('never emits a zero or negative size', () => {
    expect(computeImageBox({ width: 300, naturalWidth: 3000, naturalHeight: 1, attrMaxWidth: 0, cssMaxWidth: 600 })).toEqual({
      attrWidth: 1,
      attrHeight: 1,
      cssWidth: 300,
      cssHeight: 'auto',
    });
    expect(computeImageBox({ width: -10, height: 0, ...limits })).toEqual({ cssHeight: 'auto' });
  });
});
