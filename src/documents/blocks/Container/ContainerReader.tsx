import React from 'react';

import { ReaderBlock } from '../../../Reader/core.js';
import { EmailBoxProvider, insetWidth, useEmailBox } from '../helpers/emailBox.js';
import { EmailTable, PaddingBox, formatPadding } from '../helpers/emailTable.js';
import { cssText } from '../helpers/emailTypography.js';
import { RawHtml, escapeAttr, msoOnly, notMso } from '../helpers/rawHtml.js';
import { squareBoxMso } from '../helpers/squareBoxMso.js';

import { ContainerProps } from './ContainerPropsSchema.js';

/**
 * Outlook only: repeat the background on an inner full-width cell, so a seam that
 * DPI scaling may open between stacked rows shows the same colour.
 */
function MsoFill({ color, children }: { color: string | undefined; children: React.ReactNode }) {
  if (!color) {
    return <>{children}</>;
  }
  const fill = escapeAttr(color);
  const open = msoOnly(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;"><tr>` +
      `<td bgcolor="${fill}" style="padding:0;background-color:${fill};">`
  );
  return (
    <>
      <RawHtml html={open} />
      {children}
      <RawHtml html={msoOnly('</td></tr></table>')} />
    </>
  );
}

/**
 * Renders a container that wraps and lays out child ReaderBlock components in a
 * single padded cell with an optional background, 1px border and corner radius.
 *
 * A square container is one EmailTable cell. A visible rounded one (with a background
 * or border) gets one box per engine around the same content:
 * - Browsers: a cell with separate borders (border-radius is ignored on cells of
 *   collapsed-border tables), hidden from Outlook. Content should keep padding >= radius,
 *   since cells do not clip their children.
 * - Outlook: a square collapsed-border cell (Word has no border-radius and misplaces
 *   the side borders of the separate one).
 * Children get the container's inner width and background as their email box.
 *
 * @param style - Optional layout and visual settings (reads backgroundColor, padding, borderRadius, borderColor).
 * @param props - Container props that may include `childrenIds`, an array of child block IDs to render.
 * @returns The element that renders the styled container and its child ReaderBlock components.
 */
export default function ContainerReader({ style, props }: ContainerProps) {
  const childrenIds = props?.childrenIds ?? [];
  const backgroundColor = style?.backgroundColor ?? undefined;
  const padding = (style?.padding ?? undefined) as PaddingBox;
  const borderColor = style?.borderColor ?? undefined;
  const borderWidth = borderColor ? 1 : 0;
  const borderRadius = Math.max(0, style?.borderRadius ?? 0);

  const box = useEmailBox();

  const border = borderColor ? `${borderWidth}px solid ${borderColor}` : undefined;
  const children = (
    <MsoFill color={backgroundColor}>
      {childrenIds.map((childId) => (
        <ReaderBlock key={childId} id={childId} />
      ))}
    </MsoFill>
  );

  if (borderRadius === 0 || !(backgroundColor || borderColor)) {
    return (
      <EmailTable backgroundColor={backgroundColor} padding={padding} borderWidth={borderWidth} extraCellStyle={{ border }}>
        {children}
      </EmailTable>
    );
  }

  const mso = squareBoxMso({ fill: backgroundColor ?? null, borderColor: borderColor ?? null, borderWidth, padding });
  // The cell EmailTable would render with separate borders, hidden from Outlook.
  const cellStyle = cssText({
    padding: formatPadding(padding),
    backgroundColor,
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    border,
    borderRadius,
  });
  const browserOpen = notMso(
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:separate;border-spacing:0"><tr>` +
      `<td align="left" valign="top"${backgroundColor ? ` bgcolor="${escapeAttr(backgroundColor)}"` : ''} style="${escapeAttr(cellStyle)}">`
  );
  return (
    <>
      <RawHtml html={mso.open + browserOpen} />
      <EmailBoxProvider width={insetWidth(box.width, padding, borderWidth)} background={backgroundColor}>
        {children}
      </EmailBoxProvider>
      <RawHtml html={notMso('</td></tr></table>') + mso.close} />
    </>
  );
}
