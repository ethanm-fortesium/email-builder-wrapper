import React from 'react';
import { z } from 'zod';

import { HeadingPropsSchema } from '@usewaypoint/block-heading';

import { isBoldWeight, withBreakOpportunities } from '../helpers/breakLongTokens.js';
import { insetWidth, useEmailBox } from '../helpers/emailBox.js';
import { EmailTable } from '../helpers/emailTable.js';
import { resolveTypography, textStyle, useTypography } from '../helpers/emailTypography.js';

export type HeadingProps = z.infer<typeof HeadingPropsSchema>;

const HEADING_FONT_SIZES = { h1: 32, h2: 24, h3: 20 } as const;

/**
 * Renders a heading wrapped in an email-friendly table: padding and background go on the table cell,
 * the complete resolved typography on the heading element itself.
 *
 * The h1/h2/h3 element is kept for accessibility, with its margin reset, the level's size (32/24/20px),
 * bold unless overridden, Word's own line height and Word kerning off (Word's Heading styles kern, which
 * makes headings narrower than in browsers). Tokens too wide for the block get break opportunities
 * (Word would widen the email instead of wrapping them).
 *
 * @param style - Optional block style; `padding` and `backgroundColor` apply to the table cell, the rest to the heading.
 * @param props - `text` and `level` (default h2).
 * @returns The heading inside an EmailTable.
 */
export default function HeadingReader({ style, props }: HeadingProps) {
  const layoutTypography = useTypography();
  const box = useEmailBox();
  const level = props?.level ?? 'h2';
  const typography = resolveTypography(layoutTypography, {
    fontFamily: style?.fontFamily,
    fontSize: HEADING_FONT_SIZES[level],
    color: style?.color,
    fontWeight: style?.fontWeight ?? 'bold',
  });
  const padding = style?.padding ?? undefined;
  const text = withBreakOpportunities(props?.text ?? '', {
    width: insetWidth(box.width, padding),
    fontSize: typography.fontSize,
    bold: isBoldWeight(typography.fontWeight),
    letterSpacing: typography.letterSpacing,
  });
  const Tag = level;

  return (
    <EmailTable backgroundColor={style?.backgroundColor ?? undefined} padding={padding}>
      <Tag style={{ margin: 0, ...textStyle(typography, { heading: true }), textAlign: style?.textAlign ?? undefined }}>{text}</Tag>
    </EmailTable>
  );
}
