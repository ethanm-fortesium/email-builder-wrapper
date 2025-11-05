import React, { useMemo } from 'react';

import renderToStaticMarkup from '../../renderers/renderToStaticMarkup.js';
import { useDocument } from '../../documents/editor/EditorContext.js';
import HighlightedCodePanel from './helper/HighlightedCodePanel.js';

export default function HtmlPanel() {
  const document = useDocument();
  const code = useMemo(() => renderToStaticMarkup(document, { rootBlockId: 'root' }), [document]);
  return <HighlightedCodePanel type="html" value={code} />;
}
