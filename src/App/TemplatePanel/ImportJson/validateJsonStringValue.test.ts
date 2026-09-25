// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';

import validateJsonStringValue from './validateJsonStringValue.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const emailLayoutData = {
  backdropColor: '#F5F5F5',
  canvasColor: '#FFFFFF',
  borderColor: null,
  borderRadius: 0,
  canvasWidth: 600,
  textColor: '#262626',
  fontFamily: 'MODERN_SANS',
  baseFontSize: 16,
  childrenIds: ['block-1', 'block-2', 'block-3'],
};

const textBlockData = {
  style: { fontWeight: 'normal', padding: { top: 16, bottom: 16, right: 24, left: 24 } },
  props: { text: 'Dear {{FirstName}} {{LastName}} ,' },
};

const richTextBlockData = {
  style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
  props: {
    html: '<p>Your annual renewal is now open.</p><ul><li style="color:inherit">Complete your annual declarations</li></ul>',
  },
};

const signatureBlockData = {
  style: { padding: { top: 16, bottom: 24, left: 24, right: 24 }, fontWeight: 400 },
  props: {
    fullName: '[Full Name] (Pronouns)',
    title: 'Account Executive',
    company: 'College of Dietitians of Ontario',
    email: null,
    phone: '(020) 3397 3712',
    address: '601N - 175 Bloor Street E., Toronto ON M4W 3R8',
    website: 'www.collegeofdietitians.org',
    logoUrl:
      'https://cdo.regulatorsmart.org/api/Documents/b22b5267-faca-4d5e-9537-378a9f2bcc7a?download=false',
    logoWidth: 188,
    social: {
      linkedIn: 'https://www.linkedin.com/company/college-of-dietitians-of-ontario/posts/?feedView=all',
      facebook: 'https://www.facebook.com/CollegeDietitiansOntario',
      twitter: 'https://x.com/CDOntario',
      instagram: 'https://www.instagram.com/cdontario/',
    },
    disclaimerHtml: 'A healthier Ontario through excellence in dietetic regulation',
  },
};

/** Builds a minimal valid JSON string containing just an EmailLayout root. */
function makeJson(extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    root: { type: 'EmailLayout', data: { ...emailLayoutData, childrenIds: Object.keys(extra) } },
    ...extra,
  });
}

// ---------------------------------------------------------------------------
// Regression: the bug that was fixed
// ---------------------------------------------------------------------------

