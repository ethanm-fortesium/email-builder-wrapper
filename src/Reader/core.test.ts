// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import { ReaderBlockSchema } from './core.js';

// The reader dictionary must register the extended Image/Signature schemas so the recorded natural
// image size reaches the block readers (upstream zod objects strip unknown keys).

const image = {
  type: 'Image',
  data: { props: { url: 'https://cdn.test/hero.png', width: 600, naturalWidth: 1200, naturalHeight: 400 } },
};
const signature = {
  type: 'Signature',
  data: { props: { logoUrl: 'https://cdn.test/logo.png', logoWidth: 140, logoNaturalWidth: 560, logoNaturalHeight: 260 } },
};

describe('ReaderBlockSchema – natural image sizes', () => {
  it.each([image, signature])('keeps the natural size on a $type block', (block) => {
    const res = ReaderBlockSchema.safeParse(block);
    expect(res.success).toBe(true);
    expect((res.data as any).data.props).toMatchObject(block.data.props);
  });
});
