# Neo Builder

An open-source, AI-agent-first content builder (npm monorepo). A single universal
document model powers multiple builder types — Email (MJML), Landing Page, Form, and
later Site — each produced by a target-specific compiler.

## Language

**Document Model**:
The single canonical tree that every builder type edits. Serializes once; compiles to
each target via a Compiler. There is exactly one model, not one per target.
_Avoid_: schema, AST, doc tree (use "Document Model")

**Builder Type**:
A mode of the editor targeting one medium: Email, Landing Page, Form, or Site. All
Builder Types edit the same Document Model.
_Avoid_: mode, product, app

**Compiler**:
A target adapter that renders the Document Model to a concrete output (MJML for Email,
HTML for Landing Page, form schema for Form).
_Avoid_: renderer, exporter, adapter

**Capability Profile**:
The set of Elements and properties a given Builder Type supports. The Email profile
forbids JS and interactive Elements; the Form profile adds validation/state Elements.
Compilers reject or degrade Elements outside their profile.
_Avoid_: feature flags, constraints

**Element**:
The atomic editable unit in the Document Model (e.g. text, image, button, input).
_Avoid_: node, widget, component

**Section**:
A top-level Element that lays out one or more columns; the primary structural unit of a
page.
_Avoid_: row, container, layout

**Block**:
A saved, reusable group of Elements that can be inserted into any Document Model and
re-used later.
_Avoid_: snippet, template, group

**Core**:
The headless package: Document Model, mutations/commands, history, Compilers, and the
extension registry. Pure TypeScript, zero UI dependencies. Drivable by AI agents with no
browser.
_Avoid_: engine, kernel, sdk

**Editor**:
The React view binding over Core that renders the editing UI. The first of potentially
many framework bindings; Core never depends on it.
_Avoid_: ui, app, frontend

**Element Definition**:
The contract that registers an Element type: `schema` (props + allowed children),
`aiMeta`, `edit` (React view), and per-target `render` functions. Built-ins and
extensions register the same way. An Element carries its own render functions; Compilers
walk the tree and call them.
_Avoid_: spec, descriptor, config

**aiMeta**:
The required agent-facing description on every Element Definition — what the Element is,
its props, and how an agent should use it. Makes Elements legible to AI agents.
_Avoid_: ai hints, prompt, description

**Extension**:
A distributable bundle that registers Element Definitions (and later Blocks, tools,
skills, routines) into Core's registry.
_Avoid_: plugin, addon, module

**Theme**:
The token set (colors, fonts, spacing scale, radii, type scale) referenced by Elements'
semantic style props. One active Theme per Document Model, swappable. Compilers translate
tokens to each target. Designed against email's constraints as the floor.
_Avoid_: style guide, skin, palette

**Style Prop**:
A semantic style field on an Element (e.g. `spacing`, `align`, `bg`, `textStyle`) that
references Theme tokens rather than raw CSS. Raw CSS is an escape-hatch allowed only where
the Capability Profile permits.
_Avoid_: css, style attribute

**MCP Server**:
The canonical surface for *external* AI agents (Claude, Cursor, Codex, Gemini) to operate
the builder. Exposes the Document Model as MCP resources and Core commands/Compilers as
MCP tools, described via `aiMeta`. Any MCP-capable agent connects with no bespoke code.
_Avoid_: api, integration, connector

**Provider**:
The model-agnostic abstraction powering *in-app* AI features (generate/rewrite buttons
inside the Editor). Wraps Anthropic/OpenAI/Google. Distinct from the MCP Server: Providers
serve in-app calls; the MCP Server serves external agents driving the builder.
_Avoid_: llm client, model, backend

**Tool**:
A callable capability an agent invokes in builder context (e.g. `fetchProducts`,
`translate`, `resizeImage`). Has typed inputs/outputs, ships inside an Extension, surfaced
to agents via the MCP Server. "A Tool does."
_Avoid_: function, action, command

**Skill**:
Packaged know-how (instructions/procedure) injected into agent context to guide behavior
(e.g. "write high-converting subject lines"). No execution. Ships inside an Extension.
"A Skill knows."
_Avoid_: prompt, guide, instruction set

**Routine**:
A triggered automation bound to a Document Model: `trigger → agent action` using available
Tools and Skills. Triggers = schedule, event, or metric signal. Authored per Document;
exportable as a Routine Template for reuse. "A Routine triggers."
_Avoid_: workflow, automation, job

**Forecast-Gated Regeneration**:
The signature self-optimizing loop. Instrumented output → per-Element time-series →
TimesFM zero-shot forecast → predicted decay crosses threshold → fires a metric-signal
Routine → LLM regenerates that Element → outcome feeds back. Forecasts decay *before* it
happens (pre-emptive), unlike reactive A/B testing.
_Avoid_: auto-optimize, AI optimization

