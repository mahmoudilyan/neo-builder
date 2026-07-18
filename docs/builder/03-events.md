# 3. Events

The EditorStore has **two** notification channels. Use the right one.

| Channel | API | Use for |
| --- | --- | --- |
| Reactive state | `subscribe` / `getState` (via `useEditorState`) | Rendering UI |
| Event bus | `on(type, handler)` | Side effects: autosave, analytics, plugins, the AI loop |

Rendering should never live on the event bus, and side effects should never
live in a React render. Keeping them separate is why autosave doesn't cause
re-renders and selection changes don't trigger network writes.

## Builder + element events

`store.on(type, handler)` returns an unsubscribe function. Payloads are typed.

```ts
type EditorEvents = {
  "doc:change":        { doc: Document };
  "selection:change":  { id: string | null; node?: ElementNode };
  "element:add":       { node: ElementNode; parentId: string };
  "element:update":    { id: string; props: Record<string, unknown> };
  "element:remove":    { id: string };
  "element:move":      { id: string; toParentId: string; index: number };
  "breakpoint:change": { breakpoint: Breakpoint };
  "theme:change":      { themeId: string };
  "preview:toggle":    { preview: boolean };
};
```

"Builder events" = `doc:change`, `breakpoint:change`, `theme:change`,
`preview:toggle`, `selection:change`. "Element events" = `element:add`,
`element:update`, `element:remove`, `element:move`.

## Examples

Autosave (debounced):

```ts
import { serialize } from "@ai-builder/core";

let timer: ReturnType<typeof setTimeout>;
store.on("doc:change", ({ doc }) => {
  clearTimeout(timer);
  timer = setTimeout(() => localStorage.setItem("doc", serialize(doc, store.registry)), 500);
});
```

React to a specific element changing:

```ts
const off = store.on("element:update", ({ id, props }) => {
  if ("content" in props) track("copy_edited", { id });
});
// later: off();
```

Trigger the AI loop when a CTA is added:

```ts
store.on("element:add", ({ node }) => {
  if (node.type === "button") queueForecast(node.id);
});
```

## Subscribing in React

For rendering, use the hook — not the event bus:

```tsx
import { useEditor, useEditorState } from "@ai-builder/editor-react";

function SelectedBadge() {
  const { selectedId } = useEditorState();   // re-renders on change
  const store = useEditor();                  // commands + event bus
  return <span>{selectedId ?? "nothing selected"}</span>;
}
```

For a side effect inside a component, subscribe in an effect:

```tsx
useEffect(() => store.on("theme:change", ({ themeId }) => console.log(themeId)), [store]);
```
