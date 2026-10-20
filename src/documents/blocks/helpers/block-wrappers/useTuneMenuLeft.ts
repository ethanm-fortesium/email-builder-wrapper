import { RefObject, useLayoutEffect, useState } from 'react';

/** The menu's preferred offset in px: its width (48px) plus an 8px gap, to the left of the block. */
export const TUNE_MENU_OFFSET = 56;
/** Smallest gap in px kept between the menu and the edge of the area that clips it. */
const EDGE_GAP = 4;

/** The nearest ancestor that clips horizontal overflow (the canvas's scroll area), or null for the viewport. */
function clippingAncestor(el: HTMLElement) {
  for (let e = el.parentElement; e; e = e.parentElement) {
    const style = getComputedStyle(e);
    if (/^(auto|scroll|hidden|clip)\b/.test(style.overflowX || style.overflow)) {
      return e;
    }
  }
  return null;
}

/**
 * The `left` offset in px for a block's tune menu (`ref`, a direct child of the block wrapper).
 *
 * The menu sits outside the block, to its left. When the canvas fills the editor area (a 900px
 * canvas, a narrow window or a wide inspector), there is no room there and the scroll area would
 * cut the menu off, so it moves right just as far as it must to stay visible, overlapping the
 * block when the block touches the area's edge. Measured again whenever the block, the area or
 * the window resizes, or the area scrolls.
 *
 * @param ref - The menu element.
 * @returns A negative (or zero) px offset from the block's left edge.
 */
export default function useTuneMenuLeft(ref: RefObject<HTMLElement>) {
  const [left, setLeft] = useState(-TUNE_MENU_OFFSET);

  useLayoutEffect(() => {
    const block = ref.current?.parentElement;
    if (!block) {
      return;
    }
    const area = clippingAncestor(block);
    const update = () => {
      const room = block.getBoundingClientRect().left - (area?.getBoundingClientRect().left ?? 0) - EDGE_GAP;
      const offset = Math.max(0, Math.min(TUNE_MENU_OFFSET, Math.floor(room)));
      setLeft(offset > 0 ? -offset : 0);
    };
    update();

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(block);
    if (area) {
      observer?.observe(area);
    }
    window.addEventListener('resize', update);
    area?.addEventListener('scroll', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
      area?.removeEventListener('scroll', update);
    };
  }, [ref]);

  return left;
}
