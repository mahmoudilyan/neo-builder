# 14. Form builder

Forms are the **same universal Document Model** compiled to a structured form
schema instead of markup. Build a form with the same canvas, sections, and
Elements; compile it to JSON your runtime can render and validate.

## Compile to a form schema

```ts
import { compileForm } from "@ai-builder/compiler-form";

const schema = compileForm(doc, { registry, theme });
// { fields: [ { kind: "static", text: "Sign up", as: "h2" },
//             { name: "email", label: "Email", type: "email", required: true },
//             { kind: "submit", label: "Join" } ] }
```

`compileForm` walks the Document and collects each Element's `form` render. The
ordering follows document order, so layout in the canvas maps to field order.

## What maps to what

| Element | Form contribution |
| --- | --- |
| `input` | A field: `{ name, label, type, required }` |
| `text` | A static label/heading: `{ kind: "static", text, as }` |
| `button` | A submit control: `{ kind: "submit", label }` |
| `image`, `section` | No `form` render → not part of the schema |

As with email, the Capability Profile does the gating: only Elements with a
`form` render appear. Add a `form` render to a custom Element to make it
form-capable.

## Rendering the schema

`compileForm` gives you a typed description, not HTML — render it however your
app does forms (React Hook Form, native, your design system), and validate on
`required` / `type`. Combine with [data bindings](./13-data-bindings.md) to
prefill fields from existing data.

## One model, four outputs

```
Document Model
 ├─ compiler-html → Landing Page / Site
 ├─ compiler-mjml → Email
 └─ compiler-form → Form schema
```

A Block authored once works across all of them; the AI loop and data bindings
apply uniformly. That is the payoff of the universal model
([ADR-0001](../adr/0001-one-universal-document-model.md)).
