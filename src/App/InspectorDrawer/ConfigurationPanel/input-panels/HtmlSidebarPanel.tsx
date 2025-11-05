import React, { useState } from 'react';
import { ZodError } from 'zod';

import { Alert } from '@mui/material';
import { HtmlProps, HtmlPropsSchema } from '@usewaypoint/block-html';

import BaseSidebarPanel from './helpers/BaseSidebarPanel.js';
import TextInput from './helpers/inputs/TextInput.js';
import MultiStylePropertyPanel from './helpers/style-inputs/MultiStylePropertyPanel.js';

type HtmlSidebarPanelProps = {
  data: HtmlProps;
  setData: (v: HtmlProps) => void;
};
export default function HtmlSidebarPanel({ data, setData }: HtmlSidebarPanelProps) {
  const [errors, setErrors] = useState<ZodError | null>(null);

  const updateData = (d: unknown) => {
    const res = HtmlPropsSchema.safeParse(d);
    if (res.success) {
      setData(res.data);
      setErrors(null);
    } else {
      setErrors(res.error);
    }
  };

  return (
    <BaseSidebarPanel title="Html block">
      {errors && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.issues.map((issue, index) => (
            <div key={index}>
              {issue.path.join('.')} - {issue.message}
            </div>
          ))}
        </Alert>
      )}
      <TextInput
        label="Content"
        rows={5}
        defaultValue={data.props?.contents ?? ''}
        onChange={(contents) => updateData({ ...data, props: { ...data.props, contents } })}
      />
      <MultiStylePropertyPanel
        names={['color', 'backgroundColor', 'fontFamily', 'fontSize', 'textAlign', 'padding']}
        value={data.style}
        onChange={(style) => updateData({ ...data, style })}
      />
    </BaseSidebarPanel>
  );
}
