// Live: AI authors divergent Content Briefs; the system art-directs each into a
// Document. Run: `node concepts-example.mjs`. Reads key from .env.local.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { registryFor } from "@neo-builder/elements";
import { defaultTheme } from "@neo-builder/theme";
import { walk } from "@neo-builder/core";
import { AnthropicProvider, generateConcepts, noSlopSkill } from "@neo-builder/ai";
import { applyConcept, RECIPE_CATALOG, MOOD_CATALOG } from "@neo-builder/recipes";

const envPath = fileURLToPath(new URL("./.env.local", import.meta.url));
const key =
  process.env.ANTHROPIC_API_KEY ||
  (readFileSync(envPath, "utf8").match(/VITE_ANTHROPIC_API_KEY=(.+)/) ?? [])[1]?.trim();
if (!key) { console.error("No key."); process.exit(1); }

const registry = registryFor("page");
const provider = new AnthropicProvider({ apiKey: key, webSearch: true });

console.log("Generating divergent concepts for Zod…\n");
const briefs = await generateConcepts(
  provider,
  { recipes: RECIPE_CATALOG, moods: MOOD_CATALOG, prompt: "A landing page for Zod, the TypeScript validation library.", count: 3, skills: [noSlopSkill.instructions] },
  (e) => { if (e.type === "search") console.log(`  🔎 ${e.query}`); },
);

for (const brief of briefs) {
  const { doc } = applyConcept(brief, registry, defaultTheme);
  const n = [...walk(doc)].length - 1;
  console.log(`\n● ${brief.mood} · ${brief.recipe}  (${n} elements)`);
  console.log(`  ${brief.headline}`);
  console.log(`  ${brief.subhead}`);
  console.log(`  features: ${brief.features.map((f) => f.title).join(" · ")}`);
}
