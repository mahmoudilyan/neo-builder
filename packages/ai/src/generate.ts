import {
  createDocument,
  createElement,
  type Document,
  type ElementNode,
  type Registry,
  type ThemeLike,
} from "@neo-builder/core";
import type { OnActivity, Provider } from "./provider.js";
import { SLOP_PHRASES } from "./extensions.js";

/** Run a provider, streaming activity when supported. */
async function run(provider: Provider, req: Parameters<Provider["generate"]>[0], onActivity?: OnActivity): Promise<string> {
  if (onActivity && provider.generateStream) return provider.generateStream(req, onActivity);
  return provider.generate(req);
}

export interface GeneratePageInput {
  registry: Registry;
  theme: ThemeLike;
  /** What the page should be about. */
  prompt: string;
  /** Optional Skills (instructions) to steer voice/structure. */
  skills?: string[];
}

/**
 * Describe the registry + theme to the model and demand a Document Model as
 * JSON — never raw HTML. This is the structural defense against AI slop:
 * output must use real Element types, real props, and Theme tokens, so it is
 * on-brand, valid, and fully editable afterward.
 */
export function buildGenerationSystemPrompt(registry: Registry, theme: ThemeLike): string {
  const elements = registry
    .list()
    .map((d) => {
      const props = Object.entries(d.schema.props)
        .map(([k, hint]) => `    - ${k}: ${hint}`)
        .join("\n");
      return `- ${d.type}: ${d.aiMeta.description}\n${props}`;
    })
    .join("\n");
  const tokens = Object.keys((theme.tokens as { colors?: object }).colors ?? {}).join(", ");

  return (
    `You generate web/landing pages as a JSON Document Model — never HTML.\n\n` +
    `Available Element types and their props:\n${elements}\n\n` +
    `Theme color tokens (reference these by key, e.g. bg:"primary"): ${tokens}\n\n` +
    `Rules:\n` +
    `- Use ONLY the listed Element types and props. Unknown types/props are dropped.\n` +
    `- Top-level items must be "section". Put content Elements in their children.\n` +
    `- Reference theme tokens for colors; do not invent hex values.\n` +
    `- NO AI slop. Banned: ${SLOP_PHRASES.join(", ")}. No vague benefit-speak.\n` +
    `- Every line must say something only THIS product could say. Use real numbers and\n` +
    `  concrete specifics; prefer verbs over adjectives. If you can't be specific, be shorter.\n` +
    `- If web search is available, ground claims (sizes, prices, comparisons) in real facts.\n\n` +
    `Return ONLY JSON of this shape:\n` +
    `{"sections":[{"type":"section","props":{},"children":[{"type":"text","props":{"content":"...","as":"h1"}}]}]}`
  );
}

/**
 * Extract a JSON object from a model response, tolerating code fences, prose
 * around it, and common LLM mistakes (trailing commas). Throws with a snippet.
 */
/** Scan the balanced JSON object starting at `start`. String/escape aware. */
function scanBalancedObject(raw: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return null; // truncated output
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced ? fenced[1] : text) ?? text;
  const start = raw.indexOf("{");
  if (start === -1) throw new Error(`No JSON object in model output: ${text.slice(0, 120)}…`);
  // Take the first *balanced* object — models sometimes append prose or a
  // second object after the JSON. Fall back to everything (truncation case).
  const candidate = scanBalancedObject(raw, start) ?? raw.slice(start);
  const body = candidate.replace(/,(\s*[}\]])/g, "$1"); // strip trailing commas
  try {
    return JSON.parse(body);
  } catch (e) {
    throw new Error(`Could not parse generated JSON (${(e as Error).message}). Near: ${body.slice(0, 160)}…`);
  }
}

interface RawNode {
  type?: unknown;
  props?: unknown;
  children?: unknown;
}

/**
 * Validate + coerce loosely-structured generated JSON into a real Document.
 * Unknown Element types are dropped; props are filtered to each Element's
 * schema; defaults are applied; ids are assigned. Pure and unit-testable.
 */
export function parseGeneratedDocument(
  data: unknown,
  registry: Registry,
  theme: ThemeLike,
): Document {
  const doc = createDocument(theme.id);
  const top = pickSections(data);
  doc.root.children = top.map((n) => buildNode(n, registry)).filter((n): n is ElementNode => !!n);
  return doc;
}

function pickSections(data: unknown): RawNode[] {
  if (Array.isArray(data)) return data as RawNode[];
  if (data && typeof data === "object") {
    const o = data as { sections?: unknown; children?: unknown };
    if (Array.isArray(o.sections)) return o.sections as RawNode[];
    if (Array.isArray(o.children)) return o.children as RawNode[];
  }
  return [];
}

function buildNode(raw: RawNode, registry: Registry): ElementNode | null {
  const type = typeof raw?.type === "string" ? raw.type : "";
  if (!registry.has(type)) return null; // drop unknown types
  const def = registry.require(type);
  const inProps = (raw.props && typeof raw.props === "object" ? raw.props : {}) as Record<string, unknown>;
  const props: Record<string, unknown> = {};
  for (const key of Object.keys(def.schema.props)) {
    if (key in inProps) props[key] = inProps[key]; // filter to schema
  }
  const node = createElement(registry, type, props); // applies defaults + id
  const kids = Array.isArray(raw.children) ? (raw.children as RawNode[]) : [];
  node.children = kids.map((c) => buildNode(c, registry)).filter((n): n is ElementNode => !!n);
  return node;
}

/** Generate a full page via an LLM, returned as a validated Document Model. */
export async function generatePage(
  provider: Provider,
  input: GeneratePageInput,
  onActivity?: OnActivity,
): Promise<Document> {
  const system =
    buildGenerationSystemPrompt(input.registry, input.theme) +
    (input.skills?.length ? `\n\nGuidance:\n${input.skills.join("\n")}` : "");
  const out = await run(provider, { system, prompt: input.prompt, maxTokens: 4096 }, onActivity);
  onActivity?.({ type: "status", message: "Parsing & validating…" });
  return parseGeneratedDocument(extractJson(out), input.registry, input.theme);
}
