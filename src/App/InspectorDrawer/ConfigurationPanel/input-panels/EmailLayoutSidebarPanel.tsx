import React, { useState } from 'react';
import { ZodError } from 'zod';

import { RoundedCornerOutlined } from '@mui/icons-material';

import EmailLayoutPropsSchema, {
  EmailLayoutProps,
} from '../../../../documents/blocks/EmailLayout/EmailLayoutPropsSchema.js';

import BaseSidebarPanel from './helpers/BaseSidebarPanel.js';
import ColorInput, { NullableColorInput } from './helpers/inputs/ColorInput/index.js';
import { NullableFontFamily } from './helpers/inputs/FontFamily.js';
import SliderInput from './helpers/inputs/SliderInput.js';
import RadioGroupInput from './helpers/inputs/RadioGroupInput.js';
import { ToggleButton } from '@mui/material';

type EmailLayoutSidebarFieldsProps = {
  data: EmailLayoutProps;
  setData: (v: EmailLayoutProps) => void;
};
/**
 * Renders the "Global" sidebar fields for editing email layout properties and propagates validated updates.
 *
 * The component presents controls for backdrop colour, canvas colour, optional canvas border colour,
 * canvas border radius, canvas width, font family, and text colour. When a control changes, the
 * new layout object is validated; valid updates are passed to `setData`, and validation errors are
 * stored in component state.
 *
 * @param data - Current email layout properties displayed by the controls
 * @param setData - Callback invoked with validated email layout properties when an update succeeds
 * @returns The sidebar panel containing inputs for global email layout settings
 */
export default function EmailLayoutSidebarFields({ data, setData }: EmailLayoutSidebarFieldsProps) {
  const [, setErrors] = useState<ZodError | null>(null);

  const updateData = (d: unknown) => {
    const res = EmailLayoutPropsSchema.safeParse(d);
    if (res.success) {
      setData(res.data);
      setErrors(null);
    } else {
      setErrors(res.error);
    }
  };

  return (
    <BaseSidebarPanel title="Global">
      <ColorInput
        label="Backdrop colour"
        defaultValue={data.backdropColor ?? '#F5F5F5'}
        onChange={(backdropColor) => updateData({ ...data, backdropColor })}
      />
      <ColorInput
        label="Canvas colour"
        defaultValue={data.canvasColor ?? '#FFFFFF'}
        onChange={(canvasColor) => updateData({ ...data, canvasColor })}
      />
      <NullableColorInput
        label="Canvas border colour"
        defaultValue={data.borderColor ?? null}
        onChange={(borderColor) => updateData({ ...data, borderColor })}
      />
      <SliderInput
        iconLabel={<RoundedCornerOutlined />}
        units="px"
        step={4}
        marks
        min={0}
        max={48}
        label="Canvas border radius"
        defaultValue={data.borderRadius ?? 0}
        onChange={(borderRadius) => updateData({ ...data, borderRadius })}
      />
      <RadioGroupInput
        label="Canvas width"
        defaultValue={String(data.canvasWidth ?? 600)}
        onChange={(v) => {
          const canvasWidth = parseInt(v, 10);
          updateData({ ...data, canvasWidth });
        }}
      >
        <ToggleButton value="600">Standard (600px)</ToggleButton>
        <ToggleButton value="900">Wide (900px)</ToggleButton>
      </RadioGroupInput>
      <NullableFontFamily
        label="Font family"
        defaultValue={data.fontFamily ?? "MODERN_SANS"}
        onChange={(fontFamily) => updateData({ ...data, fontFamily })}
      />
      <ColorInput
        label="Text colour"
        defaultValue={data.textColor ?? '#262626'}
        onChange={(textColor) => updateData({ ...data, textColor })}
      />
      
    </BaseSidebarPanel>
  );
}