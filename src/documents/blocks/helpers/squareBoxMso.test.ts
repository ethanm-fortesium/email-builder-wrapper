import { describe, expect, it } from 'vitest';

import { squareBoxMso } from './squareBoxMso.js';

const padding = { top: 24, right: 24, bottom: 24, left: 24 };

describe('squareBoxMso', () => {
  it('draws one full-width collapsed-border cell with the padding, fill and border', () => {
    const { open, close } = squareBoxMso({ fill: '#EFF8FF', borderColor: '#D0D5DD', borderWidth: 1, padding });
    expect(open).toBe(
      '<!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;"><tr>' +
        '<td align="left" valign="top" bgcolor="#EFF8FF" style="padding:24px 24px 24px 24px;background-color:#EFF8FF;border:1px solid #D0D5DD;"><![endif]-->'
    );
    expect(close).toBe('<!--[if mso]></td></tr></table><![endif]-->');
  });

  it('leaves out a missing fill and border', () => {
    const { open } = squareBoxMso({ fill: null, borderColor: null, borderWidth: 0, padding: null });
    expect(open).toContain('<td align="left" valign="top" style="padding:0;">');
  });

  it('escapes colours used in attributes', () => {
    const { open } = squareBoxMso({ fill: '"><x', borderColor: null, borderWidth: 0, padding });
    expect(open).toContain('bgcolor="&quot;&gt;&lt;x"');
  });
});
