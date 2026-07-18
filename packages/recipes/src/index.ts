import type { Registry } from "@neo-builder/core";
import type { Theme } from "@neo-builder/theme";
import { defaultTheme } from "@neo-builder/theme";
import type { ContentBrief, Concept } from "./types.js";
import { applyMood } from "./moods.js";
import { RECIPES } from "./recipes.js";

export type { MoodName, RecipeId, Feature, ContentBrief, Concept } from "./types.js";
export { applyMood, MOOD_CATALOG } from "./moods.js";
export { RECIPES, RECIPE_CATALOG } from "./recipes.js";

/**
 * Realize a Content Brief into a Concept: a Layout Recipe builds the Document,
 * the Mood adjusts the Theme. This is the art-direction step — the AI authored
 * only the brief.
 */
export function applyConcept(brief: ContentBrief, registry: Registry, base: Theme = defaultTheme): Concept {
  const theme = applyMood(brief.mood, base);
  const build = RECIPES[brief.recipe] ?? RECIPES["centered-stack"];
  const built = build(brief, registry);
  const doc = { ...built, themeId: theme.id };
  return { brief, doc, theme };
}
