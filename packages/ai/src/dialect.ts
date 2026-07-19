import type { Document, Registry, ThemeLike } from "@neo-builder/core";
import type { ThemeTokens } from "@neo-builder/theme";
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

const isColorish = (v: unknown) => typeof v === "string" && /^(#|rgb|hsl)/i.test(v);
const isGradientish = (v: unknown) => typeof v === "string" && /gradient\(/i.test(v);

/** Corner-radius presets the model can name instead of raw numbers. */
const RADIUS_PRESETS: Record<string, ThemeTokens["radii"]> = {
  sharp: { sm: 0, md: 0, lg: 0, xl: 0, pill: 0 },
  soft: { sm: 4, md: 8, lg: 14, xl: 20, pill: 999 },
  rounded: { sm: 8, md: 14, lg: 24, xl: 32, pill: 999 },
  pill: { sm: 12, md: 20, lg: 32, xl: 44, pill: 999 },
};

/**
 * Build a Theme from a `<theme …/>` tag's attributes, over a base theme.
 * Only valid-looking values land; everything else keeps the base token. This
 * is what makes freeform pages look *different per prompt* — without it every
 * generation wears the default palette and gradients.
 */
export function parseDialectTheme(text: string, base: ThemeLike): ThemeLike {
  const m = text.match(/<theme((?:\s+[^<>]*?)?)\/?>/i);
  const t = base.tokens as unknown as ThemeTokens;
  if (!m) return base;
  const a = parseAttrs(m[1] ?? "");
  const color = (key: string, cur: string) => (isColorish(a[key]) ? String(a[key]) : cur);
  const grad = (key: string, cur: string) => (isGradientish(a[key]) ? String(a[key]) : cur);
  const font = (key: string, cur: string) => (typeof a[key] === "string" && String(a[key]).length > 2 ? String(a[key]) : cur);
  const tokens: ThemeTokens = {
    ...t,
    colors: {
      bg: color("bg", t.colors.bg),
      surface: color("surface", t.colors.surface),
      text: color("text", t.colors.text),
      muted: color("muted", t.colors.muted),
      primary: color("primary", t.colors.primary),
      primaryText: color("primaryText", t.colors.primaryText),
      border: color("border", t.colors.border),
    },
    fonts: {
      body: font("bodyFont", t.fonts.body),
      heading: font("headingFont", t.fonts.heading),
    },
    gradients: {
      hero: grad("gradientHero", t.gradients.hero),
      accent: grad("gradientAccent", t.gradients.accent),
      subtle: grad("gradientSubtle", t.gradients.subtle),
    },
    radii: RADIUS_PRESETS[String(a.radius ?? "")] ?? t.radii,
  };
  return { id: "generated", tokens };
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
    `Theme: your page gets its OWN visual identity. Start the output with ONE ` +
    `self-closing <theme /> tag that art-directs the whole page:\n` +
    `  <theme primary="#b45309" primary-text="#ffffff" bg="#fffbf5" surface="#fdf3e3" ` +
    `text="#2d1f14" muted="#8a7461" border="#eedfca" ` +
    `heading-font="Georgia, 'Times New Roman', serif" body-font="Arial, Helvetica, sans-serif" ` +
    `gradient-hero="linear-gradient(160deg,#fdf3e3 0%,#fffbf5 70%)" ` +
    `gradient-accent="linear-gradient(135deg,#b45309 0%,#dc2626 100%)" ` +
    `gradient-subtle="linear-gradient(180deg,#fffbf5 0%,#fdf3e3 100%)" radius="soft" />\n` +
    `Theme rules:\n` +
    `- DERIVE the palette from the subject — a heart-health brand is not the same ` +
    `colors as a dev tool or a law firm. NEVER reuse the example values above and ` +
    `NEVER default to indigo/purple.\n` +
    `- Gradients must be built from YOUR palette's colors.\n` +
    `- Fonts: email-safe stacks (Georgia/Times serif, Arial/Helvetica/Verdana/` +
    `'Trebuchet MS' sans, Inter/system-ui for modern). Pair heading vs body deliberately.\n` +
    `- radius: one of "sharp" | "soft" | "rounded" | "pill" — match the brand's tone.\n` +
    `- Ensure text/bg and primaryText/primary have strong contrast.\n\n` +
    `Rules:\n` +
    `- After <theme />: a sequence of <section> elements. No <html>, <head>, <body>, <div>, <style>, classes or inline CSS.\n` +
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

/**
 * Generate a page in the HTML dialect. Returns the validated Document AND the
 * model-authored Theme (falls back to the input theme when no <theme /> tag
 * survives validation) — apply both, or every generation shares one skin.
 */
export async function generatePageHtml(
  provider: Provider,
  input: GeneratePageHtmlInput,
  onActivity?: OnActivity,
): Promise<{ doc: Document; theme: ThemeLike }> {
  const system =
    buildDialectSystemPrompt(input.registry) +
    (input.skills?.length ? `\n\nGuidance:\n${input.skills.join("\n")}` : "");
  const req = { system, prompt: input.prompt, maxTokens: 8192 };
  const out = onActivity && provider.generateStream
    ? await provider.generateStream(req, onActivity)
    : await provider.generate(req);
  onActivity?.({ type: "status", message: "Parsing & validating markup…" });
  const theme = parseDialectTheme(extractDialect(out), input.theme);
  const doc = parseElementHtml(out, input.registry, theme);
  return { doc, theme };
}
