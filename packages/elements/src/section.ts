import { defineElement } from "@neo-builder/core";
import { ratioToGrid, resolveBackground, SECTION_WIDTHS as WIDTHS } from "@neo-builder/theme";
import { tokens, style, escapeAttr } from "./util.js";

/** Top-level structural Element: a one- or multi-column layout band. */
export const section = defineElement({
  type: "section",
  label: "Section",
  icon: "▦",
  category: "Layout",
  version: 2,
  schema: {
    props: {
      columns: "number of columns (1-4)",
      ratio: "optional column ratio like '2:1' or '1:2' — overrides equal columns",
      background:
        "color token ('bg'|'surface'|'primary'…) | 'gradient:hero'|'gradient:accent'|'gradient:subtle' | 'image:<url>'",
      overlay: "0-1 dark overlay opacity for image backgrounds",
      width: "'narrow' | 'normal' | 'wide' | 'full' — content max-width",
      minHeight: "optional px number — use ~420+ for heroes; children center vertically",
      padding: "spacing scale step (0-8)",
      gap: "gap between columns, spacing scale step (0-8)",
      bg: "legacy color token key (use `background` instead)",
    },
    allowedChildren: "*",
  },
  aiMeta: {
    description:
      "A full-width horizontal band that arranges its children into one or more columns. The primary structural unit of a page.",
    props: {
      columns: "How many columns to lay children across. Use 1 for stacked content.",
      ratio: "'2:1' gives a split hero (content wide, media narrow). Wins over `columns`.",
      background:
        "Use 'gradient:hero' for hero bands, 'gradient:accent' for CTA bands (pairs with primaryText-colored content), 'image:<url>' + overlay 0.4-0.6 for photo heroes.",
      width: "'narrow' for focused copy, 'wide' for feature grids, 'full' edge-to-edge.",
      minHeight: "Set (e.g. 480) on the opening hero so it commands the viewport.",
      padding: "Inner vertical/horizontal padding, referencing the spacing scale.",
    },
    usage: "Wrap related content in a section; nest text/image/button inside.",
  },
  migrate: (old) => ({ ...old, background: old.background ?? old.bg }),
  defaults: () => ({ columns: 1, background: "bg", padding: 6, gap: 4, width: "normal" }),
  render: {
    html: (node, ctx) => {
      const t = tokens(ctx);
      const cols = Math.max(1, Math.min(Number(node.props.columns ?? 1), 4));
      const grid = ratioToGrid(node.props.ratio) ?? `repeat(${cols}, 1fr)`;
      const pad = t.spacing[Number(node.props.padding ?? 6)] ?? 24;
      const { css } = resolveBackground(t, node.props.background ?? node.props.bg, node.props.overlay);
      const minHeight = Number(node.props.minHeight ?? 0);
      const inner = node.children.map((c) => ctx.renderNode(c)).join("");
      const sectionStyle = style({ ...css, padding: `${pad}px` });
      const gridStyle = style({
        display: "grid",
        "grid-template-columns": grid,
        gap: `${t.spacing[Number(node.props.gap ?? 4)] ?? 16}px`,
        "max-width": WIDTHS[String(node.props.width ?? "normal")] ?? WIDTHS.normal,
        margin: "0 auto",
        "min-height": minHeight > 0 ? `${minHeight}px` : undefined,
        "align-content": minHeight > 0 ? "center" : undefined,
      });
      return `<section${sectionStyle}><div${gridStyle}>${inner}</div></section>`;
    },
    mjml: (node, ctx) => {
      const t = tokens(ctx);
      const cols = Math.max(1, Math.min(Number(node.props.columns ?? 1), 4));
      const pad = t.spacing[Number(node.props.padding ?? 6)] ?? 24;
      const raw = String(node.props.background ?? node.props.bg ?? "bg");
      const { fallback } = resolveBackground(t, raw, node.props.overlay);
      // Email floor: gradients degrade to their fallback color; images use
      // MJML's native background-url (no overlay).
      const bgUrl = raw.startsWith("image:")
        ? ` background-url="${escapeAttr(raw.slice(6))}" background-size="cover"`
        : "";
      const buckets: string[][] = Array.from({ length: cols }, () => []);
      node.children.forEach((c, i) => buckets[i % cols]!.push(ctx.renderNode(c)));
      const columns = buckets.map((b) => `<mj-column>${b.join("")}</mj-column>`).join("");
      return `<mj-section background-color="${fallback}"${bgUrl} padding="${pad}px">${columns}</mj-section>`;
    },
  },
});
