# 2. Element structure

Two things share the word "element". Keep them distinct:

- **`ElementNode`** — an *instance* in the Document Model (the data).
- **`ElementDefinition`** — the *type* that says how a node renders and behaves.

## ElementNode (the data)

```ts
interface ElementNode {
  id: string;                  // persistent; survives regeneration (ADR-0004)
  type: string;                // a registered Element type, e.g. "text"
  props: Record<string, unknown>;        // the base-breakpoint props
  responsive?: Partial<Record<Breakpoint, Record<string, unknown>>>; // overrides
  children: ElementNode[];     // empty for leaves
}
```

A `Document` is just a wrapper around a root node:

```ts
interface Document {
  schemaVersion: number;
  themeId: string;
  root: ElementNode;   // root.children are Sections
}
```

Nodes are created through the Registry so defaults apply:

```ts
import { createElement } from "@ai-builder/core";
const node = createElement(registry, "button", { label: "Buy" });
```

## ElementDefinition (the type)

Defined with `defineElement` and put into a `Registry`. This contract **is** the
extension API (see [ADR-0002](../adr/0002-elements-carry-render-functions.md)).

```ts
import { defineElement } from "@ai-builder/core";

export const button = defineElement({
  type: "button",
  version: 1,                       // bump when props change; drives migration
  schema: {
    props: { label: "button text", href: "destination URL" },
    // allowedChildren?: string[] | "*"   // omit for leaves
  },
  aiMeta: {                         // REQUIRED — what an agent needs to know
    description: "A call-to-action button.",
    props: { label: "The CTA text.", href: "Where it points." },
  },
  defaults: () => ({ label: "Click me", href: "#" }),
  migrate: (oldProps, oldVersion) => oldProps,   // optional
  render: {                          // per-target; missing target = unsupported
    html: (node, ctx) => `<a href="${node.props.href}">${node.props.label}</a>`,
    // mjml, form ...
  },
});
```

Field by field:

| Field | Purpose |
| --- | --- |
| `type` | Unique key used in `ElementNode.type`. |
| `version` | Per-Element schema version; serialization stamps it and runs `migrate` on load. |
| `schema.props` | Prop → hint. The Inspector renders an input per prop. |
| `schema.allowedChildren` | Structural rule for containers. |
| `aiMeta` | **Required.** Feeds the MCP Server and the AI loop. |
| `defaults()` | Initial props on creation. |
| `migrate()` | Upgrade old serialized props. |
| `render[target]` | How the node compiles. A missing target means the [Capability Profile](./04-canvas-and-preview.md) excludes it there. |

## The Registry

```ts
import { Registry } from "@ai-builder/core";
import { registerBuiltins } from "@ai-builder/elements";

const registry = registerBuiltins(new Registry()); // section, text, button, image, input
registry.register(myCustomElement);                 // add your own
registry.list();                                    // all definitions
registry.require("text");                            // get or throw
```

Built-ins: `section` (the structural container), `text`, `button`, `image`,
`input`. See [Custom elements](./08-custom-elements.md) to add more.

## Resolving props (responsive)

`node.props` is the `base`. To get the effective props at a breakpoint, use
`resolveProps` — both the canvas and (later) the responsive compiler use it:

```ts
import { resolveProps } from "@ai-builder/core";
const effective = resolveProps(node, "md");  // base merged with sm, then md
```
