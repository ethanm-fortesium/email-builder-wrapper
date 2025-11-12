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

import sampleImage from '../../../../../assets/600x400.svg';
import sampleAvatar from '../../../../../assets/180x180.svg';
import fortesiumLogo from '../../../../../assets/fortesiumlogo.png';

type TButtonProps = {
  label: string;
  icon: JSX.Element;
  block: () => TEditorBlock;
};
export const BUTTONS: TButtonProps[] = [
  {
    label: 'Heading',
    icon: <HMobiledataOutlined />,
    block: () => ({
      type: 'Heading',
      data: {
        props: { text: 'Hello friend' },
        style: {
          padding: { top: 16, bottom: 16, left: 24, right: 24 },
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
        style: {
          padding: { top: 16, bottom: 16, left: 24, right: 24 },
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
        style: {
          fontSize: 16,
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
    label: 'Signature',
    icon: <ContactMailOutlined />,
    block: () => ({
      type: 'Signature',
      data: {
        style: { padding: { top: 16, bottom: 24, left: 24, right: 24 }, fontSize: 14, fontFamily: 'MODERN_SANS', fontWeight: 400 },
        props: {
          fullName: 'Jane Doe',
          title: 'Account Executive',
          company: 'Fortesium Ltd',
          email: 'info@fortesium.co.uk',
          website: 'https://www.fortesium.co.uk',
          phone: '(020) 3397 3712',
          social: { linkedIn: 'https://linkedin.com/company/fortesium', twitter: 'https://x.com/FortesiumUK' },
          logoUrl: fortesiumLogo,
        },
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
        style: { padding: { top: 16, bottom: 16, left: 24, right: 24 }, fontSize: 14, fontFamily: 'MODERN_SANS' },
      },
    }),
  },
];
