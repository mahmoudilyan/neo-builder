import type {
  Breakpoint,
  CapabilityProfile,
  Document,
  ElementNode,
  RenderContext,
  Registry,
  ThemeLike,
} from "@neo-builder/core";
import { isSupported, resolveProps, BREAKPOINTS, BREAKPOINT_MIN_WIDTH } from "@neo-builder/core";

export interface CompileHtmlOptions {
  registry: Registry;
  theme: ThemeLike;
  /** Optional Capability Profile; defaults to allowing all html-capable types. */
  profile?: CapabilityProfile;
  /** Wrap the body in a full HTML document. Default: true. */
  fullDocument?: boolean;
  /** Document <title> when fullDocument is true. */
  title?: string;
}

/** The default Landing Page profile: everything with an html render fn. */
export const landingPageProfile: CapabilityProfile = { target: "html" };

/** Compile a Document Model to an HTML string, with responsive @media support. */
export function compileHtml(doc: Document, opts: CompileHtmlOptions): string {
  const { registry, theme } = opts;
  const profile = opts.profile ?? landingPageProfile;
  const css: string[] = [];
  let group = 0;

  const ctx: RenderContext = {
    target: "html",
    theme,
    renderChildren: (node) => node.children.map((c) => renderNode(c)).join(""),
    renderNode: (node) => renderNode(node),
  };

  /** Render a node at one breakpoint using resolved props, applying _style. */
  function renderAt(node: ElementNode, bp: Breakpoint): string {
    const def = registry.require(node.type);
    const render = def.render.html!;
    const resolved = resolveProps(node, bp);
    const out = render({ ...node, props: resolved }, ctx);
    return applyStyleOverride(out, resolved._style);
  }

  function renderNode(node: ElementNode): string {
    if (node.type === "root") return ctx.renderChildren(node);
    if (!isSupported(registry, profile, node.type)) {
      return `<!-- skipped unsupported element: ${node.type} -->`;
    }
    if (!registry.require(node.type).render.html) {
      return `<!-- no html render for: ${node.type} -->`;
    }

    // Breakpoints this node actually overrides (mobile-first order).
    const present = ["base", ...BREAKPOINTS.filter((b) => b !== "base" && node.responsive?.[b])] as Breakpoint[];
    let out: string;
    if (present.length === 1) {
      out = renderAt(node, "base"); // no responsive: clean output
    } else {
      // One rendered variant per breakpoint, toggled by exclusive @media ranges.
      const g = `r${group++}`;
      css.push(emitRangeCss(g, present));
      out = present.map((bp, i) => `<div class="${g}-${i}">${renderAt(node, bp)}</div>`).join("");
    }
    return applyStates(node, out);
  }

  /** Wrap a node's output and emit :hover/:focus/:active CSS from node.states. */
  function applyStates(node: ElementNode, html: string): string {
    const states = node.states;
    if (!states || Object.keys(states).length === 0) return html;
    const cls = `st${group++}`;
    for (const [state, style] of Object.entries(states)) {
      const decls = Object.entries(style ?? {})
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${kebab(k)}:${String(v)} !important`)
        .join(";");
      if (decls) css.push(`.${cls}:${state} > *{${decls}}`);
    }
    return `<div class="${cls}">${html}</div>`;
  }

  const body = renderNode(doc.root);
  const styleTag = css.length ? `<style>${css.join("")}</style>` : "";

  if (opts.fullDocument === false) return styleTag + body;
  const title = opts.title ?? "Untitled";
  return (
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" />` +
    `<meta name="viewport" content="width=device-width, initial-scale=1" />` +
    `<title>${escapeTitle(title)}</title>${styleTag}</head>` +
    `<body style="margin:0">${body}</body></html>`
  );
}

/** Exclusive show/hide rules so exactly one variant renders per width range. */
function emitRangeCss(g: string, present: Breakpoint[]): string {
  const rules: string[] = present.map((_, i) => `.${g}-${i}{display:none}`);
  present.forEach((bp, i) => {
    const start = BREAKPOINT_MIN_WIDTH[bp];
    const next = present[i + 1];
    const end = next ? BREAKPOINT_MIN_WIDTH[next] : Infinity;
    const conds: string[] = [];
    if (start > 0) conds.push(`(min-width:${start}px)`);
    if (end !== Infinity) conds.push(`(max-width:${end - 1}px)`);
    const show = `.${g}-${i}{display:block}`;
    rules.push(conds.length ? `@media ${conds.join(" and ")}{${show}}` : show);
  });
  return rules.join("");
}

function applyStyleOverride(html: string, override: unknown): string {
  if (!override || typeof override !== "object") return html;
  const out = Object.entries(override as Record<string, unknown>)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${kebab(k)}:${String(v)}`)
    .join(";");
  return out ? `<div style="${out.replace(/"/g, "&quot;")}">${html}</div>` : html;
}

function escapeTitle(s: string): string {
  return s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function kebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}
