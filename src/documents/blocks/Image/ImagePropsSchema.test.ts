import { describe, expect, it } from 'vitest';

import SignaturePropsSchema from '../Signature/SignaturePropsSchema.js';

import ImagePropsSchema from './ImagePropsSchema.js';

// These are the schemas the Image / Signature sidebar panels validate every update with
// (updateData -> safeParse). Upstream zod objects strip unknown keys, so if the natural size is not
// part of the schema it silently disappears on the next edit.

describe('ImagePropsSchema (Image sidebar)', () => {
  const data = {
    style: { padding: { top: 16, bottom: 16, left: 24, right: 24 }, textAlign: 'center' },
    props: {
      url: 'https://cdn.test/hero.png',
      alt: 'Hero',
      width: 600,
      linkHref: null,
      contentAlignment: 'middle',
      naturalWidth: 1200,
      naturalHeight: 400,
    },
  };

  it('keeps the natural size alongside the upstream props', () => {
    const res = ImagePropsSchema.safeParse(data);
    expect(res.success).toBe(true);
    expect(res.data).toEqual(data);
  });

  it('accepts a missing or null natural size (legacy documents, cleared URL)', () => {
    expect(ImagePropsSchema.safeParse({ props: { url: 'x' } }).success).toBe(true);
    expect(ImagePropsSchema.safeParse({ props: { url: 'x', naturalWidth: null, naturalHeight: null } }).success).toBe(true);
    expect(ImagePropsSchema.safeParse({}).success).toBe(true);
    expect(ImagePropsSchema.safeParse({ props: null }).success).toBe(true);
  });

  it('rejects non-positive or fractional sizes', () => {
    expect(ImagePropsSchema.safeParse({ props: { naturalWidth: 0 } }).success).toBe(false);
    expect(ImagePropsSchema.safeParse({ props: { naturalHeight: -5 } }).success).toBe(false);
    expect(ImagePropsSchema.safeParse({ props: { naturalWidth: 10.5 } }).success).toBe(false);
  });

  it('still validates the upstream props', () => {
    expect(ImagePropsSchema.safeParse({ props: { contentAlignment: 'sideways' } }).success).toBe(false);
  });
});

describe('SignaturePropsSchema (Signature sidebar)', () => {
  it('keeps the logo natural size', () => {
    const data = {
      props: { logoUrl: 'https://cdn.test/logo.png', logoWidth: 140, logoNaturalWidth: 560, logoNaturalHeight: 260 },
    };
    const res = SignaturePropsSchema.safeParse(data);
    expect(res.success).toBe(true);
    expect(res.data?.props).toMatchObject(data.props);
  });

  it('rejects invalid logo sizes', () => {
    expect(SignaturePropsSchema.safeParse({ props: { logoNaturalHeight: 0 } }).success).toBe(false);
  });
});
