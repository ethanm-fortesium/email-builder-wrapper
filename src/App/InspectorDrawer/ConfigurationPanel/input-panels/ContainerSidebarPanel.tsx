import React, { useState } from 'react';
import { ZodError } from 'zod';

import ContainerPropsSchema, { ContainerProps } from '../../../../documents/blocks/Container/ContainerPropsSchema.js';

import BaseSidebarPanel from './helpers/BaseSidebarPanel.js';
import MultiStylePropertyPanel from './helpers/style-inputs/MultiStylePropertyPanel.js';

type ContainerSidebarPanelProps = {
  data: ContainerProps;
  setData: (v: ContainerProps) => void;
};

export default function ContainerSidebarPanel({ data, setData }: ContainerSidebarPanelProps) {
  const [, setErrors] = useState<ZodError | null>(null);
  const updateData = (d: unknown) => {
    const res = ContainerPropsSchema.safeParse(d);
    if (res.success) {
      setData(res.data);
      setErrors(null);
    } else {
      setErrors(res.error);
    }
  };
  return (
    <BaseSidebarPanel title="Container block">
      <MultiStylePropertyPanel
        names={['backgroundColor', 'borderColor', 'borderRadius', 'padding']}
        value={data.style}
        onChange={(style) => updateData({ ...data, style })}
      />
    </BaseSidebarPanel>
  );
}
