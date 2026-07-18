# 8. Custom elements

Adding an Element is the core extension path. Built-ins and your own Elements use
the **same** `defineElement` contract — there is no privileged built-in API
(see [ADR-0002](../adr/0002-elements-carry-render-functions.md)).

## Define one

```ts
import { defineElement } from "@ai-builder/core";

export const divider = defineElement({
  type: "divider",
  version: 1,
  schema: {
    props: { thickness: "line thickness in px", color: "border color token key" },
  },
  aiMeta: {
    description: "A horizontal rule that separates content.",
    props: {
      thickness: "Line thickness in pixels.",
      color: "Theme color token key, e.g. 'border'.",
    },
    usage: "Place between sections or stacked text blocks.",
  },
  defaults: () => ({ thickness: 1, color: "border" }),
  render: {
    html: (node, ctx) => {
      const t = ctx.theme.tokens as any; // ThemeTokens
      const color = t.colors[String(node.props.color)] ?? t.colors.border;
      return `<hr style="border:0;border-top:${Number(node.props.thickness)}px solid ${color};margin:0" />`;
    },
    // add `mjml` / `form` renders to support those targets; omit to exclude there
  },
});
```

Checklist for a good Element:

- **`aiMeta` is required** and worth effort — it's what agents and the AI loop
  read. Describe what it is and each prop.
- **One `render` per target** you support. A missing target means the
  [Capability Profile](./04-canvas-and-preview.md) excludes it there (graceful).
- **Use Theme tokens** via `ctx.theme.tokens`, not hard-coded values, so themes
  and email translation work.
- **Bump `version` + add `migrate`** whenever you change `schema.props` on an
  Element that may already be saved in documents.

## Register it

```ts
import { Registry } from "@ai-builder/core";
import { registerBuiltins } from "@ai-builder/elements";

const registry = registerBuiltins(new Registry());
registry.register(divider);            // now in the palette + canvas + MCP
// or many at once: registry.registerAll([divider, pricingTable, video]);
```

That's all. The new type automatically:

- appears in the **Palette** (derived from `registry.list()`),
- renders on the **Canvas** (via its `html` render),
- is editable in the **Inspector** (an input per `schema.props`),
- is exposed to **agents** over MCP (its `aiMeta` feeds `list_element_types`),
- **compiles** to any target it provides a render for.

## Containers

To make a container that holds children, declare `allowedChildren` and render
them via the context:

```ts
defineElement({
  type: "card",
  version: 1,
  schema: { props: { padding: "spacing step" }, allowedChildren: "*" },
  aiMeta: { description: "A padded surface that groups child Elements." },
  defaults: () => ({ padding: 5 }),
  render: {
    html: (node, ctx) => `<div style="padding:16px;border-radius:8px;background:#fff">${ctx.renderChildren(node)}</div>`,
  },
});
```

`ctx.renderChildren(node)` (and `ctx.renderNode(child)`) recurse through the
Compiler, so nested custom Elements just work.

## Packaging as an Extension

A shareable **Extension** is a module that registers a bundle of Element
Definitions (and later Blocks, Tools, Skills):

```ts
export function registerMarketingPack(registry: Registry) {
  return registry.registerAll([divider, card, pricingTable, testimonial]);
}
```

Publish it as its own package; consumers call your `register*` function after
`registerBuiltins`.
