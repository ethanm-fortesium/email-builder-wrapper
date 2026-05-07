import React, { useState } from 'react';
import { ZodError } from 'zod';

import { RoundedCornerOutlined, Star, StarBorderOutlined } from '@mui/icons-material';

import EmailLayoutPropsSchema, {
  EmailLayoutProps,
} from '../../../../documents/blocks/EmailLayout/EmailLayoutPropsSchema.js';
import { dispatchHostEvent, useDefaults } from '../../../../documents/editor/EditorContext.js';
import { stableEqual } from '../../../../utils/stableEqual.js';

import BaseSidebarPanel from './helpers/BaseSidebarPanel.js';
import ColorInput, { NullableColorInput } from './helpers/inputs/ColorInput/index.js';
import FontSizeInput from './helpers/inputs/FontSizeInput.js';
import { NullableFontFamily } from './helpers/inputs/FontFamily.js';
import SliderInput from './helpers/inputs/SliderInput.js';
import RadioGroupInput from './helpers/inputs/RadioGroupInput.js';
import { Button, ToggleButton } from '@mui/material';

type EmailLayoutSidebarFieldsProps = {
  data: EmailLayoutProps;
  setData: (v: EmailLayoutProps) => void;
};
/**
 * Renders the "Global" sidebar fields for editing email layout properties and propagates validated updates.
 *
 * The component presents controls for backdrop colour, canvas colour, optional canvas border colour,
 * canvas border radius, canvas width, font family, base font size, and text colour. When a control changes,
 * the new layout object is validated; valid updates are passed to `setData`, and validation errors are
 * stored in component state.
 *
 * Inputs prepopulate from the saved client-wide defaults when the email's own data has no value for that
 * field — covering older emails that pre-date the defaults feature.
 */
export default function EmailLayoutSidebarFields({ data, setData }: EmailLayoutSidebarFieldsProps) {
  const [, setErrors] = useState<ZodError | null>(null);
  const defaults = useDefaults();

  const updateData = (d: unknown) => {
    const res = EmailLayoutPropsSchema.safeParse(d);
    if (res.success) {
      setData(res.data);
      setErrors(null);
    } else {
      setErrors(res.error);
    }
  };

  const effectiveFontFamily = data.fontFamily ?? defaults?.fontFamilyKey ?? 'MODERN_SANS';
  const effectiveBaseFontSize = data.baseFontSize ?? defaults?.fontSizePx ?? 16;
  const effectiveTextColor = data.textColor ?? defaults?.textColor ?? '#262626';

  const matchesSavedLayoutDefault =
    !!defaults &&
    (defaults.fontFamilyKey != null || defaults.fontSizePx != null || defaults.textColor != null) &&
    stableEqual(
      {
        fontFamilyKey: data.fontFamily ?? null,
        fontSizePx: data.baseFontSize ?? null,
        textColor: data.textColor ?? null,
      },
      {
        fontFamilyKey: defaults.fontFamilyKey ?? null,
        fontSizePx: defaults.fontSizePx ?? null,
        textColor: defaults.textColor ?? null,
      }
    );

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
        defaultValue={effectiveFontFamily}
        onChange={(fontFamily) => updateData({ ...data, fontFamily })}
      />
      <FontSizeInput
        label="Base font size"
        defaultValue={effectiveBaseFontSize}
        onChange={(baseFontSize) => updateData({ ...data, baseFontSize })}
      />
      <ColorInput
        label="Text colour"
        defaultValue={effectiveTextColor}
        onChange={(textColor) => updateData({ ...data, textColor })}
      />
      <Button
        size="small"
        variant="outlined"
        color={matchesSavedLayoutDefault ? 'warning' : 'primary'}
        disabled={matchesSavedLayoutDefault}
        sx={
          matchesSavedLayoutDefault
            ? {
                '&.Mui-disabled': {
                  borderColor: 'warning.main',
                  color: 'warning.main',
                  opacity: 1,
                },
              }
            : undefined
        }
        startIcon={
          matchesSavedLayoutDefault ? (
            <Star sx={{ color: 'warning.main' }} />
          ) : (
            <StarBorderOutlined />
          )
        }
        onClick={() => {
          dispatchHostEvent('emailBuilderSaveAsDefault', {
            scope: 'layout',
            layout: {
              fontFamilyKey: data.fontFamily ?? null,
              fontSizePx: data.baseFontSize ?? null,
              textColor: data.textColor ?? null,
            },
          });
        }}
      >
        {matchesSavedLayoutDefault ? 'Layout matches default' : 'Save layout as default'}
      </Button>

    </BaseSidebarPanel>
  );
}
