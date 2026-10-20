// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import { EditorBlockSchema, EditorConfigurationSchema } from './core.js';

// The editor dictionary must register the extended Image/Signature schemas: upstream zod objects strip
// unknown keys, so the recorded natural image size would otherwise be lost on every document parse.

const image = {
  type: 'Image',
  data: { props: { url: 'https://cdn.test/hero.png', width: 600, naturalWidth: 1200, naturalHeight: 400 } },
};
const signature = {
  type: 'Signature',
  data: { props: { logoUrl: 'https://cdn.test/logo.png', logoWidth: 140, logoNaturalWidth: 560, logoNaturalHeight: 260 } },
};

describe('EditorBlockSchema – natural image sizes', () => {
  it.each([image, signature])('keeps the natural size on a $type block', (block) => {
    const res = EditorBlockSchema.safeParse(block);
    expect(res.success).toBe(true);
    expect((res.data as any).data.props).toMatchObject(block.data.props);
  });

  it('keeps the natural sizes through a whole-document parse', () => {
    const res = EditorConfigurationSchema.safeParse({ a: image, b: signature });
    expect(res.success).toBe(true);
    expect((res.data as any).a.data.props).toMatchObject(image.data.props);
    expect((res.data as any).b.data.props).toMatchObject(signature.data.props);
  });

  it('rejects an invalid natural size', () => {
    const res = EditorBlockSchema.safeParse({ type: 'Image', data: { props: { url: 'x', naturalWidth: -1 } } });
    expect(res.success).toBe(false);
  });
});
