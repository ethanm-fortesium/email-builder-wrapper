import React, { useState } from 'react';
import { ZodError } from 'zod';

import { HeightOutlined } from '@mui/icons-material';
import { DividerProps, DividerPropsDefaults, DividerPropsSchema } from '@usewaypoint/block-divider';

import BaseSidebarPanel from './helpers/BaseSidebarPanel.js';
import ColorInput from './helpers/inputs/ColorInput/index.js';
import SliderInput from './helpers/inputs/SliderInput.js';
import MultiStylePropertyPanel from './helpers/style-inputs/MultiStylePropertyPanel.js';

type DividerSidebarPanelProps = {
  data: DividerProps;
  setData: (v: DividerProps) => void;
};
/**
 * Sidebar panel for editing a Divider block's properties.
 *
 * Renders controls for line color, height, and style; validates changes with `DividerPropsSchema` and calls `setData` with the validated updated `DividerProps`. Validation errors are retained in component state.
 *
 * @param data - The current `DividerProps` being edited.
 * @param setData - Callback invoked with the updated `DividerProps` when validation succeeds.
 * @returns The sidebar panel JSX element for the Divider block.
 */
export default function DividerSidebarPanel({ data, setData }: DividerSidebarPanelProps) {
  const [, setErrors] = useState<ZodError | null>(null);
  const updateData = (d: unknown) => {
    const res = DividerPropsSchema.safeParse(d);
    if (res.success) {
      setData(res.data);
      setErrors(null);
    } else {
      setErrors(res.error);
    }
  };

  const lineColor = data.props?.lineColor ?? DividerPropsDefaults.lineColor;
  const lineHeight = data.props?.lineHeight ?? DividerPropsDefaults.lineHeight;

  return (
    <BaseSidebarPanel title="Divider block">
      <ColorInput
        label="Colour"
        defaultValue={lineColor}
        onChange={(lineColor) => updateData({ ...data, props: { ...data.props, lineColor } })}
      />
      <SliderInput
        label="Height"
        iconLabel={<HeightOutlined sx={{ color: 'text.secondary' }} />}
        units="px"
        step={1}
        min={1}
        max={24}
        defaultValue={lineHeight}
        onChange={(lineHeight) => updateData({ ...data, props: { ...data.props, lineHeight } })}
      />
      <MultiStylePropertyPanel
        names={['backgroundColor', 'padding']}
        value={data.style}
        onChange={(style) => updateData({ ...data, style })}
      />
    </BaseSidebarPanel>
  );
}