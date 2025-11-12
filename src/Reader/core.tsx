import React, { createContext, useContext } from 'react';
import { z } from 'zod';

import { Avatar, AvatarPropsSchema } from '@usewaypoint/block-avatar';
import { Button, ButtonPropsSchema } from '@usewaypoint/block-button';
import { Divider, DividerPropsSchema } from '@usewaypoint/block-divider';
import { Heading, HeadingPropsSchema } from '@usewaypoint/block-heading';
import { Html, HtmlPropsSchema } from '@usewaypoint/block-html';
import { Image, ImagePropsSchema } from '@usewaypoint/block-image';
import { Spacer, SpacerPropsSchema } from '@usewaypoint/block-spacer';
import { Text, TextPropsSchema } from '@usewaypoint/block-text';
import {
  buildBlockComponent,
  buildBlockConfigurationDictionary,
  buildBlockConfigurationSchema,
} from '@usewaypoint/document-core';

import ColumnsContainerPropsSchema from '../documents/blocks/ColumnsContainer/ColumnsContainerPropsSchema.js';
import ColumnsContainerReader from '../documents/blocks/ColumnsContainer/ColumnsContainerReader.js';
import ContainerPropsSchema from '../documents/blocks/Container/ContainerPropsSchema.js';
import ContainerReader from '../documents/blocks/Container/ContainerReader.js';
import EmailLayoutPropsSchema from '../documents/blocks/EmailLayout/EmailLayoutPropsSchema.js';
import EmailLayoutReader from '../documents/blocks/EmailLayout/EmailLayoutReader.js';
import SignaturePropsSchema from '../documents/blocks/Signature/SignaturePropsSchema.js';
import SignatureEditor from '../documents/blocks/Signature/SignatureEditor.js';
import RichTextPropsSchema from '../documents/blocks/RichText/RichTextPropsSchema.js';
import RichTextReader from '../documents/blocks/RichText/RichTextReader.js';

const ReaderContext = createContext<TReaderDocument>({});

function useReaderDocument() {
  return useContext(ReaderContext);
}

const READER_DICTIONARY = buildBlockConfigurationDictionary({
  ColumnsContainer: {
    schema: ColumnsContainerPropsSchema,
    Component: ColumnsContainerReader,
  },
  Container: {
    schema: ContainerPropsSchema,
    Component: ContainerReader,
  },
  EmailLayout: {
    schema: EmailLayoutPropsSchema,
    Component: EmailLayoutReader,
  },
  Avatar: {
    schema: AvatarPropsSchema,
    Component: Avatar,
  },
  Button: {
    schema: ButtonPropsSchema,
    Component: Button,
  },
  Divider: {
    schema: DividerPropsSchema,
    Component: Divider,
  },
  Heading: {
    schema: HeadingPropsSchema,
    Component: Heading,
  },
  Html: {
    schema: HtmlPropsSchema,
    Component: Html,
  },
  Image: {
    schema: ImagePropsSchema,
    Component: Image,
  },
  Spacer: {
    schema: SpacerPropsSchema,
    Component: Spacer,
  },
  Text: {
    schema: TextPropsSchema,
    Component: Text,
  },
  Signature: {
    schema: SignaturePropsSchema,
    Component: SignatureEditor,
  },
  RichText: {
    schema: RichTextPropsSchema,
    Component: RichTextReader,
  },
});

export const ReaderBlockSchema = buildBlockConfigurationSchema(READER_DICTIONARY);
export type TReaderBlock = z.infer<typeof ReaderBlockSchema>;

export const ReaderDocumentSchema = z.record(z.string(), ReaderBlockSchema);
export type TReaderDocument = Record<string, TReaderBlock>;

const BaseReaderBlock = buildBlockComponent(READER_DICTIONARY);

export type TReaderBlockProps = { id: string };
export function ReaderBlock({ id }: TReaderBlockProps) {
  const document = useReaderDocument();
  const block = document[id];
  if (!block) {
    console.error(`Block with id "${id}" not found in document`);
    return null;
  }
  return <BaseReaderBlock {...block} />;
}
export type TReaderProps = {
  document: Record<string, z.infer<typeof ReaderBlockSchema>>;
  rootBlockId: string;
};
export default function Reader({ document, rootBlockId }: TReaderProps) {
  if (!document[rootBlockId]) {
    console.error(`Root block with id "${rootBlockId}" not found in document`);
    return null;
  }

  return (
    <ReaderContext.Provider value={document}>
      <ReaderBlock id={rootBlockId} />
    </ReaderContext.Provider>
  );
}