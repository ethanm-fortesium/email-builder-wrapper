# Copilot Instructions for Email Builder Wrapper

## Project Overview
A React-based email template builder wrapped as a custom web component (`<emailbuilder-editor>`). The architecture bridges a React app with a Web Component API for external consumption, using Zustand for state management and the `@usewaypoint` block system for email composition.

## Core Architecture

### Web Component Layer (`src/web-component.tsx`)
- **Primary Interface**: `EmailBuilderEditor` class extending `HTMLElement`
- **React Bridge**: `EmailBuilderRoot` component connects React state to web component events
- **Key Methods**: `setHtml()`, `getHtml()`, `importTemplate()`, `setDocumentConfig()`, `getDocument()`
- **Event System**: Dispatches `emailContentChange`, `emailBuilderReady`, `emailBuilderModeChange` events
- **Readonly Mode**: Supports `readonly` attribute/property with CSS-based UI hiding

### State Management (`src/documents/editor/EditorContext.tsx`)
- **Store**: Zustand-based global state with document, UI selections, and drawer state
- **Document Structure**: Flat object with `root` (EmailLayout) + block IDs as keys
- **Key State**: `selectedBlockId`, `selectedMainTab` ('editor'|'preview'|'json'|'html'), `inspectorDrawerOpen`
- **Core Actions**: `setDocument()`, `resetDocument()`, `setSelectedBlockId()`

### Block System (`src/documents/editor/core.tsx`)
- **Block Dictionary**: Maps block types to schemas and React components
- **Editor vs Reader**: `EditorBlock` (editable) vs `ReaderBlock` (preview) components
- **Wrapper Pattern**: `EditorBlockWrapper` adds selection outlines, tune menus, and preview-aware behavior
- **Block Types**: Avatar, Button, Container, ColumnsContainer, Divider, Heading, Html, Image, Spacer, Text, EmailLayout

## Document Structure Pattern

```typescript
// TEditorConfiguration - flat object structure
{
  root: {
    type: 'EmailLayout',
    data: { backdropColor: '#F5F5F5', canvasColor: '#FFFFFF', textColor: '#262626', fontFamily: 'MODERN_SANS', childrenIds: ['block-1', 'block-2'] }
  },
  'block-1': {
    type: 'Text',
    data: { props: { text: 'Hello' }, style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } } }
  },
  'block-2': { type: 'Button', data: { props: { text: 'Click me', url: 'https://example.com' } } }
}
```

## Key Development Patterns

### Adding New Block Types
1. Create editor component in `src/documents/blocks/[BlockName]/`
2. Define props schema with Zod in `[BlockName]PropsSchema.tsx`
3. Register in `EDITOR_DICTIONARY` in `src/documents/editor/core.tsx`
4. Wrap with `EditorBlockWrapper` for editor mode interactions

### Preview Mode Integration
- Use `usePreviewMode()` hook from `PreviewModeContext` to hide editing controls
- `EditorBlockWrapper` automatically disables outlines/interactions in preview
- Web component's readonly mode forces preview tab and hides UI elements via CSS

### State Updates
- **Document Changes**: Use `setDocument()` with partial updates or `resetDocument()` for full replacement
- **Block Selection**: `setSelectedBlockId(blockId)` opens inspector panel and switches to 'block-configuration' tab
- **Programmatic Flags**: Set `_isProgrammaticImport = true` before document changes to mark events as non-user

## Build & Development

### Commands
```bash
npm run dev          # Vite dev server with React app
npm run build        # Build UMD bundle for web component distribution
npm run preview      # Preview built bundle
npm run lint         # ESLint check
```

### Build Configuration (`vite.config.ts`)
- **Dev Mode**: Serves standard React app from `index.html`
- **Build Mode**: Creates UMD bundle (`emailbuilder-editor.umd.js`) with web component entry point
- **Waypoint Aliases**: Maps `@usewaypoint/*` imports to local node_modules for block resolution
- **Bundle Target**: Single UMD file with inlined dependencies for easy embedding

## Web Component Integration
- **Registration**: Auto-registers as `emailbuilder-editor` custom element
- **Attributes**: Supports `apiBaseUrl` and `readonly` attributes
- **HTML Import**: `setHtml()` creates minimal document with single Html block containing raw content
- **JSON Import**: `setDocumentConfig()` accepts full editor configuration objects
- **Event Handling**: Listen for `emailContentChange` to track user modifications vs programmatic updates

## Inspector Panel Structure
- **Two Tabs**: 'Styles' (EmailLayout props) vs 'Block Configuration' (selected block props)
- **Sidebar Panels**: Located in `src/App/InspectorDrawer/ConfigurationPanel/input-panels/`
- **Input Components**: Standardized inputs in `helpers/inputs/` for consistent UX
- **Auto-open**: Selecting any block automatically opens inspector to 'block-configuration'

## Sample Configurations
Reference complete email templates in `src/getConfiguration/sample/` for document structure examples and common patterns like headers, footers, and multi-column layouts.