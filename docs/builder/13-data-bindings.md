# 13. Data bindings

Store content can be updated smoothly from data, without re-authoring the page.
Any string prop can hold `{{path}}` tokens; `bindData` resolves them against a
data object and returns a new Document.

## Bind

Author once with placeholders:

```ts
const el = createElement(registry, "text", { content: "Hi {{user.name}}, {{cart.count}} items" });
```

Resolve against data at render time:

```ts
import { bindData } from "@ai-builder/core";

const bound = bindData(doc, { user: { name: "Mo" }, cart: { count: 3 } });
// text.content is now "Hi Mo, 3 items"
```

`bindData` is pure and immutable — the authored Document keeps its `{{tokens}}`;
you get a resolved copy. Missing paths resolve to empty string, so a partial data
object never throws.

## Live, data-driven pages

Re-run `bindData` whenever the data changes and compile the result:

```ts
function renderWithData(doc, data) {
  return compileHtml(bindData(doc, data), { registry, theme });
}
// new data in → updated HTML out, same authored template
```

This is how the same page personalizes per user, reflects live inventory, or
fills an email with order details — one template, many data shapes.

## Where it sits in the pipeline

```
authored Document ──bindData(data)──▶ resolved Document ──Compiler──▶ HTML / MJML / form
```

Bind before compiling for output, or before `resolveProps` in the canvas to
preview with sample data. Because binding is just a Document→Document transform,
it composes with everything else — themes, responsive, the AI loop.

## Notes

- Tokens work in any string prop (`content`, `label`, `href`, `src`, `alt`…),
  so you can bind links and image sources, not just text.
- Combine with the [AI loop](./09-ai-loop.md): regenerate the *template* copy,
  keep the `{{bindings}}` intact.
