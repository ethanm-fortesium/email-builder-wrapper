import React, { useRef } from 'react';

import { Box } from '@mui/material';

import {
  INSPECTOR_DRAWER_WIDTH,
  getEditorState,
  setInspectorDrawerResizing,
  setInspectorDrawerWidth,
  useInspectorDrawerResizing,
} from '../../documents/editor/EditorContext.js';

/** Keyboard step in px (with Shift: SHIFT_STEP). */
const STEP = 16;
const SHIFT_STEP = 64;

type Props = {
  /** The drawer's current width in px. */
  width: number;
  /** The widest the drawer may be in px, measured when a resize starts. */
  maxWidth: () => number;
};

/**
 * The inspector drawer's draggable left edge. Dragging it left widens the drawer (the canvas
 * shrinks to make room); the width is remembered in this browser. Also a focusable separator:
 * arrow keys resize it (Shift for bigger steps), Home and End go to the narrowest and widest,
 * and a double-click or Enter restores the default width.
 */
export default function InspectorResizeHandle({ width, maxWidth }: Props) {
  const resizing = useInspectorDrawerResizing();
  const drag = useRef<{ pointerId: number; startX: number; startWidth: number; max: number } | null>(null);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: width, max: maxWidth() };
    setInspectorDrawerResizing(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== event.pointerId) {
      return;
    }
    // The drawer is anchored right: moving the pointer left makes it wider.
    setInspectorDrawerWidth(d.startWidth + d.startX - event.clientX, { max: d.max, persist: false });
  };

  const endDrag = () => {
    if (!drag.current) {
      return;
    }
    drag.current = null;
    setInspectorDrawerResizing(false);
    setInspectorDrawerWidth(getEditorState().inspectorDrawerWidth);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? SHIFT_STEP : STEP;
    const next: Record<string, number> = {
      ArrowLeft: width + step,
      ArrowRight: width - step,
      Home: INSPECTOR_DRAWER_WIDTH.min,
      End: INSPECTOR_DRAWER_WIDTH.max,
      Enter: INSPECTOR_DRAWER_WIDTH.default,
    };
    if (event.key in next) {
      event.preventDefault();
      setInspectorDrawerWidth(next[event.key], { max: maxWidth() });
    }
  };

  return (
    <Box
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      aria-valuenow={width}
      aria-valuemin={INSPECTOR_DRAWER_WIDTH.min}
      aria-valuemax={INSPECTOR_DRAWER_WIDTH.max}
      tabIndex={0}
      title="Drag to resize. Double-click to reset."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onDoubleClick={() => setInspectorDrawerWidth(INSPECTOR_DRAWER_WIDTH.default)}
      onKeyDown={onKeyDown}
      sx={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: -4,
        width: 8,
        zIndex: 2,
        cursor: 'col-resize',
        touchAction: 'none',
        outline: 'none',
        // The visible line: on the drawer's edge, shown on hover, focus and while dragging.
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 3,
          width: 2,
          bgcolor: resizing ? 'primary.main' : 'transparent',
          transition: 'background-color 120ms',
        },
        '&:hover::after, &:focus-visible::after': { bgcolor: 'primary.main' },
      }}
    />
  );
}
