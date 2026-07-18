# 12. Tools & Skills

The Registry holds three kinds of extension: **Elements**, **Tools**, and
**Skills**. "A Tool does. A Skill knows." (See the glossary.)

## Define a Tool

A Tool is a callable capability an agent can invoke.

```ts
import { defineTool } from "@ai-builder/core";

const fetchProducts = defineTool({
  name: "fetch_products",
  description: "Fetch the latest products from the catalog.",
  inputSchema: { collection: "collection id", limit: "max items" },
  run: async ({ collection, limit }, ctx) => {
    return api.products(collection, Number(limit ?? 10)); // ctx.doc is available
  },
});

registry.registerTool(fetchProducts);
```

## Define a Skill

A Skill is packaged know-how injected into the model's context — no execution.

```ts
import { defineSkill } from "@ai-builder/core";

registry.registerSkill({
  name: "brand-voice",
  description: "How AcmeKit writes.",
  instructions: "Confident, concrete, developer-to-developer. No buzzwords, no hype.",
});
```

Pass a Skill's `instructions` into [`generatePage`](./11-ai-page-generation.md)
or `regenerate` via their `skills` argument to steer output.

## Surfaced to agents over MCP

`@ai-builder/mcp` turns the registry into the agent surface:

```ts
import { buildToolset, buildSkillPrompts } from "@ai-builder/mcp";

buildToolset(registry);      // command tools + list_element_types + every registered Tool
buildSkillPrompts(registry); // registered Skills as injectable prompts
```

Registered Tools become first-class MCP tools (inputs described from
`inputSchema`); Skills become prompt/context entries. So Claude, Cursor, Codex,
or Gemini can both **operate the builder** and **call your Tools** through one
surface.

## Packaging in an Extension

An Extension bundles Elements + Tools + Skills behind one register function:

```ts
export function registerCommercePack(registry: Registry) {
  registry
    .registerAll([productCard, priceTag])     // Elements
    .registerTool(fetchProducts)               // Tool
    .registerSkill({ name: "commerce-voice", description: "...", instructions: "..." });
}
```

Consumers call `registerCommercePack(registry)` after `registerBuiltins` — one
import adds elements, capabilities, and know-how at once.
