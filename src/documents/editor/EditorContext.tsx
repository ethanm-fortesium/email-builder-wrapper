import { create } from 'zustand';

import getConfiguration from '../../getConfiguration/index.js';

import { TEditorConfiguration } from './core.js';

type TValue = {
  document: TEditorConfiguration;

  selectedBlockId: string | null;
  selectedSidebarTab: 'block-configuration' | 'styles';
  selectedMainTab: 'editor' | 'preview' | 'json' | 'html';
  selectedScreenSize: 'desktop' | 'mobile';

  inspectorDrawerOpen: boolean;
  readOnly: boolean;
};

const editorStateStore = create<TValue>(() => ({
  document: getConfiguration(window.location.hash),
  selectedBlockId: null,
  selectedSidebarTab: 'styles',
  selectedMainTab: 'editor',
  selectedScreenSize: 'desktop',

  inspectorDrawerOpen: true,
  readOnly: false,
}));

export function useDocument() {
  return editorStateStore((s) => s.document);
}

export function useSelectedBlockId() {
  return editorStateStore((s) => s.selectedBlockId);
}

export function useSelectedScreenSize() {
  return editorStateStore((s) => s.selectedScreenSize);
}

export function useSelectedMainTab() {
  return editorStateStore((s) => s.selectedMainTab);
}

export function setSelectedMainTab(selectedMainTab: TValue['selectedMainTab']) {
  if (editorStateStore.getState().readOnly && selectedMainTab !== 'preview') {
    return editorStateStore.setState({ selectedMainTab: 'preview' });
  }
  return editorStateStore.setState({ selectedMainTab });
}

export function useSelectedSidebarTab() {
  return editorStateStore((s) => s.selectedSidebarTab);
}

export function useInspectorDrawerOpen() {
  return editorStateStore((s) => s.inspectorDrawerOpen);
}

export function useReadOnlyMode() {
  return editorStateStore((s) => s.readOnly);
}

export function setSelectedBlockId(selectedBlockId: TValue['selectedBlockId']) {
  if (editorStateStore.getState().readOnly) {
    return editorStateStore.setState({ selectedBlockId: null, selectedSidebarTab: 'styles' });
  }
  const selectedSidebarTab = selectedBlockId === null ? 'styles' : 'block-configuration';
  const options: Partial<TValue> = {};
  if (selectedBlockId !== null) {
    options.inspectorDrawerOpen = true;
  }
  return editorStateStore.setState({
    selectedBlockId,
    selectedSidebarTab,
    ...options,
  });
}

export function setSidebarTab(selectedSidebarTab: TValue['selectedSidebarTab']) {
  if (editorStateStore.getState().readOnly) return;
  return editorStateStore.setState({ selectedSidebarTab });
}

export function resetDocument(document: TValue['document']) {
  return editorStateStore.setState({
    document,
    selectedSidebarTab: 'styles',
    selectedBlockId: null,
  });
}

export function setDocument(document: TValue['document']) {
  const originalDocument = editorStateStore.getState().document;
  return editorStateStore.setState({
    document: {
      ...originalDocument,
      ...document,
    },
  });
}

export function toggleInspectorDrawerOpen() {
  if (editorStateStore.getState().readOnly) return;
  const inspectorDrawerOpen = !editorStateStore.getState().inspectorDrawerOpen;
  return editorStateStore.setState({ inspectorDrawerOpen });
}

export function setSelectedScreenSize(selectedScreenSize: TValue['selectedScreenSize']) {
  return editorStateStore.setState({ selectedScreenSize });
}

export function setInspectorDrawerOpen(inspectorDrawerOpen: boolean) {
  if (editorStateStore.getState().readOnly && inspectorDrawerOpen) {
    return editorStateStore.setState({ inspectorDrawerOpen: false });
  }
  return editorStateStore.setState({ inspectorDrawerOpen });
}

export function setReadOnly(readOnly: boolean) {
  if (readOnly) {
    editorStateStore.setState({
      readOnly: true,
      selectedMainTab: 'preview',
      inspectorDrawerOpen: false,
      selectedBlockId: null,
      selectedSidebarTab: 'styles',
    });
  } else {
    editorStateStore.setState({ readOnly: false });
  }
}

export function getEditorState() {
  return editorStateStore.getState();
}
