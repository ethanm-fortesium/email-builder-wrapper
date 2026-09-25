import { PaddingBox, formatPadding } from './emailTable.js';
import { escapeAttr, msoOnly } from './rawHtml.js';

// Classic Outlook (Word) markup for a box whose browser markup Word gets wrong.
//
// Browsers need border-collapse:separate for a cell's border-radius to render, but Word
// draws the side borders of such a full-width cell 1px inside the box (and has no
// border-radius at all). So a rounded box gets this square, collapsed-border cell in
// Outlook, placed around content that browsers see in their own (conditionally hidden)
// cell.

type SquareBoxOptions = {
  /** Box background, or null for none. */
  fill: string | null;
  /** Border colour, or null for no border. */
  borderColor: string | null;
  /** Border width in px. */
  borderWidth: number;
  padding: PaddingBox;
};

/**
 * Outlook-only square box: one full-width cell with collapsed borders, which Word
 * draws on the box edges with the content where browsers put it.
 *
 * @returns `open` (everything before the content) and `close` (everything after), each
 *   wrapped in an `[if mso]` conditional comment.
 */
export function squareBoxMso({ fill, borderColor, borderWidth, padding }: SquareBoxOptions) {
  const background = fill ? escapeAttr(fill) : null;
  const style =
    `padding:${formatPadding(padding) ?? '0'};` +
    (background ? `background-color:${background};` : '') +
    (borderColor ? `border:${borderWidth}px solid ${escapeAttr(borderColor)};` : '');
  const open = msoOnly(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;"><tr>` +
      `<td align="left" valign="top"${background ? ` bgcolor="${background}"` : ''} style="${style}">`
  );
  return { open, close: msoOnly('</td></tr></table>') };
}
