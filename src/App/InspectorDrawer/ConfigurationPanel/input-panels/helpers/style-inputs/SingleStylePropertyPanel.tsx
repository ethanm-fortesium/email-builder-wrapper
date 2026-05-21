import React from 'react';

import { FormatLineSpacingOutlined, RoundedCornerOutlined } from '@mui/icons-material';

import { TStyle } from '../../../../../../documents/blocks/helpers/TStyle.js';
import { useDocument } from '../../../../../../documents/editor/EditorContext.js';
import { NullableColorInput } from '../inputs/ColorInput/index.js';
import { NullableFontFamily } from '../inputs/FontFamily.js';
import FontSizeInput from '../inputs/FontSizeInput.js';
import FontWeightInput from '../inputs/FontWeightInput.js';
import PaddingInput from '../inputs/PaddingInput.js';
import SliderInput from '../inputs/SliderInput.js';
import TextAlignInput from '../inputs/TextAlignInput.js';

type StylePropertyPanelProps = {
  name: keyof TStyle;
  value: TStyle;
  onChange: (style: TStyle) => void;
};
/**
 * Render the appropriate input control for a single style property.
 *
 * @param name - The key of the style property to render a control for.
 * @param value - The current style object from which the property's value is read.
 * @param onChange - Callback invoked with the updated style object when the property's value changes.
 * @returns The React element for the requested property control, or `undefined` if the property is not supported.
 */
export default function SingleStylePropertyPanel({ name, value, onChange }: StylePropertyPanelProps) {
  // Resolve fontSize / fontFamily against the EmailLayout's globals so the inputs reflect
  // what the block actually renders at when no explicit style.X is set on the block.
  // Inputs are uncontrolled (defaultValue), so this only seeds the initial position —
  // the block's data isn't mutated until the user actually interacts.
  const document = useDocument();
  const layoutData = (document.root as any)?.data;
  const layoutBaseFontSize = layoutData?.baseFontSize ?? 16;
  const layoutFontFamily = layoutData?.fontFamily ?? null;

  const rawValue = value[name];
  let defaultValue: any;
  switch (name) {
    case 'fontSize':
      defaultValue = rawValue ?? layoutBaseFontSize;
      break;
    case 'fontFamily':
      defaultValue = rawValue ?? layoutFontFamily;
      break;
    default:
      defaultValue = rawValue ?? null;
  }

  const handleChange = (v: any) => {
    onChange({ ...value, [name]: v });
  };

  switch (name) {
    case 'backgroundColor':
      return <NullableColorInput label="Background colour" defaultValue={defaultValue} onChange={handleChange} />;
    case 'borderColor':
      return <NullableColorInput label="Border colour" defaultValue={defaultValue} onChange={handleChange} />;
    case 'borderRadius':
      return (
        <SliderInput
          iconLabel={<RoundedCornerOutlined />}
          units="px"
          step={4}
          marks
          min={0}
          max={48}
          label="Border radius"
          defaultValue={defaultValue}
          onChange={handleChange}
        />
      );
    case 'color':
      return <NullableColorInput label="Text colour" defaultValue={defaultValue} onChange={handleChange} />;
    case 'fontFamily':
      return <NullableFontFamily label="Font family" defaultValue={defaultValue} onChange={handleChange} />;
    case 'fontSize':
      return <FontSizeInput label="Font size" defaultValue={defaultValue} onChange={handleChange} />;
    case 'fontWeight':
      return <FontWeightInput label="Font weight" defaultValue={defaultValue} onChange={handleChange} />;
    case 'textAlign':
      return <TextAlignInput label="Alignment" defaultValue={defaultValue} onChange={handleChange} />;
    case 'lineHeight':
      return (
        <SliderInput
          iconLabel={<FormatLineSpacingOutlined />}
          label="Line height"
          units=""
          step={0.1}
          min={1}
          max={3}
          defaultValue={defaultValue ?? 1.5}
          onChange={handleChange}
        />
      );
    case 'padding':
      return <PaddingInput label="Padding" defaultValue={defaultValue} onChange={handleChange} />;
  }
}