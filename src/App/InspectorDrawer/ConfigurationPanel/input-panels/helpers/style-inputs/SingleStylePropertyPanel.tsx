import React from 'react';

import { RoundedCornerOutlined } from '@mui/icons-material';

import { TStyle } from '../../../../../../documents/blocks/helpers/TStyle.js';
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
export default function SingleStylePropertyPanel({ name, value, onChange }: StylePropertyPanelProps) {
  const defaultValue = value[name] ?? null;
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
    case 'padding':
      return <PaddingInput label="Padding" defaultValue={defaultValue} onChange={handleChange} />;
  }
}
