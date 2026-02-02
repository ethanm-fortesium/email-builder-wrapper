import React from 'react';

import { Box, Typography } from '@mui/material';

import { TEditorBlock } from '../../../documents/editor/core.js';
import { setDocument, useDocument, useSelectedBlockId } from '../../../documents/editor/EditorContext.js';

import AvatarSidebarPanel from './input-panels/AvatarSidebarPanel.js';
import ButtonSidebarPanel from './input-panels/ButtonSidebarPanel.js';
import ColumnsContainerSidebarPanel from './input-panels/ColumnsContainerSidebarPanel.js';
import ContainerSidebarPanel from './input-panels/ContainerSidebarPanel.js';
import DividerSidebarPanel from './input-panels/DividerSidebarPanel.js';
import EmailLayoutSidebarPanel from './input-panels/EmailLayoutSidebarPanel.js';
import HeadingSidebarPanel from './input-panels/HeadingSidebarPanel.js';
import HtmlSidebarPanel from './input-panels/HtmlSidebarPanel.js';
import ImageSidebarPanel from './input-panels/ImageSidebarPanel.js';
import SpacerSidebarPanel from './input-panels/SpacerSidebarPanel.js';
import TextSidebarPanel from './input-panels/TextSidebarPanel.js';
import SignatureSidebarPanel from './input-panels/SignatureSidebarPanel.js';
import RichTextSidebarPanel from './input-panels/RichTextSidebarPanel.js';

function renderMessage(val: string) {
  return (
    <Box sx={{ m: 3, p: 1, border: '1px dashed', borderColor: 'divider' }}>
      <Typography color="text.secondary">{val}</Typography>
    </Box>
  );
}

export default function ConfigurationPanel({ apiBaseUrl }: { apiBaseUrl: string }) {
  const document = useDocument();
  const selectedBlockId = useSelectedBlockId();

  if (!selectedBlockId) {
    return renderMessage('Click on a block to inspect.');
  }
  const block = document[selectedBlockId];
  if (!block) {
    return renderMessage(`Block with id ${selectedBlockId} was not found. Click on a block to reset.`);
  }

  const setBlock = (conf: TEditorBlock) => setDocument({ [selectedBlockId]: conf });
  const { data, type } = block;
  switch (type) {
    case 'Avatar':
      return <AvatarSidebarPanel key={selectedBlockId} data={data} setData={(data: any) => setBlock({ type, data })} apiBaseUrl={apiBaseUrl} />;
    case 'Button':
      return <ButtonSidebarPanel key={selectedBlockId} data={data} setData={(data: any) => setBlock({ type, data })} />;
    case 'ColumnsContainer':
      return (
        <ColumnsContainerSidebarPanel key={selectedBlockId} data={data} setData={(data: any) => setBlock({ type, data })} />
      );
    case 'Container':
      return <ContainerSidebarPanel key={selectedBlockId} data={data} setData={(data: any) => setBlock({ type, data })} />;
    case 'Divider':
      return <DividerSidebarPanel key={selectedBlockId} data={data} setData={(data: any) => setBlock({ type, data })} />;
    case 'Heading':
      return <HeadingSidebarPanel key={selectedBlockId} data={data} setData={(data: any) => setBlock({ type, data })} />;
    case 'Html':
      return <HtmlSidebarPanel key={selectedBlockId} data={data} setData={(data: any) => setBlock({ type, data })} />;
    case 'Image':
      return <ImageSidebarPanel key={selectedBlockId} data={data} setData={(data: any) => setBlock({ type, data })} apiBaseUrl={apiBaseUrl} />;
    case 'EmailLayout':
      return <EmailLayoutSidebarPanel key={selectedBlockId} data={data} setData={(data: any) => setBlock({ type, data })} />;
    case 'Spacer':
      return <SpacerSidebarPanel key={selectedBlockId} data={data} setData={(data: any) => setBlock({ type, data })} />;
    case 'Text':
      return <TextSidebarPanel key={selectedBlockId} data={data} setData={(data: any) => setBlock({ type, data })} />;
    case 'Signature':
      return <SignatureSidebarPanel key={selectedBlockId} data={data} setData={(data: any) => setBlock({ type, data })} apiBaseUrl={apiBaseUrl} />;
    case 'RichText':
      return <RichTextSidebarPanel key={selectedBlockId} data={data} setData={(data: any) => setBlock({ type, data })} />;
    default:
      return <pre>{JSON.stringify(block, null, '  ')}</pre>;
  }
}
