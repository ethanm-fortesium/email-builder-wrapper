import { create } from 'zustand';

import getConfiguration from '../../getConfiguration/index.js';
import {
  applyProbedImageDimensions,
  probeImageDimensions,
  probeMissingImageDimensions,
  TImageDimensionProbe,
  TProbedImage,
} from '../blocks/helpers/imageDimensions.js';

import { TEditorConfiguration } from './core.js';

export type EmailBuilderDefaults = {
  fontFamilyKey?: string | null;
  fontSizePx?: number | null;
  textColor?: string | null;
  // Global layout styling — used to seed the EmailLayout root for new emails and to populate
  // the Global sidebar inputs when an email's own data lacks a value.
  canvasWidth?: number | null;
  canvasColor?: string | null;
  backdropColor?: string | null;
  borderColor?: string | null;
  borderRadius?: number | null;
  logoUrl?: string | null;
  signature?: { props?: any; style?: any } | null;
};

export type ToastSeverity = 'success' | 'info' | 'warning' | 'error';
export type ToastState = { id: number; message: string; severity: ToastSeverity } | null;

type TValue = {
  document: TEditorConfiguration;

  selectedBlockId: string | null;
  selectedSidebarTab: 'block-configuration' | 'styles';
  selectedMainTab: 'editor' | 'preview' | 'json' | 'html';
  selectedScreenSize: 'desktop' | 'mobile';

  inspectorDrawerOpen: boolean;
  readOnly: boolean;

  defaults: EmailBuilderDefaults | null;
  toast: ToastState;

  /** How many documents have been loaded (see loadDocument). */
  documentLoads: number;
};

const editorStateStore = create<TValue>(() => ({
  document: getConfiguration(window.location.hash),
  selectedBlockId: null,
  selectedSidebarTab: 'styles',
  selectedMainTab: 'editor',
  selectedScreenSize: 'desktop',

  inspectorDrawerOpen: true,
  readOnly: false,

  defaults: null,
  toast: null,

  documentLoads: 0,
}));

let hostEventDispatcher: ((name: string, detail: unknown) => void) | null = null;

export function setHostEventDispatcher(fn: typeof hostEventDispatcher) {
  hostEventDispatcher = fn;
}

export function dispatchHostEvent(name: string, detail: unknown) {
  hostEventDispatcher?.(name, detail);
}

/** Applies a document update; `apply` must be called synchronously (or not at all). */
export type TDocumentCommit = (apply: () => void) => void;

const commitImmediately: TDocumentCommit = (apply) => apply();

let backgroundUpdateScheduler: (() => TDocumentCommit) | null = null;

// Which loaded document background updates belong to. Bumped by hydrateDocumentImageDimensions, which
// runs right after every load of a document that can hold images (resetDocument cannot mark loads:
// block moves and deletes use it too).
let documentLoadGeneration = 0;

/**
 * Register how document updates the user did not make (e.g. backfilled image sizes) are applied.
 * The web component uses this to report them to the host with origin 'programmatic'.
 *
 * @returns A function that unregisters `fn`, unless another scheduler has replaced it since.
 */
export function setBackgroundUpdateScheduler(fn: typeof backgroundUpdateScheduler) {
  backgroundUpdateScheduler = fn;
  return () => {
    if (backgroundUpdateScheduler === fn) backgroundUpdateScheduler = null;
  };
}

/**
 * Call when starting async work whose result is not a user edit, and apply the result through the
 * returned commit. Taking it up front lets the host side tell whether the user edited meanwhile.
 *
 * The update belongs to the document loaded when it began: once another document has been loaded
 * the commit drops it (that load backfills its own document), so a result computed for the previous
 * document never lands in the new one, where it could be reported as the user's change.
 */
export function beginBackgroundDocumentUpdate(): TDocumentCommit {
  const generation = documentLoadGeneration;
  const commit = backgroundUpdateScheduler?.() ?? commitImmediately;
  return (apply) => {
    if (generation === documentLoadGeneration) commit(apply);
  };
}

let _apiBaseUrl: string | null = null;

