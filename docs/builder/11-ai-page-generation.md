# 11. AI page generation (without slop)

The builder generates whole pages with an LLM — but the model emits a
**Document Model as JSON, never raw HTML**. That single constraint is the
structural defense against AI slop.

## Why JSON, not HTML

| Raw HTML output | Document Model output (this design) |
| --- | --- |
| Off-brand styles, random hex colors | Forced to reference Theme tokens |
| Unbounded, unpredictable markup | Only registered Element types + props |
| A blob you can't edit | Real Elements — drag, edit, regenerate after |
| Slop | On-brand, valid, editable |

## Use it

```ts
import { generatePage, AnthropicProvider } from "@ai-builder/ai";

const provider = new AnthropicProvider({ apiKey });
const doc = await generatePage(provider, {
  registry,
  theme,
  prompt: "A landing page for a TypeScript component library called AcmeKit.",
  skills: [registry.getSkill("brand-voice")?.instructions ?? ""],
});
store.setDocument(doc); // validated, fully editable, undoable
```

In the playground, **✨ Generate page (AI)** runs this with a mock provider.

## The two halves

- `buildGenerationSystemPrompt(registry, theme)` — describes every Element type,
  its props, and the Theme tokens, and demands the JSON shape. The registry *is*
  the spec handed to the model, so generation can never reference something that
  doesn't exist.
- `parseGeneratedDocument(json, registry, theme)` — **pure, unit-tested**
  validator: drops unknown Element types, filters props to each Element's
  schema, applies defaults, assigns ids. Even a hallucinated `<marquee>` or an
  off-schema prop is silently removed before it reaches the canvas.

## After generation

The result is an ordinary Document Model: editable in the canvas, compilable to
HTML/MJML/form, and — once published — improvable by the
[Forecast-Gated Regeneration loop](./09-ai-loop.md). Generation gets you a strong
first draft; the loop keeps it sharp.
