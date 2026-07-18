import { defineElement } from "@neo-builder/core";
import { tokens } from "./util.js";

/** A horizontal rule separating content. Works on web and email. */
export const divider = defineElement({
  type: "divider",
  label: "Divider",
  icon: "—",
  category: "Layout",
  version: 1,
  schema: {
    props: {
      thickness: "line thickness in px",
      width: "line width in % (1-100)",
      color: "'border' | 'muted' | 'primary' — theme color token",
    },
  },
  aiMeta: {
    description: "A horizontal divider line separating groups of content.",
    props: {
      thickness: "Pixels; 1 or 2 is typical.",
      width: "Percent of available width; 100 spans fully.",
      color: "Theme color token for the line.",
    },
  },
  defaults: () => ({ thickness: 1, width: 100, color: "border" }),
  render: {
    html: (node, ctx) => {
      const t = tokens(ctx);
      const colors = t.colors as unknown as Record<string, string>;
      const color = colors[String(node.props.color ?? "border")] ?? colors.border ?? "#e2e8f0";
      const w = Math.max(1, Math.min(Number(node.props.width ?? 100), 100));
      const h = Math.max(1, Number(node.props.thickness ?? 1));
      return `<hr style="border:0;height:${h}px;background-color:${color};width:${w}%;margin:${t.spacing[3]}px auto" />`;
    },
    mjml: (node, ctx) => {
      const t = tokens(ctx);
      const colors = t.colors as unknown as Record<string, string>;
      const color = colors[String(node.props.color ?? "border")] ?? colors.border ?? "#e2e8f0";
      const w = Math.max(1, Math.min(Number(node.props.width ?? 100), 100));
      const h = Math.max(1, Number(node.props.thickness ?? 1));
      return `<mj-divider border-width="${h}px" border-color="${color}" width="${w}%" />`;
    },
  },
});
