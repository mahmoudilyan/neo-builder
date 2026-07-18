# 1. Builder structure

## Packages

| Package | What it owns |
| --- | --- |
| `@ai-builder/core` | Document Model, `Registry`, commands, `resolveProps`, serialization, Capability Profiles |
| `@ai-builder/elements` | Built-in Element Definitions |
| `@ai-builder/theme` | Token-based Theme + `defaultTheme` |
| `@ai-builder/compiler-html` | Document → HTML |
| `@ai-builder/editor-react` | `EditorStore` + the Notion-like canvas UI |
| `@ai-builder/ai` | Provider (BYO-key) + Forecast-Gated Regeneration |
| `@ai-builder/mcp` | MCP surface for external agents |

Core is **headless** — no UI, no DOM. The editor, compilers, MCP server, and AI
loop are all consumers of Core. That is what lets an agent build a page with no
browser (see [ADR-0001](../adr/0001-one-universal-document-model.md)).

## The EditorStore

`EditorStore` (in `@ai-builder/editor-react`) is the runtime heart of the
builder. It holds:

```ts
interface EditorState {
  doc: Document;          // the universal Document Model
  selectedId: string | null;
  hoveredId: string | null;
  breakpoint: Breakpoint; // "base" | "sm" | "md" | "lg"
  preview: boolean;       // hides editing chrome
}
```

It exposes three surfaces:

- **Reactive state** — `subscribe(fn)` + `getState()`, consumed by React through
  `useSyncExternalStore`. Use the `useEditorState()` hook.
- **Commands** — every mutation: `addElement`, `updateProps`, `replaceProps`,
  `setResponsive`, `move`, `remove`, `select`, `hover`, `setBreakpoint`,
  `togglePreview`, `setTheme`. Each returns immutably and notifies subscribers.
- **History** — `undo()` / `redo()`, with reactive `canUndo` / `canRedo` in
  state. Every document mutation is undoable (selection/hover/breakpoint are
  not). `<Editor>` binds **⌘/Ctrl+Z** and **⌘/Ctrl+Shift+Z** (or **Ctrl+Y**) by
  default; pass `keyboard={false}` to opt out. Shortcuts are ignored while typing
  in an input or inline-editing text, so native undo still works there.
- **Event bus** — `on(type, handler)` for side effects ([Events](./03-events.md)).

Every command funnels through Core's pure functions, so the **UI, the MCP
Server, and Routines all drive the same code path**. There is no separate
"agent API" that can drift from what the editor does.

```ts
import { createEditorStore } from "@ai-builder/editor-react";

const store = createEditorStore({ registry, doc, theme });
store.addElement("section", store.getState().doc.root.id);
store.select(someId);
store.setBreakpoint("md");
```

## Lifecycle

1. Build a `Registry` and register Elements (`registerBuiltins(new Registry())`).
2. Create or load a `Document` (`createDocument`, or `deserialize(json, registry)`).
3. `createEditorStore({ registry, doc, theme })`.
4. Render `<Editor store={store} />`, or drive `store` headlessly.
5. Subscribe to `doc:change` to persist (`serialize(doc, registry)`).
6. Compile when publishing (`compileHtml(doc, { registry, theme })`).

## Headless usage (no React)

The store works without rendering — useful for agents, tests, and server jobs:

```ts
const store = createEditorStore({ registry, doc, theme });
const hero = store.addElement("section", doc.root.id);
store.addElement("text", hero.id);
const html = compileHtml(store.getState().doc, { registry, theme });
```
