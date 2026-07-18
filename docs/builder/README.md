# Builder Guide

How the AI Builder works, end to end. These guides describe the **real, shipped
API** in `packages/*`. For vocabulary see [`../../CONTEXT.md`](../../CONTEXT.md);
for the *why* behind big decisions see [`../adr/`](../adr).

## Mental model in one breath

A headless **Core** holds one universal **Document Model** (a tree of
`ElementNode`s). **Element Definitions** in a **Registry** know how each node
renders per target and how an agent should use it. The **EditorStore** wraps a
Document with selection/breakpoint/preview state, a command API, and an event
bus. `@ai-builder/editor-react` renders a Notion-like canvas over that store.
**Compilers** turn the same Document into HTML / MJML / form. `@ai-builder/ai`
runs the Forecast-Gated Regeneration loop.

```
Registry (Element Definitions)
        │
        ▼
EditorStore ── commands ──▶ Document Model ──▶ Compiler ──▶ HTML / MJML / form
   │   ▲                         │
 events │                    Canvas (editor-react)  ◀── you edit here
   │   └── React (useSyncExternalStore)
   ▼
autosave / analytics / AI loop
```

## Contents

1. [Builder structure](./01-builder-structure.md) — packages, the EditorStore, lifecycle
2. [Element structure](./02-element-structure.md) — `ElementNode` vs `ElementDefinition`
3. [Events](./03-events.md) — builder events and element events
4. [Canvas & preview](./04-canvas-and-preview.md) — how the canvas renders, preview mode, export
5. [Themes](./05-themes.md) — update a theme, add a theme
6. [Element CSS overrides](./06-element-css.md) — the `_style` escape hatch
7. [Responsive design](./07-responsive.md) — breakpoints and per-breakpoint overrides
8. [Custom elements](./08-custom-elements.md) — define and register your own Element
9. [The AI loop](./09-ai-loop.md) — forecast-gated regeneration in practice
10. [Email builder (MJML)](./10-email-mjml.md) — the same model compiled to email
11. [AI page generation](./11-ai-page-generation.md) — generate pages without slop
12. [Tools & Skills](./12-tools-and-skills.md) — extend agents with capabilities and know-how
13. [Data bindings](./13-data-bindings.md) — data-driven content with `{{tokens}}`
14. [Form builder](./14-form-builder.md) — the same model compiled to a form schema
15. [Commands & customization](./15-commands-and-customization.md) — the chain API, element metadata, interactive states
16. [What makes this different](./16-intent-and-substrate.md) — describable commands, NL→command planning, event-sourced log
17. [Composable API](./17-composable-api.md) — `useBuilder`, `BuilderProvider`, standalone components, opt-in TipTap
18. [Using AI: generate, Skills & Tools](./18-using-ai-agents.md) — hands-on agent guide

## 60-second example

```ts
import { Registry, createDocument } from "@ai-builder/core";
import { registerBuiltins } from "@ai-builder/elements";
import { defaultTheme } from "@ai-builder/theme";
import { createEditorStore } from "@ai-builder/editor-react";

const registry = registerBuiltins(new Registry());
const store = createEditorStore({ registry, doc: createDocument(defaultTheme.id), theme: defaultTheme });

const section = store.addElement("section", store.getState().doc.root.id);
store.addElement("text", section.id);          // adds + selects
store.on("doc:change", ({ doc }) => save(doc)); // autosave
```

Render it: `<Editor store={store} />`.
