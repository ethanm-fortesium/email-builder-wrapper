// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import renderToStaticMarkup from '../../../renderers/renderToStaticMarkup.js';
import type { TReaderDocument } from '../../../Reader/core.js';

const pad = (top: number, right: number, bottom: number, left: number) => ({ top, right, bottom, left });

/** Render a layout holding `blocks.box`, unfolded to one line (folding only turns spaces into newlines). */
function render(blocks: Record<string, unknown>, layoutProps: Record<string, unknown> = {}) {
  const document = {
    root: { type: 'EmailLayout', data: { canvasColor: '#FFFFFF', childrenIds: ['box'], ...layoutProps } },
    t: { type: 'Text', data: { props: { text: 'CONTENT' } } },
    ...blocks,
  } as unknown as TReaderDocument;
  return renderToStaticMarkup(document, { rootBlockId: 'root' }).replace(/\n/g, ' ');
}

function container(style: Record<string, unknown>, childrenIds = ['t']) {
  return { type: 'Container', data: { style: { padding: pad(24, 24, 24, 24), ...style }, props: { childrenIds } } };
}

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe('ContainerReader', () => {
  it('draws a square bordered box in one collapsed-border cell', () => {
    const html = render({ box: container({ borderColor: '#D0D5DD', backgroundColor: '#EFF8FF' }) });
    expect(html).toMatch(/style="width:100%;border-collapse:collapse"><tbody><tr><td align="left" valign="top" style="padding:24px 24px 24px 24px;background-color:#EFF8FF;[^"]*border:1px solid #D0D5DD"/);
    expect(html).not.toContain('mso-padding-alt');
    expect(html).not.toContain('<v:');
  });

  it('gives browsers a separate-border cell with the radius and Outlook a square collapsed one', () => {
    const html = render({ box: container({ borderColor: '#D0D5DD', borderRadius: 12 }) });
    expect(html).toContain(
      '<!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;"><tr><td align="left" valign="top" style="padding:24px 24px 24px 24px;border:1px solid #D0D5DD;"><![endif]-->' +
        '<!--[if !mso]><!--><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:separate;border-spacing:0"><tr><td align="left" valign="top" style="padding:24px 24px 24px 24px;overflow-wrap:break-word;word-break:break-word;border:1px solid #D0D5DD;border-radius:12px"><!--<![endif]-->'
    );
    expect(html).toContain('<!--[if !mso]><!--></td></tr></table><!--<![endif]--><!--[if mso]></td></tr></table><![endif]-->');
    expect(count(html, 'CONTENT')).toBe(1);
    // Word has no border-radius: Outlook shows square corners, drawn without VML.
    expect(html).not.toContain('<v:');
  });

  it('keeps an invisible rounded box in one plain cell', () => {
    const html = render({ box: container({ borderRadius: 12 }) });
    expect(html).not.toContain('border-radius');
    expect(html).not.toContain('<!--[if !mso]>');
  });

  it('repeats the background on an Outlook-only inner cell', () => {
    const html = render({ box: container({ backgroundColor: '#EFF8FF' }) });
    expect(html).toContain('<!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;"><tr><td bgcolor="#EFF8FF" style="padding:0;background-color:#EFF8FF;"><![endif]-->');
    expect(render({ box: container({}) })).not.toContain('<!--[if mso]><table role="presentation" width="100%"');
  });

  it('gives children the inner width of a rounded box', () => {
    const html = render({
      box: container({ borderColor: '#D0D5DD', borderRadius: 12 }, ['cols']),
      cols: { type: 'ColumnsContainer', data: { props: { columnsCount: 2, columns: [{ childrenIds: ['t'] }, { childrenIds: [] }, { childrenIds: [] }] } } },
    });
    // 600 - padding 48 - border 2.
    expect(html).toMatch(/<!--\[if mso\]><table role="presentation" width="550"[^>]*><tr><!\[endif\]-->/);
  });
});
