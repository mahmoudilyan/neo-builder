# 16. What makes this different (intent-first command substrate)

The chain syntax resembles TipTap, but the model underneath is not a rich-text
editor — it's an **AI-operable command substrate**. Three properties TipTap (and
most builders) don't have:

## 1. Commands describe themselves

Every command carries a `CommandSpec` (title, params, category). The registry is
introspectable:

```ts
store.listCommands();
// [{ name: "insert", title: "Insert element", params: [...], category: "structure" }, …]
```

This powers a command palette, agent tool generation, and the planner below.
Opaque imperative APIs can't be enumerated or reasoned about; ours can.

## 2. Natural language → command plan

Because commands are described, an LLM can compose them. `planCommands` turns an
intent into a validated plan of the **same commands** a human or `chain()` uses:

```ts
import { planCommands } from "@ai-builder/ai";

const plan = await planCommands(provider, {
  commands: store.listCommands(),               // the described registry
  docOutline: outline(doc),                      // "id: type" lines
  intent: "Add a value proposition with a CTA",
});
store.applyPlan(plan);                            // executed as one undo step
```

`parseCommandPlan` drops any command the model invents — the registry is the
hard boundary, so planning can't produce slop or invalid edits. The playground's
**"Tell the builder what to do"** box runs this end to end.

This is the unique loop: **human intent and agent intent flow through the exact
same command layer as code and UI.** One substrate, three drivers (person, code,
AI), every Builder Type.

## 3. Commands are recorded (event-sourced)

Every applied chain appends to a log:

```ts
store.on("command:applied", ({ entries }) => analytics.track(entries));
store.getLog(); // [{ name, args, at }, …]
```

The log is the seam for replay, collaboration, audit, and — crucially — the
[Forecast-Gated loop](./09-ai-loop.md): *what changed* (commands) can be
correlated with *what happened* (metrics), so the system learns which edits
help. A rich-text editor's commands vanish after they run; ours are data.

## Why it matters for all builder types

Page, Email, and Form share one command vocabulary over one universal model. A
custom command, a planned intent, or a recorded edit works identically across
them. Building a new builder type = register its elements + reuse the substrate —
no new editor, no new command language.
