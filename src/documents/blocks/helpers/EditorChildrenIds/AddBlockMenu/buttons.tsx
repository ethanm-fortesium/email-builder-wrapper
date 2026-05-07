import React from 'react';

import {
  AccountCircleOutlined,
  Crop32Outlined,
  HMobiledataOutlined,
  HorizontalRuleOutlined,
  HtmlOutlined,
  ImageOutlined,
  LibraryAddOutlined,
  NotesOutlined,
  SmartButtonOutlined,
  ViewColumnOutlined,
  ContactMailOutlined,
  WysiwygOutlined,
} from '@mui/icons-material';

import { TEditorBlock } from '../../../../editor/core.js';
import { getApiBaseUrl, type EmailBuilderDefaults } from '../../../../editor/EditorContext.js';

import sampleImage from '../../../../../assets/512px.png';
import sampleAvatar from '../../../../../assets/round-avatar.png';

type TButtonProps = {
  label: string;
  icon: JSX.Element;
  block: () => TEditorBlock;
};

const FALLBACK_FONT_FAMILY = 'MODERN_SANS';

const FALLBACK_SIGNATURE_PROPS = {
  fullName: 'Jane Doe',
  title: 'Account Executive',
  company: 'Fortesium Ltd',
  email: 'info@fortesium.co.uk',
  website: 'https://www.fortesium.co.uk',
  phone: '(020) 3397 3712',
  social: { linkedIn: 'https://linkedin.com/company/fortesium', twitter: 'https://x.com/FortesiumUK' },
};

export function getButtons(defaults?: EmailBuilderDefaults | null): TButtonProps[] {
  // fontSize is intentionally NOT applied per-block; new blocks inherit from EmailLayout's baseFontSize
  // so that changing the layout slider visibly updates everything that hasn't been individually overridden.
  const fontFamily = defaults?.fontFamilyKey ?? FALLBACK_FONT_FAMILY;
  const savedSignature = defaults?.signature ?? null;

  const apiBase = getApiBaseUrl();
  const fallbackLogoUrl = apiBase ? `${apiBase}/Content/email-builder/logo.png` : null;

  return [
    {
      label: 'Heading',
      icon: <HMobiledataOutlined />,
      block: () => ({
        type: 'Heading',
        data: {
          props: { text: 'Hello friend' },
          // Heading sizes are driven by level (h1/h2/h3); only fontFamily flows from defaults.
          style: {
            padding: { top: 16, bottom: 16, left: 24, right: 24 },
            fontFamily: fontFamily as any,
          },
        },
      }),
    },
    {
      label: 'Text',
      icon: <NotesOutlined />,
      block: () => ({
        type: 'Text',
        data: {
          props: { text: 'My new text block' },
          // No explicit fontSize — block inherits EmailLayout baseFontSize so the layout slider actually works.
          style: {
            padding: { top: 16, bottom: 16, left: 24, right: 24 },
            fontFamily: fontFamily as any,
            fontWeight: 'normal',
          },
        },
      }),
    },
    {
      label: 'Button',
      icon: <SmartButtonOutlined />,
      block: () => ({
        type: 'Button',
        data: {
          props: {
            text: 'Button',
            url: '#',
          },
          style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
        },
      }),
    },
    {
      label: 'Image',
      icon: <ImageOutlined />,
      block: () => ({
        type: 'Image',
        data: {
          props: {
            url: sampleImage,
            alt: 'Sample image',
            contentAlignment: 'middle',
            linkHref: null,
          },
          style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
        },
      }),
    },
    {
      label: 'Avatar',
      icon: <AccountCircleOutlined />,
      block: () => ({
        type: 'Avatar',
        data: {
          props: {
            imageUrl: sampleAvatar,
            shape: 'circle',
          },
          style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
        },
      }),
    },
    {
      label: 'Divider',
      icon: <HorizontalRuleOutlined />,
      block: () => ({
        type: 'Divider',
        data: {
          style: { padding: { top: 16, right: 0, bottom: 16, left: 0 } },
          props: {
            lineColor: '#CCCCCC',
          },
        },
      }),
    },
    {
      label: 'Spacer',
      icon: <Crop32Outlined />,
      block: () => ({
        type: 'Spacer',
        data: {},
      }),
    },
    {
      label: 'Html',
      icon: <HtmlOutlined />,
      block: () => ({
        type: 'Html',
        data: {
          props: { contents: '<strong>Hello world</strong>' },
          // No explicit fontSize — inherit from EmailLayout baseFontSize.
          style: {
            textAlign: null,
            padding: { top: 16, bottom: 16, left: 24, right: 24 },
          },
        },
      }),
    },
    {
      label: 'Columns',
      icon: <ViewColumnOutlined />,
      block: () => ({
        type: 'ColumnsContainer',
        data: {
          props: {
            columnsGap: 16,
            columnsCount: 3,
            columns: [{ childrenIds: [] }, { childrenIds: [] }, { childrenIds: [] }],
          },
          style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
        },
      }),
    },
    {
      label: 'Container',
      icon: <LibraryAddOutlined />,
      block: () => ({
        type: 'Container',
        data: {
          props: {},
          style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
        },
      }),
    },
    {
      label: 'Signature',
      icon: <ContactMailOutlined />,
      block: () => ({
        type: 'Signature',
        data: {
          // No explicit fontSize on the wrapper — inherits from EmailLayout baseFontSize.
          // Saved signature styles can still set fontSize and will win via the spread below.
          style: {
            padding: { top: 16, bottom: 24, left: 24, right: 24 },
            fontFamily,
            fontWeight: 400,
            ...(savedSignature?.style ?? {}),
          },
          props: savedSignature?.props ?? { ...FALLBACK_SIGNATURE_PROPS, logoUrl: fallbackLogoUrl },
        },
      }),
    },
    {
      label: 'Rich Text',
      icon: <WysiwygOutlined />,
      block: () => ({
        type: 'RichText',
        data: {
          props: { html: '<p>This is a <strong>rich text</strong> block. You can edit <em>font styles</em>, <u>links</u>, and more!</p>' },
          // No explicit fontSize — inherit from EmailLayout baseFontSize.
          style: { padding: { top: 16, bottom: 16, left: 24, right: 24 }, fontFamily },
        },
      }),
    },
  ];
}
