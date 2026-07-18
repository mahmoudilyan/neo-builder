import { defineTool, defineSkill, type SkillDefinition, type ToolDefinition } from "@neo-builder/core";
import type { Provider } from "./provider.js";

/** Phrases that mark generic AI slop — banned in the no-slop Skill + prompts. */
export const SLOP_PHRASES = [
  "elevate", "unlock", "seamless", "effortless", "game-changer", "game-changing",
  "take it to the next level", "in an afternoon", "stays out of your way",
  "powerful yet simple", "build your next", "supercharge", "revolutionize",
  "unleash", "transform your", "cutting-edge", "best-in-class", "robust and scalable",
];

/**
 * A reusable Skill that forces concrete, specific copy. Pass its `instructions`
 * to generatePage/regenerate, or register it on the registry.
 */
export const noSlopSkill: SkillDefinition = defineSkill({
  name: "no-slop",
  description: "Rules for concrete, non-generic copy.",
  instructions:
    `Write copy a competitor literally could not copy-paste. Rules:\n` +
    `- BANNED words/phrases: ${SLOP_PHRASES.join(", ")}.\n` +
    `- No vague benefit-speak. Use real numbers, real specifics, concrete nouns.\n` +
    `- Prefer verbs over adjectives. Cut any sentence that could describe any product.\n` +
    `- Headlines state a specific claim, not a vibe. If you can't be specific, be shorter.\n` +
    `- When facts matter (sizes, comparisons, prices), use web search rather than inventing them.`,
});

/**
 * A web search Tool. Its `run` uses a web-search-enabled Provider as the backend,
 * so it actually searches — no extra API key. Register it to give agents and the
 * planner a real search capability and to ground copy in facts.
 *
 * ```ts
 * const searchProvider = new AnthropicProvider({ apiKey, webSearch: true });
 * registry.registerTool(createWebSearchTool(searchProvider));
 * ```
 */
export function createWebSearchTool(searchProvider: Provider): ToolDefinition {
  return defineTool({
    name: "web_search",
    description: "Search the web and return concise factual findings for a query.",
    inputSchema: { query: "what to search for" },
    run: async (input: Record<string, unknown>) => {
      return searchProvider.generate({
        system: "Search the web. Answer with concise factual bullet points and cite source names. No fluff.",
        prompt: String(input.query ?? ""),
        maxTokens: 700,
      });
    },
  });
}
