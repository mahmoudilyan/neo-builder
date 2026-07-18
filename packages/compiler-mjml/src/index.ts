import type {
  CapabilityProfile,
  Document,
  ElementNode,
  RenderContext,
  Registry,
  ThemeLike,
} from "@neo-builder/core";
import { isSupported } from "@neo-builder/core";
import type { ThemeTokens } from "@neo-builder/theme";

export interface CompileMjmlOptions {
  registry: Registry;
  theme: ThemeLike;
  /** Optional Capability Profile; defaults to the email profile. */
  profile?: CapabilityProfile;
  /** Wrap in <mjml><mj-body>…; default true. Set false for a body fragment. */
  fullDocument?: boolean;
}

/**
 * The default Email profile. Targets MJML; any Element without an `mjml` render
 * (e.g. `input`) is automatically excluded — email can't take form inputs.
 */
export const emailProfile: CapabilityProfile = { target: "mjml" };

/**
 * Compile a Document Model to MJML markup. Run the result through the `mjml`
 * library (server-side) to get final, client-tested email HTML.
 */
export function compileMjml(doc: Document, opts: CompileMjmlOptions): string {
  const { registry, theme } = opts;
  const profile = opts.profile ?? emailProfile;

  const ctx: RenderContext = {
    target: "mjml",
    theme,
    renderChildren: (node) => node.children.map((c) => renderNode(c)).join(""),
    renderNode: (node) => renderNode(node),
  };

  function renderNode(node: ElementNode): string {
    if (node.type === "root") return ctx.renderChildren(node);
    if (!isSupported(registry, profile, node.type)) {
      return `<!-- excluded from email: ${node.type} -->`;
    }
    const render = registry.require(node.type).render.mjml;
    if (!render) return `<!-- no mjml render for: ${node.type} -->`;
    return render(node, ctx);
  }

  const body = renderNode(doc.root);
  if (opts.fullDocument === false) return body;

  const t = theme.tokens as unknown as ThemeTokens;
  return (
    `<mjml><mj-head>` +
    `<mj-attributes><mj-all font-family="${t.fonts.body}" /></mj-attributes>` +
    `</mj-head>` +
    `<mj-body background-color="${t.colors.bg}">${body}</mj-body></mjml>`
  );
}
