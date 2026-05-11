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
 * Renders the Global sidebar fields for editing email layout properties and propagates validated updates.
 *
 * The "Save layout as default" button captures the complete
 * set of layout fields (font, font size, text colour, canvas width, canvas / backdrop / border colour,
 * border radius) and dispatches them as a single payload; the matches-default star fills when every
 * field on this email exactly equals the saved layout default.
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

  const effectiveBackdropColor = data.backdropColor ?? defaults?.backdropColor ?? '#F5F5F5';
  const effectiveCanvasColor = data.canvasColor ?? defaults?.canvasColor ?? '#FFFFFF';
  const effectiveBorderColor = data.borderColor ?? defaults?.borderColor ?? null;
  const effectiveBorderRadius = data.borderRadius ?? defaults?.borderRadius ?? 0;
  const effectiveCanvasWidth = data.canvasWidth ?? defaults?.canvasWidth ?? 600;
  const effectiveFontFamily = data.fontFamily ?? defaults?.fontFamilyKey ?? 'MODERN_SANS';
  const effectiveBaseFontSize = data.baseFontSize ?? defaults?.fontSizePx ?? 16;
  const effectiveTextColor = data.textColor ?? defaults?.textColor ?? '#262626';


  const currentLayoutSnapshot = {
    fontFamilyKey: effectiveFontFamily,
    fontSizePx: effectiveBaseFontSize,
    textColor: effectiveTextColor,
    canvasWidth: effectiveCanvasWidth,
    canvasColor: effectiveCanvasColor,
    backdropColor: effectiveBackdropColor,
    borderColor: effectiveBorderColor,
    borderRadius: effectiveBorderRadius,
  };

  const savedLayoutSnapshot = {
    fontFamilyKey: defaults?.fontFamilyKey ?? null,
    fontSizePx: defaults?.fontSizePx ?? null,
    textColor: defaults?.textColor ?? null,
    canvasWidth: defaults?.canvasWidth ?? null,
    canvasColor: defaults?.canvasColor ?? null,
    backdropColor: defaults?.backdropColor ?? null,
    borderColor: defaults?.borderColor ?? null,
    borderRadius: defaults?.borderRadius ?? null,
  };

  const hasAnySavedLayoutDefault = Object.values(savedLayoutSnapshot).some((v) => v !== null);
  const matchesSavedLayoutDefault = hasAnySavedLayoutDefault && stableEqual(currentLayoutSnapshot, savedLayoutSnapshot);

  return (
    <BaseSidebarPanel title="Global">
      <ColorInput
        label="Backdrop colour"
        defaultValue={effectiveBackdropColor}
        onChange={(backdropColor) => updateData({ ...data, backdropColor })}
      />
      <ColorInput
        label="Canvas colour"
        defaultValue={effectiveCanvasColor}
        onChange={(canvasColor) => updateData({ ...data, canvasColor })}
      />
      <NullableColorInput
        label="Canvas border colour"
        defaultValue={effectiveBorderColor}
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
        defaultValue={effectiveBorderRadius}
        onChange={(borderRadius) => updateData({ ...data, borderRadius })}
      />
      <RadioGroupInput
        label="Canvas width"
        defaultValue={String(effectiveCanvasWidth)}
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
            layout: currentLayoutSnapshot,
          });
        }}
      >
        {matchesSavedLayoutDefault ? 'Layout matches default' : 'Save layout as default'}
      </Button>

    </BaseSidebarPanel>
  );
}
