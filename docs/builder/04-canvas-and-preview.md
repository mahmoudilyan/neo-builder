# 4. Canvas & preview

## How the canvas renders (WYSIWYG)

The canvas does **not** maintain a second renderer. Each leaf Element is drawn
with its own `render.html` — the exact function the Compiler uses — so what you
see is what compiles. Sections are drawn as real React containers (grid) so they
can host drag-and-drop, with their child nodes rendered the same way.

```
Canvas
 └─ DndContext
     └─ SortableContext (root sections)
         └─ NodeView (section) ── React grid container
             └─ SortableContext (children)
                 └─ NodeView (leaf) ── dangerouslySetInnerHTML = def.render.html(node)
```

Implications:

- Add a new Element type with an `html` render and it appears on the canvas with
  zero canvas code.
- Props are resolved for the active breakpoint (`resolveProps(node, breakpoint)`)
  before rendering, so responsive edits show live.

## Interactions

- **Select** — click a node → `store.select(id)`; outline shows selection.
- **Hover** — `store.hover(id)`; lighter outline.
- **Drag** — the `⠿` handle (dnd-kit). Reorder within a Section, or drop onto
  another Section to move between them. Resolves to `store.move(id, parentId, index)`.
- **Inline edit** — double-click a `text` Element to edit copy in place with a
  headless **TipTap** (ProseMirror) editor: a small bold/italic/strike toolbar,
  rich inline formatting stored as sanitized inline HTML. It commits once on
  blur (not per keystroke), so a typing session is a single undo step.
- **Delete** — the `×` on a selected node → `store.remove(id)`.

## Preview mode

`store.togglePreview()` flips `preview`. In preview the canvas hides all editing
chrome (handles, outlines, delete buttons, inline-edit) so you see the page as a
visitor would — without leaving the editor.

```ts
store.togglePreview();        // toggle
store.togglePreview(true);    // force on
```

The Toolbar exposes this plus the breakpoint switcher and **export HTML**.

## Live preview elsewhere / export

The canvas is one view; the Compiler is the source of truth for output. To get a
real HTML document (for an iframe, download, or publish):

```ts
import { compileHtml } from "@ai-builder/compiler-html";

const html = compileHtml(store.getState().doc, {
  registry: store.registry,
  theme: store.theme,
  title: "My page",
  // fullDocument: false,  // body-only fragment
});
```

Drop it into an iframe for a separate live preview pane:

```tsx
<iframe srcDoc={html} />
```

## Capability Profiles

A Compiler call can take a `profile` to restrict which Element types render —
this is how one Document targets different media. Out-of-profile or
unsupported-on-target Elements are **skipped gracefully** (emitted as an HTML
comment), never crash.

```ts
import type { CapabilityProfile } from "@ai-builder/core";

const emailish: CapabilityProfile = { target: "html", deny: ["input"] };
compileHtml(doc, { registry, theme, profile: emailish });
// inputs are skipped; everything else renders
```

The default for HTML is `landingPageProfile` (everything with an `html` render).
