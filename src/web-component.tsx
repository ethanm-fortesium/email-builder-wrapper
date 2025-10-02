// Web Component wrapper for the Email Builder editor
// Exposes a custom element <emailbuilder-editor>
// Emits: emailBuilderReady, emailContentChange
// Public methods: getHtml(), getDocument()

import React, { useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { renderToStaticMarkup } from '@usewaypoint/email-builder';

// Import existing App + theme 
import App from './App';
import theme from './theme';
import { useDocument, resetDocument } from './documents/editor/EditorContext';

// Internal React component that hooks into the document store and dispatches events
function EmailBuilderRoot({ host, apiBaseUrl }: { host: EmailBuilderEditor, apiBaseUrl: string }) {
  const document = useDocument();
  const latestDocRef = useRef<any>(document);

  // Compute HTML whenever document changes
  const html = useMemo(() => renderToStaticMarkup(document, { rootBlockId: 'root' }), [document]);

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

  // Ready event (first mount)
  useEffect(() => {
    host.dispatchEvent(
      new CustomEvent('emailBuilderReady', {
        detail: {},
        bubbles: true,
        composed: true,
      })
    );
  }, []);

  return (
    <>
      <CssBaseline />
      <App apiBaseUrl={apiBaseUrl} />
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

  // Called by React side to update cached values
  public __setLatest(document: any, html: string) {
    this._latestDocument = document;
    this._latestHtml = html;
  }
  // Internal accessor used by React effect for event origin determination
  public __isProgrammatic() { return this._isProgrammaticImport; }

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

  // Programmatically replace editor content with provided raw HTML
  public setHtml(htmlContent: string) {
    if (!htmlContent || typeof htmlContent !== 'string') return;
    if (htmlContent.length === 0) {
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
    // if (this._lastImportedHtml === htmlContent) return;
    this._lastImportedHtml = htmlContent;
    this._lastImportedConfigHash = null; // Clear config hash when importing HTML

    if (!this._root) {
      this._pendingHtml = htmlContent;
      return;
    }
    this._isProgrammaticImport = true;
    this.__applyHtml(htmlContent);
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
    const newDocument = {
      root: {
        type: 'EmailLayout',
        data: {
          backdropColor: '#F5F5F5',
            canvasColor: '#FFFFFF',
            textColor: '#262626',
            fontFamily: 'MODERN_SANS',
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
    return {
      root: {
        type: 'EmailLayout',
        data: {
          backdropColor: '#F5F5F5',
          canvasColor: '#FFFFFF',
          textColor: '#262626',
          fontFamily: 'MODERN_SANS',
          childrenIds: [],
        },
      },
    };
  }

  // --- Helpers --------------------------------------------------
  private __isLikelyConfiguration(obj: any): boolean {
    console.log('Validating config:', obj);
    if (!obj || typeof obj !== 'object') return false;
    const root = obj.root;
    if (!root || typeof root !== 'object') return false;
    if (root.type !== 'EmailLayout') return false;
    if (!root.data || typeof root.data !== 'object') return false;
    if (!Array.isArray(root.data.childrenIds)) return false;
    if (root.data.childrenIds.some((id: string) => id && !obj[id])) return false;
    return true;
  }
}

// Register element once
if (!customElements.get('emailbuilder-editor')) {
  customElements.define('emailbuilder-editor', EmailBuilderEditor);
}

export { EmailBuilderEditor };
