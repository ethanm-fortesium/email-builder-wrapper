import React, { createContext, useContext } from 'react';
import { z } from 'zod';

import { AvatarPropsSchema } from '@usewaypoint/block-avatar';
import { ButtonPropsSchema } from '@usewaypoint/block-button';
import { DividerPropsSchema } from '@usewaypoint/block-divider';
import { HeadingPropsSchema } from '@usewaypoint/block-heading';
import { HtmlPropsSchema } from '@usewaypoint/block-html';
import { ImagePropsSchema } from '@usewaypoint/block-image';
import { SpacerPropsSchema } from '@usewaypoint/block-spacer';
import { TextPropsSchema } from '@usewaypoint/block-text';
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
import AvatarReader from '../documents/blocks/Avatar/AvatarReader.js';
import ButtonReader from '../documents/blocks/Button/ButtonReader.js';
import DividerReader from '../documents/blocks/Divider/DividerReader.js';
import HeadingReader from '../documents/blocks/Heading/HeadingReader.js';
import HtmlReader from '../documents/blocks/Html/HtmlReader.js';
import ImageReader from '../documents/blocks/Image/ImageReader.js';
import SpacerReader from '../documents/blocks/Spacer/SpacerReader.js';
import TextReader from '../documents/blocks/Text/TextReader.js';
import SignaturePropsSchema from '../documents/blocks/Signature/SignaturePropsSchema.js';
import SignatureReader from '../documents/blocks/Signature/SignatureReader.js';
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
    Component: AvatarReader,
  },
  Button: {
    schema: ButtonPropsSchema,
    Component: ButtonReader,
  },
  Divider: {
    schema: DividerPropsSchema,
    Component: DividerReader,
  },
  Heading: {
    schema: HeadingPropsSchema,
    Component: HeadingReader,
  },
  Html: {
    schema: HtmlPropsSchema,
    Component: HtmlReader,
  },
  Image: {
    schema: ImagePropsSchema,
    Component: ImageReader,
  },
  Spacer: {
    schema: SpacerPropsSchema,
    Component: SpacerReader,
  },
  Text: {
    schema: TextPropsSchema,
    Component: TextReader,
  },
  Signature: {
    schema: SignaturePropsSchema,
    Component: SignatureReader,
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