export function setApiBaseUrl(url: string | null) {
  _apiBaseUrl = url;
}

export function getApiBaseUrl(): string | null {
  return _apiBaseUrl;
}

/**
 * Gets the current editor document configuration.
 *
 * @returns The current `TEditorConfiguration` document from the editor state
 */
export function useDocument() {
  return editorStateStore((s) => s.document);
}

export function useSelectedBlockId() {
  return editorStateStore((s) => s.selectedBlockId);
}

export function useSelectedScreenSize() {
  return editorStateStore((s) => s.selectedScreenSize);
}

/**
 * Accesses the currently active main editor tab.
 *
 * @returns The active main tab: 'editor', 'preview', 'json', or 'html'
 */
export function useSelectedMainTab() {
  return editorStateStore((s) => s.selectedMainTab);
}

/**
 * Set the editor's active main tab, respecting read-only restrictions.
 *
 * If the editor is in read-only mode and the requested tab is not `preview`,
 * this will activate `preview` instead.
 *
 * @param selectedMainTab - The main tab to activate (`'editor' | 'preview' | 'json' | 'html'`)
 */
export function setSelectedMainTab(selectedMainTab: TValue['selectedMainTab']) {
  if (editorStateStore.getState().readOnly && selectedMainTab !== 'preview') {
    return editorStateStore.setState({ selectedMainTab: 'preview' });
  }
  return editorStateStore.setState({ selectedMainTab });
}

export function useSelectedSidebarTab() {
  return editorStateStore((s) => s.selectedSidebarTab);
}

/**
 * Indicates whether the inspector drawer is open.
 *
 * @returns `true` if the inspector drawer is open, `false` otherwise.
 */
export function useInspectorDrawerOpen() {
  return editorStateStore((s) => s.inspectorDrawerOpen);
}

/**
 * Indicates whether the editor is in read-only mode.
 *
 * @returns `true` if the editor is in read-only mode, `false` otherwise.
 */
export function useReadOnlyMode() {
  return editorStateStore((s) => s.readOnly);
}

/**
 * Update the currently selected block and adjust related sidebar and inspector state.
 *
 * When `selectedBlockId` is `null` the sidebar tab becomes "styles"; when a block id is provided the sidebar tab becomes "block-configuration" and the inspector drawer is opened. If the editor is in read-only mode, selection is cleared and the sidebar tab is set to "styles" regardless of the provided value.
 *
 * @param selectedBlockId - The id of the block to select, or `null` to clear the selection
 */
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

/**
 * Set the editor's selected sidebar tab.
 *
 * Updates the store's `selectedSidebarTab` to the provided value. If the editor is in read-only mode, this call is a no-op.
 *
 * @param selectedSidebarTab - The sidebar tab to select: `'block-configuration'` or `'styles'`
 */
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

/**
 * Replace the document with a newly loaded one: imported, opened by the host or started empty.
 * Unlike resetDocument (which block moves and deletes also use), this counts as a load, so
 * panels that copy document values into their own state (the Styles panel) show the new ones.
 *
 * @param document - The loaded document
 */
export function loadDocument(document: TValue['document']) {
  resetDocument(document);
  editorStateStore.setState((state) => ({ documentLoads: state.documentLoads + 1 }));
}

/** How many documents have been loaded; changes each time loadDocument runs. */
export function useDocumentLoads() {
  return editorStateStore((s) => s.documentLoads);
}

/**
 * Merge the provided document properties into the current editor document in the store.
 *
 * @param document - Document object whose properties will be merged into the existing document; provided fields override existing values
 */
export function setDocument(document: TValue['document']) {
  const originalDocument = editorStateStore.getState().document;
  return editorStateStore.setState({
    document: {
      ...originalDocument,
      ...document,
    },
  });
}

/**
 * Merge probed natural image sizes into the CURRENT document.
 *
 * Results are matched against each block's current image URL, so a probe that resolves after the
 * image was replaced (or the block deleted) is ignored, and only the size fields are written so
 * edits made while the probe was in flight are kept.
 *
 * @param results - Probe results keyed by block id and the URL that was probed
 * @param commit - How to apply the update; defaults to a plain (user-flow) document update
 * @returns `true` if the document changed (false too when the commit dropped the update)
 */
