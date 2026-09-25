// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import renderToStaticMarkup from '../../../renderers/renderToStaticMarkup.js';
import type { TReaderDocument } from '../../../Reader/core.js';

function render(data: Record<string, unknown>) {
  const document = {
    root: { type: 'EmailLayout', data: { childrenIds: ['d'] } },
    d: { type: 'Divider', data },
  } as unknown as TReaderDocument;
  return renderToStaticMarkup(document, { rootBlockId: 'root' }).replace(/\n/g, ' ');
}

describe('DividerReader', () => {
  it('draws the line as a table cell instead of an <hr>', () => {
    const html = render({ props: { lineHeight: 4, lineColor: '#1F6FEB' } });
    expect(html).not.toContain('<hr');
    expect(html).toContain(
      '<td height="4" bgColor="#1F6FEB" style="height:4px;background-color:#1F6FEB;font-size:4px;line-height:4px;mso-line-height-rule:exactly">&nbsp;</td>'
    );
  });

  it('defaults to a 1px #333333 line', () => {
    expect(render({})).toContain('<td height="1" bgColor="#333333" style="height:1px;background-color:#333333;font-size:1px;line-height:1px;');
  });

  it('paints the row background on the padded cell only', () => {
    const html = render({ style: { backgroundColor: '#FEF0C7', padding: { top: 16, right: 24, bottom: 16, left: 24 } }, props: { lineColor: '#101828' } });
    expect(html).toContain('style="padding:16px 24px 16px 24px;background-color:#FEF0C7;');
    expect(html.split('#FEF0C7').length - 1).toBe(2);
  });

  it('draws no line for a zero line height', () => {
    const html = render({ style: { padding: { top: 16, right: 0, bottom: 16, left: 0 } }, props: { lineHeight: 0, lineColor: '#1F6FEB' } });
    expect(html).not.toContain('#1F6FEB');
    expect(html).toContain('style="padding:16px 0px 16px 0px;overflow-wrap:break-word;word-break:break-word"></td>');
  });
});
