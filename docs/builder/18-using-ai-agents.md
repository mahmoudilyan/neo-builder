# 18. Using AI: generate pages, add Skills & Tools

A hands-on guide to the AI side: generate a page with an LLM, steer it with
**Skills**, give the agent **Tools**, and let it edit by **planning commands**.
Everything below uses the real APIs in `@ai-builder/ai` and `@ai-builder/core`.

> Prerequisites: a `Registry` (your elements), a `Theme`, and a `Provider`
> (bring-your-own-key). See [AI page generation](./11-ai-page-generation.md),
> [Tools & Skills](./12-tools-and-skills.md), and
> [intent & substrate](./16-intent-and-substrate.md) for the concepts.

## 1. Pick a Provider (BYO-key)

In-app AI is model-agnostic and uses your own key.

```ts
import { AnthropicProvider } from "@ai-builder/ai";

const provider = new AnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY! });
// model defaults to the latest Claude; pass { model } to override.
```

The playground uses mock providers (no key) so you can try the flows offline —
swap in `AnthropicProvider` for real output.

## 2. Generate a page

The LLM returns a **Document Model (JSON), never HTML** — so output is on-brand,
valid, and editable. Unknown types/props are dropped (the no-slop guard).

```ts
import { generatePage } from "@ai-builder/ai";

const doc = await generatePage(provider, {
  registry,
  theme,
  prompt: "A landing page for AcmeKit, a typed React component library.",
});

builder.setDocument(doc); // load into the editor; undoable
```

That's the whole generate flow. The result is ordinary Elements — drag, edit,
regenerate, and compile to HTML/MJML/form like anything else.

## 3. Add Skills (steer voice & structure)

A **Skill** is packaged know-how injected into the model's context — no code.

```ts
import { defineSkill } from "@ai-builder/core";

registry.registerSkill(
  defineSkill({
    name: "brand-voice",
    description: "How AcmeKit writes.",
    instructions: "Confident, concrete, developer-to-developer. No buzzwords, no hype. Lead with the benefit.",
  }),
);
```

Pass Skills into generation (or regeneration) to apply them:

```ts
const doc = await generatePage(provider, {
  registry,
  theme,
  prompt: "Pricing page with three tiers.",
  skills: [registry.getSkill("brand-voice")!.instructions],
});
```

Skills also feed the [regeneration loop](./09-ai-loop.md) — pass them to
`regenerate` so rewrites stay on-voice.

### A ready-made no-slop Skill

`@ai-builder/ai` ships `noSlopSkill` — a strict Skill with a banned-phrase list
(elevate, unlock, seamless, "build your next…", etc.) that forces concrete copy.

```ts
import { noSlopSkill } from "@ai-builder/ai";

const doc = await generatePage(provider, {
  registry, theme, prompt,
  skills: [noSlopSkill.instructions],
});
```

The generation prompt also bans these phrases and demands real specifics. Combine
with web search (below) to ground claims in facts — the biggest slop reducer.

## 4. Add Tools (give the agent capabilities)

A **Tool** is a callable capability with typed inputs. Register it, and it
becomes available to agents.

```ts
import { defineTool } from "@ai-builder/core";

registry.registerTool(
  defineTool({
    name: "fetch_products",
    description: "Fetch products from the catalog to populate a section.",
    inputSchema: { collection: "collection id", limit: "max items" },
    run: async ({ collection, limit }, ctx) => {
      // ctx.doc is available if the Tool needs the current document
      return api.products(collection, Number(limit ?? 6));
    },
  }),
);
```

### A real web search Tool

`@ai-builder/ai` ships `createWebSearchTool`, backed by Anthropic's native web
search (no extra API key) — so the Tool actually searches:

```ts
import { AnthropicProvider, createWebSearchTool } from "@ai-builder/ai";

const searchProvider = new AnthropicProvider({ apiKey, webSearch: true });
registry.registerTool(createWebSearchTool(searchProvider));

// call it directly…
const findings = await registry.getTool("web_search")!.run({ query: "Zod v4 bundle size" }, {});
```

Enable web search during generation too, so copy is grounded in real facts:

```ts
const provider = new AnthropicProvider({ apiKey, webSearch: true });
const doc = await generatePage(provider, { registry, theme, prompt, skills: [noSlopSkill.instructions] });
// → real numbers ("31M weekly downloads", "14x faster parsing"), not clichés.
```

The playground's agent has a **🔎 web** toggle and a **search** button (runs the
Tool). Try `apps/playground/ai-example.mjs` for a live, web-grounded run.

### Expose Skills & Tools to external agents (MCP)

`@ai-builder/mcp` turns the registry into the agent surface so Claude, Cursor,
Codex, or Gemini can drive the builder and call your Tools:

```ts
import { buildToolset, buildSkillPrompts } from "@ai-builder/mcp";

buildToolset(registry);      // builder commands + list_element_types + your Tools
buildSkillPrompts(registry); // your Skills as injectable prompts
```

Wire these into your MCP server's tool/prompt handlers. Registered Tools appear
as first-class MCP tools (inputs described from `inputSchema`); Skills appear as
prompts.

## 5. Edit by intent (natural language → commands)

Beyond generating a whole page, the agent can make targeted edits by **planning
commands** — the same commands a human or `store.chain()` uses.

```ts
import { planCommands } from "@ai-builder/ai";
import { walk } from "@ai-builder/core";

const outline = [...walk(builder.getState().doc)].map((n) => `${n.id}: ${n.type}`).join("\n");

const plan = await planCommands(provider, {
  commands: builder.listCommands(), // the described command registry
  docOutline: outline,              // ids the model can target
  intent: "Add a testimonial section under the hero",
});

builder.applyPlan(plan); // validated; runs as one undo step
```

Invalid commands are dropped by `parseCommandPlan`, so planning can't corrupt the
document.

## 6. Put it together — an AI agent for your builder

```ts
// 1. capabilities + know-how
registry.registerSkill(brandVoice);
registry.registerTool(fetchProducts);

// 2. draft a page
builder.setDocument(
  await generatePage(provider, { registry, theme, prompt, skills: [brandVoice.instructions] }),
);

// 3. iterate by intent
const plan = await planCommands(provider, {
  commands: builder.listCommands(),
  docOutline: outlineOf(builder.getState().doc),
  intent: "Make the hero shorter and add a pricing section",
});
builder.applyPlan(plan);

// 4. keep improving after publish — the Forecast-Gated loop regenerates
//    underperforming Elements (see chapter 9).
```

## Open vs cloud

`@ai-builder/ai` (Provider, generation, planning, regeneration logic) and
`@ai-builder/mcp` are open and BYO-key. The **managed** parts — hosted
forecasting, instrumentation ingestion, and the routine runtime that runs this on
a schedule — are the paid cloud (see
[ADR-0003](../adr/0003-open-core-boundary.md)).
