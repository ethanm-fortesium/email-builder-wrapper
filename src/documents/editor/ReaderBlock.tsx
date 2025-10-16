import React, { createContext, useContext } from 'react';

import { EditorBlock as CoreEditorBlock } from './core.js';
import { useDocument } from './EditorContext.js';

const ReaderBlockContext = createContext<string | null>(null);
export const useCurrentBlockId = () => useContext(ReaderBlockContext)!;

type ReaderBlockProps = {
  id: string;
};

/**
 *
 * @param id - Block id
 * @returns ReaderBlock component that loads data from the EditorDocumentContext
 */
export default function ReaderBlock({ id }: ReaderBlockProps) {
  const document = useDocument();
  const block = document[id];
  if (!block) {
    throw new Error('Could not find block');
  }
  return (
    <ReaderBlockContext.Provider value={id}>
      <CoreEditorBlock {...block} />
    </ReaderBlockContext.Provider>
  );
}
