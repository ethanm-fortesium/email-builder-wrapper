import React, { useState } from 'react';
import * as Zod from 'zod';
import {
  VerticalAlignBottomOutlined,
  VerticalAlignCenterOutlined,
  VerticalAlignTopOutlined,
} from '@mui/icons-material';
import { Stack, ToggleButton } from '@mui/material';
import { ImageProps, ImagePropsSchema } from '@usewaypoint/block-image';

import BaseSidebarPanel from './helpers/BaseSidebarPanel.js';
import RadioGroupInput from './helpers/inputs/RadioGroupInput.js';
import TextDimensionInput from './helpers/inputs/TextDimensionInput.js';
import TextInput from './helpers/inputs/TextInput.js';
import MultiStylePropertyPanel from './helpers/style-inputs/MultiStylePropertyPanel.js';
import type { TStyle } from '../../../../documents/blocks/helpers/TStyle.js';
import { resolveApiBaseUrl } from '../../../../utils/resolveApiBaseUrl.js';

type ImageSidebarPanelProps = {
  data: ImageProps;
  setData: (v: ImageProps) => void;
  apiBaseUrl: string; 
};
export default function ImageSidebarPanel({ data, setData, apiBaseUrl }: ImageSidebarPanelProps) {
  const [, setErrors] = useState<Zod.ZodError | null>(null);
  const [uploading, setUploading] = useState(false);

  const updateData = (d: unknown) => {
    const res = ImagePropsSchema.safeParse(d);
    if (res.success) {
      setData(res.data);
      setErrors(null);
    } else {
      setErrors(res.error);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);

    const formData = new FormData();
    formData.append('identifier', 'image-block'); // optional, adjust as needed
    formData.append('component', 'wysiwyg');
    formData.append('AccessControl', 'Public');
    formData.append('file', file);

    try {
      const uploadBase = resolveApiBaseUrl(apiBaseUrl) || window.location.origin;
      const uploadUrl = new URL('/api/Documents/Upload?location=tempfiles', uploadBase);

      const res = await fetch(uploadUrl.toString(), {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
      const json = await res.json();
      if (!json.payload || !Array.isArray(json.payload) || json.payload.length === 0) {
        throw new Error('Invalid upload response');
      }
      const uploadedUrl = new URL(json.payload[0].url, uploadBase);
      uploadedUrl.searchParams.set('download', 'false');
      const url = uploadedUrl.toString();

      // Update the block's data
      updateData({ ...data, props: { ...data.props, url } });
    } catch (err) {
      console.error(err);
      alert('Image upload failed. See console for details.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <BaseSidebarPanel title="Image block">
      <div style={{ marginBottom: 8 }}>
        <input
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleUpload(e.target.files[0]);
            }
          }}
        />
        {uploading && <span style={{ marginLeft: 8 }}>Uploading...</span>}
      </div>


      <TextInput
        label="Alt text"
        defaultValue={data.props?.alt ?? ''}
        onChange={(alt: string) => updateData({ ...data, props: { ...data.props, alt } })}
      />
      <TextInput
        label="Click through URL"
        defaultValue={data.props?.linkHref ?? ''}
        onChange={(value: string) => {
          const linkHref = value.trim().length === 0 ? null : value.trim();
          updateData({ ...data, props: { ...data.props, linkHref } });
        }}
      />
      <Stack direction="row" spacing={2}>
        <TextDimensionInput
          label="Width"
          defaultValue={data.props?.width}
          onChange={(width: string | number | null) => updateData({ ...data, props: { ...data.props, width } })}
        />
        <TextDimensionInput
          label="Height"
          defaultValue={data.props?.height}
          onChange={(height: string | number | null) => updateData({ ...data, props: { ...data.props, height } })}
        />
      </Stack>

      <RadioGroupInput
        label="Alignment"
        defaultValue={data.props?.contentAlignment ?? 'middle'}
        onChange={(contentAlignment: string) => updateData({ ...data, props: { ...data.props, contentAlignment } })}
      >
        <ToggleButton value="top">
          <VerticalAlignTopOutlined fontSize="small" />
        </ToggleButton>
        <ToggleButton value="middle">
          <VerticalAlignCenterOutlined fontSize="small" />
        </ToggleButton>
        <ToggleButton value="bottom">
          <VerticalAlignBottomOutlined fontSize="small" />
        </ToggleButton>
      </RadioGroupInput>

      <MultiStylePropertyPanel
        names={['backgroundColor', 'textAlign', 'padding']}
        value={data.style}
        onChange={(nextStyle: TStyle) => updateData({ ...data, style: nextStyle })}
      />
    </BaseSidebarPanel>
  );
}
