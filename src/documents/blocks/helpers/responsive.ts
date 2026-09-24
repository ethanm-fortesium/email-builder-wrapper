// Shared constants for responsive (mobile) email behaviour.
//
// The multi-column layout uses a fluid/hybrid technique: each column is an
// inline-block that is `width:100%` capped by a per-column `max-width`, so the
// columns sit side-by-side while they fit and wrap to a stack once the viewport
// is narrower than their combined width — no media query required. Outlook is
// held side-by-side via conditional-comment "ghost tables".
//
// The media query below is a progressive enhancement: on the small screens that
// support it, it forces a clean full-width stack (overriding any per-column
// fixed max-width) rather than relying purely on the fluid wrap.

export const STACK_COLUMN_CLASS = 'email-col-stack';

export const MOBILE_BREAKPOINT_PX = 600;

export const RESPONSIVE_STYLE_CSS =
  `@media only screen and (max-width:${MOBILE_BREAKPOINT_PX}px){` +
  `.${STACK_COLUMN_CLASS}{max-width:100%!important;}` +
  `}`;
