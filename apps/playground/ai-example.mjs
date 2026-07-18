// Real end-to-end example: generate a page with live Claude, then compile it.
// Run from this dir: `node ai-example.mjs`. Reads the key from .env.local.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { registryFor } from "@neo-builder/elements";
import { defaultTheme } from "@neo-builder/theme";
import { walk } from "@neo-builder/core";
import { AnthropicProvider, generatePage, noSlopSkill } from "@neo-builder/ai";
import { compileHtml } from "@neo-builder/compiler-html";

const envPath = fileURLToPath(new URL("./.env.local", import.meta.url));
const key =
  process.env.ANTHROPIC_API_KEY ||
  (readFileSync(envPath, "utf8").match(/VITE_ANTHROPIC_API_KEY=(.+)/) ?? [])[1]?.trim();

if (!key) {
  console.error("No ANTHROPIC_API_KEY found.");
  process.exit(1);
}

const registry = registryFor("page");
const provider = new AnthropicProvider({ apiKey: key, webSearch: true });
const prompt =
  "A landing page for Zod, the TypeScript validation library. Hero, three feature columns, and a CTA. Use real facts about Zod.";

console.log("Calling Claude (streaming · web search · no-slop skill)…\n");
let chars = 0;
const doc = await generatePage(
  provider,
  { registry, theme: defaultTheme, prompt, skills: [noSlopSkill.instructions] },
  (e) => {
    if (e.type === "status") console.log(`  · ${e.message}`);
    else if (e.type === "search") console.log(`  🔎 ${e.query}`);
    else if (e.type === "text") {
      chars += e.delta.length;
      process.stdout.write(`\r  ✍️  writing… ${chars} chars`);
    }
  },
);
console.log("\n");

const nodes = [...walk(doc)].filter((n) => n.type !== "root");
console.log(`Generated ${nodes.length} elements:\n`);
for (const n of nodes) {
  const label = n.props.content ?? n.props.label ?? "";
  console.log(`  ${n.type.padEnd(8)} ${String(label).slice(0, 64)}`);
}

const html = compileHtml(doc, { registry, theme: defaultTheme, title: "AcmeKit" });
console.log(`\nCompiled HTML: ${html.length} bytes. First 400 chars:\n`);
console.log(html.slice(0, 400));
