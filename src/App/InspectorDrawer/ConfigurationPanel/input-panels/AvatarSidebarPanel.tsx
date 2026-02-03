import React, { useState } from 'react';
import * as Zod from 'zod';

import { AspectRatioOutlined } from '@mui/icons-material';
import { ToggleButton } from '@mui/material';
import { AvatarProps, AvatarPropsDefaults, AvatarPropsSchema } from '@usewaypoint/block-avatar';

import BaseSidebarPanel from './helpers/BaseSidebarPanel.js';
import RadioGroupInput from './helpers/inputs/RadioGroupInput.js';
import SliderInput from './helpers/inputs/SliderInput.js';
import TextInput from './helpers/inputs/TextInput.js';
import MultiStylePropertyPanel from './helpers/style-inputs/MultiStylePropertyPanel.js';
import type { TStyle } from '../../../../documents/blocks/helpers/TStyle.js';
import { resolveApiBaseUrl } from '../../../../utils/resolveApiBaseUrl.js';

type AvatarSidebarPanelProps = {
  data: AvatarProps;
  setData: (v: AvatarProps) => void;
  apiBaseUrl: string;
};
/**
 * Sidebar panel for editing an avatar's properties and uploading avatar images.
 *
 * Provides controls for size, shape, alt text, and style, validates updates against the AvatarProps schema,
 * and uploads image files to the Documents API to set the avatar's `imageUrl`.
 *
 * @param data - Current avatar data object (props and style).
 * @param setData - Setter called with validated avatar data to persist changes.
 * @param apiBaseUrl - Optional API base URL used to resolve the upload endpoint; falls back to the page origin when not provided.
 * @returns The sidebar panel UI for configuring an Avatar block.
 */
export default function AvatarSidebarPanel({ data, setData, apiBaseUrl }: AvatarSidebarPanelProps) {
  const [, setErrors] = useState<Zod.ZodError | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const updateData = (d: unknown) => {
    const res = AvatarPropsSchema.safeParse(d);
    if (res.success) {
      setData(res.data);
      setErrors(null);
    } else {
      setErrors(res.error);
    }
  };

  const size = data.props?.size ?? AvatarPropsDefaults.size;
  const alt = data.props?.alt ?? AvatarPropsDefaults.alt;
  const shape = data.props?.shape ?? AvatarPropsDefaults.shape;
  
  const handleUpload = async (file: File) => {
    setUploading(true);

    const formData = new FormData();
    formData.append('identifier', 'image-block'); 
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
      const imageUrl = uploadedUrl.toString();
      updateData({ ...data, props: { ...data.props, imageUrl } });
    } catch (err) {
      console.error(err);
      alert('Image upload failed. See console for details.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <BaseSidebarPanel title="Avatar block">
      <SliderInput
        label="Size"
        iconLabel={<AspectRatioOutlined sx={{ color: 'text.secondary' }} />}
        units="px"
        step={3}
        min={32}
        max={256}
        defaultValue={size}
        onChange={(nextSize: number) => {
          updateData({ ...data, props: { ...data.props, size: nextSize } });
        }}
      />
      <RadioGroupInput
        label="Shape"
        defaultValue={shape}
        onChange={(nextShape: string) => {
          updateData({ ...data, props: { ...data.props, shape: nextShape } });
        }}
      >
        <ToggleButton value="circle">Circle</ToggleButton>
        <ToggleButton value="square">Square</ToggleButton>
        <ToggleButton value="rounded">Rounded</ToggleButton>
      </RadioGroupInput>

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
        defaultValue={alt}
        onChange={(nextAlt: string) => {
          updateData({ ...data, props: { ...data.props, alt: nextAlt } });
        }}
      />

      <MultiStylePropertyPanel
        names={['textAlign', 'padding']}
        value={data.style}
        onChange={(nextStyle: TStyle) => updateData({ ...data, style: nextStyle })}
      />
    </BaseSidebarPanel>
  );
}