export function recordImageDimensions(results: TProbedImage[], commit: TDocumentCommit = commitImmediately) {
  const next = applyProbedImageDimensions(editorStateStore.getState().document, results);
  if (!next) return false;
  let applied = false;
  commit(() => {
    editorStateStore.setState({ document: next });
    applied = true;
  });
  return applied;
}

/**
 * Backfill natural sizes for images in the just-loaded document that lack them (documents saved
 * before sizes were recorded). Runs in the background and applies the result as a background
 * (non-user) update without touching the selection.
 *
 * Call it once per load, right after loading the document: it supersedes background updates begun
 * for the previous document (see beginBackgroundDocumentUpdate).
 *
 * @returns `true` if the document was updated
 */
export async function hydrateDocumentImageDimensions(probe: TImageDimensionProbe = probeImageDimensions) {
  documentLoadGeneration += 1;
  const commit = beginBackgroundDocumentUpdate();
  const results = await probeMissingImageDimensions(editorStateStore.getState().document, probe);
  return recordImageDimensions(results, commit);
}

/**
 * Toggle the inspector drawer open state unless the editor is in read-only mode.
 *
 * When not in read-only mode, updates the editor state store's `inspectorDrawerOpen`
 * flag to the opposite of its current value. No-op when `readOnly` is `true`.
 */
export function toggleInspectorDrawerOpen() {
  if (editorStateStore.getState().readOnly) return;
  const inspectorDrawerOpen = !editorStateStore.getState().inspectorDrawerOpen;
  return editorStateStore.setState({ inspectorDrawerOpen });
}

/**
 * Set the editor's selected screen size.
 *
 * @param selectedScreenSize - The target screen size: `'desktop'` or `'mobile'`
 */
export function setSelectedScreenSize(selectedScreenSize: TValue['selectedScreenSize']) {
  return editorStateStore.setState({ selectedScreenSize });
}

/**
 * Sets whether the inspector drawer is open while enforcing read-only restrictions.
 *
 * If the editor is in read-only mode and `inspectorDrawerOpen` is true, the drawer will be closed instead.
 *
 * @param inspectorDrawerOpen - True to open the inspector drawer, false to close it
 */
export function setInspectorDrawerOpen(inspectorDrawerOpen: boolean) {
  if (editorStateStore.getState().readOnly && inspectorDrawerOpen) {
    return editorStateStore.setState({ inspectorDrawerOpen: false });
  }
  return editorStateStore.setState({ inspectorDrawerOpen });
}

/**
 * Enable or disable editor read-only mode and adjust related UI state.
 *
 * When `readOnly` is `true`, switches the editor into read-only mode by setting
 * the main tab to `preview`, closing the inspector drawer, clearing the selected
 * block, and resetting the sidebar tab to `styles`. When `readOnly` is `false`,
 * restores the editor to writable mode.
 *
 * @param readOnly - `true` to enable read-only mode with the UI locked to preview; `false` to disable read-only mode
 */
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

/**
 * Retrieve the current editor state object.
 *
 * @returns The full editor state containing `document`, `selectedBlockId`, `selectedSidebarTab`, `selectedMainTab`, `selectedScreenSize`, `inspectorDrawerOpen`, and `readOnly`.
 */
export function getEditorState() {
  return editorStateStore.getState();
}

export function useDefaults() {
  return editorStateStore((s) => s.defaults);
}

export function getDefaults() {
  return editorStateStore.getState().defaults;
}

export function setDefaults(defaults: EmailBuilderDefaults | null) {
  return editorStateStore.setState({ defaults });
}

export function useToast() {
  return editorStateStore((s) => s.toast);
}

let toastIdCounter = 0;

export function showToast(message: string, severity: ToastSeverity = 'info') {
  toastIdCounter += 1;
  return editorStateStore.setState({ toast: { id: toastIdCounter, message, severity } });
}

export function dismissToast() {
  return editorStateStore.setState({ toast: null });
}