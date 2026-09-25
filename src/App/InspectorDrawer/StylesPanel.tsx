import React from 'react';

import { setDocument, useDocument, useDocumentLoads } from '../../documents/editor/EditorContext.js';

import EmailLayoutSidebarPanel from './ConfigurationPanel/input-panels/EmailLayoutSidebarPanel.js';

export default function StylesPanel() {
  const block = useDocument().root;
  // The panel's inputs keep the values they started with, so a newly loaded document gets a new panel.
  const documentLoads = useDocumentLoads();
  if (!block) {
    return <p>Block not found</p>;
  }

  const { data, type } = block;
  if (type !== 'EmailLayout') {
    throw new Error('Expected "root" element to be of type EmailLayout');
  }

  return <EmailLayoutSidebarPanel key={`root-${documentLoads}`} data={data} setData={(data) => setDocument({ root: { type, data } })} />;
}
