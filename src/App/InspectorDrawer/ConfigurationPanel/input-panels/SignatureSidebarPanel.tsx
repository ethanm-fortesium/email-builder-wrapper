import React, { useState } from 'react';
import { ZodError } from 'zod';
import BaseSidebarPanel from './helpers/BaseSidebarPanel.js';
import TextInput from './helpers/inputs/TextInput.js';
import MultiStylePropertyPanel from './helpers/style-inputs/MultiStylePropertyPanel.js';
import SliderInput from './helpers/inputs/SliderInput.js';
import { AspectRatioOutlined } from '@mui/icons-material';
import SignaturePropsSchema, { SignatureProps } from '../../../../documents/blocks/Signature/SignaturePropsSchema.js';

type Props = { data: SignatureProps; setData: (v: SignatureProps) => void; apiBaseUrl: string };
export default function SignatureSidebarPanel({ data, setData, apiBaseUrl }: Props) {
  const [, setErrors] = useState<ZodError | null>(null);

  const updateData = (d: unknown) => {
    const res = SignaturePropsSchema.safeParse(d);
    if (res.success) {
      setData(res.data);
      setErrors(null);
    } else {
      setErrors(res.error);
    }
  };

  const props = data.props || {};
  const style = data.style;
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('identifier', 'signature-logo');
    formData.append('component', 'wysiwyg');
    formData.append('AccessControl', 'Public');
    formData.append('file', file);
    try {
      const res = await fetch(`${apiBaseUrl}/api/Documents/Upload?location=tempfiles`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      const json = await res.json();
      const url = apiBaseUrl + json.payload[0].url + '?download=false';
      updateData({ ...data, props: { ...props, logoUrl: url } });
    } catch (e) {
      console.error(e);
      alert('Logo upload failed');
    } finally {
      setUploading(false);
    }
  };

  const sanitizeNullable = (val: string): string | null => {
    const trimmed = val.trim();
    return trimmed.length === 0 ? null : trimmed;
  };

  const setProp = (key: string, value: unknown) => {
    updateData({
      ...data,
      props: {
        ...props,
        [key]: value,
      },
    });
  };

  const setSocial = (key: string, value: string) => {
    updateData({
      ...data,
      props: {
        ...props,
        social: {
          ...props.social,
          [key]: sanitizeNullable(value),
        },
      },
    });
  };

  const removeLogo = () => {
    const { logoUrl, logoWidth, ...rest } = props as any;
    updateData({
      ...data,
      props: {
        ...rest,
        logoUrl: null,
        logoWidth: null,
      },
    });
  };

  return (
    <BaseSidebarPanel title="Signature block">
      {props.logoUrl && (
        <SliderInput
          label="Logo width"
          iconLabel={<AspectRatioOutlined sx={{ color: 'text.secondary' }} />}
          units="px"
          step={4}
          min={32}
          max={400}
          defaultValue={props.logoWidth || 160}
          onChange={(val) => setProp('logoWidth', val)}
        />
      )}
        {props.logoUrl && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <small style={{ opacity: 0.8 }}>Logo set</small>
            <button
              type="button"
              onClick={removeLogo}
              style={{ background: 'none', border: '1px solid #ccc', padding: '2px 6px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
            >Remove logo</button>
          </div>
        )}
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
    <TextInput label="Full name" defaultValue={props.fullName || ''} onChange={(v: string) => setProp('fullName', sanitizeNullable(v))} />
    <TextInput label="Title" defaultValue={props.title || ''} onChange={(v: string) => setProp('title', sanitizeNullable(v))} />
    <TextInput label="Company" defaultValue={props.company || ''} onChange={(v: string) => setProp('company', sanitizeNullable(v))} />
    <TextInput label="Email" defaultValue={props.email || ''} onChange={(v: string) => setProp('email', sanitizeNullable(v))} />
    <TextInput label="Phone" defaultValue={props.phone || ''} onChange={(v: string) => setProp('phone', sanitizeNullable(v))} />
    <TextInput label="Website" defaultValue={props.website || ''} onChange={(v: string) => setProp('website', sanitizeNullable(v))} />
    <TextInput label="Address" rows={3} defaultValue={(props as any).address || ''} onChange={(v: string) => setProp('address', sanitizeNullable(v))} />
    <TextInput label="Disclaimer HTML" rows={3} defaultValue={props.disclaimerHtml || ''} onChange={(v: string) => setProp('disclaimerHtml', sanitizeNullable(v))} />
    <TextInput label="LinkedIn URL" defaultValue={props.social?.linkedIn || ''} onChange={(v: string) => setSocial('linkedIn', v)} />
    <TextInput label="Facebook URL" defaultValue={props.social?.facebook || ''} onChange={(v: string) => setSocial('facebook', v)} />
    <TextInput label="Twitter URL" defaultValue={props.social?.twitter || ''} onChange={(v: string) => setSocial('twitter', v)} />
    <TextInput label="Instagram URL" defaultValue={props.social?.instagram || ''} onChange={(v: string) => setSocial('instagram', v)} />
    <MultiStylePropertyPanel names={['color', 'fontFamily', 'fontSize', 'fontWeight', 'textAlign', 'padding']} value={style} onChange={(style: any) => updateData({ ...data, style })} />
    </BaseSidebarPanel>
  );
}
