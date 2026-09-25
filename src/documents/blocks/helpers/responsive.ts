// Class hooks for responsive (mobile) email behaviour.
//
// The multi-column layout uses a fluid/hybrid technique: each column is an
// inline-block that is `width:100%` capped by a per-column `max-width`, so the
// columns sit side-by-side while they fit and wrap to a stack once the viewport
// is narrower than their combined width — no media query required. Outlook is
// held side-by-side via conditional-comment "ghost tables".
//
// The rules below are a progressive enhancement registered through the style
// registry (renderToStaticMarkup places them in the mobile media query): on the
// small screens that support it, stacked columns go full width, drop their
// horizontal gutters and take the gap as vertical spacing instead.

/** Outer inline-block of every fluid column. */
export const STACK_COLUMN_CLASS = 'email-col-stack';

/** Inner cell that carries a fluid column's horizontal gutter padding. */
export const COLUMN_PAD_CLASS = 'email-col-pad';

/** Class on stacked columns after the first: the gap becomes vertical spacing (on the transparent outer div). */
export function stackGapClass(gap: number) {
  return `email-col-gap-${Math.round(gap)}`;
}

/**
 * Media-query rules for fluid columns with the given gap.
 *
 * @param gap - The row's column gap in px (0 adds no vertical spacing rule).
 * @returns CSS rules (no media query wrapper) for the style registry's 'responsive' bucket.
 */
export function stackRules(gap: number) {
  const rules = [
    `.${STACK_COLUMN_CLASS}{max-width:100%!important;}`,
    `.${COLUMN_PAD_CLASS}{padding-left:0!important;padding-right:0!important;}`,
  ];
  if (Math.round(gap) > 0) {
    rules.push(`.${stackGapClass(gap)}{padding-top:${Math.round(gap)}px!important;}`);
  }
  return rules;
}
