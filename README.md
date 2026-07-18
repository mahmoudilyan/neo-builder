# Neo Builder

**The open-source, agent-first content builder.** One universal Document Model, edited in
a Notion-like editor by humans *and* AI agents as equal peers, compiled to multiple
targets — Landing Page, Form, Email (MJML), and later Site.

> Status: pre-release. No published versions yet — the repo moves fast and is updated
> weekly to bi-weekly. Follow along, star it, or [contribute](./CONTRIBUTING.md).

## The goal

Most builders were designed for humans clicking a UI, with AI bolted on as a text box.
Neo Builder is designed the other way around: the builder itself is a **substrate that
AI agents can operate natively** — from inside the app, or from outside it (Claude,
Cursor, Codex, Gemini) over MCP. A human and an agent are **peer operators** of the same
document: same commands, same undo history, same attribution.

The north star: a headless, TipTap-like builder where it is easy to

- add extensions and custom Elements,
- connect any AI (bring your own key),
- drive every edit through structured, describable commands,
- generate pages that look great **without AI slop**,
- and keep content data-driven and continuously updatable.

## What makes it different

- **One Document Model, many targets.** A single canonical tree compiles to HTML
  (landing pages), MJML (email), and form schemas via per-target Compilers. Capability
  Profiles gate which Elements each target supports — email can never receive JS it
  can't render.
- **Agent-legible by construction.** Every Element ships required `aiMeta` — a contract
  describing what it is and how an agent should use it. The registry is a hard boundary:
  anything an agent emits outside the schema is dropped, not rendered.
- **Commands, not freehand code.** All edits — human or AI — go through a typed,
  chainable command layer (TipTap-style `chain()`), so agent plans are inspectable,
  undoable as a single step, and event-logged. Natural language → command plan →
  `applyPlan()`, never generated markup pasted into your page.
- **Anti-slop generation.** The AI authors a **Content Brief** (meaning: headline,
  features, CTA, a Mood); deterministic, art-directed **Layout Recipes** turn it into a
  Document. The system is the art director; the model writes the brief. Generation
  produces divergent Concepts, not one template. Optional web search grounds copy in
  real facts.
- **MCP-first.** External agents operate the builder through an MCP surface — resources
  for the Document Model, tools for commands and Compilers. Any MCP-capable agent
  connects with no bespoke integration.
- **Headless core, swappable everything.** `core` is pure TypeScript with zero UI
  dependencies — drivable by an agent with no browser. React is one view binding; rich
  text (TipTap) is opt-in; the Theme is a token set designed against email's constraints
  as the floor.
- **Tool / Skill / Routine.** A Tool *does*, a Skill *knows*, a Routine *triggers*.
  Tools and Skills ship in Extensions; Routines bind automations to a Document — the
  seam for the future self-optimizing content loop (forecast-gated regeneration).

## Try it

```sh
pnpm install
pnpm --filter @neo-builder/playground dev   # http://localhost:5173
```

Three builders, one per URL — each with its own element set:

- **/page** — Landing Page (HTML)
- **/email** — Email (MJML, live MJML→HTML preview)
- **/form** — Form (form schema)

Each has a drag-drop canvas, inline editing, responsive breakpoints, theme editing, and
an AI agent panel (works with a mock provider — no key needed; add an Anthropic key for
live generation).

## Quick start (headless)

```ts
import { Registry, createDocument, createElement, insertElement } from "@neo-builder/core";
import { registerBuiltins } from "@neo-builder/elements";
import { defaultTheme } from "@neo-builder/theme";
import { compileHtml } from "@neo-builder/compiler-html";

const registry = registerBuiltins(new Registry());
let doc = createDocument(defaultTheme.id);

const section = createElement(registry, "section", { columns: 1 });
doc = insertElement(doc, doc.root.id, section);
doc = insertElement(doc, section.id, createElement(registry, "text", { content: "Hello", as: "h1" }));
doc = insertElement(doc, section.id, createElement(registry, "button", { label: "Buy", href: "/x" }));

const html = compileHtml(doc, { registry, theme: defaultTheme, title: "Demo" });
```

## Packages

| Package | License | Purpose |
| --- | --- | --- |
| `@neo-builder/core` | MIT | Headless Document Model, registry, commands, history, serialization |
| `@neo-builder/theme` | MIT | Token-based Theme system (type scale, shadows, gradients) + defaults |
| `@neo-builder/elements` | MIT | Built-in Elements (section, text, button, image, input, icon, video, …) |
| `@neo-builder/compiler-html` | MIT | Document Model → HTML (Landing/Site), real `@media` responsive output |
| `@neo-builder/compiler-mjml` | MIT | Document Model → MJML (Email), graceful degradation |
| `@neo-builder/compiler-form` | MIT | Document Model → form schema |
| `@neo-builder/editor-react` | MIT | Notion-like drag-drop editor UI, composable TipTap-style API |
| `@neo-builder/editor-tiptap` | MIT | Opt-in TipTap rich-text binding |
| `@neo-builder/recipes` | MIT | Moods + Layout Recipes: the anti-slop creative engine |
| `@neo-builder/ai` | Apache-2.0 | BYO-key Providers, generation, planner, vision critique |
| `@neo-builder/mcp` | Apache-2.0 | MCP surface for external agents to operate the builder |

Builder packages are **MIT**; AI packages (`ai`, `mcp`) are **Apache-2.0** for the patent
grant. AI *capability* is open (bring your own key); managed cloud *infrastructure*
(instrumentation, hosted forecasting, routine runtime, CDN, collaboration) will be a
separate paid layer.

## Learn more

- [`CONTEXT.md`](./CONTEXT.md) — the project glossary (Document Model, Capability
  Profile, Content Brief, Routine, …). Read this first.
- [`docs/adr/`](./docs/adr) — architecture decision records.
- [`docs/builder/`](./docs/builder) — the builder guide: elements, events, themes,
  responsive, CSS overrides, custom elements, the AI loop.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — how to contribute.

## Develop

```sh
pnpm install
pnpm test        # vitest, runs against source
pnpm build       # tsup, per-package dist + .d.ts
pnpm typecheck   # tsc --noEmit across packages
```

## Roadmap

Build order: **Landing → Form → Email → Site**. Near-term: real MCP transport, Blocks
(saved element groups), Asset Library, more Moods/Recipes, production sanitizer.
Later: the self-optimizing content loop (per-Element metrics → forecast → regeneration),
Marketplace, real-time collaboration.

## License

MIT (builder packages) and Apache-2.0 (`ai`, `mcp`). See [`LICENSE`](./LICENSE).
