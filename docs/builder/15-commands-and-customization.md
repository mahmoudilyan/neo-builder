# 15. Commands & customization (TipTap-style)

The editor is driven by a **chainable command API**, modelled on TipTap. This is
the abstraction that makes the builder easy to extend and script — for Page,
Email, and Form alike.

## The chain

```ts
store.chain()
  .insert(rootId, "section", { columns: 2 })   // returns the chain
  .update(someId, { content: "Hello" })
  .setState(buttonId, "hover", { backgroundColor: "#3730a3" })
  .run();                                       // applies all as ONE undo step
```

- Every command returns the chain, so calls compose.
- `run()` commits the whole chain as a **single transaction** → one undo.
- A command that can't apply (missing node, wrong type) returns false and
  **aborts the chain without committing anything**.

## Querying with `can()`

```ts
if (store.can().move(id, targetId, 0).run()) {
  store.chain().move(id, targetId, 0).run();
}
```

`can()` dry-runs the chain and returns a boolean without changing state — use it
to enable/disable UI.

## Built-in commands

`select` · `insert` · `insertNode` · `update` · `replace` · `responsive` ·
`setState` · `move` · `remove`. All operate on the universal Document Model, so
the same commands work in every Builder Type.

## Custom commands

Register your own; they join the chain via `cmd()`:

```ts
store.registerCommand("addHero", () => (ctx) => {
  const section = createElement(ctx.registry, "section", { columns: 1 });
  ctx.draft.doc = insertElement(ctx.draft.doc, ctx.draft.doc.root.id, section);
  const h = createElement(ctx.registry, "text", { content: "Hero", as: "h1" });
  ctx.draft.doc = insertElement(ctx.draft.doc, section.id, h);
  ctx.draft.selectedId = section.id;
  return true; // false aborts the chain
});

store.chain().cmd("addHero").run();
```

A command receives `ctx.draft` (the working `{ doc, selectedId }`) and
`ctx.registry`. Mutate `ctx.draft.doc` immutably with core functions; return a
boolean. Because a custom command can perform many edits and still be one chain
step, complex authoring actions stay atomic and undoable.

The playground's **Commands API** panel runs every example live.

## Element metadata: icon, label, description, accepts

Element Definitions carry presentation + structural metadata so palettes and the
inspector are self-describing:

```ts
defineElement({
  type: "button",
  label: "Button",            // display name
  icon: "⬢",                  // emoji, URL, or inline SVG/data-URI
  states: ["hover", "active", "focus"], // interactive states it supports
  schema: { props: { label: "…" }, allowedChildren: undefined }, // leaf: accepts nothing
  aiMeta: { description: "A call-to-action button." },           // the description
  // …
});
```

- **icon / label** show in the palette and inspector.
- **`aiMeta.description`** is the human + agent description.
- **`schema.allowedChildren`** is *what it accepts* — `undefined` (leaf, accepts
  nothing), `"*"` (any), or a list of types. Use `accepts(def, childType)` to
  check, and surface it in drop validation.

## Interactive states

Elements declare which states they support (`states`), and you style each one:

```ts
store.chain().setState(buttonId, "hover", { backgroundColor: "#3730a3" }).run();
```

State styles are raw CSS overrides stored on `node.states[state]`. The HTML
compiler emits real pseudo-class rules:

```css
.st0:hover > * { background-color: #3730a3 !important }
```

In the inspector, pick a state tab (default / hover / focus / active) and edit
its CSS. "default" edits the base `_style`; the others edit that interactive
state. Only states the Element declares are offered.
