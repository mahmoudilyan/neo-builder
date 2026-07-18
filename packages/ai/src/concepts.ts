import type { ContentBrief, Feature, MoodName, RecipeId } from "@neo-builder/recipes";
import type { OnActivity, Provider } from "./provider.js";
import { SLOP_PHRASES } from "./extensions.js";
import { extractJson } from "./generate.js";

export interface GenerateConceptsInput {
  /** Available Layout Recipes (id + description). */
  recipes: { id: string; description: string }[];
  /** Available Moods (name + description). */
  moods: { name: string; description: string }[];
  prompt: string;
  /** How many divergent concepts to produce. Default 3. */
  count?: number;
  /** Optional Skills (instructions) to steer copy. */
  skills?: string[];
}

/**
 * Concept generation. The AI authors only Content Briefs — meaning + a Mood +
 * a Layout Recipe — never layout. It must produce DIVERGENT concepts (different
 * mood + recipe each), so pages never converge to one template.
 */
export function buildConceptSystemPrompt(
  recipes: { id: string; description: string }[],
  moods: { name: string; description: string }[],
  count: number,
): string {
  const recipeList = recipes.map((r) => `  - ${r.id}: ${r.description}`).join("\n");
  const moodList = moods.map((m) => `  - ${m.name}: ${m.description}`).join("\n");
  return (
    `You write Content Briefs for landing pages. You do NOT design layouts — the\n` +
    `system art-directs from your brief. Author meaning only.\n\n` +
    `Produce ${count} DIVERGENT concepts. Each must use a DIFFERENT mood AND recipe,\n` +
    `and take a genuinely different angle on the content — not reworded copies.\n\n` +
    `Moods:\n${moodList}\n\nLayout Recipes:\n${recipeList}\n\n` +
    `Copy rules (anti-slop): banned phrases — ${SLOP_PHRASES.join(", ")}. Use concrete,\n` +
    `specific copy with real nouns and numbers. If facts matter, use web search.\n\n` +
    `Return ONLY JSON:\n` +
    `{"concepts":[{"mood":"editorial","recipe":"split-hero","headline":"...","subhead":"...",` +
    `"cta":{"label":"...","href":"#"},"features":[{"title":"...","body":"..."}],"stat":"..."}]}`
  );
}

function pick<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return typeof value === "string" && (allowed as string[]).includes(value) ? (value as T) : fallback;
}

function asFeatures(value: unknown): Feature[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((f): f is { title?: unknown; body?: unknown } => !!f && typeof f === "object")
    .slice(0, 4)
    .map((f) => ({ title: String(f.title ?? ""), body: String(f.body ?? "") }))
    .filter((f) => f.title || f.body);
}

/** Validate + coerce generated JSON into Content Briefs. Pure. */
export function parseBriefs(
  data: unknown,
  recipes: { id: string }[],
  moods: { name: string }[],
): ContentBrief[] {
  const moodNames = moods.map((m) => m.name) as MoodName[];
  const recipeIds = recipes.map((r) => r.id) as RecipeId[];
  const raw = (data && typeof data === "object" ? (data as { concepts?: unknown }).concepts : data) ?? [];
  const list = Array.isArray(raw) ? raw : [];
  return list
    .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
    .map((c) => {
      const cta = (c.cta && typeof c.cta === "object" ? c.cta : {}) as { label?: unknown; href?: unknown };
      return {
        mood: pick(c.mood, moodNames, moodNames[0]!),
        recipe: pick(c.recipe, recipeIds, recipeIds[0]!),
        headline: String(c.headline ?? ""),
        subhead: String(c.subhead ?? ""),
        cta: { label: String(cta.label ?? "Get started"), href: cta.href ? String(cta.href) : "#" },
        features: asFeatures(c.features),
        ...(c.stat ? { stat: String(c.stat) } : {}),
      } satisfies ContentBrief;
    })
    .filter((b) => b.headline);
}

/** Generate several divergent Content Briefs from a prompt. */
export async function generateConcepts(
  provider: Provider,
  input: GenerateConceptsInput,
  onActivity?: OnActivity,
): Promise<ContentBrief[]> {
  const count = input.count ?? 3;
  const system =
    buildConceptSystemPrompt(input.recipes, input.moods, count) +
    (input.skills?.length ? `\n\nGuidance:\n${input.skills.join("\n")}` : "");
  const req = { system, prompt: input.prompt, maxTokens: 4096 };
  const out =
    onActivity && provider.generateStream
      ? await provider.generateStream(req, onActivity)
      : await provider.generate(req);
  onActivity?.({ type: "status", message: "Art-directing concepts…" });
  return parseBriefs(extractJson(out), input.recipes, input.moods);
}
