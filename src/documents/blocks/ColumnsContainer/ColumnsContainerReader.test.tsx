// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';

import renderToStaticMarkup from '../../../renderers/renderToStaticMarkup.js';
import type { TReaderDocument } from '../../../Reader/core.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildDocument(columnsProps: Record<string, unknown>): TReaderDocument {
  return {
    root: {
      type: 'EmailLayout',
      data: {
        backdropColor: '#F5F5F5',
        canvasColor: '#FFFFFF',
        textColor: '#262626',
        fontFamily: 'MODERN_SANS',
        childrenIds: ['cols'],
      },
    },
    cols: {
      type: 'ColumnsContainer',
      data: {
        props: {
          columnsCount: 2,
          columns: [{ childrenIds: ['t1'] }, { childrenIds: ['t2'] }, { childrenIds: [] }],
          ...columnsProps,
        },
      },
    },
    t1: { type: 'Text', data: { props: { text: 'LEFT_COLUMN' } } },
    t2: { type: 'Text', data: { props: { text: 'RIGHT_COLUMN' } } },
  } as unknown as TReaderDocument;
}

function render(columnsProps: Record<string, unknown>): string {
  return renderToStaticMarkup(buildDocument(columnsProps), { rootBlockId: 'root' });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ColumnsContainerReader responsive behaviour', () => {
  it('always injects the responsive media query as progressive enhancement', () => {
    const html = render({});
    expect(html).toContain('@media only screen and (max-width:600px)');
    expect(html).toContain('.email-col-stack{max-width:100%!important;}');
  });

  describe('stack on mobile (default)', () => {
    it('renders fluid inline-block columns with a stack class hook', () => {
      const html = render({});
      expect(html).toContain('class="email-col-stack"');
      expect(html).toContain('display:inline-block');
      // Two even columns of a 600px canvas => 300px max-width each.
      expect(html).toContain('max-width:300px');
      expect(html).toContain('LEFT_COLUMN');
      expect(html).toContain('RIGHT_COLUMN');
    });

    it('wraps the columns in an Outlook ghost table so they stay side-by-side in Outlook', () => {
      const html = render({});
      expect(html).toContain('<!--[if mso]>');
      // Ghost table spans the available canvas width; cells carry the fixed column widths.
      expect(html).toContain('<table role="presentation" width="600"');
      expect(html).toContain('</tr></table><![endif]-->');
    });

    it('treats a missing stackOnMobile prop the same as true', () => {
      expect(render({})).toContain('class="email-col-stack"');
      expect(render({ stackOnMobile: true })).toContain('class="email-col-stack"');
    });
  });

  describe('stack on mobile disabled', () => {
    it('falls back to the rigid side-by-side table without stack hooks', () => {
      const html = render({ stackOnMobile: false });
      // The class hook is never applied to a column (it still appears once in the
      // always-injected <style> block, which is fine).
      expect(html).not.toContain('class="email-col-stack"');
      // No ghost column table (only the rigid full-width table is emitted for the columns).
      expect(html).not.toContain('<table role="presentation" width="600"');
      expect(html).toContain('LEFT_COLUMN');
      expect(html).toContain('RIGHT_COLUMN');
    });
  });
});
