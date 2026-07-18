import { defineElement } from "@neo-builder/core";
import { tokens } from "./util.js";
import { svgIcon, ICON_NAMES } from "./icons.js";

/** An icon from the built-in set (extend ICONS or register your own). */
export const icon = defineElement({
  type: "icon",
  label: "Icon",
  icon: "★",
  category: "Media",
  states: ["hover"],
  version: 1,
  schema: {
    props: {
      name: `icon name (${ICON_NAMES.slice(0, 6).join(", ")}…)`,
      size: "pixel size",
      color: "color token key (e.g. 'primary', 'text')",
    },
  },
  aiMeta: {
    description: "A single icon from the built-in SVG set.",
    props: { name: "Icon id.", size: "Size in px.", color: "Theme color token." },
  },
  defaults: () => ({ name: "star", size: 28, color: "primary" }),
  render: {
    html: (node, ctx) => {
      const t = tokens(ctx);
      const color = t.colors[String(node.props.color) as keyof typeof t.colors] ?? t.colors.primary;
      return svgIcon(String(node.props.name ?? "star"), Number(node.props.size ?? 28), color);
    },
  },
});
