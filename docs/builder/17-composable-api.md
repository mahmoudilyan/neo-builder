# 17. Composable React API

Like TipTap, the editor is composable: a main hook plus standalone components you
arrange yourself. The all-in-one `<Editor>` is just a preset built from them.

## `useBuilder` — the main hook

Create a builder once; use it anywhere.

```tsx
import { useBuilder, BuilderProvider, Toolbar, Palette, Canvas, Inspector } from "@ai-builder/editor-react";

function MyBuilder() {
  const builder = useBuilder({ registry, doc, theme, builderType: "page" }, [/* deps */]);

  return (
    <BuilderProvider builder={builder}>
      <Toolbar />
      <div className="cols">
        <Palette />
        <Canvas />
        <Inspector />
      </div>
    </BuilderProvider>
  );
}
```

`useBuilder(options, deps)` memoizes the store and recreates it when `deps`
change (mirrors TipTap's `useEditor` config + deps).

## `BuilderProvider` — context, drag-and-drop, keyboard

Wrap your composition in `<BuilderProvider builder={…}>`. It provides the store
to all descendants and wires drag-and-drop and undo/redo shortcuts, so the
components work no matter how you lay them out.

```tsx
<BuilderProvider builder={builder} keyboard={true} textEditor={TiptapText}>
  {/* any layout of components */}
</BuilderProvider>
```

## Hooks for your own blocks

Any component inside the provider can reach the builder:

```tsx
import { useCurrentBuilder, useBuilderState } from "@ai-builder/editor-react";

function SaveButton() {
  const builder = useCurrentBuilder();          // the store (commands, chain, log)
  const { doc, builderType } = useBuilderState(); // reactive state
  return <button onClick={() => save(doc)}>Save {builderType}</button>;
}
```

(`useEditor` / `useEditorState` are the same hooks under their original names.)

## Standalone components

`Toolbar`, `Palette`, `Canvas`, `Inspector`, `ThemePanel`, `NodeView` are all
exported and context-driven. Use any subset, in any layout, styled how you like.
Import the default styles once:

```ts
import "@ai-builder/editor-react/styles.css";
```

## Opt-in rich text (TipTap)

The core editor has **no TipTap dependency** — `text` Elements edit with a plain
contentEditable by default. To enable rich text, install the optional package and
pass its component:

```tsx
import { TiptapText } from "@ai-builder/editor-tiptap";

<BuilderProvider builder={builder} textEditor={TiptapText}>…</BuilderProvider>
// or with the preset:
<Editor store={builder} textEditor={TiptapText} />
```

`textEditor` is any component of shape `({ node, onDone }) => ReactNode`, so you
can supply your own editor instead of TipTap. Without it, editing stays plain and
dependency-free.

## When to use the preset vs compose

- **`<Editor store={…} />`** — fastest start, the default three-pane layout.
- **`useBuilder` + `BuilderProvider` + components** — your own layout, extra
  panels, custom toolbars. The playground itself is built this way.
