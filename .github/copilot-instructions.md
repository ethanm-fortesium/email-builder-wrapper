# AI Coding Agent Guide (email-builder-wrapper)

Concise, project-specific rules to be instantly productive when editing the email builder. Focus on the flat document model, block registration flow, and the web component <emailbuilder-editor> contract.

## Architecture Essentials
1. Entry point for embedding: `src/web-component.tsx` defines `EmailBuilderEditor` (Custom Element) and mounts React via `EmailBuilderRoot`.
2. State store: `src/documents/editor/EditorContext.tsx` (Zustand). Single flat object: `root` EmailLayout + each block keyed by id. Avoid nested trees.
3. Rendering split: `EditorBlock` vs `ReaderBlock`; wrappers (`EditorBlockWrapper`, `ReaderBlockWrapper`) add selection UI vs plain output.
4. Mode control: Main tabs (`editor | preview | json | html`) and readonly attribute (forces preview + hides editing chrome via CSS selectors).
5. Events fired from web component: `emailBuilderReady`, `emailContentChange`, `emailBuilderModeChange`. Suppress user-change semantics by setting `(_isProgrammaticImport = true)` before store mutations; unset immediately after.

## Document Configuration Pattern
Each block object: `{ type: BlockType, data: { props?, style?, childrenIds? } }`. Root `EmailLayout` holds visual theme + `childrenIds`. Example templates live in `src/getConfiguration/sample/` (use as scaffolds not copies).

## Block Extension Workflow
1. Create folder `src/documents/blocks/MyBlock/` with `MyBlockEditor.tsx`, `MyBlockReader.tsx`, `MyBlockPropsSchema.ts[x]` (Zod schema).
2. Register in `EDITOR_DICTIONARY` (`src/documents/editor/core.tsx`). Include both editor + reader components and schema.
3. Wrap editor component with `EditorBlockWrapper` for selection, tune menu, preview suppression.
4. If block manages children, store child ids in `data.childrenIds` and rely on `EditorChildrenIds` helper.

## Safe State MutationsS
- Prefer `setDocument(partial)` for incremental edits; use `resetDocument(fullConfig)` only for wholesale imports.
- Always maintain referential integrity: child ids listed in parent must exist as keys.
- When importing HTML via `setHtml()`, system creates a single `Html` block; do not manually mix raw HTML and structured blocks without clear separation.

## Fonts & Style
Font families enumerated in `src/documents/blocks/helpers/fontFamily.ts` (`FONT_FAMILIES`, `FONT_FAMILY_NAMES`). When adding variants, keep `key`, `label`, `value` consistent; update both arrays atomically.

## Readonly & Preview Nuances
Readonly attribute sets preview mode + disables inspector and selection overlays. Don’t try to remove logic in components—use CSS hooks already present.

## Import/Export
Use `getDocument()` for current config JSON; consumers listen to `emailContentChange` (skip dispatches when `_isProgrammaticImport`). For diff-like updates, send only modified keys through `setDocument()`.

## Quality & Conventions
- No deep object merges: replace block objects wholesale when editing props/styles.
- Keep schemas minimal: only validate shape used by UI; avoid speculative fields.
- Avoid side effects inside render of wrappers; use actions from EditorContext.

## Common Pitfalls (Avoid)
- Adding nested block objects (breaks flat model and serializers).
- Forgetting to clear `_isProgrammaticImport` (silences future genuine user events).
- Registering a block without reader component (preview/json export mismatch).

## Quick Build / Lint
`npm run dev` (Vite), `npm run build` (UMD bundle `emailbuilder-editor.umd.js`), `npm run lint`. No test suite currently—add lightweight examples under `src/getConfiguration/sample/` if validating new structures.

## When Editing
Reference existing block folders for patterns (e.g. `Button`, `ColumnsContainer`). Duplicate structure; then adjust schema + editor UI. Keep modifications under 50 lines per commit when feasible for review clarity.

Feedback welcome: request clarifications on missing workflows (e.g., future test strategy) and this guide will iterate.

