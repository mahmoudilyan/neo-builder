# 10. Email builder (MJML)

Email is the **same universal Document Model** compiled through a different
target. There is no separate email editor — you build once and compile to MJML.

## Compile to MJML

```ts
import { compileMjml, emailProfile } from "@ai-builder/compiler-mjml";

const mjml = compileMjml(doc, { registry, theme });
// emailProfile is applied by default; pass `profile` to customise.
```

`compileMjml` returns MJML markup. Run it through the
[`mjml`](https://mjml.io) library server-side to get final, client-tested email
HTML:

```ts
import mjml2html from "mjml";
const { html } = mjml2html(mjml);
```

In the playground the email builder has its own URL — **/email** — with its own
element set (no `input`) and a **live MJML→HTML preview** (via `mjml-browser`).
Each Builder Type is one editor configured by a Builder Type: it sets the target,
the Capability Profile, the palette, and the export. The `<Editor>` `mjmlToHtml`
prop wires real email rendering:

```tsx
import mjml2html from "mjml-browser";

<Editor store={store} mjmlToHtml={(mjml) => mjml2html(mjml).html} />
```

`createEditorStore({ registry, doc, theme, builderType: "email" })` makes an
editor that *is* the email builder; build a separate one per Builder Type, each
with its own registry from `registryFor("email")`.

## What maps to what

| Element | MJML output |
| --- | --- |
| `section` | `<mj-section>` with one `<mj-column>` per column (children round-robin) |
| `text` | `<mj-text>` (font/size/color/align from Theme tokens) |
| `button` | `<mj-button>` (primary background, radius from tokens) |
| `image` | `<mj-image>` |
| `input` | **excluded** — no `mjml` render, so the email Capability Profile drops it |

## Capability Profiles do the gating

`emailProfile = { target: "mjml" }`. Because `input` ships no `mjml` render,
`isSupported` returns false and the compiler emits a comment instead — email
can't contain form fields, and the system enforces that automatically rather
than producing broken output. Add an `mjml` render to any custom Element to make
it email-capable; omit it to keep it web-only.

## Differences from the HTML target

- **No `_style` escape hatch** — email can't take arbitrary CSS; style comes from
  Theme tokens mapped to MJML attributes.
- **No `@media` show/hide** — MJML is responsive by construction, so the
  responsive variant machinery used by the HTML compiler isn't applied here.
- **Rich text** — `text` content (inline HTML from TipTap) is sanitized and
  passed into `<mj-text>`, which accepts inline formatting.

## Why one model, not a separate email builder

A Block built on a Landing Page drops straight into an email; the AI loop's
copy improvements carry across channels; agents learn one schema. The cost —
email's tighter constraints — is expressed as a Capability Profile, not a fork
(see [ADR-0001](../adr/0001-one-universal-document-model.md)).
