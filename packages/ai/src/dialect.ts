import type { Document, Registry, ThemeLike } from "@neo-builder/core";
import type { OnActivity, Provider } from "./provider.js";
import { parseGeneratedDocument } from "./generate.js";

/**
 * The Element HTML dialect: generation syntax ≠ storage format. Models write
 * HTML far better than nested JSON, so generation happens in an HTML dialect
 * whose tags ARE the registered Element types and whose attributes ARE their
 * props. Parsing is deterministic (no inference, no lift loss): tag → type,
 * kebab-case attribute → camelCase prop, inner markup of content-leaves →
 * `content`. Unknown tags/props are dropped by the same registry boundary as
 * JSON generation (`parseGeneratedDocument`). This is NOT an importer for
 * arbitrary web HTML — it only reads the dialect.
 */

interface RawNode {
  type: string;
  props: Record<string, unknown>;
  children: RawNode[];
}

const kebabToCamel = (s: string) => s.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());

const unescapeHtml = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/** Coerce an attribute string to the value shape props expect. */
function coerce(value: string | undefined): unknown {
  if (value === undefined) return true; // bare attribute
  const v = unescapeHtml(value);
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v === "true") return true;
  if (v === "false") return false;
  return v;
}

function parseAttrs(src: string): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  const re = /([a-zA-Z][a-zA-Z0-9-]*)(?:\s*=\s*"([^"]*)")?/g;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    props[kebabToCamel(m[1]!)] = coerce(m[2]);
  }
  return props;
}

/** Find the matching close tag for `tag`, depth-counting nested same-tags. */
function findClose(src: string, tag: string, from: number): { inner: string; end: number } | null {
  const re = new RegExp(`<${tag}\\b[^>]*?(/?)>|</${tag}\\s*>`, "gi");
  re.lastIndex = from;
  let depth = 1;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    if (m[0].startsWith("</")) {
      depth--;
      if (depth === 0) return { inner: src.slice(from, m.index), end: re.lastIndex };
    } else if (m[1] !== "/") {
      depth++;
    }
  }
  return null; // unclosed (truncated output) — caller drops the node
}

/** A leaf whose inner markup becomes its `content` prop (rich text stays raw). */
function isContentLeaf(registry: Registry, type: string): boolean {
  const def = registry.get(type);
  return !!def && def.schema.allowedChildren === undefined && "content" in def.schema.props;
}

/** Parse a dialect fragment into raw nodes. Unknown tags drop with their subtree. */
export function parseDialectFragment(src: string, registry: Registry): RawNode[] {
  const nodes: RawNode[] = [];
  const open = /<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^<>]*?)?)(\/?)>/g;
  let i = 0;
  for (;;) {
    open.lastIndex = i;
    const m = open.exec(src);
    if (!m) break;
    const [full, tag, attrSrc, selfClose] = m;
    const type = tag!.toLowerCase();
    const afterOpen = m.index + full.length;

    if (selfClose === "/") {
      if (registry.has(type)) nodes.push({ type, props: parseAttrs(attrSrc ?? ""), children: [] });
      i = afterOpen;
      continue;
    }
    const closed = findClose(src, type, afterOpen);
    if (!closed) {
      i = afterOpen; // unclosed — skip the tag, keep scanning
      continue;
    }
    if (!registry.has(type)) {
      i = closed.end; // unknown tag: drop it AND its subtree (registry boundary)
      continue;
    }
    const props = parseAttrs(attrSrc ?? "");
    if (isContentLeaf(registry, type)) {
      const content = closed.inner.trim();
      if (content) props.content = content; // raw inline HTML; sanitized at render
      nodes.push({ type, props, children: [] });
    } else {
      nodes.push({ type, props, children: parseDialectFragment(closed.inner, registry) });
    }
    i = closed.end;
  }
  return nodes;
}

/** Strip fences/doctype/comments/<page> wrapper down to the dialect fragment. */
export function extractDialect(text: string): string {
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/);
  let src = (fenced ? fenced[1] : text) ?? text;
  src = src.replace(/<!--[\s\S]*?-->/g, "").replace(/<!doctype[^>]*>/gi, "");
  const page = src.match(/<page[^>]*>([\s\S]*?)<\/page>/i);
  return (page ? page[1] : src)!.trim();
}

/** Parse dialect markup into a validated Document (same boundary as JSON). */
export function parseElementHtml(text: string, registry: Registry, theme: ThemeLike): Document {
  const sections = parseDialectFragment(extractDialect(text), registry);
  return parseGeneratedDocument({ sections }, registry, theme);
}

/** Derive the dialect vocabulary from the registry — custom elements join free. */
export function buildDialectVocabulary(registry: Registry): string {
  return registry
    .list()
    .map((def) => {
      const attrs = Object.entries(def.schema.props)
        .filter(([k]) => k !== "content")
        .map(([k, hint]) => `${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}="${hint}"`)
        .join(" ");
      const container = def.schema.allowedChildren !== undefined;
      const contentLeaf = !container && "content" in def.schema.props;
      const shape = container
        ? `<${def.type} ${attrs}>…children…</${def.type}>`
        : contentLeaf
          ? `<${def.type} ${attrs}>inline rich text</${def.type}>`
          : `<${def.type} ${attrs} />`;
      return `- ${shape}\n  ${def.aiMeta.description}`;
    })
    .join("\n");
}

export interface GeneratePageHtmlInput {
  registry: Registry;
  theme: ThemeLike;
  prompt: string;
  /** Skill instruction texts to inject (e.g. noSlopSkill.instructions). */
  skills?: string[];
}

export function buildDialectSystemPrompt(registry: Registry): string {
  return (
    `You design a landing page by writing Element HTML — a strict dialect where ` +
    `every tag is a builder Element and every attribute is one of its props.\n\n` +
    `Vocabulary (ONLY these tags; ONLY these attributes; kebab-case attributes ` +
    `map to camelCase props):\n${buildDialectVocabulary(registry)}\n\n` +
    `Rules:\n` +
    `- Top level: a sequence of <section> elements. No <html>, <head>, <body>, <div>, <style>, classes or inline CSS.\n` +
    `- Prop values use Theme tokens and scale steps exactly as hinted (e.g. ` +
    `background="gradient:hero", padding="7", size="3xl") — NEVER raw CSS.\n` +
    `- Inside text elements only inline formatting is kept: b, i, a, em, strong, br, span.\n` +
    `- Leaf elements without content self-close: <image src="…" />.\n` +
    `- Art direction: one dominant hero (gradient or image background, min-height, ` +
    `display-size headline with max-width, one strong CTA), purposeful section ` +
    `backgrounds, muted secondary copy, capped line lengths, one accent.\n` +
    `- Copy: concrete and specific to the request. No filler phrases.\n` +
    `- Do any web searching FIRST. Then your FINAL message must be ONLY the ` +
    `markup — no prose, no markdown fences.`
  );
}

/** Generate a page in the HTML dialect and return a validated Document. */
export async function generatePageHtml(
  provider: Provider,
  input: GeneratePageHtmlInput,
  onActivity?: OnActivity,
): Promise<Document> {
  const system =
    buildDialectSystemPrompt(input.registry) +
    (input.skills?.length ? `\n\nGuidance:\n${input.skills.join("\n")}` : "");
  const req = { system, prompt: input.prompt, maxTokens: 8192 };
  const out = onActivity && provider.generateStream
    ? await provider.generateStream(req, onActivity)
    : await provider.generate(req);
  onActivity?.({ type: "status", message: "Parsing & validating markup…" });
  return parseElementHtml(out, input.registry, input.theme);
}
