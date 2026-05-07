import React from 'react';

import {
  AddBoxOutlined,
  ArrowDownwardOutlined,
  ArrowUpwardOutlined,
  ContentCopyOutlined,
  DeleteOutlined,
  Star,
  StarBorderOutlined,
} from '@mui/icons-material';
import { IconButton, Paper, Stack, SxProps, Tooltip } from '@mui/material';

import { TEditorBlock } from '../../../editor/core.js';
import {
  dispatchHostEvent,
  resetDocument,
  setSelectedBlockId,
  useDefaults,
  useDocument,
} from '../../../editor/EditorContext.js';
import { stableEqual } from '../../../../utils/stableEqual.js';
import { ColumnsContainerProps } from '../../ColumnsContainer/ColumnsContainerPropsSchema.js';
import {
  buildClipboardPayload,
  collectDescendants,
  materialiseClipboardPayload,
  writeBlockToClipboard,
} from '../blockClipboard.js';

const sx: SxProps = {
  position: 'absolute',
  top: 0,
  left: -56,
  borderRadius: 64,
  paddingX: 0.5,
  paddingY: 1,
  zIndex: 'fab',
};

type Props = {
  blockId: string;
};
export default function TuneMenu({ blockId }: Props) {
  const document = useDocument();

  const handleDeleteClick = () => {
    const filterChildrenIds = (childrenIds: string[] | null | undefined) => {
      if (!childrenIds) {
        return childrenIds;
      }
      return childrenIds.filter((f) => f !== blockId);
    };
    const nDocument: typeof document = { ...document };
    for (const [id, b] of Object.entries(nDocument)) {
      const block = b as TEditorBlock;
      if (id === blockId) {
        continue;
      }
      switch (block.type) {
        case 'EmailLayout':
          nDocument[id] = {
            ...block,
            data: {
              ...block.data,
              childrenIds: filterChildrenIds(block.data.childrenIds),
            },
          };
          break;
        case 'Container':
          nDocument[id] = {
            ...block,
            data: {
              ...block.data,
              props: {
                ...block.data.props,
                childrenIds: filterChildrenIds(block.data.props?.childrenIds),
              },
            },
          };
          break;
        case 'ColumnsContainer':
          nDocument[id] = {
            type: 'ColumnsContainer',
            data: {
              style: block.data.style,
              props: {
                ...block.data.props,
                columns: block.data.props?.columns?.map((c) => ({
                  childrenIds: filterChildrenIds(c.childrenIds),
                })),
              },
            } as ColumnsContainerProps,
          };
          break;
        default:
          nDocument[id] = block;
      }
    }
    delete nDocument[blockId];
    // Also drop any orphaned descendants of the removed subtree.
    const orphanIds = Object.keys(collectDescendants(blockId, document));
    for (const oid of orphanIds) {
      delete nDocument[oid];
    }
    resetDocument(nDocument);
  };

  const handleMoveClick = (direction: 'up' | 'down') => {
    const moveChildrenIds = (ids: string[] | null | undefined) => {
      if (!ids) {
        return ids;
      }
      const index = ids.indexOf(blockId);
      if (index < 0) {
        return ids;
      }
      const childrenIds = [...ids];
      if (direction === 'up' && index > 0) {
        [childrenIds[index], childrenIds[index - 1]] = [childrenIds[index - 1], childrenIds[index]];
      } else if (direction === 'down' && index < childrenIds.length - 1) {
        [childrenIds[index], childrenIds[index + 1]] = [childrenIds[index + 1], childrenIds[index]];
      }
      return childrenIds;
    };
    const nDocument: typeof document = { ...document };
    for (const [id, b] of Object.entries(nDocument)) {
      const block = b as TEditorBlock;
      if (id === blockId) {
        continue;
      }
      switch (block.type) {
        case 'EmailLayout':
          nDocument[id] = {
            ...block,
            data: {
              ...block.data,
              childrenIds: moveChildrenIds(block.data.childrenIds),
            },
          };
          break;
        case 'Container':
          nDocument[id] = {
            ...block,
            data: {
              ...block.data,
              props: {
                ...block.data.props,
                childrenIds: moveChildrenIds(block.data.props?.childrenIds),
              },
            },
          };
          break;
        case 'ColumnsContainer':
          nDocument[id] = {
            type: 'ColumnsContainer',
            data: {
              style: block.data.style,
              props: {
                ...block.data.props,
                columns: block.data.props?.columns?.map((c) => ({
                  childrenIds: moveChildrenIds(c.childrenIds),
                })),
              },
            } as ColumnsContainerProps,
          };
          break;
        default:
          nDocument[id] = block;
      }
    }

    resetDocument(nDocument);
    setSelectedBlockId(blockId);
  };

  const handleDuplicateClick = () => {
    const payload = buildClipboardPayload(blockId, document);
    if (!payload) return;
    const { block: clonedBlock, descendants: clonedDescendants } = materialiseClipboardPayload(payload);
    const newId = `block-${Date.now()}-dup`;

    const insertAfter = (ids: string[] | null | undefined) => {
      if (!ids) return ids;
      const index = ids.indexOf(blockId);
      if (index < 0) return ids;
      const next = [...ids];
      next.splice(index + 1, 0, newId);
      return next;
    };

    const nDocument: typeof document = { ...document, ...clonedDescendants, [newId]: clonedBlock };
    for (const [id, b] of Object.entries(nDocument)) {
      const block = b as TEditorBlock;
      if (id === newId || clonedDescendants[id]) continue;
      switch (block.type) {
        case 'EmailLayout':
          nDocument[id] = {
            ...block,
            data: { ...block.data, childrenIds: insertAfter(block.data.childrenIds) },
          };
          break;
        case 'Container':
          nDocument[id] = {
            ...block,
            data: {
              ...block.data,
              props: { ...block.data.props, childrenIds: insertAfter(block.data.props?.childrenIds) },
            },
          };
          break;
        case 'ColumnsContainer':
          nDocument[id] = {
            type: 'ColumnsContainer',
            data: {
              style: block.data.style,
              props: {
                ...block.data.props,
                columns: block.data.props?.columns?.map((c) => ({
                  childrenIds: insertAfter(c.childrenIds),
                })),
              },
            } as ColumnsContainerProps,
          };
          break;
        default:
          nDocument[id] = block;
      }
    }
    resetDocument(nDocument);
    setSelectedBlockId(newId);
  };

  const handleCopyClick = async () => {
    const payload = buildClipboardPayload(blockId, document);
    if (!payload) return;
    await writeBlockToClipboard(payload);
  };

  const block = document[blockId];
  const defaults = useDefaults();
  const canSaveAsDefault = block?.type === 'Signature';

  const isCurrentDefaultSignature =
    canSaveAsDefault &&
    !!defaults?.signature &&
    stableEqual(
      { props: block?.data?.props ?? null, style: block?.data?.style ?? null },
      { props: defaults.signature.props ?? null, style: defaults.signature.style ?? null }
    );

  const handleSaveAsDefaultClick = () => {
    if (!block) return;
    if (block.type === 'Signature') {
      dispatchHostEvent('emailBuilderSaveAsDefault', {
        scope: 'signature',
        signature: {
          props: block.data?.props ?? null,
          style: block.data?.style ?? null,
        },
      });
    }
  };

  return (
    <Paper sx={sx} onClick={(ev) => ev.stopPropagation()}>
      <Stack>
        <Tooltip title="Move up" placement="left-start">
          <IconButton onClick={() => handleMoveClick('up')} sx={{ color: 'text.primary' }}>
            <ArrowUpwardOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Move down" placement="left-start">
          <IconButton onClick={() => handleMoveClick('down')} sx={{ color: 'text.primary' }}>
            <ArrowDownwardOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Duplicate" placement="left-start">
          <IconButton onClick={handleDuplicateClick} sx={{ color: 'text.primary' }}>
            <AddBoxOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Copy" placement="left-start">
          <IconButton onClick={handleCopyClick} sx={{ color: 'text.primary' }}>
            <ContentCopyOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
        {canSaveAsDefault && (
          <Tooltip
            title={isCurrentDefaultSignature ? 'This is the default signature' : 'Save as default signature'}
            placement="left-start"
          >
            <IconButton onClick={handleSaveAsDefaultClick} sx={{ color: 'text.primary' }}>
              {isCurrentDefaultSignature ? (
                <Star fontSize="small" sx={{ color: 'warning.main' }} />
              ) : (
                <StarBorderOutlined fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Delete" placement="left-start">
          <IconButton onClick={handleDeleteClick} sx={{ color: 'text.primary' }}>
            <DeleteOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Paper>
  );
}