**Metric Signal**:
A Routine trigger derived from a TimesFM forecast crossing a threshold for an Element's
time-series. Granularity is per-Element.
_Avoid_: alert, event (reserve "event" for raw instrumentation events)

**Forecaster**:
The TimesFM-based component that produces zero-shot trajectory forecasts from per-Element
time-series. Cloud-only.
_Avoid_: model, predictor, ML

**Element id**:
The persistent identifier on every Element. Survives regeneration — an LLM rewrite changes
content but keeps the id, so the Element's time-series stays continuous. Regenerated
candidates are tracked as variants under the same Element id.
_Avoid_: key, uuid

**Variant**:
A candidate version of an Element's content produced by regeneration, tracked under the
Element id (not as a new Element). Enables before/after lift measurement.
_Avoid_: version, copy, alternative

**Forecast-Accelerated Bandit**:
Variant selection where TimesFM forecasts each Variant's early trajectory to shift traffic
to the predicted winner sooner than a classic bandit would converge.
_Avoid_: A/B test, split test

**Counterfactual Baseline**:
The TimesFM forecast of what the original Element would have done if left untouched. True
lift is measured against this predicted-no-change line, removing the need for a permanent
held-back control.
_Avoid_: control, baseline

**Autopilot**:
A per-Routine autonomy setting that auto-applies the winning Variant. Off by default
(human-approval); opt-in per Document.
_Avoid_: auto mode, automation

**Asset Library**:
The store of media/fonts used inside a Document Model. Backed by a pluggable AssetStore
interface in Core (filesystem/S3/etc.); Cloud provides a hosted AssetStore + CDN.
_Avoid_: media manager, uploads

**Marketplace**:
A later-phase hosted catalog to share/sell Blocks, Extensions, and Routine Templates.
Designed-for now, not built first.
_Avoid_: store, registry (reserve "registry" for Core's extension registry)

**Integration**:
Connecting a Document Model to external systems (CRM, webhooks, other tools). Not a
separate concept — an Integration is a Tool, invoked by agents or Routines. "Landing page
connected with other tools" = Tools.
_Avoid_: connector, plugin (an Integration is a Tool)

**Content Brief**:
The semantic output an AI authors when generating a page — meaning only: headline,
subhead, CTA, features, a chosen Mood and Layout Recipe. It is NOT a Document Model; a
Layout Recipe turns it into one. Separating *what* (Brief) from *how it looks* (Recipe)
is the structural defense against templated AI slop.
_Avoid_: spec, content (use "Content Brief")

**Mood**:
A named visual stance (e.g. editorial, minimal, bold, warm) that maps to Theme token
overrides — type scale, fonts, color emphasis, spacing rhythm, radius. The AI picks a
Mood; the system owns what it means.
_Avoid_: style, vibe, theme (a Mood adjusts a Theme)

**Layout Recipe**:
A deterministic, art-directed function that turns a Content Brief + Mood + Theme into a
Document Model. Recipes own layout craft (asymmetry, rhythm, hierarchy, alignment) so the
AI cannot produce an ugly layout. The system is the art director; the AI writes the brief.
_Avoid_: template, layout, recipe (use full "Layout Recipe")

**Concept**:
One generated candidate = a Content Brief realized through a Layout Recipe + Mood into a
Document (+ adjusted Theme). Generation produces several divergent Concepts to pick from,
so pages never converge to one template.
_Avoid_: variant (reserve "Variant" for regeneration), option


## Example dialogue

> **Dev:** A user saved a hero they like and dropped it into an email. Same thing?
> **Expert:** That saved group is a **Block** — reusable across any **Builder Type**. But
> the email's **Capability Profile** strips Elements it can't render; if the hero had an
> interactive **Element**, the **Compiler** drops or degrades it.
>
> **Dev:** When the headline's CTR drops and we rewrite it, is that a new Element?
> **Expert:** No. Same **Element id** — the rewrite is a **Variant** under it, so the
> time-series stays continuous. The **Forecaster** saw the **Metric Signal** (predicted
> decay), fired the **Routine**, and the **Provider** generated the Variant. That's
> **Forecast-Gated Regeneration**.
>
> **Dev:** Does it just ship the winner?
> **Expert:** Only if **Autopilot** is on for that Routine — off by default. Traffic is
> split by a **Forecast-Accelerated Bandit**, and lift is judged against the
> **Counterfactual Baseline**, not a held-back control.
>
> **Dev:** And Claude editing the page from Cursor?
> **Expert:** That's the **MCP Server** — external agents operate the builder there. The
> **Provider** is only the in-app generate/rewrite buttons. Different surfaces.