describe('validateJsonStringValue – regression', () => {
  it('accepts a full document with EmailLayout, Text, RichText and Signature blocks', () => {
    // This is the exact shape that triggered the original bug where
    // z.record(z.string(), EditorBlockSchema) silently swapped the key/value
    // schemas, causing all blocks to be rejected as "Expected string".
    const json = JSON.stringify({
      root: { type: 'EmailLayout', data: emailLayoutData },
      'block-1': { type: 'Text', data: textBlockData },
      'block-2': { type: 'RichText', data: richTextBlockData },
      'block-3': { type: 'Signature', data: signatureBlockData },
    });
    const result = validateJsonStringValue(json);
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// JSON parse errors
// ---------------------------------------------------------------------------

describe('validateJsonStringValue – invalid JSON syntax', () => {
  it('returns an error for empty string', () => {
    expect(validateJsonStringValue('').error).toBe('Invalid json');
  });

  it('returns an error for truncated JSON', () => {
    expect(validateJsonStringValue('{"root":').error).toBe('Invalid json');
  });

  it('returns an error for plain text', () => {
    expect(validateJsonStringValue('hello world').error).toBe('Invalid json');
  });
});

// ---------------------------------------------------------------------------
// Schema validation errors
// ---------------------------------------------------------------------------

describe('validateJsonStringValue – schema failures', () => {
  it('returns an error for an empty object (no root block)', () => {
    expect(validateJsonStringValue('{}').error).toBe('Missing "root" node');
  });

  it('returns an error when root has an unknown block type', () => {
    const json = JSON.stringify({ root: { type: 'UnknownBlockType', data: {} } });
    expect(validateJsonStringValue(json).error).toBeDefined();
  });

  it('returns an error when a block is missing the type field', () => {
    const json = JSON.stringify({ root: { data: emailLayoutData } });
    expect(validateJsonStringValue(json).error).toBeDefined();
  });

  it('returns an error when EmailLayout canvasWidth is out of range', () => {
    const json = makeJson({
      'block-1': {
        type: 'EmailLayout',
        data: { ...emailLayoutData, canvasWidth: 100 }, // < min 480
      },
    });
    // The root itself is still valid; the child block with bad canvasWidth should fail.
    // (Testing schema-level numeric constraint enforcement.)
    const json2 = JSON.stringify({
      root: { type: 'EmailLayout', data: { ...emailLayoutData, canvasWidth: 100 } },
    });
    expect(validateJsonStringValue(json2).error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Individual block types
// ---------------------------------------------------------------------------

describe('validateJsonStringValue – individual block types', () => {
  it('accepts an EmailLayout-only document', () => {
    const result = validateJsonStringValue(makeJson());
    expect(result.error).toBeUndefined();
  });

  it('accepts a document with a Text block', () => {
    const result = validateJsonStringValue(
      makeJson({ 'block-1': { type: 'Text', data: textBlockData } }),
    );
    expect(result.error).toBeUndefined();
  });

  it('accepts a document with a RichText block', () => {
    const result = validateJsonStringValue(
      makeJson({ 'block-1': { type: 'RichText', data: richTextBlockData } }),
    );
    expect(result.error).toBeUndefined();
  });

  it('accepts a document with a Signature block', () => {
    const result = validateJsonStringValue(
      makeJson({ 'block-1': { type: 'Signature', data: signatureBlockData } }),
    );
    expect(result.error).toBeUndefined();
  });

  it('accepts a Signature block with null social links', () => {
    const data = {
      ...signatureBlockData,
      props: { ...signatureBlockData.props, social: null },
    };
    const result = validateJsonStringValue(
      makeJson({ 'block-1': { type: 'Signature', data } }),
    );
    expect(result.error).toBeUndefined();
  });

  it('accepts a Signature block with no props at all', () => {
    const result = validateJsonStringValue(
      makeJson({ 'block-1': { type: 'Signature', data: {} } }),
    );
    expect(result.error).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Recorded natural image sizes (needed by the Outlook export) survive import
// ---------------------------------------------------------------------------

describe('validateJsonStringValue – natural image sizes', () => {
  it('keeps naturalWidth/naturalHeight on Image and logoNatural* on Signature', () => {
    const imageProps = { url: 'https://cdn.test/hero.png', width: 600, naturalWidth: 1200, naturalHeight: 400 };
    const signatureProps = { ...signatureBlockData.props, logoNaturalWidth: 564, logoNaturalHeight: 260 };
    const result = validateJsonStringValue(
      makeJson({
        'block-1': { type: 'Image', data: { props: imageProps } },
        'block-2': { type: 'Signature', data: { ...signatureBlockData, props: signatureProps } },
      }),
    );
    expect(result.error).toBeUndefined();
    expect((result.data?.['block-1'].data as any).props).toMatchObject(imageProps);
    expect((result.data?.['block-2'].data as any).props).toMatchObject({ logoNaturalWidth: 564, logoNaturalHeight: 260 });
  });

  it('accepts legacy image blocks without a recorded size', () => {
    const result = validateJsonStringValue(
      makeJson({ 'block-1': { type: 'Image', data: { props: { url: 'https://cdn.test/hero.png' } } } }),
    );
    expect(result.error).toBeUndefined();
  });

  it('rejects an invalid recorded size', () => {
    const result = validateJsonStringValue(
      makeJson({ 'block-1': { type: 'Image', data: { props: { url: 'x', naturalHeight: 0 } } } }),
    );
    expect(result.error).toBe('Invalid JSON schema');
  });
});

// ---------------------------------------------------------------------------
// Return shape
// ---------------------------------------------------------------------------

describe('validateJsonStringValue – return shape', () => {
  it('returns data.root for a valid document', () => {
    const result = validateJsonStringValue(makeJson());
    expect(result.data?.root).toBeDefined();
    expect((result.data?.root as any).type).toBe('EmailLayout');
  });

  it('never returns both data and error', () => {
    const ok = validateJsonStringValue(makeJson());
    expect(ok.error).toBeUndefined();
    expect(ok.data).toBeDefined();

    const bad = validateJsonStringValue('not json');
    expect(bad.data).toBeUndefined();
    expect(bad.error).toBeDefined();
  });
});
