// Web Component wrapper for the Email Builder editor

import React, { useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import DOMPurify from 'dompurify';

// Import existing App + theme 
import App from './App/index.js';
import theme from './theme.js';
import { resolveApiBaseUrl } from './utils/resolveApiBaseUrl.js';
import {
  useDocument,
  resetDocument,
  setReadOnly,
  getEditorState,
  setSelectedMainTab,
  setInspectorDrawerOpen,
  setDefaults,
  getDefaults,
  setHostEventDispatcher,
  setApiBaseUrl,
  showToast,
  EmailBuilderDefaults,
  ToastSeverity,
} from './documents/editor/EditorContext.js';
import renderToStaticMarkup from './renderers/renderToStaticMarkup.js';

/**
 * Root React component that connects the editor document store to the host element and renders the email builder App.
 *
 * This component listens to the document store, derives static HTML from the current document, and informs the host element of updates. On each document change it updates the host's cached latest document/html and dispatches an `emailContentChange` event whose detail includes `html`, `document`, and `origin` (`"programmatic"` or `"user"`). When the component first mounts it dispatches an `emailBuilderReady` event.
 *
 * @param host - The hosting custom element instance that receives latest document/html updates and will receive dispatched events.
 * @param apiBaseUrl - The API base URL (will be resolved before being passed to the App).
 * @returns The React element tree for the email builder application.
 */
function EmailBuilderRoot({ host, apiBaseUrl }: { host: EmailBuilderEditor, apiBaseUrl: string }) {
  const document = useDocument();
  const latestDocRef = useRef<any>(document);
  const resolvedApiBaseUrl = useMemo(() => resolveApiBaseUrl(apiBaseUrl), [apiBaseUrl]);

  setApiBaseUrl(resolvedApiBaseUrl);

  // Compute HTML whenever document changes
  const html = useMemo(
    () => renderToStaticMarkup(document, { rootBlockId: 'root' }),
    [document, resolvedApiBaseUrl]
  );

  // Keep reference for public methods
  useEffect(() => {
    latestDocRef.current = document;
    host.__setLatest(document, html);
    host.dispatchEvent(
      new CustomEvent('emailContentChange', {
        detail: { html, document, origin: host.__isProgrammatic() ? 'programmatic' : 'user' },
        bubbles: true,
        composed: true,
      })
    );
  }, [document, html, host]);

  // Ready event (first mount) + register host event dispatcher
  useEffect(() => {
    setHostEventDispatcher((name, detail) => {
      host.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    });
    host.dispatchEvent(
      new CustomEvent('emailBuilderReady', {
        detail: {},
        bubbles: true,
        composed: true,
      })
    );
    return () => setHostEventDispatcher(null);
  }, [host]);

  return (
    <>
      <CssBaseline />
      <App apiBaseUrl={resolvedApiBaseUrl} />
    </>
  );
}

class EmailBuilderEditor extends HTMLElement {
  private _root: ReactDOM.Root | null = null;
  private _container: HTMLDivElement | null = null;
  private _latestHtml: string = '';
  private _latestDocument: any = null;
  private _pendingHtml: string | null = null; // Holds HTML set before React app mounts
  private _isProgrammaticImport: boolean = false; // Flag to mark programmatic setHtml calls
  private _lastImportedHtml: string | null = null; // Last HTML string passed in via setHtml/importHtml to avoid loops
  private _lastImportedConfigHash: string | null = null; // Dedupe for configuration imports
  private _pendingConfig: any = null; // Pending configuration before mount
  private _readOnlySnapshot: { selectedMainTab: ReturnType<typeof getEditorState>['selectedMainTab']; inspectorDrawerOpen: boolean } | null = null;
  private _attributeSync = false;
  private _readOnlyMode = false;

  // Called by React side to update cached values
  public __setLatest(document: any, html: string) {
    this._latestDocument = document;
    this._latestHtml = html;
  }
  // Internal accessor used by React effect for event origin determination
  public __isProgrammatic() { return this._isProgrammaticImport; }

  static get observedAttributes() {
    return ['readonly', 'defaults'];
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
    if (name === 'readonly' && !this._attributeSync) {
      this.__applyReadOnly(newValue !== null);
    }
    if (name === 'defaults' && newValue) {
      try {
        const parsed = JSON.parse(newValue);
        this.setDefaults(parsed);
      } catch (e) {
        console.warn('[EmailBuilder] invalid defaults attribute', e);
      }
    }
  }

  get readOnly() {
    return this._readOnlyMode;
  }

  set readOnly(value: boolean) {
    this.setReadOnlyMode(value);
  }
  connectedCallback() {
    if (this._root) return; // Already mounted

    this._container = document.createElement('div');
    this._container.style.width = '100%';
    this._container.style.height = '100%';
    this.appendChild(this._container);

    this._root = ReactDOM.createRoot(this._container);
    this._root.render(
      <React.StrictMode>
        <ThemeProvider theme={theme}>
          <EmailBuilderRoot host={this} apiBaseUrl={this.getAttribute('apiBaseUrl') || ''} />
        </ThemeProvider>
      </React.StrictMode>
    );

    if (this.hasAttribute('readonly')) {
      this.__applyReadOnly(true);
    }

    const defaultsAttr = this.getAttribute('defaults');
    if (defaultsAttr) {
      try {
        this.setDefaults(JSON.parse(defaultsAttr));
      } catch (e) {
        console.warn('[EmailBuilder] invalid defaults attribute', e);
      }
    }

    queueMicrotask(() => {
      if (!this._pendingConfig && !this._pendingHtml) {
        this._isProgrammaticImport = true;
        try {
          resetDocument(this.__buildEmptyDocument() as any);
        } catch (e) {
          console.error(e);
        }
        queueMicrotask(() => { this._isProgrammaticImport = false; });
      }
    });
  }

  disconnectedCallback() {
    if (this._root) {
      this._root.unmount();
      this._root = null;
    }
    if (this._container) {
      this.removeChild(this._container);
      this._container = null;
    }
  }

  // Public API
  public getHtml(): string {
    return this._latestHtml;
  }

  public getDocument(): any {
    return this._latestDocument;
  }

  public setReadOnlyMode(readOnly: boolean) {
    this.__applyReadOnly(readOnly);
  }

  /**
   * Apply client-wide defaults (font, font size, signature, logo) used to seed NEW blocks
   * and the EmailLayout for fresh emails. Existing documents are not mutated.
   */
  public setDefaults(defaults: EmailBuilderDefaults | null) {
    setDefaults(defaults ?? null);
  }

  public getDefaults(): EmailBuilderDefaults | null {
    return getDefaults();
  }

  /**
   * Show a transient toast inside the editor surface. Severity drives the colour
   * (success = green, error = red, warning = amber, info = blue). Auto-dismisses.
   */
  public showToast(message: string, severity: ToastSeverity = 'info') {
    if (!message) return;
    showToast(message, severity);
  }

  public toggleReadOnlyMode() {
    this.setReadOnlyMode(!this._readOnlyMode);
  }

  // Programmatically replace editor content with provided raw HTML
  public setHtml(htmlContent: string) {
    if (!htmlContent || typeof htmlContent !== 'string') return;
    const sanitizedHtml = this.__sanitizeHtmlPayload(htmlContent);

    if (sanitizedHtml.length === 0) {
      if (!this._root) {
        this._pendingConfig = this.__buildEmptyDocument();
        return;
      }

      this._isProgrammaticImport = true;
      try {
        resetDocument(this.__buildEmptyDocument() as any);
      } catch (e) {
        console.error(e);
      }
      // Clear dedupe hashes so future imports work
      this._lastImportedHtml = null;
      this._lastImportedConfigHash = null;
      queueMicrotask(() => {
        this._isProgrammaticImport = false;
      });
      return;
    }

    // Short-circuit if identical to last imported to avoid infinite feedback loops
    if (this._lastImportedHtml === sanitizedHtml) return;
    this._lastImportedHtml = sanitizedHtml;
    this._lastImportedConfigHash = null; // Clear config hash when importing HTML

    if (!this._root) {
      this._pendingHtml = sanitizedHtml;
      return;
    }
    this._isProgrammaticImport = true;
    this.__applyHtml(sanitizedHtml);
  }

  // Smart template import: accepts raw HTML string, JSON string, or configuration object
  public importTemplate(template: unknown) {
    if (typeof template === 'string') {
      try {
        const parsed = JSON.parse(template);
        if (this.__isLikelyConfiguration(parsed)) {
          this.setDocumentConfig(parsed);
          return;
        }
      } catch {
        // Not JSON; treat as HTML
      }
      this.setHtml(template);
      return;
    }
    if (template && typeof template === 'object' && this.__isLikelyConfiguration(template)) {
      this.setDocumentConfig(template as any);
    }
  }

  // Replace current editor document with a full configuration object (restores block editing)
  public setDocumentConfig(config: Record<string, any>) {
    if (!this.__isLikelyConfiguration(config)) return;
    this._lastImportedHtml = null; // Clear HTML hash when importing config
    if (!this._root) {
      this._pendingConfig = config;
      return;
    }
    this._isProgrammaticImport = true;
    try {
      resetDocument(config as any);
    } catch (e) {
      console.error('Failed to set configuration in EmailBuilderEditor', e);
    }
    queueMicrotask(() => { this._isProgrammaticImport = false; });
  }

  // Internal: Build a minimal document with a single Html block & push to store
  private __applyHtml(htmlContent: string) {
    // Create stable ids so future successive imports fully replace
    const htmlBlockId = 'block-imported-html';
    const defaults = getDefaults();
    const newDocument = {
      root: {
        type: 'EmailLayout',
        data: {
          backdropColor: defaults?.backdropColor ?? '#F5F5F5',
          canvasColor: defaults?.canvasColor ?? '#FFFFFF',
          borderColor: defaults?.borderColor ?? null,
          borderRadius: defaults?.borderRadius ?? 0,
          canvasWidth: defaults?.canvasWidth ?? 600,
          textColor: defaults?.textColor ?? '#262626',
          fontFamily: defaults?.fontFamilyKey ?? 'MODERN_SANS',
          baseFontSize: defaults?.fontSizePx ?? 16,
          childrenIds: [htmlBlockId],
        },
      },
      [htmlBlockId]: {
        type: 'Html',
        data: {
          // The Html block expects 'contents' prop (see buttons.tsx & HtmlSidebarPanel)
          props: { contents: htmlContent },
          style: {
            padding: { top: 16, bottom: 16, left: 24, right: 24 },
          },
        },
      },
    };

    // Replace document entirely
    try {
      resetDocument(newDocument as any);
      // emailContentChange event will fire from React effect when state updates.
    } catch (e) {
      console.error('Failed to set HTML in EmailBuilderEditor', e);
    }
    // Programmatic import cycle ends after microtask so effect can read flag
    queueMicrotask(() => {
      this._isProgrammaticImport = false;
    });
  }

  private __buildEmptyDocument() {
    const defaults = getDefaults();
    return {
      root: {
        type: 'EmailLayout',
        data: {
          backdropColor: defaults?.backdropColor ?? '#F5F5F5',
          canvasColor: defaults?.canvasColor ?? '#FFFFFF',
          borderColor: defaults?.borderColor ?? null,
          borderRadius: defaults?.borderRadius ?? 0,
          canvasWidth: defaults?.canvasWidth ?? 600,
          textColor: defaults?.textColor ?? '#262626',
          fontFamily: defaults?.fontFamilyKey ?? 'MODERN_SANS',
          baseFontSize: defaults?.fontSizePx ?? 16,
          childrenIds: [],
        },
      },
    };
  }

  // --- Helpers --------------------------------------------------
  private __sanitizeHtmlPayload(htmlContent: string) {
    if (!htmlContent) {
      return '';
    }

    const sanitized = DOMPurify.sanitize(htmlContent, {
      ADD_TAGS: ['style'],
      ADD_ATTR: ['style'],
    });

    const styles: string[] = [];

    const captureStyles = (source: string | null | undefined) => {
      if (!source) return;
      const matches = source.match(/<style[^>]*>[\s\S]*?<\/style>/gi);
      if (matches) {
        styles.push(...matches);
      }
    };

    const headMatch = sanitized.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    captureStyles(headMatch?.[1]);

    const bodyMatch = sanitized.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let working = bodyMatch ? bodyMatch[1] : sanitized;

    captureStyles(working);
    working = working.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    working = working
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .replace(/<html[^>]*>/gi, '')
      .replace(/<\/html>/gi, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      .replace(/<body[^>]*>/gi, '')
      .replace(/<\/body>/gi, '');

    const cleaned = working.trim();
    return [...styles, cleaned].filter(Boolean).join('\n');
  }

  private __isLikelyConfiguration(obj: any): boolean {
    if (!obj || typeof obj !== 'object') return false;
    const root = obj.root;
    if (!root || typeof root !== 'object') return false;
    if (root.type !== 'EmailLayout') return false;
    if (!root.data || typeof root.data !== 'object') return false;
    if (!Array.isArray(root.data.childrenIds)) return false;
    if (root.data.childrenIds.some((id: string) => id && !obj[id])) return false;
    return true;
  }

  private __applyReadOnly(readOnly: boolean) {
    const state = getEditorState();
    if (this._readOnlyMode === readOnly && state.readOnly === readOnly) {
      return;
    }

    if (readOnly) {
      this._readOnlySnapshot = {
        selectedMainTab: state.selectedMainTab,
        inspectorDrawerOpen: state.inspectorDrawerOpen,
      };

      if (!state.readOnly) {
        setReadOnly(true);
      }

      setSelectedMainTab('preview');
      setInspectorDrawerOpen(false);
      this._readOnlyMode = true;

      if (!this.hasAttribute('readonly')) {
        this._attributeSync = true;
        try {
          this.setAttribute('readonly', '');
        } finally {
          this._attributeSync = false;
        }
      }

      this.__dispatchModeChange('read-only');
      return;
    }

    const snapshot = this._readOnlySnapshot;

    if (state.readOnly) {
      setReadOnly(false);
    }

    const nextMainTab = snapshot?.selectedMainTab ?? 'editor';
    const nextInspector = snapshot?.inspectorDrawerOpen ?? true;

    setSelectedMainTab(nextMainTab);
    setInspectorDrawerOpen(nextInspector);

    this._readOnlySnapshot = null;
    this._readOnlyMode = false;

    if (this.hasAttribute('readonly')) {
      this._attributeSync = true;
      try {
        this.removeAttribute('readonly');
      } finally {
        this._attributeSync = false;
      }
    }

    this.__dispatchModeChange('interactive');
  }

  private __dispatchModeChange(mode: 'read-only' | 'interactive') {
    this.dispatchEvent(
      new CustomEvent('emailBuilderModeChange', {
        detail: { mode },
        bubbles: true,
        composed: true,
      })
    );
  }
}

// Register element once
if (!customElements.get('emailbuilder-editor')) {
  customElements.define('emailbuilder-editor', EmailBuilderEditor);
}

export { EmailBuilderEditor };