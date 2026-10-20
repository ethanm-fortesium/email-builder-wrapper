import { useEffect, useRef, useState } from 'react';

import { probeImageDimensions } from '../../../../../documents/blocks/helpers/imageDimensions.js';
import {
  beginBackgroundDocumentUpdate,
  getEditorState,
  recordImageDimensions,
} from '../../../../../documents/editor/EditorContext.js';

// Let a typed URL settle before loading it, so we don't fetch every intermediate keystroke.
export const URL_CHANGE_DEBOUNCE_MS = 400;

/**
 * Keep the natural (intrinsic) size of the selected Image/Signature block's image recorded
 * on the block (see documents/blocks/helpers/imageDimensions.ts for why the export needs it).
 *
 * - URL changed while the panel is open (upload or typed): the new image is probed after a short
 *   debounce and its size written back as part of the user's edit (cleared if it fails to load).
 * - Panel opened on an image with no recorded size (older documents, freshly inserted blocks): it
 *   is probed straight away and backfilled as a background (non-user) update.
 * - URL cleared: any recorded size is dropped.
 *
 * Results go through the store and are matched against the block's CURRENT URL, so a probe that
 * resolves after the image was replaced again is ignored, a probe that resolves after the panel
 * closed still lands on the right block, and other edits made meanwhile are never overwritten.
 *
 * @param url - The block's current image URL
 * @param hasDimensions - Whether the block already records a natural size for it
 */
export default function useNaturalImageDimensions(url: string | null | undefined, hasDimensions: boolean) {
  // Sidebar panels are keyed by the selected block id, so the selection at mount is this panel's block.
  const [blockId] = useState(() => getEditorState().selectedBlockId);
  const previousUrl = useRef(url);
  const pendingProbe = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const urlChanged = previousUrl.current !== url;
    previousUrl.current = url;
    if (!blockId) return;
    if (pendingProbe.current !== null) {
      clearTimeout(pendingProbe.current);
      pendingProbe.current = null;
    }

    const currentUrl = url ?? '';
    // A URL change is part of the user's edit; filling in the size of an untouched image is not.
    const beginCommit = () => (urlChanged ? undefined : beginBackgroundDocumentUpdate());

    if (!currentUrl.trim()) {
      if (hasDimensions) recordImageDimensions([{ blockId, url: currentUrl, dimensions: null }], beginCommit());
      return;
    }
    if (!urlChanged && hasDimensions) return;

    const commit = beginCommit();
    pendingProbe.current = setTimeout(
      () => {
        pendingProbe.current = null;
        void probeImageDimensions(currentUrl).then((dimensions) =>
          recordImageDimensions([{ blockId, url: currentUrl, dimensions }], commit)
        );
      },
      urlChanged ? URL_CHANGE_DEBOUNCE_MS : 0
    );
    // No cleanup on purpose: a newer URL cancels the pending probe above, while a probe scheduled
    // just before the panel closes should still land (it is applied by block id via the store).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
}
